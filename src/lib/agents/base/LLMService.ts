/**
 * LLM Service - Zion Recruit
 * 
 * Uses credentials from the database (ApiCredential) to call AI providers directly.
 * Supports OpenAI, OpenRouter, Gemini, and Anthropic via OpenAI-compatible endpoints.
 * Includes automatic model fallback for region-restricted scenarios.
 * Enhanced with cost calculation, duration tracking, and detailed usage logging.
 */

import { db } from '@/lib/db';
import { decrypt } from '@/lib/encryption';
import { ApiProvider, ApiCallStatus } from '@prisma/client';

// ============================================
// Types
// ============================================

export interface LLMRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
  jsonMode?: boolean;
  credentialId?: string;  // Optional specific credential
}

export interface LLMResponse<T = unknown> {
  success: boolean;
  data?: T;
  rawContent?: string;
  tokensUsed?: number;
  cached?: boolean;
  error?: string;
  costCents?: number;
  latencyMs?: number;
}

export interface CacheOptions {
  enabled?: boolean;
  ttlDays?: number;
  tenantId?: string;
  cacheKey?: string;
}

// ============================================
// Cost Calculation
// ============================================

// Cost in cents per 1000 tokens
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4o-mini': { input: 0.015, output: 0.06 },
  'gpt-4o': { input: 0.25, output: 1.0 },
  'gpt-4-turbo': { input: 1.0, output: 3.0 },
  'gpt-3.5-turbo': { input: 0.005, output: 0.015 },
  // OpenRouter
  'deepseek/deepseek-chat': { input: 0.014, output: 0.028 },
  'anthropic/claude-3.5-sonnet': { input: 0.3, output: 1.5 },
  'anthropic/claude-3-haiku': { input: 0.025, output: 0.125 },
  'google/gemini-2.0-flash-001': { input: 0.0075, output: 0.03 },
  // Gemini
  'gemini-2.0-flash': { input: 0.0075, output: 0.03 },
  'gemini-1.5-pro': { input: 0.125, output: 0.5 },
  'gemini-1.5-flash': { input: 0.0075, output: 0.03 },
  // Anthropic
  'claude-3-5-sonnet-20241022': { input: 0.3, output: 1.5 },
  'claude-3-haiku-20240307': { input: 0.025, output: 0.125 },
};

// Default cost if model not in table
const DEFAULT_COST = { input: 0.05, output: 0.15 };

// ============================================
// Provider Configuration
// ============================================

interface ProviderConfig {
  baseUrl: string;
  defaultModel: string;
  fallbackModels: string[];
  authHeader: (apiKey: string) => Record<string, string>;
}

const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  [ApiProvider.OPENAI]: {
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    fallbackModels: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    authHeader: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` }),
  },
  [ApiProvider.OPENROUTER]: {
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'deepseek/deepseek-chat',
    fallbackModels: ['deepseek/deepseek-chat', 'anthropic/claude-3.5-sonnet', 'google/gemini-2.0-flash-001'],
    authHeader: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://zion-recruit.app',
      'X-Title': 'Zion Recruit ATS',
    }),
  },
  [ApiProvider.GEMINI]: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.0-flash',
    fallbackModels: ['gemini-1.5-pro', 'gemini-1.5-flash'],
    authHeader: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` }),
  },
  [ApiProvider.ANTHROPIC]: {
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
    fallbackModels: ['claude-3-haiku-20240307'],
    authHeader: (apiKey) => ({
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    }),
  },
};

// ============================================
// Credential Helper
// ============================================

interface CredentialInfo {
  id: string;
  provider: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  fallbackModels: string[];
  authHeaders: Record<string, string>;
}

let cachedCredential: CredentialInfo | null = null;

/**
 * Auto-detect provider from API key prefix.
 * Falls back to the provider stored in DB if no prefix matches.
 */
function detectProvider(key: string, dbProvider: string): string {
  if (key.startsWith('sk-or-')) return 'OPENROUTER';
  if (key.startsWith('sk-ant-')) return 'ANTHROPIC';
  if (key.startsWith('AI')) return 'GEMINI';
  if (key.startsWith('sk-')) return 'OPENAI';
  // Fallback to DB provider
  return dbProvider;
}

/**
 * Validate and build CredentialInfo from a database record.
 * Returns null if the credential is invalid.
 * Auto-detects provider from key prefix to handle user mistakes.
 */
function buildCredentialInfo(credential: { id: string; provider: string; name: string; apiKey: string; endpoint: string | null; defaultModel: string | null }): CredentialInfo | null {
  let apiKey: string;
  try {
    apiKey = decrypt(credential.apiKey);
  } catch {
    console.warn(`[LLM] Failed to decrypt credential "${credential.name}" (${credential.id})`);
    return null;
  }

  // Trim whitespace/quotes that may have been pasted accidentally
  apiKey = apiKey.trim().replace(/^["']|["']$/g, '');

  if (!apiKey || apiKey.length < 10) {
    console.warn(`[LLM] Credential "${credential.name}" has invalid/empty API key`);
    return null;
  }

  // Auto-detect provider from key prefix (handles user mistakes like OpenRouter key saved as OPENAI)
  const detectedProvider = detectProvider(apiKey, credential.provider as string);
  if (detectedProvider !== (credential.provider as string)) {
    console.warn(`[LLM] Credential "${credential.name}" stored as ${credential.provider} but key is ${detectedProvider} (auto-corrected)`);
  }

  const providerConf = PROVIDER_CONFIGS[detectedProvider];
  if (!providerConf) {
    console.warn(`[LLM] Unsupported provider: ${detectedProvider}`);
    return null;
  }

  return {
    id: credential.id,
    provider: detectedProvider,
    name: credential.name,
    baseUrl: credential.endpoint || providerConf.baseUrl,
    defaultModel: credential.defaultModel || providerConf.defaultModel,
    fallbackModels: providerConf.fallbackModels,
    authHeaders: providerConf.authHeader(apiKey),
  };
}

/**
 * Get active AI credential from database.
 * Tries default first, then validates all active credentials.
 */
async function getActiveCredential(): Promise<CredentialInfo> {
  if (cachedCredential) return cachedCredential;

  const aiProviders = [ApiProvider.OPENAI, ApiProvider.GEMINI, ApiProvider.OPENROUTER, ApiProvider.ANTHROPIC];

  // Fetch all active AI credentials
  const credentials = await db.apiCredential.findMany({
    where: { provider: { in: aiProviders }, isActive: true },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  if (credentials.length === 0) {
    throw new Error(
      'Nenhuma credencial de IA ativa encontrada. ' +
      'Vá em APIs e Credenciais e adicione uma credencial OpenAI ou OpenRouter.'
    );
  }

  // Validate each credential and pick the first valid one
  for (const credential of credentials) {
    const info = buildCredentialInfo(credential);
    if (info) {
       
      console.log(`[LLM] Using credential "${info.name}" (${info.provider})`);
      cachedCredential = info;
      return info;
    }
  }

  throw new Error(
    'Todas as credenciais de IA são inválidas. ' +
    'Verifique as credenciais em APIs e Credenciais (chave incorreta ou formato inválido).' +
    ' OpenRouter requer sk-or-..., OpenAI requer sk-..., Anthropic requer sk-ant-...'
  );
}

/**
 * Get a specific credential by ID.
 * Falls back to auto-selection if not found or invalid.
 */
async function getCredentialById(credentialId: string | null | undefined): Promise<CredentialInfo> {
  if (credentialId) {
    try {
      const credential = await db.apiCredential.findUnique({
        where: { id: credentialId },
      });
      if (credential) {
        const info = buildCredentialInfo(credential);
        if (info) {
          console.log(`[LLM] Using specified credential "${info.name}" (${info.provider})`);
          return info;
        }
      }
    } catch (error) {
      console.warn(`[LLM] Failed to load credential ${credentialId}, falling back to auto-selection`);
    }
  }
  return getActiveCredential();
}

/**
 * Get all valid AI credentials for fallback purposes.
 */
async function getAllValidCredentials(): Promise<CredentialInfo[]> {
  const aiProviders = [ApiProvider.OPENAI, ApiProvider.GEMINI, ApiProvider.OPENROUTER, ApiProvider.ANTHROPIC];
  const credentials = await db.apiCredential.findMany({
    where: { provider: { in: aiProviders }, isActive: true },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  const valid: CredentialInfo[] = [];
  for (const c of credentials) {
    const info = buildCredentialInfo(c);
    if (info) valid.push(info);
  }
  return valid;
}

// ============================================
// LLM Service Class
// ============================================

class LLMService {
  private responseCache: Map<string, { data: unknown; expiresAt: number }> = new Map();

  // ============================================
  // Cost Calculation
  // ============================================

  /**
   * Calculate the estimated cost in cents for a given model and total token count.
   * Uses a 70/30 split between completion and prompt tokens as approximation.
   */
  calculateCost(model: string, totalTokens: number): number {
    const costs = MODEL_COSTS[model] || DEFAULT_COST;
    const promptTokens = Math.floor(totalTokens * 0.3);
    const completionTokens = Math.floor(totalTokens * 0.7);
    return Math.ceil(
      (promptTokens * costs.input) / 1000 +
      (completionTokens * costs.output) / 1000
    );
  }

  // ============================================
  // Internal: call with specific model
  // ============================================

  private async callWithModel<T>(
    cred: CredentialInfo,
    model: string,
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number,
    temperature: number,
    jsonMode: boolean
  ): Promise<LLMResponse<T>> {
    const startTime = Date.now();

    // Anthropic native format
    if (cred.provider === ApiProvider.ANTHROPIC) {
      const response = await fetch(`${cred.baseUrl}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...cred.authHeaders },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          temperature,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        const latencyMs = Date.now() - startTime;
        const status: ApiCallStatus = response.status === 429 ? 'RATE_LIMITED' : 'ERROR';
        this.trackUsage({
          credentialId: cred.id,
          tokensUsed: 0,
          model,
          provider: cred.provider,
          durationMs: latencyMs,
          status,
          errorMessage: `API error (${response.status}): ${errText}`,
        });
        throw new Error(`API error (${response.status}): ${errText}`);
      }

      const result = await response.json();
      const content = result.content?.[0]?.text || '';
      const tokensUsed = (result.usage?.input_tokens || 0) + (result.usage?.output_tokens || 0);
      const latencyMs = Date.now() - startTime;
      const costCents = this.calculateCost(model, tokensUsed);

      if (!content) {
        this.trackUsage({
          credentialId: cred.id,
          tokensUsed,
          model,
          provider: cred.provider,
          durationMs: latencyMs,
          costCents,
          status: 'ERROR',
          errorMessage: 'No response from LLM',
        });
        return { success: false, error: 'No response from LLM', costCents, latencyMs };
      }

      let data: T | undefined;
      if (jsonMode) {
        data = this.parseJsonSafe<T>(content);
        if (!data) {
          this.trackUsage({
            credentialId: cred.id,
            tokensUsed,
            model,
            provider: cred.provider,
            durationMs: latencyMs,
            costCents,
            status: 'ERROR',
            errorMessage: 'Failed to parse JSON response',
          });
          return { success: false, error: 'Failed to parse JSON response', rawContent: content, tokensUsed, costCents, latencyMs };
        }
      }

      this.trackUsage({
        credentialId: cred.id,
        tokensUsed,
        model,
        provider: cred.provider,
        durationMs: latencyMs,
        costCents,
        status: 'SUCCESS',
      });
      return { success: true, data, rawContent: content, tokensUsed, costCents, latencyMs };
    }

    // OpenAI-compatible format (OpenAI, OpenRouter, Gemini)
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature,
    };

    if (jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch(`${cred.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...cred.authHeaders },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      const latencyMs = Date.now() - startTime;
      const status: ApiCallStatus = response.status === 429 ? 'RATE_LIMITED' : 'ERROR';
      this.trackUsage({
        credentialId: cred.id,
        tokensUsed: 0,
        model,
        provider: cred.provider,
        durationMs: latencyMs,
        status,
        errorMessage: `API error (${response.status}): ${errText}`,
      });
      throw new Error(`API error (${response.status}): ${errText}`);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;
    const tokensUsed = result.usage?.total_tokens || 0;
    const latencyMs = Date.now() - startTime;
    const costCents = this.calculateCost(model, tokensUsed);

    if (!content) {
      this.trackUsage({
        credentialId: cred.id,
        tokensUsed,
        model,
        provider: cred.provider,
        durationMs: latencyMs,
        costCents,
        status: 'ERROR',
        errorMessage: 'No response from LLM',
      });
      return { success: false, error: 'No response from LLM', costCents, latencyMs };
    }

    let data: T | undefined;
    if (jsonMode) {
      data = this.parseJsonSafe<T>(content);
      if (!data) {
        this.trackUsage({
          credentialId: cred.id,
          tokensUsed,
          model,
          provider: cred.provider,
          durationMs: latencyMs,
          costCents,
          status: 'ERROR',
          errorMessage: 'Failed to parse JSON response',
        });
        return { success: false, error: 'Failed to parse JSON response', rawContent: content, tokensUsed, costCents, latencyMs };
      }
    }

    this.trackUsage({
      credentialId: cred.id,
      tokensUsed,
      model,
      provider: cred.provider,
      durationMs: latencyMs,
      costCents,
      status: 'SUCCESS',
    });
    return { success: true, data, rawContent: content, tokensUsed, costCents, latencyMs };
  }

  // ============================================
  // Main Call Method
  // ============================================

  async call<T = unknown>(
    request: LLMRequest,
    cache?: CacheOptions
  ): Promise<LLMResponse<T>> {
    const {
      systemPrompt,
      userPrompt,
      maxTokens = 500,
      temperature = 0.3,
      model: requestedModel,
      jsonMode = true,
    } = request;

    // Check response cache
    if (cache?.enabled && cache.cacheKey) {
      const cached = this.responseCache.get(cache.cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return { success: true, data: cached.data as T, cached: true };
      }
    }

    // Get the right credential(s)
    let allCredentials: CredentialInfo[];
    let primaryCredential: CredentialInfo | null = null;

    if (request.credentialId) {
      // Use the specified credential as primary, with all others as fallback
      try {
        primaryCredential = await getCredentialById(request.credentialId);
      } catch {
        // Fall through to auto-selection
      }
    }

    allCredentials = await getAllValidCredentials();

    // If we have a specific credential, put it first in the list
    if (primaryCredential) {
      allCredentials = [
        primaryCredential,
        ...allCredentials.filter(c => c.id !== primaryCredential!.id)
      ];
    }
    if (allCredentials.length === 0) {
      return {
        success: false,
        error: 'Nenhuma credencial de IA válida encontrada. ' +
          'Vá em "APIs e Credenciais" (ícone de chave na sidebar) e adicione uma credencial OpenRouter ou OpenAI.',
      };
    }

    const modelsToTry = requestedModel
      ? [requestedModel, ...(allCredentials[0]?.fallbackModels || [])]
      : [allCredentials[0]?.defaultModel || 'deepseek/deepseek-chat', ...(allCredentials[0]?.fallbackModels || [])];

    // Deduplicate models
    const uniqueModels = [...new Set(modelsToTry)];

    // Try each credential with each model
    for (const cred of allCredentials) {
      for (const model of uniqueModels) {
        try {
           
          console.log(`[LLM] Trying ${cred.name}/${cred.provider} with model "${model}"`);
          const result = await this.callWithModel<T>(cred, model, systemPrompt, userPrompt, maxTokens, temperature, jsonMode);

          if (result.success) {
            // Cache the successful credential
            cachedCredential = cred;

            // Save to cache
            if (cache?.enabled && cache.cacheKey && result.data) {
              this.responseCache.set(cache.cacheKey, {
                data: result.data,
                expiresAt: Date.now() + (cache.ttlDays || 7) * 24 * 60 * 60 * 1000,
              });
            }

            return result;
          }
           
          console.log(`[LLM] ${cred.name}/${model} returned no content, trying next...`);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';

          // On auth error, skip this credential entirely
          if (message.includes('401') || message.includes('Missing Authentication') || message.includes('invalid api')) {
             
            console.warn(`[LLM] Auth error with ${cred.name}/${cred.provider}, skipping credential`);
            cachedCredential = null;
            break; // Move to next credential
          }

          // On model not available, try next model (within same credential)
          if (message.includes('403') || message.includes('not available') || message.includes('404') || message.includes('No endpoints')) {
             
            console.warn(`[LLM] Model "${model}" unavailable on ${cred.name}, trying next model...`);
            continue;
          }

          // On rate limit, wait briefly and retry once
          if (message.includes('429') || message.includes('rate limit')) {
             
            console.warn(`[LLM] Rate limited on ${cred.name}, waiting 2s...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            try {
              const retryResult = await this.callWithModel<T>(cred, model, systemPrompt, userPrompt, maxTokens, temperature, jsonMode);
              if (retryResult.success) {
                cachedCredential = cred;
                if (cache?.enabled && cache.cacheKey && retryResult.data) {
                  this.responseCache.set(cache.cacheKey, {
                    data: retryResult.data,
                    expiresAt: Date.now() + (cache.ttlDays || 7) * 24 * 60 * 60 * 1000,
                  });
                }
                return retryResult;
              }
            } catch {
              continue;
            }
          }

          // Other errors: log and try next
           
          console.warn(`[LLM] Error with ${cred.name}/${model}: ${message}`);
        }
      }
    }

    return {
      success: false,
      error: 'Todas as credenciais de IA falharam. Verifique as chaves em "APIs e Credenciais".',
    };
  }

  // ============================================
  // Call with Tracking
  // ============================================

  /**
   * Wrapper around `call` that adds latency tracking and cost calculation.
   * Accepts optional agentType, jobId, candidateId, and taskId for enhanced usage logging.
   */
  async callWithTracking<T = unknown>(
    request: LLMRequest & {
      agentType?: string;
      jobId?: string;
      candidateId?: string;
      taskId?: string;
    },
    cache?: CacheOptions
  ): Promise<LLMResponse<T>> {
    const startTime = Date.now();
    const result = await this.call<T>(request, cache);
    const latencyMs = Date.now() - startTime;
    
    return {
      ...result,
      latencyMs: result.latencyMs ?? latencyMs,
      costCents: result.costCents ?? (result.tokensUsed ? this.calculateCost(request.model || '', result.tokensUsed) : 0),
    };
  }

  // ============================================
  // Optimized Prompt Helpers
  // ============================================

  createJobParsingPrompt(description: string): { system: string; user: string } {
    return {
      system: 'Extract job info. Return JSON only.',
      user: `Job: ${this.truncate(description, 1500)}
Return JSON:
{"skills":["..."],"seniority":"...","keywords":["..."],"discProfile":{"D":0-100,"I":0-100,"S":0-100,"C":0-100},"summary":"..."}`,
    };
  }

  createResumeParsingPrompt(resume: string): { system: string; user: string } {
    return {
      system: 'Extract resume info. Return JSON only.',
      user: `Resume: ${this.truncate(resume, 2000)}
Return JSON:
{"name":"...","email":"...","phone":"...","skills":["..."],"experience":[{"title":"...","company":"...","years":N}],"education":[{"degree":"...","institution":"..."}],"summary":"..."}`,
    };
  }

  createMatchingPrompt(
    candidateSummary: string,
    jobRequirements: string
  ): { system: string; user: string } {
    return {
      system: 'Score candidate-job match. Return JSON only.',
      user: `Candidate: ${this.truncate(candidateSummary, 500)}
Job: ${this.truncate(jobRequirements, 500)}
Return JSON:
{"overallScore":0-100,"skillsScore":0-100,"experienceScore":0-100,"strengths":["..."],"gaps":["..."],"recommendation":"..."}`,
    };
  }

  createDISCAnalysisPrompt(
    d: number,
    i: number,
    s: number,
    c: number,
    jobContext?: string
  ): { system: string; user: string } {
    return {
      system: 'Analyze DISC profile. Return JSON only.',
      user: `DISC: D=${d}, I=${i}, S=${s}, C=${c}
${jobContext ? `Job: ${this.truncate(jobContext, 300)}` : ''}
Return JSON:
{"primaryProfile":"D/I/S/C","strengths":["..."],"workStyle":"...","communication":"...","leadership":"..."}`,
    };
  }

  createContactMessagePrompt(
    candidateName: string,
    jobTitle: string,
    companyName: string
  ): { system: string; user: string } {
    return {
      system: 'Write recruiting message in Portuguese. Return JSON only.',
      user: `Candidate: ${candidateName}
Job: ${jobTitle}
Company: ${companyName}
Return JSON:
{"subject":"...","body":"..."}`,
    };
  }

  // ============================================
  // Usage Tracking
  // ============================================

  /**
   * Track API usage with enhanced parameters including duration, cost, status, and context.
   * Creates a detailed usage log record in the database.
   */
  private async trackUsage(params: {
    credentialId: string;
    tokensUsed: number;
    model?: string;
    provider?: string;
    durationMs?: number;
    costCents?: number;
    status?: ApiCallStatus;
    errorMessage?: string;
    agentType?: string;
    jobId?: string;
    candidateId?: string;
    taskId?: string;
  }): Promise<void> {
    const {
      credentialId,
      tokensUsed,
      model,
      provider,
      durationMs,
      costCents,
      status = 'SUCCESS',
      errorMessage,
      agentType,
      jobId,
      candidateId,
      taskId,
    } = params;

    try {
      // Update credential usage counter
      await db.apiCredential.update({
        where: { id: credentialId },
        data: { currentUsage: { increment: tokensUsed }, lastUsedAt: new Date() },
      });

      // Create detailed usage log record (non-blocking, best-effort)
      // Fetch tenantId from the credential for proper association
      db.apiCredential.findUnique({ where: { id: credentialId }, select: { tenantId: true } })
        .then((cred) => {
          if (cred) {
            return db.apiUsageLog.create({
              data: {
                credentialId,
                tenantId: cred.tenantId,
                requestType: 'chat_completion',
                model: model || 'unknown',
                provider: (provider as ApiProvider) || ApiProvider.OPENAI,
                promptTokens: Math.floor(tokensUsed * 0.3),
                completionTokens: Math.floor(tokensUsed * 0.7),
                totalTokens: tokensUsed,
                costCents: costCents || 0,
                durationMs: durationMs || null,
                status,
                errorMessage: errorMessage || null,
                agentType: agentType || null,
                jobId: jobId || null,
                candidateId: candidateId || null,
                taskId: taskId || null,
              },
            });
          }
        })
        .catch(() => {
          // Silently fail — usage logging is non-critical
        });
    } catch {
      // Silently fail — usage tracking is non-critical
    }
  }

  /**
   * Clear the cached credential (e.g. after updating credentials)
   */
  clearCredentialCache(): void {
    cachedCredential = null;
  }

  // ============================================
  // Caching
  // ============================================

  /**
   * Clear the entire response cache.
   */
  clearResponseCache(): void {
    this.responseCache.clear();
  }

  private getFromCache(key: string): unknown | null {
    const cached = this.responseCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
    if (cached) this.responseCache.delete(key);
    return null;
  }

  private saveToCache(key: string, data: unknown, ttlMs: number): void {
    this.responseCache.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  // ============================================
  // Utility Methods
  // ============================================

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  }

  private parseJsonSafe<T>(text: string): T | null {
    try {
      let clean = text.trim();
      if (clean.startsWith('```json')) clean = clean.slice(7);
      if (clean.startsWith('```')) clean = clean.slice(3);
      if (clean.endsWith('```')) clean = clean.slice(0, -3);
      clean = clean.trim();
      return JSON.parse(clean) as T;
    } catch {
      return null;
    }
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  fitsInTokens(text: string, maxTokens: number): boolean {
    return this.estimateTokens(text) <= maxTokens;
  }
}

// Export singleton instance
export const llmService = new LLMService();

// Export convenience functions
export const callLLM = llmService.call.bind(llmService);
export const estimateTokens = llmService.estimateTokens.bind(llmService);
