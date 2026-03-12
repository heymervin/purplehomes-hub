import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Bed, Bath, Maximize2, Phone, Wrench, Home,
  Loader2, Share2, Check,
  Shield, Clock, Users, Award, CheckCircle, X,
  MessageCircle, FileText, Calendar, Key
} from 'lucide-react';
import type { PropertyCondition, PropertyType, Property } from '@/types';
import type { FunnelContent } from '@/types/funnel';
import { DEFAULT_FUNNEL_INPUTS } from '@/types/funnel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { PropertyImageGallery } from '@/components/properties/PropertyImageGallery';
import { useCreateContact } from '@/services/ghlApi';
import { useAirtableProperties } from '@/services/matchingApi';
import { generatePropertySlug } from '@/lib/utils/slug';
import { useFunnelAnalytics } from '@/hooks/useFunnelAnalytics';
import { useExitIntent } from '@/hooks/useExitIntent';
import { ExitIntentModal } from '@/components/listings/ExitIntentModal';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelectionModal } from '@/components/LanguageSelectionModal';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

// Import Funnel Components
import {
  CTAButton,
  TrustIndicators,
  TestimonialMarquee,
  FunnelFAQ,
  FAQCTA,
  PremiumTrustStrip,
} from '@/components/funnel';
import { FeaturedTestimonial } from '@/components/funnel/TestimonialCard';
import type { Testimonial } from '@/types/funnel';

// Scroll Reveal Animation Hook
function useScrollReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Only animate once
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

// Reveal wrapper component for cleaner usage
// Disabled on mobile for snappier scrolling
const isMobileDevice = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

function Reveal({
  children,
  delay = 0,
  className = ''
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, isVisible } = useScrollReveal(0.1);

  if (isMobileDevice) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${className}`}
      style={{
        transitionDelay: `${delay}ms`,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
      }}
    >
      {children}
    </div>
  );
}

// Entrance animation for hero (triggers on page load, not scroll)
function HeroEntrance({
  children,
  delay = 0,
  className = ''
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Small delay to ensure CSS transition is ready
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`transition-all duration-1000 ease-out ${className}`}
      style={{
        transitionDelay: `${delay}ms`,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
      }}
    >
      {children}
    </div>
  );
}

// ============ GRADIENT TEXT UTILITIES ============
// Data-driven highlight system for funnel pages
// USE THESE for consistent gradient styling across all properties
//
// STRUCTURE:
// | Section  | Data Source              | Style           |
// |----------|--------------------------|-----------------|
// | Hero     | property.monthlyPayment  | GradientPrice   |
// | Pricing  | property.downPayment     | GradientMoney   |
// | Pricing  | property.monthlyPayment  | GradientPrice   |
// | Solution | Brand constant (580)     | GradientNumber  |
//
/// DO NOT use for: AI-generated text, body copy, or random words


function GradientNumber({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`bg-gradient-to-b from-white via-indigo-200 to-indigo-400/50 bg-clip-text text-transparent ${className}`}>
      {children}
    </span>
  );
}

// Live Countdown Timer Component
function UrgencyCountdown({
  mode = 'per-visitor',
  hoursFromNow = 48,
  deadline = null
}: {
  mode?: 'per-visitor' | 'global';
  hoursFromNow?: number;
  deadline?: string | null;
}) {
  const { t } = useLanguage();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    let target: number;

    if (mode === 'global' && deadline) {
      // Global mode: everyone counts down to the same deadline
      target = new Date(deadline).getTime();
    } else {
      // Per-visitor mode: each visitor gets their own timer (stored in sessionStorage)
      const storageKey = `urgency_countdown_target_${hoursFromNow}h`;
      const durationKey = 'urgency_countdown_duration';

      // If duration changed, clear old timer
      const storedDuration = sessionStorage.getItem(durationKey);
      if (storedDuration && parseInt(storedDuration, 10) !== hoursFromNow) {
        sessionStorage.removeItem(`urgency_countdown_target_${storedDuration}h`);
      }
      sessionStorage.setItem(durationKey, hoursFromNow.toString());

      let targetTime = sessionStorage.getItem(storageKey);

      if (!targetTime) {
        const targetDate = new Date();
        targetDate.setHours(targetDate.getHours() + hoursFromNow);
        targetTime = targetDate.getTime().toString();
        sessionStorage.setItem(storageKey, targetTime);
      }

      target = parseInt(targetTime, 10);
    }

    const calculateTimeLeft = () => {
      const now = Date.now();
      const distance = target - now;

      if (distance <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [mode, hoursFromNow, deadline]);

  const units = [
    { value: timeLeft.days, label: t('countdown.days') },
    { value: timeLeft.hours, label: t('countdown.hours') },
    { value: timeLeft.minutes, label: t('countdown.minutes') },
    { value: timeLeft.seconds, label: t('countdown.seconds') },
  ];

  return (
    <div className="flex justify-center gap-3 md:gap-5 mb-12">
      {units.map((unit, index) => (
        <div key={index} className="text-center">
          <div className="relative">
            {/* Glow behind */}
            <div className="absolute pointer-events-none inset-0 bg-gradient-to-b from-indigo-500/30 to-violet-500/30 rounded-2xl blur-xl scale-110" />
            <div className="relative bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-2xl px-4 md:px-6 py-4 md:py-6 border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
              <div className="text-4xl md:text-6xl font-black text-white tabular-nums">
                {String(unit.value).padStart(2, '0')}
              </div>
            </div>
          </div>
          <div className="text-xs md:text-sm uppercase tracking-wider text-gray-500 mt-3 font-semibold">
            {unit.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// Animated Stats Section Component
function AnimatedStatsSection() {
  const { t } = useLanguage();
  const sectionRef = useRef<HTMLElement>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [counts, setCounts] = useState([0, 0, 0, 0]);

  const statsConfig = [
    { target: 500, duration: 2500, labelTop: t('stats.families'), labelBottom: t('stats.helped'), suffix: '+', icon: Users },
    { target: 15, duration: 2000, labelTop: t('stats.years'), labelBottom: t('stats.experience'), suffix: '+', icon: Clock },
    { target: 98, duration: 2200, labelTop: t('stats.satisfaction'), labelBottom: t('stats.rate'), suffix: '%', icon: Award },
    { target: 24, duration: 1800, labelTop: t('stats.hour'), labelBottom: t('stats.response'), prefix: '<', icon: Shield },
  ];

  // Watch for section visibility
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [hasStarted]);

  // Animate all counters when triggered
  useEffect(() => {
    if (!hasStarted) return;

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const newCounts = statsConfig.map((stat) => {
        const progress = Math.min(elapsed / stat.duration, 1);
        // Ease out cubic for smooth deceleration
        const eased = 1 - Math.pow(1 - progress, 3);
        return Math.floor(eased * stat.target);
      });
      setCounts(newCounts);

      // Continue if any animation is still running
      const maxDuration = Math.max(...statsConfig.map(s => s.duration));
      if (elapsed < maxDuration) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [hasStarted]);

  return (
    <section ref={sectionRef} className="relative py-20 md:py-28">
      {/* Ambient lighting - top glow receives bleed from testimonials */}
      <div className="absolute pointer-events-none top-[-25%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-indigo-600/20 rounded-full blur-[200px]" />
      <div className="absolute pointer-events-none top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[200px]" />
      <div className="absolute pointer-events-none top-1/2 right-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/15 rounded-full blur-[200px]" />
      {/* Bottom glows bleed strongly into Neighborhood section */}
      <div className="absolute pointer-events-none bottom-[-40%] left-1/2 -translate-x-1/2 w-[1000px] h-[700px] bg-indigo-600/22 rounded-full blur-[220px]" />
      <div className="absolute pointer-events-none bottom-[-25%] right-1/3 w-[500px] h-[400px] bg-violet-500/15 rounded-full blur-[180px]" />


      <div className="relative z-10 max-w-6xl mx-auto px-4">
        {/* Section header - Enhanced Typography with Reveal */}
        <Reveal className="text-center mb-20">
          <h2 className="text-3xl md:text-4xl text-white leading-tight">
            <span className="font-light">{t('stats.numbersThat')}</span>{' '}
            <span className="font-bold italic bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent pr-1">
              {t('stats.speak')}
            </span>
          </h2>
          <p className="text-gray-500 text-lg mt-4 font-light tracking-wide">{t('stats.forThemselves')}</p>
        </Reveal>

        {/* Stats grid - Premium Typography with Staggered Reveal */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
          {statsConfig.map((stat, index) => {
            const Icon = stat.icon;
            const count = counts[index];
            return (
              <Reveal
                key={index}
                delay={index * 150}
                className="text-center relative group"
              >
                {/* Divider between items (desktop) */}
                {index < statsConfig.length - 1 && (
                  <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 h-32 w-px bg-gradient-to-b from-transparent via-indigo-500/40 to-transparent" />
                )}

                {/* Icon with glow */}
                <div className="relative inline-block mb-6">
                  <div className="absolute pointer-events-none inset-0 bg-indigo-500/30 rounded-2xl blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border border-indigo-500/30 group-hover:scale-110 group-hover:border-indigo-400/50 transition-all duration-300">
                    <Icon className="h-8 w-8 text-indigo-400" />
                  </div>
                </div>

                {/* Animated number - Dramatic Typography */}
                <div className="relative mb-4">
                  {/* Number glow */}
                  <div className="absolute pointer-events-none inset-0 bg-gradient-to-b from-indigo-400/20 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative flex items-baseline justify-center">
                    {/* Prefix */}
                    {stat.prefix && (
                      <span className="text-3xl md:text-4xl font-light text-indigo-400/70 mr-1">
                        {stat.prefix}
                      </span>
                    )}

                    {/* Main number - BOLD */}
                    <span className="text-6xl md:text-7xl lg:text-8xl font-black bg-gradient-to-b from-white via-white to-white/70 bg-clip-text text-transparent tabular-nums tracking-tight">
                      {count}
                    </span>

                    {/* Suffix - smaller, superscript style */}
                    {stat.suffix && (
                      <span className="text-2xl md:text-3xl font-bold text-indigo-400 ml-1 -translate-y-4">
                        {stat.suffix}
                      </span>
                    )}
                  </div>
                </div>

                {/* Label - Split with Typography Contrast */}
                <div className="space-y-0.5">
                  <div className="text-sm md:text-base font-bold uppercase tracking-[0.15em] text-white/90">
                    {stat.labelTop}
                  </div>
                  <div className="text-xs md:text-sm font-light italic tracking-wide text-indigo-400/80">
                    {stat.labelBottom}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Virtual Tour Section with GHL-style click-to-play overlay
function VirtualTourSection({ virtualTourUrl, scrollToForm, onVideoPlay }: { virtualTourUrl: string; scrollToForm: () => void; onVideoPlay?: () => void }) {
  const { t } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);

  // Extract YouTube video ID for thumbnail
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/);
    return match ? match[1] : null;
  };

  // Extract Vimeo video ID
  const getVimeoId = (url: string) => {
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return match ? match[1] : null;
  };

  const youtubeId = getYouTubeId(virtualTourUrl);
  const vimeoId = getVimeoId(virtualTourUrl);

  // Get thumbnail URL
  const thumbnailUrl = youtubeId
    ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`
    : vimeoId
    ? `https://vumbnail.com/${vimeoId}.jpg`
    : '/placeholder.svg';

  // Get embed URL with autoplay
  const getEmbedUrl = () => {
    if (youtubeId) {
      return `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`;
    }
    if (vimeoId) {
      return `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;
    }
    return virtualTourUrl;
  };

  const handlePlay = () => {
    onVideoPlay?.();  // Track video play for analytics
    setIsPlaying(true);
  };

  return (
    <section className="relative py-16 md:py-20">
      {/* Ambient glows - receives bleed from above, bleeds to next section */}
      <div className="absolute pointer-events-none top-[-25%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-indigo-600/20 rounded-full blur-[200px]" />
      <div className="absolute pointer-events-none top-[30%] left-0 w-[500px] h-[400px] bg-violet-500/15 rounded-full blur-[180px]" />
      <div className="absolute pointer-events-none top-[40%] right-0 w-[450px] h-[350px] bg-indigo-400/12 rounded-full blur-[150px]" />
      <div className="absolute pointer-events-none bottom-[-30%] left-1/3 w-[700px] h-[500px] bg-indigo-500/18 rounded-full blur-[200px]" />

      <div className="relative z-10 max-w-5xl mx-auto px-4">
        {/* Header */}
        <Reveal className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl text-white mb-3">
            <span className="font-light">{t('virtualTour.headline')}</span>{' '}
            <span className="font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">{t('virtualTour.headlineHighlight')}</span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            {t('virtualTour.description')}
          </p>
        </Reveal>

        {/* Video with GHL-style click-to-play overlay */}
        <Reveal delay={150}>
          <div className="relative group">
            {/* Outer glow */}
            <div className="absolute pointer-events-none -inset-2 bg-gradient-to-r from-indigo-600/30 via-violet-500/30 to-indigo-600/30 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

            {/* Video container */}
            <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-indigo-500/30 shadow-2xl">
              {!isPlaying ? (
                /* Thumbnail with play button overlay */
                <div
                  className="absolute inset-0 cursor-pointer group/play"
                  onClick={handlePlay}
                >
                  {/* Thumbnail image */}
                  <img
                    src={thumbnailUrl}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to medium quality for YouTube if maxres fails
                      if (youtubeId && (e.target as HTMLImageElement).src.includes('maxresdefault')) {
                        (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
                      }
                    }}
                  />

                  {/* Dark gradient overlay */}
                  <div className="absolute pointer-events-none inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/40" />

                  {/* Large centered play button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      {/* Pulsing ring behind play button */}
                      <div className="absolute pointer-events-none inset-0 w-24 h-24 md:w-32 md:h-32 bg-indigo-500/30 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                      <div className="absolute pointer-events-none inset-0 w-24 h-24 md:w-32 md:h-32 bg-indigo-500/20 rounded-full animate-pulse" />

                      {/* Play button */}
                      <div className="relative w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(99,102,241,0.5)] group-hover/play:shadow-[0_0_80px_rgba(99,102,241,0.7)] group-hover/play:scale-110 transition-all duration-300">
                        <svg className="w-10 h-10 md:w-14 md:h-14 text-white ml-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Click to watch text */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2">
                      <svg className="w-4 h-4 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.414a5 5 0 001.414 1.414m2.828-9.9a9 9 0 0112.728 0" />
                      </svg>
                      <span className="text-white text-sm font-medium">{t('virtualTour.clickToWatch')}</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Actual video iframe after clicking */
                <iframe
                  src={getEmbedUrl()}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Property Virtual Tour"
                />
              )}
            </div>
          </div>
        </Reveal>

        {/* CTA below video */}
        <Reveal delay={200} className="text-center mt-8">
          <p className="text-indigo-300/70 text-sm mb-4">{t('virtualTour.likeWhatYouSee')}</p>
          <button
            onClick={scrollToForm}
            className="inline-flex items-center gap-2 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-white font-semibold px-6 py-3 rounded-xl transition-all"
          >
            {t('cta.scheduleInPersonTour')}
            <span>&rarr;</span>
          </button>
        </Reveal>
      </div>
    </section>
  );
}

export default function PublicPropertyDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t, language, setLanguage } = useLanguage();

  // Fetch all properties and find the one matching the slug
  const { data: airtableData, isLoading, isError } = useAirtableProperties(200);

  // Find property by matching generated slug
  const property = useMemo(() => {
    if (!airtableData?.properties || !slug) return null;

    for (const p of airtableData.properties) {
      const city = `${p.city || ''}${p.state ? `, ${p.state}` : ''}${p.zipCode ? ` ${p.zipCode}` : ''}`;
      const propertySlug = generatePropertySlug(p.address, city);
      // Fallback: also try just address + city (without state/zip) for older SMS links
      const cityOnlySlug = generatePropertySlug(p.address, p.city || '');
      if (propertySlug === slug || cityOnlySlug === slug) {
        // Transform to Property type
        const transformed: Property = {
          id: p.recordId,
          ghlOpportunityId: p.opportunityId,
          propertyCode: p.propertyCode,
          address: p.address,
          city,
          price: p.price || 0,
          beds: p.beds || 0,
          baths: p.baths || 0,
          sqft: p.sqft,
          lat: p.propertyLat,
          lng: p.propertyLng,
          propertyType: p.propertyType as PropertyType | undefined,
          condition: p.condition as PropertyCondition | undefined,
          heroImage: p.heroImage || '/placeholder.svg',
          images: p.images && p.images.length > 0 ? p.images : (p.heroImage ? [p.heroImage] : ['/placeholder.svg']),
          status: 'pending',
          description: p.notes,
          monthlyPayment: p.monthlyPayment,
          downPayment: p.downPayment,
          createdAt: p.createdAt || new Date().toISOString(),
        };
        return transformed;
      }
    }
    return null;
  }, [airtableData, slug]);

  // Funnel content state
  const [funnelContent, setFunnelContent] = useState<FunnelContent | null>(null);
  const [funnelLoading, setFunnelLoading] = useState(false);

  // Resolve funnel fields to the correct language (Spanish when available, else English)
  const localizedFunnel = useMemo(() => {
    if (!funnelContent) return null;
    const useEs = language === 'es' && funnelContent.es;
    return {
      hook: useEs ? funnelContent.es!.hook : funnelContent.hook,
      problem: useEs ? funnelContent.es!.problem : funnelContent.problem,
      solution: useEs ? funnelContent.es!.solution : funnelContent.solution,
      // propertyShowcase is now a hardcoded translated string, not from funnel content
      callToAction: useEs ? funnelContent.es!.callToAction : funnelContent.callToAction,
      qualifier: useEs && funnelContent.es!.qualifier ? funnelContent.es!.qualifier : funnelContent.qualifier,
      faq: useEs && funnelContent.es!.faq ? funnelContent.es!.faq : funnelContent.faq,
      testimonials: useEs && funnelContent.es!.testimonials?.length ? funnelContent.es!.testimonials : funnelContent.testimonials,
      // Non-translatable fields pass through
      locationNearby: funnelContent.locationNearby,
      pricingOptions: funnelContent.pricingOptions,
      virtualTourUrl: funnelContent.virtualTourUrl,
      inputs: funnelContent.inputs,
      socialProof: funnelContent.socialProof,
    };
  }, [funnelContent, language]);

  // Global testimonials (from Settings)
  const [globalTestimonials, setGlobalTestimonials] = useState<Testimonial[]>([]);

  // Company info (from Settings)
  const [companyPhone, setCompanyPhone] = useState('(504) 475-0672'); // fallback default
  const [testimonialSpeed, setTestimonialSpeed] = useState(25); // fallback default
  const [countdownHours, setCountdownHours] = useState(48); // fallback default
  const [countdownMode, setCountdownMode] = useState<'per-visitor' | 'global'>('per-visitor');
  const [countdownDeadline, setCountdownDeadline] = useState<string | null>(null);

  // Form state
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [hasSubmittedOffer, setHasSubmittedOffer] = useState(false);
  const [offerForm, setOfferForm] = useState({
    firstName: '',
    email: '',
    phone: '',
    question: '',
  });
  const [copied, setCopied] = useState(false);

  // Funnel analytics tracking
  const analytics = useFunnelAnalytics({
    propertyId: property?.id || '',
    propertySlug: slug || '',
    avatarResearchId: funnelContent?.avatarResearchId,
    buyerSegment: funnelContent?.inputs?.buyerSegment,
  });

  // Fetch funnel content when property is available (need recordId for Airtable lookup)
  // Auto-generates on the fly if no content exists yet
  useEffect(() => {
    if (!slug || !property?.id) return;

    const fetchFunnelContent = async () => {
      setFunnelLoading(true);
      try {
        // Pass recordId to fetch from Airtable (required on Vercel where filesystem is read-only)
        const response = await fetch(`/api/funnel?action=get&slug=${encodeURIComponent(slug)}&recordId=${encodeURIComponent(property.id)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.content) {
            setFunnelContent(data.content);
            return;
          }
        }

        // No funnel content found — auto-generate it
        // Parse city into components (city field contains "City, ST ZIP")
        const cityParts = property.city.split(',').map((s: string) => s.trim());
        const city = cityParts[0] || '';
        const stateZip = cityParts[1]?.split(' ') || [];
        const state = stateZip[0] || '';
        const zipCode = stateZip[1] || '';

        const generateResponse = await fetch('/api/funnel?action=generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: property.address,
            city,
            state,
            zipCode,
            price: property.price,
            downPayment: property.downPayment,
            monthlyPayment: property.monthlyPayment,
            beds: property.beds,
            baths: property.baths,
            sqft: property.sqft,
            propertyType: property.propertyType,
            condition: property.condition,
            description: property.description,
            inputs: DEFAULT_FUNNEL_INPUTS,
            recordId: property.id,
          }),
        });

        if (generateResponse.ok) {
          const genData = await generateResponse.json();
          if (genData.success && genData.content) {
            setFunnelContent(genData.content);
          }
        }
      } catch (error) {
        console.error('Error fetching/generating funnel content:', error);
      } finally {
        setFunnelLoading(false);
      }
    };

    fetchFunnelContent();
  }, [slug, property?.id]);

  // Fetch global testimonials and company info (from Settings)
  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const response = await fetch('/api/testimonials');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.testimonials) {
            setGlobalTestimonials(data.testimonials);
          }
        }
      } catch (error) {
        console.error('Error fetching testimonials:', error);
      }
    };

    const fetchCompanyInfo = async () => {
      try {
        const response = await fetch('/api/company-info');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            if (data.phone) setCompanyPhone(data.phone);
            if (data.testimonialSpeed) setTestimonialSpeed(data.testimonialSpeed);
            if (data.countdownHours) setCountdownHours(data.countdownHours);
            if (data.countdownMode) setCountdownMode(data.countdownMode);
            if (data.countdownDeadline) setCountdownDeadline(data.countdownDeadline);
          }
        }
      } catch (error) {
        console.error('Error fetching company info:', error);
      }
    };

    fetchTestimonials();
    fetchCompanyInfo();
  }, []);

  const createContact = useCreateContact();

  // Exit intent popup
  const { showExitIntent, dismiss: dismissExitIntent, markConverted: markExitConverted } = useExitIntent({
    delayMs: 10000,
    sessionKey: 'ph-property-exit-intent',
    disabled: hasSubmittedOffer || isFormModalOpen,
  });

  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;

    try {
      // Create contact directly via Contact API (more reliable than Form API)
      await createContact.mutateAsync({
        firstName: offerForm.firstName,
        email: offerForm.email || undefined,
        phone: offerForm.phone,
        tags: ['propertypro', 'lead-funnel'],
        customFields: [
          // Property Address interested in
          { id: 'UcJ0Qoz3kh0OjC9oLVsK', value: property.address },
          // Property City
          { id: 'JiQiZk4AwSIuggxs8ryC', value: property.city },
          // Notes/Question
          { id: '5EfOYalxVtyl95FKnEXz', value: offerForm.question || `Interested in ${property.address} - $${property.price.toLocaleString()}` },
        ],
      });

      // Track form submission for analytics (high-value conversion event)
      analytics.trackFormSubmission();

      toast.success(t('form.applicationSubmitted'));
      setOfferForm({ firstName: '', email: '', phone: '', question: '' });
      setShowOfferForm(false);
      setHasSubmittedOffer(true);
    } catch (error) {
      console.error('Contact creation error:', error);
      toast.error(t('form.failedToSubmit'));
    }
  };

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: property ? `${property.address} - $${property.price.toLocaleString()}` : 'Property Listing',
          url,
        });
      } catch (err) {
        copyToClipboard(url);
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(t('common.linkCopied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const scrollToForm = () => {
    // Track CTA click for analytics
    analytics.trackCtaClick('modal');
    // Open modal instead of scrolling - users can apply from anywhere
    setIsFormModalOpen(true);
    setShowOfferForm(true);
  };

  // Extract problem headline - supports structured { headline, body } or legacy string
  const extractProblemHeadline = (problem: string | { headline: string; body: string }): string => {
    if (typeof problem === 'object' && problem.headline) {
      return problem.headline;
    }
    // Legacy string: extract first sentence (ends with ? or . or !)
    const text = String(problem);
    const firstSentence = text.match(/^[^.?!]+[.?!]/)?.[0] || text.split('.')[0];
    return firstSentence.trim();
  };

  // Extract problem body - supports structured { headline, body } or legacy string
  const extractProblemBody = (problem: string | { headline: string; body: string }): string => {
    if (typeof problem === 'object' && problem.body) {
      return problem.body;
    }
    // Legacy string: remove headline from the beginning
    const text = String(problem);
    const headline = extractProblemHeadline(text);
    return text.slice(headline.length).trim();
  };

  // Strip any underline markers and broken unicode from text
  const stripMarkers = (text: string): string => {
    return text
      // Remove literal \u\...\u\ markers
      .replace(/\\u\\([^\\]+)\\u\\/g, '$1')
      // Remove any control characters / unrenderable unicode (the "NO GLYPH" boxes)
      .replace(/[\x00-\x1F\x7F-\x9F\uFFFD]/g, '')
      // Clean up any double spaces left behind
      .replace(/\s{2,}/g, ' ')
      .trim();
  };

  // Get buyer-segment-specific pain points
  const getPainPoints = (segment?: string): { icon: string; text: string }[] => {
    const painPointsBySegment: Record<string, { icon: string; text: string }[]> = {
      'first-time-buyer': [
        { icon: '✗', text: t('painPoints.firstTimeBuyer1') },
        { icon: '✗', text: t('painPoints.firstTimeBuyer2') },
        { icon: '✗', text: t('painPoints.firstTimeBuyer3') },
      ],
      'credit-challenged': [
        { icon: '✗', text: t('painPoints.creditChallenged1') },
        { icon: '✗', text: t('painPoints.creditChallenged2') },
        { icon: '✗', text: t('painPoints.creditChallenged3') },
      ],
      'self-employed': [
        { icon: '✗', text: t('painPoints.selfEmployed1') },
        { icon: '✗', text: t('painPoints.selfEmployed2') },
        { icon: '✗', text: t('painPoints.selfEmployed3') },
      ],
      'investor': [
        { icon: '✗', text: t('painPoints.investor1') },
        { icon: '✗', text: t('painPoints.investor2') },
        { icon: '✗', text: t('painPoints.investor3') },
      ],
      'move-up-buyer': [
        { icon: '✗', text: t('painPoints.moveUpBuyer1') },
        { icon: '✗', text: t('painPoints.moveUpBuyer2') },
        { icon: '✗', text: t('painPoints.moveUpBuyer3') },
      ],
      'general': [
        { icon: '✗', text: t('painPoints.general1') },
        { icon: '✗', text: t('painPoints.general2') },
        { icon: '✗', text: t('painPoints.general3') },
      ],
    };
    return painPointsBySegment[segment || 'general'] || painPointsBySegment['general'];
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mx-auto" />
          <p className="text-sm font-medium text-gray-600">{t('common.loadingProperty')}</p>
        </div>
      </div>
    );
  }

  // Not found state
  if (!property || isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4 max-w-md px-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <Home className="h-8 w-8 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('notFound.title')}</h1>
          <p className="text-gray-600">
            {t('notFound.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <CTAButton onClick={() => navigate('/listings')} variant="secondary">
              {t('notFound.browseListings')}
            </CTAButton>
            <Button variant="outline" onClick={() => navigate(-1)}>
              {t('notFound.goBack')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Parse FAQ from funnel content (uses localized version for Spanish)

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <LanguageSelectionModal />
      <LanguageSwitcher />

      {/* Header */}
      <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Link to="/listings" className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent">
              Purple Homes
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Toggle - inline in nav */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
              className="px-3 py-1.5 text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-full transition-colors"
              aria-label={language === 'en' ? 'Cambiar a Español' : 'Switch to English'}
            >
              {language === 'en' ? 'Español' : 'English'}
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="gap-2"
            >
              {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              <span className="hidden sm:inline">{copied ? t('common.copied') : t('common.share')}</span>
            </Button>
            <CTAButton size="sm" onClick={scrollToForm} className="hidden sm:inline-flex">
              {t('cta.seeIfHomeWorks')}
            </CTAButton>
          </div>
        </div>
      </header>

      {/* Main Content - One unified gradient canvas top to bottom */}
      <main className="relative" style={{ background: 'linear-gradient(to bottom, #000000 0%, #04000a 8%, #080015 20%, #0c001e 38%, #0e0028 55%, #0c001e 70%, #080015 85%, #04000a 95%, #000000 100%)' }}>
        {/* Hero Section - centered, image prominent, CTA after photo */}
        <section className="relative overflow-hidden">
          {/* Ambient lighting */}
          <div className="absolute pointer-events-none top-0 left-1/4 w-[600px] h-[400px] bg-indigo-600/20 rounded-full blur-[180px]" />
          <div className="absolute pointer-events-none top-0 right-1/4 w-[400px] h-[300px] bg-violet-700/15 rounded-full blur-[150px]" />

          <div className="relative max-w-3xl mx-auto px-4 pt-8 sm:pt-10 md:pt-12 text-center">
            {/* Headline */}
            <HeroEntrance delay={0}>
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-[1.1] mb-3 tracking-tight text-white">
                {t('hero.headlinePre')}{' '}
                <span className="inline-block bg-indigo-600 px-2 py-0.5 rounded-md italic">
                  {t('hero.headlineHighlight')}
                </span>
              </h1>
            </HeroEntrance>

            {/* Subheadline */}
            <HeroEntrance delay={80}>
              <p className="text-base sm:text-lg font-medium mb-6 leading-relaxed">
                <span className="bg-gradient-to-r from-gray-400 via-indigo-300 to-gray-400 bg-clip-text text-transparent">
                  {t('hero.subheadline')}
                </span>
              </p>
            </HeroEntrance>

            {/* Property Image - prominent, centered */}
            <HeroEntrance delay={150}>
              <div className="relative group max-w-2xl mx-auto mb-6">
                <div className="absolute -inset-2 bg-gradient-to-br from-indigo-500/40 to-violet-500/30 rounded-2xl blur-2xl opacity-50 group-hover:opacity-75 transition-opacity duration-500 pointer-events-none" />
                <div className="relative border-2 border-indigo-500/40 rounded-2xl overflow-hidden shadow-2xl">
                  <PropertyImageGallery
                    images={property.images || [property.heroImage]}
                    heroImage={property.heroImage || '/placeholder.svg'}
                    onHeroChange={() => {}}
                    onImagesChange={() => {}}
                    editable={false}
                  />
                </div>
              </div>
            </HeroEntrance>

            {/* CTA after photo */}
            <HeroEntrance delay={220}>
              <div className="flex flex-col items-center gap-2 py-8 sm:py-10 md:py-12">
                <button
                  onClick={scrollToForm}
                  className="group relative w-full sm:w-auto bg-white hover:bg-indigo-50 text-indigo-900 font-black text-base sm:text-lg uppercase tracking-wide px-8 sm:px-10 py-3.5 sm:py-4 rounded-xl shadow-[0_0_60px_rgba(99,102,241,0.5)] hover:shadow-[0_0_80px_rgba(99,102,241,0.6)] transition-all duration-300 border-2 border-indigo-300/50 hover:scale-105"
                >
                  {t('hero.cta')}
                  <ArrowRight className="inline-block ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <p className="text-xs sm:text-sm text-gray-500">
                  {t('hero.ctaMicro')}
                </p>
              </div>
            </HeroEntrance>
          </div>
        </section>

        {/* Pricing + Trust Section */}
        <section className="relative py-10 md:py-14">
          <div className="absolute pointer-events-none top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/15 rounded-full blur-[180px]" />
          <div className="relative max-w-4xl mx-auto px-4">
            <Reveal>
              <div className="bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-8 shadow-[0_0_40px_rgba(99,102,241,0.1)]">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12">

              {/* Left: Price + Pills + Status */}
              <div className="flex-1 text-center md:text-left">
                {property.monthlyPayment !== undefined && (
                  <Reveal>
                    <div className="mb-3">
                      <span className="text-5xl sm:text-6xl font-black text-white leading-none drop-shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                        ${property.monthlyPayment.toLocaleString()}
                      </span>
                      <span className="text-xl sm:text-2xl text-indigo-300/80 font-bold ml-2">{t('property.monthlyPayment')}</span>
                    </div>
                  </Reveal>
                )}
                {/* Down payment + purchase price + closing costs */}
                <Reveal delay={100}>
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-4">
                    {property.downPayment !== undefined && (
                      <span className="inline-flex items-center px-3 py-1 bg-white/10 border border-indigo-500/30 rounded-full text-indigo-300 text-sm font-semibold">
                        ${property.downPayment.toLocaleString()} {t('property.downPayment')}
                      </span>
                    )}
                    <span className="inline-flex items-center px-3 py-1 bg-white/5 border border-indigo-500/20 rounded-full text-indigo-300/70 text-sm font-medium">
                      ${property.price.toLocaleString()} {t('property.purchasePrice')}
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-300 text-sm font-medium">
                      <Check className="h-3 w-3" />{t('property.includesClosingCosts')}
                    </span>
                  </div>
                </Reveal>
                {/* Availability status */}
                <Reveal delay={150}>
                  {(() => {
                    const status = funnelContent?.inputs?.availabilityStatus || 'Available';
                    const statusStyles: Record<string, { dot: string; text: string; label: string }> = {
                      'Available': { dot: 'bg-green-400', text: 'text-green-400', label: t('property.availableNow') },
                      'Under Review': { dot: 'bg-yellow-400', text: 'text-yellow-400', label: t('property.underReview') },
                      'Multiple Offers': { dot: 'bg-amber-400', text: 'text-amber-400', label: t('property.multipleOffers') },
                      'Pending': { dot: 'bg-red-400', text: 'text-red-400', label: t('property.pending') },
                    };
                    const style = statusStyles[status] || statusStyles['Available'];
                    return (
                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <span className={`w-2 h-2 ${style.dot} rounded-full animate-pulse`} />
                        <span className={`${style.text} text-sm font-medium`}>{style.label}</span>
                      </div>
                    );
                  })()}
                </Reveal>
              </div>

              {/* Right: Beds/Baths/Sqft cards + Address */}
              <Reveal delay={200}>
                <div className="flex-shrink-0">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-white/5 border border-indigo-500/20 rounded-xl p-3 text-center min-w-[72px]">
                      <Bed className="h-5 w-5 text-indigo-300 mx-auto mb-1" />
                      <div className="text-white font-bold text-lg leading-none">{property.beds}</div>
                      <div className="text-gray-400 text-xs mt-1">{t('property.beds')}</div>
                    </div>
                    <div className="bg-white/5 border border-indigo-500/20 rounded-xl p-3 text-center min-w-[72px]">
                      <Bath className="h-5 w-5 text-indigo-300 mx-auto mb-1" />
                      <div className="text-white font-bold text-lg leading-none">{property.baths}</div>
                      <div className="text-gray-400 text-xs mt-1">{t('property.baths')}</div>
                    </div>
                    {property.sqft ? (
                      <div className="bg-white/5 border border-indigo-500/20 rounded-xl p-3 text-center min-w-[72px]">
                        <Maximize2 className="h-5 w-5 text-indigo-300 mx-auto mb-1" />
                        <div className="text-white font-bold text-lg leading-none">{property.sqft.toLocaleString()}</div>
                        <div className="text-gray-400 text-xs mt-1">{t('property.sqft')}</div>
                      </div>
                    ) : (
                      <div className="bg-white/5 border border-indigo-500/20 rounded-xl p-3 text-center min-w-[72px]">
                        <Home className="h-5 w-5 text-indigo-300 mx-auto mb-1" />
                        <div className="text-white font-bold text-sm leading-none mt-1">{t('property.sqft')}</div>
                        <div className="text-gray-400 text-xs mt-1">—</div>
                      </div>
                    )}
                  </div>
                  <p className="text-center text-gray-400 text-sm">{property.address}, {property.city}</p>
                </div>
              </Reveal>

            </div>
            {/* Trust Strip */}
            <PremiumTrustStrip className="mt-6" />
              </div>
            </Reveal>
          </div>
        </section>

        {/* How Buying This Home Works - 2x2 Steps */}
        <section className="relative py-20 md:py-28">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute pointer-events-none top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-indigo-600/22 rounded-full blur-[200px]" />
            <div className="absolute pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-violet-500/18 rounded-full blur-[180px]" />
            <div className="absolute pointer-events-none bottom-[-45%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-indigo-600/20 rounded-full blur-[200px]" />
            <div className="absolute pointer-events-none bottom-[-30%] left-1/3 w-[500px] h-[400px] bg-violet-500/15 rounded-full blur-[150px]" />
          </div>
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
            <Reveal className="text-center mb-12 md:mb-16">
              <span className="inline-block px-4 py-1.5 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 rounded-full text-xs md:text-sm font-bold uppercase tracking-wider mb-4">
                {t('propertyHighlights.sectionLabel')}
              </span>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6 text-white">
                {t('propertyHighlights.sectionHeadingPre')}{' '}
                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent italic">
                  {t('propertyHighlights.sectionHeadingHighlight')}
                </span>
              </h2>
              <p className="text-lg md:text-xl text-gray-400 leading-relaxed max-w-3xl mx-auto text-justify">
                {t('propertyHighlights.showcaseText')}
              </p>
            </Reveal>
            <Reveal delay={150}>
              <div className="grid sm:grid-cols-2 gap-6 md:gap-8 mt-16 mb-12">
                <div className="group bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-indigo-400/20 rounded-2xl p-8 hover:border-indigo-400/50 hover:bg-white/[0.08] transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-indigo-500/30 to-indigo-600/20 rounded-xl flex items-center justify-center border border-indigo-400/30 group-hover:scale-110 transition-transform">
                      <MessageCircle className="h-7 w-7 text-indigo-300" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-3">{t('propertyHighlights.step1Title')}</h3>
                      <p className="text-gray-400 leading-relaxed mb-2 text-justify">{t('propertyHighlights.step1Desc')}</p>
                      <p className="text-sm text-indigo-300/80 italic">{t('propertyHighlights.step1Note')}</p>
                    </div>
                  </div>
                </div>
                <div className="group bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-indigo-400/20 rounded-2xl p-8 hover:border-indigo-400/50 hover:bg-white/[0.08] transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-indigo-500/30 to-indigo-600/20 rounded-xl flex items-center justify-center border border-indigo-400/30 group-hover:scale-110 transition-transform">
                      <FileText className="h-7 w-7 text-indigo-300" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-3">{t('propertyHighlights.step2Title')}</h3>
                      <p className="text-gray-400 leading-relaxed mb-2 text-justify">{t('propertyHighlights.step2Desc')}</p>
                      <p className="text-sm text-indigo-300/80 italic">{t('propertyHighlights.step2Note')}</p>
                    </div>
                  </div>
                </div>
                <div className="group bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-indigo-400/20 rounded-2xl p-8 hover:border-indigo-400/50 hover:bg-white/[0.08] transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-indigo-500/30 to-indigo-600/20 rounded-xl flex items-center justify-center border border-indigo-400/30 group-hover:scale-110 transition-transform">
                      <Calendar className="h-7 w-7 text-indigo-300" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-3">{t('propertyHighlights.step3Title')}</h3>
                      <p className="text-gray-400 leading-relaxed mb-2 text-justify">{t('propertyHighlights.step3Desc')}</p>
                      <p className="text-sm text-indigo-300/80 italic">{t('propertyHighlights.step3Note')}</p>
                    </div>
                  </div>
                </div>
                <div className="group bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-indigo-400/20 rounded-2xl p-8 hover:border-indigo-400/50 hover:bg-white/[0.08] transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-indigo-500/30 to-indigo-600/20 rounded-xl flex items-center justify-center border border-indigo-400/30 group-hover:scale-110 transition-transform">
                      <Key className="h-7 w-7 text-indigo-300" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-3">{t('propertyHighlights.step4Title')}</h3>
                      <p className="text-gray-400 leading-relaxed mb-2 text-justify">{t('propertyHighlights.step4Desc')}</p>
                      <p className="text-sm text-indigo-300/80 italic">{t('propertyHighlights.step4Note')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
            <Reveal delay={200}>
              <div className="text-center mb-16">
                <CTAButton onClick={() => { analytics.trackCtaClick('how_it_works'); setIsFormModalOpen(true); }}>
                  {t('hero.cta')}
                </CTAButton>
                <p className="text-sm text-gray-500 mt-3">{t('hero.ctaMicro')}</p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Testimonial - Eddie */}
        <div className="relative py-12 md:py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <Reveal delay={0.1}>
              <FeaturedTestimonial
                quote={t('highlightedTestimonial.quote')}
                authorName="Eddie"
                authorTitle={t('highlightedTestimonial.authorTitle')}
                authorImage="/images/testimonials/eddie.jpg"
                rating={5}
              />
            </Reveal>
          </div>
        </div>

        {/* What's Nearby - Focus on the places */}
        {!funnelLoading && funnelContent?.locationNearby && (
          <section className="relative py-20 md:py-24">
            {/* Ambient glows - BOOSTED for visibility */}
            <div className="absolute pointer-events-none top-[-40%] left-1/2 -translate-x-1/2 w-[1100px] h-[800px] bg-indigo-600/25 rounded-full blur-[220px]" />
            <div className="absolute pointer-events-none top-[-20%] left-1/4 w-[600px] h-[500px] bg-violet-500/20 rounded-full blur-[180px]" />
            <div className="absolute pointer-events-none top-[30%] right-0 w-[600px] h-[500px] bg-violet-500/20 rounded-full blur-[180px]" />
            {/* Bottom bleeds to Qualifier */}
            <div className="absolute pointer-events-none bottom-[-35%] left-1/2 -translate-x-1/2 w-[1000px] h-[700px] bg-indigo-500/22 rounded-full blur-[200px]" />

            <div className="relative z-10 max-w-4xl mx-auto px-4">
              {/* Section Header */}
              <Reveal className="text-center mb-14 md:mb-16">
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white">
                  {t('location.headingPre')}{' '}
                  <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent italic">
                    {t('location.headingHighlight')}
                  </span>
                </h2>
              </Reveal>

              {/* Nearby - split place and time for consistency */}
              <Reveal delay={150}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
                  {localizedFunnel.locationNearby!.split('\n').filter(Boolean).slice(0, 4).map((item, idx) => {
                    const cleanItem = item.replace(/^[•\-\*]\s*/, '').trim();
                    // Try to split "Place - time" but fallback to full text
                    const dashMatch = cleanItem.match(/^(.+?)\s*[-–]\s*(.+)$/);
                    const place = dashMatch ? dashMatch[1].trim() : cleanItem;
                    const time = dashMatch ? dashMatch[2].trim() : null;

                    return (
                      <div key={idx} className="group relative">
                        {/* Glow on hover */}
                        <div className="absolute pointer-events-none -inset-1 bg-gradient-to-r from-indigo-600/20 to-violet-600/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div className="relative bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-5 py-6 text-center h-full group-hover:border-indigo-400/40 group-hover:bg-indigo-500/15 transition-all flex flex-col justify-center">
                          <p className="text-white font-medium text-base md:text-lg leading-tight">
                            {place}
                          </p>
                          {time && (
                            <p className="text-indigo-300/70 text-sm mt-1">
                              {time}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Reveal>
            </div>
          </section>
        )}

        {/* Qualifier Section - HIDDEN */}
        {false && !funnelLoading && (() => {
          // Default lifestyle-focused content (fallback when no avatars/qualifier set)
          const defaultQualifiers = [
            t('qualifier.default1'),
            t('qualifier.default2'),
            t('qualifier.default3'),
            t('qualifier.default4'),
            t('qualifier.default5'),
            t('qualifier.default6'),
          ];

          // Use custom qualifier content if set, otherwise use defaults
          const qualifierItems = localizedFunnel?.qualifier
            ? localizedFunnel.qualifier.split('\n').filter(Boolean).map(item => item.replace(/^[•\-\*\s]+/, '').trim()).filter(Boolean)
            : defaultQualifiers;

          return (
            <section className="relative py-16 md:py-20">
              {/* Ambient glows - BOOSTED + extended bottom bleed to FAQ */}
              <div className="absolute pointer-events-none top-[-30%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-indigo-500/22 rounded-full blur-[200px]" />
              <div className="absolute pointer-events-none top-[20%] left-0 w-[600px] h-[500px] bg-violet-600/20 rounded-full blur-[180px]" />
              <div className="absolute pointer-events-none top-[40%] right-0 w-[550px] h-[450px] bg-indigo-400/18 rounded-full blur-[160px]" />
              {/* Extended bottom bleed to reach FAQ section */}
              <div className="absolute pointer-events-none bottom-[-55%] left-1/2 -translate-x-1/2 w-[1100px] h-[800px] bg-indigo-600/25 rounded-full blur-[250px]" />

              <div className="relative z-10 max-w-3xl mx-auto px-4">
                <Reveal className="text-center mb-10">
                  <h2 className="text-3xl md:text-4xl font-black">
                    <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
                      {t('qualifier.heading')}
                    </span>
                  </h2>
                </Reveal>

                <Reveal delay={150}>
                  <div className="space-y-3">
                    {qualifierItems.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-5 py-4 hover:bg-indigo-500/15 transition-colors">
                        <CheckCircle className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                        <p className="text-white/90 leading-relaxed text-justify">{item}</p>
                      </div>
                    ))}
                  </div>
                </Reveal>
              </div>
            </section>
          );
        })()}

        {/* Social Proof / Testimonials - Always Scrolling Marquee */}
        {!funnelLoading && (
          (() => {
            // Default testimonials - Purple Homes brand stories (used when no custom testimonials exist)
            const defaultTestimonials: Testimonial[] = [
              {
                quote: "I was rejected by three banks. Then Purple Homes helped me get into my dream home. 18 months later, I've built $12,400 in equity instead of throwing away $21,600 in rent.",
                authorName: "Sarah M.",
                authorTitle: "Built $12,400 equity in 18 months",
                rating: 5,
              },
              {
                quote: "After my divorce, my credit dropped to 580. Banks wouldn't touch me. Purple Homes got me into a home at $1,450/month — $350 less than I was paying in rent. Now my score is back to 720.",
                authorName: "Marcus T.",
                authorTitle: "Credit improved 580 → 720",
                rating: 5,
              },
              {
                quote: "As a self-employed contractor, banks called me 'high risk.' Purple Homes approved me in 72 hours. 2 years later, I refinanced into a traditional mortgage at 6.2%.",
                authorName: "Jennifer L.",
                authorTitle: "Approved in 72 hours",
                rating: 5,
              },
              {
                quote: "We went from application to keys in just 3 weeks. Our payment is $1,680/month and $380 of that goes straight to our equity. We're actually building wealth now.",
                authorName: "David R.",
                authorTitle: "$380/month building equity",
                rating: 5,
              },
              {
                quote: "I thought homeownership was impossible as a single mom. My payment is only $200 more than my old apartment, but now my kids have a backyard AND I'm building equity.",
                authorName: "Maria G.",
                authorTitle: "Single mom, now homeowner",
                rating: 5,
              },
              {
                quote: "We calculated it: renting for 3 more years would have cost us $64,800 with nothing to show. Now we're 14 months in with $9,800 in equity. The math just makes sense.",
                authorName: "Chris P.",
                authorTitle: "$9,800 equity in 14 months",
                rating: 5,
              },
            ];

            // Priority: 1) Property-specific testimonials, 2) Global testimonials from API, 3) Default brand testimonials
            let testimonials: Testimonial[] = [];

            if (localizedFunnel?.testimonials?.length) {
              testimonials = localizedFunnel.testimonials as Testimonial[];
            } else if (globalTestimonials.length) {
              testimonials = globalTestimonials;
            } else {
              // Use default Purple Homes testimonials
              testimonials = defaultTestimonials;
            }

            return (
              <section className="relative py-16 md:py-20">
                {/* BOOSTED glows - social proof needs visual weight */}
                {/* Center spotlight for the testimonial stage */}
                <div className="absolute pointer-events-none top-[-30%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-indigo-600/22 rounded-full blur-[200px]" />
                {/* Edge glows boosted from 10-12% to 20% */}
                <div className="absolute pointer-events-none top-[-40%] left-0 w-[500px] h-[600px] bg-indigo-600/20 rounded-full blur-[200px]" />
                <div className="absolute pointer-events-none top-[-40%] right-0 w-[500px] h-[600px] bg-violet-500/18 rounded-full blur-[200px]" />
                <div className="absolute pointer-events-none bottom-[-40%] left-0 w-[500px] h-[600px] bg-violet-600/18 rounded-full blur-[200px]" />
                <div className="absolute pointer-events-none bottom-[-40%] right-0 w-[500px] h-[600px] bg-indigo-600/20 rounded-full blur-[200px]" />

                <Reveal className="text-center mb-10">
                  <h2 className="text-3xl md:text-4xl font-black text-white">
                    {t('testimonials.headingPre')}{' '}
                    <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent italic">
                      {t('testimonials.headingHighlight')}
                    </span>
                  </h2>
                </Reveal>
                <Reveal delay={200}>
                  <TestimonialMarquee testimonials={testimonials} speed={testimonialSpeed} />
                </Reveal>
              </section>
            );
          })()
        )}

        {/* Property Showcase - 2x2 boxes - HIDDEN (moved to top) */}
        {false && (<section className="relative py-20 md:py-28">
            {/* Ambient glow */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute pointer-events-none top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-indigo-600/22 rounded-full blur-[200px]" />
              <div className="absolute pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-violet-500/18 rounded-full blur-[180px]" />
              <div className="absolute pointer-events-none bottom-[-45%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-indigo-600/20 rounded-full blur-[200px]" />
              <div className="absolute pointer-events-none bottom-[-30%] left-1/3 w-[500px] h-[400px] bg-violet-500/15 rounded-full blur-[150px]" />
            </div>

            <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
              {/* Section Header */}
              <Reveal className="text-center mb-12 md:mb-16">
                <span className="inline-block px-4 py-1.5 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 rounded-full text-xs md:text-sm font-bold uppercase tracking-wider mb-4">
                  {t('propertyHighlights.sectionLabel')}
                </span>
                <h2 className="text-4xl sm:text-5xl md:text-6xl font-black mb-6">
                  <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
                    {t('propertyHighlights.sectionHeading')}
                  </span>
                </h2>
                <p className="text-lg md:text-xl text-gray-400 leading-relaxed max-w-3xl mx-auto text-justify">
                  {t('propertyHighlights.showcaseText')}
                </p>
              </Reveal>

              {/* 4-Step Process - 2x2 boxes */}
              <Reveal delay={150}>
                <div className="grid sm:grid-cols-2 gap-6 md:gap-8 mt-16 mb-12">
                  {/* Step 1 */}
                  <div className="group bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-indigo-400/20 rounded-2xl p-8 hover:border-indigo-400/50 hover:bg-white/[0.08] transition-all duration-300">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-indigo-500/30 to-indigo-600/20 rounded-xl flex items-center justify-center border border-indigo-400/30 group-hover:scale-110 transition-transform">
                        <MessageCircle className="h-7 w-7 text-indigo-300" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-3">{t('propertyHighlights.step1Title')}</h3>
                        <p className="text-gray-400 leading-relaxed mb-2 text-justify">{t('propertyHighlights.step1Desc')}</p>
                        <p className="text-sm text-indigo-300/80 italic">{t('propertyHighlights.step1Note')}</p>
                      </div>
                    </div>
                  </div>
                  {/* Step 2 */}
                  <div className="group bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-indigo-400/20 rounded-2xl p-8 hover:border-indigo-400/50 hover:bg-white/[0.08] transition-all duration-300">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-indigo-500/30 to-indigo-600/20 rounded-xl flex items-center justify-center border border-indigo-400/30 group-hover:scale-110 transition-transform">
                        <FileText className="h-7 w-7 text-indigo-300" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-3">{t('propertyHighlights.step2Title')}</h3>
                        <p className="text-gray-400 leading-relaxed mb-2 text-justify">{t('propertyHighlights.step2Desc')}</p>
                        <p className="text-sm text-indigo-300/80 italic">{t('propertyHighlights.step2Note')}</p>
                      </div>
                    </div>
                  </div>
                  {/* Step 3 */}
                  <div className="group bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-indigo-400/20 rounded-2xl p-8 hover:border-indigo-400/50 hover:bg-white/[0.08] transition-all duration-300">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-indigo-500/30 to-indigo-600/20 rounded-xl flex items-center justify-center border border-indigo-400/30 group-hover:scale-110 transition-transform">
                        <Calendar className="h-7 w-7 text-indigo-300" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-3">{t('propertyHighlights.step3Title')}</h3>
                        <p className="text-gray-400 leading-relaxed mb-2 text-justify">{t('propertyHighlights.step3Desc')}</p>
                        <p className="text-sm text-indigo-300/80 italic">{t('propertyHighlights.step3Note')}</p>
                      </div>
                    </div>
                  </div>
                  {/* Step 4 */}
                  <div className="group bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-indigo-400/20 rounded-2xl p-8 hover:border-indigo-400/50 hover:bg-white/[0.08] transition-all duration-300">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-indigo-500/30 to-indigo-600/20 rounded-xl flex items-center justify-center border border-indigo-400/30 group-hover:scale-110 transition-transform">
                        <Key className="h-7 w-7 text-indigo-300" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-3">{t('propertyHighlights.step4Title')}</h3>
                        <p className="text-gray-400 leading-relaxed mb-2 text-justify">{t('propertyHighlights.step4Desc')}</p>
                        <p className="text-sm text-indigo-300/80 italic">{t('propertyHighlights.step4Note')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>

              {/* CTA */}
              <Reveal delay={200}>
                <div className="text-center mb-16">
                  <CTAButton
                    onClick={() => {
                      analytics.trackCtaClick('how_it_works');
                      setIsFormModalOpen(true);
                    }}
                  >
                    {t('hero.cta')}
                  </CTAButton>
                  <p className="text-sm text-gray-500 mt-3">{t('hero.ctaMicro')}</p>
                </div>
              </Reveal>

              {/* Property Features Grid - HIDDEN */}
              {false && <Reveal delay={250}>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  <div className="group bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-indigo-400/20 rounded-2xl p-6 text-center hover:border-indigo-400/50 hover:bg-white/[0.08] transition-all duration-300">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500/30 to-indigo-600/20 rounded-xl flex items-center justify-center mx-auto mb-4 border border-indigo-400/30 group-hover:scale-110 transition-transform">
                      <Bed className="h-7 w-7 text-indigo-300" />
                    </div>
                    <div className="text-4xl font-black mb-1"><GradientNumber>{property.beds}</GradientNumber></div>
                    <div className="text-sm text-gray-500 uppercase tracking-wider font-medium">{t('property.bedrooms')}</div>
                  </div>
                  <div className="group bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-indigo-400/20 rounded-2xl p-6 text-center hover:border-indigo-400/50 hover:bg-white/[0.08] transition-all duration-300">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500/30 to-indigo-600/20 rounded-xl flex items-center justify-center mx-auto mb-4 border border-indigo-400/30 group-hover:scale-110 transition-transform">
                      <Bath className="h-7 w-7 text-indigo-300" />
                    </div>
                    <div className="text-4xl font-black mb-1"><GradientNumber>{property.baths}</GradientNumber></div>
                    <div className="text-sm text-gray-500 uppercase tracking-wider font-medium">{t('property.bathrooms')}</div>
                  </div>
                  {property.sqft && (
                    <div className="group bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-indigo-400/20 rounded-2xl p-6 text-center hover:border-indigo-400/50 hover:bg-white/[0.08] transition-all duration-300">
                      <div className="w-14 h-14 bg-gradient-to-br from-indigo-500/30 to-indigo-600/20 rounded-xl flex items-center justify-center mx-auto mb-4 border border-indigo-400/30 group-hover:scale-110 transition-transform">
                        <Maximize2 className="h-7 w-7 text-indigo-300" />
                      </div>
                      <div className="text-4xl font-black mb-1"><GradientNumber>{property.sqft.toLocaleString()}</GradientNumber></div>
                      <div className="text-sm text-gray-500 uppercase tracking-wider font-medium">{t('property.squareFeet')}</div>
                    </div>
                  )}
                  {property.condition && (
                    <div className="group bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-indigo-400/20 rounded-2xl p-6 text-center hover:border-indigo-400/50 hover:bg-white/[0.08] transition-all duration-300">
                      <div className="w-14 h-14 bg-gradient-to-br from-indigo-500/30 to-indigo-600/20 rounded-xl flex items-center justify-center mx-auto mb-4 border border-indigo-400/30 group-hover:scale-110 transition-transform">
                        <Wrench className="h-7 w-7 text-indigo-300" />
                      </div>
                      <div className="text-2xl font-black text-white mb-1">{property.condition}</div>
                      <div className="text-sm text-gray-500 uppercase tracking-wider font-medium">{t('property.condition')}</div>
                    </div>
                  )}
                </div>
              </Reveal>}
            </div>
          </section>)}

        {/* Full-page loading skeleton while funnel content loads */}
        {funnelLoading && (
          <div className="animate-pulse space-y-8 py-16">
            {/* Problem Section Skeleton */}
            <div className="max-w-6xl mx-auto px-4">
              <div className="h-4 w-24 bg-gray-200 rounded mb-4" />
              <div className="h-10 w-2/3 bg-gray-200 rounded mb-6" />
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-5/6" />
                  <div className="h-4 bg-gray-200 rounded w-4/5" />
                </div>
                <div className="h-48 bg-gray-100 rounded-2xl" />
              </div>
            </div>

            {/* Solution Section Skeleton */}
            <div className="bg-gray-900 py-16">
              <div className="max-w-6xl mx-auto px-4">
                <div className="h-4 w-32 bg-gray-700 rounded mx-auto mb-4" />
                <div className="h-10 w-1/2 bg-gray-700 rounded mx-auto mb-8" />
                <div className="grid md:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-gray-800 rounded-2xl p-8">
                      <div className="w-16 h-16 bg-gray-700 rounded-2xl mx-auto mb-5" />
                      <div className="h-6 bg-gray-700 rounded w-2/3 mx-auto mb-3" />
                      <div className="h-4 bg-gray-700 rounded w-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Property Showcase Skeleton */}
            <div className="max-w-6xl mx-auto px-4">
              <div className="h-4 w-32 bg-gray-200 rounded mx-auto mb-4" />
              <div className="h-10 w-1/3 bg-gray-200 rounded mx-auto mb-8" />
              <div className="space-y-4 max-w-4xl mx-auto">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-5/6" />
                <div className="h-4 bg-gray-200 rounded w-4/5" />
              </div>
              <div className="grid grid-cols-4 gap-4 mt-8">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-indigo-50 rounded-xl p-5 h-24" />
                ))}
              </div>
            </div>

            {/* CTA Section Skeleton */}
            <div className="bg-gray-100 py-16">
              <div className="max-w-2xl mx-auto px-4 text-center">
                <div className="h-8 w-2/3 bg-gray-200 rounded mx-auto mb-6" />
                <div className="h-12 w-48 bg-indigo-200 rounded-xl mx-auto" />
              </div>
            </div>
          </div>
        )}

        {/* Problem/Challenge Section - HIDDEN */}
        {false && !funnelLoading && funnelContent?.problem && (
          <section className="relative py-24 md:py-32">
            {/* Enhanced purple ambient glow - bottom glow bleeds into Solution section */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute pointer-events-none top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-indigo-600/15 rounded-full blur-[150px]" />
              <div className="absolute pointer-events-none bottom-[-20%] right-1/4 w-[700px] h-[600px] bg-violet-500/15 rounded-full blur-[150px]" />
              <div className="absolute pointer-events-none top-1/2 left-0 w-[300px] h-[300px] bg-indigo-400/8 rounded-full blur-[100px]" />
            </div>

            <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
              {/* Section Header with Animation */}
              <Reveal className="text-center mb-16 md:mb-20">
                <h2 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[1.0] tracking-[-0.02em] max-w-4xl mx-auto mb-6">
                  <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
                    {stripMarkers(extractProblemHeadline(localizedFunnel.problem))}
                  </span>
                </h2>
                <p className="text-lg md:text-xl text-gray-400 font-light max-w-2xl mx-auto text-justify">
                  {t('problem.notAlone')} <span className="text-indigo-300 font-medium">{t('problem.thousands')}</span> {t('problem.thousandsFace')}
                </p>
              </Reveal>

              {/* Two Column Layout - Better vertical alignment */}
              <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-stretch">
                {/* Left - Dynamic Pain Points with Enhanced Styling */}
                <div className="flex flex-col justify-center space-y-5">
                  {getPainPoints(localizedFunnel.inputs?.buyerSegment).map((pain, i) => (
                    <Reveal key={i} delay={i * 150}>
                      <div className="group relative flex items-center gap-5 bg-gradient-to-r from-white/[0.06] to-white/[0.02] border border-indigo-400/20 rounded-2xl p-6 hover:border-indigo-400/50 hover:bg-white/[0.08] hover:translate-x-2 transition-all duration-300 cursor-default shadow-lg shadow-indigo-900/20 hover:shadow-indigo-500/20">
                        {/* Glow effect on hover */}
                        <div className="absolute pointer-events-none inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/0 to-indigo-500/0 group-hover:from-indigo-500/5 group-hover:to-transparent transition-all duration-300" />
                        <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500/40 to-indigo-600/30 flex items-center justify-center flex-shrink-0 border border-indigo-400/40 group-hover:border-indigo-300/60 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-indigo-500/30 transition-all duration-300">
                          <span className="text-indigo-200 text-2xl font-black">{pain.icon}</span>
                        </div>
                        <span className="relative text-white text-xl font-semibold group-hover:text-indigo-100 transition-colors leading-snug">{pain.text}</span>
                      </div>
                    </Reveal>
                  ))}
                </div>

                {/* Right - Emotional Empathy Card with Enhanced Animation */}
                <Reveal delay={300}>
                  <div className="relative h-full flex items-center">
                    {/* Multi-layer animated glow behind card */}
                    <div className="absolute pointer-events-none -inset-6 bg-gradient-to-br from-indigo-500/20 to-violet-600/15 rounded-[2.5rem] blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
                    <div className="absolute pointer-events-none -inset-3 bg-gradient-to-tr from-indigo-400/10 to-transparent rounded-[2rem] blur-xl animate-pulse" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />

                    <div className="relative w-full bg-gradient-to-br from-[#1e1a2e] via-[#1a1528] to-[#13101c] border border-indigo-400/25 rounded-3xl px-10 py-14 md:px-12 md:py-16 text-center shadow-2xl shadow-indigo-900/40 hover:border-indigo-300/40 hover:shadow-indigo-800/50 transition-all duration-500">
                      {/* Decorative quote marks */}
                      <div className="absolute top-6 left-6 text-6xl text-indigo-500/20 font-serif leading-none">"</div>
                      <div className="absolute bottom-6 right-6 text-6xl text-indigo-500/20 font-serif leading-none rotate-180">"</div>

                      {/* Subtle inner glow */}
                      <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />

                      <blockquote className="relative text-xl md:text-2xl text-white/95 leading-relaxed font-medium italic px-4">
                        {stripMarkers(extractProblemBody(localizedFunnel.problem))}
                      </blockquote>

                      <div className="relative mt-10 pt-8 border-t border-indigo-400/20">
                        <div className="inline-flex items-center gap-3">
                          <span className="w-8 h-[2px] bg-gradient-to-r from-transparent to-indigo-400/60" />
                          <p className="text-indigo-300 text-sm font-bold tracking-[0.2em] uppercase">{t('problem.soundFamiliar')}</p>
                          <span className="w-8 h-[2px] bg-gradient-to-l from-transparent to-indigo-400/60" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>
          </section>
        )}

        {/* Solution Section - Dynamic from AI */}
        {/* TEMPORARILY HIDDEN - restore by removing the outer {false && ()} wrapper */}
        {false && !funnelLoading && funnelContent?.solution && (
          <section className="relative py-24 md:py-32">
            {/* Ambient glow - top glow bleeds from Problem section, bottom bleeds to next */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute pointer-events-none top-[-15%] left-1/4 w-[800px] h-[600px] bg-violet-500/15 rounded-full blur-[180px]" />
              <div className="absolute pointer-events-none top-1/3 right-1/4 w-[600px] h-[500px] bg-indigo-400/12 rounded-full blur-[150px]" />
              <div className="absolute pointer-events-none bottom-[-15%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-indigo-600/15 rounded-full blur-[180px]" />
            </div>

            <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
              {/* Section Header */}
              <Reveal className="text-center mb-16 md:mb-20">
                {/* Extract first 2 sentences for headline */}
                <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] tracking-[-0.02em] max-w-4xl mx-auto mb-4">
                  <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
                    {stripMarkers((() => {
                      const sentences = localizedFunnel.solution.match(/[^.!?]+[.!?]+/g) || [localizedFunnel.solution];
                      return sentences.slice(0, 2).join(' ').trim();
                    })())}
                  </span>
                </h2>
              </Reveal>

              {/* Solution Benefits - Two Column Layout */}
              <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-stretch">
                {/* Left - Key Benefits with Staggered Animation */}
                {/*
                  ⚠️ BRAND CONSTANTS - Update here if Purple Homes policy changes:
                  - Credit score minimum (currently 580)
                  - Key value propositions
                */}
                <div className="flex flex-col justify-center space-y-6">
                  {[
                    { icon: '✓', highlight: t('solution.yourPotential'), text: t('solution.yourPotentialDesc') },
                    { icon: '✓', highlight: t('solution.creditScores'), text: t('solution.creditScoresDesc') },
                    { icon: '✓', highlight: t('solution.noMoreWaiting'), text: t('solution.noMoreWaitingDesc') },
                  ].map((benefit, i) => (
                    <Reveal key={i} delay={i * 150}>
                      <div className="group relative flex items-start gap-5 bg-gradient-to-r from-white/[0.06] to-white/[0.02] border border-indigo-400/20 rounded-2xl p-6 hover:border-indigo-400/50 hover:bg-white/[0.08] transition-all duration-300 shadow-lg shadow-indigo-900/20 hover:shadow-indigo-500/20">
                        <div className="absolute pointer-events-none inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/0 to-indigo-500/0 group-hover:from-indigo-500/5 group-hover:to-transparent transition-all duration-300" />
                        <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/40 to-indigo-600/30 flex items-center justify-center flex-shrink-0 border border-indigo-400/40 group-hover:border-indigo-300/60 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-indigo-500/30 transition-all duration-300">
                          <span className="text-indigo-200 text-xl font-bold">{benefit.icon}</span>
                        </div>
                        <div className="relative">
                          <h3 className="text-xl md:text-2xl font-black text-white mb-2 group-hover:text-indigo-100 transition-colors">{benefit.highlight}</h3>
                          <p className="text-gray-400 text-base leading-relaxed group-hover:text-gray-300 transition-colors text-justify">{benefit.text}</p>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>

                {/* Right - Big Number Impact Card */}
                <Reveal delay={300}>
                  <div className="relative h-full flex items-center">
                    {/* Multi-layer glow */}
                    <div className="absolute pointer-events-none -inset-6 bg-gradient-to-br from-indigo-500/20 to-violet-600/15 rounded-[2.5rem] blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
                    <div className="absolute pointer-events-none -inset-3 bg-gradient-to-tr from-indigo-400/10 to-transparent rounded-[2rem] blur-xl animate-pulse" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />

                    <div className="relative w-full bg-gradient-to-br from-[#1e1a2e] via-[#1a1528] to-[#13101c] border border-indigo-400/25 rounded-3xl px-8 py-14 md:px-12 md:py-20 text-center shadow-2xl shadow-indigo-900/40 hover:border-indigo-300/40 hover:shadow-indigo-800/50 transition-all duration-500">
                      {/* Subtle inner glow */}
                      <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />

                      {/* Big number - ⚠️ BRAND CONSTANT: Update if credit score policy changes */}
                      <div className="relative mb-6 inline-block">
                        {/* Hand-drawn encircle effect */}
                        <svg className="absolute -inset-4 md:-inset-6 w-[calc(100%+2rem)] md:w-[calc(100%+3rem)] h-[calc(100%+2rem)] md:h-[calc(100%+3rem)] pointer-events-none" viewBox="0 0 200 100" preserveAspectRatio="none">
                          <ellipse
                            cx="100"
                            cy="50"
                            rx="95"
                            ry="45"
                            fill="none"
                            stroke="url(#circleGradient)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeDasharray="5,3"
                            className="animate-pulse"
                            style={{ animationDuration: '3s' }}
                            transform="rotate(-3 100 50)"
                          />
                          <defs>
                            <linearGradient id="circleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.6" />
                              <stop offset="50%" stopColor="#c084fc" stopOpacity="0.8" />
                              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.6" />
                            </linearGradient>
                          </defs>
                        </svg>
                        {/* BRAND CONSTANT - Uses GradientNumber utility */}
                        <GradientNumber className="text-[120px] md:text-[160px] font-black leading-none">
                          580
                        </GradientNumber>
                      </div>

                      <p className="relative text-2xl md:text-3xl font-bold text-white mb-3">
                        {t('solution.minimumCreditScore')}
                      </p>

                      <p className="relative text-lg text-gray-400 font-light max-w-sm mx-auto text-justify">
                        {t('solution.creditScoreJourney')}
                      </p>

                      {/* Bottom accent */}
                      <div className="relative mt-10 pt-8 border-t border-indigo-400/20">
                        <div className="inline-flex items-center gap-3">
                          <span className="w-8 h-[2px] bg-gradient-to-r from-transparent to-indigo-400/60" />
                          <p className="text-indigo-300 text-sm font-bold tracking-[0.2em] uppercase">{t('solution.believeInYou')}</p>
                          <span className="w-8 h-[2px] bg-gradient-to-l from-transparent to-indigo-400/60" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              </div>

              {/* CTA After Bullet List */}
              <Reveal delay={300}>
                <div className="text-center mt-12">
                  <CTAButton
                    onClick={() => {
                      analytics.trackCtaClick('solution_cta');
                      setIsFormModalOpen(true);
                    }}
                  >
                    {t('hero.cta')}
                  </CTAButton>
                  <p className="text-sm text-gray-500 mt-3">
                    {t('hero.ctaMicro')}
                  </p>
                </div>
              </Reveal>
            </div>
          </section>
        )}

        {/* JOURNEY COMPARISON - The Old Way vs The New Way - DARK PREMIUM */}
        {/* TEMPORARILY HIDDEN - restore by removing the {false && (...)} wrapper */}
        {false && (<section className="relative py-16 md:py-24">
          {/* Ambient lighting - glows extend to adjacent sections */}
          <div className="absolute pointer-events-none top-[-30%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-indigo-600/20 rounded-full blur-[200px]" />
          <div className="absolute pointer-events-none top-[20%] left-0 w-[500px] h-[500px] bg-slate-700/15 rounded-full blur-[180px]" />
          <div className="absolute pointer-events-none top-[30%] right-0 w-[500px] h-[500px] bg-indigo-600/18 rounded-full blur-[180px]" />
          {/* Bottom glows bleed into Process Steps */}
          <div className="absolute pointer-events-none bottom-[-30%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-600/22 rounded-full blur-[220px]" />
          <div className="absolute pointer-events-none bottom-[-15%] right-1/3 w-[500px] h-[400px] bg-violet-500/15 rounded-full blur-[180px]" />


          <div className="relative max-w-6xl mx-auto px-4">
            {/* Journey Paths - Headers inside each column for proper mobile flow */}
            <div className="grid md:grid-cols-2 gap-8 md:gap-10">
              {/* LEFT: The Old Way - Problems */}
              <Reveal delay={100}>
              <div className="relative">
                {/* Header - The Old Way */}
                <div className="text-center mb-6 md:mb-8">
                  <div className="inline-block bg-gray-900/80 backdrop-blur border border-gray-700 rounded-xl md:rounded-2xl px-8 md:px-10 py-4 md:py-5 shadow-xl">
                    <h3 className="text-xl md:text-3xl font-black text-white">
                      {t('journey.theWord')} <span className="underline decoration-slate-500 decoration-4 md:decoration-[6px] underline-offset-4">{t('journey.old')}</span> {t('journey.way')}
                    </h3>
                  </div>
                </div>

                {/* Vertical connecting line - fades before pill */}
                <div className="absolute pointer-events-none left-[calc(50%-1px)] md:left-[calc(50%+20px)] top-[120px] bottom-[70px] w-1 bg-gradient-to-b from-slate-500/40 via-slate-500/60 to-transparent hidden md:block" />

                <div className="space-y-3 md:space-y-4">
                  {/* First item - intro */}
                  <div className="relative">
                    <div className="flex items-center gap-2 md:gap-4">
                      <div className="hidden md:flex w-12 h-12 rounded-full bg-slate-500/20 border-2 border-slate-500/50 items-center justify-center flex-shrink-0">
                        <span className="text-slate-400 text-2xl font-bold">✗</span>
                      </div>
                      <div className="flex-1 bg-gradient-to-r from-slate-700 to-slate-800 rounded-xl md:rounded-2xl p-4 md:p-5 text-white shadow-lg border border-slate-600/30">
                        <div className="font-bold text-base md:text-lg flex items-center gap-2">
                          <span className="md:hidden text-slate-400">✗</span>
                          {t('journey.rentingForever')}
                        </div>
                        <div className="text-slate-300 text-xs md:text-sm ml-5 md:ml-0">{t('journey.rentingForeverDesc')}</div>
                      </div>
                    </div>
                    {/* Arrow down */}
                    <div className="hidden md:flex justify-center mt-2">
                      <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-slate-500" />
                    </div>
                  </div>

                  {[
                    t('journey.payingSomeoneElse'),
                    t('journey.noEquity'),
                    t('journey.rentIncreases'),
                    t('journey.noTaxBenefits'),
                    t('journey.forcedToMove'),
                    t('journey.moneyDrain'),
                  ].map((problem, i) => (
                    <div key={i} className="relative">
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="hidden md:flex w-12 h-12 rounded-full bg-slate-500/20 border-2 border-slate-500/50 items-center justify-center flex-shrink-0">
                          <span className="text-slate-400 text-2xl font-bold">✗</span>
                        </div>
                        <div className="flex-1 relative">
                          {/* Badge - desktop only */}
                          <span className="hidden md:inline-block absolute -top-2 right-4 bg-slate-800 text-slate-300 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded z-10 border border-slate-600">
                            {t('journey.problem')}
                          </span>
                          <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-white font-semibold md:font-bold text-sm md:text-lg shadow-lg border border-slate-600/30 flex items-center gap-2">
                            <span className="md:hidden text-slate-400">✗</span>
                            {problem}
                          </div>
                        </div>
                      </div>
                      {/* Arrow down - desktop only */}
                      {i < 5 && (
                        <div className="hidden md:flex justify-center mt-2">
                          <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-slate-500" />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Dead end indicator */}
                  <div className="hidden md:block text-center pt-4">
                    <span className="inline-block bg-slate-800 text-slate-300 font-bold text-sm px-5 py-2.5 rounded-full border-2 border-slate-600 shadow-lg">
                      😞 {t('journey.stuckForever')}
                    </span>
                  </div>
                </div>
              </div>
              </Reveal>

              {/* RIGHT: The New Way - Solutions */}
              <Reveal delay={200}>
              <div className="relative">
                {/* Header - The New Way */}
                <div className="text-center mb-6 md:mb-8">
                  <div className="inline-block bg-gray-900/80 backdrop-blur border border-indigo-500/40 rounded-xl md:rounded-2xl px-8 md:px-10 py-4 md:py-5 shadow-xl shadow-indigo-500/10">
                    <h3 className="text-xl md:text-3xl font-black text-white">
                      {t('journey.theWord')} <span className="underline decoration-indigo-400 decoration-4 md:decoration-[6px] underline-offset-4">{t('journey.new')}</span> {t('journey.way')}
                    </h3>
                  </div>
                </div>

                {/* Glow effect behind the column */}
                <div className="absolute pointer-events-none inset-0 bg-indigo-500/10 rounded-3xl blur-3xl scale-110 hidden md:block" />

                {/* Vertical connecting line with glow - fades before pill */}
                <div className="absolute pointer-events-none left-[calc(50%-1px)] md:left-[calc(50%+20px)] top-[120px] bottom-[70px] w-1 bg-gradient-to-b from-indigo-400/40 via-indigo-400/60 to-transparent shadow-[0_0_15px_rgba(99,102,241,0.4)] hidden md:block" />

                <div className="relative space-y-3 md:space-y-4">
                  {/* First item - intro */}
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 md:gap-4">
                      <div className="hidden md:flex w-12 h-12 rounded-full bg-indigo-500/20 border-2 border-indigo-400/60 items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/30">
                        <span className="text-indigo-300 text-2xl font-bold">✓</span>
                      </div>
                      <div className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-xl md:rounded-2xl p-4 md:p-5 text-white shadow-lg shadow-indigo-500/30 border border-indigo-400/30">
                        <div className="font-bold text-base md:text-lg flex items-center gap-2">
                          <span className="md:hidden text-indigo-200">✓</span>
                          {t('journey.rentToOwn')}
                        </div>
                        <div className="text-indigo-100 text-xs md:text-sm ml-5 md:ml-0">{t('journey.rentToOwnDesc')}</div>
                      </div>
                    </div>
                    {/* Arrow down */}
                    <div className="hidden md:flex justify-center mt-2">
                      <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-indigo-400" />
                    </div>
                  </div>

                  {[
                    t('journey.buildEquity'),
                    t('journey.wealthGrows'),
                    t('journey.priceLocked'),
                    t('journey.taxBenefits'),
                    t('journey.stabilitySecurity'),
                    t('journey.smartInvestment'),
                  ].map((solution, i) => (
                    <div key={i} className="relative z-10">
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="hidden md:flex w-12 h-12 rounded-full bg-indigo-500/20 border-2 border-indigo-400/60 items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/30">
                          <span className="text-indigo-300 text-2xl font-bold">✓</span>
                        </div>
                        <div className="flex-1 relative">
                          {/* Badge - desktop only */}
                          <span className="hidden md:inline-block absolute -top-2 right-4 bg-indigo-900 text-indigo-200 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded z-10 border border-indigo-600">
                            {t('journey.solutionBadge')}
                          </span>
                          <div className="bg-gradient-to-r from-indigo-500 to-violet-500 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-white font-semibold md:font-bold text-sm md:text-lg shadow-lg shadow-indigo-500/30 border border-indigo-400/30 flex items-center gap-2">
                            <span className="md:hidden text-indigo-200">✓</span>
                            {solution}
                          </div>
                        </div>
                      </div>
                      {/* Arrow down - desktop only */}
                      {i < 5 && (
                        <div className="hidden md:flex justify-center mt-2">
                          <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-indigo-400" />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Success indicator */}
                  <div className="hidden md:block text-center pt-2 relative z-10">
                    <span className="inline-block bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-bold text-sm px-4 py-2 rounded-full shadow-lg shadow-indigo-500/40 border border-indigo-300/30">
                      🏠 {t('journey.youreHomeowner')}
                    </span>
                  </div>
                </div>
              </div>
              </Reveal>
            </div>

            {/* Bottom CTA - WHITE with MAXIMUM GLOW */}
            <Reveal delay={300}>
              <div className="text-center mt-12 md:mt-16">
                <button
                  onClick={scrollToForm}
                  className="group relative bg-white hover:bg-indigo-50 text-indigo-900 font-black text-lg md:text-xl uppercase tracking-wide px-10 md:px-16 py-5 md:py-6 rounded-2xl shadow-[0_0_60px_rgba(168,85,247,0.5),0_0_100px_rgba(139,92,246,0.3)] hover:shadow-[0_0_80px_rgba(168,85,247,0.6),0_0_120px_rgba(139,92,246,0.4)] transition-all duration-300 hover:-translate-y-1 border-2 border-indigo-300/50"
                >
                  {t('journey.chooseNewWay')}
                  <span className="ml-3 inline-block group-hover:translate-x-2 transition-transform text-2xl">&rarr;</span>
                </button>
                <p className="text-gray-500 text-sm mt-4">{t('journey.joinFamilies')}</p>
              </div>
            </Reveal>
          </div>
        </section>)}

        {/* Stats Bar - HIDDEN */}
        {false && <AnimatedStatsSection />}

        {/* Virtual Tour - HIDDEN */}
        {false && !funnelLoading && localizedFunnel?.virtualTourUrl && (
          <VirtualTourSection
            virtualTourUrl={localizedFunnel.virtualTourUrl}
            scrollToForm={scrollToForm}
            onVideoPlay={analytics.trackVideoPlay}
          />
        )}

        {/* FAQ Section - Premium Dark */}
        <section className="relative py-16 md:py-20">
            {/* Ambient glows - BOOSTED + extended top to catch Qualifier bleed */}
            {/* Extended top glow to receive Qualifier section's bleed */}
            <div className="absolute pointer-events-none top-[-55%] left-1/2 -translate-x-1/2 w-[1100px] h-[800px] bg-indigo-600/25 rounded-full blur-[250px]" />
            <div className="absolute pointer-events-none top-[20%] right-0 w-[600px] h-[500px] bg-violet-600/20 rounded-full blur-[180px]" />
            <div className="absolute pointer-events-none top-[50%] left-0 w-[550px] h-[450px] bg-indigo-400/18 rounded-full blur-[160px]" />
            <div className="absolute pointer-events-none bottom-[-35%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-600/25 rounded-full blur-[220px]" />

            <div className="relative z-10 max-w-5xl mx-auto px-4">
              <FunnelFAQ
                subtitle={t('faq.subtitle')}
                items={undefined}
                variant="premium"
              />
              <div className="mt-10 max-w-3xl mx-auto">
                <FAQCTA phoneNumber={companyPhone} variant="premium" />
              </div>
            </div>
          </section>

        {/* Urgency / Countdown - HIDDEN */}
        {false && (<section className="relative py-20 md:py-28">
          {/* Dramatic urgency lighting - purple glow that bleeds both up and down */}
          <div className="absolute pointer-events-none top-[-50%] left-1/2 -translate-x-1/2 w-[1000px] md:w-[1400px] h-[600px] md:h-[800px] bg-indigo-600/20 rounded-full blur-[200px] md:blur-[250px]" />
          <div className="absolute pointer-events-none top-[-20%] left-1/4 w-[600px] h-[500px] bg-violet-500/15 rounded-full blur-[180px]" />
          {/* Bottom glows bleed into Final CTA section - stronger connection */}
          <div className="absolute pointer-events-none bottom-[-50%] left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-indigo-600/25 rounded-full blur-[250px]" />
          <div className="absolute pointer-events-none bottom-[-20%] left-1/4 w-[600px] h-[500px] bg-violet-500/18 rounded-full blur-[200px]" />
          <div className="absolute pointer-events-none bottom-[-20%] right-1/4 w-[600px] h-[500px] bg-indigo-500/18 rounded-full blur-[200px]" />

          {/* Animated pulse ring - extends toward next section */}
          <div className="absolute pointer-events-none top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-indigo-500/15 animate-ping" style={{ animationDuration: '3s' }} />

          <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
            {/* Urgency badge with Reveal */}
            <Reveal>
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 backdrop-blur-sm mb-8 animate-pulse">
                <div className="w-2 h-2 rounded-full bg-indigo-400" />
                <span className="text-indigo-300 text-sm font-bold tracking-wider uppercase">{t('urgency.limitedTimeOffer')}</span>
                <div className="w-2 h-2 rounded-full bg-indigo-400" />
              </div>
            </Reveal>

            {/* Main headline with Reveal */}
            <Reveal delay={100}>
              <h2 className="text-4xl md:text-5xl lg:text-6xl text-white mb-4">
                <span className="font-light">{t('urgency.thisPrice')}</span>{' '}
                <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400">
                  {t('urgency.wontLast')}
                </span>
              </h2>
              <p className="text-xl text-gray-400 mb-10 max-w-xl mx-auto">
                {t('urgency.secureToday')}
              </p>
            </Reveal>

            {/* Live Countdown Timer with Reveal */}
            <Reveal delay={200}>
              <UrgencyCountdown mode={countdownMode} hoursFromNow={countdownHours} deadline={countdownDeadline} />
            </Reveal>

            {/* Scarcity indicator with Reveal - uses funnel urgencyMessage if set */}
            <Reveal delay={300}>
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-indigo-500/10 border border-indigo-500/30 mb-10">
                <span className="text-2xl">⚡</span>
                <span className="text-indigo-300 font-bold">{funnelContent?.inputs?.urgencyMessage || t('urgency.defaultScarcity')}</span>
                <span className="text-2xl">⚡</span>
              </div>
            </Reveal>

            {/* CTA - White glowing button (site standard) */}
            <div>
              <button
                onClick={scrollToForm}
                className="group relative bg-white hover:bg-indigo-50 text-indigo-900 font-black text-lg md:text-xl uppercase tracking-wide px-12 md:px-16 py-5 md:py-6 rounded-2xl shadow-[0_0_60px_rgba(99,102,241,0.4),0_0_100px_rgba(139,92,246,0.2)] hover:shadow-[0_0_80px_rgba(168,85,247,0.5),0_0_120px_rgba(139,92,246,0.3)] transition-all duration-300 hover:-translate-y-1 border-2 border-indigo-300/50"
              >
                {t('urgency.lockInPrice')}
                <span className="ml-3 inline-block group-hover:translate-x-2 transition-transform text-2xl">&rarr;</span>
              </button>
              <p className="text-gray-500 text-sm mt-4">{t('urgency.priceIncreases')}</p>
            </div>
          </div>
        </section>)}

        {/* Final CTA Section - HIDDEN */}
        {false && !funnelLoading && funnelContent?.callToAction && (
          <section className="relative py-16 md:py-20">
            {/* Top glows - extend far up to receive Urgency section's bleed */}
            <div className="absolute pointer-events-none top-[-60%] left-1/2 -translate-x-1/2 w-[1200px] md:w-[1600px] h-[800px] bg-indigo-600/28 rounded-full blur-[250px]" />
            <div className="absolute pointer-events-none top-[-40%] left-1/4 w-[700px] h-[600px] bg-violet-500/22 rounded-full blur-[200px]" />
            <div className="absolute pointer-events-none top-[-40%] right-1/4 w-[700px] h-[600px] bg-indigo-500/20 rounded-full blur-[200px]" />
            {/* Bottom glow - bleeds into Form section */}
            <div className="absolute pointer-events-none bottom-[-50%] left-1/2 -translate-x-1/2 w-[1200px] h-[700px] bg-indigo-600/25 rounded-full blur-[220px]" />

            <div className="relative z-10 text-center max-w-3xl mx-auto px-4">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
                  {t('finalCta.heading')}
                </span>
              </h2>
              <p className="text-xl text-gray-400 mb-10">
                {t('finalCta.subheading')}
              </p>
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={scrollToForm}
                  className="group relative bg-white/90 hover:bg-white text-indigo-900 font-black text-base sm:text-lg md:text-xl uppercase tracking-wide px-6 sm:px-10 md:px-14 py-4 md:py-5 rounded-xl shadow-[0_0_30px_rgba(168,85,247,0.25),0_0_50px_rgba(139,92,246,0.15)] hover:shadow-[0_0_40px_rgba(168,85,247,0.35),0_0_60px_rgba(139,92,246,0.2)] transition-all duration-300 hover:-translate-y-0.5 border-2 border-indigo-300/40"
                >
                  {t('finalCta.cta')}
                  <span className="ml-2 inline-block group-hover:translate-x-1 transition-transform">&rarr;</span>
                </button>
                <a
                  href={`sms:+1${companyPhone.replace(/\D/g, '')}`}
                  className="text-gray-400 hover:text-white text-sm underline transition-colors"
                >
                  {t('finalCta.preferToTalk')} {companyPhone}
                </a>
              </div>
              <TrustIndicators
                className="mt-10 justify-center"
                variant="premium"
                items={[t('trustIndicators.noObligation'), t('trustIndicators.freeConsultation'), t('trustIndicators.fastResponse')]}
              />
            </div>
          </section>
        )}

        {/* Contact Form + Footer Section - Combined into one seamless section */}
        <section id="contact-form" className="relative pt-20 md:pt-28 pb-12">
          {/* Ambient glows for the entire form + footer area */}
          <div className="absolute pointer-events-none top-0 left-1/2 -translate-x-1/2 w-[800px] md:w-[1200px] h-[500px] md:h-[700px] bg-indigo-600/28 rounded-full blur-[150px] md:blur-[200px]" />
          <div className="absolute pointer-events-none top-[15%] left-0 w-[600px] h-[500px] bg-violet-500/22 rounded-full blur-[130px]" />
          <div className="absolute pointer-events-none top-[15%] right-0 w-[600px] h-[500px] bg-indigo-500/22 rounded-full blur-[130px]" />
          {/* Center/bottom glows for footer area */}
          <div className="absolute pointer-events-none bottom-[10%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-600/20 rounded-full blur-[200px]" />
          <div className="absolute pointer-events-none bottom-0 left-1/4 w-[500px] h-[400px] bg-violet-500/15 rounded-full blur-[180px]" />
          <div className="absolute pointer-events-none bottom-0 right-1/4 w-[500px] h-[400px] bg-indigo-500/15 rounded-full blur-[180px]" />

          <div className="relative z-10">
          {/* Form Card */}
          <div className="max-w-xl mx-auto px-4 sm:px-6">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-800 p-6 text-white text-center relative overflow-hidden">
                <div className="absolute pointer-events-none top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute pointer-events-none bottom-0 left-0 w-32 h-32 bg-indigo-400/20 rounded-full blur-2xl" />
                {showOfferForm && !hasSubmittedOffer && (
                  <button
                    type="button"
                    onClick={() => setShowOfferForm(false)}
                    className="absolute top-3 left-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white z-10 transition-colors"
                    aria-label="Go back"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur rounded-2xl mb-3 shadow-lg">
                    <Home className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold">{t('form.header')}</h2>
                  <p className="text-indigo-100 mt-2 text-sm max-w-md mx-auto">{t('form.subtitle')}</p>
                </div>
              </div>

              {hasSubmittedOffer ? (
                /* Success state */
                <div className="p-8 text-center space-y-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{t('form.successTitle')}</h3>
                  <p className="text-gray-500 text-sm">{t('form.successMessage')}</p>
                </div>
              ) : !showOfferForm ? (
                <div className="p-8 space-y-5 bg-white">
                  <div className="text-center mb-6">
                    <p className="text-gray-700 text-lg font-semibold">{t('form.interestedInProperty')} {property.address}?</p>
                  </div>
                  <CTAButton size="full" variant="secondary" onClick={() => setShowOfferForm(true)}>
                    {t('cta.yesInterested')}
                  </CTAButton>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" size="lg" className="w-full border-indigo-400/50 text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-400 hover:text-white" asChild>
                      <a href={`tel:+1${companyPhone.replace(/\D/g, '')}`}>
                        <Phone className="h-4 w-4 mr-2" />
                        {t('cta.callUs')}
                      </a>
                    </Button>
                    <Button variant="outline" size="lg" className="w-full border-indigo-400/50 text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-400 hover:text-white" asChild>
                      <a href={`sms:+1${companyPhone.replace(/\D/g, '')}`}>
                        <Phone className="h-4 w-4 mr-2" />
                        {t('cta.textUs')}
                      </a>
                    </Button>
                  </div>
                  <TrustIndicators className="justify-center" variant="premium" />
                </div>
              ) : (
                <form onSubmit={handleOfferSubmit} className="p-4 sm:p-6 space-y-4 bg-white">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">{t('form.firstName')} *</Label>
                    <Input
                      value={offerForm.firstName}
                      onChange={(e) => setOfferForm(prev => ({ ...prev, firstName: e.target.value }))}
                      required
                      placeholder={t('form.placeholderFirstName')}
                      className="mt-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">{t('form.phone')} *</Label>
                    <PhoneInput
                      value={offerForm.phone}
                      onChange={(value) => setOfferForm(prev => ({ ...prev, phone: value || '' }))}
                      required
                      placeholder={t('form.placeholderPhone')}
                      defaultCountry="US"
                      className="mt-1 [&_input]:bg-white [&_input]:border-gray-300 [&_input]:text-gray-900 [&_input]:placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">{t('form.emailOptional')}</Label>
                    <Input
                      type="email"
                      value={offerForm.email}
                      onChange={(e) => setOfferForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder={t('form.placeholderEmail')}
                      className="mt-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">{t('form.questionLabel')}</Label>
                    <Textarea
                      value={offerForm.question}
                      onChange={(e) => setOfferForm(prev => ({ ...prev, question: e.target.value }))}
                      placeholder={t('form.questionPlaceholder')}
                      className="mt-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                      rows={3}
                    />
                  </div>
                  <CTAButton
                    type="submit"
                    size="full"
                    disabled={createContact.isPending}
                  >
                    {createContact.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {t('form.submitting')}
                      </>
                    ) : (
                      t('form.submitCta')
                    )}
                  </CTAButton>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-gray-400 hover:text-white hover:bg-white/10"
                    onClick={() => setShowOfferForm(false)}
                  >
                    {t('common.cancel')}
                  </Button>
                  <TrustIndicators className="justify-center" variant="premium" />
                </form>
              )}
            </div>
          </div>

          {/* Footer content - floating within the same section */}
          <div className="max-w-6xl mx-auto px-4 text-center mt-20 text-white">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">P</span>
            </div>
            <h3 className="text-xl font-bold mb-2">{t('footer.companyName')}</h3>
            <p className="text-gray-400 mb-4">{t('footer.tagline')}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a href={`tel:+1${companyPhone.replace(/\D/g, '')}`} className="text-indigo-400 hover:text-indigo-300 font-semibold">
                {companyPhone}
              </a>
              <span className="hidden sm:inline text-gray-600">•</span>
              <a href="mailto:info@purplehomessolutions.com" className="text-indigo-400 hover:text-indigo-300">
                info@purplehomessolutions.com
              </a>
            </div>
            <p className="text-gray-500 text-sm mt-6">
              © {new Date().getFullYear()} {t('footer.companyName')}. {t('footer.allRightsReserved')}
            </p>
          </div>
          </div>
        </section>
      </main>

      {/* Form Modal - Opens from any CTA */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsFormModalOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setIsFormModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors z-10"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-center text-white rounded-t-2xl">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur rounded-xl mb-3">
                <Home className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-bold">{t('form.header')}</h2>
              <p className="text-indigo-100 text-sm mt-2">{t('form.subtitle')}</p>
            </div>

            {/* Form */}
            <form onSubmit={handleOfferSubmit} className="p-5 space-y-4 bg-white rounded-b-2xl">
              <div>
                <Label className="text-sm font-semibold text-gray-700">{t('form.firstName')} *</Label>
                <Input
                  value={offerForm.firstName}
                  onChange={(e) => setOfferForm(prev => ({ ...prev, firstName: e.target.value }))}
                  required
                  placeholder={t('form.placeholderFirstName')}
                  className="mt-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">{t('form.phone')} *</Label>
                <PhoneInput
                  value={offerForm.phone}
                  onChange={(value) => setOfferForm(prev => ({ ...prev, phone: value || '' }))}
                  required
                  placeholder={t('form.placeholderPhone')}
                  defaultCountry="US"
                  className="mt-1 [&_input]:bg-white [&_input]:border-gray-300 [&_input]:text-gray-900 [&_input]:placeholder:text-gray-400"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">{t('form.emailOptional')}</Label>
                <Input
                  type="email"
                  value={offerForm.email}
                  onChange={(e) => setOfferForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder={t('form.placeholderEmail')}
                  className="mt-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">{t('form.questionLabel')}</Label>
                <Textarea
                  value={offerForm.question}
                  onChange={(e) => setOfferForm(prev => ({ ...prev, question: e.target.value }))}
                  placeholder={t('form.questionPlaceholder')}
                  className="mt-1 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:ring-indigo-500"
                  rows={3}
                />
              </div>
              <CTAButton
                type="submit"
                size="full"
                disabled={createContact.isPending}
              >
                {createContact.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t('form.submitting')}
                  </>
                ) : (
                  t('form.submitCta')
                )}
              </CTAButton>
              <p className="text-center text-gray-400 text-xs">
                {t('form.bySubmitting')}
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Exit Intent Lead Capture */}
      <ExitIntentModal
        open={showExitIntent}
        onClose={dismissExitIntent}
        onSubmitted={markExitConverted}
        isDarkMode={false}
        propertyAddress={property?.address}
        source="property-detail"
      />
    </div>
  );
}
