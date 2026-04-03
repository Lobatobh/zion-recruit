import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/agents/[id]/tasks - Get tasks for a specific agent
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
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    // Filters
    const status = searchParams.get("status");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Verify agent belongs to user's organization
    const agent = await db.aIAgent.findFirst({
      where: {
        id,
        tenantId: session.user.tenantId,
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: "Agente não encontrado" },
        { status: 404 }
      );
    }

    // Build where clause
    const where: {
      agentId: string;
      tenantId: string;
      status?: string;
    } = {
      agentId: id,
      tenantId: session.user.tenantId,
    };

    if (status) {
      where.status = status;
    }

    // Get tasks
    const tasks = await db.aITask.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
    });

    // Get total count for pagination
    const total = await db.aITask.count({ where });

    return NextResponse.json({
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching agent tasks:", error);
    return NextResponse.json(
      { error: "Erro ao buscar tarefas do agente" },
      { status: 500 }
    );
  }
}
