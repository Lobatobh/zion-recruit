/**
 * Multi-Provider LLM Service Types
 * Zion Recruit - AI-Powered Recruitment SaaS
 */

import { ApiProvider, ApiCallStatus } from '@prisma/client';

// ============================================
// Provider Configuration Types
// ============================================

export type LLMProvider = Extract<ApiProvider, 'OPENAI' | 'GEMINI' | 'OPENROUTER'>;

export interface ProviderConfig {
  name: LLMProvider;
  baseUrl: string;
  defaultModel: string;
  models: ModelConfig[];
  headerFormat: (apiKey: string) => Record<string, string>;
  transformRequest: (request: ChatCompletionRequest, model: string) => unknown;
  transformResponse: (response: unknown) => ChatCompletionResponse;
  parseError: (error: unknown) => LLMError;
}

export interface ModelConfig {
  id: string;
  displayName: string;
  inputCostPer1kTokens: number; // in cents
  outputCostPer1kTokens: number; // in cents
  maxTokens: number;
  supportsJson: boolean;
  supportsStreaming: boolean;
  contextWindow: number;
}

// ============================================
// Chat Completion Types
// ============================================

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stop?: string[];
  stream?: boolean;
  jsonMode?: boolean;
  responseFormat?: { type: 'text' | 'json_object' };
}

export interface ChatCompletionResponse {
  id: string;
  provider: LLMProvider;
  model: string;
  choices: ChatCompletionChoice[];
  usage: TokenUsage;
  created: number;
  latencyMs: number;
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finishReason: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// ============================================
// Streaming Types
// ============================================

export interface StreamChunk {
  id: string;
  provider: LLMProvider;
  model: string;
  choices: StreamChoice[];
  created: number;
}

export interface StreamChoice {
  index: number;
  delta: { role?: string; content?: string };
  finishReason: string | null;
}

export type StreamCallback = (chunk: StreamChunk) => void;

// ============================================
// Provider Selection Types
// ============================================

export interface ProviderSelectionOptions {
  tenantId: string;
  preferredProvider?: LLMProvider;
  costOptimization?: boolean;
  requireJson?: boolean;
  requireStreaming?: boolean;
  minContextWindow?: number;
  excludeProviders?: LLMProvider[];
  excludeModels?: string[];
}

export interface SelectedProvider {
  provider: LLMProvider;
  model: string;
  credential: CredentialInfo;
  estimatedCost: number; // in cents
}

export interface CredentialInfo {
  id: string;
  provider: ApiProvider;
  apiKey: string;
  endpoint?: string;
  defaultModel?: string;
  maxTokensPerCall?: number;
  temperature?: number;
  monthlyLimit?: number;
  alertThreshold?: number;
  currentUsage: number;
}

// ============================================
// Usage Tracking Types
// ============================================

export interface UsageLogInput {
  tenantId: string;
  credentialId: string;
  requestType: string;
  model: string;
  provider: ApiProvider;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costCents: number;
  durationMs: number;
  status: ApiCallStatus;
  errorMessage?: string;
  agentType?: string;
  jobId?: string;
  candidateId?: string;
  taskId?: string;
}

export interface UsageSummary {
  totalTokens: number;
  totalCostCents: number;
  totalCalls: number;
  successRate: number;
  byProvider: Record<LLMProvider, ProviderUsageStats>;
  byModel: Record<string, ModelUsageStats>;
}

export interface ProviderUsageStats {
  totalCalls: number;
  totalTokens: number;
  totalCostCents: number;
  successCount: number;
  errorCount: number;
}

export interface ModelUsageStats {
  totalCalls: number;
  totalTokens: number;
  totalCostCents: number;
  avgLatencyMs: number;
}

// ============================================
// Alert Types
// ============================================

export interface AlertInput {
  tenantId: string;
  credentialId: string;
  type: 'USAGE_THRESHOLD' | 'LIMIT_REACHED' | 'API_ERROR' | 'CREDENTIAL_EXPIRED' | 'HIGH_COST';
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  thresholdValue?: number;
  currentValue?: number;
}

// ============================================
// Failover Types
// ============================================

export interface FailoverConfig {
  maxRetries: number;
  retryDelayMs: number;
  exponentialBackoff: boolean;
  maxRetryDelayMs: number;
  failoverOnRateLimit: boolean;
  failoverOnTimeout: boolean;
  failoverOnError: boolean;
}

export interface FailoverState {
  attemptNumber: number;
  currentProvider: LLMProvider;
  triedProviders: LLMProvider[];
  lastError?: LLMError;
}

// ============================================
// Error Types
// ============================================

export interface LLMError {
  code: LLMErrorCode;
  message: string;
  provider?: LLMProvider;
  httpStatus?: number;
  retryable: boolean;
  rawError?: unknown;
}

export enum LLMErrorCode {
  // Provider errors
  INVALID_API_KEY = 'INVALID_API_KEY',
  RATE_LIMITED = 'RATE_LIMITED',
  INSUFFICIENT_QUOTA = 'INSUFFICIENT_QUOTA',
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  CONTEXT_LENGTH_EXCEEDED = 'CONTEXT_LENGTH_EXCEEDED',
  CONTENT_FILTERED = 'CONTENT_FILTERED',
  
  // Network errors
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Request errors
  INVALID_REQUEST = 'INVALID_REQUEST',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  
  // Internal errors
  NO_CREDENTIALS = 'NO_CREDENTIALS',
  ALL_PROVIDERS_FAILED = 'ALL_PROVIDERS_FAILED',
  UNKNOWN = 'UNKNOWN',
}

// ============================================
// Service Options Types
// ============================================

export interface LLMServiceOptions {
  tenantId: string;
  agentType?: string;
  jobId?: string;
  candidateId?: string;
  taskId?: string;
  preferredProvider?: LLMProvider;
  preferredModel?: string;
  costOptimization?: boolean;
  failover?: Partial<FailoverConfig>;
  timeout?: number;
}

export interface LLMCallOptions extends LLMServiceOptions {
  cache?: CacheOptions;
}

export interface CacheOptions {
  enabled: boolean;
  ttlMs?: number;
  cacheKey?: string;
}

// ============================================
// Response Types
// ============================================

export interface LLMResult<T = unknown> {
  success: boolean;
  data?: T;
  rawContent?: string;
  provider: LLMProvider;
  model: string;
  tokensUsed: TokenUsage;
  costCents: number;
  latencyMs: number;
  cached?: boolean;
  error?: LLMError;
  usageLogId?: string;
}

export interface StreamingResult {
  streamId: string;
  provider: LLMProvider;
  model: string;
  abort: () => void;
}

// ============================================
// Cost Calculation Types
// ============================================

export interface CostEstimate {
  promptCostCents: number;
  completionCostCents: number;
  totalCostCents: number;
  provider: LLMProvider;
  model: string;
}

// ============================================
// Health Check Types
// ============================================

export interface ProviderHealth {
  provider: LLMProvider;
  isHealthy: boolean;
  lastCheck: Date;
  latencyMs?: number;
  errorRate?: number;
  lastError?: string;
}

export interface HealthCheckResult {
  providers: ProviderHealth[];
  overallHealthy: boolean;
  checkedAt: Date;
}

// ============================================
// Provider-Specific Request/Response Types
// ============================================

// OpenAI Types
export interface OpenAIRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stop?: string[];
  stream?: boolean;
  response_format?: { type: 'text' | 'json_object' };
}

export interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Gemini Types
export interface GeminiRequest {
  contents: Array<{
    role: string;
    parts: Array<{ text: string }>;
  }>;
  generationConfig?: {
    maxOutputTokens?: number;
    temperature?: number;
    topP?: number;
    stopSequences?: string[];
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      role: string;
      parts: Array<{ text: string }>;
    };
    finishReason: string;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

// OpenRouter Types
export interface OpenRouterRequest extends OpenAIRequest {
  provider?: {
    data_collection?: 'allow' | 'deny';
  };
  transforms?: string[];
}

export interface OpenRouterResponse extends OpenAIResponse {
  provider_name?: string;
}

// ============================================
// Default Values
// ============================================

export const DEFAULT_FAILOVER_CONFIG: FailoverConfig = {
  maxRetries: 3,
  retryDelayMs: 1000,
  exponentialBackoff: true,
  maxRetryDelayMs: 10000,
  failoverOnRateLimit: true,
  failoverOnTimeout: true,
  failoverOnError: true,
};

export const DEFAULT_MODELS: Record<LLMProvider, string> = {
  OPENAI: 'gpt-4o-mini',
  GEMINI: 'gemini-1.5-flash',
  OPENROUTER: 'openai/gpt-4o-mini',
};

export const PROVIDER_PRIORITY: LLMProvider[] = ['OPENAI', 'GEMINI', 'OPENROUTER'];
