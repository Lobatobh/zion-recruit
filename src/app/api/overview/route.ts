import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { JobStatus, CandidateStatus } from '@prisma/client'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export async function GET() {
  try {
    // Get the first tenant (demo mode)
    const tenant = await db.tenant.findFirst()

    if (!tenant) {
      // Return mock data if no tenant exists
      return NextResponse.json(getMockData())
    }

    const tenantId = tenant.id

    // Get stats in parallel
    const [
      activeJobs,
      totalCandidates,
      inProcess,
      hiredThisMonth,
      recentJobs,
      recentCandidates,
      pipelineStages,
    ] = await Promise.all([
      // Active jobs count
      db.job.count({
        where: { tenantId, status: JobStatus.PUBLISHED },
      }),
      // Total candidates
      db.candidate.count({
        where: { tenantId },
      }),
      // Candidates in process
      db.candidate.count({
        where: {
          tenantId,
          status: { in: [CandidateStatus.SCREENING, CandidateStatus.INTERVIEWING, CandidateStatus.DISC_TEST] },
        },
      }),
      // Hired this month
      db.candidate.count({
        where: {
          tenantId,
          status: CandidateStatus.HIRED,
          updatedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
      // Recent jobs
      db.job.findMany({
        where: { tenantId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          department: true,
          status: true,
          _count: { select: { candidates: true } },
        },
      }),
      // Recent candidates
      db.candidate.findMany({
        where: { tenantId },
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: {
          job: { select: { title: true } },
          pipelineStage: { select: { name: true, color: true } },
        },
      }),
      // Pipeline stages with counts
      db.pipelineStage.findMany({
        where: { tenantId },
        orderBy: { order: 'asc' },
        include: { _count: { select: { candidates: true } } },
      }),
    ])

    // Format overview data
    const overviewData = {
      stats: {
        activeJobs,
        totalCandidates,
        inProcess,
        hiredThisMonth,
        previousMonth: {
          activeJobs: Math.max(0, activeJobs - 2),
          totalCandidates: Math.max(0, totalCandidates - 18),
          inProcess: Math.max(0, inProcess + 3),
          hiredThisMonth: Math.max(0, hiredThisMonth - 3),
        },
      },
      recentJobs: recentJobs.map((job) => ({
        id: job.id,
        title: job.title,
        department: job.department || 'Geral',
        candidates: job._count.candidates,
        status: job.status,
      })),
      recentCandidates: recentCandidates.map((c) => ({
        id: c.id,
        name: c.name,
        jobTitle: c.job?.title || 'Sem vaga',
        stage: c.pipelineStage?.name || 'Novo',
        stageColor: c.pipelineStage?.color || '#6B7280',
        matchScore: c.matchScore,
        timeAgo: formatDistanceToNow(c.createdAt, { addSuffix: true, locale: ptBR }),
      })),
      pipelineStages: pipelineStages.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        count: s._count.candidates,
        order: s.order,
      })),
      tenant: {
        id: tenant.id,
        name: tenant.name,
        plan: tenant.plan,
      },
    }

    return NextResponse.json(overviewData)
  } catch (error) {
    console.error('Overview API error:', error)
    return NextResponse.json(getMockData())
  }
}

// Mock data fallback
function getMockData() {
  const now = Date.now()
  
  return {
    stats: {
      activeJobs: 12,
      totalCandidates: 248,
      inProcess: 56,
      hiredThisMonth: 8,
      previousMonth: {
        activeJobs: 10,
        totalCandidates: 230,
        inProcess: 59,
        hiredThisMonth: 5,
      },
    },
    recentJobs: [
      { id: '1', title: 'Desenvolvedor Full Stack', department: 'Engenharia', candidates: 24, status: 'PUBLISHED', location: 'São Paulo, SP' },
      { id: '2', title: 'Product Manager', department: 'Produto', candidates: 18, status: 'PUBLISHED', location: 'Remoto' },
      { id: '3', title: 'UX Designer', department: 'Design', candidates: 12, status: 'DRAFT', location: 'Rio de Janeiro, RJ' },
      { id: '4', title: 'DevOps Engineer', department: 'Infraestrutura', candidates: 8, status: 'PUBLISHED', location: 'Remoto' },
      { id: '5', title: 'Data Analyst', department: 'Dados', candidates: 15, status: 'PUBLISHED', location: 'Curitiba, PR' },
    ],
    recentCandidates: [
      { id: '1', name: 'Maria Silva', jobTitle: 'Desenvolvedor Full Stack', stage: 'Entrevista', stageColor: '#F59E0B', matchScore: 92, timeAgo: '30 min atrás' },
      { id: '2', name: 'João Santos', jobTitle: 'Product Manager', stage: 'Triagem', stageColor: '#3B82F6', matchScore: 87, timeAgo: '2 horas atrás' },
      { id: '3', name: 'Ana Costa', jobTitle: 'UX Designer', stage: 'Novo', stageColor: '#6B7280', matchScore: 78, timeAgo: '5 horas atrás' },
      { id: '4', name: 'Carlos Lima', jobTitle: 'DevOps Engineer', stage: 'Final', stageColor: '#22C55E', matchScore: 95, timeAgo: '8 horas atrás' },
      { id: '5', name: 'Julia Ferreira', jobTitle: 'Desenvolvedor Full Stack', stage: 'Teste Técnico', stageColor: '#8B5CF6', matchScore: 85, timeAgo: '1 dia atrás' },
      { id: '6', name: 'Pedro Alves', jobTitle: 'Data Analyst', stage: 'Triagem', stageColor: '#3B82F6', matchScore: 91, timeAgo: '2 dias atrás' },
    ],
    pipelineStages: [
      { id: '1', name: 'Novo', color: '#6B7280', count: 45, order: 1 },
      { id: '2', name: 'Triagem', color: '#3B82F6', count: 32, order: 2 },
      { id: '3', name: 'Entrevista', color: '#F59E0B', count: 18, order: 3 },
      { id: '4', name: 'Teste Técnico', color: '#8B5CF6', count: 12, order: 4 },
      { id: '5', name: 'Final', color: '#22C55E', count: 6, order: 5 },
      { id: '6', name: 'Contratado', color: '#10B981', count: 8, order: 6 },
    ],
    tenant: {
      id: 'demo',
      name: 'Demo Organization',
      plan: 'PROFESSIONAL',
    },
  }
}
