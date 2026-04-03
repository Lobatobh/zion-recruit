import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/agents/tasks - Get all tasks with filtering
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

    // Pagination
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const skip = (page - 1) * limit;

    // Filters
    const status = searchParams.get("status");
    const agentId = searchParams.get("agentId");
    const agentType = searchParams.get("agentType");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    // Build where clause
    const where: {
      tenantId: string;
      status?: string;
      agentId?: string;
      agent?: { type: string };
      createdAt?: { gte?: Date; lte?: Date };
    } = {
      tenantId: session.user.tenantId,
    };

    if (status) {
      where.status = status;
    }

    if (agentId) {
      where.agentId = agentId;
    }

    if (agentType) {
      where.agent = {
        type: agentType,
      };
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) {
        where.createdAt.gte = new Date(fromDate);
      }
      if (toDate) {
        where.createdAt.lte = new Date(toDate);
      }
    }

    // Get tasks with agent info
    const tasks = await db.aITask.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    // Get total count for pagination
    const total = await db.aITask.count({ where });

    // Get status counts
    const statusCounts = await db.aITask.groupBy({
      by: ["status"],
      where: {
        tenantId: session.user.tenantId,
      },
      _count: {
        status: true,
      },
    });

    const statusSummary = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statusSummary,
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Erro ao buscar tarefas" },
      { status: 500 }
    );
  }
}
