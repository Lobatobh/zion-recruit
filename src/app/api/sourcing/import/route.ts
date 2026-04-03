/**
 * Sourcing Import API - Zion Recruit
 * 
 * POST /api/sourcing/import
 * Import candidate(s) from external source to pipeline
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createSourcingService } from '@/lib/sourcing/sourcing-service';
import { SourcedCandidate } from '@/lib/sourcing/types';
import { z } from 'zod';

// Validation schema for single import
const singleImportSchema = z.object({
  candidate: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    title: z.string(),
    company: z.string().optional(),
    summary: z.string().optional(),
    skills: z.array(z.string()),
    experienceYears: z.number().optional(),
    location: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    linkedin: z.string().optional(),
    github: z.string().optional(),
    portfolio: z.string().optional(),
    sourceUrl: z.string().optional(),
    source: z.enum(['linkedin', 'indeed', 'github', 'internal', 'ai_generated']),
    relevanceScore: z.number().optional(),
  }) as z.ZodType<SourcedCandidate>,
  jobId: z.string(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  skipDuplicateCheck: z.boolean().optional(),
});

// Validation schema for bulk import
const bulkImportSchema = z.object({
  candidates: z.array(z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    title: z.string(),
    company: z.string().optional(),
    summary: z.string().optional(),
    skills: z.array(z.string()),
    experienceYears: z.number().optional(),
    location: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    linkedin: z.string().optional(),
    github: z.string().optional(),
    portfolio: z.string().optional(),
    sourceUrl: z.string().optional(),
    source: z.enum(['linkedin', 'indeed', 'github', 'internal', 'ai_generated']),
    relevanceScore: z.number().optional(),
  })),
  jobId: z.string(),
  tags: z.array(z.string()).optional(),
  skipDuplicateCheck: z.boolean().optional(),
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

    // Parse request body
    const body = await request.json();
    
    // Create sourcing service
    const sourcingService = createSourcingService(tenantId);
    
    // Determine if single or bulk import
    if (Array.isArray(body.candidates)) {
      // Bulk import
      const validated = bulkImportSchema.parse(body);
      
      const result = await sourcingService.bulkImport({
        candidates: validated.candidates as SourcedCandidate[],
        jobId: validated.jobId,
        tags: validated.tags,
        skipDuplicateCheck: validated.skipDuplicateCheck,
      });
      
      return NextResponse.json({
        success: result.success,
        imported: result.imported,
        duplicates: result.duplicates,
        failed: result.failed,
        results: result.results,
      });
    } else {
      // Single import
      const validated = singleImportSchema.parse(body);
      
      const result = await sourcingService.importCandidate({
        candidate: validated.candidate,
        jobId: validated.jobId,
        tags: validated.tags,
        notes: validated.notes,
        skipDuplicateCheck: validated.skipDuplicateCheck,
      });
      
      return NextResponse.json({
        success: result.success,
        candidateId: result.candidateId,
        isDuplicate: result.isDuplicate,
        existingCandidateId: result.existingCandidateId,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Sourcing import error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Requisição inválida', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Falha ao importar candidato(s)' },
      { status: 500 }
    );
  }
}
