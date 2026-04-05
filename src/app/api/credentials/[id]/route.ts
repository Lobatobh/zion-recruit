/**
 * API Credential Single Item API
 * GET, PUT, PATCH, DELETE operations for a single credential
 * 
 * Encryption: AES-256-GCM for secure credential storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, requireTenant, authErrorResponse } from '@/lib/auth-helper';
import { encrypt } from '@/lib/encryption';
import { llmService } from '@/lib/agents/base/LLMService';

// GET /api/credentials/[id] - Get single credential (without decrypting key)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);
    const { id } = await params;

    const credential = await db.apiCredential.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        provider: true,
        name: true,
        description: true,
        endpoint: true,
        organizationId: true,
        defaultModel: true,
        maxTokensPerCall: true,
        temperature: true,
        isActive: true,
        isDefault: true,
        monthlyLimit: true,
        alertThreshold: true,
        currentUsage: true,
        lastUsedAt: true,
        lastError: true,
        lastErrorAt: true,
        createdAt: true,
        updatedAt: true,
        usageResetAt: true,
        // Extra fields
        projectUrl: true,
        region: true,
        accountId: true,
        instanceName: true,
        webhookUrl: true,
      },
    });

    if (!credential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    return NextResponse.json({ credential });
  } catch (error) {
    return authErrorResponse(error);
  }
}

// PUT /api/credentials/[id] - Full update credential
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);
    const { id } = await params;

    const body = await request.json();
    const {
      name,
      description,
      apiKey,
      apiSecret,
      endpoint,
      organizationId,
      defaultModel,
      maxTokensPerCall,
      temperature,
      isActive,
      isDefault,
      monthlyLimit,
      alertThreshold,
      // Extra fields
      projectUrl,
      projectKey,
      region,
      accountId,
      instanceName,
      webhookUrl,
    } = body;

    // Verify credential exists
    const existing = await db.apiCredential.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (apiKey !== undefined && apiKey) updateData.apiKey = encrypt(apiKey);
    if (apiSecret !== undefined) updateData.apiSecret = apiSecret ? encrypt(apiSecret) : null;
    if (endpoint !== undefined) updateData.endpoint = endpoint;
    if (organizationId !== undefined) updateData.organizationId = organizationId;
    if (defaultModel !== undefined) updateData.defaultModel = defaultModel;
    if (maxTokensPerCall !== undefined) updateData.maxTokensPerCall = maxTokensPerCall;
    if (temperature !== undefined) updateData.temperature = temperature;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (monthlyLimit !== undefined) updateData.monthlyLimit = monthlyLimit;
    if (alertThreshold !== undefined) updateData.alertThreshold = alertThreshold;
    // Extra fields
    if (projectUrl !== undefined) updateData.projectUrl = projectUrl;
    if (projectKey !== undefined) updateData.projectKey = projectKey ? encrypt(projectKey) : null;
    if (region !== undefined) updateData.region = region;
    if (accountId !== undefined) updateData.accountId = accountId;
    if (instanceName !== undefined) updateData.instanceName = instanceName;
    if (webhookUrl !== undefined) updateData.webhookUrl = webhookUrl;

    // Handle isDefault change
    if (isDefault !== undefined && isDefault !== existing.isDefault) {
      if (isDefault) {
        // Unset other defaults for this provider
        await db.apiCredential.updateMany({
          where: { tenantId, provider: existing.provider },
          data: { isDefault: false },
        });
      }
      updateData.isDefault = isDefault;
    }

    // Update credential
    const credential = await db.apiCredential.update({
      where: { id },
      data: updateData,
    });

    // Invalidate LLM credential cache so agents pick up changes
    llmService.clearCredentialCache();

    return NextResponse.json({ credential });
  } catch (error) {
    return authErrorResponse(error);
  }
}

// PATCH /api/credentials/[id] - Partial update credential
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);
    const { id } = await params;

    const body = await request.json();
    const {
      name,
      apiKey,
      apiSecret,
      endpoint,
      defaultModel,
      maxTokensPerCall,
      temperature,
      isActive,
      isDefault,
      monthlyLimit,
      alertThreshold,
      description,
      // Extra fields
      projectUrl,
      projectKey,
      region,
      accountId,
      instanceName,
      webhookUrl,
    } = body;

    // Verify credential exists
    const existing = await db.apiCredential.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (apiKey !== undefined && apiKey) updateData.apiKey = encrypt(apiKey);
    if (apiSecret !== undefined) updateData.apiSecret = apiSecret ? encrypt(apiSecret) : null;
    if (endpoint !== undefined) updateData.endpoint = endpoint;
    if (defaultModel !== undefined) updateData.defaultModel = defaultModel;
    if (maxTokensPerCall !== undefined) updateData.maxTokensPerCall = maxTokensPerCall;
    if (temperature !== undefined) updateData.temperature = temperature;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (monthlyLimit !== undefined) updateData.monthlyLimit = monthlyLimit;
    if (alertThreshold !== undefined) updateData.alertThreshold = alertThreshold;
    if (description !== undefined) updateData.description = description;
    // Extra fields
    if (projectUrl !== undefined) updateData.projectUrl = projectUrl;
    if (projectKey !== undefined) updateData.projectKey = projectKey ? encrypt(projectKey) : null;
    if (region !== undefined) updateData.region = region;
    if (accountId !== undefined) updateData.accountId = accountId;
    if (instanceName !== undefined) updateData.instanceName = instanceName;
    if (webhookUrl !== undefined) updateData.webhookUrl = webhookUrl;

    // Handle isDefault change
    if (isDefault !== undefined && isDefault !== existing.isDefault) {
      if (isDefault) {
        // Unset other defaults for this provider
        await db.apiCredential.updateMany({
          where: { tenantId, provider: existing.provider },
          data: { isDefault: false },
        });
      }
      updateData.isDefault = isDefault;
    }

    // Update credential
    const credential = await db.apiCredential.update({
      where: { id },
      data: updateData,
    });

    // Invalidate LLM credential cache so agents pick up changes
    llmService.clearCredentialCache();

    return NextResponse.json({ credential });
  } catch (error) {
    return authErrorResponse(error);
  }
}

// DELETE /api/credentials/[id] - Delete credential
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth();
    const tenantId = requireTenant(user);
    const { id } = await params;

    // Verify credential exists
    const existing = await db.apiCredential.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    // Delete usage logs first
    await db.apiUsageLog.deleteMany({
      where: { credentialId: id },
    });

    // Delete alerts
    await db.apiAlert.deleteMany({
      where: { credentialId: id },
    });

    // Delete credential
    await db.apiCredential.delete({
      where: { id },
    });

    // Invalidate LLM credential cache
    llmService.clearCredentialCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
