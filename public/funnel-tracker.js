/**
 * Purple Homes Funnel Analytics Tracker
 *
 * Embed this script on funnel pages to track visitor behavior.
 * No cookies required - uses localStorage for session continuity.
 *
 * Usage:
 * <script
 *   src="https://purplehomes-hub.vercel.app/funnel-tracker.js"
 *   data-property-id="YOUR_PROPERTY_ID"
 *   data-property-slug="your-property-slug"
 *   data-segment="first-time-buyer"
 *   data-avatar-research-id="OPTIONAL_RESEARCH_ID">
 * </script>
 */

(function() {
  'use strict';

  // Configuration
  const API_BASE = 'https://purplehomes-hub.vercel.app/api/funnel/analytics';
  const UPDATE_INTERVAL = 5000; // Send updates every 5 seconds
  const SCROLL_THROTTLE = 200; // Throttle scroll events

  // Get script attributes
  const script = document.currentScript;
  const config = {
    propertyId: script?.getAttribute('data-property-id') || '',
    propertySlug: script?.getAttribute('data-property-slug') || '',
    segment: script?.getAttribute('data-segment') || '',
    avatarResearchId: script?.getAttribute('data-avatar-research-id') || ''
  };

  // Session state
  const state = {
    sessionId: getOrCreateSessionId(),
    startTime: Date.now(),
    maxScrollDepth: 0,
    ctaClicks: 0,
    formSubmitted: false,
    videoPlayed: false,
    initialized: false,
    lastUpdate: 0
  };

  // Generate unique session ID
  function getOrCreateSessionId() {
    const storageKey = `ph_funnel_session_${config.propertyId}`;
    let sessionId = localStorage.getItem(storageKey);

    // Check if session is still valid (within 30 minutes)
    const sessionTimeKey = `${storageKey}_time`;
    const sessionTime = localStorage.getItem(sessionTimeKey);
    const thirtyMinutes = 30 * 60 * 1000;

    if (!sessionId || !sessionTime || (Date.now() - parseInt(sessionTime)) > thirtyMinutes) {
      // Create new session
      sessionId = 'ses_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem(storageKey, sessionId);
    }

    // Update session time
    localStorage.setItem(sessionTimeKey, Date.now().toString());

    return sessionId;
  }

  // Calculate scroll depth percentage
  function getScrollDepth() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (scrollHeight <= 0) return 100;
    return Math.round((scrollTop / scrollHeight) * 100);
  }

  // Get time on page in seconds
  function getTimeOnPage() {
    return Math.round((Date.now() - state.startTime) / 1000);
  }

  // Send tracking data to API
  async function sendTrackingData(action = 'update') {
    const payload = {
      sessionId: state.sessionId,
      propertyId: config.propertyId,
      propertySlug: config.propertySlug,
      buyerSegment: config.segment,
      avatarResearchId: config.avatarResearchId,
      maxScrollDepth: state.maxScrollDepth,
      timeOnPage: getTimeOnPage(),
      ctaClicks: state.ctaClicks,
      formSubmitted: state.formSubmitted,
      videoPlayed: state.videoPlayed
    };

    try {
      const response = await fetch(`${API_BASE}?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true // Ensure request completes even if page unloads
      });

      if (response.ok) {
        state.lastUpdate = Date.now();
        // Reset incremental counters after successful update
        if (action === 'update') {
          state.ctaClicks = 0;
        }
      }
    } catch (error) {
      console.warn('[PH Tracker] Failed to send data:', error);
    }
  }

  // Initialize tracking
  async function initialize() {
    if (state.initialized) return;
    state.initialized = true;

    // Start session tracking
    await sendTrackingData('track');

    console.log('[PH Tracker] Initialized', {
      sessionId: state.sessionId,
      propertyId: config.propertyId,
      segment: config.segment
    });
  }

  // Throttle function
  function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Track scroll depth
  const handleScroll = throttle(function() {
    const depth = getScrollDepth();
    if (depth > state.maxScrollDepth) {
      state.maxScrollDepth = depth;
    }
  }, SCROLL_THROTTLE);

  // Track CTA clicks
  function handleClick(event) {
    const target = event.target.closest('a, button, [data-cta], .cta, [role="button"]');
    if (!target) return;

    // Check if it's a CTA element
    const isCTA = target.hasAttribute('data-cta') ||
                  target.classList.contains('cta') ||
                  target.classList.contains('btn-primary') ||
                  target.classList.contains('btn-cta') ||
                  target.textContent?.toLowerCase().includes('get started') ||
                  target.textContent?.toLowerCase().includes('apply') ||
                  target.textContent?.toLowerCase().includes('schedule') ||
                  target.textContent?.toLowerCase().includes('contact') ||
                  target.textContent?.toLowerCase().includes('learn more');

    if (isCTA) {
      state.ctaClicks++;
      console.log('[PH Tracker] CTA click tracked');
    }
  }

  // Track form submissions
  function handleSubmit(event) {
    state.formSubmitted = true;
    console.log('[PH Tracker] Form submission tracked');
    sendTrackingData('update');
  }

  // Track video plays
  function handleVideoPlay(event) {
    if (event.target.tagName === 'VIDEO' || event.target.closest('iframe[src*="youtube"], iframe[src*="vimeo"]')) {
      state.videoPlayed = true;
      console.log('[PH Tracker] Video play tracked');
    }
  }

  // Periodic update
  function startPeriodicUpdates() {
    setInterval(() => {
      if (state.maxScrollDepth > 0 || getTimeOnPage() > 5) {
        sendTrackingData('update');
      }
    }, UPDATE_INTERVAL);
  }

  // Handle page visibility changes
  function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      sendTrackingData('update');
    }
  }

  // Handle page unload
  function handleUnload() {
    sendTrackingData('update');
  }

  // Set up event listeners
  function setupListeners() {
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('click', handleClick, { capture: true });
    document.addEventListener('submit', handleSubmit, { capture: true });
    document.addEventListener('play', handleVideoPlay, { capture: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);
  }

  // Wait for DOM ready
  function ready(fn) {
    if (document.readyState !== 'loading') {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }

  // Start tracking
  ready(function() {
    if (!config.propertyId) {
      console.warn('[PH Tracker] Missing data-property-id attribute');
      return;
    }

    initialize();
    setupListeners();
    startPeriodicUpdates();

    // Track initial scroll position (in case page loads scrolled)
    handleScroll();
  });

  // Expose for manual tracking if needed
  window.PHTracker = {
    trackCTA: function() {
      state.ctaClicks++;
      sendTrackingData('update');
    },
    trackFormSubmit: function() {
      state.formSubmitted = true;
      sendTrackingData('update');
    },
    trackVideoPlay: function() {
      state.videoPlayed = true;
      sendTrackingData('update');
    },
    getState: function() {
      return { ...state, timeOnPage: getTimeOnPage() };
    }
  };

})();
