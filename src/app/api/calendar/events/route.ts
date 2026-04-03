/**
 * Google Calendar Events API - Zion Recruit
 * Create and manage calendar events for interviews
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Helper to get effective tenant ID
async function getEffectiveTenantId(session: { user?: { id?: string; tenantId?: string | null } }): Promise<string | null> {
  if (session?.user?.tenantId) {
    const tenant = await db.tenant.findUnique({ where: { id: session.user.tenantId } });
    if (tenant) return tenant.id;
  }

  if (session?.user?.id) {
    const membership = await db.tenantMember.findFirst({
      where: { userId: session.user.id },
    });
    if (membership) return membership.tenantId;
  }

  const firstTenant = await db.tenant.findFirst();
  return firstTenant?.id || null;
}

// Interface for interview event
interface InterviewEvent {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  interviewType: string;
  startTime: string;
  endTime: string;
  location?: string;
  notes?: string;
  interviewerName?: string;
  interviewerEmail?: string;
}

// POST /api/calendar/events - Create interview event
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const effectiveTenantId = await getEffectiveTenantId(session);

    if (!effectiveTenantId) {
      return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
    }

    const body: InterviewEvent = await request.json();
    const {
      candidateId,
      candidateName,
      candidateEmail,
      jobTitle,
      interviewType,
      startTime,
      endTime,
      location,
      notes,
      interviewerName,
      interviewerEmail,
    } = body;

    // Validate required fields
    if (!candidateId || !candidateName || !candidateEmail || !startTime || !endTime) {
      return NextResponse.json({
        error: "Campos obrigatórios não informados",
      }, { status: 400 });
    }

    // Create event description
    const description = `
Entrevista: ${interviewType || "Entrevista"}
Candidato: ${candidateName}
Vaga: ${jobTitle}
${notes ? `\nNotas: ${notes}` : ""}
    `.trim();

    // Get Google Calendar credentials (would come from stored tokens in production)
    // For now, return a simulated response

    // In production, this would:
    // 1. Get stored Google OAuth tokens for the tenant
    // 2. Call Google Calendar API to create event
    // 3. Send email invitation to candidate

    const eventId = `interview-${candidateId}-${Date.now()}`;

    // Update candidate interview status
    await db.candidate.update({
      where: { id: candidateId },
      data: {
        interviewStatus: "SCHEDULED",
        interviewAt: new Date(startTime),
        interviewNotes: notes || null,
      },
    });

    // Create a note about the scheduled interview
    await db.note.create({
      data: {
        candidateId,
        type: "INTERVIEW",
        content: `Entrevista agendada para ${new Date(startTime).toLocaleString("pt-BR")}
Tipo: ${interviewType || "Entrevista"}
${location ? `Local: ${location}` : ""}
${notes ? `Notas: ${notes}` : ""}`,
        isPrivate: false,
      },
    });

    // Return event details
    return NextResponse.json({
      success: true,
      event: {
        id: eventId,
        summary: `Entrevista: ${candidateName} - ${jobTitle}`,
        description,
        start: startTime,
        end: endTime,
        location: location || "Online",
        attendees: [
          { email: candidateEmail, name: candidateName },
          ...(interviewerEmail ? [{ email: interviewerEmail, name: interviewerName || "Entrevistador" }] : []),
        ],
        htmlLink: `https://calendar.google.com/calendar/event?eid=${eventId}`,
      },
      message: "Entrevista agendada com sucesso",
    });
  } catch (error) {
    console.error("Error creating calendar event:", error);
    return NextResponse.json({ error: "Erro ao criar evento no calendário" }, { status: 500 });
  }
}

// GET /api/calendar/events - List upcoming interviews
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const effectiveTenantId = await getEffectiveTenantId(session);

    if (!effectiveTenantId) {
      return NextResponse.json({ error: "Organização não encontrada" }, { status: 404 });
    }

    // Get upcoming interviews from candidates
    const upcomingInterviews = await db.candidate.findMany({
      where: {
        tenantId: effectiveTenantId,
        interviewStatus: "SCHEDULED",
        interviewAt: {
          gte: new Date(),
        },
      },
      include: {
        job: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        interviewAt: "asc",
      },
      take: 20,
    });

    const events = upcomingInterviews.map((candidate) => ({
      id: `interview-${candidate.id}`,
      candidateId: candidate.id,
      candidateName: candidate.name,
      candidateEmail: candidate.email,
      jobTitle: candidate.job.title,
      start: candidate.interviewAt?.toISOString(),
      end: candidate.interviewAt ? new Date(candidate.interviewAt.getTime() + 60 * 60 * 1000).toISOString() : null,
      status: candidate.interviewStatus,
      notes: candidate.interviewNotes,
    }));

    return NextResponse.json({
      events,
      total: events.length,
    });
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return NextResponse.json({ error: "Erro ao buscar eventos do calendário" }, { status: 500 });
  }
}
