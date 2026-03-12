import { useState, useEffect, useCallback, useRef } from 'react';
import { X, HelpCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TOUR_DISMISSED_KEY = 'purplehomes_listings_tour_dismissed';

interface MapCoachMarksProps {
  mapLoaded: boolean;
  className?: string;
  onOpenFilters?: () => void;
  onCloseFilters?: () => void;
}

// Tour step configuration - consolidated from 13 to 7 steps
const TOUR_STEPS = [
  {
    id: 1,
    selector: '[data-tour="map-area"]',
    title: 'Interactive Property Map',
    description: 'Purple circles are property clusters. Zoom in or click them to see individual listings. The map syncs with your filters.',
    position: 'bottom' as const,
  },
  {
    id: 2,
    selector: '[data-tour="zip-search"], [data-tour="locate-button"], [data-tour="address-search"]',
    title: 'Search & Location',
    description: 'Search by ZIP code, city, or address. Use the location button to find properties near you.',
    position: 'bottom' as const,
  },
  {
    id: 3,
    selector: '[data-tour="quick-filters"], [data-tour="theme-toggle"]',
    title: 'Quick Filters',
    description: 'Filter by beds, baths, and price range. Toggle dark mode for comfortable browsing.',
    position: 'bottom' as const,
  },
  {
    id: 4,
    selector: '[data-tour="filters-button"]',
    title: 'Advanced Filters',
    description: 'Open advanced filters for property type, condition, down payment range, and more.',
    position: 'bottom' as const,
    action: 'openFilters' as const,
  },
  {
    id: 5,
    selector: '[data-tour="filters-panel"]',
    title: 'Filter Panel',
    description: 'Fine-tune your search with property type, condition, and down payment filters. Changes update the map instantly.',
    position: 'left' as const,
    requiresFiltersOpen: true,
  },
  {
    id: 6,
    selector: '[data-tour="card-pricing"], [data-tour="card-specs"], [data-tour="card-location"]',
    title: 'Property Cards',
    description: 'Each card shows price, down payment, beds, baths, square footage, and location. Click any card for full details.',
    position: 'right' as const,
  },
  {
    id: 7,
    selector: '[data-tour="card-save"], [data-tour="property-actions"]',
    title: 'Save & Take Action',
    description: 'Heart icon saves properties for later. Use "Move" to center the map or "See More" to view details and make an offer.',
    position: 'left' as const,
  },
];

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function MapCoachMarks({
  mapLoaded,
  className,
  onOpenFilters,
  onCloseFilters,
}: MapCoachMarksProps) {
  const [tourDismissed, setTourDismissed] = useState<boolean>(() => {
    return localStorage.getItem(TOUR_DISMISSED_KEY) === 'true';
  });
  const [showFirstTimeTooltip, setShowFirstTimeTooltip] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Show first-time tooltip after map loads
  useEffect(() => {
    if (mapLoaded && !tourDismissed) {
      const timer = setTimeout(() => {
        setShowFirstTimeTooltip(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [mapLoaded, tourDismissed]);

  // Update highlight position when step changes
  const updateHighlight = useCallback(() => {
    if (!tourActive || currentStep === 0) {
      setHighlightRect(null);
      return;
    }

    const step = TOUR_STEPS[currentStep - 1];
    if (!step) return;

    // Handle multiple selectors (e.g., ZIP + locate button)
    const selectors = step.selector.split(', ');
    const elements = selectors
      .map(sel => document.querySelector(sel))
      .filter(Boolean) as HTMLElement[];

    if (elements.length === 0) {
      // Element not found, skip this step or try again
      if (step.requiresFiltersOpen) {
        // Wait for filters panel to open
        updateTimeoutRef.current = setTimeout(updateHighlight, 100);
      }
      return;
    }

    // Calculate bounding box that encompasses all elements
    const rects = elements.map(el => el.getBoundingClientRect());
    const combinedRect = {
      top: Math.min(...rects.map(r => r.top)) - 8,
      left: Math.min(...rects.map(r => r.left)) - 8,
      right: Math.max(...rects.map(r => r.right)) + 8,
      bottom: Math.max(...rects.map(r => r.bottom)) + 8,
    };

    const rect: HighlightRect = {
      top: combinedRect.top,
      left: combinedRect.left,
      width: combinedRect.right - combinedRect.left,
      height: combinedRect.bottom - combinedRect.top,
    };

    setHighlightRect(rect);

    // Position tooltip
    const padding = 16;
    let tooltipTop = 0;
    let tooltipLeft = 0;

    switch (step.position) {
      case 'bottom':
        tooltipTop = combinedRect.bottom + padding;
        tooltipLeft = combinedRect.left + (combinedRect.right - combinedRect.left) / 2;
        break;
      case 'left':
        tooltipTop = combinedRect.top + (combinedRect.bottom - combinedRect.top) / 2;
        tooltipLeft = combinedRect.left - padding;
        break;
      default:
        tooltipTop = combinedRect.bottom + padding;
        tooltipLeft = combinedRect.left;
    }

    // Keep tooltip in viewport
    tooltipLeft = Math.max(20, Math.min(tooltipLeft, window.innerWidth - 340));
    tooltipTop = Math.max(20, Math.min(tooltipTop, window.innerHeight - 200));

    setTooltipPosition({ top: tooltipTop, left: tooltipLeft });
  }, [tourActive, currentStep]);

  // Update on step change and window resize
  useEffect(() => {
    updateHighlight();

    const handleResize = () => updateHighlight();
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [updateHighlight]);

  // Start tour
  const startTour = useCallback(() => {
    setShowFirstTimeTooltip(false);
    setTourActive(true);
    setCurrentStep(1);
  }, []);

  // Dismiss first-time tooltip
  const dismissFirstTime = useCallback(() => {
    setShowFirstTimeTooltip(false);
    setTourDismissed(true);
    localStorage.setItem(TOUR_DISMISSED_KEY, 'true');
  }, []);

  // Navigate steps
  const nextStep = useCallback(() => {
    const nextStepIndex = currentStep + 1;
    const currentStepData = TOUR_STEPS[currentStep - 1];

    if (nextStepIndex > TOUR_STEPS.length) {
      // Tour complete
      setTourActive(false);
      setCurrentStep(0);
      setHighlightRect(null);
      setTourDismissed(true);
      localStorage.setItem(TOUR_DISMISSED_KEY, 'true');
      // Close filters if they were open
      if (currentStepData?.requiresFiltersOpen) {
        onCloseFilters?.();
      }
      return;
    }

    const nextStepData = TOUR_STEPS[nextStepIndex - 1];

    // Close filters when moving away from filters panel step
    if (currentStepData?.requiresFiltersOpen && !nextStepData?.requiresFiltersOpen) {
      onCloseFilters?.();
    }

    // Handle special actions
    if (nextStepData?.action === 'openFilters') {
      onOpenFilters?.();
    }

    if (nextStepData?.requiresFiltersOpen) {
      onOpenFilters?.();
      // Give time for popover to open
      setTimeout(() => {
        setCurrentStep(nextStepIndex);
      }, 150);
    } else {
      setCurrentStep(nextStepIndex);
    }
  }, [currentStep, onOpenFilters, onCloseFilters]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  // Exit tour
  const exitTour = useCallback(() => {
    setTourActive(false);
    setCurrentStep(0);
    setHighlightRect(null);
    setTourDismissed(true);
    localStorage.setItem(TOUR_DISMISSED_KEY, 'true');
    // Close filters if they were open
    onCloseFilters?.();
  }, [onCloseFilters]);

  // Trigger tour (for re-runs)
  const triggerTour = useCallback(() => {
    setTourActive(true);
    setCurrentStep(1);
  }, []);

  if (!mapLoaded) return null;

  const stepData = currentStep > 0 ? TOUR_STEPS[currentStep - 1] : null;

  return (
    <>
      {/* Tour Entry Button */}
      <div className={cn("absolute z-30", className || "top-4 left-4")}>
        <div className="relative">
          <button
            onClick={tourDismissed ? triggerTour : startTour}
            className={cn(
              "flex items-center gap-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border transition-all duration-300",
              "hover:shadow-xl hover:scale-105",
              !tourDismissed && showFirstTimeTooltip
                ? "border-indigo-400 ring-2 ring-indigo-400/50 animate-pulse"
                : "border-gray-200 dark:border-gray-700 hover:border-indigo-400"
            )}
            aria-label="Take a tour of this page"
          >
            <HelpCircle className={cn(
              "h-4 w-4 transition-colors",
              !tourDismissed && showFirstTimeTooltip ? "text-indigo-500" : "text-indigo-600"
            )} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {tourDismissed ? "Page tour" : "How this works"}
            </span>
          </button>

          {/* First-time Tooltip */}
          {!tourDismissed && showFirstTimeTooltip && (
            <div className="absolute top-full left-0 mt-2 z-50 animate-fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-indigo-300 dark:border-indigo-600 p-4 w-72">
                <div className="absolute -top-2 left-6 w-4 h-4 bg-white dark:bg-gray-800 border-l border-t border-indigo-300 dark:border-indigo-600 transform rotate-45" />
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                      New here?
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                      Take a quick tour to learn how listings and the map work together.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-7"
                        onClick={startTour}
                      >
                        Start Tour
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7"
                        onClick={dismissFirstTime}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                  <button
                    onClick={dismissFirstTime}
                    className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors flex-shrink-0"
                    aria-label="Dismiss"
                  >
                    <X className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tour Overlay with Spotlight */}
      {tourActive && highlightRect && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          {/* SVG overlay with cutout */}
          <svg className="absolute inset-0 w-full h-full">
            <defs>
              <mask id="spotlight-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                <rect
                  x={highlightRect.left}
                  y={highlightRect.top}
                  width={highlightRect.width}
                  height={highlightRect.height}
                  rx="8"
                  fill="black"
                />
              </mask>
            </defs>
            {/* Dimmed background */}
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.6)"
              mask="url(#spotlight-mask)"
            />
          </svg>

          {/* Purple glow border around highlighted element */}
          <div
            className="absolute rounded-lg pointer-events-none"
            style={{
              top: highlightRect.top,
              left: highlightRect.left,
              width: highlightRect.width,
              height: highlightRect.height,
              boxShadow: '0 0 0 3px rgba(79, 70, 229, 0.7), 0 0 20px rgba(79, 70, 229, 0.5)',
              transition: 'all 0.3s ease-out',
            }}
          />

          {/* Tooltip Card */}
          {stepData && (
            <div
              className="absolute pointer-events-auto animate-fade-in"
              style={{
                top: tooltipPosition.top,
                left: tooltipPosition.left,
                transform: stepData.position === 'left' ? 'translateX(-100%) translateY(-50%)' : 'translateX(-50%)',
                maxWidth: '320px',
              }}
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-2 border-indigo-500 p-4">
                {/* Step indicator */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {currentStep}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      of {TOUR_STEPS.length}
                    </span>
                  </div>
                  <button
                    onClick={exitTour}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    aria-label="Exit tour"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                </div>

                {/* Content */}
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {stepData.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  {stepData.description}
                </p>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {TOUR_STEPS.map((_, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "w-1.5 h-1.5 rounded-full transition-colors",
                          currentStep > idx ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-600"
                        )}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {currentStep > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={prevStep}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7"
                      onClick={exitTour}
                    >
                      Skip
                    </Button>
                    <Button
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-7"
                      onClick={nextStep}
                    >
                      {currentStep >= TOUR_STEPS.length ? 'Done' : 'Next'}
                      {currentStep < TOUR_STEPS.length && <ChevronRight className="h-3 w-3 ml-1" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
