/**
 * Resume Upload API - Zion Recruit
 * Server-side file upload endpoint for resume/CV files.
 * Accepts PDF, DOC, DOCX, TXT files via multipart/form-data.
 * Extracts text and optionally parses with AI.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import path from "path";

// Maximum file size: 5MB
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

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

    return NextResponse.json({
      success: true,
      data: {
        text: cleanedText,
        fileName: file.name,
        fileSize: file.size,
        fileType: fileExt,
        textLength: cleanedText.length,
      },
    });
  } catch (error) {
    console.error("[ResumeUpload] Error:", error);
    const message = error instanceof Error ? error.message : "Erro ao processar arquivo";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
