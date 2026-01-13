/**
 * Observability Types
 *
 * Type definitions for internal observability events.
 * These types support operational visibility without affecting system behavior.
 *
 * IMPORTANT: All observability code MUST be:
 * - Non-blocking (never await, never throw)
 * - Passive (read-only, no side effects on generation)
 * - Silent (no user-facing output)
 */

// ============ EVENT TYPES ============

export type AIEventType =
  | 'generation_started'
  | 'generation_passed'
  | 'generation_failed'
  | 'generation_regenerated'
  | 'generation_fail_hard';

export type ViolationSeverity = 'warning' | 'error';

// ============ EVENT PAYLOADS ============

/**
 * Base event payload - all events include these fields
 */
export interface AIEventBase {
  eventType: AIEventType;
  intentId: string;
  domain: 'property' | 'personal' | 'professional';
  batchItemId: string | null;
  isBatch: boolean;
  timestamp: string; // ISO 8601
}

/**
 * Generation started event
 */
export interface GenerationStartedEvent extends AIEventBase {
  eventType: 'generation_started';
  toneId: string;
  hasProperty: boolean;
  contextKeys: string[];
}

/**
 * Generation passed event (validation succeeded)
 */
export interface GenerationPassedEvent extends AIEventBase {
  eventType: 'generation_passed';
  captionLength: number;
  attemptNumber: number;
  durationMs: number;
}

/**
 * Generation failed event (validation failed, will retry)
 */
export interface GenerationFailedEvent extends AIEventBase {
  eventType: 'generation_failed';
  violations: ViolationRecord[];
  attemptNumber: number;
  willRetry: boolean;
}

/**
 * Generation regenerated event (retry attempt)
 */
export interface GenerationRegeneratedEvent extends AIEventBase {
  eventType: 'generation_regenerated';
  previousViolations: ViolationRecord[];
  attemptNumber: number;
}

/**
 * Generation fail-hard event (all retries exhausted)
 */
export interface GenerationFailHardEvent extends AIEventBase {
  eventType: 'generation_fail_hard';
  totalAttempts: number;
  allViolations: ViolationRecord[];
  errorMessage: string;
}

/**
 * Union type for all AI events
 */
export type AIEvent =
  | GenerationStartedEvent
  | GenerationPassedEvent
  | GenerationFailedEvent
  | GenerationRegeneratedEvent
  | GenerationFailHardEvent;

// ============ VIOLATION TYPES ============

/**
 * Record of a single domain violation
 */
export interface ViolationRecord {
  ruleId: string;
  domain: 'property' | 'personal' | 'professional';
  severity: ViolationSeverity;
  matchedPhrase: string;
  message: string;
  generationAttempt: number;
}

// ============ METRICS TYPES ============

/**
 * In-memory metrics counters
 */
export interface AIMetrics {
  // Generation counts
  totalGenerations: number;
  successfulGenerations: number;
  failedGenerations: number;
  regenerations: number;
  failHards: number;

  // Per-domain counts
  byDomain: {
    property: DomainMetrics;
    personal: DomainMetrics;
    professional: DomainMetrics;
  };

  // Per-intent counts
  byIntent: Record<string, IntentMetrics>;

  // Violation tracking
  violationsByRule: Record<string, number>;

  // Health signals
  lastUpdated: string;
  sessionStarted: string;
}

export interface DomainMetrics {
  total: number;
  passed: number;
  failed: number;
  regenerated: number;
  failHard: number;
}

export interface IntentMetrics {
  total: number;
  passed: number;
  failed: number;
}

// ============ HEALTH TYPES ============

export type HealthStatus = 'healthy' | 'degraded' | 'critical';

export interface HealthSignal {
  status: HealthStatus;
  failHardRate: number;
  regenerationRate: number;
  topViolations: Array<{ ruleId: string; count: number }>;
  warnings: string[];
}

// ============ INTEGRITY TYPES ============

export interface IntegrityCheckResult {
  passed: boolean;
  expectedIntents: number;
  foundIntents: number;
  missingIntents: string[];
  extraIntents: string[];
  timestamp: string;
}
