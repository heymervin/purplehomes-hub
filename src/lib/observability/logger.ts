/**
 * AI Observability Logger
 *
 * Centralized logging utility for AI generation events.
 *
 * CRITICAL RULES:
 * 1. NEVER throw - wrap everything in try/catch
 * 2. NEVER await - all operations must be fire-and-forget
 * 3. NEVER block - the main thread must not wait
 * 4. NEVER affect behavior - this is read-only instrumentation
 */

import type {
  AIEvent,
  AIEventType,
  ViolationRecord,
  GenerationStartedEvent,
  GenerationPassedEvent,
  GenerationFailedEvent,
  GenerationRegeneratedEvent,
  GenerationFailHardEvent,
} from './types';

// ============ CONFIGURATION ============

const LOG_PREFIX = '[AI-OBS]';
const ENABLE_CONSOLE_LOGGING = process.env.NODE_ENV !== 'production';

// ============ INTERNAL STATE ============

const eventBuffer: AIEvent[] = [];
const MAX_BUFFER_SIZE = 1000;

// ============ CORE LOGGING ============

/**
 * Log an AI event. NEVER throws, NEVER blocks.
 */
export function logAIEvent(event: AIEvent): void {
  try {
    // Add to buffer (circular)
    if (eventBuffer.length >= MAX_BUFFER_SIZE) {
      eventBuffer.shift();
    }
    eventBuffer.push(event);

    // Console output for development
    if (ENABLE_CONSOLE_LOGGING) {
      const emoji = getEventEmoji(event.eventType);
      console.log(
        `${LOG_PREFIX} ${emoji} ${event.eventType}`,
        `[${event.domain}/${event.intentId}]`,
        formatEventDetails(event)
      );
    }
  } catch {
    // Silently ignore - observability must never crash the system
  }
}

// ============ EVENT FACTORY FUNCTIONS ============

/**
 * Create and log a generation_started event
 */
export function logGenerationStarted(params: {
  intentId: string;
  domain: 'property' | 'personal' | 'professional';
  toneId: string;
  hasProperty: boolean;
  contextKeys: string[];
  batchItemId?: string | null;
  isBatch?: boolean;
}): void {
  const event: GenerationStartedEvent = {
    eventType: 'generation_started',
    intentId: params.intentId,
    domain: params.domain,
    batchItemId: params.batchItemId ?? null,
    isBatch: params.isBatch ?? false,
    timestamp: new Date().toISOString(),
    toneId: params.toneId,
    hasProperty: params.hasProperty,
    contextKeys: params.contextKeys,
  };
  logAIEvent(event);
}

/**
 * Create and log a generation_passed event
 */
export function logGenerationPassed(params: {
  intentId: string;
  domain: 'property' | 'personal' | 'professional';
  captionLength: number;
  attemptNumber: number;
  durationMs: number;
  batchItemId?: string | null;
  isBatch?: boolean;
}): void {
  const event: GenerationPassedEvent = {
    eventType: 'generation_passed',
    intentId: params.intentId,
    domain: params.domain,
    batchItemId: params.batchItemId ?? null,
    isBatch: params.isBatch ?? false,
    timestamp: new Date().toISOString(),
    captionLength: params.captionLength,
    attemptNumber: params.attemptNumber,
    durationMs: params.durationMs,
  };
  logAIEvent(event);
}

/**
 * Create and log a generation_failed event
 */
export function logGenerationFailed(params: {
  intentId: string;
  domain: 'property' | 'personal' | 'professional';
  violations: ViolationRecord[];
  attemptNumber: number;
  willRetry: boolean;
  batchItemId?: string | null;
  isBatch?: boolean;
}): void {
  const event: GenerationFailedEvent = {
    eventType: 'generation_failed',
    intentId: params.intentId,
    domain: params.domain,
    batchItemId: params.batchItemId ?? null,
    isBatch: params.isBatch ?? false,
    timestamp: new Date().toISOString(),
    violations: params.violations,
    attemptNumber: params.attemptNumber,
    willRetry: params.willRetry,
  };
  logAIEvent(event);
}

/**
 * Create and log a generation_regenerated event
 */
export function logGenerationRegenerated(params: {
  intentId: string;
  domain: 'property' | 'personal' | 'professional';
  previousViolations: ViolationRecord[];
  attemptNumber: number;
  batchItemId?: string | null;
  isBatch?: boolean;
}): void {
  const event: GenerationRegeneratedEvent = {
    eventType: 'generation_regenerated',
    intentId: params.intentId,
    domain: params.domain,
    batchItemId: params.batchItemId ?? null,
    isBatch: params.isBatch ?? false,
    timestamp: new Date().toISOString(),
    previousViolations: params.previousViolations,
    attemptNumber: params.attemptNumber,
  };
  logAIEvent(event);
}

/**
 * Create and log a generation_fail_hard event
 */
export function logGenerationFailHard(params: {
  intentId: string;
  domain: 'property' | 'personal' | 'professional';
  totalAttempts: number;
  allViolations: ViolationRecord[];
  errorMessage: string;
  batchItemId?: string | null;
  isBatch?: boolean;
}): void {
  const event: GenerationFailHardEvent = {
    eventType: 'generation_fail_hard',
    intentId: params.intentId,
    domain: params.domain,
    batchItemId: params.batchItemId ?? null,
    isBatch: params.isBatch ?? false,
    timestamp: new Date().toISOString(),
    totalAttempts: params.totalAttempts,
    allViolations: params.allViolations,
    errorMessage: params.errorMessage,
  };
  logAIEvent(event);
}

// ============ BUFFER ACCESS ============

/**
 * Get recent events from buffer (for debugging/monitoring)
 */
export function getRecentEvents(count: number = 50): AIEvent[] {
  try {
    return eventBuffer.slice(-count);
  } catch {
    return [];
  }
}

/**
 * Get events by type
 */
export function getEventsByType(type: AIEventType): AIEvent[] {
  try {
    return eventBuffer.filter((e) => e.eventType === type);
  } catch {
    return [];
  }
}

/**
 * Clear event buffer (for testing)
 */
export function clearEventBuffer(): void {
  try {
    eventBuffer.length = 0;
  } catch {
    // Silently ignore
  }
}

// ============ HELPERS ============

function getEventEmoji(type: AIEventType): string {
  switch (type) {
    case 'generation_started':
      return '▶️';
    case 'generation_passed':
      return '✅';
    case 'generation_failed':
      return '⚠️';
    case 'generation_regenerated':
      return '🔄';
    case 'generation_fail_hard':
      return '❌';
    default:
      return '📝';
  }
}

function formatEventDetails(event: AIEvent): string {
  try {
    switch (event.eventType) {
      case 'generation_started':
        return `tone=${event.toneId} hasProperty=${event.hasProperty}`;
      case 'generation_passed':
        return `attempt=${event.attemptNumber} length=${event.captionLength} duration=${event.durationMs}ms`;
      case 'generation_failed':
        return `attempt=${event.attemptNumber} violations=${event.violations.length} willRetry=${event.willRetry}`;
      case 'generation_regenerated':
        return `attempt=${event.attemptNumber} prevViolations=${event.previousViolations.length}`;
      case 'generation_fail_hard':
        return `attempts=${event.totalAttempts} violations=${event.allViolations.length}`;
      default:
        return '';
    }
  } catch {
    return '';
  }
}
