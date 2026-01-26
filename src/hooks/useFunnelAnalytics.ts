import { useEffect, useRef, useCallback } from 'react';
import type {
  FunnelAnalytics,
  UseFunnelAnalyticsOptions,
  AnalyticsTrackRequest,
  ANALYTICS_WEIGHTS,
  ANALYTICS_TARGETS
} from '../types/analytics';

interface SessionState {
  sessionId: string;
  startTime: number;
  maxScrollDepth: number;
  ctaClicks: number;
  formSubmitted: boolean;
  videoPlayed: boolean;
  sent: boolean;
}

/**
 * Calculate effectiveness score from session metrics
 * Formula from PARKED_IDEAS.md:
 * - Time on page: 30% weight (2 min = 10)
 * - Scroll depth: 20% weight (75% = 10)
 * - CTA clicks: 25% weight (any click = 10)
 * - Form submission: 25% weight (submitted = 10)
 */
function calculateEffectivenessScore(session: SessionState): number {
  const timeSeconds = (Date.now() - session.startTime) / 1000;

  // Time score: linear up to 2 minutes (120 seconds)
  const timeScore = Math.min(timeSeconds / 120, 1) * 10;

  // Scroll score: linear up to 75%
  const scrollScore = Math.min(session.maxScrollDepth / 75, 1) * 10;

  // CTA score: binary (any click = 10)
  const ctaScore = session.ctaClicks > 0 ? 10 : 0;

  // Form score: binary (submitted = 10)
  const formScore = session.formSubmitted ? 10 : 0;

  // Weighted average
  const effectiveness =
    timeScore * 0.30 +
    scrollScore * 0.20 +
    ctaScore * 0.25 +
    formScore * 0.25;

  return Math.round(effectiveness * 10) / 10; // 1 decimal place
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get or create session from sessionStorage
 */
function getOrCreateSession(propertySlug: string): SessionState {
  const storageKey = `funnel-analytics-${propertySlug}`;
  const stored = sessionStorage.getItem(storageKey);

  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Invalid data, create new
    }
  }

  const newSession: SessionState = {
    sessionId: generateSessionId(),
    startTime: Date.now(),
    maxScrollDepth: 0,
    ctaClicks: 0,
    formSubmitted: false,
    videoPlayed: false,
    sent: false
  };

  sessionStorage.setItem(storageKey, JSON.stringify(newSession));
  return newSession;
}

/**
 * Save session to sessionStorage
 */
function saveSession(propertySlug: string, session: SessionState): void {
  const storageKey = `funnel-analytics-${propertySlug}`;
  sessionStorage.setItem(storageKey, JSON.stringify(session));
}

/**
 * useFunnelAnalytics - Tracks user behavior for automatic effectiveness scoring
 *
 * Tracks:
 * - Time on page (mount timestamp + duration on unmount)
 * - Scroll depth (via IntersectionObserver on document height)
 * - CTA clicks (exposed function)
 * - Form submissions (exposed function)
 * - Video plays (exposed function)
 *
 * Sends data via navigator.sendBeacon on page unload for reliable delivery.
 */
export function useFunnelAnalytics(options: UseFunnelAnalyticsOptions): FunnelAnalytics {
  const { propertyId, propertySlug, avatarResearchId, buyerSegment } = options;

  // Use ref to avoid re-renders and maintain state across effects
  const sessionRef = useRef<SessionState | null>(null);
  const optionsRef = useRef(options);

  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Initialize session on mount
  useEffect(() => {
    if (!propertySlug) return;

    sessionRef.current = getOrCreateSession(propertySlug);
  }, [propertySlug]);

  // Scroll depth tracking
  useEffect(() => {
    if (!propertySlug) return;

    const handleScroll = () => {
      if (!sessionRef.current) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0;

      if (scrollPercent > sessionRef.current.maxScrollDepth) {
        sessionRef.current.maxScrollDepth = scrollPercent;
        saveSession(propertySlug, sessionRef.current);
      }
    };

    // Throttle scroll events
    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledScroll, { passive: true });
    return () => window.removeEventListener('scroll', throttledScroll);
  }, [propertySlug]);

  // Send analytics function
  const sendAnalytics = useCallback(() => {
    const session = sessionRef.current;
    const opts = optionsRef.current;

    if (!session || session.sent || !opts.propertySlug) return;

    // Mark as sent to prevent duplicates
    session.sent = true;
    saveSession(opts.propertySlug, session);

    const timeOnPageSeconds = Math.round((Date.now() - session.startTime) / 1000);

    // Skip very short sessions (likely bots or immediate bounces)
    if (timeOnPageSeconds < 3) return;

    const payload: AnalyticsTrackRequest = {
      propertyId: opts.propertyId,
      propertySlug: opts.propertySlug,
      avatarResearchId: opts.avatarResearchId,
      buyerSegment: opts.buyerSegment,
      sessionId: session.sessionId,
      timeOnPageSeconds,
      maxScrollDepth: session.maxScrollDepth,
      ctaClicks: session.ctaClicks,
      formSubmitted: session.formSubmitted,
      videoPlayed: session.videoPlayed,
      timestamp: new Date().toISOString()
    };

    // Use sendBeacon for reliable delivery on page close
    // Must use Blob with application/json type - plain string sends as text/plain which API can't parse
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const sent = navigator.sendBeacon(
      '/api/funnel?action=analytics-track',
      blob
    );

    // Fallback to fetch if sendBeacon fails
    if (!sent) {
      fetch('/api/funnel?action=analytics-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {
        // Silent fail - analytics should never break the page
      });
    }

    // Clear session from storage after sending
    sessionStorage.removeItem(`funnel-analytics-${opts.propertySlug}`);
  }, []);

  // Send on page unload
  useEffect(() => {
    if (!propertySlug) return;

    const handleUnload = () => sendAnalytics();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendAnalytics();
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [propertySlug, sendAnalytics]);

  // Exposed tracking functions
  const trackCtaClick = useCallback((ctaType: string) => {
    if (!sessionRef.current || !propertySlug) return;
    sessionRef.current.ctaClicks += 1;
    saveSession(propertySlug, sessionRef.current);
  }, [propertySlug]);

  const trackFormSubmission = useCallback(() => {
    if (!sessionRef.current || !propertySlug) return;
    sessionRef.current.formSubmitted = true;
    saveSession(propertySlug, sessionRef.current);

    // Send immediately on form submission (high-value event)
    sendAnalytics();
  }, [propertySlug, sendAnalytics]);

  const trackVideoPlay = useCallback(() => {
    if (!sessionRef.current || !propertySlug) return;
    sessionRef.current.videoPlayed = true;
    saveSession(propertySlug, sessionRef.current);
  }, [propertySlug]);

  return {
    trackCtaClick,
    trackFormSubmission,
    trackVideoPlay
  };
}
