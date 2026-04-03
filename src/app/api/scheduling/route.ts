/**
 * Scheduling API - Zion Recruit
 * Schedule and manage interviews
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { scheduleInterview, getAvailableSlots } from "@/lib/agents/specialized/SchedulerAgent";

// GET /api/scheduling - Get available time slots
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Get tenant - either from session or first available (demo mode)
    let tenantId = session?.user?.tenantId;
    if (!tenantId) {
      const tenant = await db.tenant.findFirst();
      tenantId = tenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: "Organização não encontrada" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const duration = parseInt(searchParams.get("duration") || "60");
    const preferredDates = searchParams.get("dates")?.split(",");

    // Get available slots
    const slots = await getAvailableSlots(tenantId, duration, preferredDates);

    return NextResponse.json({
      slots,
      total: slots.length,
    });
  } catch (error) {
    console.error("Error getting available slots:", error);
    return NextResponse.json(
      { error: "Erro ao buscar horários disponíveis" },
      { status: 500 }
    );
  }
}

// POST /api/scheduling - Schedule an interview
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Get tenant - either from session or first available (demo mode)
    let tenantId = session?.user?.tenantId;
    if (!tenantId) {
      const tenant = await db.tenant.findFirst();
      tenantId = tenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: "Organização não encontrada" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      candidateId,
      jobId,
      interviewType,
      duration,
      preferredDates,
      timezone,
    } = body;

    if (!candidateId || !jobId) {
      return NextResponse.json(
        { error: "candidateId e jobId são obrigatórios" },
        { status: 400 }
      );
    }

    // Verify candidate belongs to tenant
    const candidate = await db.candidate.findFirst({
      where: {
        id: candidateId,
        jobId,
        tenantId,
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidato não encontrado" },
        { status: 404 }
      );
    }

    // Schedule interview
    const result = await scheduleInterview(tenantId, candidateId, jobId, {
      interviewType: interviewType || "SCREENING",
      duration: duration || 60,
      preferredDates,
      timezone,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Erro ao agendar entrevista" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      schedule: result.data?.schedule,
      proposedSlots: result.data?.proposedSlots,
      message: result.data?.message,
      inviteSent: result.data?.inviteSent,
    });
  } catch (error) {
    console.error("Error scheduling interview:", error);
    return NextResponse.json(
      { error: "Erro ao agendar entrevista" },
      { status: 500 }
    );
  }
}

// PUT /api/scheduling - Reschedule an interview
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Get tenant - either from session or first available (demo mode)
    let tenantId = session?.user?.tenantId;
    if (!tenantId) {
      const tenant = await db.tenant.findFirst();
      tenantId = tenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: "Organização não encontrada" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { candidateId, newDate } = body;

    if (!candidateId || !newDate) {
      return NextResponse.json(
        { error: "candidateId e newDate são obrigatórios" },
        { status: 400 }
      );
    }

    // Get candidate
    const candidate = await db.candidate.findUnique({
      where: { id: candidateId },
      select: { jobId: true },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidato não encontrado" },
        { status: 404 }
      );
    }

    // Update interview date
    await db.candidate.update({
      where: { id: candidateId },
      data: {
        interviewAt: new Date(newDate),
      },
    });

    return NextResponse.json({
      message: "Entrevista remarcada com sucesso",
      newDate,
    });
  } catch (error) {
    console.error("Error rescheduling interview:", error);
    return NextResponse.json(
      { error: "Erro ao remarcar entrevista" },
      { status: 500 }
    );
  }
}
