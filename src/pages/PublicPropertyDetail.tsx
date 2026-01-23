import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Bed, Bath, Maximize2, MapPin, Phone, Wrench, Home,
  DollarSign, Loader2, Share2, Check, ExternalLink, Video,
  Shield, Clock, Users, Award, CheckCircle, CreditCard
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
import { cn } from '@/lib/utils';
import { useSubmitForm } from '@/services/ghlApi';
import { useAirtableProperties } from '@/services/matchingApi';
import { generatePropertySlug } from '@/lib/utils/slug';

// Import Funnel Components
import {
  CTAButton,
  TrustBar,
  TrustIndicators,
  CountdownTimer,
  ScarcityBadge,
  LiveViewers,
  QuoteTestimonial,
  FeaturedTestimonial,
  StatsBar,
  ComparisonTable,
  ProcessSteps,
  FunnelFAQ,
  FAQCTA,
  FunnelSection,
  SectionHeader,
  SectionDivider,
  ContentCard,
  IconFeature,
  TwoColumnLayout,
  StickyMobileCTA,
  FloatingActionButton,
  PremiumTrustStrip,
  CredentialsBar,
} from '@/components/funnel';

// Animated Stats Section Component
function AnimatedStatsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [counts, setCounts] = useState([0, 0, 0, 0]);

  const statsConfig = [
    { target: 500, duration: 2500, label: 'Families Helped', suffix: '+', icon: Users },
    { target: 15, duration: 2000, label: 'Years Experience', suffix: '+', icon: Clock },
    { target: 98, duration: 2200, label: 'Satisfaction Rate', suffix: '%', icon: Award },
    { target: 24, duration: 1800, label: 'Hour Response', prefix: '<', icon: Shield },
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
    <section ref={sectionRef} className="relative bg-gradient-to-b from-[#0f172a] via-[#1e1b4b] to-[#0f172a] py-20 md:py-28 overflow-hidden">
      {/* Ambient lighting */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[200px]" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[200px]" />

      {/* Grid texture */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(rgba(168,85,247,0.6) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-sm font-semibold uppercase tracking-wider mb-4">
            Proven Track Record
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Numbers That{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-400">
              Speak for Themselves
            </span>
          </h2>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {statsConfig.map((stat, index) => {
            const Icon = stat.icon;
            const count = counts[index];
            return (
              <div
                key={index}
                className="text-center relative group"
              >
                {/* Divider between items (desktop) */}
                {index < statsConfig.length - 1 && (
                  <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 h-20 w-px bg-gradient-to-b from-transparent via-purple-500/30 to-transparent" />
                )}

                {/* Icon */}
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 mb-4 group-hover:scale-110 group-hover:bg-purple-500/20 transition-all duration-300">
                  <Icon className="h-7 w-7 text-purple-400" />
                </div>

                {/* Animated number */}
                <div className="text-5xl md:text-6xl lg:text-7xl font-extralight tracking-tight text-white/95 tabular-nums">
                  {stat.prefix}
                  <span className="font-light">{count.toString().padStart(count > 99 ? 3 : 2, '0')}</span>
                  {stat.suffix}
                </div>

                {/* Label */}
                <div className="text-xs md:text-sm mt-4 uppercase tracking-[0.15em] font-medium text-purple-400/80">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>
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

  // Form state
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerForm, setOfferForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    offerAmount: '',
    message: ''
  });
  const [copied, setCopied] = useState(false);

  // Fetch funnel content when slug is available
  useEffect(() => {
    if (!slug) return;

    const fetchFunnelContent = async () => {
      setFunnelLoading(true);
      try {
        const response = await fetch(`/api/funnel?action=get&slug=${encodeURIComponent(slug)}`);
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
  }, [slug]);

  const submitForm = useSubmitForm();

  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) return;

    try {
      await submitForm.mutateAsync({
        formId: 'NrB0CMNYIpR8JpVDqpsE',
        data: {
          first_name: offerForm.firstName,
          last_name: offerForm.lastName,
          email: offerForm.email,
          phone: offerForm.phone,
          offer_amount: offerForm.offerAmount,
          listing_message: offerForm.message,
          property_address: property.address,
          property_city: property.city,
          property_price: property.price.toString(),
        }
      });

      toast.success('Your offer has been submitted! We\'ll contact you within 24 hours.');
      setOfferForm({ firstName: '', lastName: '', email: '', phone: '', offerAmount: '', message: '' });
      setShowOfferForm(false);
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Failed to submit offer. Please try again or call us directly.');
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
    setShowOfferForm(true);
    document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' });
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

      {/* Main Content */}
      <main>
        {/* DRAMATIC HERO SECTION - PURPLE HOMES BRANDED - MAXIMUM IMPACT */}
        <section className="relative bg-black overflow-hidden">
          {/* Dramatic purple ambient lighting */}
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] md:w-[1200px] h-[400px] md:h-[600px] bg-purple-600/30 rounded-full blur-[150px] md:blur-[200px]" />
          <div className="absolute bottom-0 left-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-violet-700/20 rounded-full blur-[100px] md:blur-[150px]" />
          <div className="absolute top-1/2 right-0 w-[250px] md:w-[400px] h-[250px] md:h-[400px] bg-purple-500/15 rounded-full blur-[80px] md:blur-[120px]" />

          {/* Subtle grid texture */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(168,85,247,0.4) 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }}
          />

          <div className="relative max-w-5xl mx-auto px-4 py-16 md:py-24 lg:py-32">
            <div className="text-center">
              {/* Eyebrow - Mobile optimized */}
              <div className="inline-flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 bg-purple-500/25 border border-purple-400/40 rounded-full text-purple-300 text-xs md:text-sm font-bold uppercase tracking-wider mb-6 md:mb-8 backdrop-blur-sm">
                <span className="relative flex h-2 w-2 md:h-2.5 md:w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 md:h-2.5 md:w-2.5 bg-purple-400"></span>
                </span>
                <span className="truncate max-w-[200px] md:max-w-none">Limited Time in {property.city}</span>
              </div>

              {/* Main Headline - Responsive sizes */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white leading-[1.1] mb-2 md:mb-3 tracking-tight">
                Stop Paying Your
              </h1>
              <div className="mb-3 md:mb-4">
                <span className="relative inline-block">
                  {/* Vibrant purple highlighter - more saturated */}
                  <span className="absolute inset-x-[-4px] md:inset-x-[-8px] bottom-[2px] md:bottom-[4px] top-[4px] md:top-[8px] bg-gradient-to-r from-purple-500 via-violet-400 to-purple-500 -skew-x-2 shadow-[0_0_40px_rgba(139,92,246,0.5)]" />
                  <span className="relative text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white px-1 md:px-2 drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                    Landlord's Mortgage
                  </span>
                </span>
              </div>
              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-400 mb-6 md:mb-8">
                Start Building <span className="text-white">Your Own Wealth</span>
              </p>

              {/* Price callout - MAXIMUM emphasis */}
              <div className="text-lg md:text-xl lg:text-2xl text-gray-300 max-w-3xl mx-auto mb-8 md:mb-10 leading-relaxed px-2">
                <span>Own this home for as low as</span>
                <div className="my-3 md:my-4">
                  <span className="relative inline-block">
                    <span className="absolute inset-0 bg-purple-500/20 blur-2xl scale-150" />
                    <span className="relative text-4xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-violet-300 to-purple-300 drop-shadow-[0_0_30px_rgba(168,85,247,0.6)]">
                      ${property.monthlyPayment?.toLocaleString() || Math.round((property.price * 0.006)).toLocaleString()}/mo
                    </span>
                  </span>
                </div>
                <span className="text-gray-400">— even with </span>
                <span className="relative inline-block mx-1">
                  <span className="absolute inset-0 bg-gradient-to-r from-purple-500/40 to-violet-500/40 -skew-x-3 rounded" />
                  <span className="relative italic font-semibold text-white px-2 md:px-3">less-than-perfect credit</span>
                </span>
              </div>

              {/* Trust indicators - Mobile stacked, desktop inline */}
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

              {/* CTA - MAXIMUM glow, mobile friendly */}
              <div className="flex flex-col items-center gap-3 md:gap-4 px-4">
                <button
                  onClick={scrollToForm}
                  className="group relative w-full sm:w-auto bg-white hover:bg-purple-50 text-purple-900 font-black text-lg md:text-xl uppercase tracking-wide px-8 md:px-14 py-4 md:py-5 rounded-xl shadow-[0_0_60px_rgba(168,85,247,0.5),0_0_100px_rgba(139,92,246,0.3)] hover:shadow-[0_0_80px_rgba(168,85,247,0.6),0_0_120px_rgba(139,92,246,0.4)] transition-all duration-300 hover:-translate-y-1 border-2 border-purple-300/50"
                >
                  Check If I Qualify
                  <span className="ml-2 inline-block group-hover:translate-x-1 transition-transform">&rarr;</span>
                </button>
                <span className="text-gray-500 text-xs md:text-sm">Takes less than 2 minutes • No credit check</span>
              </div>
            </div>
          </div>

          {/* Bottom fade to property section */}
          <div className="absolute bottom-0 left-0 right-0 h-24 md:h-32 bg-gradient-to-t from-black to-transparent" />
        </section>

        {/* Property Image Section */}
        <section className="relative bg-black">
          <div className="max-w-6xl mx-auto px-3 md:px-4 -mt-8 md:-mt-12 relative z-10">
            <div className="rounded-xl md:rounded-2xl overflow-hidden shadow-2xl shadow-purple-500/30 border border-purple-500/30">
              <PropertyImageGallery
                images={property.images || [property.heroImage]}
                heroImage={property.heroImage}
                onHeroChange={() => {}}
                onImagesChange={() => {}}
                editable={false}
              />
            </div>
          </div>

          {/* Property Quick Info Bar - Mobile optimized */}
          <div className="bg-black pt-6 md:pt-8 pb-8 md:pb-12">
            <div className="max-w-6xl mx-auto px-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-6">
                <div className="text-center md:text-left">
                  <div className="flex flex-wrap items-baseline justify-center md:justify-start gap-2 md:gap-3 mb-1 md:mb-2">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white">
                      ${property.price.toLocaleString()}
                    </h2>
                    {property.monthlyPayment !== undefined && (
                      <span className="text-lg md:text-xl font-bold text-purple-400">
                        ${property.monthlyPayment.toLocaleString()}/mo
                      </span>
                    )}
                  </div>
                  <p className="text-lg md:text-xl text-white font-medium">{property.address}</p>
                  <p className="text-gray-400 flex items-center justify-center md:justify-start gap-1 mt-1 text-sm md:text-base">
                    <MapPin className="h-4 w-4" />
                    {property.city}
                  </p>
                </div>

                {/* Quick Stats Pills - Mobile scroll or wrap */}
                <div className="flex flex-wrap justify-center md:justify-end gap-2 md:gap-3">
                  <span className="px-3 md:px-5 py-2 md:py-3 bg-purple-500/15 border border-purple-500/30 rounded-lg md:rounded-xl text-white font-semibold flex items-center gap-1.5 md:gap-2 text-sm md:text-base">
                    <Bed className="h-4 w-4 md:h-5 md:w-5 text-purple-400" /> {property.beds} Beds
                  </span>
                  <span className="px-3 md:px-5 py-2 md:py-3 bg-purple-500/15 border border-purple-500/30 rounded-lg md:rounded-xl text-white font-semibold flex items-center gap-1.5 md:gap-2 text-sm md:text-base">
                    <Bath className="h-4 w-4 md:h-5 md:w-5 text-purple-400" /> {property.baths} Baths
                  </span>
                  {property.sqft && (
                    <span className="px-3 md:px-5 py-2 md:py-3 bg-purple-500/15 border border-purple-500/30 rounded-lg md:rounded-xl text-white font-semibold flex items-center gap-1.5 md:gap-2 text-sm md:text-base">
                      <Maximize2 className="h-4 w-4 md:h-5 md:w-5 text-purple-400" /> {property.sqft.toLocaleString()} sqft
                    </span>
                  )}
                </div>
              </div>

              {/* Live Viewers */}
              <div className="mt-4 md:mt-6 flex justify-center md:justify-start">
                <LiveViewers count={Math.floor(Math.random() * 5) + 2} variant="premium" />
              </div>
            </div>
          </div>
        </section>

        {/* Premium Trust Strip */}
        <PremiumTrustStrip />

        {/* Hook Section - Attention Grabber */}
        {funnelContent?.hook && (
          <FunnelSection variant="purple" padding="lg" blendTo="white">
            <div className="text-center max-w-4xl mx-auto">
              <span className="inline-block px-4 py-1.5 bg-white/20 text-white/90 rounded-full text-sm font-semibold uppercase tracking-wide mb-6">
                Your Dream Home Awaits
              </span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-6">
                {funnelContent.hook}
              </h2>
              <CTAButton size="xl" onClick={scrollToForm}>
                See If You Qualify
              </CTAButton>
            </div>
          </FunnelSection>
        )}

        {/* Problem Section */}
        {funnelContent?.problem && (
          <FunnelSection variant="light" padding="lg" blendTo="dark">
            <TwoColumnLayout
              emphasis="right"
              left={
                <div>
                  <SectionHeader
                    overline="The Challenge"
                    title="Tired of Throwing Money Away on Rent?"
                    align="left"
                  />
                  <p className="text-lg text-gray-600 leading-relaxed mb-6">
                    {funnelContent.problem}
                  </p>
                  <div className="space-y-3">
                    {[
                      "Banks keeping saying no?",
                      "Credit not where it needs to be?",
                      "Saving for years with no progress?",
                    ].map((pain, i) => (
                      <div key={i} className="flex items-center gap-3 text-gray-700">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-red-500">✗</span>
                        </div>
                        <span>{pain}</span>
                      </div>
                    ))}
                  </div>
                </div>
              }
              right={
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-8 text-center">
                  <div className="text-6xl mb-4">😔</div>
                  <p className="text-gray-600 font-medium">
                    You work hard. You pay your bills. But the traditional path to homeownership isn't working.
                  </p>
                </div>
              }
            />
          </FunnelSection>
        )}

        {/* Solution Section */}
        {funnelContent?.solution && (
          <FunnelSection variant="dark" padding="lg" blendTo="white">
            <SectionHeader
              overline="There's a Better Way"
              title="Rent-to-Own: Your Path to Homeownership"
              subtitle="Purple Homes specializes in helping families like yours achieve the dream of homeownership—even when banks say no."
              dark
            />
            <div className="grid md:grid-cols-3 gap-6 mt-12">
              {[
                { icon: <Shield className="h-6 w-6" />, title: "No Bank Required", desc: "We work directly with you, no traditional lenders needed" },
                { icon: <DollarSign className="h-6 w-6" />, title: "Build Equity Now", desc: "Every payment goes toward YOUR future, not a landlord's" },
                { icon: <CheckCircle className="h-6 w-6" />, title: "Lock Your Price", desc: "Today's price is locked in, even if the market goes up" },
              ].map((item, i) => (
                <div key={i} className="bg-white/5 backdrop-blur border border-purple-400/20 rounded-2xl p-8 text-center hover:-translate-y-1 transition-all duration-300">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center mx-auto mb-5 text-white shadow-lg shadow-purple-500/30">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                  <p className="text-gray-400">{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 bg-white/10 backdrop-blur rounded-xl p-6">
              <p className="text-gray-200 leading-relaxed">{funnelContent.solution}</p>
            </div>
          </FunnelSection>
        )}

        {/* Property Showcase */}
        {funnelContent?.propertyShowcase && (
          <FunnelSection variant="white" padding="lg">
            <SectionHeader
              overline="Property Highlights"
              title="Why This Home?"
            />
            <div className="max-w-4xl mx-auto">
              <p className="text-lg text-gray-600 leading-relaxed mb-8">
                {funnelContent.propertyShowcase}
              </p>

              {/* Property Features Grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-purple-50 rounded-xl p-5 text-center">
                  <Bed className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-gray-900">{property.beds}</div>
                  <div className="text-sm text-gray-600">Bedrooms</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-5 text-center">
                  <Bath className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <div className="text-3xl font-bold text-gray-900">{property.baths}</div>
                  <div className="text-sm text-gray-600">Bathrooms</div>
                </div>
                {property.sqft && (
                  <div className="bg-purple-50 rounded-xl p-5 text-center">
                    <Maximize2 className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-3xl font-bold text-gray-900">{property.sqft.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">Square Feet</div>
                  </div>
                )}
                {property.condition && (
                  <div className="bg-purple-50 rounded-xl p-5 text-center">
                    <Wrench className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-xl font-bold text-gray-900">{property.condition}</div>
                    <div className="text-sm text-gray-600">Condition</div>
                  </div>
                )}
              </div>
            </div>
          </FunnelSection>
        )}

        {/* Investment Details / Pricing - DRAMATIC PREMIUM DESIGN */}
        {(property.downPayment !== undefined || property.monthlyPayment !== undefined) && (
          <section className="relative bg-black overflow-hidden py-16 md:py-24">
            {/* Dramatic purple ambient lighting */}
            <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[500px] md:w-[900px] h-[300px] md:h-[500px] bg-purple-600/25 rounded-full blur-[120px] md:blur-[180px]" />
            <div className="absolute bottom-0 right-0 w-[300px] md:w-[400px] h-[300px] md:h-[400px] bg-violet-700/15 rounded-full blur-[80px] md:blur-[120px]" />

            {/* Subtle grid texture */}
            <div
              className="absolute inset-0 opacity-[0.02]"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, rgba(168,85,247,0.4) 1px, transparent 0)`,
                backgroundSize: '40px 40px'
              }}
            />

            <div className="relative max-w-4xl mx-auto px-4">
              {/* Section Header */}
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

              {/* Premium Pricing Card */}
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
                        <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                          <DollarSign className="h-7 w-7 md:h-8 md:w-8 text-white" />
                        </div>
                        <div className="text-xs md:text-sm uppercase tracking-[0.15em] text-gray-500 font-semibold mb-2">
                          Move-In Cost
                        </div>
                        <div className="text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300 mb-2">
                          ${property.downPayment.toLocaleString()}
                        </div>
                        <p className="text-sm md:text-base text-gray-400">Goes toward your purchase</p>
                      </div>
                    )}
                    {property.monthlyPayment !== undefined && (
                      <div className="relative p-8 md:p-10 text-center group hover:bg-purple-500/5 transition-colors">
                        <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-transform">
                          <CreditCard className="h-7 w-7 md:h-8 md:w-8 text-white" />
                        </div>
                        <div className="text-xs md:text-sm uppercase tracking-[0.15em] text-gray-500 font-semibold mb-2">
                          Monthly Payment
                        </div>
                        <div className="text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-violet-300 mb-2">
                          ${property.monthlyPayment.toLocaleString()}
                        </div>
                        <p className="text-sm md:text-base text-gray-400">Build equity every month</p>
                      </div>
                    )}
                  </div>

                  {/* CTA Section */}
                  <div className="p-6 md:p-8 bg-gradient-to-b from-transparent to-purple-900/20 text-center">
                    <button
                      onClick={scrollToForm}
                      className="group relative w-full sm:w-auto bg-white hover:bg-purple-50 text-purple-900 font-black text-lg md:text-xl uppercase tracking-wide px-10 md:px-14 py-4 md:py-5 rounded-xl shadow-[0_0_50px_rgba(168,85,247,0.4),0_0_80px_rgba(139,92,246,0.2)] hover:shadow-[0_0_70px_rgba(168,85,247,0.5),0_0_100px_rgba(139,92,246,0.3)] transition-all duration-300 hover:-translate-y-1 border-2 border-purple-300/50"
                    >
                      Check If You Qualify
                      <span className="ml-2 inline-block group-hover:translate-x-1 transition-transform">&rarr;</span>
                    </button>
                    <p className="text-gray-500 text-xs md:text-sm mt-4">No credit check • Takes 2 minutes</p>
                  </div>
                </div>
              </div>

              {/* Payment Breakdown (if available) */}
              {funnelContent?.pricingOptions && (
                <div className="mt-10 bg-white/5 backdrop-blur border border-purple-500/20 rounded-2xl p-6 md:p-8">
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-purple-400" />
                    Payment Breakdown
                  </h4>
                  <div className="text-gray-300 whitespace-pre-wrap leading-relaxed font-mono text-sm bg-black/30 rounded-xl p-4 md:p-6 border border-purple-500/10">
                    {funnelContent.pricingOptions}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* JOURNEY COMPARISON - The Old Way vs The New Way - DARK PREMIUM */}
        <section className="relative bg-black overflow-hidden py-16 md:py-24">
          {/* Ambient lighting */}
          <div className="absolute top-0 left-1/4 w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-red-900/15 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-purple-600/25 rounded-full blur-[150px]" />

          {/* Subtle grid texture */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(168,85,247,0.4) 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }}
          />

          <div className="relative max-w-6xl mx-auto px-4">
            {/* Two Column Headers */}
            <div className="grid md:grid-cols-2 gap-6 md:gap-12 mb-10 md:mb-14">
              {/* The Old Way Header */}
              <div className="text-center">
                <div className="inline-block bg-gray-900/80 backdrop-blur border border-gray-700 rounded-2xl px-10 py-5 shadow-xl">
                  <h3 className="text-2xl md:text-4xl font-black text-white">
                    The <span className="underline decoration-red-500 decoration-[6px] underline-offset-4">Old</span> Way
                  </h3>
                </div>
              </div>
              {/* The New Way Header */}
              <div className="text-center">
                <div className="inline-block bg-gray-900/80 backdrop-blur border border-purple-500/40 rounded-2xl px-10 py-5 shadow-xl shadow-purple-500/10">
                  <h3 className="text-2xl md:text-4xl font-black text-white">
                    The <span className="underline decoration-purple-400 decoration-[6px] underline-offset-4">New</span> Way
                  </h3>
                </div>
              </div>
            </div>

            {/* Journey Paths */}
            <div className="grid md:grid-cols-2 gap-6 md:gap-10">
              {/* LEFT: The Old Way - Problems */}
              <div className="relative">
                {/* Vertical connecting line */}
                <div className="absolute left-[calc(50%-1px)] md:left-[calc(50%+20px)] top-[60px] bottom-[20px] w-1 bg-gradient-to-b from-red-500/50 via-red-500 to-red-500/50 hidden md:block" />

                <div className="space-y-4">
                  {/* First item - intro */}
                  <div className="relative">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center flex-shrink-0">
                        <span className="text-red-400 text-xl md:text-2xl font-bold">✗</span>
                      </div>
                      <div className="flex-1 bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-4 md:p-5 text-white shadow-lg border border-red-500/30">
                        <div className="font-bold text-base md:text-lg">Renting Forever</div>
                        <div className="text-red-200 text-xs md:text-sm">Expensive Mistakes, No Progress</div>
                      </div>
                    </div>
                    {/* Arrow down */}
                    <div className="hidden md:flex justify-center mt-2">
                      <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-red-500" />
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
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center flex-shrink-0">
                          <span className="text-red-400 text-xl md:text-2xl font-bold">✗</span>
                        </div>
                        <div className="flex-1 relative">
                          <span className="absolute -top-2 right-3 md:right-4 bg-red-900 text-red-200 text-[9px] md:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded z-10 border border-red-700">
                            Problem
                          </span>
                          <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl px-5 md:px-6 py-3 md:py-4 text-white font-bold text-sm md:text-lg shadow-lg border border-red-500/30">
                            {problem}
                          </div>
                        </div>
                      </div>
                      {/* Arrow down - except last */}
                      {i < 5 && (
                        <div className="hidden md:flex justify-center mt-2">
                          <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-red-500" />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Dead end indicator */}
                  <div className="hidden md:block text-center pt-4">
                    <span className="inline-block bg-red-900 text-red-200 font-bold text-sm px-5 py-2.5 rounded-full border-2 border-red-600 shadow-lg">
                      😞 Stuck Forever
                    </span>
                  </div>
                </div>
              </div>

              {/* RIGHT: The New Way - Solutions */}
              <div className="relative">
                {/* Glow effect behind the column */}
                <div className="absolute inset-0 bg-purple-500/10 rounded-3xl blur-3xl scale-110 hidden md:block" />

                {/* Vertical connecting line with glow */}
                <div className="absolute left-[calc(50%-1px)] md:left-[calc(50%+20px)] top-[60px] bottom-[20px] w-1 bg-gradient-to-b from-purple-400/50 via-purple-400 to-purple-400/50 shadow-[0_0_15px_rgba(168,85,247,0.6)] hidden md:block" />

                <div className="relative space-y-4">
                  {/* First item - intro */}
                  <div className="relative">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-purple-500/20 border-2 border-purple-400/60 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30">
                        <span className="text-purple-300 text-xl md:text-2xl font-bold">✓</span>
                      </div>
                      <div className="flex-1 bg-gradient-to-r from-purple-500 to-violet-500 rounded-2xl p-4 md:p-5 text-white shadow-lg shadow-purple-500/30 border border-purple-400/30">
                        <div className="font-bold text-base md:text-lg">Rent-to-Own with Purple Homes</div>
                        <div className="text-purple-100 text-xs md:text-sm">Clear. Confident. Homeowner.</div>
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
                    <div key={i} className="relative">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-purple-500/20 border-2 border-purple-400/60 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30">
                          <span className="text-purple-300 text-xl md:text-2xl font-bold">✓</span>
                        </div>
                        <div className="flex-1 relative">
                          <span className="absolute -top-2 right-3 md:right-4 bg-purple-900 text-purple-200 text-[9px] md:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded z-10 border border-purple-600">
                            Solution
                          </span>
                          <div className="bg-gradient-to-r from-purple-500 to-violet-500 rounded-2xl px-5 md:px-6 py-3 md:py-4 text-white font-bold text-sm md:text-lg shadow-lg shadow-purple-500/30 border border-purple-400/30">
                            {solution}
                          </div>
                        </div>
                      </div>
                      {/* Arrow down - except last */}
                      {i < 5 && (
                        <div className="hidden md:flex justify-center mt-2">
                          <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[10px] border-l-transparent border-r-transparent border-t-purple-400" />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Success indicator */}
                  <div className="hidden md:block text-center pt-2">
                    <span className="inline-block bg-gradient-to-r from-purple-500 to-violet-500 text-white font-bold text-sm px-4 py-2 rounded-full shadow-lg shadow-purple-500/40 border border-purple-300/30">
                      🏠 You're a Homeowner!
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom CTA - WHITE with MAXIMUM GLOW */}
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
          </div>
        </section>

        {/* Process Steps - Premium Dark */}
        <section className="relative bg-black overflow-hidden py-20 md:py-28">
          {/* Ambient lighting */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-purple-600/20 rounded-full blur-[200px]" />
          <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[150px]" />

          {/* Grid texture */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(168,85,247,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.5) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />

          <div className="relative z-10 container mx-auto px-4">
            {/* Header */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30 backdrop-blur-sm mb-6">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <span className="text-purple-300 text-sm font-medium tracking-wider uppercase">Simple Process</span>
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
                3 Steps to{' '}
                <span className="bg-gradient-to-r from-purple-400 via-purple-400 to-violet-400 bg-clip-text text-transparent">
                  Homeownership
                </span>
              </h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Our streamlined process makes becoming a homeowner easier than ever
              </p>
            </div>

            {/* Steps */}
            <div className="max-w-5xl mx-auto">
              {/* Connecting line */}
              <div className="hidden md:block absolute left-1/2 top-[320px] -translate-x-1/2 w-[60%] h-[2px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

              <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
                {/* Step 1 */}
                <div className="relative text-center group">
                  <div className="relative mx-auto mb-8">
                    {/* Glow ring */}
                    <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    {/* Number circle */}
                    <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(168,85,247,0.3)] border border-purple-500/30 transition-all duration-500 group-hover:shadow-[0_0_60px_rgba(168,85,247,0.5)] group-hover:-translate-y-2">
                      <span className="text-5xl md:text-6xl font-light bg-gradient-to-b from-purple-300 to-purple-500 bg-clip-text text-transparent">
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
                </div>

                {/* Step 2 */}
                <div className="relative text-center group">
                  <div className="relative mx-auto mb-8">
                    <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(168,85,247,0.3)] border border-purple-500/30 transition-all duration-500 group-hover:shadow-[0_0_60px_rgba(168,85,247,0.5)] group-hover:-translate-y-2">
                      <span className="text-5xl md:text-6xl font-light bg-gradient-to-b from-purple-300 to-purple-500 bg-clip-text text-transparent">
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
                </div>

                {/* Step 3 */}
                <div className="relative text-center group">
                  <div className="relative mx-auto mb-8">
                    <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(168,85,247,0.3)] border border-purple-500/30 transition-all duration-500 group-hover:shadow-[0_0_60px_rgba(168,85,247,0.5)] group-hover:-translate-y-2">
                      <span className="text-5xl md:text-6xl font-light bg-gradient-to-b from-purple-300 to-purple-500 bg-clip-text text-transparent">
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
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center mt-16">
              <button
                onClick={scrollToForm}
                className="group relative bg-white hover:bg-purple-50 text-purple-900 font-black text-lg md:text-xl uppercase tracking-wide px-10 md:px-14 py-4 md:py-5 rounded-xl shadow-[0_0_50px_rgba(168,85,247,0.4),0_0_80px_rgba(139,92,246,0.2)] hover:shadow-[0_0_70px_rgba(168,85,247,0.5),0_0_100px_rgba(139,92,246,0.3)] transition-all duration-300 hover:-translate-y-1 border-2 border-purple-300/50"
              >
                Check If You Qualify
                <span className="ml-2 inline-block group-hover:translate-x-1 transition-transform">&rarr;</span>
              </button>
            </div>
          </div>
        </section>

        {/* Social Proof / Testimonial */}
        {funnelContent?.socialProof && (
          <div className="max-w-5xl mx-auto px-4 py-16">
            <FeaturedTestimonial
              quote={funnelContent.socialProof}
              authorName="Purple Homes Family"
              authorTitle="Proud Homeowner"
              rating={5}
            />
          </div>
        )}

        {/* Stats Bar - Premium Animated */}
        <AnimatedStatsSection />

        {/* Location & Nearby */}
        {funnelContent?.locationNearby && (
          <FunnelSection variant="white" padding="lg" blendFrom="dark">
            <SectionHeader
              overline="Location"
              title="Your New Neighborhood"
            />
            <TwoColumnLayout
              emphasis="left"
              left={
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="font-bold text-blue-900">Location Highlights</h3>
                  </div>
                  <div className="text-blue-800 whitespace-pre-wrap leading-relaxed">
                    {funnelContent.locationNearby}
                  </div>
                </div>
              }
              right={
                <div className="space-y-4">
                  <IconFeature
                    icon={<Home className="h-5 w-5" />}
                    title={property.address}
                    description={property.city}
                  />
                  {property.propertyType && (
                    <IconFeature
                      icon={<Wrench className="h-5 w-5" />}
                      title={property.propertyType}
                      description="Property Type"
                    />
                  )}
                </div>
              }
            />
          </FunnelSection>
        )}

        {/* Qualifier Section */}
        {funnelContent?.qualifier && (
          <FunnelSection variant="purple-light" padding="lg">
            <SectionHeader
              overline="Is This Right For You?"
              title="This Home is Perfect For You If..."
            />
            <div className="max-w-3xl mx-auto bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {funnelContent.qualifier}
                </div>
              </div>
            </div>
          </FunnelSection>
        )}

        {/* Virtual Tour */}
        {funnelContent?.virtualTourUrl && (
          <FunnelSection variant="white" padding="lg">
            <SectionHeader
              overline="Take a Tour"
              title="See It For Yourself"
            />
            <div className="max-w-4xl mx-auto">
              <div className="aspect-video rounded-2xl overflow-hidden shadow-xl bg-gray-100">
                {funnelContent.virtualTourUrl.includes('youtube.com') || funnelContent.virtualTourUrl.includes('youtu.be') ? (
                  <iframe
                    src={funnelContent.virtualTourUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Property Virtual Tour"
                  />
                ) : funnelContent.virtualTourUrl.includes('vimeo.com') ? (
                  <iframe
                    src={funnelContent.virtualTourUrl.replace('vimeo.com/', 'player.vimeo.com/video/')}
                    className="w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    title="Property Virtual Tour"
                  />
                ) : (
                  <iframe
                    src={funnelContent.virtualTourUrl}
                    className="w-full h-full"
                    allowFullScreen
                    title="Property Virtual Tour"
                  />
                )}
              </div>
            </div>
          </FunnelSection>
        )}

        {/* FAQ Section */}
        {parsedFAQs.length > 0 && (
          <FunnelSection variant="gray" padding="lg">
            <FunnelFAQ
              title="Frequently Asked Questions"
              subtitle="Get answers to common questions about our rent-to-own program"
              items={parsedFAQs}
              variant="default"
            />
            <div className="mt-8">
              <FAQCTA phoneNumber="(504) 475-0672" />
            </div>
          </FunnelSection>
        )}

        {/* Urgency / Countdown - DRAMATIC URGENCY */}
        <section className="relative bg-black overflow-hidden py-20 md:py-28">
          {/* Dramatic urgency lighting - red/orange warning glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-red-600/20 via-orange-500/10 to-transparent rounded-full blur-[150px]" />
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[180px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[180px]" />

          {/* Animated pulse ring */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-red-500/20 animate-ping" style={{ animationDuration: '3s' }} />

          <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
            {/* Urgency badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-500/20 border border-red-500/40 backdrop-blur-sm mb-8 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-red-300 text-sm font-bold tracking-wider uppercase">Limited Time Offer</span>
              <div className="w-2 h-2 rounded-full bg-red-500" />
            </div>

            {/* Main headline */}
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-4">
              This Price{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-red-400">
                Won't Last
              </span>
            </h2>
            <p className="text-xl text-gray-400 mb-10 max-w-xl mx-auto">
              Secure today's pricing before the next increase. Once it's gone, it's gone.
            </p>

            {/* Countdown display - custom dramatic version */}
            <div className="flex justify-center gap-3 md:gap-5 mb-12">
              {[
                { value: '01', label: 'Days' },
                { value: '23', label: 'Hours' },
                { value: '59', label: 'Min' },
                { value: '59', label: 'Sec' },
              ].map((unit, index) => (
                <div key={index} className="text-center">
                  <div className="relative">
                    {/* Glow behind */}
                    <div className="absolute inset-0 bg-gradient-to-b from-red-500/30 to-purple-500/30 rounded-2xl blur-xl scale-110" />
                    <div className="relative bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-2xl px-4 md:px-6 py-4 md:py-6 border border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                      <div className="text-4xl md:text-6xl font-black text-white tabular-nums">
                        {unit.value}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs md:text-sm uppercase tracking-wider text-gray-500 mt-3 font-semibold">
                    {unit.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Scarcity indicator */}
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-orange-500/10 border border-orange-500/30 mb-10">
              <span className="text-orange-400 text-2xl">🔥</span>
              <span className="text-orange-300 font-bold">Only 3 spots left at this price</span>
              <span className="text-orange-400 text-2xl">🔥</span>
            </div>

            {/* CTA - Maximum urgency */}
            <div>
              <button
                onClick={scrollToForm}
                className="group relative bg-gradient-to-r from-red-500 via-orange-500 to-red-500 hover:from-red-400 hover:via-orange-400 hover:to-red-400 text-white font-black text-lg md:text-xl uppercase tracking-wide px-12 md:px-16 py-5 md:py-6 rounded-2xl shadow-[0_0_60px_rgba(239,68,68,0.4),0_0_100px_rgba(249,115,22,0.2)] hover:shadow-[0_0_80px_rgba(239,68,68,0.5),0_0_120px_rgba(249,115,22,0.3)] transition-all duration-300 hover:-translate-y-1 border-2 border-orange-400/50"
              >
                Lock In This Price Now
                <span className="ml-3 inline-block group-hover:translate-x-2 transition-transform text-2xl">&rarr;</span>
              </button>
              <p className="text-gray-500 text-sm mt-4">Price increases after timer expires</p>
            </div>
          </div>
        </section>

        {/* Final CTA Section - Dark Premium */}
        {funnelContent?.callToAction && (
          <section className="relative bg-black overflow-hidden py-16 md:py-20">
            {/* Ambient lighting */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[180px]" />
            <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-600/15 rounded-full blur-[150px]" />

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
                  className="group relative bg-white hover:bg-purple-50 text-purple-900 font-black text-lg md:text-xl uppercase tracking-wide px-10 md:px-14 py-4 md:py-5 rounded-xl shadow-[0_0_50px_rgba(168,85,247,0.4),0_0_80px_rgba(139,92,246,0.2)] hover:shadow-[0_0_70px_rgba(168,85,247,0.5),0_0_100px_rgba(139,92,246,0.3)] transition-all duration-300 hover:-translate-y-1 border-2 border-purple-300/50"
                >
                  Get Pre-Qualified Now
                  <span className="ml-2 inline-block group-hover:translate-x-1 transition-transform">&rarr;</span>
                </button>
                <a
                  href="tel:+15044750672"
                  className="inline-flex items-center justify-center gap-2 bg-transparent hover:bg-white/10 text-white font-bold text-lg uppercase tracking-wide px-8 py-4 rounded-xl border-2 border-white/30 hover:border-white/50 transition-all duration-300"
                >
                  <Phone className="h-5 w-5" />
                  Call (504) 475-0672
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

        {/* Contact Form Section - Premium */}
        <FunnelSection variant="light" padding="lg" id="contact-form">
          <div className="max-w-xl mx-auto">
            <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-br from-purple-900 via-purple-800 to-purple-950 p-8 text-white text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-purple-400/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl" />
                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl mb-4 shadow-lg shadow-purple-500/40">
                    <Home className="h-7 w-7 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold">Get Pre-Qualified Today</h2>
                  <p className="text-purple-200 mt-1">No credit check required to start</p>
                </div>
              </div>

              {!showOfferForm ? (
                <div className="p-8 space-y-5">
                  <div className="text-center mb-6">
                    <p className="text-gray-600">Interested in {property.address}?</p>
                  </div>
                  <CTAButton size="full" variant="secondary" onClick={() => setShowOfferForm(true)}>
                    Yes, I'm Interested!
                  </CTAButton>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" size="lg" className="w-full border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300" asChild>
                      <a href="tel:+15044750672">
                        <Phone className="h-4 w-4 mr-2" />
                        Call Us
                      </a>
                    </Button>
                    <Button variant="outline" size="lg" className="w-full border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300" asChild>
                      <a href="sms:+15044750672">
                        <Phone className="h-4 w-4 mr-2" />
                        Text Us
                      </a>
                    </Button>
                  </div>
                  <TrustIndicators className="justify-center" variant="premium" />
                </div>
              ) : (
                <form onSubmit={handleOfferSubmit} className="p-6 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold">First Name *</Label>
                      <Input
                        value={offerForm.firstName}
                        onChange={(e) => setOfferForm(prev => ({ ...prev, firstName: e.target.value }))}
                        required
                        placeholder="John"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">Last Name *</Label>
                      <Input
                        value={offerForm.lastName}
                        onChange={(e) => setOfferForm(prev => ({ ...prev, lastName: e.target.value }))}
                        required
                        placeholder="Doe"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Phone Number *</Label>
                    <PhoneInput
                      value={offerForm.phone}
                      onChange={(value) => setOfferForm(prev => ({ ...prev, phone: value || '' }))}
                      required
                      placeholder="Enter phone number"
                      defaultCountry="US"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Email *</Label>
                    <Input
                      type="email"
                      value={offerForm.email}
                      onChange={(e) => setOfferForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                      placeholder="john@example.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Your Budget (Optional)</Label>
                    <Input
                      placeholder="$1,500/month"
                      value={offerForm.offerAmount}
                      onChange={(e) => setOfferForm(prev => ({ ...prev, offerAmount: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">Message (Optional)</Label>
                    <Textarea
                      value={offerForm.message}
                      onChange={(e) => setOfferForm(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Tell us about your situation..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <CTAButton
                    type="submit"
                    size="full"
                    disabled={submitForm.isPending}
                  >
                    {submitForm.isPending ? (
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
                    className="w-full"
                    onClick={() => setShowOfferForm(false)}
                  >
                    Cancel
                  </Button>
                  <TrustIndicators className="justify-center" variant="premium" />
                </form>
              )}
            </div>
          </div>
        </FunnelSection>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">P</span>
          </div>
          <h3 className="text-xl font-bold mb-2">Purple Homes Solutions</h3>
          <p className="text-gray-400 mb-4">Creative Real Estate Financing</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a href="tel:+15044750672" className="text-purple-400 hover:text-purple-300 font-semibold">
              (504) 475-0672
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
      </footer>

      {/* Sticky Mobile CTA */}
      <StickyMobileCTA
        ctaText="Get Pre-Qualified"
        onCtaClick={scrollToForm}
        phoneNumber="(504) 475-0672"
        variant="simple"
      />

      {/* Floating Action Button (Desktop) - SMS for better conversion */}
      <FloatingActionButton
        icon="message"
        href="sms:+15044750672"
        label="Text Us"
      />
    </div>
  );
}
