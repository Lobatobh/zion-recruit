/**
 * Seed Database - Zion Recruit
 * Creates demo data for development and testing
 */

import { db } from './db';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Starting Zion Recruit seed...');

  // ============================================
  // 1. Create Tenant
  // ============================================
  const tenant = await db.tenant.upsert({
    where: { slug: 'zion-demo' },
    update: {},
    create: {
      name: 'Zion Demo Company',
      slug: 'zion-demo',
      plan: 'PROFESSIONAL',
      maxJobs: 20,
      maxMembers: 10,
      maxCandidates: 1000,
    },
  });
  console.log('✅ Tenant created:', tenant.name);

  // ============================================
  // 2. Create User
  // ============================================
  const hashedPassword = await bcrypt.hash('password123', 12);
  const user = await db.user.upsert({
    where: { email: 'admin@zion.demo' },
    update: {},
    create: {
      email: 'admin@zion.demo',
      name: 'Admin User',
      password: hashedPassword,
    },
  });
  console.log('✅ User created:', user.email);

  // ============================================
  // 3. Create Membership
  // ============================================
  await db.tenantMember.upsert({
    where: {
      tenantId_userId: {
        tenantId: tenant.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      userId: user.id,
      role: 'OWNER',
    },
  });
  console.log('✅ Membership created');

  // ============================================
  // 4. Create Pipeline Stages
  // ============================================
  const pipelineStages = [
    { name: 'Novo', order: 1, color: '#6B7280', isDefault: true },
    { name: 'Triagem', order: 2, color: '#3B82F6' },
    { name: 'Entrevista', order: 3, color: '#F59E0B' },
    { name: 'Teste Técnico', order: 4, color: '#8B5CF6' },
    { name: 'DISC', order: 5, color: '#EC4899' },
    { name: 'Final', order: 6, color: '#10B981' },
    { name: 'Contratado', order: 7, color: '#059669', isHired: true },
    { name: 'Rejeitado', order: 8, color: '#EF4444', isRejected: true },
  ];

  for (const stage of pipelineStages) {
    await db.pipelineStage.upsert({
      where: {
        tenantId_name: {
          tenantId: tenant.id,
          name: stage.name,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        name: stage.name,
        order: stage.order,
        color: stage.color,
        isDefault: stage.isDefault || false,
        isHired: stage.isHired || false,
        isRejected: stage.isRejected || false,
      },
    });
  }
  console.log('✅ Pipeline stages created:', pipelineStages.length);

  // ============================================
  // 5. Create AI Agents
  // ============================================
  const agents = [
    { type: 'JOB_PARSER', name: 'Job Parser Agent', description: 'Analisa descrições de vagas', autoRun: true },
    { type: 'SOURCING', name: 'Sourcing Agent', description: 'Busca candidatos online', autoRun: true },
    { type: 'SCREENING', name: 'Screening Agent', description: 'Avalia candidatos', autoRun: true },
    { type: 'CONTACT', name: 'Contact Agent', description: 'Gera mensagens para candidatos', autoRun: false },
    { type: 'DISC_ANALYZER', name: 'DISC Analyzer Agent', description: 'Analisa testes DISC', autoRun: true },
    { type: 'MATCHING', name: 'Matching Agent', description: 'Calcula compatibilidade', autoRun: true },
    { type: 'REPORT', name: 'Report Agent', description: 'Gera relatórios', autoRun: false },
    { type: 'ORCHESTRATOR', name: 'Orchestrator Agent', description: 'Coordena os agentes', autoRun: false },
  ];

  for (const agent of agents) {
    await db.aIAgent.upsert({
      where: {
        tenantId_type: {
          tenantId: tenant.id,
          type: agent.type as any,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        type: agent.type as any,
        name: agent.name,
        description: agent.description,
        status: 'IDLE',
        autoRun: agent.autoRun,
        enabled: true,
      },
    });
  }
  console.log('✅ AI Agents created:', agents.length);

  // ============================================
  // 6. Create Sample Job
  // ============================================
  const job = await db.job.upsert({
    where: {
      tenantId_slug: {
        tenantId: tenant.id,
        slug: 'desenvolvedor-fullstack',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      title: 'Desenvolvedor Full Stack',
      slug: 'desenvolvedor-fullstack',
      department: 'Engenharia',
      description: `## Sobre a Vaga

Estamos buscando um Desenvolvedor Full Stack apaixonado por tecnologia.

## Responsabilidades

- Desenvolver aplicações web modernas
- Trabalhar com APIs REST
- Participar de code reviews`,
      requirements: `## Requisitos

- React.js e Next.js
- Node.js e TypeScript
- Bancos SQL/NoSQL
- Git e metodologias ágeis`,
      benefits: `- Vale alimentação
- Plano de saúde
- Trabalho remoto`,
      type: 'FULL_TIME',
      contractType: 'CLT',
      workModel: 'REMOTE',
      location: 'Remoto',
      city: 'São Paulo',
      state: 'SP',
      remote: true,
      salaryMin: 8000,
      salaryMax: 15000,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      aiParsedSkills: JSON.stringify(['React', 'Next.js', 'Node.js', 'TypeScript', 'PostgreSQL']),
      aiParsedSeniority: 'Pleno',
      discProfileRequired: JSON.stringify({ D: 50, I: 30, S: 20, C: 70 }),
    },
  });
  console.log('✅ Sample job created:', job.title);

  // ============================================
  // 7. Create Sample Candidates
  // ============================================
  const stages = await db.pipelineStage.findMany({
    where: { tenantId: tenant.id },
    orderBy: { order: 'asc' },
  });

  const candidates = [
    { name: 'Maria Silva', email: 'maria.silva@email.com', phone: '(11) 99999-1111', matchScore: 92, stageIndex: 0, skills: ['React', 'TypeScript', 'Node.js'], summary: '5 anos de experiência em React e Node.js.' },
    { name: 'João Santos', email: 'joao.santos@email.com', phone: '(11) 99999-2222', matchScore: 78, stageIndex: 1, skills: ['Vue.js', 'Python', 'Django'], summary: 'Desenvolvedor com foco em frontend.' },
    { name: 'Ana Costa', email: 'ana.costa@email.com', phone: '(11) 99999-3333', matchScore: 85, stageIndex: 2, skills: ['React', 'Next.js', 'GraphQL'], summary: 'Especialista em React e APIs modernas.' },
    { name: 'Pedro Oliveira', email: 'pedro.oliveira@email.com', phone: '(11) 99999-4444', matchScore: 65, stageIndex: 0, skills: ['Angular', 'Java', 'Spring Boot'], summary: 'Desenvolvedor Java enterprise.' },
    { name: 'Carla Mendes', email: 'carla.mendes@email.com', phone: '(11) 99999-5555', matchScore: 88, stageIndex: 3, skills: ['React', 'Node.js', 'AWS'], summary: 'Full Stack com experiência em cloud.' },
    { name: 'Lucas Ferreira', email: 'lucas.ferreira@email.com', phone: '(11) 99999-6666', matchScore: 95, stageIndex: 5, skills: ['React', 'Next.js', 'TypeScript'], summary: 'Tech Lead com 8 anos de experiência.' },
    { name: 'Fernanda Lima', email: 'fernanda.lima@email.com', phone: '(11) 99999-7777', matchScore: 72, stageIndex: 1, skills: ['React Native', 'React', 'Firebase'], summary: 'Desenvolvedora mobile e web.' },
    { name: 'Ricardo Almeida', email: 'ricardo.almeida@email.com', phone: '(11) 99999-8888', matchScore: 81, stageIndex: 2, skills: ['React', 'Node.js', 'MongoDB'], summary: 'Full Stack com experiência em startups.' },
  ];

  for (const candidate of candidates) {
    const stage = stages[candidate.stageIndex];
    const existing = await db.candidate.findFirst({
      where: { tenantId: tenant.id, email: candidate.email },
    });
    if (existing) continue;

    await db.candidate.create({
      data: {
        tenantId: tenant.id,
        jobId: job.id,
        pipelineStageId: stage?.id,
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        matchScore: candidate.matchScore,
        parsedSkills: JSON.stringify(candidate.skills),
        aiSummary: candidate.summary,
        status: 'SOURCED',
        source: 'LinkedIn',
      },
    });
  }
  console.log('✅ Sample candidates created:', candidates.length);

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📝 Demo credentials:');
  console.log('   Email: admin@zion.demo');
  console.log('   Password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
