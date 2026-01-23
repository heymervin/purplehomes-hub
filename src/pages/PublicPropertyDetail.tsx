import { useState, useMemo, useEffect } from 'react';
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
        {/* Hero Section with Gallery */}
        <section className="relative">
          <PropertyImageGallery
            images={property.images || [property.heroImage]}
            heroImage={property.heroImage}
            onHeroChange={() => {}}
            onImagesChange={() => {}}
            editable={false}
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

          {/* Hero Content Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <div className="max-w-6xl mx-auto">
              {/* Live Viewers Badge */}
              <div className="mb-4">
                <LiveViewers count={Math.floor(Math.random() * 5) + 2} variant="premium" />
              </div>

              {/* Price & Address */}
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                  <div className="flex items-baseline gap-3 mb-2">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg">
                      ${property.price.toLocaleString()}
                    </h1>
                    {property.monthlyPayment !== undefined && (
                      <span className="text-xl md:text-2xl font-bold text-purple-300">
                        ${property.monthlyPayment.toLocaleString()}/mo
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl md:text-2xl font-semibold text-white">{property.address}</h2>
                  <p className="text-purple-200 flex items-center gap-1 mt-1">
                    <MapPin className="h-4 w-4" />
                    {property.city}
                  </p>
                </div>

                {/* Quick Stats Pills */}
                <div className="flex flex-wrap gap-2">
                  <span className="px-4 py-2 bg-white/20 backdrop-blur rounded-full text-white font-semibold flex items-center gap-2">
                    <Bed className="h-4 w-4" /> {property.beds} Beds
                  </span>
                  <span className="px-4 py-2 bg-white/20 backdrop-blur rounded-full text-white font-semibold flex items-center gap-2">
                    <Bath className="h-4 w-4" /> {property.baths} Baths
                  </span>
                  {property.sqft && (
                    <span className="px-4 py-2 bg-white/20 backdrop-blur rounded-full text-white font-semibold flex items-center gap-2">
                      <Maximize2 className="h-4 w-4" /> {property.sqft.toLocaleString()} sqft
                    </span>
                  )}
                </div>
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

        {/* Investment Details / Pricing */}
        {(property.downPayment !== undefined || property.monthlyPayment !== undefined) && (
          <FunnelSection variant="purple-light" padding="lg">
            <SectionHeader
              overline="Your Investment"
              title="Affordable Payment Options"
              subtitle="We structure deals to fit your budget, not the other way around"
            />
            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 text-white text-center">
                  <div className="text-sm uppercase tracking-wide opacity-80 mb-1">Total Price</div>
                  <div className="text-4xl md:text-5xl font-extrabold">${property.price.toLocaleString()}</div>
                </div>
                <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                  {property.downPayment !== undefined && (
                    <div className="p-6 text-center">
                      <DollarSign className="h-8 w-8 text-green-500 mx-auto mb-2" />
                      <div className="text-sm text-gray-500 uppercase tracking-wide mb-1">Move-In Cost</div>
                      <div className="text-3xl font-bold text-gray-900">${property.downPayment.toLocaleString()}</div>
                      <p className="text-sm text-gray-500 mt-2">Goes toward your purchase</p>
                    </div>
                  )}
                  {property.monthlyPayment !== undefined && (
                    <div className="p-6 text-center">
                      <CreditCard className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                      <div className="text-sm text-gray-500 uppercase tracking-wide mb-1">Monthly Payment</div>
                      <div className="text-3xl font-bold text-gray-900">${property.monthlyPayment.toLocaleString()}</div>
                      <p className="text-sm text-gray-500 mt-2">Build equity every month</p>
                    </div>
                  )}
                </div>
                <div className="p-6 bg-gray-50 text-center">
                  <CTAButton onClick={scrollToForm} size="lg">
                    Check If You Qualify
                  </CTAButton>
                </div>
              </div>
            </div>

            {funnelContent?.pricingOptions && (
              <div className="mt-8 max-w-2xl mx-auto bg-white rounded-xl p-6 shadow-md">
                <h4 className="font-semibold text-gray-900 mb-3">Payment Breakdown</h4>
                <div className="text-gray-700 whitespace-pre-wrap leading-relaxed font-mono text-sm bg-gray-50 rounded-lg p-4">
                  {funnelContent.pricingOptions}
                </div>
              </div>
            )}
          </FunnelSection>
        )}

        {/* Comparison Table - Luxury Cards */}
        <FunnelSection variant="luxury-cream" padding="lg" blendTo="white">
          <ComparisonTable
            title="Renting vs. Owning With Purple Homes"
            subtitle="See why hundreds of families are making the switch"
            variant="luxury-cards"
            rows={[
              { feature: "Monthly payment goes to", optionA: "Landlord's pocket", optionB: "YOUR equity" },
              { feature: "Build wealth over time", optionA: false, optionB: true },
              { feature: "Tax benefits available", optionA: false, optionB: true },
              { feature: "Price locked in today", optionA: false, optionB: true },
              { feature: "Make it your own", optionA: false, optionB: true },
              { feature: "Risk of rent increases", optionA: true, optionB: false },
              { feature: "Can be forced to move", optionA: true, optionB: false },
            ]}
          />
        </FunnelSection>

        {/* Process Steps - Luxury */}
        <FunnelSection variant="white" padding="lg" blendTo="dark">
          <ProcessSteps
            title="3 Simple Steps to Homeownership"
            subtitle="Our streamlined process makes becoming a homeowner easy"
            variant="luxury"
          />
          <div className="text-center mt-14">
            <CTAButton onClick={scrollToForm} size="xl">
              Start Your Application
            </CTAButton>
          </div>
        </FunnelSection>

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

        {/* Stats Bar - Premium */}
        <StatsBar
          variant="premium"
          stats={[
            { value: "500", label: "Families Helped", suffix: "+" },
            { value: "15", label: "Years Experience", suffix: "+" },
            { value: "98", label: "Satisfaction Rate", suffix: "%" },
            { value: "24", label: "Hour Response", prefix: "<" },
          ]}
        />

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

        {/* Urgency / Countdown - Premium */}
        <FunnelSection variant="white" padding="lg" blendTo={funnelContent?.callToAction ? "purple" : undefined}>
          <div className="max-w-2xl mx-auto">
            <CountdownTimer
              hoursFromNow={48}
              title="Exclusive Pricing Ends Soon"
              subtitle="Lock in today's price before it increases"
              variant="premium"
            />
          </div>
        </FunnelSection>

        {/* Final CTA Section */}
        {funnelContent?.callToAction && (
          <FunnelSection variant="purple" padding="lg" blendTo="white">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Stop Renting and Start Owning?
              </h2>
              <p className="text-xl text-purple-100 mb-8">
                {funnelContent.callToAction}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <CTAButton size="xl" onClick={scrollToForm}>
                  Get Pre-Qualified Now
                </CTAButton>
                <CTAButton
                  variant="white"
                  size="xl"
                  icon="phone"
                  onClick={() => window.location.href = 'tel:+15044750672'}
                >
                  Call (504) 475-0672
                </CTAButton>
              </div>
              <TrustIndicators
                className="mt-8 justify-center text-purple-200"
                items={["No obligation", "Free consultation", "Fast response"]}
              />
            </div>
          </FunnelSection>
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
