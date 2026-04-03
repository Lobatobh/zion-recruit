/**
 * GitHub Scraper - Zion Recruit
 * 
 * Mock implementation for GitHub developer search
 * In production, this would use GitHub API
 * 
 * NOTE: This is a MOCK implementation for development purposes.
 * Real GitHub integration requires GitHub API access with proper authentication.
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
  
  const limit = 30; // 30 requests per minute (GitHub allows more with auth)
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

const usernames = [
  'devmaster', 'codecraft', 'bytesmith', 'algorithmer', 'stackflow', 'gitguru',
  'nodejspro', 'pythonista', 'rustacean', 'gopherdev', 'reactexpert', 'vuecoder',
  'cloudarchitect', 'dataengineer', 'mlopspro', 'fullstackdev', 'backendpro',
  'frontendninja', 'devopseng', 'techiebr', 'coderbr', 'devbrasil', 'sampaioDev',
  'silvacode', 'oliveiratech', 'souzadev', 'ribeirojs', 'martinspy', 'costago'
];

const nameParts = [
  'Lucas', 'Mateus', 'João', 'Pedro', 'Felipe', 'Gustavo', 'Rafael', 'André',
  'Thiago', 'Diego', 'Rodrigo', 'Eduardo', 'Leonardo', 'Bruno', 'Marcelo',
  'Fernanda', 'Juliana', 'Camila', 'Patricia', 'Renata', 'Amanda', 'Bianca'
];

const namePartsLast = [
  'Oliveira', 'Santos', 'Costa', 'Pereira', 'Rodrigues', 'Almeida', 'Nascimento',
  'Lima', 'Araújo', 'Fernandes', 'Carvalho', 'Gomes', 'Martins', 'Rocha', 'Ribeiro'
];

const techCompanies = [
  'Tech Startup', 'Freelance', 'Open Source Contributor', 'Software House',
  'Consulting Firm', 'Digital Agency', 'FinTech', 'E-commerce', 'SaaS Company',
  'Game Studio', 'AI/ML Company', 'Cloud Provider'
];

const languages: Record<string, { name: string; color: string }> = {
  'JavaScript': { name: 'JavaScript', color: '#f1e05a' },
  'TypeScript': { name: 'TypeScript', color: '#2b7489' },
  'Python': { name: 'Python', color: '#3572A5' },
  'Java': { name: 'Java', color: '#b07219' },
  'Go': { name: 'Go', color: '#00ADD8' },
  'Rust': { name: 'Rust', color: '#dea584' },
  'C++': { name: 'C++', color: '#f34b7d' },
  'Ruby': { name: 'Ruby', color: '#701516' },
  'PHP': { name: 'PHP', color: '#4F5D95' },
  'Swift': { name: 'Swift', color: '#ffac45' },
  'Kotlin': { name: 'Kotlin', color: '#F18E33' },
  'C#': { name: 'C#', color: '#178600' },
};

const frameworks: Record<string, string[]> = {
  'JavaScript': ['React', 'Vue.js', 'Angular', 'Node.js', 'Express', 'Next.js', 'NestJS'],
  'TypeScript': ['React', 'Next.js', 'NestJS', 'Angular', 'Express', 'Vue.js', 'Svelte'],
  'Python': ['Django', 'Flask', 'FastAPI', 'Pandas', 'TensorFlow', 'PyTorch', 'Celery'],
  'Java': ['Spring Boot', 'Hibernate', 'Maven', 'Gradle', 'Micronaut'],
  'Go': ['Gin', 'Echo', 'Gorm', 'Kubernetes', 'Docker SDK'],
  'Ruby': ['Rails', 'Sinatra', 'Sidekiq'],
  'PHP': ['Laravel', 'Symfony', 'WordPress', 'Drupal'],
};

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomSubset<T>(arr: T[], min: number, max: number): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateGitHubCandidate(
  skillsQuery: string[],
  index: number = 0
): SourcedCandidate {
  const username = randomElement(usernames) + (Math.floor(Math.random() * 100));
  const firstName = randomElement(nameParts);
  const lastName = randomElement(namePartsLast);
  const name = Math.random() > 0.3 ? `${firstName} ${lastName}` : username;
  
  // Determine primary language
  const languageKeys = Object.keys(languages);
  const matchingLanguage = skillsQuery.find(skill => 
    languageKeys.some(lang => lang.toLowerCase().includes(skill.toLowerCase()))
  );
  const primaryLanguage = matchingLanguage || randomElement(languageKeys);
  
  // Build skills
  const candidateSkills = new Set<string>([
    primaryLanguage,
    ...skillsQuery.slice(0, 2),
    ...randomSubset(frameworks[primaryLanguage] || [], 2, 4),
    ...randomSubset(['Git', 'Docker', 'CI/CD', 'REST APIs', 'GraphQL', 'PostgreSQL', 'MongoDB'], 1, 3),
  ]);
  
  // GitHub stats
  const followers = Math.floor(Math.random() * 500) + 5;
  const publicRepos = Math.floor(Math.random() * 50) + 3;
  const contributions = Math.floor(Math.random() * 2000) + 50;
  
  // Calculate experience based on repos and contributions
  const experienceYears = Math.min(15, Math.floor(publicRepos / 5) + Math.floor(contributions / 500) + 1);
  
  // Bio
  const bioOptions = [
    `${primaryLanguage} developer passionate about open source`,
    `Full-stack developer | ${primaryLanguage} enthusiast | Open source contributor`,
    `Building things with code. ${primaryLanguage} ${randomElement(['is my jam', 'is my weapon of choice', 'rocks'])}`,
    `Software engineer focused on ${primaryLanguage} and clean code`,
    `${experienceYears}+ years crafting software with ${primaryLanguage}`,
  ];
  
  // Location (GitHub locations can be anywhere)
  const locations = [
    { city: 'São Paulo', state: 'SP', country: 'Brazil' },
    { city: 'Rio de Janeiro', state: 'RJ', country: 'Brazil' },
    { city: 'Remote', state: '', country: 'Worldwide' },
    { city: 'Belo Horizonte', state: 'MG', country: 'Brazil' },
    { city: 'Curitiba', state: 'PR', country: 'Brazil' },
    { city: 'Berlin', state: '', country: 'Germany' },
    { city: 'Lisbon', state: '', country: 'Portugal' },
  ];
  const loc = randomElement(locations);
  
  // Generate some repos/projects
  const projects = randomSubset([
    { name: `${username.toLowerCase()}/awesome-project`, stars: Math.floor(Math.random() * 100), lang: primaryLanguage },
    { name: `${username.toLowerCase()}/cli-tool`, stars: Math.floor(Math.random() * 50), lang: primaryLanguage },
    { name: `${username.toLowerCase()}/api-wrapper`, stars: Math.floor(Math.random() * 30), lang: primaryLanguage },
  ], 1, 3);
  
  // Experience
  const experience: WorkExperience[] = [{
    title: randomElement(['Software Developer', 'Full Stack Developer', 'Software Engineer', 'Senior Developer']),
    company: randomElement(techCompanies),
    current: true,
    description: `Contributing to open source projects and building innovative solutions with ${primaryLanguage}`,
  }];
  
  return {
    id: `github_${Date.now()}_${index}`,
    externalId: username,
    name,
    email: Math.random() > 0.5 ? `${username}@users.noreply.github.com` : undefined,
    title: experience[0]?.title || 'Developer',
    company: experience[0]?.company,
    summary: randomElement(bioOptions),
    skills: Array.from(candidateSkills),
    experienceYears,
    experience,
    location: loc.city + (loc.state ? `, ${loc.state}` : ''),
    city: loc.city,
    state: loc.state || undefined,
    country: loc.country,
    remote: true, // GitHub users are typically open to remote
    github: `https://github.com/${username}`,
    sourceUrl: `https://github.com/${username}`,
    profileUrl: `https://github.com/${username}`,
    source: 'github' as SourcingSource,
    sourcedAt: new Date().toISOString(),
    contactStatus: 'not_contacted',
    raw: {
      username,
      followers,
      publicRepos,
      contributions,
      primaryLanguage,
      projects,
      hireable: Math.random() > 0.3,
      blog: Math.random() > 0.6 ? `https://${username}.dev` : undefined,
    },
  };
}

// ============================================
// GitHub Scraper Class
// ============================================

export class GitHubScraper {
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
   * Search for developers on GitHub
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
        source: 'github',
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
        source: 'github',
        error: 'GitHub source is disabled',
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
      source: 'github',
      error: 'Real GitHub integration not implemented. Use mock mode for development.',
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
    const limit = params.limit || 10;
    
    // Simulate network delay
    const delay = Math.random() * 300 + 100;
    
    // Generate mock candidates
    const candidates: SourcedCandidate[] = [];
    const totalResults = Math.min(limit * 2, 30);
    
    for (let i = 0; i < limit; i++) {
      candidates.push(generateGitHubCandidate(skills, i));
    }
    
    return {
      success: true,
      candidates,
      total: totalResults,
      source: 'github',
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
        source: 'github',
        requestsRemaining: 30,
        requestsLimit: 30,
        resetAt: new Date(rateLimitStore.resetAt + 60000).toISOString(),
        isLimited: false,
      };
    }
    
    const remaining = Math.max(0, 30 - rateLimitStore.requests);
    
    return {
      source: 'github',
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
      id: 'github' as SourcingSource,
      name: 'GitHub',
      description: 'Search for developers on GitHub by skills and contributions',
      icon: 'Github',
      enabled: true,
      requiresAuth: true,
      authType: 'api_key' as const,
      rateLimit: {
        requestsPerMinute: 30,
        requestsPerDay: 5000,
      },
      features: {
        skillSearch: true,
        locationSearch: true,
        experienceSearch: false,
        profilePreview: true,
        bulkImport: true,
      },
    };
  }
}

// ============================================
// Export singleton instance
// ============================================

export const githubScraper = new GitHubScraper();
