/**
 * Scheduling API - Zion Recruit
 * Schedule and manage interviews
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireTenant, authErrorResponse } from "@/lib/auth-helper";
import { scheduleInterview, getAvailableSlots } from "@/lib/agents/specialized/SchedulerAgent";

// GET /api/scheduling - Get available time slots
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);

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
    return authErrorResponse(error);
  }
}

// POST /api/scheduling - Schedule an interview
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);

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
    return authErrorResponse(error);
  }
}

// PUT /api/scheduling - Reschedule an interview
export async function PUT(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);

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
    return authErrorResponse(error);
  }
}
