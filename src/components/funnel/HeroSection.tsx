import * as React from "react";
import { cn } from "@/lib/utils";
import { CTAButton } from "./CTAButton";
import { TrustBar } from "./TrustBadge";
import { Play } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface HeroSectionProps {
  /** Overline text above headline */
  overline?: string;
  /** Main headline */
  headline: string;
  /** Secondary headline or subtext */
  subheadline?: string;
  /** Background image URL */
  backgroundImage?: string;
  /** Price display */
  price?: string;
  /** Monthly payment */
  monthlyPayment?: string;
  /** Primary CTA text */
  ctaText?: string;
  /** Primary CTA action */
  onCtaClick?: () => void;
  /** Secondary CTA text */
  secondaryCtaText?: string;
  /** Secondary CTA action */
  onSecondaryCtaClick?: () => void;
  /** Show trust badges */
  showTrustBadges?: boolean;
  /** Video URL for play button */
  videoUrl?: string;
  /** Variant style */
  variant?: "default" | "split" | "centered" | "minimal";
  className?: string;
  children?: React.ReactNode;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  overline,
  headline,
  subheadline,
  backgroundImage,
  price,
  monthlyPayment,
  ctaText,
  onCtaClick,
  secondaryCtaText,
  onSecondaryCtaClick,
  showTrustBadges = true,
  videoUrl,
  variant = "default",
  className,
  children,
}) => {
  const { t } = useLanguage();
  const [showVideo, setShowVideo] = React.useState(false);
  const resolvedCtaText = ctaText ?? t('cta.getPreQualifiedNow');

  if (variant === "split") {
    return (
      <section className={cn("relative bg-gray-900", className)}>
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 min-h-[600px] lg:min-h-[700px]">
            {/* Content Side */}
            <div className="flex flex-col justify-center py-16 lg:py-24 lg:pr-12">
              {overline && (
                <span className="text-orange-500 font-bold uppercase tracking-wider text-sm mb-4">
                  {overline}
                </span>
              )}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
                {headline}
              </h1>
              {subheadline && (
                <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                  {subheadline}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <CTAButton onClick={onCtaClick} size="xl">
                  {resolvedCtaText}
                </CTAButton>
                {secondaryCtaText && (
                  <CTAButton
                    variant="outline"
                    onClick={onSecondaryCtaClick}
                    size="xl"
                    className="border-white text-white hover:bg-white/10"
                  >
                    {secondaryCtaText}
                  </CTAButton>
                )}
              </div>

              {showTrustBadges && <TrustBar variant="dark" />}
            </div>

            {/* Image Side */}
            <div className="relative hidden lg:block">
              {backgroundImage && (
                <>
                  <img
                    src={backgroundImage}
                    alt="Property"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/50 to-transparent" />
                </>
              )}

              {/* Price overlay */}
              {price && (
                <div className="absolute bottom-8 left-8 bg-white/95 backdrop-blur rounded-xl p-6 shadow-xl">
                  <div className="text-3xl font-extrabold text-gray-900">
                    {price}
                  </div>
                  {monthlyPayment && (
                    <div className="text-purple-600 font-semibold">
                      {monthlyPayment}/month
                    </div>
                  )}
                </div>
              )}

              {/* Video play button */}
              {videoUrl && (
                <button
                  onClick={() => setShowVideo(true)}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white/90 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
                >
                  <Play className="h-10 w-10 text-purple-600 ml-1" fill="currentColor" />
                </button>
              )}
            </div>
          </div>
        </div>

        {children}
      </section>
    );
  }

  if (variant === "centered") {
    return (
      <section
        className={cn(
          "relative min-h-[600px] md:min-h-[700px] flex items-center justify-center",
          className
        )}
      >
        {/* Background */}
        {backgroundImage && (
          <>
            <img
              src={backgroundImage}
              alt="Background"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
          </>
        )}

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 text-center py-16">
          {overline && (
            <span className="inline-block px-4 py-2 bg-orange-500 text-white font-bold uppercase tracking-wider text-sm rounded-full mb-6">
              {overline}
            </span>
          )}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6 max-w-4xl mx-auto">
            {headline}
          </h1>
          {subheadline && (
            <p className="text-xl md:text-2xl text-gray-200 mb-8 max-w-2xl mx-auto leading-relaxed">
              {subheadline}
            </p>
          )}

          {/* Price badge */}
          {price && (
            <div className="inline-flex items-center gap-4 bg-white/95 backdrop-blur rounded-xl px-6 py-4 shadow-xl mb-8">
              <div className="text-3xl font-extrabold text-gray-900">{price}</div>
              {monthlyPayment && (
                <>
                  <div className="w-px h-10 bg-gray-300" />
                  <div className="text-left">
                    <div className="text-sm text-gray-500">As low as</div>
                    <div className="text-xl font-bold text-purple-600">
                      {monthlyPayment}/mo
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <CTAButton onClick={onCtaClick} size="xl">
              {resolvedCtaText}
            </CTAButton>
            {secondaryCtaText && (
              <CTAButton
                variant="white"
                onClick={onSecondaryCtaClick}
                size="xl"
              >
                {secondaryCtaText}
              </CTAButton>
            )}
          </div>

          {showTrustBadges && <TrustBar variant="light" />}
        </div>

        {children}
      </section>
    );
  }

  if (variant === "minimal") {
    return (
      <section className={cn("bg-white py-16 md:py-24", className)}>
        <div className="container mx-auto px-4 text-center">
          {overline && (
            <span className="text-purple-600 font-bold uppercase tracking-wider text-sm mb-4 block">
              {overline}
            </span>
          )}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6 max-w-4xl mx-auto">
            {headline}
          </h1>
          {subheadline && (
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              {subheadline}
            </p>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <CTAButton onClick={onCtaClick} size="lg">
              {resolvedCtaText}
            </CTAButton>
            {secondaryCtaText && (
              <CTAButton variant="outline" onClick={onSecondaryCtaClick} size="lg">
                {secondaryCtaText}
              </CTAButton>
            )}
          </div>
        </div>

        {children}
      </section>
    );
  }

  // Default variant
  return (
    <section
      className={cn(
        "relative min-h-[500px] md:min-h-[600px] flex items-end",
        className
      )}
    >
      {/* Background Image */}
      {backgroundImage && (
        <>
          <img
            src={backgroundImage}
            alt="Property"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        </>
      )}

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-3xl">
          {overline && (
            <span className="inline-block px-3 py-1 bg-orange-500 text-white font-bold uppercase tracking-wider text-xs rounded mb-4">
              {overline}
            </span>
          )}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-4">
            {headline}
          </h1>
          {subheadline && (
            <p className="text-lg md:text-xl text-gray-200 mb-6 leading-relaxed">
              {subheadline}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <CTAButton onClick={onCtaClick} size="lg">
              {resolvedCtaText}
            </CTAButton>
            {secondaryCtaText && (
              <CTAButton
                variant="white"
                onClick={onSecondaryCtaClick}
                size="lg"
                icon="phone"
              >
                {secondaryCtaText}
              </CTAButton>
            )}
          </div>

          {showTrustBadges && <TrustBar variant="light" className="justify-start" />}
        </div>

        {/* Price overlay */}
        {price && (
          <div className="absolute bottom-12 right-4 md:right-8 bg-white/95 backdrop-blur rounded-xl p-4 md:p-6 shadow-xl">
            <div className="text-2xl md:text-3xl font-extrabold text-gray-900">
              {price}
            </div>
            {monthlyPayment && (
              <div className="text-purple-600 font-semibold text-sm md:text-base">
                {monthlyPayment}/month
              </div>
            )}
          </div>
        )}
      </div>

      {children}

      {/* Video Modal */}
      {showVideo && videoUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowVideo(false)}
        >
          <div className="w-full max-w-4xl aspect-video">
            <iframe
              src={videoUrl}
              className="w-full h-full rounded-xl"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </section>
  );
};

// Property Image Gallery Hero
interface GalleryHeroProps {
  images: string[];
  price?: string;
  monthlyPayment?: string;
  address?: string;
  className?: string;
}

const GalleryHero: React.FC<GalleryHeroProps> = ({
  images,
  price,
  monthlyPayment,
  address,
  className,
}) => {
  const [activeIndex, setActiveIndex] = React.useState(0);

  return (
    <section className={cn("relative", className)}>
      {/* Main Image */}
      <div className="relative aspect-[16/10] md:aspect-[21/9]">
        <img
          src={images[activeIndex]}
          alt={`Property image ${activeIndex + 1}`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Price overlay */}
        <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8">
          {price && (
            <div className="bg-white/95 backdrop-blur rounded-xl p-4 md:p-6 shadow-xl">
              <div className="text-2xl md:text-4xl font-extrabold text-gray-900">
                {price}
              </div>
              {monthlyPayment && (
                <div className="text-purple-600 font-semibold">
                  {monthlyPayment}/month
                </div>
              )}
              {address && (
                <div className="text-gray-500 text-sm mt-1">{address}</div>
              )}
            </div>
          )}
        </div>

        {/* Image count */}
        <div className="absolute bottom-6 right-6 md:bottom-8 md:right-8 bg-black/60 text-white px-3 py-1.5 rounded-lg text-sm">
          {activeIndex + 1} / {images.length}
        </div>
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-2 p-4 bg-gray-100 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "flex-shrink-0 w-20 h-16 md:w-24 md:h-18 rounded-lg overflow-hidden border-2 transition-all",
                index === activeIndex
                  ? "border-purple-500 ring-2 ring-purple-500/30"
                  : "border-transparent opacity-60 hover:opacity-100"
              )}
            >
              <img
                src={image}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
};

export { HeroSection, GalleryHero };
