/**
 * Parse Resume API - Zion Recruit
 * Parse resume text without creating a candidate (for preview)
 * Transforms AI response into the format expected by the frontend component
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseResume, validateResumeContent } from "@/lib/resume-parser";

interface ParseResumeBody {
  resumeText: string;
  resumeBase64?: string;
}

// POST /api/candidates/parse-resume - Parse resume for preview
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const body: ParseResumeBody = await request.json();
    let { resumeText, resumeBase64 } = body;

    // Handle base64 encoded content
    if (resumeBase64 && !resumeText) {
      try {
        resumeText = Buffer.from(resumeBase64, "base64").toString("utf-8");
      } catch {
        return NextResponse.json(
          { error: "Falha ao decodificar conteúdo base64" },
          { status: 400 }
        );
      }
    }

    if (!resumeText) {
      return NextResponse.json(
        { error: "resumeText ou resumeBase64 é obrigatório" },
        { status: 400 }
      );
    }

    // Validate content
    const validation = validateResumeContent(resumeText);
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        warnings: validation.issues,
        data: null,
      });
    }

    // Parse resume
    const result = await parseResume(
      resumeText,
      session.user.tenantId,
      true // use cache
    );

    if (!result.success || !result.data) {
      return NextResponse.json({
        success: false,
        error: result.error || "Falha ao processar currículo",
        data: null,
      });
    }

    const d = result.data;

    // Transform AI response to match frontend ParsedData interface.
    // AI returns skills/languages as string[], but frontend expects {name, level} objects.
    const skills = Array.isArray(d.skills)
      ? d.skills.map((s: unknown) =>
          typeof s === "string"
            ? { name: s, level: undefined as string | undefined }
            : s
        )
      : [];

    const languages = Array.isArray(d.languages)
      ? d.languages.map((l: unknown) =>
          typeof l === "string"
            ? { name: l, level: undefined as string | undefined }
            : l
        )
      : [];

    const experience = Array.isArray(d.experience)
      ? d.experience.map((e: any) => ({
          company: e.company || "",
          title: e.title || "",
          startDate: e.startDate,
          endDate: e.endDate,
          years: e.years,
        }))
      : [];

    const education = Array.isArray(d.education)
      ? d.education.map((e: any) => ({
          institution: e.institution || "",
          degree: e.degree || "",
          year: e.year,
        }))
      : [];

    return NextResponse.json({
      success: true,
      cached: result.cached,
      data: {
        name: d.name || undefined,
        email: d.email || undefined,
        phone: d.phone || undefined,
        linkedin: (d as any).linkedin || undefined,
        skills,
        experience,
        education,
        languages,
        summary: d.summary || undefined,
        confidence: d.parsingConfidence || 0,
      },
    });
  } catch (error) {
    console.error("Error parsing resume:", error);
    const message = error instanceof Error ? error.message : "Erro ao processar currículo";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
