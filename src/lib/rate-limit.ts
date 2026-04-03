/**
 * Rate Limiting Library - Zion Recruit
 * Production-grade rate limiting with sliding window algorithm
 * 
 * Supports both Edge Runtime (middleware) and Node.js Runtime (API routes)
 */

import { NextRequest, NextResponse } from "next/server";

// Rate limit configuration types
export type EndpointType = "AUTH" | "API" | "AI" | "WEBHOOK" | "PUBLIC";

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
  skipFailedRequests?: boolean; // Don't count failed requests
  keyGenerator?: (req: NextRequest, userId?: string) => string;
}

// Rate limit configurations for different endpoint types
export const RATE_LIMIT_CONFIGS: Record<EndpointType, RateLimitConfig> = {
  AUTH: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 requests per minute
    message: "Muitas tentativas de autenticação. Tente novamente em 1 minuto.",
  },
  API: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    message: "Limite de requisições excedido. Tente novamente em 1 minuto.",
  },
  AI: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 requests per minute
    message: "Limite de requisições de IA excedido. Tente novamente em 1 minuto.",
  },
  WEBHOOK: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 1000, // 1000 requests per minute
    message: "Webhook rate limit exceeded.",
  },
  PUBLIC: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    message: "Limite de requisições excedido. Tente novamente em 1 minuto.",
  },
};

// Internal service bypass token header
const INTERNAL_SERVICE_HEADER = "x-internal-service-token";
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || "zion-internal-bypass-token";

// Request entry for sliding window
interface RateLimitEntry {
  count: number;
  timestamps: number[]; // Timestamps of requests within the window
  resetAt: number;
}

// In-memory store using Map (works in both Edge and Node.js)
class RateLimitStore {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Cleanup expired entries every 5 minutes (only in Node.js runtime)
    if (typeof setInterval !== "undefined") {
      try {
        this.cleanupInterval = setInterval(() => {
          this.cleanup();
        }, 5 * 60 * 1000);
      } catch {
        // Edge runtime - no interval support
      }
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt) {
        this.store.delete(key);
      }
    }
  }

  get(key: string): RateLimitEntry | undefined {
    return this.store.get(key);
  }

  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry);
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  // Get store stats for monitoring
  getStats(): { totalKeys: number; keys: string[] } {
    return {
      totalKeys: this.store.size,
      keys: Array.from(this.store.keys()),
    };
  }
}

// Singleton store instance
const rateLimitStore = new RateLimitStore();

/**
 * Generate a unique key for rate limiting based on IP and User ID
 */
export function generateRateLimitKey(
  req: NextRequest,
  userId?: string,
  endpointType?: EndpointType
): string {
  const ip = getClientIP(req);
  const prefix = endpointType ? `${endpointType}:` : "";
  
  if (userId) {
    return `${prefix}user:${userId}:${ip}`;
  }
  
  return `${prefix}ip:${ip}`;
}

/**
 * Extract client IP from request
 */
export function getClientIP(req: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const cfConnectingIp = req.headers.get("cf-connecting-ip"); // Cloudflare
  
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list, take the first one
    return forwarded.split(",")[0].trim();
  }
  
  if (realIp) {
    return realIp.trim();
  }
  
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }
  
  // Fallback to a default (in production, this should be handled by the load balancer)
  return "unknown-ip";
}

/**
 * Check if request is from an internal service (bypass rate limit)
 */
export function isInternalServiceRequest(req: NextRequest): boolean {
  const token = req.headers.get(INTERNAL_SERVICE_HEADER);
  return token === INTERNAL_SERVICE_TOKEN;
}

/**
 * Sliding window rate limit check
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter: number;
} {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  
  let entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetAt) {
    // Create new entry
    entry = {
      count: 1,
      timestamps: [now],
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: entry.resetAt,
      retryAfter: 0,
    };
  }
  
  // Filter out timestamps outside the window (sliding window)
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);
  
  // Update count based on remaining timestamps
  const currentCount = entry.timestamps.length;
  
  if (currentCount >= config.maxRequests) {
    // Calculate retry after based on oldest timestamp in window
    const oldestTimestamp = entry.timestamps[0];
    const retryAfter = Math.ceil((oldestTimestamp + config.windowMs - now) / 1000);
    
    return {
      allowed: false,
      remaining: 0,
      resetAt: oldestTimestamp + config.windowMs,
      retryAfter: Math.max(1, retryAfter),
    };
  }
  
  // Add current request timestamp
  entry.timestamps.push(now);
  entry.count = entry.timestamps.length;
  rateLimitStore.set(key, entry);
  
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: now + config.windowMs,
    retryAfter: 0,
  };
}

/**
 * Rate limit result type
 */
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
  error?: string;
}

/**
 * Apply rate limiting to a request (Edge Runtime compatible)
 * This version only uses IP-based rate limiting
 */
export function applyRateLimitEdge(
  req: NextRequest,
  endpointType: EndpointType = "API"
): RateLimitResult {
  const config = RATE_LIMIT_CONFIGS[endpointType];
  
  // Check for internal service bypass
  if (isInternalServiceRequest(req)) {
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      reset: Date.now() + config.windowMs,
    };
  }
  
  // Generate rate limit key (IP-based only for Edge runtime)
  const key = generateRateLimitKey(req, undefined, endpointType);
  
  // Check rate limit
  const result = checkRateLimit(key, config);
  
  return {
    success: result.allowed,
    limit: config.maxRequests,
    remaining: result.remaining,
    reset: result.resetAt,
    retryAfter: result.retryAfter || undefined,
    error: result.allowed ? undefined : config.message,
  };
}

/**
 * Apply rate limiting to a request (Node.js Runtime)
 * This version supports user-based rate limiting with session
 */
export async function applyRateLimit(
  req: NextRequest,
  endpointType: EndpointType = "API"
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIGS[endpointType];
  
  // Check for internal service bypass
  if (isInternalServiceRequest(req)) {
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      reset: Date.now() + config.windowMs,
    };
  }
  
  // Try to get user ID from session (only in Node.js runtime)
  let userId: string | undefined;
  try {
    // Dynamic import to avoid issues in Edge runtime
    const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("./auth");
    const session = await getServerSession(authOptions);
    userId = session?.user?.id;
  } catch {
    // Session not available, continue with IP-based limiting
  }
  
  // Generate rate limit key
  const key = generateRateLimitKey(req, userId, endpointType);
  
  // Check rate limit
  const result = checkRateLimit(key, config);
  
  return {
    success: result.allowed,
    limit: config.maxRequests,
    remaining: result.remaining,
    reset: result.resetAt,
    retryAfter: result.retryAfter || undefined,
    error: result.allowed ? undefined : config.message,
  };
}

/**
 * Create rate limit headers
 */
export function createRateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers();
  headers.set("X-RateLimit-Limit", result.limit.toString());
  headers.set("X-RateLimit-Remaining", result.remaining.toString());
  headers.set("X-RateLimit-Reset", result.reset.toString());
  
  if (result.retryAfter) {
    headers.set("Retry-After", result.retryAfter.toString());
  }
  
  return headers;
}

/**
 * Create rate limit exceeded response
 */
export function createRateLimitExceededResponse(result: RateLimitResult): NextResponse {
  const headers = createRateLimitHeaders(result);
  
  return NextResponse.json(
    {
      error: result.error || "Rate limit exceeded",
      retryAfter: result.retryAfter,
    },
    {
      status: 429,
      headers,
    }
  );
}

/**
 * Higher-order function to wrap API route handlers with rate limiting
 * For use in Node.js runtime API routes
 */
export function withRateLimit(
  handler: (req: NextRequest, context?: { params: Record<string, string | string[]> }) => Promise<NextResponse>,
  endpointType: EndpointType = "API"
) {
  return async (
    req: NextRequest,
    context?: { params: Record<string, string | string[]> }
  ): Promise<NextResponse> => {
    const result = await applyRateLimit(req, endpointType);
    
    if (!result.success) {
      return createRateLimitExceededResponse(result);
    }
    
    const response = await handler(req, context);
    
    // Add rate limit headers to response
    const headers = createRateLimitHeaders(result);
    headers.forEach((value, key) => {
      response.headers.set(key, value);
    });
    
    return response;
  };
}

/**
 * Middleware helper to get endpoint type from path
 */
export function getEndpointTypeFromPath(pathname: string): EndpointType {
  // Auth endpoints
  if (
    pathname.includes("/api/auth") ||
    pathname.includes("/login") ||
    pathname.includes("/register") ||
    pathname.includes("/forgot-password")
  ) {
    return "AUTH";
  }
  
  // AI endpoints
  if (
    pathname.includes("/api/ai") ||
    pathname.includes("/api/agents") ||
    pathname.includes("/api/screening") ||
    pathname.includes("/api/matching") ||
    pathname.includes("/api/messages/conversations") ||
    pathname.includes("/api/disc") ||
    pathname.includes("/ai-process")
  ) {
    return "AI";
  }
  
  // Webhook endpoints
  if (pathname.includes("/webhook")) {
    return "WEBHOOK";
  }
  
  // Public endpoints (no auth required)
  if (
    pathname.includes("/api/public") ||
    (pathname.includes("/api/disc/") && pathname.includes("/submit"))
  ) {
    return "PUBLIC";
  }
  
  // Default to API
  return "API";
}

/**
 * Reset rate limit for a specific key (admin function)
 */
export function resetRateLimit(key: string): boolean {
  return rateLimitStore.delete(key);
}

/**
 * Get rate limit store stats (admin/monitoring function)
 */
export function getRateLimitStats(): { totalKeys: number; keys: string[] } {
  return rateLimitStore.getStats();
}

/**
 * Clear all rate limit entries (admin function - use with caution)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

// Export the store for advanced use cases
export { rateLimitStore };
