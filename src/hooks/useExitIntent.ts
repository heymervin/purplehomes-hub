import { useState, useEffect, useCallback, useRef } from 'react';

interface UseExitIntentOptions {
  delayMs?: number;
  sessionKey?: string;
  disabled?: boolean;
}

interface UseExitIntentReturn {
  showExitIntent: boolean;
  dismiss: () => void;
  markConverted: () => void;
}

export function useExitIntent(options: UseExitIntentOptions = {}): UseExitIntentReturn {
  const {
    delayMs = 5000,
    sessionKey = 'ph-exit-intent-shown',
    disabled = false,
  } = options;

  const [showExitIntent, setShowExitIntent] = useState(false);
  const enabledRef = useRef(false);
  const triggeredRef = useRef(false);
  const mobileTriggeredRef = useRef(false);

  // Check if already suppressed on mount
  const alreadySuppressed = useRef(false);
  if (!alreadySuppressed.current) {
    try {
      alreadySuppressed.current = sessionStorage.getItem(sessionKey) === 'true';
    } catch {
      // sessionStorage unavailable (incognito, etc.)
    }
  }

  const suppress = useCallback(() => {
    try {
      sessionStorage.setItem(sessionKey, 'true');
    } catch {
      // ignore
    }
    triggeredRef.current = true;
  }, [sessionKey]);

  const dismiss = useCallback(() => {
    setShowExitIntent(false);
    suppress();
  }, [suppress]);

  const markConverted = useCallback(() => {
    setShowExitIntent(false);
    suppress();
  }, [suppress]);

  useEffect(() => {
    if (disabled || alreadySuppressed.current || triggeredRef.current) return;

    // Delay before enabling detection
    const timer = setTimeout(() => {
      enabledRef.current = true;
    }, delayMs);

    // Desktop: mouse leaves viewport through the top
    const handleMouseLeave = (e: MouseEvent) => {
      if (!enabledRef.current || triggeredRef.current) return;
      if (e.clientY <= 0) {
        setShowExitIntent(true);
        suppress();
      }
    };

    // Mobile: detect tab switch / app switch
    const handleVisibilityChange = () => {
      if (!enabledRef.current || triggeredRef.current) return;

      if (document.visibilityState === 'hidden') {
        // Mark for showing when they return
        mobileTriggeredRef.current = true;
      } else if (document.visibilityState === 'visible' && mobileTriggeredRef.current) {
        // User came back — show the modal
        mobileTriggeredRef.current = false;
        setShowExitIntent(true);
        suppress();
      }
    };

    document.documentElement.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(timer);
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [delayMs, disabled, suppress]);

  return { showExitIntent, dismiss, markConverted };
}
