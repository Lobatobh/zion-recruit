import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/agents/[id] - Get specific agent details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const agent = await db.aIAgent.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
      include: {
        tasks: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
        credential: {
          select: {
            id: true,
            name: true,
            provider: true,
          },
        },
        _count: {
          select: { tasks: true },
        },
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: "Agente não encontrado" },
        { status: 404 }
      );
    }

    // Calculate stats
    const completedTasks = await db.aITask.count({
      where: {
        agentId: id,
        status: "COMPLETED",
      },
    });

    const failedTasks = await db.aITask.count({
      where: {
        agentId: id,
        status: "FAILED",
      },
    });

    const runningTasks = await db.aITask.count({
      where: {
        agentId: id,
        status: "RUNNING",
      },
    });

    const pendingTasks = await db.aITask.count({
      where: {
        agentId: id,
        status: "PENDING",
      },
    });

    const totalTokens = await db.aITask.aggregate({
      where: {
        agentId: id,
        tokensUsed: { not: null },
      },
      _sum: {
        tokensUsed: true,
      },
    });

    return NextResponse.json({
      agent: {
        ...agent,
        tasksCount: agent._count.tasks,
        stats: {
          completedTasks,
          failedTasks,
          runningTasks,
          pendingTasks,
          totalTokens: totalTokens._sum.tokensUsed || 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching agent:", error);
    return NextResponse.json(
      { error: "Erro ao buscar agente" },
      { status: 500 }
    );
  }
}

// PUT /api/agents/[id] - Update agent (enable/disable, update config)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { enabled, status, config, prompts, autoRun, schedule, credentialId } = body;

    // Verify agent belongs to user's organization
    const existingAgent = await db.aIAgent.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    });

    if (!existingAgent) {
      return NextResponse.json(
        { error: "Agente não encontrado" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: {
      enabled?: boolean;
      status?: string;
      config?: string;
      prompts?: string;
      autoRun?: boolean;
      schedule?: string;
      credentialId?: string | null;
    } = {};

    if (typeof enabled === "boolean") {
      updateData.enabled = enabled;
      if (!enabled) {
        updateData.status = "DISABLED";
      } else if (existingAgent.status === "DISABLED") {
        updateData.status = "IDLE";
      }
    }

    if (status && ["IDLE", "PAUSED", "ERROR"].includes(status)) {
      updateData.status = status;
    }

    if (config) {
      updateData.config = JSON.stringify(config);
    }

    if (prompts) {
      updateData.prompts = prompts;
    }

    if (typeof autoRun === "boolean") {
      updateData.autoRun = autoRun;
    }

    if (schedule) {
      updateData.schedule = schedule;
    }

    if (credentialId !== undefined) {
      updateData.credentialId = credentialId || null;
    }

    const updatedAgent = await db.aIAgent.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      agent: updatedAgent,
      message: "Agente atualizado com sucesso",
    });
  } catch (error) {
    console.error("Error updating agent:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar agente" },
      { status: 500 }
    );
  }
}
