import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Bed, Bath, Maximize2, MapPin, Phone, Wrench, Home,
  DollarSign, Loader2, Share2, Check, ExternalLink, Video,
  Shield, Clock, Users, Award, CheckCircle, CreditCard, X
} from 'lucide-react';
import type { PropertyCondition, PropertyType, Property } from '@/types';
import type { FunnelContent } from '@/types/funnel';
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

// Import Funnel Components
import {
  CTAButton,
  TrustBar,
  TrustIndicators,
  LiveViewers,
  QuoteTestimonial,
  TestimonialMarquee,
  StatsBar,
  FunnelFAQ,
  FAQCTA,
  SectionHeader,
  TwoColumnLayout,
  StickyMobileCTA,
  FloatingActionButton,
  PremiumTrustStrip,
} from '@/components/funnel';
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

function GradientPrice({ amount, suffix }: { amount: number; suffix?: string }) {
  return (
    <span className="bg-gradient-to-r from-purple-300 via-violet-300 to-purple-300 bg-clip-text text-transparent">
      ${amount.toLocaleString()}{suffix}
    </span>
  );
}

function GradientMoney({ amount }: { amount: number }) {
  return (
    <span className="bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent">
      ${amount.toLocaleString()}
    </span>
  );
}

function GradientNumber({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`bg-gradient-to-b from-white via-purple-200 to-purple-400/50 bg-clip-text text-transparent ${className}`}>
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
    { value: timeLeft.days, label: 'Days' },
    { value: timeLeft.hours, label: 'Hours' },
    { value: timeLeft.minutes, label: 'Min' },
    { value: timeLeft.seconds, label: 'Sec' },
  ];

  return (
    <div className="flex justify-center gap-3 md:gap-5 mb-12">
      {units.map((unit, index) => (
        <div key={index} className="text-center">
          <div className="relative">
            {/* Glow behind */}
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/30 to-violet-500/30 rounded-2xl blur-xl scale-110" />
            <div className="relative bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-2xl px-4 md:px-6 py-4 md:py-6 border border-purple-500/30 shadow-[0_0_30px_rgba(139,92,246,0.2)]">
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
  const sectionRef = useRef<HTMLElement>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [counts, setCounts] = useState([0, 0, 0, 0]);

  const statsConfig = [
    { target: 500, duration: 2500, labelTop: 'Families', labelBottom: 'Helped', suffix: '+', icon: Users },
    { target: 15, duration: 2000, labelTop: 'Years', labelBottom: 'Experience', suffix: '+', icon: Clock },
    { target: 98, duration: 2200, labelTop: 'Satisfaction', labelBottom: 'Rate', suffix: '%', icon: Award },
    { target: 24, duration: 1800, labelTop: 'Hour', labelBottom: 'Response', prefix: '<', icon: Shield },
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
      <div className="absolute top-[-25%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-purple-600/20 rounded-full blur-[200px]" />
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[200px]" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/15 rounded-full blur-[200px]" />
      {/* Bottom glows bleed strongly into Neighborhood section */}
      <div className="absolute bottom-[-40%] left-1/2 -translate-x-1/2 w-[1000px] h-[700px] bg-purple-600/22 rounded-full blur-[220px]" />
      <div className="absolute bottom-[-25%] right-1/3 w-[500px] h-[400px] bg-violet-500/15 rounded-full blur-[180px]" />


      <div className="relative z-10 max-w-6xl mx-auto px-4">
        {/* Section header - Enhanced Typography with Reveal */}
        <Reveal className="text-center mb-20">
          <span className="inline-block px-5 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-xs font-bold uppercase tracking-[0.2em] mb-6">
            Proven Track Record
          </span>
          <h2 className="text-3xl md:text-4xl text-white leading-tight">
            <span className="font-light">Numbers That</span>{' '}
            <span className="font-bold italic bg-gradient-to-r from-purple-400 via-violet-400 to-purple-400 bg-clip-text text-transparent pr-1">
              Speak
            </span>
          </h2>
          <p className="text-gray-500 text-lg mt-4 font-light tracking-wide">for themselves</p>
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
                  <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 h-32 w-px bg-gradient-to-b from-transparent via-purple-500/40 to-transparent" />
                )}

                {/* Icon with glow */}
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-purple-500/30 rounded-2xl blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 group-hover:scale-110 group-hover:border-purple-400/50 transition-all duration-300">
                    <Icon className="h-8 w-8 text-purple-400" />
                  </div>
                </div>

                {/* Animated number - Dramatic Typography */}
                <div className="relative mb-4">
                  {/* Number glow */}
                  <div className="absolute inset-0 bg-gradient-to-b from-purple-400/20 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative flex items-baseline justify-center">
                    {/* Prefix */}
                    {stat.prefix && (
                      <span className="text-3xl md:text-4xl font-light text-purple-400/70 mr-1">
                        {stat.prefix}
                      </span>
                    )}

                    {/* Main number - BOLD */}
                    <span className="text-6xl md:text-7xl lg:text-8xl font-black bg-gradient-to-b from-white via-white to-white/70 bg-clip-text text-transparent tabular-nums tracking-tight">
                      {count}
                    </span>

                    {/* Suffix - smaller, superscript style */}
                    {stat.suffix && (
                      <span className="text-2xl md:text-3xl font-bold text-purple-400 ml-1 -translate-y-4">
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
                  <div className="text-xs md:text-sm font-light italic tracking-wide text-purple-400/80">
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
function VirtualTourSection({ virtualTourUrl, scrollToForm }: { virtualTourUrl: string; scrollToForm: () => void }) {
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
    setIsPlaying(true);
  };

  return (
    <section className="relative py-16 md:py-20">
      {/* Ambient glows - receives bleed from above, bleeds to next section */}
      <div className="absolute top-[-25%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-purple-600/20 rounded-full blur-[200px]" />
      <div className="absolute top-[30%] left-0 w-[500px] h-[400px] bg-violet-500/15 rounded-full blur-[180px]" />
      <div className="absolute top-[40%] right-0 w-[450px] h-[350px] bg-purple-400/12 rounded-full blur-[150px]" />
      <div className="absolute bottom-[-30%] left-1/3 w-[700px] h-[500px] bg-purple-500/18 rounded-full blur-[200px]" />

      <div className="relative z-10 max-w-5xl mx-auto px-4">
        {/* Header */}
        <Reveal className="text-center mb-10">
          <span className="inline-block px-5 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-xs font-bold uppercase tracking-[0.2em] mb-6">
            Virtual Tour
          </span>
          <h2 className="text-3xl md:text-4xl text-white mb-3">
            <span className="font-light">Walk Through</span>{' '}
            <span className="font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">Your Future Home</span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Take a virtual tour and imagine yourself living here. See every room, every detail.
          </p>
        </Reveal>

        {/* Video with GHL-style click-to-play overlay */}
        <Reveal delay={150}>
          <div className="relative group">
            {/* Outer glow */}
            <div className="absolute -inset-2 bg-gradient-to-r from-purple-600/30 via-violet-500/30 to-purple-600/30 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

            {/* Video container */}
            <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-purple-500/30 shadow-2xl">
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/40" />

                  {/* Large centered play button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      {/* Pulsing ring behind play button */}
                      <div className="absolute inset-0 w-24 h-24 md:w-32 md:h-32 bg-purple-500/30 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                      <div className="absolute inset-0 w-24 h-24 md:w-32 md:h-32 bg-purple-500/20 rounded-full animate-pulse" />

                      {/* Play button */}
                      <div className="relative w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-purple-500 to-violet-600 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(139,92,246,0.5)] group-hover/play:shadow-[0_0_80px_rgba(139,92,246,0.7)] group-hover/play:scale-110 transition-all duration-300">
                        <svg className="w-10 h-10 md:w-14 md:h-14 text-white ml-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Click to watch text */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2">
                      <svg className="w-4 h-4 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.414a5 5 0 001.414 1.414m2.828-9.9a9 9 0 0112.728 0" />
                      </svg>
                      <span className="text-white text-sm font-medium">Click to watch the tour</span>
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
          <p className="text-purple-300/70 text-sm mb-4">Like what you see?</p>
          <button
            onClick={scrollToForm}
            className="inline-flex items-center gap-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-white font-semibold px-6 py-3 rounded-xl transition-all"
          >
            Schedule an In-Person Tour
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

  // Fetch all properties and find the one matching the slug
  const { data: airtableData, isLoading, isError } = useAirtableProperties(200);

  // Find property by matching generated slug
  const property = useMemo(() => {
    if (!airtableData?.properties || !slug) return null;

    for (const p of airtableData.properties) {
      const city = `${p.city || ''}${p.state ? `, ${p.state}` : ''}${p.zipCode ? ` ${p.zipCode}` : ''}`;
      const propertySlug = generatePropertySlug(p.address, city);
      if (propertySlug === slug) {
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
  const [offerForm, setOfferForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    offerAmount: '',
    message: ''
  });
  const [copied, setCopied] = useState(false);

  // Fetch funnel content when property is available (need recordId for Airtable lookup)
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
          }
        }
      } catch (error) {
        console.error('Error fetching funnel content:', error);
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

  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;

    try {
      // Create contact directly via Contact API (more reliable than Form API)
      await createContact.mutateAsync({
        firstName: offerForm.firstName,
        lastName: offerForm.lastName,
        email: offerForm.email,
        phone: offerForm.phone,
        tags: ['Funnel Lead', 'Interested Buyer', `Property: ${property.address}`],
        customFields: [
          // Budget/Offer Amount
          { id: 'RsonBtVCorhBi4ehUeAY', value: offerForm.offerAmount || '' },
          // Property Address interested in
          { id: 'UcJ0Qoz3kh0OjC9oLVsK', value: property.address },
          // Property City
          { id: 'JiQiZk4AwSIuggxs8ryC', value: property.city },
          // Notes/Message
          { id: 'wAnKlytGK8s8dmL1vBkV', value: offerForm.message || `Interested in ${property.address} - $${property.price.toLocaleString()}` },
        ],
      });

      toast.success('Your application has been submitted! We\'ll contact you within 24 hours.');
      setOfferForm({ firstName: '', lastName: '', email: '', phone: '', offerAmount: '', message: '' });
      setShowOfferForm(false);
    } catch (error) {
      console.error('Contact creation error:', error);
      toast.error('Failed to submit. Please try again or call us directly.');
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
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const scrollToForm = () => {
    // Open modal instead of scrolling - users can apply from anywhere
    setIsFormModalOpen(true);
    setShowOfferForm(true);
  };

  // Extract first sentence from problem content for headline
  const extractProblemHeadline = (problem: string): string => {
    // Extract first sentence (ends with ? or .)
    const firstSentence = problem.match(/^[^.?!]+[.?!]/)?.[0] || problem.split('.')[0];
    // If it's a question, use it directly
    if (firstSentence.includes('?')) return firstSentence.trim();
    // Otherwise, turn it into a question or return compelling default
    return firstSentence.trim();
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
        { icon: '✗', text: 'Banks saying no to your first home?' },
        { icon: '✗', text: 'Saving feels endless with no progress?' },
        { icon: '✗', text: 'Rent keeps rising, equity stays at zero?' },
      ],
      'credit-challenged': [
        { icon: '✗', text: 'Credit score holding you back?' },
        { icon: '✗', text: 'Rejected by traditional lenders?' },
        { icon: '✗', text: 'Past mistakes blocking your future?' },
      ],
      'self-employed': [
        { icon: '✗', text: 'Income too hard to document?' },
        { icon: '✗', text: 'Tax returns not showing your true earnings?' },
        { icon: '✗', text: 'Banks don\'t understand your business?' },
      ],
      'investor': [
        { icon: '✗', text: 'Traditional financing too slow?' },
        { icon: '✗', text: 'Tired of complicated loan processes?' },
        { icon: '✗', text: 'Missing deals due to funding delays?' },
      ],
      'move-up-buyer': [
        { icon: '✗', text: 'Current home equity tied up?' },
        { icon: '✗', text: 'Need to sell before you can buy?' },
        { icon: '✗', text: 'Market timing working against you?' },
      ],
      'general': [
        { icon: '✗', text: 'Banks keep saying no?' },
        { icon: '✗', text: 'Credit not where it needs to be?' },
        { icon: '✗', text: 'Saving for years with no progress?' },
      ],
    };
    return painPointsBySegment[segment || 'general'] || painPointsBySegment['general'];
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-purple-500 mx-auto" />
          <p className="text-sm font-medium text-gray-600">Loading property...</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Property Not Found</h1>
          <p className="text-gray-600">
            This property may no longer be available or the link may be incorrect.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <CTAButton onClick={() => navigate('/listings')} variant="secondary">
              Browse All Listings
            </CTAButton>
            <Button variant="outline" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Parse FAQ from funnel content
  const parsedFAQs = funnelContent?.faq
    ? funnelContent.faq
        .split(/(?=Q:)/g)
        .filter(Boolean)
        .map((qa) => {
          const questionMatch = qa.match(/Q:\s*(.+?)(?=A:|$)/s);
          const answerMatch = qa.match(/A:\s*(.+)/s);
          return {
            question: questionMatch?.[1]?.trim() || '',
            answer: answerMatch?.[1]?.trim() || '',
          };
        })
        .filter((item) => item.question && item.answer)
    : [];

  return (
    <div className="min-h-screen bg-white">
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
            <Link to="/listings" className="flex items-center gap-2">
              <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="hidden sm:block text-lg font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
                Purple Homes
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="gap-2"
            >
              {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
            </Button>
            <CTAButton size="sm" onClick={scrollToForm} className="hidden sm:inline-flex">
              Get Pre-Qualified
            </CTAButton>
          </div>
        </div>
      </header>

      {/* Main Content - One infinite black canvas */}
      <main className="relative bg-black">
        {/* DRAMATIC HERO SECTION - PURPLE HOMES BRANDED - MAXIMUM IMPACT */}
        <section className="relative overflow-hidden">
          {/* Dramatic purple ambient lighting */}
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] md:w-[1200px] h-[400px] md:h-[600px] bg-purple-600/30 rounded-full blur-[150px] md:blur-[200px]" />
          <div className="absolute bottom-0 left-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-violet-700/20 rounded-full blur-[100px] md:blur-[150px]" />
          <div className="absolute top-1/2 right-0 w-[250px] md:w-[400px] h-[250px] md:h-[400px] bg-purple-500/15 rounded-full blur-[80px] md:blur-[120px]" />


          <div className="relative max-w-5xl mx-auto px-4 py-16 md:py-24 lg:py-32">
            <div className="text-center">
              {/* Eyebrow - Mobile optimized */}
              <HeroEntrance delay={0}>
                <div className="inline-flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 bg-purple-500/25 border border-purple-400/40 rounded-full text-purple-300 text-xs md:text-sm font-bold uppercase tracking-wider mb-6 md:mb-8 backdrop-blur-sm">
                  <span className="relative flex h-2 w-2 md:h-2.5 md:w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 md:h-2.5 md:w-2.5 bg-purple-400"></span>
                  </span>
                  <span className="truncate max-w-[200px] md:max-w-none">Limited Time in {property.city}</span>
                </div>
              </HeroEntrance>

              {/* Main Headline - Dynamic from AI hook with structured styling */}
              <HeroEntrance delay={100}>
                {funnelLoading ? (
                  /* Loading skeleton */
                  <div className="animate-pulse space-y-4">
                    <div className="h-12 sm:h-14 md:h-16 lg:h-20 bg-white/10 rounded-lg w-3/4 mx-auto" />
                    <div className="h-10 sm:h-12 md:h-14 bg-purple-500/20 rounded-lg w-1/2 mx-auto" />
                    <div className="h-6 sm:h-8 bg-white/5 rounded-lg w-2/3 mx-auto" />
                  </div>
                ) : funnelContent?.hook ? (
                  (() => {
                    const hook = funnelContent.hook;

                    // Check if hook is structured (new format) or string (old format)
                    const isStructured = typeof hook === 'object' && hook !== null && 'headline' in (hook as object);

                    if (isStructured) {
                      // NEW STRUCTURED FORMAT - clean, tight layout
                      const { headline, subheadline, highlight, benefit, urgency, bonus } = hook as {
                        headline: string;
                        subheadline?: string;
                        highlight?: string;
                        benefit?: string;
                        urgency?: string;
                        bonus?: string;
                      };

                      // Render headline with highlighted phrase
                      const renderHeadline = () => {
                        if (!highlight || !headline.includes(highlight)) {
                          return headline;
                        }
                        const parts = headline.split(highlight);
                        return (
                          <>
                            {parts[0]}
                            <span className="relative inline-block mx-1">
                              <span className="absolute inset-x-[-4px] md:inset-x-[-8px] bottom-[2px] md:bottom-[4px] top-[4px] md:top-[8px] bg-gradient-to-r from-purple-500 via-violet-400 to-purple-500 -skew-x-2 shadow-[0_0_40px_rgba(139,92,246,0.5)]" />
                              <span className="relative px-1 md:px-2">{highlight}</span>
                            </span>
                            {parts[1]}
                          </>
                        );
                      };

                      return (
                        <>
                          {/* Main Headline with highlighted phrase */}
                          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white leading-[1.1] mb-3 md:mb-4 tracking-tight max-w-5xl mx-auto break-words">
                            {renderHeadline()}
                          </h1>

                          {/* Subheadline - Supporting line */}
                          {subheadline && (
                            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-medium text-gray-400 mb-6 md:mb-8 max-w-3xl mx-auto leading-relaxed">
                              {subheadline}
                            </p>
                          )}

                          {/* Urgency + Bonus - Amber badge */}
                          {(urgency || bonus) && (
                            <div className="inline-flex flex-wrap items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-amber-500/20 via-orange-500/25 to-amber-500/20 border border-amber-400/40 rounded-full backdrop-blur-sm mb-6 md:mb-8">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                              </span>
                              <span className="text-sm md:text-base font-semibold text-amber-200">
                                🔥 {urgency}{urgency && bonus ? ' + ' : ''}{bonus && <span className="text-emerald-400">{bonus}</span>}
                              </span>
                            </div>
                          )}
                        </>
                      );
                    }

                    // OLD STRING FORMAT - backward compatible, show as-is
                    return (
                      <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white leading-[1.2] mb-6 md:mb-8 tracking-tight max-w-4xl mx-auto">
                        {hook}
                      </h1>
                    );
                  })()
                ) : (
                  /* Fallback when no funnel content exists */
                  <>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white leading-[1.1] mb-2 md:mb-3 tracking-tight">
                      Stop Paying Your
                    </h1>
                    <div className="mb-3 md:mb-4">
                      <span className="relative inline-block">
                        <span className="absolute inset-x-[-4px] md:inset-x-[-8px] bottom-[2px] md:bottom-[4px] top-[4px] md:top-[8px] bg-gradient-to-r from-purple-500 via-violet-400 to-purple-500 -skew-x-2 shadow-[0_0_40px_rgba(139,92,246,0.5)]" />
                        <span className="relative text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white px-1 md:px-2 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                          Landlord's Mortgage
                        </span>
                      </span>
                    </div>
                    <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-400 mb-6 md:mb-8">
                      Start Building <span className="text-white">Your Own Wealth</span>
                    </p>
                  </>
                )}
              </HeroEntrance>

              {/* Price callout with benefit - Combined line */}
              <HeroEntrance delay={250}>
                {(() => {
                  // Get benefit from structured hook if available
                  const hook = funnelContent?.hook;
                  const isStructured = typeof hook === 'object' && hook !== null && 'headline' in (hook as object);
                  const benefit = isStructured ? (hook as { benefit?: string }).benefit : null;

                  return (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 md:gap-6 mb-8 md:mb-10 px-4">
                      {/* Price with glow - DATA-DRIVEN GRADIENT */}
                      <div className="relative">
                        <span className="absolute inset-0 bg-purple-500/20 blur-2xl scale-150" />
                        <span className="relative text-4xl sm:text-5xl md:text-6xl font-black drop-shadow-[0_0_30px_rgba(168,85,247,0.6)]">
                          <GradientPrice
                            amount={property.monthlyPayment || Math.round(property.price * 0.006)}
                            suffix="/mo"
                          />
                        </span>
                      </div>

                      {/* Separator + Benefit */}
                      <div className="flex items-center gap-3 sm:gap-4">
                        <span className="hidden sm:block text-2xl md:text-3xl text-gray-600">—</span>
                        <span className="relative inline-block">
                          <span className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-violet-500/30 -skew-x-2 rounded" />
                          <span className="relative italic font-bold text-purple-300 text-lg sm:text-xl md:text-2xl px-3 py-1">
                            {benefit || 'No bank qualifying'}
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </HeroEntrance>

              {/* Trust indicators - Mobile stacked, desktop inline */}
              <HeroEntrance delay={400}>
                <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-x-6 md:gap-x-8 gap-y-2 text-sm md:text-base text-gray-300 mb-8 md:mb-12">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-purple-400" />
                    <span className="font-medium">No Bank Qualifying</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-purple-400" />
                    <span className="font-medium">Move In 30 Days</span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-purple-400" />
                    <span className="font-medium">Build Equity Now</span>
                  </div>
                </div>
              </HeroEntrance>

              {/* CTA - MAXIMUM glow, mobile friendly */}
              <HeroEntrance delay={550}>
                <div className="flex flex-col items-center gap-3 md:gap-4 px-4">
                  <button
                    onClick={scrollToForm}
                    className="group relative w-full sm:w-auto bg-white hover:bg-purple-50 text-purple-900 font-black text-base sm:text-lg md:text-xl uppercase tracking-wide px-6 sm:px-8 md:px-14 py-4 md:py-5 rounded-xl shadow-[0_0_60px_rgba(168,85,247,0.5),0_0_100px_rgba(139,92,246,0.3)] hover:shadow-[0_0_80px_rgba(168,85,247,0.6),0_0_120px_rgba(139,92,246,0.4)] transition-all duration-300 hover:-translate-y-1 border-2 border-purple-300/50"
                  >
                    Check If I Qualify
                    <span className="ml-2 inline-block group-hover:translate-x-1 transition-transform">&rarr;</span>
                  </button>
                  <span className="text-gray-500 text-xs md:text-sm">Takes less than 2 minutes • No credit check</span>
                </div>
              </HeroEntrance>
            </div>
          </div>

          {/* Bottom fade to property section */}
          <div className="absolute bottom-0 left-0 right-0 h-24 md:h-32 bg-gradient-to-t from-black to-transparent" />
        </section>

        {/* Property Image Section - Premium */}
        <section className="relative">
          {/* Top glow connecting from hero section */}
          <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] md:w-[1200px] h-[400px] md:h-[500px] bg-purple-600/25 rounded-full blur-[150px] md:blur-[200px]" />
          {/* Ambient glow behind image */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-purple-600/20 rounded-full blur-[200px]" />

          <div className="relative max-w-5xl mx-auto px-4 pt-8 md:pt-12 z-10">
            {/* Image with premium frame */}
            <div className="relative group">
              {/* Outer glow */}
              <div className="absolute -inset-2 bg-gradient-to-r from-purple-600/40 via-violet-500/40 to-purple-600/40 rounded-2xl md:rounded-3xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

              {/* Image container */}
              <div className="relative rounded-xl md:rounded-2xl overflow-hidden border-2 border-purple-500/40 shadow-2xl">
                <PropertyImageGallery
                  images={property.images || [property.heroImage]}
                  heroImage={property.heroImage}
                  onHeroChange={() => {}}
                  onImagesChange={() => {}}
                  editable={false}
                />
              </div>
            </div>
          </div>

          {/* Property Info - Premium Card Style */}
          <div className="relative z-10 max-w-5xl mx-auto px-4 pt-8 pb-10 md:pt-10 md:pb-14">
            <div className="bg-gradient-to-br from-[#1a1625] to-[#0f0d15] border border-purple-500/30 rounded-2xl p-6 md:p-8 shadow-[0_0_60px_rgba(139,92,246,0.15)]">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                {/* Left - Price & Address */}
                <div className="text-center lg:text-left">
                  {/* Price row */}
                  <div className="flex flex-wrap items-baseline justify-center lg:justify-start gap-3 mb-3">
                    <span className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight">
                      ${property.price.toLocaleString()}
                    </span>
                    {property.monthlyPayment !== undefined && (
                      <span className="px-3 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-sm md:text-base font-bold">
                        ${property.monthlyPayment.toLocaleString()}/mo
                      </span>
                    )}
                  </div>

                  {/* Address */}
                  <h2 className="text-xl md:text-2xl text-white font-semibold mb-1">{property.address}</h2>
                  <p className="text-purple-300/70 flex items-center justify-center lg:justify-start gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {property.city}
                  </p>
                </div>

                {/* Right - Specs Grid */}
                <div className="flex justify-center lg:justify-end">
                  <div className="inline-grid grid-cols-3 gap-2 sm:gap-4 md:gap-6">
                    <div className="text-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 mx-auto mb-2 bg-purple-500/20 border border-purple-500/30 rounded-xl flex items-center justify-center">
                        <Bed className="h-5 w-5 md:h-6 md:w-6 text-purple-400" />
                      </div>
                      <p className="text-white font-bold text-lg md:text-xl">{property.beds}</p>
                      <p className="text-purple-300/60 text-xs uppercase tracking-wider">Beds</p>
                    </div>
                    <div className="text-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 mx-auto mb-2 bg-purple-500/20 border border-purple-500/30 rounded-xl flex items-center justify-center">
                        <Bath className="h-5 w-5 md:h-6 md:w-6 text-purple-400" />
                      </div>
                      <p className="text-white font-bold text-lg md:text-xl">{property.baths}</p>
                      <p className="text-purple-300/60 text-xs uppercase tracking-wider">Baths</p>
                    </div>
                    {property.sqft && (
                      <div className="text-center">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 mx-auto mb-2 bg-purple-500/20 border border-purple-500/30 rounded-xl flex items-center justify-center">
                          <Maximize2 className="h-5 w-5 md:h-6 md:w-6 text-purple-400" />
                        </div>
                        <p className="text-white font-bold text-lg md:text-xl">{property.sqft.toLocaleString()}</p>
                        <p className="text-purple-300/60 text-xs uppercase tracking-wider">Sqft</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom row - Live viewers + scarcity */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-purple-500/20">
                <LiveViewers count={Math.floor(Math.random() * 5) + 2} variant="premium" />
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-green-400 font-medium">Available Now</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-white/70">Ready for move-in</span>
                </div>
              </div>
            </div>
          </div>

          {/* Premium Trust Strip - inside section for seamless background */}
          <PremiumTrustStrip className="pb-6" />
        </section>

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
                  <div key={i} className="bg-purple-50 rounded-xl p-5 h-24" />
                ))}
              </div>
            </div>

            {/* CTA Section Skeleton */}
            <div className="bg-gray-100 py-16">
              <div className="max-w-2xl mx-auto px-4 text-center">
                <div className="h-8 w-2/3 bg-gray-200 rounded mx-auto mb-6" />
                <div className="h-12 w-48 bg-purple-200 rounded-xl mx-auto" />
              </div>
            </div>
          </div>
        )}

        {/* Problem/Challenge Section - Premium Purple Homes */}
        {!funnelLoading && funnelContent?.problem && (
          <section className="relative py-24 md:py-32">
            {/* Enhanced purple ambient glow - bottom glow bleeds into Solution section */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-purple-600/15 rounded-full blur-[150px]" />
              <div className="absolute bottom-[-20%] right-1/4 w-[700px] h-[600px] bg-violet-500/15 rounded-full blur-[150px]" />
              <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-purple-400/8 rounded-full blur-[100px]" />
            </div>

            <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
              {/* Section Header with Animation */}
              <Reveal className="text-center mb-16 md:mb-20">
                <div className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-purple-500 text-white text-[11px] font-black uppercase tracking-[0.2em] mb-8 shadow-xl shadow-purple-500/40">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                  </span>
                  The Challenge
                </div>
                <h2 className="text-5xl sm:text-6xl md:text-7xl font-black leading-[1.0] tracking-[-0.02em] max-w-4xl mx-auto mb-6">
                  <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                    {stripMarkers(extractProblemHeadline(funnelContent.problem))}
                  </span>
                </h2>
                <p className="text-lg md:text-xl text-gray-400 font-light max-w-2xl mx-auto">
                  You're not alone. <span className="text-purple-300 font-medium">Thousands</span> face these same barriers every day.
                </p>
              </Reveal>

              {/* Two Column Layout - Better vertical alignment */}
              <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-stretch">
                {/* Left - Dynamic Pain Points with Enhanced Styling */}
                <div className="flex flex-col justify-center space-y-5">
                  {getPainPoints(funnelContent.inputs?.buyerSegment).map((pain, i) => (
                    <Reveal key={i} delay={i * 150}>
                      <div className="group relative flex items-center gap-5 bg-gradient-to-r from-white/[0.06] to-white/[0.02] border border-purple-400/20 rounded-2xl p-6 hover:border-purple-400/50 hover:bg-white/[0.08] hover:translate-x-2 transition-all duration-300 cursor-default shadow-lg shadow-purple-900/20 hover:shadow-purple-500/20">
                        {/* Glow effect on hover */}
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/0 to-purple-500/0 group-hover:from-purple-500/5 group-hover:to-transparent transition-all duration-300" />
                        <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500/40 to-purple-600/30 flex items-center justify-center flex-shrink-0 border border-purple-400/40 group-hover:border-purple-300/60 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-purple-500/30 transition-all duration-300">
                          <span className="text-purple-200 text-2xl font-black">{pain.icon}</span>
                        </div>
                        <span className="relative text-white text-xl font-semibold group-hover:text-purple-100 transition-colors leading-snug">{pain.text}</span>
                      </div>
                    </Reveal>
                  ))}
                </div>

                {/* Right - Emotional Empathy Card with Enhanced Animation */}
                <Reveal delay={300}>
                  <div className="relative h-full flex items-center">
                    {/* Multi-layer animated glow behind card */}
                    <div className="absolute -inset-6 bg-gradient-to-br from-purple-500/20 to-violet-600/15 rounded-[2.5rem] blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
                    <div className="absolute -inset-3 bg-gradient-to-tr from-purple-400/10 to-transparent rounded-[2rem] blur-xl animate-pulse" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />

                    <div className="relative w-full bg-gradient-to-br from-[#1e1a2e] via-[#1a1528] to-[#13101c] border border-purple-400/25 rounded-3xl px-10 py-14 md:px-12 md:py-16 text-center shadow-2xl shadow-purple-900/40 hover:border-purple-300/40 hover:shadow-purple-800/50 transition-all duration-500">
                      {/* Decorative quote marks */}
                      <div className="absolute top-6 left-6 text-6xl text-purple-500/20 font-serif leading-none">"</div>
                      <div className="absolute bottom-6 right-6 text-6xl text-purple-500/20 font-serif leading-none rotate-180">"</div>

                      {/* Subtle inner glow */}
                      <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none" />

                      <blockquote className="relative text-xl md:text-2xl text-white/95 leading-relaxed font-medium italic px-4">
                        {stripMarkers(funnelContent.problem)}
                      </blockquote>

                      <div className="relative mt-10 pt-8 border-t border-purple-400/20">
                        <div className="inline-flex items-center gap-3">
                          <span className="w-8 h-[2px] bg-gradient-to-r from-transparent to-purple-400/60" />
                          <p className="text-purple-300 text-sm font-bold tracking-[0.2em] uppercase">Sound familiar?</p>
                          <span className="w-8 h-[2px] bg-gradient-to-l from-transparent to-purple-400/60" />
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
        {!funnelLoading && funnelContent?.solution && (
          <section className="relative py-24 md:py-32">
            {/* Ambient glow - top glow bleeds from Problem section, bottom bleeds to next */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-[-15%] left-1/4 w-[800px] h-[600px] bg-violet-500/15 rounded-full blur-[180px]" />
              <div className="absolute top-1/3 right-1/4 w-[600px] h-[500px] bg-purple-400/12 rounded-full blur-[150px]" />
              <div className="absolute bottom-[-15%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-600/15 rounded-full blur-[180px]" />
            </div>

            <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
              {/* Section Header */}
              <Reveal className="text-center mb-16 md:mb-20">
                <div className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 text-white text-[11px] font-black uppercase tracking-[0.2em] mb-8 shadow-xl shadow-purple-500/40">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                  </span>
                  The Solution
                </div>
                {/* Extract first 2 sentences for headline */}
                <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] tracking-[-0.02em] max-w-4xl mx-auto mb-4">
                  <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                    {stripMarkers((() => {
                      const sentences = funnelContent.solution.match(/[^.!?]+[.!?]+/g) || [funnelContent.solution];
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
                    { icon: '✓', highlight: 'Your Potential', text: 'We focus on who you are becoming, not where you\'ve been' },
                    { icon: '✓', highlight: 'Credit Scores 580+', text: 'Traditional banks say no. We say let\'s talk.' },
                    { icon: '✓', highlight: 'No More Waiting', text: 'Stop watching from the sidelines. Start building equity today.' },
                  ].map((benefit, i) => (
                    <Reveal key={i} delay={i * 150}>
                      <div className="group relative flex items-start gap-5 bg-gradient-to-r from-white/[0.06] to-white/[0.02] border border-purple-400/20 rounded-2xl p-6 hover:border-purple-400/50 hover:bg-white/[0.08] transition-all duration-300 shadow-lg shadow-purple-900/20 hover:shadow-purple-500/20">
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/0 to-purple-500/0 group-hover:from-purple-500/5 group-hover:to-transparent transition-all duration-300" />
                        <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/40 to-purple-600/30 flex items-center justify-center flex-shrink-0 border border-purple-400/40 group-hover:border-purple-300/60 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-purple-500/30 transition-all duration-300">
                          <span className="text-purple-200 text-xl font-bold">{benefit.icon}</span>
                        </div>
                        <div className="relative">
                          <h3 className="text-xl md:text-2xl font-black text-white mb-2 group-hover:text-purple-100 transition-colors">{benefit.highlight}</h3>
                          <p className="text-gray-400 text-base leading-relaxed group-hover:text-gray-300 transition-colors">{benefit.text}</p>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>

                {/* Right - Big Number Impact Card */}
                <Reveal delay={300}>
                  <div className="relative h-full flex items-center">
                    {/* Multi-layer glow */}
                    <div className="absolute -inset-6 bg-gradient-to-br from-purple-500/20 to-violet-600/15 rounded-[2.5rem] blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
                    <div className="absolute -inset-3 bg-gradient-to-tr from-purple-400/10 to-transparent rounded-[2rem] blur-xl animate-pulse" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />

                    <div className="relative w-full bg-gradient-to-br from-[#1e1a2e] via-[#1a1528] to-[#13101c] border border-purple-400/25 rounded-3xl px-8 py-14 md:px-12 md:py-20 text-center shadow-2xl shadow-purple-900/40 hover:border-purple-300/40 hover:shadow-purple-800/50 transition-all duration-500">
                      {/* Subtle inner glow */}
                      <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none" />

                      {/* Big number - ⚠️ BRAND CONSTANT: Update if credit score policy changes */}
                      <div className="relative mb-6 inline-block">
                        {/* Hand-drawn encircle effect */}
                        <svg className="absolute -inset-4 md:-inset-6 w-[calc(100%+2rem)] md:w-[calc(100%+3rem)] h-[calc(100%+2rem)] md:h-[calc(100%+3rem)]" viewBox="0 0 200 100" preserveAspectRatio="none">
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
                        Minimum Credit Score
                      </p>

                      <p className="relative text-lg text-gray-400 font-light max-w-sm mx-auto">
                        That's all you need to start your journey to homeownership
                      </p>

                      {/* Bottom accent */}
                      <div className="relative mt-10 pt-8 border-t border-purple-400/20">
                        <div className="inline-flex items-center gap-3">
                          <span className="w-8 h-[2px] bg-gradient-to-r from-transparent to-purple-400/60" />
                          <p className="text-purple-300 text-sm font-bold tracking-[0.2em] uppercase">We believe in you</p>
                          <span className="w-8 h-[2px] bg-gradient-to-l from-transparent to-purple-400/60" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              </div>
            </div>
          </section>
        )}

        {/* Property Showcase - DARK THEME */}
        {!funnelLoading && funnelContent?.propertyShowcase && (
          <section className="relative py-20 md:py-28">
            {/* Ambient glow - BOOSTED + extended bottom bleed to Investment */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-purple-600/22 rounded-full blur-[200px]" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-violet-500/18 rounded-full blur-[180px]" />
              {/* Extended bottom bleed to reach Investment section */}
              <div className="absolute bottom-[-45%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-purple-600/20 rounded-full blur-[200px]" />
              <div className="absolute bottom-[-30%] left-1/3 w-[500px] h-[400px] bg-violet-500/15 rounded-full blur-[150px]" />
            </div>

            <div className="relative max-w-5xl mx-auto px-4 sm:px-6">
              {/* Section Header */}
              <Reveal className="text-center mb-12 md:mb-16">
                <span className="inline-block px-4 py-1.5 bg-purple-500/20 border border-purple-400/30 text-purple-300 rounded-full text-xs md:text-sm font-bold uppercase tracking-wider mb-4">
                  Property Highlights
                </span>
                <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-6">
                  Why This Home?
                </h2>
                <p className="text-lg md:text-xl text-gray-400 leading-relaxed max-w-3xl mx-auto">
                  {funnelContent.propertyShowcase}
                </p>
              </Reveal>

              {/* Property Features Grid - Dark Cards */}
              <Reveal delay={150}>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  <div className="group bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-purple-400/20 rounded-2xl p-6 text-center hover:border-purple-400/50 hover:bg-white/[0.08] transition-all duration-300">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500/30 to-purple-600/20 rounded-xl flex items-center justify-center mx-auto mb-4 border border-purple-400/30 group-hover:scale-110 transition-transform">
                      <Bed className="h-7 w-7 text-purple-300" />
                    </div>
                    <div className="text-4xl font-black mb-1">
                      <GradientNumber>{property.beds}</GradientNumber>
                    </div>
                    <div className="text-sm text-gray-500 uppercase tracking-wider font-medium">Bedrooms</div>
                  </div>
                  <div className="group bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-purple-400/20 rounded-2xl p-6 text-center hover:border-purple-400/50 hover:bg-white/[0.08] transition-all duration-300">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500/30 to-purple-600/20 rounded-xl flex items-center justify-center mx-auto mb-4 border border-purple-400/30 group-hover:scale-110 transition-transform">
                      <Bath className="h-7 w-7 text-purple-300" />
                    </div>
                    <div className="text-4xl font-black mb-1">
                      <GradientNumber>{property.baths}</GradientNumber>
                    </div>
                    <div className="text-sm text-gray-500 uppercase tracking-wider font-medium">Bathrooms</div>
                  </div>
                  {property.sqft && (
                    <div className="group bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-purple-400/20 rounded-2xl p-6 text-center hover:border-purple-400/50 hover:bg-white/[0.08] transition-all duration-300">
                      <div className="w-14 h-14 bg-gradient-to-br from-purple-500/30 to-purple-600/20 rounded-xl flex items-center justify-center mx-auto mb-4 border border-purple-400/30 group-hover:scale-110 transition-transform">
                        <Maximize2 className="h-7 w-7 text-purple-300" />
                      </div>
                      <div className="text-4xl font-black mb-1">
                        <GradientNumber>{property.sqft.toLocaleString()}</GradientNumber>
                      </div>
                      <div className="text-sm text-gray-500 uppercase tracking-wider font-medium">Square Feet</div>
                    </div>
                  )}
                  {property.condition && (
                    <div className="group bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-purple-400/20 rounded-2xl p-6 text-center hover:border-purple-400/50 hover:bg-white/[0.08] transition-all duration-300">
                      <div className="w-14 h-14 bg-gradient-to-br from-purple-500/30 to-purple-600/20 rounded-xl flex items-center justify-center mx-auto mb-4 border border-purple-400/30 group-hover:scale-110 transition-transform">
                        <Wrench className="h-7 w-7 text-purple-300" />
                      </div>
                      <div className="text-2xl font-black text-white mb-1">{property.condition}</div>
                      <div className="text-sm text-gray-500 uppercase tracking-wider font-medium">Condition</div>
                    </div>
                  )}
                </div>
              </Reveal>
            </div>
          </section>
        )}

        {/* Investment Details / Pricing - DRAMATIC PREMIUM DESIGN */}
        {(property.downPayment !== undefined || property.monthlyPayment !== undefined) && (
          <section className="relative py-16 md:py-24">
            {/* Dramatic purple ambient lighting - extends upward to blend with previous section */}
            <div className="absolute top-[-40%] left-1/2 -translate-x-1/2 w-[600px] md:w-[1000px] h-[400px] md:h-[600px] bg-purple-600/25 rounded-full blur-[150px] md:blur-[200px]" />
            <div className="absolute top-[30%] right-0 w-[400px] h-[400px] bg-violet-700/15 rounded-full blur-[150px]" />
            {/* Bottom glows bleed into Journey Comparison */}
            <div className="absolute bottom-[-35%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-purple-600/22 rounded-full blur-[220px]" />
            <div className="absolute bottom-[-20%] left-1/4 w-[500px] h-[400px] bg-violet-500/15 rounded-full blur-[180px]" />


            <div className="relative max-w-4xl mx-auto px-4">
              {/* Section Header */}
              <Reveal>
                <div className="text-center mb-10 md:mb-14">
                  <span className="inline-block px-4 py-1.5 bg-purple-500/20 border border-purple-400/30 text-purple-300 rounded-full text-xs md:text-sm font-bold uppercase tracking-wider mb-4">
                    Your Investment
                  </span>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-3 md:mb-4">
                    Affordable Payment Options
                  </h2>
                  <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
                    We structure deals to fit <span className="text-white font-medium">your budget</span>, not the other way around
                  </p>
                </div>
              </Reveal>

              {/* Premium Pricing Card */}
              <Reveal delay={150}>
                <div className="relative">
                  {/* Glow behind card */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 via-violet-500/20 to-purple-500/30 blur-3xl scale-110" />

                <div className="relative bg-gradient-to-br from-gray-900 via-gray-900 to-black rounded-3xl border border-purple-500/30 shadow-[0_0_60px_rgba(168,85,247,0.2)] overflow-hidden">
                  {/* Total Price Header */}
                  <div className="relative bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600 p-8 md:p-10 text-center overflow-hidden">
                    {/* Decorative elements */}
                    <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 right-0 w-40 h-40 bg-purple-900/50 rounded-full blur-3xl" />

                    <div className="relative z-10">
                      <div className="text-xs md:text-sm uppercase tracking-[0.2em] text-purple-200 font-semibold mb-2 md:mb-3">
                        Total Price
                      </div>
                      <div className="relative inline-block">
                        <span className="absolute inset-0 bg-white/20 blur-xl scale-150" />
                        <span className="relative text-5xl sm:text-6xl md:text-7xl font-black text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]">
                          ${property.price.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Details Grid */}
                  <div className="grid md:grid-cols-2">
                    {property.downPayment !== undefined && (
                      <div className="relative p-8 md:p-10 text-center border-b md:border-b-0 md:border-r border-purple-500/20 group hover:bg-purple-500/5 transition-colors">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                          <DollarSign className="h-7 w-7 md:h-8 md:w-8 text-white" />
                        </div>
                        <div className="text-xs md:text-sm uppercase tracking-[0.15em] text-gray-500 font-semibold mb-2">
                          Move-In Cost
                        </div>
                        <div className="text-3xl sm:text-4xl md:text-5xl font-black mb-2">
                          {/* DATA-DRIVEN GRADIENT - Move-in cost */}
                          <GradientMoney amount={property.downPayment} />
                        </div>
                        <p className="text-sm md:text-base text-gray-400">Goes toward your purchase</p>
                      </div>
                    )}
                    {property.monthlyPayment !== undefined && (
                      <div className="relative p-8 md:p-10 text-center group hover:bg-purple-500/5 transition-colors">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                          <CreditCard className="h-7 w-7 md:h-8 md:w-8 text-white" />
                        </div>
                        <div className="text-xs md:text-sm uppercase tracking-[0.15em] text-gray-500 font-semibold mb-2">
                          Monthly Payment
                        </div>
                        <div className="text-3xl sm:text-4xl md:text-5xl font-black mb-2">
                          {/* DATA-DRIVEN GRADIENT - Monthly payment */}
                          <GradientPrice amount={property.monthlyPayment} />
                        </div>
                        <p className="text-sm md:text-base text-gray-400">Build equity every month</p>
                      </div>
                    )}
                  </div>

                  {/* CTA Section */}
                  <div className="p-6 md:p-8 bg-gradient-to-b from-transparent to-purple-900/20 text-center">
                    <button
                      onClick={scrollToForm}
                      className="group relative w-full sm:w-auto bg-white hover:bg-purple-50 text-purple-900 font-black text-base sm:text-lg md:text-xl uppercase tracking-wide px-6 sm:px-10 md:px-14 py-4 md:py-5 rounded-xl shadow-[0_0_50px_rgba(168,85,247,0.4),0_0_80px_rgba(139,92,246,0.2)] hover:shadow-[0_0_70px_rgba(168,85,247,0.5),0_0_100px_rgba(139,92,246,0.3)] transition-all duration-300 hover:-translate-y-1 border-2 border-purple-300/50"
                    >
                      Check If You Qualify
                      <span className="ml-2 inline-block group-hover:translate-x-1 transition-transform">&rarr;</span>
                    </button>
                    <p className="text-gray-500 text-xs md:text-sm mt-4">No credit check • Takes 2 minutes</p>
                  </div>
                </div>
              </div>
              </Reveal>

            </div>
          </section>
        )}

        {/* JOURNEY COMPARISON - The Old Way vs The New Way - DARK PREMIUM */}
        <section className="relative py-16 md:py-24">
          {/* Ambient lighting - glows extend to adjacent sections */}
          <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-purple-600/20 rounded-full blur-[200px]" />
          <div className="absolute top-[20%] left-0 w-[500px] h-[500px] bg-slate-700/15 rounded-full blur-[180px]" />
          <div className="absolute top-[30%] right-0 w-[500px] h-[500px] bg-purple-600/18 rounded-full blur-[180px]" />
          {/* Bottom glows bleed into Process Steps */}
          <div className="absolute bottom-[-30%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-purple-600/22 rounded-full blur-[220px]" />
          <div className="absolute bottom-[-15%] right-1/3 w-[500px] h-[400px] bg-violet-500/15 rounded-full blur-[180px]" />


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
                      The <span className="underline decoration-slate-500 decoration-4 md:decoration-[6px] underline-offset-4">Old</span> Way
                    </h3>
                  </div>
                </div>

                {/* Vertical connecting line - fades before pill */}
                <div className="absolute left-[calc(50%-1px)] md:left-[calc(50%+20px)] top-[120px] bottom-[70px] w-1 bg-gradient-to-b from-slate-500/40 via-slate-500/60 to-transparent hidden md:block" />

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
                          Renting Forever
                        </div>
                        <div className="text-slate-300 text-xs md:text-sm ml-5 md:ml-0">Expensive Mistakes, No Progress</div>
                      </div>
                    </div>
                    {/* Arrow down */}
                    <div className="hidden md:flex justify-center mt-2">
                      <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-slate-500" />
                    </div>
                  </div>

                  {[
                    "Paying Someone Else's Mortgage",
                    "No Equity Building",
                    "Rent Increases Every Year",
                    "No Tax Benefits",
                    "Can Be Forced to Move",
                    "Money Down the Drain",
                  ].map((problem, i) => (
                    <div key={i} className="relative">
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="hidden md:flex w-12 h-12 rounded-full bg-slate-500/20 border-2 border-slate-500/50 items-center justify-center flex-shrink-0">
                          <span className="text-slate-400 text-2xl font-bold">✗</span>
                        </div>
                        <div className="flex-1 relative">
                          {/* Badge - desktop only */}
                          <span className="hidden md:inline-block absolute -top-2 right-4 bg-slate-800 text-slate-300 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded z-10 border border-slate-600">
                            Problem
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
                      😞 Stuck Forever
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
                  <div className="inline-block bg-gray-900/80 backdrop-blur border border-purple-500/40 rounded-xl md:rounded-2xl px-8 md:px-10 py-4 md:py-5 shadow-xl shadow-purple-500/10">
                    <h3 className="text-xl md:text-3xl font-black text-white">
                      The <span className="underline decoration-purple-400 decoration-4 md:decoration-[6px] underline-offset-4">New</span> Way
                    </h3>
                  </div>
                </div>

                {/* Glow effect behind the column */}
                <div className="absolute inset-0 bg-purple-500/10 rounded-3xl blur-3xl scale-110 hidden md:block" />

                {/* Vertical connecting line with glow - fades before pill */}
                <div className="absolute left-[calc(50%-1px)] md:left-[calc(50%+20px)] top-[120px] bottom-[70px] w-1 bg-gradient-to-b from-purple-400/40 via-purple-400/60 to-transparent shadow-[0_0_15px_rgba(168,85,247,0.4)] hidden md:block" />

                <div className="relative space-y-3 md:space-y-4">
                  {/* First item - intro */}
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 md:gap-4">
                      <div className="hidden md:flex w-12 h-12 rounded-full bg-purple-500/20 border-2 border-purple-400/60 items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30">
                        <span className="text-purple-300 text-2xl font-bold">✓</span>
                      </div>
                      <div className="flex-1 bg-gradient-to-r from-purple-500 to-violet-500 rounded-xl md:rounded-2xl p-4 md:p-5 text-white shadow-lg shadow-purple-500/30 border border-purple-400/30">
                        <div className="font-bold text-base md:text-lg flex items-center gap-2">
                          <span className="md:hidden text-purple-200">✓</span>
                          Rent-to-Own with Purple Homes
                        </div>
                        <div className="text-purple-100 text-xs md:text-sm ml-5 md:ml-0">Clear. Confident. Homeowner.</div>
                      </div>
                    </div>
                    {/* Arrow down */}
                    <div className="hidden md:flex justify-center mt-2">
                      <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-purple-400" />
                    </div>
                  </div>

                  {[
                    "Build YOUR Equity Monthly",
                    "Wealth That Grows Over Time",
                    "Price Locked In Today",
                    "Tax Benefits Available",
                    "Stability & Security",
                    "Smart Investment in Your Future",
                  ].map((solution, i) => (
                    <div key={i} className="relative z-10">
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="hidden md:flex w-12 h-12 rounded-full bg-purple-500/20 border-2 border-purple-400/60 items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30">
                          <span className="text-purple-300 text-2xl font-bold">✓</span>
                        </div>
                        <div className="flex-1 relative">
                          {/* Badge - desktop only */}
                          <span className="hidden md:inline-block absolute -top-2 right-4 bg-purple-900 text-purple-200 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded z-10 border border-purple-600">
                            Solution
                          </span>
                          <div className="bg-gradient-to-r from-purple-500 to-violet-500 rounded-xl md:rounded-2xl px-4 md:px-6 py-3 md:py-4 text-white font-semibold md:font-bold text-sm md:text-lg shadow-lg shadow-purple-500/30 border border-purple-400/30 flex items-center gap-2">
                            <span className="md:hidden text-purple-200">✓</span>
                            {solution}
                          </div>
                        </div>
                      </div>
                      {/* Arrow down - desktop only */}
                      {i < 5 && (
                        <div className="hidden md:flex justify-center mt-2">
                          <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-purple-400" />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Success indicator */}
                  <div className="hidden md:block text-center pt-2 relative z-10">
                    <span className="inline-block bg-gradient-to-r from-purple-500 to-violet-500 text-white font-bold text-sm px-4 py-2 rounded-full shadow-lg shadow-purple-500/40 border border-purple-300/30">
                      🏠 You're a Homeowner!
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
                  className="group relative bg-white hover:bg-purple-50 text-purple-900 font-black text-lg md:text-xl uppercase tracking-wide px-10 md:px-16 py-5 md:py-6 rounded-2xl shadow-[0_0_60px_rgba(168,85,247,0.5),0_0_100px_rgba(139,92,246,0.3)] hover:shadow-[0_0_80px_rgba(168,85,247,0.6),0_0_120px_rgba(139,92,246,0.4)] transition-all duration-300 hover:-translate-y-1 border-2 border-purple-300/50"
                >
                  Choose The New Way
                  <span className="ml-3 inline-block group-hover:translate-x-2 transition-transform text-2xl">&rarr;</span>
                </button>
                <p className="text-gray-500 text-sm mt-4">Join 500+ families who made the switch</p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Process Steps - Premium Dark */}
        <section className="relative py-20 md:py-28">
          {/* Ambient lighting - glows bleed into adjacent sections */}
          <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-purple-600/20 rounded-full blur-[200px]" />
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[400px] bg-violet-500/15 rounded-full blur-[180px]" />
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[500px] h-[400px] bg-purple-500/15 rounded-full blur-[180px]" />
          {/* Bottom glows bleed into Testimonials */}
          <div className="absolute bottom-[-30%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-purple-600/22 rounded-full blur-[220px]" />
          <div className="absolute bottom-[-15%] right-1/3 w-[500px] h-[400px] bg-violet-500/15 rounded-full blur-[180px]" />


          <div className="relative z-10 container mx-auto px-4">
            {/* Header with Reveal */}
            <Reveal className="text-center mb-16">
              <div className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-gradient-to-r from-purple-600 to-purple-500 text-white text-[11px] font-black uppercase tracking-[0.2em] mb-8 shadow-xl shadow-purple-500/40">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                </span>
                Simple Process
              </div>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-4">
                <span className="font-light">3 Steps to</span>{' '}
                <span className="font-black bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent pr-1">
                  Homeownership
                </span>
              </h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Our streamlined process makes becoming a homeowner easier than ever
              </p>
            </Reveal>

            {/* Steps */}
            <div className="max-w-5xl mx-auto">
              {/* Connecting line */}
              <div className="hidden md:block absolute left-1/2 top-[320px] -translate-x-1/2 w-[60%] h-[2px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

              <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
                {/* Step 1 */}
                <Reveal delay={0} className="relative text-center group">
                  <div className="relative mx-auto mb-8">
                    {/* Glow ring */}
                    <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    {/* Number circle */}
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(168,85,247,0.3)] border border-purple-500/30 transition-all duration-500 group-hover:shadow-[0_0_60px_rgba(168,85,247,0.5)] group-hover:-translate-y-2">
                      <span className="text-3xl sm:text-4xl md:text-6xl font-light bg-gradient-to-b from-purple-300 to-purple-500 bg-clip-text text-transparent">
                        1
                      </span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">Apply Online</h3>
                  <p className="text-gray-400 leading-relaxed max-w-xs mx-auto">
                    Complete our simple 5-minute application. No credit check required to see if you qualify.
                  </p>
                  <span className="inline-block mt-4 px-4 py-1.5 bg-purple-500/20 text-purple-300 rounded-full text-sm font-medium border border-purple-500/30">
                    5 minutes
                  </span>
                </Reveal>

                {/* Step 2 */}
                <Reveal delay={200} className="relative text-center group">
                  <div className="relative mx-auto mb-8">
                    <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(168,85,247,0.3)] border border-purple-500/30 transition-all duration-500 group-hover:shadow-[0_0_60px_rgba(168,85,247,0.5)] group-hover:-translate-y-2">
                      <span className="text-3xl sm:text-4xl md:text-6xl font-light bg-gradient-to-b from-purple-300 to-purple-500 bg-clip-text text-transparent">
                        2
                      </span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">Choose Your Home</h3>
                  <p className="text-gray-400 leading-relaxed max-w-xs mx-auto">
                    Browse available properties and schedule tours. We'll help you find the perfect fit for your family.
                  </p>
                  <span className="inline-block mt-4 px-4 py-1.5 bg-purple-500/20 text-purple-300 rounded-full text-sm font-medium border border-purple-500/30">
                    1-2 weeks
                  </span>
                </Reveal>

                {/* Step 3 */}
                <Reveal delay={400} className="relative text-center group">
                  <div className="relative mx-auto mb-8">
                    <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(168,85,247,0.3)] border border-purple-500/30 transition-all duration-500 group-hover:shadow-[0_0_60px_rgba(168,85,247,0.5)] group-hover:-translate-y-2">
                      <span className="text-3xl sm:text-4xl md:text-6xl font-light bg-gradient-to-b from-purple-300 to-purple-500 bg-clip-text text-transparent">
                        3
                      </span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">Move In</h3>
                  <p className="text-gray-400 leading-relaxed max-w-xs mx-auto">
                    Sign your agreement and get the keys. Start building equity from day one.
                  </p>
                  <span className="inline-block mt-4 px-4 py-1.5 bg-purple-500/20 text-purple-300 rounded-full text-sm font-medium border border-purple-500/30">
                    30 days
                  </span>
                </Reveal>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center mt-16">
              <button
                onClick={scrollToForm}
                className="group relative bg-white hover:bg-purple-50 text-purple-900 font-black text-base sm:text-lg md:text-xl uppercase tracking-wide px-6 sm:px-10 md:px-14 py-4 md:py-5 rounded-xl shadow-[0_0_50px_rgba(168,85,247,0.4),0_0_80px_rgba(139,92,246,0.2)] hover:shadow-[0_0_70px_rgba(168,85,247,0.5),0_0_100px_rgba(139,92,246,0.3)] transition-all duration-300 hover:-translate-y-1 border-2 border-purple-300/50"
              >
                Check If You Qualify
                <span className="ml-2 inline-block group-hover:translate-x-1 transition-transform">&rarr;</span>
              </button>
            </div>
          </div>
        </section>

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

            if (funnelContent?.testimonials?.length) {
              testimonials = funnelContent.testimonials;
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
                <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-purple-600/22 rounded-full blur-[200px]" />
                {/* Edge glows boosted from 10-12% to 20% */}
                <div className="absolute top-[-40%] left-0 w-[500px] h-[600px] bg-purple-600/20 rounded-full blur-[200px]" />
                <div className="absolute top-[-40%] right-0 w-[500px] h-[600px] bg-violet-500/18 rounded-full blur-[200px]" />
                <div className="absolute bottom-[-40%] left-0 w-[500px] h-[600px] bg-violet-600/18 rounded-full blur-[200px]" />
                <div className="absolute bottom-[-40%] right-0 w-[500px] h-[600px] bg-purple-600/20 rounded-full blur-[200px]" />

                <Reveal className="text-center mb-10">
                  <span className="inline-block px-5 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-xs font-bold uppercase tracking-[0.2em] mb-6">
                    Real Stories
                  </span>
                  <h2 className="text-3xl md:text-4xl text-white">
                    <span className="font-light">What Our</span>{' '}
                    <span className="font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">Homeowners</span>
                    <span className="font-light"> Say</span>
                  </h2>
                </Reveal>
                <Reveal delay={200}>
                  <TestimonialMarquee testimonials={testimonials} speed={testimonialSpeed} />
                </Reveal>
              </section>
            );
          })()
        )}

        {/* Stats Bar - Premium Animated */}
        <AnimatedStatsSection />

        {/* What's Nearby - Focus on the places */}
        {!funnelLoading && funnelContent?.locationNearby && (
          <section className="relative py-16 md:py-20">
            {/* Ambient glows - BOOSTED for visibility */}
            <div className="absolute top-[-40%] left-1/2 -translate-x-1/2 w-[1100px] h-[800px] bg-purple-600/25 rounded-full blur-[220px]" />
            <div className="absolute top-[-20%] left-1/4 w-[600px] h-[500px] bg-violet-500/20 rounded-full blur-[180px]" />
            <div className="absolute top-[30%] right-0 w-[600px] h-[500px] bg-violet-500/20 rounded-full blur-[180px]" />
            {/* Bottom bleeds to Qualifier */}
            <div className="absolute bottom-[-35%] left-1/2 -translate-x-1/2 w-[1000px] h-[700px] bg-purple-500/22 rounded-full blur-[200px]" />

            <div className="relative z-10 max-w-4xl mx-auto px-4">
              {/* Section Header */}
              <Reveal className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl text-white">
                  <span className="font-light">Minutes from</span>{' '}
                  <span className="font-bold bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent">Everything</span>
                </h2>
              </Reveal>

              {/* Nearby - split place and time for consistency */}
              <Reveal delay={150}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {funnelContent.locationNearby.split('\n').filter(Boolean).slice(0, 4).map((item, idx) => {
                    const cleanItem = item.replace(/^[•\-\*]\s*/, '').trim();
                    // Try to split "Place - time" but fallback to full text
                    const dashMatch = cleanItem.match(/^(.+?)\s*[-–]\s*(.+)$/);
                    const place = dashMatch ? dashMatch[1].trim() : cleanItem;
                    const time = dashMatch ? dashMatch[2].trim() : null;

                    return (
                      <div key={idx} className="group relative">
                        {/* Glow on hover */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 to-violet-600/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div className="relative bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-5 text-center h-full group-hover:border-purple-400/40 group-hover:bg-purple-500/15 transition-all flex flex-col justify-center">
                          <p className="text-white font-medium text-sm leading-tight">
                            {place}
                          </p>
                          {time && (
                            <p className="text-purple-300/70 text-xs mt-1">
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

        {/* Qualifier Section - Dark Theme */}
        {!funnelLoading && funnelContent?.qualifier && (
          <section className="relative py-16 md:py-20">
            {/* Ambient glows - BOOSTED + extended bottom bleed to FAQ */}
            <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-purple-500/22 rounded-full blur-[200px]" />
            <div className="absolute top-[20%] left-0 w-[600px] h-[500px] bg-violet-600/20 rounded-full blur-[180px]" />
            <div className="absolute top-[40%] right-0 w-[550px] h-[450px] bg-purple-400/18 rounded-full blur-[160px]" />
            {/* Extended bottom bleed to reach FAQ section */}
            <div className="absolute bottom-[-55%] left-1/2 -translate-x-1/2 w-[1100px] h-[800px] bg-purple-600/25 rounded-full blur-[250px]" />

            <div className="relative z-10 max-w-3xl mx-auto px-4">
              <Reveal className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl text-white">
                  <span className="font-light">This Home is</span>{' '}
                  <span className="font-bold italic bg-gradient-to-r from-purple-400 to-violet-400 bg-clip-text text-transparent pr-1">Perfect</span>
                  <span className="font-light"> For You If...</span>
                </h2>
              </Reveal>

              <Reveal delay={150}>
                <div className="space-y-3">
                  {funnelContent.qualifier.split('\n').filter(Boolean).map((item, idx) => {
                    // Clean up any existing bullets
                    const cleanItem = item.replace(/^[•\-\*\s]+/, '').trim();
                    if (!cleanItem) return null;

                    return (
                      <div key={idx} className="flex items-start gap-3 bg-purple-500/10 border border-purple-500/20 rounded-xl px-5 py-4 hover:bg-purple-500/15 transition-colors">
                        <CheckCircle className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
                        <p className="text-white/90 leading-relaxed">{cleanItem}</p>
                      </div>
                    );
                  })}
                </div>
              </Reveal>
            </div>
          </section>
        )}

        {/* Virtual Tour - Premium Dark with Click-to-Play Overlay */}
        {!funnelLoading && funnelContent?.virtualTourUrl && (
          <VirtualTourSection
            virtualTourUrl={funnelContent.virtualTourUrl}
            scrollToForm={scrollToForm}
          />
        )}

        {/* FAQ Section - Premium Dark */}
        {parsedFAQs.length > 0 && (
          <section className="relative py-16 md:py-20">
            {/* Ambient glows - BOOSTED + extended top to catch Qualifier bleed */}
            {/* Extended top glow to receive Qualifier section's bleed */}
            <div className="absolute top-[-55%] left-1/2 -translate-x-1/2 w-[1100px] h-[800px] bg-purple-600/25 rounded-full blur-[250px]" />
            <div className="absolute top-[20%] right-0 w-[600px] h-[500px] bg-violet-600/20 rounded-full blur-[180px]" />
            <div className="absolute top-[50%] left-0 w-[550px] h-[450px] bg-purple-400/18 rounded-full blur-[160px]" />
            <div className="absolute bottom-[-35%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-purple-600/25 rounded-full blur-[220px]" />

            <div className="relative z-10 max-w-5xl mx-auto px-4">
              <FunnelFAQ
                title="Frequently Asked Questions"
                subtitle="Get answers to common questions about our rent-to-own program"
                items={parsedFAQs}
                variant="premium"
              />
              <div className="mt-10 max-w-3xl mx-auto">
                <FAQCTA phoneNumber={companyPhone} variant="premium" />
              </div>
            </div>
          </section>
        )}

        {/* Urgency / Countdown - Premium Purple */}
        <section className="relative py-20 md:py-28">
          {/* Dramatic urgency lighting - purple glow that bleeds both up and down */}
          <div className="absolute top-[-50%] left-1/2 -translate-x-1/2 w-[1000px] md:w-[1400px] h-[600px] md:h-[800px] bg-purple-600/20 rounded-full blur-[200px] md:blur-[250px]" />
          <div className="absolute top-[-20%] left-1/4 w-[600px] h-[500px] bg-violet-500/15 rounded-full blur-[180px]" />
          {/* Bottom glows bleed into Final CTA section - stronger connection */}
          <div className="absolute bottom-[-50%] left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-purple-600/25 rounded-full blur-[250px]" />
          <div className="absolute bottom-[-20%] left-1/4 w-[600px] h-[500px] bg-violet-500/18 rounded-full blur-[200px]" />
          <div className="absolute bottom-[-20%] right-1/4 w-[600px] h-[500px] bg-purple-500/18 rounded-full blur-[200px]" />

          {/* Animated pulse ring - extends toward next section */}
          <div className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-purple-500/15 animate-ping" style={{ animationDuration: '3s' }} />

          <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
            {/* Urgency badge with Reveal */}
            <Reveal>
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-purple-500/20 border border-purple-500/40 backdrop-blur-sm mb-8 animate-pulse">
                <div className="w-2 h-2 rounded-full bg-purple-400" />
                <span className="text-purple-300 text-sm font-bold tracking-wider uppercase">Limited Time Offer</span>
                <div className="w-2 h-2 rounded-full bg-purple-400" />
              </div>
            </Reveal>

            {/* Main headline with Reveal */}
            <Reveal delay={100}>
              <h2 className="text-4xl md:text-5xl lg:text-6xl text-white mb-4">
                <span className="font-light">This Price</span>{' '}
                <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-violet-400 to-purple-400">
                  Won't Last
                </span>
              </h2>
              <p className="text-xl text-gray-400 mb-10 max-w-xl mx-auto">
                Secure today's pricing before the next increase. Once it's gone, it's gone.
              </p>
            </Reveal>

            {/* Live Countdown Timer with Reveal */}
            <Reveal delay={200}>
              <UrgencyCountdown mode={countdownMode} hoursFromNow={countdownHours} deadline={countdownDeadline} />
            </Reveal>

            {/* Scarcity indicator with Reveal - uses funnel urgencyMessage if set */}
            <Reveal delay={300}>
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-purple-500/10 border border-purple-500/30 mb-10">
                <span className="text-2xl">⚡</span>
                <span className="text-purple-300 font-bold">{funnelContent?.urgencyMessage || 'Only 3 spots left at this price'}</span>
                <span className="text-2xl">⚡</span>
              </div>
            </Reveal>

            {/* CTA - White glowing button (site standard) */}
            <div>
              <button
                onClick={scrollToForm}
                className="group relative bg-white hover:bg-purple-50 text-purple-900 font-black text-lg md:text-xl uppercase tracking-wide px-12 md:px-16 py-5 md:py-6 rounded-2xl shadow-[0_0_60px_rgba(168,85,247,0.4),0_0_100px_rgba(139,92,246,0.2)] hover:shadow-[0_0_80px_rgba(168,85,247,0.5),0_0_120px_rgba(139,92,246,0.3)] transition-all duration-300 hover:-translate-y-1 border-2 border-purple-300/50"
              >
                Lock In This Price Now
                <span className="ml-3 inline-block group-hover:translate-x-2 transition-transform text-2xl">&rarr;</span>
              </button>
              <p className="text-gray-500 text-sm mt-4">Price increases after timer expires</p>
            </div>
          </div>
        </section>

        {/* Final CTA Section - connects Urgency to Form */}
        {!funnelLoading && funnelContent?.callToAction && (
          <section className="relative py-16 md:py-20">
            {/* Top glows - extend far up to receive Urgency section's bleed */}
            <div className="absolute top-[-60%] left-1/2 -translate-x-1/2 w-[1200px] md:w-[1600px] h-[800px] bg-purple-600/28 rounded-full blur-[250px]" />
            <div className="absolute top-[-40%] left-1/4 w-[700px] h-[600px] bg-violet-500/22 rounded-full blur-[200px]" />
            <div className="absolute top-[-40%] right-1/4 w-[700px] h-[600px] bg-purple-500/20 rounded-full blur-[200px]" />
            {/* Bottom glow - bleeds into Form section */}
            <div className="absolute bottom-[-50%] left-1/2 -translate-x-1/2 w-[1200px] h-[700px] bg-purple-600/25 rounded-full blur-[220px]" />

            <div className="relative z-10 text-center max-w-3xl mx-auto px-4">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                Ready to Stop Renting and Start Owning?
              </h2>
              <p className="text-xl text-gray-400 mb-10">
                {funnelContent.callToAction}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={scrollToForm}
                  className="group relative bg-white hover:bg-purple-50 text-purple-900 font-black text-base sm:text-lg md:text-xl uppercase tracking-wide px-6 sm:px-10 md:px-14 py-4 md:py-5 rounded-xl shadow-[0_0_50px_rgba(168,85,247,0.4),0_0_80px_rgba(139,92,246,0.2)] hover:shadow-[0_0_70px_rgba(168,85,247,0.5),0_0_100px_rgba(139,92,246,0.3)] transition-all duration-300 hover:-translate-y-1 border-2 border-purple-300/50"
                >
                  Get Pre-Qualified Now
                  <span className="ml-2 inline-block group-hover:translate-x-1 transition-transform">&rarr;</span>
                </button>
                <a
                  href={`tel:+1${companyPhone.replace(/\D/g, '')}`}
                  className="inline-flex items-center justify-center gap-2 bg-transparent hover:bg-white/10 text-white font-bold text-lg uppercase tracking-wide px-8 py-4 rounded-xl border-2 border-white/30 hover:border-white/50 transition-all duration-300"
                >
                  <Phone className="h-5 w-5" />
                  Call {companyPhone}
                </a>
              </div>
              <TrustIndicators
                className="mt-10 justify-center"
                variant="premium"
                items={["No obligation", "Free consultation", "Fast response"]}
              />
            </div>
          </section>
        )}

        {/* Contact Form + Footer Section - Combined into one seamless section */}
        <section id="contact-form" className="relative pt-20 md:pt-28 pb-12">
          {/* Ambient glows for the entire form + footer area */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] md:w-[1200px] h-[500px] md:h-[700px] bg-purple-600/28 rounded-full blur-[150px] md:blur-[200px]" />
          <div className="absolute top-[15%] left-0 w-[600px] h-[500px] bg-violet-500/22 rounded-full blur-[130px]" />
          <div className="absolute top-[15%] right-0 w-[600px] h-[500px] bg-purple-500/22 rounded-full blur-[130px]" />
          {/* Center/bottom glows for footer area */}
          <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-purple-600/20 rounded-full blur-[200px]" />
          <div className="absolute bottom-0 left-1/4 w-[500px] h-[400px] bg-violet-500/15 rounded-full blur-[180px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[400px] bg-purple-500/15 rounded-full blur-[180px]" />

          <div className="relative z-10">
          {/* Form Card */}
          <div className="max-w-xl mx-auto">
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl shadow-2xl border border-purple-500/20 overflow-hidden">
              <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 p-8 text-white text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-400/20 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 backdrop-blur rounded-2xl mb-4 shadow-lg">
                    <Home className="h-7 w-7 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold">Get Pre-Qualified Today</h2>
                  <p className="text-purple-200 mt-1">No credit check required to start</p>
                </div>
              </div>

              {!showOfferForm ? (
                <div className="p-8 space-y-5">
                  <div className="text-center mb-6">
                    <p className="text-gray-300">Interested in {property.address}?</p>
                  </div>
                  <CTAButton size="full" variant="secondary" onClick={() => setShowOfferForm(true)}>
                    Yes, I'm Interested!
                  </CTAButton>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" size="lg" className="w-full border-purple-400/50 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400 hover:text-white" asChild>
                      <a href={`tel:+1${companyPhone.replace(/\D/g, '')}`}>
                        <Phone className="h-4 w-4 mr-2" />
                        Call Us
                      </a>
                    </Button>
                    <Button variant="outline" size="lg" className="w-full border-purple-400/50 text-purple-300 hover:bg-purple-500/20 hover:border-purple-400 hover:text-white" asChild>
                      <a href={`sms:+1${companyPhone.replace(/\D/g, '')}`}>
                        <Phone className="h-4 w-4 mr-2" />
                        Text Us
                      </a>
                    </Button>
                  </div>
                  <TrustIndicators className="justify-center" variant="premium" />
                </div>
              ) : (
                <form onSubmit={handleOfferSubmit} className="p-4 sm:p-6 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold text-gray-200">First Name *</Label>
                      <Input
                        value={offerForm.firstName}
                        onChange={(e) => setOfferForm(prev => ({ ...prev, firstName: e.target.value }))}
                        required
                        placeholder="John"
                        className="mt-1 bg-white/10 border-purple-500/30 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400/20"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-gray-200">Last Name *</Label>
                      <Input
                        value={offerForm.lastName}
                        onChange={(e) => setOfferForm(prev => ({ ...prev, lastName: e.target.value }))}
                        required
                        placeholder="Doe"
                        className="mt-1 bg-white/10 border-purple-500/30 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400/20"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-200">Phone Number *</Label>
                    <PhoneInput
                      value={offerForm.phone}
                      onChange={(value) => setOfferForm(prev => ({ ...prev, phone: value || '' }))}
                      required
                      placeholder="Enter phone number"
                      defaultCountry="US"
                      className="mt-1 [&_input]:bg-white/10 [&_input]:border-purple-500/30 [&_input]:text-white [&_input]:placeholder:text-gray-400"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-200">Email *</Label>
                    <Input
                      type="email"
                      value={offerForm.email}
                      onChange={(e) => setOfferForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                      placeholder="john@example.com"
                      className="mt-1 bg-white/10 border-purple-500/30 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400/20"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-200">Your Budget (Optional)</Label>
                    <Input
                      placeholder="$1,500/month"
                      value={offerForm.offerAmount}
                      onChange={(e) => setOfferForm(prev => ({ ...prev, offerAmount: e.target.value }))}
                      className="mt-1 bg-white/10 border-purple-500/30 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400/20"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-200">Message (Optional)</Label>
                    <Textarea
                      value={offerForm.message}
                      onChange={(e) => setOfferForm(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Tell us about your situation..."
                      className="mt-1 bg-white/10 border-purple-500/30 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400/20"
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
                        Submitting...
                      </>
                    ) : (
                      'Submit & Get Pre-Qualified'
                    )}
                  </CTAButton>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-gray-400 hover:text-white hover:bg-white/10"
                    onClick={() => setShowOfferForm(false)}
                  >
                    Cancel
                  </Button>
                  <TrustIndicators className="justify-center" variant="premium" />
                </form>
              )}
            </div>
          </div>

          {/* Footer content - floating within the same section */}
          <div className="max-w-6xl mx-auto px-4 text-center mt-20 text-white">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">P</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Purple Homes Solutions</h3>
            <p className="text-gray-400 mb-4">Creative Real Estate Financing</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a href={`tel:+1${companyPhone.replace(/\D/g, '')}`} className="text-purple-400 hover:text-purple-300 font-semibold">
                {companyPhone}
              </a>
              <span className="hidden sm:inline text-gray-600">•</span>
              <a href="mailto:info@purplehomessolutions.com" className="text-purple-400 hover:text-purple-300">
                info@purplehomessolutions.com
              </a>
            </div>
            <p className="text-gray-500 text-sm mt-6">
              © {new Date().getFullYear()} Purple Homes Solutions. All rights reserved.
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
          <div className="relative w-full max-w-md bg-gradient-to-br from-purple-900/95 via-purple-800/95 to-purple-900/95 rounded-2xl border border-purple-500/30 shadow-2xl shadow-purple-500/20 animate-in fade-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={() => setIsFormModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors z-10"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600/50 to-violet-600/50 px-6 py-5 text-center text-white rounded-t-2xl">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 backdrop-blur rounded-xl mb-3">
                <Home className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-bold">Get Pre-Qualified Today</h2>
              <p className="text-purple-200 text-sm mt-1">No credit check required to start</p>
            </div>

            {/* Form */}
            <form onSubmit={(e) => { handleOfferSubmit(e); setIsFormModalOpen(false); }} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-semibold text-gray-200">First Name *</Label>
                  <Input
                    value={offerForm.firstName}
                    onChange={(e) => setOfferForm(prev => ({ ...prev, firstName: e.target.value }))}
                    required
                    placeholder="John"
                    className="mt-1 bg-white/10 border-purple-500/30 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400/20"
                  />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-200">Last Name *</Label>
                  <Input
                    value={offerForm.lastName}
                    onChange={(e) => setOfferForm(prev => ({ ...prev, lastName: e.target.value }))}
                    required
                    placeholder="Doe"
                    className="mt-1 bg-white/10 border-purple-500/30 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400/20"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-200">Phone Number *</Label>
                <PhoneInput
                  value={offerForm.phone}
                  onChange={(value) => setOfferForm(prev => ({ ...prev, phone: value || '' }))}
                  required
                  placeholder="Enter phone number"
                  defaultCountry="US"
                  className="mt-1 [&_input]:bg-white/10 [&_input]:border-purple-500/30 [&_input]:text-white [&_input]:placeholder:text-gray-400"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-200">Email *</Label>
                <Input
                  type="email"
                  value={offerForm.email}
                  onChange={(e) => setOfferForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                  placeholder="john@example.com"
                  className="mt-1 bg-white/10 border-purple-500/30 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400/20"
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
                    Submitting...
                  </>
                ) : (
                  'Submit & Get Pre-Qualified'
                )}
              </CTAButton>
              <p className="text-center text-gray-400 text-xs">
                By submitting, you agree to be contacted about this property.
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Sticky Mobile CTA */}
      <StickyMobileCTA
        ctaText="Get Pre-Qualified"
        onCtaClick={scrollToForm}
        phoneNumber={companyPhone}
        variant="simple"
      />

      {/* Floating Action Button (Desktop) - SMS for better conversion */}
      <FloatingActionButton
        icon="message"
        href={`sms:+1${companyPhone.replace(/\D/g, '')}`}
        label="Text Us"
      />
    </div>
  );
}
