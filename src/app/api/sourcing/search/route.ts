/**
 * Sourcing Search API - Zion Recruit
 * 
 * POST /api/sourcing/search
 * Search candidates across multiple sourcing channels
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createSourcingService } from '@/lib/sourcing/sourcing-service';
import { SourcingSearchParams } from '@/lib/sourcing/types';
import { z } from 'zod';

// Validation schema
const searchSchema = z.object({
  // Job-based search
  jobId: z.string().optional(),
  
  // Direct search parameters
  query: z.string().optional(),
  skills: z.array(z.string()).optional(),
  location: z.string().optional(),
  experienceLevel: z.enum(['entry', 'junior', 'mid', 'senior', 'lead', 'principal', 'executive']).optional(),
  keywords: z.array(z.string()).optional(),
  
  // Filters
  remoteOnly: z.boolean().optional(),
  minExperience: z.number().optional(),
  maxExperience: z.number().optional(),
  
  // Source selection
  sources: z.array(z.enum(['linkedin', 'indeed', 'github', 'internal'])).optional(),
  
  // Pagination
  limit: z.number().min(1).max(50).default(10),
  offset: z.number().min(0).default(0),
  
  // Options
  deduplicate: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Get tenant ID from session
    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Nenhuma organização encontrada' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validated = searchSchema.parse(body);
    
    // Create sourcing service
    const sourcingService = createSourcingService(tenantId);
    
    // Build search params
    const searchParams: SourcingSearchParams = {
      jobId: validated.jobId,
      query: validated.query,
      skills: validated.skills,
      location: validated.location,
      experienceLevel: validated.experienceLevel,
      keywords: validated.keywords,
      remoteOnly: validated.remoteOnly,
      minExperience: validated.minExperience,
      maxExperience: validated.maxExperience,
      sources: validated.sources,
      limit: validated.limit,
      offset: validated.offset,
      deduplicate: validated.deduplicate,
    };
    
    // Execute search
    let result;
    if (validated.jobId) {
      // Search by job requirements
      result = await sourcingService.searchByJob(validated.jobId, searchParams);
    } else {
      // Direct multi-source search
      result = await sourcingService.multiSourceSearch(searchParams);
    }
    
    return NextResponse.json({
      success: result.success,
      candidates: result.candidates,
      total: result.total,
      bySource: result.bySource,
      deduplicated: result.deduplicated,
      durationMs: result.durationMs,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Sourcing search error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Requisição inválida', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Falha ao buscar candidatos' },
      { status: 500 }
    );
  }
}
