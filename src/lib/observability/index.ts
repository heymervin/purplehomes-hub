/**
 * Observability Module
 *
 * Internal visibility for AI generation operations.
 * All exports are passive, non-blocking, and non-invasive.
 */

// Types
export type {
  AIEventType,
  AIEvent,
  AIEventBase,
  GenerationStartedEvent,
  GenerationPassedEvent,
  GenerationFailedEvent,
  GenerationRegeneratedEvent,
  GenerationFailHardEvent,
  ViolationRecord,
  ViolationSeverity,
  AIMetrics,
  DomainMetrics,
  IntentMetrics,
  HealthSignal,
  HealthStatus,
  IntegrityCheckResult,
} from './types';

// Logger
export {
  logAIEvent,
  logGenerationStarted,
  logGenerationPassed,
  logGenerationFailed,
  logGenerationRegenerated,
  logGenerationFailHard,
  getRecentEvents,
  getEventsByType,
  clearEventBuffer,
} from './logger';

// Metrics
export {
  recordGenerationStart,
  recordGenerationPassed,
  recordGenerationFailed,
  recordRegeneration,
  recordFailHard,
  getMetrics,
  getDomainMetrics,
  getIntentMetrics,
  resetMetrics,
  getHealthSignal,
  logHealthStatus,
} from './metrics';

// Integrity
export {
  EXPECTED_INTENTS,
  EXPECTED_INTENT_COUNT,
  checkIntentIntegrity,
  runIntegrityCheck,
  getExpectedDomainMapping,
} from './integrity';
