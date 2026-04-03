import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

// Create a fresh PrismaClient instance
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

export async function GET() {
  try {
    // Check if conversation model exists
    const models = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));
    
    // Try to use raw query as fallback
    let conversations: unknown[] = [];
    try {
      const result = await prisma.$queryRaw`SELECT * FROM conversations LIMIT 5`;
      conversations = result as unknown[];
    } catch (e) {
      console.error('Raw query error:', e);
    }

    return NextResponse.json({
      availableModels: models,
      conversationsCount: conversations.length,
      conversations: conversations,
    });
  } catch (error) {
    return NextResponse.json({
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
