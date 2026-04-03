/**
 * Rate Limit Admin API - Zion Recruit
 * Manage and monitor rate limiting
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getRateLimitStats,
  resetRateLimit,
  clearAllRateLimits,
  RATE_LIMIT_CONFIGS,
} from "@/lib/rate-limit";

// GET /api/admin/rate-limit - Get rate limit stats
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Only allow admins
    if (!session?.user?.tenantId || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores." },
        { status: 403 }
      );
    }

    const stats = getRateLimitStats();

    return NextResponse.json({
      stats,
      configs: Object.entries(RATE_LIMIT_CONFIGS).map(([type, config]) => ({
        type,
        maxRequests: config.maxRequests,
        windowMs: config.windowMs,
        windowSeconds: config.windowMs / 1000,
      })),
    });
  } catch (error) {
    console.error("Error getting rate limit stats:", error);
    return NextResponse.json(
      { error: "Erro ao obter estatísticas" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/rate-limit - Reset rate limits
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Only allow admins
    if (!session?.user?.tenantId || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas administradores." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    const clearAll = searchParams.get("all") === "true";

    if (clearAll) {
      clearAllRateLimits();
      return NextResponse.json({
        success: true,
        message: "Todos os limites de taxa foram resetados",
      });
    }

    if (key) {
      const success = resetRateLimit(key);
      return NextResponse.json({
        success,
        message: success
          ? `Limite de taxa resetado para: ${key}`
          : `Chave não encontrada: ${key}`,
      });
    }

    return NextResponse.json(
      { error: "Especifique 'key' ou use 'all=true'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error resetting rate limits:", error);
    return NextResponse.json(
      { error: "Erro ao resetar limites" },
      { status: 500 }
    );
  }
}
