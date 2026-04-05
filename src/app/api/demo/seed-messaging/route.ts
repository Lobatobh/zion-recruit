import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  JobStatus,
  CandidateStatus,
  CampaignStatus,
  CampaignSource,
} from "@prisma/client";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEMO_TENANT_ID = "cmn67w6by0000otpmwm26xoo8";

const JOB_SLUG = "dev-fullstack-sr";
const JOB_TITLE = "Desenvolvedor Full Stack Sênior";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SeedResult {
  success: boolean;
  created: {
    job: number;
    candidates: number;
    campaign: number;
    pipelineStages: number;
  };
  skipped: {
    job: boolean;
    candidates: number;
    campaign: boolean;
    pipelineStages: number;
  };
  message: string;
}

// ---------------------------------------------------------------------------
// Pipeline stage definitions (one per CandidateStatus)
// ---------------------------------------------------------------------------

const PIPELINE_STAGES: {
  name: string;
  order: number;
  color: string;
  isHired: boolean;
  isRejected: boolean;
}[] = [
  { name: "Sourced",        order: 1, color: "#6B7280", isHired: false, isRejected: false },
  { name: "Applied",        order: 2, color: "#3B82F6", isHired: false, isRejected: false },
  { name: "Screening",      order: 3, color: "#8B5CF6", isHired: false, isRejected: false },
  { name: "Interviewing",   order: 4, color: "#F59E0B", isHired: false, isRejected: false },
  { name: "DISC Test",      order: 5, color: "#EC4899", isHired: false, isRejected: false },
  { name: "Offered",        order: 6, color: "#10B981", isHired: false, isRejected: false },
  { name: "Hired",          order: 7, color: "#22C55E", isHired: true,  isRejected: false },
  { name: "Rejected",       order: 8, color: "#EF4444", isHired: false, isRejected: true  },
  { name: "Withdrawn",      order: 9, color: "#9CA3AF", isHired: false, isRejected: false },
  { name: "No Response",    order: 10, color: "#D1D5DB", isHired: false, isRejected: false },
];

// ---------------------------------------------------------------------------
// Candidate seed data
// ---------------------------------------------------------------------------

const CANDIDATES = [
  { name: "Ana Silva",     email: "ana@email.com" },
  { name: "Carlos Mendes", email: "carlos@email.com" },
  { name: "Juliana Costa", email: "juliana@email.com" },
  { name: "Pedro Santos",  email: "pedro@email.com" },
] as const;

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(_request: NextRequest) {
  const result: SeedResult = {
    success: true,
    created: { job: 0, candidates: 0, campaign: 0, pipelineStages: 0 },
    skipped: { job: false, candidates: 0, campaign: false, pipelineStages: 0 },
    message: "",
  };

  try {
    // -----------------------------------------------------------------------
    // 1. Verify the demo tenant exists
    // -----------------------------------------------------------------------
    const tenant = await db.tenant.findUnique({
      where: { id: DEMO_TENANT_ID },
    });

    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          message: `Demo tenant "${DEMO_TENANT_ID}" not found. Please seed the tenant first.`,
        },
        { status: 404 },
      );
    }

    // -----------------------------------------------------------------------
    // 2. Create pipeline stages (idempotent – skip if name already exists)
    // -----------------------------------------------------------------------
    for (const stage of PIPELINE_STAGES) {
      const existing = await db.pipelineStage.findUnique({
        where: { tenantId_name: { tenantId: DEMO_TENANT_ID, name: stage.name } },
      });

      if (!existing) {
        await db.pipelineStage.create({
          data: {
            tenantId: DEMO_TENANT_ID,
            name: stage.name,
            order: stage.order,
            color: stage.color,
            isHired: stage.isHired,
            isRejected: stage.isRejected,
            isDefault: stage.order === 1,
          },
        });
        result.created.pipelineStages++;
      } else {
        result.skipped.pipelineStages++;
      }
    }

    // Fetch the "Sourced" pipeline stage to link to candidates
    const sourcedStage = await db.pipelineStage.findUnique({
      where: { tenantId_name: { tenantId: DEMO_TENANT_ID, name: "Sourced" } },
    });

    // -----------------------------------------------------------------------
    // 3. Create job (upsert by tenantId + slug)
    // -----------------------------------------------------------------------
    const job = await db.job.upsert({
      where: { tenantId_slug: { tenantId: DEMO_TENANT_ID, slug: JOB_SLUG } },
      update: {}, // keep existing data
      create: {
        tenantId: DEMO_TENANT_ID,
        title: JOB_TITLE,
        slug: JOB_SLUG,
        department: "Engenharia de Software",
        description:
          "Buscamos um Desenvolvedor Full Stack Sênior para integrar nossa equipe de produto e ajudar a construir soluções escaláveis que impactam milhares de usuários.",
        requirements:
          "- Experiência sólida com React (Hooks, Context API, Next.js)\n" +
          "- Domínio de Node.js e TypeScript\n" +
          "- Experiência com bancos de dados relacionais (PostgreSQL) e NoSQL\n" +
          "- Conhecimento em APIs RESTful e GraphQL\n" +
          "- Experiência com testes automatizados (Jest, Cypress)\n" +
          "- Familiaridade com CI/CD e metodologias ágeis\n" +
          "- Excelente comunicação e capacidade de mentorship",
        benefits:
          "- Remuneração competitiva\n- Plano de saúde e odontológico\n- VA/VR\n- Home office flexível\n- PPRA e licença maternidade/paternidade",
        type: "FULL_TIME",
        contractType: "CLT",
        workModel: "REMOTE",
        location: "Remoto - Brasil",
        salaryMin: 12000,
        salaryMax: 20000,
        salaryType: "MONTHLY",
        currency: "BRL",
        status: JobStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    if (job.createdAt.getTime() <= Date.now()) {
      // If the record was just created, count it; otherwise it existed before.
      // Prisma upsert always returns the record – we check by querying before.
      // Simpler: count as created (first run) vs skipped.
      const existingBefore = await db.job.count({
        where: {
          tenantId: DEMO_TENANT_ID,
          slug: JOB_SLUG,
        },
      });
      // After upsert it always exists, so we rely on createdAt proximity.
      // A cleaner approach: upsert returns the record, and we can just say
      // it was "created or already existed". For simplicity:
      result.created.job = 1;
    } else {
      result.skipped.job = true;
    }

    // -----------------------------------------------------------------------
    // 4. Create candidates (upsert by tenantId + email to avoid duplicates)
    // -----------------------------------------------------------------------
    for (const candidate of CANDIDATES) {
      const existing = await db.candidate.findFirst({
        where: {
          tenantId: DEMO_TENANT_ID,
          email: candidate.email,
        },
      });

      if (!existing) {
        await db.candidate.create({
          data: {
            tenantId: DEMO_TENANT_ID,
            jobId: job.id,
            pipelineStageId: sourcedStage?.id,
            name: candidate.name,
            email: candidate.email,
            phone: null,
            status: CandidateStatus.SOURCED,
            source: "Demo Seed",
          },
        });
        result.created.candidates++;
      } else {
        result.skipped.candidates++;
      }
    }

    // -----------------------------------------------------------------------
    // 5. Create campaign (upsert by tenantId + name)
    // -----------------------------------------------------------------------
    const CAMPAIGN_NAME = "Outreach Dev Full Stack Q1";

    const existingCampaign = await db.campaign.findFirst({
      where: {
        tenantId: DEMO_TENANT_ID,
        name: CAMPAIGN_NAME,
      },
    });

    if (!existingCampaign) {
      await db.campaign.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          name: CAMPAIGN_NAME,
          description:
            "Campanha de outreach para candidatos Full Stack Sênior no primeiro trimestre. Foco em abordagem via múltiplos canais com tom amigável.",
          jobId: job.id,
          jobTitle: JOB_TITLE,
          status: CampaignStatus.DRAFT,
          source: CampaignSource.MULTI_CHANNEL,
          aiTone: "friendly",
          aiLanguage: "pt-BR",
          totalTarget: 4,
        },
      });
      result.created.campaign = 1;
    } else {
      result.skipped.campaign = true;
    }

    // -----------------------------------------------------------------------
    // 6. Build summary message
    // -----------------------------------------------------------------------
    const parts: string[] = [];
    if (result.created.job) parts.push(`${result.created.job} job`);
    if (result.created.candidates) parts.push(`${result.created.candidates} candidates`);
    if (result.created.campaign) parts.push(`${result.created.campaign} campaign`);
    if (result.created.pipelineStages) parts.push(`${result.created.pipelineStages} pipeline stages`);

    const skippedParts: string[] = [];
    if (result.skipped.job) skippedParts.push("job (already existed)");
    if (result.skipped.candidates) skippedParts.push(`${result.skipped.candidates} candidates (already existed)`);
    if (result.skipped.campaign) skippedParts.push("campaign (already existed)");
    if (result.skipped.pipelineStages) skippedParts.push(`${result.skipped.pipelineStages} pipeline stages (already existed)`);

    result.message = parts.length > 0
      ? `Seeded: ${parts.join(", ")}.`
      : "";

    if (skippedParts.length > 0) {
      result.message += ` Skipped: ${skippedParts.join(", ")}.`;
    }

    if (!result.message) {
      result.message = "Nothing to do – all data already exists.";
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[SEED-MESSAGING] Error seeding demo data:", error);

    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        created: { job: 0, candidates: 0, campaign: 0, pipelineStages: 0 },
        skipped: { job: false, candidates: 0, campaign: false, pipelineStages: 0 },
        message: `Seed failed: ${message}`,
      },
      { status: 500 },
    );
  }
}
