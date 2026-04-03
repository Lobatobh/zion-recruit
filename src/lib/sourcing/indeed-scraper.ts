/**
 * Indeed Scraper - Zion Recruit
 * 
 * Mock implementation for Indeed resume search
 * In production, this would use Indeed API
 * 
 * NOTE: This is a MOCK implementation for development purposes.
 * Real Indeed integration requires proper API access and compliance with Indeed's Terms of Service.
 */

import {
  SourcingSource,
  SourcingSearchParams,
  SourcingSearchResult,
  SourcedCandidate,
  WorkExperience,
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
  
  if (now > rateLimitStore.resetAt) {
    rateLimitStore.requests = 0;
    rateLimitStore.resetAt = now + 60000;
  }
  
  const limit = 30; // 30 requests per minute
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
  'Miguel', 'Arthur', 'Gael', 'Heitor', 'Helena', 'Alice', 'Theo', 'Davi',
  'Laura', 'Gabriel', 'Bernardo', 'Enzo', 'Valentina', 'João', 'Pedro', 'Lorenzo'
];

const lastNames = [
  'Almeida', 'Alves', 'Andrade', 'Barbosa', 'Barros', 'Batista', 'Borges',
  'Campos', 'Cardoso', 'Carvalho', 'Castro', 'Correia', 'Costa', 'Cruz'
];

const jobTitles = [
  'Software Developer', 'Systems Analyst', 'Project Manager', 'Data Analyst',
  'Product Manager', 'UX Designer', 'UI Designer', 'QA Analyst', 'Scrum Master',
  'Business Analyst', 'Solutions Developer', 'Technical Lead', 'IT Manager',
  'Database Administrator', 'Network Engineer', 'Support Analyst', 'DevOps Analyst'
];

const companies = [
  'Accenture', 'Deloitte', 'IBM', 'Oracle', 'SAP', 'Capgemini', 'Thoughtworks',
  'CI&T', 'Cognizant', 'Wipro', 'TCS', 'Infosys', 'HCL', 'NTT Data', 'Sopra Steria',
  'Locaweb', 'Totvs', 'Bematech', 'Linxd', 'Neogrid'
];

const skillCategories: Record<string, string[]> = {
  'development': ['Java', 'C#', '.NET', 'Python', 'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue.js', 'Node.js', 'SQL', 'MongoDB'],
  'data': ['SQL', 'Python', 'R', 'Tableau', 'Power BI', 'Excel', 'SAS', 'Spark', 'Hadoop', 'ETL'],
  'management': ['Scrum', 'Kanban', 'Jira', 'Project Management', 'Agile', 'PMP', 'Leadership', 'Stakeholder Management'],
  'design': ['Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator', 'UI Design', 'UX Research', 'Prototyping'],
  'devops': ['Docker', 'Kubernetes', 'Jenkins', 'Git', 'AWS', 'Azure', 'Linux', 'Ansible', 'Terraform'],
};

const locations = [
  { city: 'São Paulo', state: 'SP' },
  { city: 'Rio de Janeiro', state: 'RJ' },
  { city: 'Belo Horizonte', state: 'MG' },
  { city: 'Curitiba', state: 'PR' },
  { city: 'Porto Alegre', state: 'RS' },
  { city: 'Brasília', state: 'DF' },
  { city: 'Salvador', state: 'BA' },
  { city: 'Recife', state: 'PE' },
  { city: 'Fortaleza', state: 'CE' },
  { city: 'Campinas', state: 'SP' },
];

const availabilityOptions = [
  'Immediate', '15 days notice', '30 days notice', '60 days notice', 'Open to opportunities'
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSubset<T>(arr: T[], min: number, max: number): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateIndeedCandidate(
  skillsQuery: string[],
  location?: string,
  index: number = 0
): SourcedCandidate {
  const firstName = randomElement(firstNames);
  const lastName = randomElement(lastNames);
  const name = `${firstName} ${lastName}`;
  
  // Generate Indeed resume ID
  const resumeId = `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Build skills based on query and random categories
  const categories = Object.keys(skillCategories);
  const primaryCategory = randomElement(categories);
  
  const candidateSkills = new Set<string>([
    ...skillsQuery.slice(0, Math.min(4, skillsQuery.length)),
    ...randomSubset(skillCategories[primaryCategory] || [], 3, 6),
  ]);
  
  // Experience
  const experienceYears = Math.floor(Math.random() * 12) + 1;
  const experience: WorkExperience[] = [];
  
  let currentDate = new Date();
  const expCount = Math.min(3, Math.ceil(experienceYears / 3));
  
  for (let i = 0; i < expCount; i++) {
    const startDate = new Date(currentDate);
    const duration = Math.floor(Math.random() * 3) + 1;
    startDate.setFullYear(startDate.getFullYear() - duration);
    
    experience.push({
      title: i === 0 ? randomElement(jobTitles) : randomElement(jobTitles.slice(0, -4)),
      company: randomElement(companies),
      startDate: startDate.toISOString().split('T')[0],
      endDate: i === 0 ? undefined : currentDate.toISOString().split('T')[0],
      current: i === 0,
      description: `Responsible for ${randomElement(['developing applications', 'managing projects', 'analyzing data', 'designing solutions', 'optimizing processes'])}`,
    });
    
    currentDate = startDate;
  }
  
  // Location
  let city: string, state: string;
  if (location) {
    const parts = location.split(',').map(s => s.trim());
    city = parts[0] || randomElement(locations).city;
    state = parts[1] || randomElement(locations).state;
  } else {
    const loc = randomElement(locations);
    city = loc.city;
    state = loc.state;
  }
  
  // Salary expectation
  const salaryBase = 3000 + (experienceYears * 500);
  const salaryMin = salaryBase + Math.floor(Math.random() * 1000);
  const salaryMax = salaryMin + Math.floor(Math.random() * 2000) + 1000;
  
  return {
    id: `indeed_${Date.now()}_${index}`,
    externalId: resumeId,
    name,
    email: Math.random() > 0.4 ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com` : undefined,
    phone: Math.random() > 0.6 ? `(11) 9${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}` : undefined,
    title: experience[0]?.title || randomElement(jobTitles),
    company: experience[0]?.company,
    summary: `Professional with ${experienceYears} years of experience in ${Array.from(candidateSkills).slice(0, 3).join(', ')}. ${randomElement(availabilityOptions)}.`,
    skills: Array.from(candidateSkills),
    experienceYears,
    experience,
    location: `${city}, ${state}`,
    city,
    state,
    country: 'Brazil',
    remote: Math.random() > 0.6,
    sourceUrl: `https://indeed.com/r/${resumeId}`,
    profileUrl: `https://indeed.com/r/${resumeId}`,
    source: 'indeed' as SourcingSource,
    sourcedAt: new Date().toISOString(),
    contactStatus: 'not_contacted',
    raw: {
      availability: randomElement(availabilityOptions),
      salaryExpectation: `${salaryMin} - ${salaryMax}`,
    },
  };
}

// ============================================
// Indeed Scraper Class
// ============================================

export class IndeedScraper {
  private config: {
    enabled: boolean;
    mockMode: boolean;
  };

  constructor(config?: { enabled?: boolean; mockMode?: boolean }) {
    this.config = {
      enabled: config?.enabled ?? true,
      mockMode: config?.mockMode ?? true,
    };
  }

  /**
   * Search for resumes on Indeed
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
        source: 'indeed',
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
        source: 'indeed',
        error: 'Indeed source is disabled',
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
    
    return {
      success: false,
      candidates: [],
      total: 0,
      source: 'indeed',
      error: 'Real Indeed integration not implemented. Use mock mode for development.',
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
    const delay = Math.random() * 400 + 150;
    
    // Generate mock candidates
    const candidates: SourcedCandidate[] = [];
    const totalResults = Math.min(limit * 2, 40);
    
    for (let i = 0; i < limit; i++) {
      candidates.push(generateIndeedCandidate(skills, location, i));
    }
    
    return {
      success: true,
      candidates,
      total: totalResults,
      source: 'indeed',
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
        source: 'indeed',
        requestsRemaining: 30,
        requestsLimit: 30,
        resetAt: new Date(rateLimitStore.resetAt + 60000).toISOString(),
        isLimited: false,
      };
    }
    
    const remaining = Math.max(0, 30 - rateLimitStore.requests);
    
    return {
      source: 'indeed',
      requestsRemaining: remaining,
      requestsLimit: 30,
      resetAt: new Date(rateLimitStore.resetAt).toISOString(),
      isLimited: remaining === 0,
    };
  }

  /**
   * Get source configuration
   */
  static getSourceConfig() {
    return {
      id: 'indeed' as SourcingSource,
      name: 'Indeed',
      description: 'Search resumes on Indeed job board',
      icon: 'Briefcase',
      enabled: true,
      requiresAuth: true,
      authType: 'api_key' as const,
      rateLimit: {
        requestsPerMinute: 30,
        requestsPerDay: 1000,
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

export const indeedScraper = new IndeedScraper();
