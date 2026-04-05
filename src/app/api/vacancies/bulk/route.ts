/**
 * Bulk Vacancies API - Zion Recruit
 * POST /api/vacancies/bulk - Bulk actions (archive, delete, status change)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireTenant, authErrorResponse } from "@/lib/auth-helper";

interface BulkActionBody {
  action: "archive" | "delete" | "publish" | "close" | "restore";
  ids: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);

    const body: BulkActionBody = await request.json();
    const { action, ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "IDs são obrigatórios" },
        { status: 400 }
      );
    }

    if (ids.length > 50) {
      return NextResponse.json(
        { error: "Máximo de 50 vagas por operação" },
        { status: 400 }
      );
    }

    let updatedCount = 0;

    switch (action) {
      case "archive":
        updatedCount = await db.job.updateMany({
          where: { id: { in: ids }, tenantId },
          data: { status: "ARCHIVED" },
        }).then((r) => r.count);
        break;

      case "delete":
        updatedCount = await db.job.deleteMany({
          where: { id: { in: ids }, tenantId },
        }).then((r) => r.count);
        break;

      case "publish":
        updatedCount = await db.job.updateMany({
          where: { id: { in: ids }, tenantId },
          data: {
            status: "PUBLISHED",
            publishedAt: new Date(),
          },
        }).then((r) => r.count);
        break;

      case "close":
        updatedCount = await db.job.updateMany({
          where: { id: { in: ids }, tenantId },
          data: { status: "CLOSED" },
        }).then((r) => r.count);
        break;

      case "restore":
        updatedCount = await db.job.updateMany({
          where: { id: { in: ids }, tenantId, status: "ARCHIVED" },
          data: { status: "DRAFT" },
        }).then((r) => r.count);
        break;

      default:
        return NextResponse.json(
          { error: "Ação inválida" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `${updatedCount} vaga(s) atualizada(s) com sucesso`,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
