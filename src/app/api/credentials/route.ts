/**
 * API Credentials Management API
 * CRUD operations for API credentials
 * Supports: AI APIs, Database (Supabase), Communication, Cloud Services
 * 
 * Encryption: AES-256-GCM for secure credential storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { ApiProvider } from '@prisma/client';
import { encrypt, decrypt, checkEncryptionStatus } from '@/lib/encryption';
import { llmService } from '@/lib/agents/base/LLMService';

// Log encryption status on module load
const encryptionStatus = checkEncryptionStatus();
if (!encryptionStatus.isConfigured) {
  console.warn('⚠️  API Credentials: ' + encryptionStatus.message);
}

// GET /api/credentials - List all credentials
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Get tenant
    let tenantId = session?.user?.tenantId;
    if (!tenantId) {
      const tenant = await db.tenant.findFirst();
      tenantId = tenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');
    const category = searchParams.get('category');

    // Provider categories
    const providerCategories: Record<string, ApiProvider[]> = {
      ai: [ApiProvider.OPENAI, ApiProvider.GEMINI, ApiProvider.OPENROUTER, ApiProvider.ANTHROPIC],
      database: [ApiProvider.SUPABASE],
      communication: [ApiProvider.RESEND, ApiProvider.SENDGRID, ApiProvider.EVOLUTION, ApiProvider.TWILIO],
      integration: [ApiProvider.LINKEDIN, ApiProvider.STRIPE],
      cloud: [ApiProvider.AWS, ApiProvider.GOOGLE_CLOUD, ApiProvider.AZURE],
    };

    const where: Record<string, unknown> = { tenantId };

    if (provider && Object.values(ApiProvider).includes(provider as ApiProvider)) {
      where.provider = provider as ApiProvider;
    } else if (category && providerCategories[category]) {
      where.provider = { in: providerCategories[category] };
    }

    const credentials = await db.apiCredential.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        provider: true,
        name: true,
        description: true,
        isActive: true,
        isDefault: true,
        defaultModel: true,
        monthlyLimit: true,
        alertThreshold: true,
        currentUsage: true,
        lastUsedAt: true,
        lastError: true,
        lastErrorAt: true,
        createdAt: true,
        usageResetAt: true,
        // Extra fields
        projectUrl: true,
        region: true,
        accountId: true,
        instanceName: true,
        webhookUrl: true,
      },
    });

    return NextResponse.json({ credentials });
  } catch (error) {
    console.error('Error fetching credentials:', error);
    return NextResponse.json({ error: 'Failed to fetch credentials' }, { status: 500 });
  }
}

// POST /api/credentials - Create new credential
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Get tenant
    let tenantId = session?.user?.tenantId;
    if (!tenantId) {
      const tenant = await db.tenant.findFirst();
      tenantId = tenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      provider,
      name,
      description,
      apiKey,
      apiSecret,
      endpoint,
      organizationId,
      defaultModel,
      monthlyLimit,
      alertThreshold = 80,
      isDefault = false,
      // Extra fields
      projectUrl,
      projectKey,
      region,
      accountId,
      instanceName,
      webhookUrl,
    } = body;

    // Validate required fields
    if (!provider || !name || !apiKey) {
      return NextResponse.json(
        { error: 'Provider, name, and apiKey are required' },
        { status: 400 }
      );
    }

    // Validate provider
    if (!Object.values(ApiProvider).includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider' },
        { status: 400 }
      );
    }

    // Check for duplicate
    const existing = await db.apiCredential.findUnique({
      where: {
        tenantId_provider_name: {
          tenantId,
          provider,
          name,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Credential with this name already exists for this provider' },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults for this provider
    if (isDefault) {
      await db.apiCredential.updateMany({
        where: { tenantId, provider },
        data: { isDefault: false },
      });
    }

    // Encrypt sensitive fields using AES-256-GCM
    const encryptedKey = encrypt(apiKey);
    const encryptedSecret = apiSecret ? encrypt(apiSecret) : null;
    const encryptedProjectKey = projectKey ? encrypt(projectKey) : null;

    // Create credential
    const credential = await db.apiCredential.create({
      data: {
        tenantId,
        provider,
        name,
        description,
        apiKey: encryptedKey,
        apiSecret: encryptedSecret,
        endpoint,
        organizationId,
        defaultModel,
        monthlyLimit,
        alertThreshold,
        isDefault,
        // Extra fields
        projectUrl,
        projectKey: encryptedProjectKey,
        region,
        accountId,
        instanceName,
        webhookUrl,
      },
    });

    // Invalidate LLM credential cache so agents pick up the new credential
    llmService.clearCredentialCache();

    return NextResponse.json({ credential }, { status: 201 });
  } catch (error) {
    console.error('Error creating credential:', error);
    return NextResponse.json({ error: 'Failed to create credential' }, { status: 500 });
  }
}
