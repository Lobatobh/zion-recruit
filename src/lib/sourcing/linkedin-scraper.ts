/**
 * LinkedIn Scraper - Zion Recruit
 * 
 * Mock implementation for LinkedIn profile search
 * In production, this would use Playwright/Puppeteer or LinkedIn API
 * 
 * NOTE: This is a MOCK implementation for development purposes.
 * Real LinkedIn scraping requires proper API access and compliance with LinkedIn's Terms of Service.
 */

import {
  SourcingSource,
  SourcingSearchParams,
  SourcingSearchResult,
  SourcedCandidate,
  WorkExperience,
  Education,
  RateLimitStatus,
} from './types';

// ============================================
// Rate Limiting (In-Memory)
// ============================================

const rateLimitStore: {
  requests: number;
  resetAt: number;
} = {
  requests: 0,
  resetAt: Date.now() + 60000,
};

function checkRateLimit(): { allowed: boolean; remaining: number } {
  const now = Date.now();
  
  // Reset counter if minute has passed
  if (now > rateLimitStore.resetAt) {
    rateLimitStore.requests = 0;
    rateLimitStore.resetAt = now + 60000;
  }
  
  const limit = 20; // 20 requests per minute
  const remaining = Math.max(0, limit - rateLimitStore.requests);
  
  if (rateLimitStore.requests >= limit) {
    return { allowed: false, remaining: 0 };
  }
  
  rateLimitStore.requests++;
  return { allowed: true, remaining: remaining - 1 };
}

// ============================================
// Mock Data Generation
// ============================================

const firstNames = [
  'Ana', 'Bruno', 'Carlos', 'Diana', 'Eduardo', 'Fernanda', 'Gabriel', 'Helena',
  'Igor', 'Julia', 'Lucas', 'Mariana', 'Nicolas', 'Olivia', 'Pedro', 'Rafaela',
  'Samuel', 'Tatiana', 'Victor', 'Yasmin'
];

const lastNames = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Almeida',
  'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Araújo'
];

const techTitles = [
  'Software Engineer', 'Senior Software Engineer', 'Full Stack Developer',
  'Frontend Developer', 'Backend Developer', 'Tech Lead', 'Engineering Manager',
  'DevOps Engineer', 'Data Engineer', 'Machine Learning Engineer', 'Mobile Developer',
  'Solutions Architect', 'Cloud Engineer', 'Security Engineer', 'QA Engineer'
];

const companies = [
  'Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'Netflix', 'Uber', 'Airbnb',
  'Stripe', 'Shopify', 'Spotify', 'Twitter', 'LinkedIn', 'Salesforce', 'Adobe',
  'Nubank', 'Intelie', 'Loggi', '99taxis', 'Creditas', 'Stone', 'iFood', 'Magalu'
];

const skills: Record<string, string[]> = {
  'frontend': ['React', 'Vue.js', 'Angular', 'TypeScript', 'JavaScript', 'CSS', 'HTML', 'Next.js', 'Tailwind', 'SASS'],
  'backend': ['Node.js', 'Python', 'Java', 'Go', 'Rust', 'C#', 'PHP', 'Ruby', 'PostgreSQL', 'MongoDB', 'Redis', 'GraphQL'],
  'devops': ['Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Terraform', 'CI/CD', 'Linux', 'Jenkins', 'GitLab'],
  'data': ['Python', 'SQL', 'Pandas', 'NumPy', 'TensorFlow', 'PyTorch', 'Spark', 'Airflow', 'dbt', 'Snowflake'],
  'mobile': ['React Native', 'Flutter', 'Swift', 'Kotlin', 'iOS', 'Android', 'Mobile Development'],
  'general': ['Git', 'Agile', 'Scrum', 'Team Leadership', 'Problem Solving', 'Communication', 'Project Management'],
};

const cities = [
  'São Paulo, SP', 'Rio de Janeiro, RJ', 'Belo Horizonte, MG', 'Curitiba, PR',
  'Porto Alegre, RS', 'Recife, PE', 'Salvador, BA', 'Fortaleza, CE', 'Brasília, DF',
  'Campinas, SP', 'Florianópolis, SC', 'Remote'
];

const universities = [
  'Universidade de São Paulo (USP)',
  'Universidade Federal do Rio de Janeiro (UFRJ)',
  'Universidade Estadual de Campinas (UNICAMP)',
  'Universidade Federal de Minas Gerais (UFMG)',
  'Pontifícia Universidade Católica (PUC)',
  'Instituto Tecnológico de Aeronáutica (ITA)',
  'Universidade Federal do Rio Grande do Sul (UFRGS)',
  'Universidade de Brasília (UnB)',
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSubset<T>(arr: T[], min: number, max: number): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateMockCandidate(
  skillsQuery: string[],
  location?: string,
  index: number = 0
): SourcedCandidate {
  const firstName = randomElement(firstNames);
  const lastName = randomElement(lastNames);
  const name = `${firstName} ${lastName}`;
  
  // Generate LinkedIn-style username
  const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${Math.floor(Math.random() * 999)}`;
  
  // Determine primary skill category
  const skillCategories = ['frontend', 'backend', 'devops', 'data', 'mobile'];
  const primaryCategory = randomElement(skillCategories);
  
  // Build skills list including query skills
  const candidateSkills = new Set<string>([
    ...skillsQuery.slice(0, Math.min(3, skillsQuery.length)),
    ...randomSubset(skills[primaryCategory] || [], 3, 6),
    ...randomSubset(skills.general, 1, 3),
  ]);
  
  // Generate experience
  const experienceYears = Math.floor(Math.random() * 15) + 1;
  const experienceCount = Math.min(3, Math.ceil(experienceYears / 3));
  
  const experience: WorkExperience[] = [];
  let currentDate = new Date();
  
  for (let i = 0; i < experienceCount; i++) {
    const startDate = new Date(currentDate);
    const duration = Math.floor(Math.random() * 4) + 1;
    startDate.setFullYear(startDate.getFullYear() - duration);
    
    experience.push({
      title: i === 0 ? randomElement(techTitles) : randomElement(techTitles.slice(0, -3)),
      company: randomElement(companies),
      startDate: startDate.toISOString().split('T')[0],
      endDate: i === 0 ? undefined : currentDate.toISOString().split('T')[0],
      current: i === 0,
      description: `Working on ${randomElement(['web applications', 'mobile apps', 'distributed systems', 'cloud infrastructure', 'data pipelines'])}`,
    });
    
    currentDate = startDate;
  }
  
  // Generate education
  const education: Education[] = [{
    institution: randomElement(universities),
    degree: Math.random() > 0.3 ? 'B.S.' : 'M.S.',
    field: randomElement(['Computer Science', 'Software Engineering', 'Information Systems', 'Data Science']),
  }];
  
  // Location
  const candidateLocation = location || randomElement(cities);
  const [city, state] = candidateLocation.split(', ').map(s => s.trim());
  
  return {
    id: `linkedin_${Date.now()}_${index}`,
    externalId: username,
    name,
    email: Math.random() > 0.5 ? `${username}@gmail.com` : undefined,
    title: experience[0]?.title || randomElement(techTitles),
    company: experience[0]?.company,
    summary: `Experienced professional with ${experienceYears}+ years in software development. Skilled in ${Array.from(candidateSkills).slice(0, 3).join(', ')} and more.`,
    skills: Array.from(candidateSkills),
    experienceYears,
    experience,
    education,
    location: candidateLocation,
    city,
    state,
    country: 'Brazil',
    remote: candidateLocation === 'Remote' || Math.random() > 0.7,
    linkedin: `https://linkedin.com/in/${username}`,
    sourceUrl: `https://linkedin.com/in/${username}`,
    profileUrl: `https://linkedin.com/in/${username}`,
    source: 'linkedin' as SourcingSource,
    sourcedAt: new Date().toISOString(),
    contactStatus: 'not_contacted',
  };
}

// ============================================
// LinkedIn Scraper Class
// ============================================

export class LinkedInScraper {
  private config: {
    enabled: boolean;
    mockMode: boolean;
  };

  constructor(config?: { enabled?: boolean; mockMode?: boolean }) {
    this.config = {
      enabled: config?.enabled ?? true,
      mockMode: config?.mockMode ?? true, // Always mock in development
    };
  }

  /**
   * Search for candidates on LinkedIn
   */
  async search(params: SourcingSearchParams): Promise<SourcingSearchResult> {
    const startTime = Date.now();
    
    // Check rate limit
    const rateLimit = checkRateLimit();
    if (!rateLimit.allowed) {
      return {
        success: false,
        candidates: [],
        total: 0,
        source: 'linkedin',
        error: 'Rate limit exceeded. Please try again later.',
        metadata: {
          query: params.query || '',
          limit: params.limit || 10,
          offset: params.offset || 0,
          durationMs: Date.now() - startTime,
          rateLimitRemaining: 0,
        },
      };
    }
    
    if (!this.config.enabled) {
      return {
        success: false,
        candidates: [],
        total: 0,
        source: 'linkedin',
        error: 'LinkedIn source is disabled',
        metadata: {
          query: params.query || '',
          limit: params.limit || 10,
          offset: params.offset || 0,
          durationMs: Date.now() - startTime,
          rateLimitRemaining: rateLimit.remaining,
        },
      };
    }
    
    // Use mock mode for development
    if (this.config.mockMode) {
      return this.mockSearch(params, startTime, rateLimit.remaining);
    }
    
    // Real implementation would go here
    // Note: Real LinkedIn scraping requires proper API access
    return {
      success: false,
      candidates: [],
      total: 0,
      source: 'linkedin',
      error: 'Real LinkedIn scraping not implemented. Use mock mode for development.',
      metadata: {
        query: params.query || '',
        limit: params.limit || 10,
        offset: params.offset || 0,
        durationMs: Date.now() - startTime,
        rateLimitRemaining: rateLimit.remaining,
      },
    };
  }

  /**
   * Mock search implementation
   */
  private mockSearch(
    params: SourcingSearchParams,
    startTime: number,
    rateLimitRemaining: number
  ): SourcingSearchResult {
    const skills = params.skills || [];
    const location = params.location;
    const limit = params.limit || 10;
    
    // Simulate network delay
    const delay = Math.random() * 500 + 200;
    
    // Generate mock candidates
    const candidates: SourcedCandidate[] = [];
    const totalResults = Math.min(limit * 2, 50); // Simulate more results available
    
    for (let i = 0; i < limit; i++) {
      candidates.push(generateMockCandidate(skills, location, i));
    }
    
    return {
      success: true,
      candidates,
      total: totalResults,
      source: 'linkedin',
      metadata: {
        query: params.query || '',
        limit,
        offset: params.offset || 0,
        durationMs: Date.now() - startTime + delay,
        rateLimitRemaining,
      },
    };
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(): RateLimitStatus {
    const now = Date.now();
    
    if (now > rateLimitStore.resetAt) {
      return {
        source: 'linkedin',
        requestsRemaining: 20,
        requestsLimit: 20,
        resetAt: new Date(rateLimitStore.resetAt + 60000).toISOString(),
        isLimited: false,
      };
    }
    
    const remaining = Math.max(0, 20 - rateLimitStore.requests);
    
    return {
      source: 'linkedin',
      requestsRemaining: remaining,
      requestsLimit: 20,
      resetAt: new Date(rateLimitStore.resetAt).toISOString(),
      isLimited: remaining === 0,
    };
  }

  /**
   * Get source configuration
   */
  static getSourceConfig() {
    return {
      id: 'linkedin' as SourcingSource,
      name: 'LinkedIn',
      description: 'Search for professionals on LinkedIn',
      icon: 'Linkedin',
      enabled: true,
      requiresAuth: true,
      authType: 'oauth' as const,
      rateLimit: {
        requestsPerMinute: 20,
        requestsPerDay: 500,
      },
      features: {
        skillSearch: true,
        locationSearch: true,
        experienceSearch: true,
        profilePreview: true,
        bulkImport: true,
      },
    };
  }
}

// ============================================
// Export singleton instance
// ============================================

export const linkedInScraper = new LinkedInScraper();
