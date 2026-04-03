/**
 * AI Agents - Zion Recruit
 * Export all agents
 */

// Base
export { BaseAgent } from './base/BaseAgent';
export type { AgentConfig, TaskInput, TaskOutput, TaskResult } from './base/BaseAgent';
export { llmService, callLLM } from './base/LLMService';

// Specialized Agents
export { JobParserAgent, parseJob } from './specialized/JobParserAgent';
export { SourcingAgent, sourceCandidates } from './specialized/SourcingAgent';
export { ScreeningAgent, screenCandidate, screenAllCandidates } from './specialized/ScreeningAgent';
export { ContactAgent, generateContactMessage, contactCandidates } from './specialized/ContactAgent';
export { OrchestratorAgent, runWorkflow, getAvailableWorkflows } from './specialized/OrchestratorAgent';
export { DISCAnalyzerAgent, analyzeDISCResult, getQuickDISCInterpretation } from './specialized/DISCAnalyzerAgent';

// Re-export types
export type { LLMRequest, LLMResponse } from './base/LLMService';
