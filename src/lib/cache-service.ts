/**
 * AI Cache Service - Zion Recruit
 * Caches AI responses to avoid reprocessing and save token costs
 * Uses database for persistence with 7-day expiration
 */

import { db } from './db';
import crypto from 'crypto';

export type CacheType = 'resume_parse' | 'match_score' | 'summary';

export interface CacheEntry<T> {
  id: string;
  cacheKey: string;
  cacheType: CacheType;
  inputData: string;
  outputData: T;
  createdAt: Date;
  expiresAt: Date;
}

const CACHE_EXPIRATION_DAYS = 7;

/**
 * Generate a cache key from input data
 */
export function generateCacheKey(input: string, cacheType: CacheType): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${cacheType}:${input}`)
    .digest('hex');
  return hash;
}

/**
 * Get cached result if available and not expired
 */
export async function getCachedResult<T>(
  cacheKey: string,
  tenantId: string
): Promise<T | null> {
  try {
    const cache = await db.aICache.findFirst({
      where: {
        cacheKey,
        tenantId,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (!cache) {
      return null;
    }

    try {
      return JSON.parse(cache.outputData) as T;
    } catch {
      return null;
    }
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
}

/**
 * Store result in cache
 */
export async function setCachedResult<T>(
  cacheKey: string,
  cacheType: CacheType,
  tenantId: string,
  inputData: string,
  outputData: T
): Promise<void> {
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CACHE_EXPIRATION_DAYS);

    // Upsert cache entry
    await db.aICache.upsert({
      where: {
        cacheKey
      },
      create: {
        cacheKey,
        cacheType,
        tenantId,
        inputData,
        outputData: JSON.stringify(outputData),
        expiresAt
      },
      update: {
        cacheType,
        inputData,
        outputData: JSON.stringify(outputData),
        expiresAt
      }
    });
  } catch (error) {
    console.error('Cache write error:', error);
    // Don't throw - caching failure shouldn't break the main flow
  }
}

/**
 * Get or compute cached result
 */
export async function getOrCompute<T>(
  cacheType: CacheType,
  tenantId: string,
  input: string,
  computeFn: () => Promise<T>
): Promise<{ data: T; cached: boolean }> {
  const cacheKey = generateCacheKey(input, cacheType);
  
  // Try to get from cache
  const cached = await getCachedResult<T>(cacheKey, tenantId);
  if (cached !== null) {
    return { data: cached, cached: true };
  }

  // Compute new result
  const data = await computeFn();

  // Store in cache
  await setCachedResult(cacheKey, cacheType, tenantId, input, data);

  return { data, cached: false };
}

/**
 * Clear expired cache entries (cleanup job)
 */
export async function clearExpiredCache(tenantId?: string): Promise<number> {
  try {
    const result = await db.aICache.deleteMany({
      where: {
        ...(tenantId && { tenantId }),
        expiresAt: {
          lt: new Date()
        }
      }
    });

    return result.count;
  } catch (error) {
    console.error('Cache cleanup error:', error);
    return 0;
  }
}

/**
 * Clear all cache for an organization
 */
export async function clearOrganizationCache(tenantId: string): Promise<number> {
  try {
    const result = await db.aICache.deleteMany({
      where: {
        tenantId
      }
    });

    return result.count;
  } catch (error) {
    console.error('Cache clear error:', error);
    return 0;
  }
}
