/**
 * Testimonial Marquee Component
 *
 * Desktop: Slow auto-scrolling horizontal carousel.
 * Mobile: Static vertical stack for easy reading.
 */

import { useState } from 'react';
import type { Testimonial } from '@/types/funnel';

const isMobileDevice = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;

interface TestimonialMarqueeProps {
  testimonials: Testimonial[];
  speed?: number; // pixels per second, default 30
}

function StarRating({ rating = 5 }: { rating?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-3.5 h-3.5 ${star <= rating ? 'text-amber-400/90 fill-current' : 'text-white/20 fill-current'}`}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function TestimonialCard({ testimonial, mobile }: { testimonial: Testimonial; mobile?: boolean }) {
  // Clean quote text - remove any existing surrounding quotes
  const cleanQuote = testimonial.quote.replace(/^["'"]+|["'"]+$/g, '').trim();

  if (mobile) {
    return (
      <div className="w-full">
        <div className="bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6">
          <StarRating rating={testimonial.rating} />
          <p className="text-white/80 text-[15px] leading-[1.7] mt-4 mb-6 font-light">
            "{cleanQuote}"
          </p>
          <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500/80 to-violet-600/80 rounded-full flex items-center justify-center text-white font-medium text-sm">
              {testimonial.authorName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-white/90 font-medium text-sm">{testimonial.authorName}</p>
              <p className="text-white/40 text-xs">{testimonial.authorTitle || 'Purple Homes Homeowner'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 w-[300px] md:w-[360px] mx-3 group">
      {/* Card with subtle glass effect - no glowing box */}
      <div className="bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6 transition-all duration-300 hover:bg-white/[0.05] hover:border-white/[0.10]">
        {/* Stars */}
        <StarRating rating={testimonial.rating} />

        {/* Quote - clean typography */}
        <p className="text-white/80 text-[15px] leading-[1.7] mt-4 mb-6 min-h-[90px] font-light">
          "{cleanQuote}"
        </p>

        {/* Author - minimal divider */}
        <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
          <div className="w-9 h-9 bg-gradient-to-br from-purple-500/80 to-violet-600/80 rounded-full flex items-center justify-center text-white font-medium text-sm">
            {testimonial.authorName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-white/90 font-medium text-sm">{testimonial.authorName}</p>
            <p className="text-white/40 text-xs">{testimonial.authorTitle || 'Purple Homes Homeowner'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TestimonialMarquee({ testimonials, speed = 30 }: TestimonialMarqueeProps) {
  const [isPaused, setIsPaused] = useState(false);

  // Smooth duration calculation based on one set of testimonials
  const duration = (testimonials.length * 12) * (30 / speed);

  if (testimonials.length === 0) {
    return null;
  }

  // Mobile: static vertical stack
  if (isMobileDevice) {
    return (
      <div className="px-4 py-6 space-y-4">
        {testimonials.map((testimonial, index) => (
          <TestimonialCard key={index} testimonial={testimonial} mobile />
        ))}
      </div>
    );
  }

  // Desktop: infinite horizontal marquee
  return (
    <div
      className="overflow-hidden py-6"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Two identical tracks side by side for seamless infinite scroll */}
      <div
        className="flex marquee-track"
        style={{
          '--duration': `${duration}s`,
          animationPlayState: isPaused ? 'paused' : 'running',
        } as React.CSSProperties}
      >
        {/* First set */}
        <div className="flex flex-shrink-0">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={`a-${index}`} testimonial={testimonial} />
          ))}
        </div>
        {/* Duplicate set for seamless loop */}
        <div className="flex flex-shrink-0">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={`b-${index}`} testimonial={testimonial} />
          ))}
        </div>
      </div>

      {/* Keyframes: translate exactly one set's width (50% of the two sets combined) */}
      <style>{`
        @keyframes scroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        .marquee-track {
          animation: scroll var(--duration, 60s) linear infinite;
          will-change: transform;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
      `}</style>
    </div>
  );
}

export default TestimonialMarquee;
