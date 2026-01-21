import * as React from "react";
import { cn } from "@/lib/utils";
import { Play, Quote, Star, Sparkles, BadgeCheck } from "lucide-react";

// Quote Testimonial Card - Premium Edition
interface QuoteTestimonialProps {
  quote: string;
  authorName: string;
  authorTitle?: string;
  authorImage?: string;
  rating?: number;
  className?: string;
  variant?: "default" | "featured" | "compact" | "premium" | "luxury";
  verified?: boolean;
}

const QuoteTestimonial: React.FC<QuoteTestimonialProps> = ({
  quote,
  authorName,
  authorTitle,
  authorImage,
  rating = 5,
  className,
  variant = "default",
  verified = false,
}) => {
  const variants = {
    default: {
      container: "bg-white rounded-2xl p-8 shadow-lg border border-gray-100",
      quote: "text-purple-200",
      text: "text-gray-700",
      subtext: "text-gray-500",
      avatar: "bg-purple-100 text-purple-600",
      stars: "text-yellow-400 fill-yellow-400",
    },
    featured: {
      container: "bg-gradient-to-br from-purple-600 to-purple-800 text-white rounded-2xl p-8 shadow-xl",
      quote: "text-purple-300",
      text: "text-white",
      subtext: "text-purple-200",
      avatar: "bg-white/20 text-white",
      stars: "text-yellow-400 fill-yellow-400",
    },
    compact: {
      container: "bg-gray-50 rounded-xl p-6",
      quote: "text-purple-200",
      text: "text-gray-700",
      subtext: "text-gray-500",
      avatar: "bg-purple-100 text-purple-600",
      stars: "text-yellow-400 fill-yellow-400",
    },
    premium: {
      container: "bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white rounded-2xl p-8 shadow-2xl border border-amber-500/20",
      quote: "text-amber-500/30",
      text: "text-white",
      subtext: "text-gray-400",
      avatar: "bg-gradient-to-br from-amber-400 to-amber-600 text-white",
      stars: "text-amber-400 fill-amber-400",
    },
    luxury: {
      container: "bg-gradient-to-br from-amber-50 via-white to-amber-50 rounded-2xl p-8 shadow-xl border border-amber-200",
      quote: "text-amber-300",
      text: "text-gray-800",
      subtext: "text-amber-700",
      avatar: "bg-gradient-to-br from-amber-400 to-amber-600 text-white",
      stars: "text-amber-500 fill-amber-500",
    },
  };

  const style = variants[variant];

  return (
    <div className={cn(style.container, "relative overflow-hidden", className)}>
      {/* Decorative elements for premium variants */}
      {(variant === "premium" || variant === "luxury") && (
        <div className={cn(
          "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20",
          variant === "premium" ? "bg-amber-500" : "bg-amber-300"
        )} />
      )}

      {/* Quote mark */}
      <Quote
        className={cn(
          "absolute top-4 left-4 h-16 w-16 opacity-30",
          style.quote
        )}
      />

      {/* Rating stars */}
      {rating > 0 && (
        <div className="flex gap-1 mb-4 relative z-10">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                "h-5 w-5",
                i < rating ? style.stars : "text-gray-300 fill-transparent"
              )}
            />
          ))}
        </div>
      )}

      {/* Quote text */}
      <blockquote
        className={cn(
          "text-lg md:text-xl leading-relaxed mb-6 relative z-10 font-medium",
          variant === "compact" ? "text-base mb-4" : "",
          style.text
        )}
      >
        "{quote}"
      </blockquote>

      {/* Author */}
      <div className="flex items-center gap-4 relative z-10">
        {authorImage ? (
          <div className="relative">
            <img
              src={authorImage}
              alt={authorName}
              className={cn(
                "w-14 h-14 rounded-full object-cover",
                variant === "premium" || variant === "luxury"
                  ? "border-2 border-amber-400 shadow-lg shadow-amber-500/20"
                  : "border-2 border-white shadow-md"
              )}
            />
            {verified && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                <BadgeCheck className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
        ) : (
          <div className="relative">
            <div
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold",
                style.avatar
              )}
            >
              {authorName.charAt(0)}
            </div>
            {verified && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                <BadgeCheck className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
        )}
        <div>
          <div className={cn("font-bold", style.text)}>{authorName}</div>
          {authorTitle && (
            <div className={cn("text-sm", style.subtext)}>{authorTitle}</div>
          )}
        </div>
      </div>
    </div>
  );
};

// Video Testimonial Card - Premium Edition
interface VideoTestimonialProps {
  thumbnailUrl: string;
  videoUrl?: string;
  authorName: string;
  authorLocation?: string;
  duration?: string;
  onClick?: () => void;
  className?: string;
  variant?: "default" | "premium";
}

const VideoTestimonial: React.FC<VideoTestimonialProps> = ({
  thumbnailUrl,
  videoUrl,
  authorName,
  authorLocation,
  duration,
  onClick,
  className,
  variant = "default",
}) => {
  const [isPlaying, setIsPlaying] = React.useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (videoUrl) {
      setIsPlaying(true);
    }
  };

  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden shadow-xl group cursor-pointer",
        variant === "premium" && "ring-2 ring-amber-500/30",
        className
      )}
      onClick={handleClick}
    >
      {isPlaying && videoUrl ? (
        <div className="aspect-video">
          <iframe
            src={videoUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <>
          {/* Thumbnail */}
          <div className="aspect-video">
            <img
              src={thumbnailUrl}
              alt={`${authorName} testimonial`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-all duration-300",
              variant === "premium"
                ? "bg-gradient-to-br from-amber-400 to-amber-600"
                : "bg-white/90"
            )}>
              <Play
                className={cn(
                  "h-8 w-8 ml-1",
                  variant === "premium" ? "text-white" : "text-purple-600"
                )}
                fill="currentColor"
              />
            </div>
          </div>

          {/* Duration badge */}
          {duration && (
            <div className={cn(
              "absolute top-4 right-4 px-3 py-1.5 rounded-full text-sm font-medium",
              variant === "premium"
                ? "bg-amber-500/90 text-white"
                : "bg-black/60 text-white"
            )}>
              {duration}
            </div>
          )}

          {/* Premium badge */}
          {variant === "premium" && (
            <div className="absolute top-4 left-4 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-amber-600 rounded-full text-xs font-bold text-white flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Featured
            </div>
          )}

          {/* Author info */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="text-white font-bold text-lg">{authorName}</div>
            {authorLocation && (
              <div className="text-white/80 text-sm">{authorLocation}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// Testimonial Grid
interface TestimonialGridProps {
  testimonials: Array<{
    type: "quote" | "video";
    quote?: string;
    authorName: string;
    authorTitle?: string;
    authorLocation?: string;
    authorImage?: string;
    thumbnailUrl?: string;
    videoUrl?: string;
    rating?: number;
  }>;
  className?: string;
}

const TestimonialGrid: React.FC<TestimonialGridProps> = ({
  testimonials,
  className,
}) => {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
        className
      )}
    >
      {testimonials.map((testimonial, index) =>
        testimonial.type === "video" && testimonial.thumbnailUrl ? (
          <VideoTestimonial
            key={index}
            thumbnailUrl={testimonial.thumbnailUrl}
            videoUrl={testimonial.videoUrl}
            authorName={testimonial.authorName}
            authorLocation={testimonial.authorLocation}
          />
        ) : testimonial.quote ? (
          <QuoteTestimonial
            key={index}
            quote={testimonial.quote}
            authorName={testimonial.authorName}
            authorTitle={testimonial.authorTitle}
            authorImage={testimonial.authorImage}
            rating={testimonial.rating}
          />
        ) : null
      )}
    </div>
  );
};

// Mini Testimonial - For inline social proof
interface MiniTestimonialProps {
  quote: string;
  authorName: string;
  authorImage?: string;
  className?: string;
  variant?: "default" | "premium";
}

const MiniTestimonial: React.FC<MiniTestimonialProps> = ({
  quote,
  authorName,
  authorImage,
  className,
  variant = "default",
}) => {
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl transition-all duration-300",
        variant === "premium"
          ? "bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 hover:shadow-lg"
          : "bg-gray-50 hover:bg-gray-100",
        className
      )}
    >
      {authorImage ? (
        <img
          src={authorImage}
          alt={authorName}
          className={cn(
            "w-10 h-10 rounded-full object-cover flex-shrink-0",
            variant === "premium" && "ring-2 ring-amber-400"
          )}
        />
      ) : (
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0",
          variant === "premium"
            ? "bg-gradient-to-br from-amber-400 to-amber-600 text-white"
            : "bg-purple-100 text-purple-600"
        )}>
          {authorName.charAt(0)}
        </div>
      )}
      <div>
        <p className={cn(
          "text-sm italic",
          variant === "premium" ? "text-amber-900" : "text-gray-600"
        )}>
          "{quote}"
        </p>
        <p className={cn(
          "text-xs mt-1 font-medium",
          variant === "premium" ? "text-amber-700" : "text-gray-500"
        )}>
          — {authorName}
        </p>
      </div>
    </div>
  );
};

// Featured Testimonial - Large hero style
interface FeaturedTestimonialProps {
  quote: string;
  authorName: string;
  authorTitle?: string;
  authorImage?: string;
  rating?: number;
  className?: string;
}

const FeaturedTestimonial: React.FC<FeaturedTestimonialProps> = ({
  quote,
  authorName,
  authorTitle,
  authorImage,
  rating = 5,
  className,
}) => {
  return (
    <div className={cn(
      "relative bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-3xl p-10 md:p-14 overflow-hidden",
      className
    )}>
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative z-10 max-w-3xl mx-auto text-center">
        {/* Quote icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl mb-8 shadow-lg shadow-amber-500/30">
          <Quote className="h-8 w-8 text-white" />
        </div>

        {/* Stars */}
        {rating > 0 && (
          <div className="flex justify-center gap-1 mb-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "h-6 w-6",
                  i < rating ? "text-amber-400 fill-amber-400" : "text-gray-600"
                )}
              />
            ))}
          </div>
        )}

        {/* Quote */}
        <blockquote className="text-2xl md:text-3xl text-white font-medium leading-relaxed mb-10">
          "{quote}"
        </blockquote>

        {/* Author */}
        <div className="flex items-center justify-center gap-4">
          {authorImage ? (
            <img
              src={authorImage}
              alt={authorName}
              className="w-16 h-16 rounded-full object-cover border-2 border-amber-400 shadow-lg"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-2xl font-bold text-white">
              {authorName.charAt(0)}
            </div>
          )}
          <div className="text-left">
            <div className="text-white font-bold text-lg">{authorName}</div>
            {authorTitle && (
              <div className="text-gray-400">{authorTitle}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export {
  QuoteTestimonial,
  VideoTestimonial,
  TestimonialGrid,
  MiniTestimonial,
  FeaturedTestimonial,
};
