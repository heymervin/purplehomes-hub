/**
 * AI Metrics Aggregation
 *
 * In-memory metrics for AI generation performance monitoring.
 *
 * CRITICAL RULES:
 * 1. NEVER throw - wrap everything in try/catch
 * 2. NEVER persist to database - memory only
 * 3. NEVER affect behavior - this is read-only instrumentation
 */

import type {
  AIMetrics,
  DomainMetrics,
  IntentMetrics,
  HealthSignal,
  HealthStatus,
  ViolationRecord,
} from './types';

// ============ CONFIGURATION ============

const FAIL_HARD_THRESHOLD = 0.1; // 10% fail-hard rate = degraded
const FAIL_HARD_CRITICAL = 0.2; // 20% fail-hard rate = critical
const REGENERATION_WARNING = 0.3; // 30% regeneration rate = warning

// ============ METRICS STATE ============

function createEmptyDomainMetrics(): DomainMetrics {
  return {
    total: 0,
    passed: 0,
    failed: 0,
    regenerated: 0,
    failHard: 0,
  };
}

function createEmptyMetrics(): AIMetrics {
  return {
    totalGenerations: 0,
    successfulGenerations: 0,
    failedGenerations: 0,
    regenerations: 0,
    failHards: 0,
    byDomain: {
      property: createEmptyDomainMetrics(),
      personal: createEmptyDomainMetrics(),
      professional: createEmptyDomainMetrics(),
    },
    byIntent: {},
    violationsByRule: {},
    lastUpdated: new Date().toISOString(),
    sessionStarted: new Date().toISOString(),
  };
}

let metrics: AIMetrics = createEmptyMetrics();

// ============ METRIC RECORDING ============

/**
 * Record a generation start
 */
export function recordGenerationStart(
  intentId: string,
  domain: 'property' | 'personal' | 'professional'
): void {
  try {
    metrics.totalGenerations++;
    metrics.byDomain[domain].total++;

    if (!metrics.byIntent[intentId]) {
      metrics.byIntent[intentId] = { total: 0, passed: 0, failed: 0 };
    }
    metrics.byIntent[intentId].total++;

    metrics.lastUpdated = new Date().toISOString();
  } catch {
    // Silently ignore
  }
}

/**
 * Record a successful generation (validation passed)
 */
export function recordGenerationPassed(
  intentId: string,
  domain: 'property' | 'personal' | 'professional'
): void {
  try {
    metrics.successfulGenerations++;
    metrics.byDomain[domain].passed++;

    if (metrics.byIntent[intentId]) {
      metrics.byIntent[intentId].passed++;
    }

    metrics.lastUpdated = new Date().toISOString();
  } catch {
    // Silently ignore
  }
}

/**
 * Record a failed generation (validation failed)
 */
export function recordGenerationFailed(
  intentId: string,
  domain: 'property' | 'personal' | 'professional',
  violations: ViolationRecord[]
): void {
  try {
    metrics.failedGenerations++;
    metrics.byDomain[domain].failed++;

    if (metrics.byIntent[intentId]) {
      metrics.byIntent[intentId].failed++;
    }

    // Track violations by rule
    for (const v of violations) {
      if (!metrics.violationsByRule[v.ruleId]) {
        metrics.violationsByRule[v.ruleId] = 0;
      }
      metrics.violationsByRule[v.ruleId]++;
    }

    metrics.lastUpdated = new Date().toISOString();
  } catch {
    // Silently ignore
  }
}

/**
 * Record a regeneration attempt
 */
export function recordRegeneration(
  domain: 'property' | 'personal' | 'professional'
): void {
  try {
    metrics.regenerations++;
    metrics.byDomain[domain].regenerated++;
    metrics.lastUpdated = new Date().toISOString();
  } catch {
    // Silently ignore
  }
}

/**
 * Record a fail-hard (all retries exhausted)
 */
export function recordFailHard(
  domain: 'property' | 'personal' | 'professional'
): void {
  try {
    metrics.failHards++;
    metrics.byDomain[domain].failHard++;
    metrics.lastUpdated = new Date().toISOString();
  } catch {
    // Silently ignore
  }
}

// ============ METRICS ACCESS ============

/**
 * Get current metrics snapshot
 */
export function getMetrics(): AIMetrics {
  try {
    return { ...metrics };
  } catch {
    return createEmptyMetrics();
  }
}

/**
 * Get metrics for a specific domain
 */
export function getDomainMetrics(
  domain: 'property' | 'personal' | 'professional'
): DomainMetrics {
  try {
    return { ...metrics.byDomain[domain] };
  } catch {
    return createEmptyDomainMetrics();
  }
}

/**
 * Get metrics for a specific intent
 */
export function getIntentMetrics(intentId: string): IntentMetrics | null {
  try {
    const intentMetrics = metrics.byIntent[intentId];
    return intentMetrics ? { ...intentMetrics } : null;
  } catch {
    return null;
  }
}

/**
 * Reset metrics (for testing or session reset)
 */
export function resetMetrics(): void {
  try {
    metrics = createEmptyMetrics();
  } catch {
    // Silently ignore
  }
}

// ============ HEALTH SIGNALS ============

/**
 * Calculate current health status based on metrics
 */
export function getHealthSignal(): HealthSignal {
  try {
    const total = metrics.totalGenerations;
    const warnings: string[] = [];

    // Calculate rates
    const failHardRate = total > 0 ? metrics.failHards / total : 0;
    const regenerationRate = total > 0 ? metrics.regenerations / total : 0;

    // Determine status
    let status: HealthStatus = 'healthy';

    if (failHardRate >= FAIL_HARD_CRITICAL) {
      status = 'critical';
      warnings.push(`CRITICAL: Fail-hard rate at ${(failHardRate * 100).toFixed(1)}%`);
    } else if (failHardRate >= FAIL_HARD_THRESHOLD) {
      status = 'degraded';
      warnings.push(`WARNING: Fail-hard rate at ${(failHardRate * 100).toFixed(1)}%`);
    }

    if (regenerationRate >= REGENERATION_WARNING) {
      warnings.push(`WARNING: High regeneration rate at ${(regenerationRate * 100).toFixed(1)}%`);
    }

    // Get top violations
    const topViolations = Object.entries(metrics.violationsByRule)
      .map(([ruleId, count]) => ({ ruleId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Check for domain-specific issues
    for (const [domain, domainMetrics] of Object.entries(metrics.byDomain)) {
      const domainTotal = domainMetrics.total;
      if (domainTotal >= 10) {
        const domainFailHardRate = domainMetrics.failHard / domainTotal;
        if (domainFailHardRate >= FAIL_HARD_THRESHOLD) {
          warnings.push(`WARNING: ${domain} domain fail-hard rate at ${(domainFailHardRate * 100).toFixed(1)}%`);
        }
      }
    }

    return {
      status,
      failHardRate,
      regenerationRate,
      topViolations,
      warnings,
    };
  } catch {
    return {
      status: 'healthy',
      failHardRate: 0,
      regenerationRate: 0,
      topViolations: [],
      warnings: [],
    };
  }
}

/**
 * Log health status to console (for monitoring)
 */
export function logHealthStatus(): void {
  try {
    const health = getHealthSignal();
    const statusEmoji =
      health.status === 'healthy' ? '🟢' :
      health.status === 'degraded' ? '🟡' : '🔴';

    console.log(`[AI-HEALTH] ${statusEmoji} Status: ${health.status}`);
    console.log(`[AI-HEALTH] Total: ${metrics.totalGenerations} | Passed: ${metrics.successfulGenerations} | Failed: ${metrics.failHards}`);
    console.log(`[AI-HEALTH] Fail-hard rate: ${(health.failHardRate * 100).toFixed(1)}% | Regen rate: ${(health.regenerationRate * 100).toFixed(1)}%`);

    if (health.warnings.length > 0) {
      for (const warning of health.warnings) {
        console.log(`[AI-HEALTH] ${warning}`);
      }
    }

    if (health.topViolations.length > 0) {
      console.log('[AI-HEALTH] Top violations:', health.topViolations.map(v => `${v.ruleId}(${v.count})`).join(', '));
    }
  } catch {
    // Silently ignore
  }
}
