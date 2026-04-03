/**
 * Health Check API - Zion Recruit
 * Excluded from rate limiting
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    service: "zion-recruit-api",
  });
}
