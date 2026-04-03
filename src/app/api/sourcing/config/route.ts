/**
 * Sourcing Config API - Zion Recruit
 * 
 * GET /api/sourcing/config - Get sourcing configurations
 * PUT /api/sourcing/config - Update sourcing configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SourcingSource } from '@/lib/sourcing/types';
import { z } from 'zod';

// In-memory config store (in production, use database)
const configStore: Record<string, Record<SourcingSource, { enabled: boolean; settings?: Record<string, unknown> }>> = {};

// Validation schema for update
const updateConfigSchema = z.object({
  source: z.enum(['linkedin', 'indeed', 'github', 'internal']),
  enabled: z.boolean(),
  settings: z.record(z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get tenant ID from session
    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 }
      );
    }

    // Get configs for tenant
    const configs = configStore[tenantId] || getDefaultConfigs();
    
    return NextResponse.json({
      configs: Object.entries(configs).map(([source, config]) => ({
        source,
        ...config,
      })),
    });
  } catch (error) {
    console.error('Get config error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get config' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get tenant ID from session
    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validated = updateConfigSchema.parse(body);
    
    // Initialize tenant config if not exists
    if (!configStore[tenantId]) {
      configStore[tenantId] = getDefaultConfigs();
    }
    
    // Update config
    configStore[tenantId][validated.source] = {
      enabled: validated.enabled,
      settings: validated.settings,
    };
    
    return NextResponse.json({
      success: true,
      config: {
        source: validated.source,
        ...configStore[tenantId][validated.source],
      },
    });
  } catch (error) {
    console.error('Update config error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update config' },
      { status: 500 }
    );
  }
}

// Helper function to get default configs
function getDefaultConfigs(): Record<SourcingSource, { enabled: boolean; settings?: Record<string, unknown> }> {
  return {
    linkedin: { enabled: true },
    indeed: { enabled: true },
    github: { enabled: true },
    internal: { enabled: true },
  };
}
