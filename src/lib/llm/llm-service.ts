/**
 * Multi-Provider LLM Service
 * Zion Recruit - AI-Powered Recruitment SaaS
 * 
 * Features:
 * - Support for OpenAI, Google Gemini, and OpenRouter
 * - Automatic failover between providers
 * - Cost optimization with cheapest provider selection
 * - Token usage and cost tracking in database
 * - Alert generation for usage thresholds
 * - Streaming and non-streaming responses
 * - Structured JSON output support
 */

import { db } from '@/lib/db';
import { ApiProvider, ApiCallStatus, ApiAlertType, ApiAlertSeverity } from '@prisma/client';
import { decrypt } from '@/lib/encryption';
import {
  LLMProvider,
  ProviderConfig,
  ModelConfig,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChoice,
  TokenUsage,
  StreamChunk,
  StreamChoice,
  StreamCallback,
  ProviderSelectionOptions,
  SelectedProvider,
  CredentialInfo,
  UsageLogInput,
  LLMServiceOptions,
  LLMCallOptions,
  LLMResult,
  FailoverConfig,
  FailoverState,
  LLMError,
  LLMErrorCode,
  CostEstimate,
  ProviderHealth,
  HealthCheckResult,
  OpenAIRequest,
  OpenAIResponse,
  GeminiRequest,
  GeminiResponse,
  OpenRouterRequest,
  OpenRouterResponse,
  DEFAULT_FAILOVER_CONFIG,
  DEFAULT_MODELS,
  PROVIDER_PRIORITY,
} from './types';

// ============================================
// Provider Configurations
// ============================================

const PROVIDER_CONFIGS: Record<LLMProvider, ProviderConfig> = {
  OPENAI: {
    name: 'OPENAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: [
      {
        id: 'gpt-4o-mini',
        displayName: 'GPT-4o Mini',
        inputCostPer1kTokens: 0.015, // $0.15/1M input tokens = 0.015 cents/1k
        outputCostPer1kTokens: 0.06, // $0.60/1M output tokens = 0.06 cents/1k
        maxTokens: 16384,
        supportsJson: true,
        supportsStreaming: true,
        contextWindow: 128000,
      },
      {
        id: 'gpt-4o',
        displayName: 'GPT-4o',
        inputCostPer1kTokens: 0.25, // $2.50/1M input tokens = 0.25 cents/1k
        outputCostPer1kTokens: 1.0, // $10/1M output tokens = 1 cent/1k
        maxTokens: 4096,
        supportsJson: true,
        supportsStreaming: true,
        contextWindow: 128000,
      },
      {
        id: 'gpt-3.5-turbo',
        displayName: 'GPT-3.5 Turbo',
        inputCostPer1kTokens: 0.005,
        outputCostPer1kTokens: 0.015,
        maxTokens: 4096,
        supportsJson: true,
        supportsStreaming: true,
        contextWindow: 16385,
      },
    ],
    headerFormat: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
    transformRequest: (request: ChatCompletionRequest, model: string): OpenAIRequest => ({
      model,
      messages: request.messages,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      top_p: request.topP,
      stop: request.stop,
      stream: request.stream,
      response_format: request.jsonMode ? { type: 'json_object' } : undefined,
    }),
    transformResponse: (response: unknown): ChatCompletionResponse => {
      const res = response as OpenAIResponse;
      return {
        id: res.id,
        provider: 'OPENAI',
        model: res.model,
        choices: res.choices.map((choice) => ({
          index: choice.index,
          message: choice.message,
          finishReason: choice.finish_reason,
        })),
        usage: {
          promptTokens: res.usage?.prompt_tokens ?? 0,
          completionTokens: res.usage?.completion_tokens ?? 0,
          totalTokens: res.usage?.total_tokens ?? 0,
        },
        created: res.created,
        latencyMs: 0,
      };
    },
    parseError: (error: unknown): LLMError => {
      const err = error as { status?: number; error?: { message?: string; code?: string } };
      const status = err.status;
      const message = err.error?.message || 'Unknown error';
      const code = err.error?.code;
      
      if (status === 401) {
        return { code: LLMErrorCode.INVALID_API_KEY, message, provider: 'OPENAI', httpStatus: status, retryable: false, rawError: error };
      }
      if (status === 429) {
        return { code: LLMErrorCode.RATE_LIMITED, message, provider: 'OPENAI', httpStatus: status, retryable: true, rawError: error };
      }
      if (code === 'insufficient_quota') {
        return { code: LLMErrorCode.INSUFFICIENT_QUOTA, message, provider: 'OPENAI', httpStatus: status, retryable: false, rawError: error };
      }
      if (code === 'context_length_exceeded') {
        return { code: LLMErrorCode.CONTEXT_LENGTH_EXCEEDED, message, provider: 'OPENAI', httpStatus: status, retryable: false, rawError: error };
      }
      if (code === 'content_filter') {
        return { code: LLMErrorCode.CONTENT_FILTERED, message, provider: 'OPENAI', httpStatus: status, retryable: false, rawError: error };
      }
      
      return { code: LLMErrorCode.UNKNOWN, message, provider: 'OPENAI', httpStatus: status, retryable: status ? status >= 500 : false, rawError: error };
    },
  },

  GEMINI: {
    name: 'GEMINI',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-1.5-flash',
    models: [
      {
        id: 'gemini-1.5-flash',
        displayName: 'Gemini 1.5 Flash',
        inputCostPer1kTokens: 0.0075,
        outputCostPer1kTokens: 0.03,
        maxTokens: 8192,
        supportsJson: true,
        supportsStreaming: true,
        contextWindow: 1000000,
      },
      {
        id: 'gemini-1.5-pro',
        displayName: 'Gemini 1.5 Pro',
        inputCostPer1kTokens: 0.125,
        outputCostPer1kTokens: 0.5,
        maxTokens: 8192,
        supportsJson: true,
        supportsStreaming: true,
        contextWindow: 2000000,
      },
      {
        id: 'gemini-pro',
        displayName: 'Gemini Pro',
        inputCostPer1kTokens: 0.0125,
        outputCostPer1kTokens: 0.0375,
        maxTokens: 2048,
        supportsJson: true,
        supportsStreaming: true,
        contextWindow: 32760,
      },
    ],
    headerFormat: (apiKey: string) => ({
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    }),
    transformRequest: (request: ChatCompletionRequest, model: string): GeminiRequest => {
      // Convert messages to Gemini format
      const contents = request.messages.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      return {
        contents,
        generationConfig: {
          maxOutputTokens: request.maxTokens,
          temperature: request.temperature,
          topP: request.topP,
          stopSequences: request.stop,
        },
      };
    },
    transformResponse: (response: unknown): ChatCompletionResponse => {
      const res = response as GeminiResponse;
      const candidate = res.candidates[0];
      
      return {
        id: `gemini-${Date.now()}`,
        provider: 'GEMINI',
        model: 'gemini',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: candidate?.content?.parts?.map((p) => p.text).join('') || '',
          },
          finishReason: candidate?.finishReason || 'stop',
        }],
        usage: {
          promptTokens: res.usageMetadata?.promptTokenCount ?? 0,
          completionTokens: res.usageMetadata?.candidatesTokenCount ?? 0,
          totalTokens: res.usageMetadata?.totalTokenCount ?? 0,
        },
        created: Date.now() / 1000,
        latencyMs: 0,
      };
    },
    parseError: (error: unknown): LLMError => {
      const err = error as { status?: number; error?: { message?: string; code?: number } };
      const status = err.status || err.error?.code;
      const message = err.error?.message || 'Unknown error';
      
      if (status === 401 || status === 403) {
        return { code: LLMErrorCode.INVALID_API_KEY, message, provider: 'GEMINI', httpStatus: status, retryable: false, rawError: error };
      }
      if (status === 429) {
        return { code: LLMErrorCode.RATE_LIMITED, message, provider: 'GEMINI', httpStatus: status, retryable: true, rawError: error };
      }
      if (status === 503) {
        return { code: LLMErrorCode.SERVICE_UNAVAILABLE, message, provider: 'GEMINI', httpStatus: status, retryable: true, rawError: error };
      }
      
      return { code: LLMErrorCode.UNKNOWN, message, provider: 'GEMINI', httpStatus: status, retryable: status ? status >= 500 : false, rawError: error };
    },
  },

  OPENROUTER: {
    name: 'OPENROUTER',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-mini',
    models: [
      {
        id: 'openai/gpt-4o-mini',
        displayName: 'GPT-4o Mini (via OpenRouter)',
        inputCostPer1kTokens: 0.015,
        outputCostPer1kTokens: 0.06,
        maxTokens: 16384,
        supportsJson: true,
        supportsStreaming: true,
        contextWindow: 128000,
      },
      {
        id: 'anthropic/claude-3-haiku',
        displayName: 'Claude 3 Haiku (via OpenRouter)',
        inputCostPer1kTokens: 0.025,
        outputCostPer1kTokens: 0.125,
        maxTokens: 4096,
        supportsJson: true,
        supportsStreaming: true,
        contextWindow: 200000,
      },
      {
        id: 'google/gemini-pro',
        displayName: 'Gemini Pro (via OpenRouter)',
        inputCostPer1kTokens: 0.0125,
        outputCostPer1kTokens: 0.0375,
        maxTokens: 2048,
        supportsJson: true,
        supportsStreaming: true,
        contextWindow: 32760,
      },
      {
        id: 'meta-llama/llama-3-8b-instruct',
        displayName: 'Llama 3 8B (via OpenRouter)',
        inputCostPer1kTokens: 0.002,
        outputCostPer1kTokens: 0.002,
        maxTokens: 8192,
        supportsJson: false,
        supportsStreaming: true,
        contextWindow: 8192,
      },
    ],
    headerFormat: (apiKey: string) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://zion-recruit.local',
      'X-Title': 'Zion Recruit',
    }),
    transformRequest: (request: ChatCompletionRequest, model: string): OpenRouterRequest => ({
      model,
      messages: request.messages,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      top_p: request.topP,
      stop: request.stop,
      stream: request.stream,
      response_format: request.jsonMode ? { type: 'json_object' } : undefined,
    }),
    transformResponse: (response: unknown): ChatCompletionResponse => {
      const res = response as OpenRouterResponse;
      return {
        id: res.id,
        provider: 'OPENROUTER',
        model: res.model,
        choices: res.choices.map((choice) => ({
          index: choice.index,
          message: choice.message,
          finishReason: choice.finish_reason,
        })),
        usage: {
          promptTokens: res.usage?.prompt_tokens ?? 0,
          completionTokens: res.usage?.completion_tokens ?? 0,
          totalTokens: res.usage?.total_tokens ?? 0,
        },
        created: res.created,
        latencyMs: 0,
      };
    },
    parseError: (error: unknown): LLMError => {
      const err = error as { status?: number; error?: { message?: string; code?: string } };
      const status = err.status;
      const message = err.error?.message || 'Unknown error';
      const code = err.error?.code;
      
      if (status === 401) {
        return { code: LLMErrorCode.INVALID_API_KEY, message, provider: 'OPENROUTER', httpStatus: status, retryable: false, rawError: error };
      }
      if (status === 429 || code === 'rate_limit') {
        return { code: LLMErrorCode.RATE_LIMITED, message, provider: 'OPENROUTER', httpStatus: status, retryable: true, rawError: error };
      }
      if (status === 402 || code === 'insufficient_credits') {
        return { code: LLMErrorCode.INSUFFICIENT_QUOTA, message, provider: 'OPENROUTER', httpStatus: status, retryable: false, rawError: error };
      }
      
      return { code: LLMErrorCode.UNKNOWN, message, provider: 'OPENROUTER', httpStatus: status, retryable: status ? status >= 500 : false, rawError: error };
    },
  },
};

// ============================================
// Multi-Provider LLM Service Class
// ============================================

export class MultiProviderLLMService {
  private cache: Map<string, { data: unknown; expiresAt: number }> = new Map();
  private requestTimeout: number;

  constructor(timeout: number = 30000) {
    this.requestTimeout = timeout;
  }

  // ============================================
  // Main Chat Completion Method
  // ============================================

  async chatCompletion<T = unknown>(
    request: ChatCompletionRequest,
    options: LLMCallOptions
  ): Promise<LLMResult<T>> {
    const startTime = Date.now();
    
    // Check cache if enabled
    if (options.cache?.enabled && options.cache.cacheKey) {
      const cached = this.getFromCache(options.cache.cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached as T,
          provider: 'OPENAI', // Placeholder
          model: 'cached',
          tokensUsed: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          costCents: 0,
          latencyMs: Date.now() - startTime,
          cached: true,
        };
      }
    }

    // Select provider
    const selectedProvider = await this.selectProvider({
      tenantId: options.tenantId,
      preferredProvider: options.preferredProvider,
      costOptimization: options.costOptimization,
      requireJson: request.jsonMode,
      requireStreaming: request.stream,
      minContextWindow: this.estimateContextWindow(request),
    });

    if (!selectedProvider) {
      return this.createErrorResult(
        { code: LLMErrorCode.NO_CREDENTIALS, message: 'No active API credentials found', retryable: false },
        startTime
      );
    }

    // Execute with failover
    const result = await this.executeWithFailover(request, selectedProvider, options);

    // Cache successful result
    if (result.success && options.cache?.enabled && options.cache.cacheKey && result.data) {
      this.saveToCache(options.cache.cacheKey, result.data, options.cache.ttlMs || 7 * 24 * 60 * 60 * 1000);
    }

    return result;
  }

  // ============================================
  // Streaming Support
  // ============================================

  async streamCompletion(
    request: ChatCompletionRequest,
    options: LLMServiceOptions,
    onChunk: StreamCallback
  ): Promise<LLMResult> {
    const startTime = Date.now();
    
    const selectedProvider = await this.selectProvider({
      tenantId: options.tenantId,
      preferredProvider: options.preferredProvider,
      costOptimization: options.costOptimization,
      requireJson: request.jsonMode,
      requireStreaming: true,
    });

    if (!selectedProvider) {
      return this.createErrorResult(
        { code: LLMErrorCode.NO_CREDENTIALS, message: 'No active API credentials found', retryable: false },
        startTime
      );
    }

    const config = PROVIDER_CONFIGS[selectedProvider.provider];
    const model = request.model || selectedProvider.model;
    
    try {
      const streamRequest = { ...request, stream: true };
      const response = await this.makeRequest(
        config,
        selectedProvider.credential.apiKey,
        streamRequest,
        model,
        options.timeout || this.requestTimeout
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let totalContent = '';
      let promptTokens = 0;
      let completionTokens = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter((line) => line.startsWith('data: '));

          for (const line of lines) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const streamChunk = this.parseStreamChunk(parsed, selectedProvider.provider);
              
              if (streamChunk) {
                onChunk(streamChunk);
                const content = streamChunk.choices[0]?.delta?.content || '';
                totalContent += content;
                completionTokens += Math.ceil(content.length / 4);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // Estimate tokens
      promptTokens = this.estimateTokens(request.messages.map((m) => m.content).join(''));
      const totalTokens = promptTokens + completionTokens;
      const cost = this.calculateCost(selectedProvider.provider, model, promptTokens, completionTokens);

      // Log usage
      const usageLogId = await this.logUsage({
        tenantId: options.tenantId,
        credentialId: selectedProvider.credential.id,
        requestType: 'chat_completion_stream',
        model,
        provider: selectedProvider.provider as ApiProvider,
        promptTokens,
        completionTokens,
        totalTokens,
        costCents: cost,
        durationMs: Date.now() - startTime,
        status: ApiCallStatus.SUCCESS,
        agentType: options.agentType,
        jobId: options.jobId,
        candidateId: options.candidateId,
        taskId: options.taskId,
      });

      // Update credential usage
      await this.updateCredentialUsage(selectedProvider.credential.id, totalTokens);

      return {
        success: true,
        rawContent: totalContent,
        provider: selectedProvider.provider,
        model,
        tokensUsed: { promptTokens, completionTokens, totalTokens },
        costCents: cost,
        latencyMs: Date.now() - startTime,
        usageLogId,
      };
    } catch (error) {
      const llmError = config.parseError(error);
      return this.createErrorResult(llmError, startTime);
    }
  }

  // ============================================
  // Provider Selection
  // ============================================

  private async selectProvider(options: ProviderSelectionOptions): Promise<SelectedProvider | null> {
    const providers = options.excludeProviders
      ? PROVIDER_PRIORITY.filter((p) => !options.excludeProviders?.includes(p))
      : [...PROVIDER_PRIORITY];

    // Move preferred provider to front
    if (options.preferredProvider && providers.includes(options.preferredProvider)) {
      const idx = providers.indexOf(options.preferredProvider);
      providers.splice(idx, 1);
      providers.unshift(options.preferredProvider);
    }

    const candidates: SelectedProvider[] = [];

    for (const provider of providers) {
      const credential = await this.getActiveCredential(options.tenantId, provider);
      if (!credential) continue;

      const config = PROVIDER_CONFIGS[provider];
      const model = this.selectModel(config, options);

      if (!model) continue;

      // Check constraints
      if (options.requireJson && !model.supportsJson) continue;
      if (options.requireStreaming && !model.supportsStreaming) continue;
      if (options.minContextWindow && model.contextWindow < options.minContextWindow) continue;
      if (options.excludeModels?.includes(model.id)) continue;

      // Check usage limits
      if (credential.monthlyLimit && credential.currentUsage >= credential.monthlyLimit) {
        continue;
      }

      // Calculate estimated cost
      const estimatedCost = this.calculateCost(provider, model.id, 1000, 500);

      candidates.push({
        provider,
        model: model.id,
        credential,
        estimatedCost,
      });
    }

    if (candidates.length === 0) return null;

    // Sort by cost if optimization enabled
    if (options.costOptimization) {
      candidates.sort((a, b) => a.estimatedCost - b.estimatedCost);
    }

    return candidates[0];
  }

  private async getActiveCredential(tenantId: string, provider: LLMProvider): Promise<CredentialInfo | null> {
    const credential = await db.apiCredential.findFirst({
      where: {
        tenantId,
        provider: provider as ApiProvider,
        isActive: true,
      },
      orderBy: [
        { isDefault: 'desc' },
        { lastUsedAt: 'asc' }, // Use least recently used for load balancing
      ],
    });

    if (!credential) return null;

    // Decrypt the API key using AES-256-GCM
    let decryptedApiKey: string;
    try {
      decryptedApiKey = decrypt(credential.apiKey);
    } catch (error) {
      console.error('Failed to decrypt API key for credential:', credential.id, error);
      return null;
    }

    return {
      id: credential.id,
      provider: credential.provider,
      apiKey: decryptedApiKey,
      endpoint: credential.endpoint ?? undefined,
      defaultModel: credential.defaultModel ?? undefined,
      maxTokensPerCall: credential.maxTokensPerCall ?? undefined,
      temperature: credential.temperature ?? undefined,
      monthlyLimit: credential.monthlyLimit ?? undefined,
      alertThreshold: credential.alertThreshold ?? undefined,
      currentUsage: credential.currentUsage,
    };
  }

  private selectModel(config: ProviderConfig, options: ProviderSelectionOptions): ModelConfig | null {
    // Try to find a model matching constraints
    const validModels = config.models.filter((model) => {
      if (options.requireJson && !model.supportsJson) return false;
      if (options.requireStreaming && !model.supportsStreaming) return false;
      if (options.minContextWindow && model.contextWindow < options.minContextWindow) return false;
      return true;
    });

    // Return default or first valid model
    return validModels.find((m) => m.id === config.defaultModel) || validModels[0] || null;
  }

  // ============================================
  // Failover Logic
  // ============================================

  private async executeWithFailover<T>(
    request: ChatCompletionRequest,
    initialProvider: SelectedProvider,
    options: LLMServiceOptions
  ): Promise<LLMResult<T>> {
    const failoverConfig = { ...DEFAULT_FAILOVER_CONFIG, ...options.failover };
    const state: FailoverState = {
      attemptNumber: 0,
      currentProvider: initialProvider.provider,
      triedProviders: [],
    };

    let currentSelection = initialProvider;
    let lastError: LLMError | undefined;

    while (state.attemptNumber < failoverConfig.maxRetries) {
      state.attemptNumber++;

      try {
        const result = await this.executeRequest<T>(request, currentSelection, options);
        
        if (result.success) {
          return result;
        }

        lastError = result.error;

        // Check if error is retryable
        if (!lastError?.retryable) {
          break;
        }

        // Check if we should failover
        const shouldFailover = this.shouldFailover(lastError, failoverConfig);
        
        if (shouldFailover && state.attemptNumber < failoverConfig.maxRetries) {
          state.triedProviders.push(state.currentProvider);
          
          // Select next provider
          const nextProvider = await this.selectProvider({
            tenantId: options.tenantId,
            preferredProvider: options.preferredProvider,
            costOptimization: options.costOptimization,
            requireJson: request.jsonMode,
            requireStreaming: request.stream,
            excludeProviders: state.triedProviders,
          });

          if (!nextProvider) {
            break;
          }

          currentSelection = nextProvider;
          state.currentProvider = nextProvider.provider;
        }

        // Wait before retry
        if (state.attemptNumber < failoverConfig.maxRetries) {
          const delay = failoverConfig.exponentialBackoff
            ? Math.min(failoverConfig.retryDelayMs * Math.pow(2, state.attemptNumber - 1), failoverConfig.maxRetryDelayMs)
            : failoverConfig.retryDelayMs;
          await this.sleep(delay);
        }
      } catch (error) {
        lastError = {
          code: LLMErrorCode.UNKNOWN,
          message: error instanceof Error ? error.message : 'Unknown error',
          provider: state.currentProvider,
          retryable: true,
          rawError: error,
        };
      }
    }

    return this.createErrorResult(
      lastError || { code: LLMErrorCode.ALL_PROVIDERS_FAILED, message: 'All providers failed', retryable: false },
      Date.now()
    );
  }

  private shouldFailover(error: LLMError, config: FailoverConfig): boolean {
    switch (error.code) {
      case LLMErrorCode.RATE_LIMITED:
        return config.failoverOnRateLimit;
      case LLMErrorCode.TIMEOUT:
        return config.failoverOnTimeout;
      case LLMErrorCode.SERVICE_UNAVAILABLE:
      case LLMErrorCode.NETWORK_ERROR:
        return config.failoverOnError;
      default:
        return false;
    }
  }

  // ============================================
  // Request Execution
  // ============================================

  private async executeRequest<T>(
    request: ChatCompletionRequest,
    selection: SelectedProvider,
    options: LLMServiceOptions
  ): Promise<LLMResult<T>> {
    const startTime = Date.now();
    const config = PROVIDER_CONFIGS[selection.provider];
    const model = request.model || selection.model;

    // Apply credential-level defaults
    const finalRequest: ChatCompletionRequest = {
      ...request,
      maxTokens: request.maxTokens ?? selection.credential.maxTokensPerCall ?? 2048,
      temperature: request.temperature ?? selection.credential.temperature ?? 0.7,
    };

    try {
      const response = await this.makeRequest(
        config,
        selection.credential.apiKey,
        finalRequest,
        model,
        options.timeout || this.requestTimeout
      );

      if (!response.ok) {
        const error = await this.parseErrorResponse(response, config);
        throw error;
      }

      const data = await response.json();
      const transformed = config.transformResponse(data);
      transformed.latencyMs = Date.now() - startTime;

      // Calculate cost
      const cost = this.calculateCost(
        selection.provider,
        model,
        transformed.usage.promptTokens,
        transformed.usage.completionTokens
      );

      // Parse JSON if needed
      let parsedData: T | undefined;
      const content = transformed.choices[0]?.message?.content;
      
      if (request.jsonMode && content) {
        parsedData = this.parseJsonSafe<T>(content);
      }

      // Log usage
      const usageLogId = await this.logUsage({
        tenantId: options.tenantId,
        credentialId: selection.credential.id,
        requestType: 'chat_completion',
        model,
        provider: selection.provider as ApiProvider,
        promptTokens: transformed.usage.promptTokens,
        completionTokens: transformed.usage.completionTokens,
        totalTokens: transformed.usage.totalTokens,
        costCents: cost,
        durationMs: transformed.latencyMs,
        status: ApiCallStatus.SUCCESS,
        agentType: options.agentType,
        jobId: options.jobId,
        candidateId: options.candidateId,
        taskId: options.taskId,
      });

      // Update credential usage
      await this.updateCredentialUsage(selection.credential.id, transformed.usage.totalTokens);

      // Check for threshold alerts
      await this.checkThresholdAlerts(
        options.tenantId,
        selection.credential.id,
        selection.credential.currentUsage + transformed.usage.totalTokens,
        selection.credential.monthlyLimit,
        selection.credential.alertThreshold
      );

      return {
        success: true,
        data: parsedData,
        rawContent: content,
        provider: selection.provider,
        model,
        tokensUsed: transformed.usage,
        costCents: cost,
        latencyMs: transformed.latencyMs,
        usageLogId,
      };
    } catch (error) {
      const llmError = error instanceof Error && 'code' in error
        ? error as LLMError
        : config.parseError(error);

      // Log failed usage
      await this.logUsage({
        tenantId: options.tenantId,
        credentialId: selection.credential.id,
        requestType: 'chat_completion',
        model,
        provider: selection.provider as ApiProvider,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costCents: 0,
        durationMs: Date.now() - startTime,
        status: this.mapErrorToStatus(llmError),
        errorMessage: llmError.message,
        agentType: options.agentType,
        jobId: options.jobId,
        candidateId: options.candidateId,
        taskId: options.taskId,
      });

      return this.createErrorResult(llmError, startTime);
    }
  }

  private async makeRequest(
    config: ProviderConfig,
    apiKey: string,
    request: ChatCompletionRequest,
    model: string,
    timeout: number
  ): Promise<Response> {
    const url = this.getRequestUrl(config, model);
    const transformedRequest = config.transformRequest(request, model);
    const headers = config.headerFormat(apiKey);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(transformedRequest),
        signal: controller.signal,
      });

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private getRequestUrl(config: ProviderConfig, model: string): string {
    switch (config.name) {
      case 'OPENAI':
        return `${config.baseUrl}/chat/completions`;
      case 'GEMINI':
        return `${config.baseUrl}/models/${model}:generateContent`;
      case 'OPENROUTER':
        return `${config.baseUrl}/chat/completions`;
      default:
        return `${config.baseUrl}/chat/completions`;
    }
  }

  private async parseErrorResponse(response: Response, config: ProviderConfig): Promise<LLMError> {
    let errorData: unknown;
    try {
      errorData = await response.json();
    } catch {
      errorData = { status: response.status, message: response.statusText };
    }

    const error = config.parseError(errorData);
    error.httpStatus = response.status;
    return error;
  }

  // ============================================
  // Usage Tracking & Alerts
  // ============================================

  private async logUsage(input: UsageLogInput): Promise<string> {
    const log = await db.apiUsageLog.create({
      data: {
        tenantId: input.tenantId,
        credentialId: input.credentialId,
        requestType: input.requestType,
        model: input.model,
        provider: input.provider,
        promptTokens: input.promptTokens,
        completionTokens: input.completionTokens,
        totalTokens: input.totalTokens,
        costCents: input.costCents,
        durationMs: input.durationMs,
        status: input.status,
        errorMessage: input.errorMessage,
        agentType: input.agentType,
        jobId: input.jobId,
        candidateId: input.candidateId,
        taskId: input.taskId,
      },
    });

    return log.id;
  }

  private async updateCredentialUsage(credentialId: string, additionalTokens: number): Promise<void> {
    await db.apiCredential.update({
      where: { id: credentialId },
      data: {
        currentUsage: { increment: additionalTokens },
        lastUsedAt: new Date(),
      },
    });
  }

  private async checkThresholdAlerts(
    tenantId: string,
    credentialId: string,
    currentUsage: number,
    monthlyLimit?: number | null,
    alertThreshold?: number | null
  ): Promise<void> {
    if (!monthlyLimit || !alertThreshold) return;

    const thresholdAmount = Math.floor(monthlyLimit * (alertThreshold / 100));
    
    // Check if we crossed the threshold
    const previousUsage = currentUsage - this.cache.get(`usage_${credentialId}`)?.data as number || 0;
    
    if (previousUsage < thresholdAmount && currentUsage >= thresholdAmount) {
      // Create alert
      await db.apiAlert.create({
        data: {
          tenantId,
          credentialId,
          type: ApiAlertType.USAGE_THRESHOLD,
          severity: ApiAlertSeverity.WARNING,
          message: `API usage has reached ${alertThreshold}% of monthly limit`,
          thresholdValue: alertThreshold,
          currentValue: currentUsage,
        },
      });
    }

    // Check if limit reached
    if (previousUsage < monthlyLimit && currentUsage >= monthlyLimit) {
      await db.apiAlert.create({
        data: {
          tenantId,
          credentialId,
          type: ApiAlertType.LIMIT_REACHED,
          severity: ApiAlertSeverity.ERROR,
          message: 'API usage has reached monthly limit',
          thresholdValue: monthlyLimit,
          currentValue: currentUsage,
        },
      });
    }

    // Cache current usage for next comparison
    this.saveToCache(`usage_${credentialId}`, currentUsage, 60000);
  }

  // ============================================
  // Cost Calculation
  // ============================================

  calculateCost(
    provider: LLMProvider,
    modelId: string,
    promptTokens: number,
    completionTokens: number
  ): number {
    const config = PROVIDER_CONFIGS[provider];
    const model = config.models.find((m) => m.id === modelId);

    if (!model) {
      // Use default model costs
      const defaultModel = config.models.find((m) => m.id === config.defaultModel);
      if (!defaultModel) return 0;
      
      return Math.ceil(
        (promptTokens * defaultModel.inputCostPer1kTokens) / 1000 +
        (completionTokens * defaultModel.outputCostPer1kTokens) / 1000
      );
    }

    return Math.ceil(
      (promptTokens * model.inputCostPer1kTokens) / 1000 +
      (completionTokens * model.outputCostPer1kTokens) / 1000
    );
  }

  estimateCost(
    provider: LLMProvider,
    modelId: string,
    estimatedPromptTokens: number,
    estimatedCompletionTokens: number
  ): CostEstimate {
    const config = PROVIDER_CONFIGS[provider];
    const model = config.models.find((m) => m.id === modelId) || config.models[0];

    const promptCostCents = Math.ceil((estimatedPromptTokens * model.inputCostPer1kTokens) / 1000);
    const completionCostCents = Math.ceil((estimatedCompletionTokens * model.outputCostPer1kTokens) / 1000);

    return {
      promptCostCents,
      completionCostCents,
      totalCostCents: promptCostCents + completionCostCents,
      provider,
      model: modelId,
    };
  }

  // ============================================
  // Health Checks
  // ============================================

  async checkProviderHealth(
    tenantId: string,
    provider: LLMProvider
  ): Promise<ProviderHealth> {
    const startTime = Date.now();
    
    try {
      const credential = await this.getActiveCredential(tenantId, provider);
      
      if (!credential) {
        return {
          provider,
          isHealthy: false,
          lastCheck: new Date(),
          lastError: 'No active credentials',
        };
      }

      // Make a minimal request to check health
      const config = PROVIDER_CONFIGS[provider];
      const response = await this.makeRequest(
        config,
        credential.apiKey,
        {
          messages: [{ role: 'user', content: 'ping' }],
          maxTokens: 5,
        },
        config.defaultModel,
        5000
      );

      const latencyMs = Date.now() - startTime;

      return {
        provider,
        isHealthy: response.ok,
        lastCheck: new Date(),
        latencyMs,
        errorRate: 0,
      };
    } catch (error) {
      return {
        provider,
        isHealthy: false,
        lastCheck: new Date(),
        latencyMs: Date.now() - startTime,
        lastError: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async checkAllProvidersHealth(tenantId: string): Promise<HealthCheckResult> {
    const checks = await Promise.all(
      PROVIDER_PRIORITY.map((provider) => this.checkProviderHealth(tenantId, provider))
    );

    return {
      providers: checks,
      overallHealthy: checks.some((c) => c.isHealthy),
      checkedAt: new Date(),
    };
  }

  // ============================================
  // Utility Methods
  // ============================================

  private createErrorResult<T>(error: LLMError, startTime: number): LLMResult<T> {
    return {
      success: false,
      provider: error.provider || 'OPENAI',
      model: 'unknown',
      tokensUsed: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      costCents: 0,
      latencyMs: Date.now() - startTime,
      error,
    };
  }

  private mapErrorToStatus(error: LLMError): ApiCallStatus {
    switch (error.code) {
      case LLMErrorCode.RATE_LIMITED:
        return ApiCallStatus.RATE_LIMITED;
      case LLMErrorCode.TIMEOUT:
        return ApiCallStatus.TIMEOUT;
      default:
        return ApiCallStatus.ERROR;
    }
  }

  private parseStreamChunk(data: unknown, provider: LLMProvider): StreamChunk | null {
    try {
      if (provider === 'GEMINI') {
        const gemini = data as GeminiResponse;
        return {
          id: `gemini-${Date.now()}`,
          provider,
          model: 'gemini',
          choices: gemini.candidates.map((c, i): StreamChoice => ({
            index: i,
            delta: { content: c.content.parts.map((p) => p.text).join('') },
            finishReason: c.finishReason,
          })),
          created: Date.now() / 1000,
        };
      }

      // OpenAI / OpenRouter format
      const openai = data as OpenAIResponse;
      return {
        id: openai.id,
        provider,
        model: openai.model,
        choices: openai.choices.map((c): StreamChoice => ({
          index: c.index,
          delta: { content: c.message.content, role: c.message.role },
          finishReason: c.finish_reason,
        })),
        created: openai.created,
      };
    } catch {
      return null;
    }
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private estimateContextWindow(request: ChatCompletionRequest): number {
    const totalChars = request.messages.reduce((sum, m) => sum + m.content.length, 0);
    return Math.ceil(totalChars / 4) * 2; // 2x buffer for response
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

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================
  // Caching Methods
  // ============================================

  private getFromCache(key: string): unknown | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  private saveToCache(key: string, data: unknown, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  // ============================================
  // Convenience Methods
  // ============================================

  async complete<T = unknown>(
    tenantId: string,
    systemPrompt: string,
    userPrompt: string,
    options?: Partial<LLMCallOptions>
  ): Promise<LLMResult<T>> {
    return this.chatCompletion<T>(
      {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        jsonMode: true,
      },
      { tenantId, ...options }
    );
  }

  async completeWithJson<T>(
    tenantId: string,
    systemPrompt: string,
    userPrompt: string,
    options?: Partial<LLMCallOptions>
  ): Promise<LLMResult<T>> {
    return this.chatCompletion<T>(
      {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        jsonMode: true,
      },
      { tenantId, ...options }
    );
  }

  getModelConfig(provider: LLMProvider, modelId: string): ModelConfig | undefined {
    const config = PROVIDER_CONFIGS[provider];
    return config.models.find((m) => m.id === modelId);
  }

  getAvailableModels(provider: LLMProvider): ModelConfig[] {
    return PROVIDER_CONFIGS[provider].models;
  }
}

// ============================================
// Export Singleton Instance
// ============================================

export const llmService = new MultiProviderLLMService();

// Export convenience functions
export const chatCompletion = llmService.chatCompletion.bind(llmService);
export const streamCompletion = llmService.streamCompletion.bind(llmService);
export const complete = llmService.complete.bind(llmService);
export const completeWithJson = llmService.completeWithJson.bind(llmService);

// Re-export types
export * from './types';
