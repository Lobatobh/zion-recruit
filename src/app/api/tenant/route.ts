/**
 * Tenant API - List user's memberships and switch tenant
 * GET  /api/tenant      - List all organizations the user belongs to
 * POST /api/tenant/switch - Switch to a different tenant
 */

import { NextResponse } from "next/server";
import { requireAuth, requireRole, requireTenant, authErrorResponse, getUserMemberships } from "@/lib/auth-helper";

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
