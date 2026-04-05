/**
 * Resume Upload API - Zion Recruit
 * Server-side file upload endpoint for resume/CV files.
 * Accepts PDF, DOC, DOCX, TXT files via multipart/form-data.
 * Extracts text and uploads to S3-compatible storage.
 * Returns both the file URL and the extracted text.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTenant, authErrorResponse } from "@/lib/auth-helper";
import { getStorageService } from "@/lib/storage/storage-service";
import path from "path";

// Maximum file size: 5MB (resumes should be compact)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Extract text from PDF file using pdf-parse v2
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // pdf-parse v2 uses ESM with PDFParse class
    const pdfParseModule = await import("pdf-parse");
    const { PDFParse } = pdfParseModule;

    if (PDFParse) {
      // pdf-parse v2.x API: new PDFParse(uint8Array).getText()
      const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      const parser = new PDFParse(uint8);
      const result = await parser.getText();
      // Clean page markers from output
      const cleanText = (result.text || "")
        .replace(/\n-- \d+ of \d+ --\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      return cleanText;
    }

    // Fallback for pdf-parse v1.x API: pdfParse(buffer)
    const pdfParse = (pdfParseModule as any).default || pdfParseModule;
    const data = await pdfParse(buffer);
    return (data as any).text || "";
  } catch (error) {
    console.error("[ResumeUpload] PDF parse error:", error);
    throw new Error("Falha ao ler arquivo PDF. Tente novamente ou cole o texto manualmente.");
  }
}

/**
 * Extract text from DOCX file using mammoth
 */
async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  } catch (error) {
    console.error("[ResumeUpload] DOCX parse error:", error);
    throw new Error("Falha ao ler arquivo DOCX. Tente novamente ou cole o texto manualmente.");
  }
}

/**
 * Extract text from DOC file (basic - reads raw text)
 */
async function extractTextFromDOC(buffer: Buffer): Promise<string> {
  const text = buffer.toString("binary", 0, buffer.length);
  const readableChunks: string[] = [];
  let currentChunk = "";

  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    if (char >= 32 && char < 127) {
      currentChunk += text[i];
    } else if (char === 10 || char === 13) {
      currentChunk += text[i];
    } else {
      if (currentChunk.length > 20) {
        readableChunks.push(currentChunk.trim());
      }
      currentChunk = "";
    }
  }
  if (currentChunk.length > 20) {
    readableChunks.push(currentChunk.trim());
  }

  return readableChunks
    .filter(chunk => {
      const lower = chunk.toLowerCase();
      return (
        chunk.length > 30 &&
        !lower.includes("microsoft") &&
        !lower.includes("worddocument") &&
        !lower.includes("{\\rtf") &&
        !/^[\\s\\W]+$/.test(chunk)
      );
    })
    .join("\n\n");
}

/**
 * Extract text from TXT/CSV file
 */
function extractTextFromTXT(buffer: Buffer): string {
  return buffer.toString("utf-8");
}

/**
 * Main extraction dispatcher
 */
async function extractTextFromFile(
  buffer: Buffer,
  fileType: string
): Promise<string> {
  switch (fileType) {
    case "pdf":
      return extractTextFromPDF(buffer);
    case "docx":
      return extractTextFromDOCX(buffer);
    case "doc":
      return extractTextFromDOC(buffer);
    case "txt":
    case "csv":
    default:
      return extractTextFromTXT(buffer);
  }
}

// POST /api/candidates/upload-resume
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const candidateId = formData.get("candidateId") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Arquivo muito grande. Tamanho máximo: 5MB. Seu arquivo: ${(file.size / 1024 / 1024).toFixed(1)}MB` },
        { status: 400 }
      );
    }

    // Detect file type from extension
    const fileExt = path.extname(file.name || "").toLowerCase().replace(".", "") || "txt";
    const validTypes = ["pdf", "doc", "docx", "txt", "csv"];

    if (!validTypes.includes(fileExt)) {
      return NextResponse.json(
        { error: `Formato não suportado: .${fileExt}. Use PDF, DOC, DOCX ou TXT.` },
        { status: 400 }
      );
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Extract text based on file type
    const text = await extractTextFromFile(buffer, fileExt);

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: "Não foi possível extrair texto do arquivo. O arquivo pode estar vazio, corrompido ou protegido por senha. Tente copiar e colar o conteúdo manualmente." },
        { status: 400 }
      );
    }

    // Clean up extracted text
    const cleanedText = text
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    // Attempt to upload file to S3-compatible storage (non-blocking)
    let storageResult: {
      key: string;
      url: string;
      storedFileName: string;
      uploaded: boolean;
    } | null = null;

    try {
      const storage = getStorageService();
      if (storage.isConfigured()) {
        const result = await storage.upload(buffer, file.name, {
          folder: 'resumes',
          tenantId,
          contentType: file.type || undefined,
          isPublic: false,
        });

        if (result.success) {
          storageResult = {
            key: result.key,
            url: result.url,
            storedFileName: result.fileName,
            uploaded: true,
          };
        } else {
          console.warn('[ResumeUpload] Storage upload failed:', result.error);
          // Continue without storage - text extraction still works
          storageResult = {
            key: '',
            url: '',
            storedFileName: file.name,
            uploaded: false,
          };
        }
      } else {
        // Storage not configured - text-only mode
        storageResult = {
          key: '',
          url: '',
          storedFileName: file.name,
          uploaded: false,
        };
      }
    } catch (storageError) {
      console.warn('[ResumeUpload] Storage upload error:', storageError);
      // Degrade gracefully - continue with text-only result
      storageResult = {
        key: '',
        url: '',
        storedFileName: file.name,
        uploaded: false,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        text: cleanedText,
        fileName: file.name,
        fileSize: file.size,
        fileType: fileExt,
        textLength: cleanedText.length,
        // Storage fields (backward compatible - null if storage not configured)
        fileKey: storageResult?.key || null,
        fileUrl: storageResult?.url || null,
        fileStored: storageResult?.uploaded || false,
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
