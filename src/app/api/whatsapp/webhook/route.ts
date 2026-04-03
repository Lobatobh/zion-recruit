/**
 * WhatsApp Webhook API - Zion Recruit
 * Receive messages from Evolution API
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/whatsapp/webhook - Receive webhook events from Evolution API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { event, instance, data } = body;

    console.log("[WhatsApp Webhook] Event:", event, "Instance:", instance);

    // Handle different event types
    switch (event) {
      case "MESSAGES_UPSERT":
        return await handleMessage(data);

      case "CONNECTION_UPDATE":
        return await handleConnectionUpdate(data);

      case "QRCODE_UPDATED":
        return await handleQRCodeUpdate(data);

      default:
        console.log("[WhatsApp Webhook] Unknown event:", event);
        return NextResponse.json({ received: true });
    }
  } catch (error) {
    console.error("[WhatsApp Webhook] Error:", error);
    return NextResponse.json(
      { error: "Erro ao processar webhook" },
      { status: 500 }
    );
  }
}

// Handle incoming messages
async function handleMessage(data: unknown): Promise<NextResponse> {
  const message = data as {
    key?: { remoteJid?: string; fromMe?: boolean; id?: string };
    message?: { conversation?: string; extendedTextMessage?: { text?: string } };
    messageTimestamp?: number;
    pushName?: string;
  };

  // Ignore messages sent by us
  if (message.key?.fromMe) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const from = message.key?.remoteJid?.split("@")[0] || "";
  const body =
    message.message?.conversation ||
    message.message?.extendedTextMessage?.text ||
    "";
  const timestamp = message.messageTimestamp;

  if (!from || !body) {
    return NextResponse.json({ received: true, ignored: true });
  }

  console.log("[WhatsApp Webhook] Message from:", from, "Body:", body.substring(0, 50));

  // Find candidate by phone number
  const candidate = await db.candidate.findFirst({
    where: {
      phone: { contains: from.replace(/\D/g, "").slice(-11) },
    },
    select: {
      id: true,
      name: true,
      tenantId: true,
    },
  });

  if (!candidate) {
    console.log("[WhatsApp Webhook] No candidate found for phone:", from);
    return NextResponse.json({ received: true, candidateFound: false });
  }

  // Get or create conversation
  let conversation = await db.conversation.findFirst({
    where: { candidateId: candidate.id },
    select: { id: true },
  });

  if (!conversation) {
    conversation = await db.conversation.create({
      data: {
        tenantId: candidate.tenantId,
        candidateId: candidate.id,
        channel: "WHATSAPP",
        status: "ACTIVE",
        aiMode: "HYBRID",
      },
    });
  }

  // Save message
  await db.message.create({
    data: {
      conversationId: conversation.id,
      senderType: "CANDIDATE",
      senderName: candidate.name || "Unknown",
      content: body,
      contentType: "TEXT",
      channel: "WHATSAPP",
      status: "RECEIVED",
      isAiGenerated: false,
      sentAt: new Date(timestamp ? timestamp * 1000 : Date.now()),
    },
  });

  // Update conversation
  await db.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: new Date(),
      lastMessagePreview: body.substring(0, 100),
      unreadCount: { increment: 1 },
    },
  });

  // Trigger AI processing if enabled
  // This would normally be done asynchronously
  try {
    await fetch(`${process.env.NEXTAUTH_URL}/api/messages/conversations/${conversation.id}/ai-process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: body, from }),
    });
  } catch (error) {
    console.error("[WhatsApp Webhook] Error triggering AI:", error);
  }

  return NextResponse.json({
    received: true,
    candidateFound: true,
    candidateName: candidate.name,
  });
}

// Handle connection updates
async function handleConnectionUpdate(data: unknown): Promise<NextResponse> {
  const update = data as { state?: string };

  console.log("[WhatsApp Webhook] Connection state:", update.state);

  return NextResponse.json({ received: true, state: update.state });
}

// Handle QR code updates
async function handleQRCodeUpdate(data: unknown): Promise<NextResponse> {
  const update = data as { qrcode?: { base64?: string } };

  console.log("[WhatsApp Webhook] QR Code updated");

  return NextResponse.json({ received: true, hasQRCode: !!update.qrcode?.base64 });
}

// GET /api/whatsapp/webhook - Verify webhook (for Evolution API)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get("hub.challenge");

  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({
    status: "active",
    timestamp: new Date().toISOString(),
  });
}
