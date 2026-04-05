/**
 * Centralized Auth & Tenant Helper
 * Zion Recruit - Multi-tenant security layer
 *
 * Usage in API routes:
 *   import { requireAuth, requireTenant } from '@/lib/auth-helper';
 *   const { user, session } = await requireAuth();
 *   const tenantId = requireTenant(user);
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { db } from "./db";

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  tenantId: string;
  tenantSlug: string | null;
  role: string | null;
}

/**
 * Require authentication - returns user or throws 401
 */
export async function requireAuth(): Promise<{
  user: AuthUser;
  session: Awaited<ReturnType<typeof getServerSession>>;
}> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new AuthError("Não autorizado", 401);
  }

  // Ensure tenantId exists
  if (!session.user.tenantId) {
    // Try to get first membership
    const membership = await db.tenantMember.findFirst({
      where: { userId: session.user.id },
      include: { tenant: true },
      orderBy: { joinedAt: "asc" },
    });

    if (!membership) {
      throw new AuthError("Usuário sem organização. Entre em contato com o administrador.", 403);
    }

    // Update session with tenant info (stored in JWT for future requests)
    session.user.tenantId = membership.tenantId;
    session.user.tenantSlug = membership.tenant.slug;
    session.user.role = membership.role;
  }

  return {
    user: session.user as AuthUser,
    session,
  };
}

/**
 * Get tenantId from user - throws 400 if missing
 */
export function requireTenant(user: AuthUser): string {
  if (!user.tenantId) {
    throw new AuthError("Organização não encontrada. Faça login novamente.", 400);
  }
  return user.tenantId;
}

/**
 * Require specific role(s) - throws 403 if user doesn't have permission
 */
export function requireRole(user: AuthUser, roles: string | string[]): void {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  const roleHierarchy: Record<string, number> = {
    OWNER: 4,
    ADMIN: 3,
    RECRUITER: 2,
    VIEWER: 1,
  };

  const userLevel = roleHierarchy[user.role || "VIEWER"] || 0;
  const requiredLevel = Math.max(...allowedRoles.map((r) => roleHierarchy[r] || 0));

  if (userLevel < requiredLevel) {
    throw new AuthError("Permissão insuficiente para esta ação.", 403);
  }
}

/**
 * Get all tenant memberships for the current user
 */
export async function getUserMemberships(userId: string) {
  return db.tenantMember.findMany({
    where: { userId },
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
    orderBy: { joinedAt: "asc" },
  });
}

/**
 * Custom error class for auth failures
 */
export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

/**
 * Helper to create error responses
 */
export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }
  console.error("Auth error:", error);
  return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
}
