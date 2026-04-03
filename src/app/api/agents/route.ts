import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/agents - List all AI agents
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const enabled = searchParams.get("enabled");

    // Build where clause
    const where: { tenantId: string; status?: string; type?: string; enabled?: boolean } = {
      tenantId: session.user.tenantId,
    };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (enabled !== null && enabled !== undefined) {
      where.enabled = enabled === "true";
    }

    const agents = await db.aIAgent.findMany({
      where,
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Transform to include task count
    const agentsWithCount = agents.map((agent) => ({
      ...agent,
      tasksCount: agent._count.tasks,
    }));

    return NextResponse.json({
      agents: agentsWithCount,
      total: agents.length,
    });
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json(
      { error: "Erro ao buscar agentes" },
      { status: 500 }
    );
  }
}

// POST /api/agents - Run an agent
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.tenantId) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { agentId, input, type } = body;

    if (!agentId && !type) {
      return NextResponse.json(
        { error: "ID ou tipo do agente é obrigatório" },
        { status: 400 }
      );
    }

    // Find the agent
    const agent = await db.aIAgent.findFirst({
      where: {
        tenantId: session.user.tenantId,
        ...(agentId ? { id: agentId } : { type }),
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: "Agente não encontrado" },
        { status: 404 }
      );
    }

    if (!agent.enabled) {
      return NextResponse.json(
        { error: "Agente está desabilitado" },
        { status: 400 }
      );
    }

    if (agent.status === "RUNNING") {
      return NextResponse.json(
        { error: "Agente já está em execução" },
        { status: 400 }
      );
    }

    // Create a new task
    const task = await db.aITask.create({
      data: {
        tenantId: session.user.tenantId,
        agentId: agent.id,
        type: type || agent.type,
        input: JSON.stringify(input || {}),
        status: "PENDING",
        priority: 5,
      },
    });

    // Update agent status
    await db.aIAgent.update({
      where: { id: agent.id },
      data: {
        status: "RUNNING",
        lastRunAt: new Date(),
        totalRuns: { increment: 1 },
      },
    });

    return NextResponse.json({
      task,
      message: "Tarefa criada com sucesso",
    });
  } catch (error) {
    console.error("Error running agent:", error);
    return NextResponse.json(
      { error: "Erro ao executar agente" },
      { status: 500 }
    );
  }
}
