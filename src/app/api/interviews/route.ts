/**
 * Interviews API - Zion Recruit
 * Manage interview scheduling and feedback
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { InterviewStatus, InterviewType } from "@prisma/client";

// GET /api/interviews - List interviews
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
    const status = searchParams.get("status") as InterviewStatus | null;
    const type = searchParams.get("type") as InterviewType | null;
    const candidateId = searchParams.get("candidateId");
    const jobId = searchParams.get("jobId");
    const interviewerId = searchParams.get("interviewerId");
    const date = searchParams.get("date"); // Filter by specific date
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const upcoming = searchParams.get("upcoming") === "true";
    const past = searchParams.get("past") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    const where: Record<string, unknown> = { tenantId };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (candidateId) {
      where.candidateId = candidateId;
    }

    if (jobId) {
      where.jobId = jobId;
    }

    if (interviewerId) {
      where.interviewerId = interviewerId;
    }

    // Date filtering
    if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      where.scheduledAt = {
        gte: targetDate,
        lt: nextDay,
      };
    } else if (startDate && endDate) {
      where.scheduledAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (upcoming) {
      where.scheduledAt = { gte: new Date() };
      where.status = { in: ["SCHEDULED", "CONFIRMED"] };
    } else if (past) {
      where.scheduledAt = { lt: new Date() };
      where.status = { in: ["COMPLETED", "NO_SHOW", "CANCELLED"] };
    }

    // Get interviews with related data
    const interviews = await db.interview.findMany({
      where,
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            photo: true,
            matchScore: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            department: true,
          },
        },
      },
      orderBy: {
        scheduledAt: "asc",
      },
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const total = await db.interview.count({ where });

    // Get counts by status
    const statusCounts = await db.interview.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: true,
    });

    // Get counts by type
    const typeCounts = await db.interview.groupBy({
      by: ["type"],
      where: { tenantId },
      _count: true,
    });

    return NextResponse.json({
      interviews,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      counts: {
        byStatus: statusCounts.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<string, number>),
        byType: typeCounts.reduce((acc, item) => {
          acc[item.type] = item._count;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    console.error("Error fetching interviews:", error);
    return NextResponse.json(
      { error: "Erro ao buscar entrevistas" },
      { status: 500 }
    );
  }
}

// POST /api/interviews - Create a new interview
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
      title,
      type,
      description,
      scheduledAt,
      duration,
      timezone,
      location,
      meetingUrl,
      meetingProvider,
      interviewerId,
      interviewerName,
      scheduledByAI,
      aiAgentId,
    } = body;

    // Validate required fields
    if (!candidateId || !jobId || !scheduledAt) {
      return NextResponse.json(
        { error: "Candidato, vaga e data/hora são obrigatórios" },
        { status: 400 }
      );
    }

    // Verify candidate belongs to tenant and job
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

    // Generate meeting URL if not provided
    const finalMeetingUrl = meetingUrl || generateMeetingUrl();

    // Generate title if not provided
    const finalTitle = title || `Entrevista ${type || "Screening"} - ${candidate.name}`;

    // Create interview
    const interview = await db.interview.create({
      data: {
        tenantId,
        candidateId,
        jobId,
        title: finalTitle,
        type: type || "SCREENING",
        description,
        scheduledAt: new Date(scheduledAt),
        duration: duration || 60,
        timezone: timezone || "America/Sao_Paulo",
        location,
        meetingUrl: finalMeetingUrl,
        meetingProvider: meetingProvider || "meet",
        interviewerId,
        interviewerName,
        scheduledByAI: scheduledByAI || false,
        aiAgentId,
        status: "SCHEDULED",
      },
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            photo: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            department: true,
          },
        },
      },
    });

    // Update candidate status to INTERVIEWING
    await db.candidate.update({
      where: { id: candidateId },
      data: {
        status: "INTERVIEWING",
        interviewStatus: "SCHEDULED",
        interviewAt: new Date(scheduledAt),
      },
    });

    return NextResponse.json({ interview }, { status: 201 });
  } catch (error) {
    console.error("Error creating interview:", error);
    return NextResponse.json(
      { error: "Erro ao criar entrevista" },
      { status: 500 }
    );
  }
}

// PUT /api/interviews - Update an interview
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
    const {
      id,
      title,
      type,
      description,
      scheduledAt,
      duration,
      timezone,
      location,
      meetingUrl,
      meetingProvider,
      interviewerId,
      interviewerName,
      status,
      feedback,
      rating,
      recommendation,
      strengths,
      weaknesses,
      followUpNotes,
      cancelReason,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID da entrevista é obrigatório" },
        { status: 400 }
      );
    }

    // Verify interview belongs to tenant
    const existingInterview = await db.interview.findFirst({
      where: { id, tenantId },
    });

    if (!existingInterview) {
      return NextResponse.json(
        { error: "Entrevista não encontrada" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (title !== undefined) updateData.title = title;
    if (type !== undefined) updateData.type = type;
    if (description !== undefined) updateData.description = description;
    if (scheduledAt !== undefined) updateData.scheduledAt = new Date(scheduledAt);
    if (duration !== undefined) updateData.duration = duration;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (location !== undefined) updateData.location = location;
    if (meetingUrl !== undefined) updateData.meetingUrl = meetingUrl;
    if (meetingProvider !== undefined) updateData.meetingProvider = meetingProvider;
    if (interviewerId !== undefined) updateData.interviewerId = interviewerId;
    if (interviewerName !== undefined) updateData.interviewerName = interviewerName;
    if (feedback !== undefined) updateData.feedback = feedback;
    if (rating !== undefined) updateData.rating = rating;
    if (recommendation !== undefined) updateData.recommendation = recommendation;
    if (strengths !== undefined) updateData.strengths = JSON.stringify(strengths);
    if (weaknesses !== undefined) updateData.weaknesses = JSON.stringify(weaknesses);
    if (followUpNotes !== undefined) updateData.followUpNotes = followUpNotes;
    if (cancelReason !== undefined) updateData.cancelReason = cancelReason;

    // Handle status changes
    if (status !== undefined && status !== existingInterview.status) {
      updateData.status = status;

      if (status === "CONFIRMED") {
        updateData.confirmedAt = new Date();
        updateData.confirmedBy = session?.user?.id || null;
      } else if (status === "CANCELLED") {
        updateData.cancelledAt = new Date();
        updateData.cancelledBy = session?.user?.id || null;
      } else if (status === "COMPLETED") {
        updateData.completedAt = new Date();
      } else if (status === "NO_SHOW") {
        updateData.noShowAt = new Date();
      }
    }

    // Update interview
    const interview = await db.interview.update({
      where: { id },
      data: updateData,
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            photo: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            department: true,
          },
        },
      },
    });

    // Update candidate status if needed
    if (status === "COMPLETED") {
      await db.candidate.update({
        where: { id: existingInterview.candidateId },
        data: { interviewStatus: "COMPLETED" },
      });
    } else if (status === "CANCELLED") {
      await db.candidate.update({
        where: { id: existingInterview.candidateId },
        data: { interviewStatus: "CANCELLED" },
      });
    } else if (status === "NO_SHOW") {
      await db.candidate.update({
        where: { id: existingInterview.candidateId },
        data: { interviewStatus: "NO_SHOW" },
      });
    }

    return NextResponse.json({ interview });
  } catch (error) {
    console.error("Error updating interview:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar entrevista" },
      { status: 500 }
    );
  }
}

// DELETE /api/interviews - Delete an interview
export async function DELETE(request: NextRequest) {
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
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID da entrevista é obrigatório" },
        { status: 400 }
      );
    }

    // Verify interview belongs to tenant
    const interview = await db.interview.findFirst({
      where: { id, tenantId },
    });

    if (!interview) {
      return NextResponse.json(
        { error: "Entrevista não encontrada" },
        { status: 404 }
      );
    }

    // Delete interview
    await db.interview.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Entrevista excluída com sucesso" });
  } catch (error) {
    console.error("Error deleting interview:", error);
    return NextResponse.json(
      { error: "Erro ao excluir entrevista" },
      { status: 500 }
    );
  }
}

// Helper function to generate meeting URL
function generateMeetingUrl(): string {
  const id = Math.random().toString(36).substring(2, 15);
  return `https://meet.zionrecruit.com/${id}`;
}
