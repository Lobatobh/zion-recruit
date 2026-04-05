/**
 * Tenant API - Multi-tenant management
 * GET  /api/tenant         - List all organizations the user belongs to
 * POST /api/tenant         - Create a new organization (tenant)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, authErrorResponse, getUserMemberships } from "@/lib/auth-helper";
import { db } from "@/lib/db";

// GET /api/tenant - List user's organizations
export async function GET() {
  try {
    const { user } = await requireAuth();

    const memberships = await getUserMemberships(user.id);

    return NextResponse.json({
      currentTenantId: user.tenantId,
      currentTenantSlug: user.tenantSlug,
      currentRole: user.role,
      organizations: memberships.map((m) => ({
        id: m.tenantId,
        name: m.tenant.name,
        slug: m.tenant.slug,
        logo: m.tenant.logo,
        role: m.role,
        plan: m.tenant.plan,
      })),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

// POST /api/tenant - Create a new organization (tenant)
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const body = await request.json();
    const { name, slug } = body;

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json(
        { error: "Nome e identificador são obrigatórios" },
        { status: 400 }
      );
    }

    // Validate slug format (lowercase, alphanumeric, hyphens)
    const slugRegex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: "Identificador deve conter apenas letras minúsculas, números e hífens" },
        { status: 400 }
      );
    }

    // Check slug availability
    const existingTenant = await db.tenant.findUnique({
      where: { slug },
    });

    if (existingTenant) {
      return NextResponse.json(
        { error: "Este identificador já está em uso" },
        { status: 409 }
      );
    }

    // Create tenant with membership in a transaction
    const tenant = await db.$transaction(async (tx) => {
      // Create tenant
      const newTenant = await tx.tenant.create({
        data: {
          name,
          slug,
          plan: "FREE",
          maxJobs: 10,
          maxMembers: 5,
          maxCandidates: 500,
        },
      });

      // Create membership (user becomes OWNER)
      await tx.tenantMember.create({
        data: {
          tenantId: newTenant.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      // Create default pipeline stages
      const defaultStages = [
        { name: "Novo", order: 1, color: "#6B7280", isDefault: true },
        { name: "Triagem", order: 2, color: "#3B82F6" },
        { name: "Entrevista", order: 3, color: "#F59E0B" },
        { name: "Teste Técnico", order: 4, color: "#8B5CF6" },
        { name: "DISC", order: 5, color: "#EC4899" },
        { name: "Final", order: 6, color: "#10B981" },
        { name: "Contratado", order: 7, color: "#059669", isHired: true },
        { name: "Rejeitado", order: 8, color: "#EF4444", isRejected: true },
      ];

      for (const stage of defaultStages) {
        await tx.pipelineStage.create({
          data: {
            tenantId: newTenant.id,
            ...stage,
          },
        });
      }

      return newTenant;
    });

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        plan: tenant.plan,
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
