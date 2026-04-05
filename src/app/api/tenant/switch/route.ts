/**
 * Switch Tenant API
 * POST /api/tenant/switch - Switch current user's active tenant
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/auth-helper";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const body = await request.json();
    const { tenantId } = body;

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId é obrigatório" }, { status: 400 });
    }

    // Verify user has access to this tenant
    const membership = await db.tenantMember.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId: user.id,
        },
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            plan: true,
          },
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Você não tem acesso a esta organização" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      tenant: {
        id: membership.tenantId,
        name: membership.tenant.name,
        slug: membership.tenant.slug,
        logo: membership.tenant.logo,
        role: membership.role,
        plan: membership.tenant.plan,
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
