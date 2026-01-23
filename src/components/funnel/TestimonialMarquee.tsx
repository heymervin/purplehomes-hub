/**
 * Testimonial Marquee Component
 *
 * A slow auto-scrolling horizontal carousel of testimonial cards.
 * Used on property funnel pages for social proof.
 */

import { useState } from 'react';
import type { Testimonial } from '@/types/funnel';

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
          className={`w-4 h-4 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-600'}`}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  // Clean quote text - remove any existing surrounding quotes
  const cleanQuote = testimonial.quote.replace(/^["'"]+|["'"]+$/g, '').trim();

  return (
    <div className="flex-shrink-0 w-[320px] md:w-[380px] bg-gradient-to-br from-[#1e1a2e] to-[#13101c] border border-purple-500/30 rounded-2xl p-6 mx-2 shadow-[0_0_40px_rgba(139,92,246,0.15)] hover:shadow-[0_0_50px_rgba(139,92,246,0.25)] transition-shadow duration-500">
      {/* Stars at top - like Ali Abdaal style */}
      <StarRating rating={testimonial.rating} />

      {/* Quote */}
      <p className="text-white/90 text-[15px] leading-relaxed mt-4 mb-6 min-h-[100px]">
        {cleanQuote}
      </p>

      {/* Author */}
      <div className="flex items-center gap-3 pt-4 border-t border-purple-500/20">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
          {testimonial.authorName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-white font-semibold text-sm">{testimonial.authorName}</p>
          <p className="text-purple-300/70 text-xs">{testimonial.authorTitle || 'Purple Homes Homeowner'}</p>
        </div>
      </div>
    </div>
  );
}

export function TestimonialMarquee({ testimonials, speed = 30 }: TestimonialMarqueeProps) {
  const [isPaused, setIsPaused] = useState(false);

  // Triple testimonials for seamless infinite scroll effect
  const items = [...testimonials, ...testimonials, ...testimonials];

  // Calculate animation duration based on content and speed
  // More items = longer duration for same perceived speed
  const baseDuration = testimonials.length * 8; // ~8 seconds per testimonial (faster scroll)
  const adjustedDuration = baseDuration * (30 / speed); // Adjust for custom speed

  if (testimonials.length === 0) {
    return null;
  }

  return (
    <div
      className="overflow-hidden py-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* CSS-based infinite scroll - smoother than JS */}
      <div
        className="flex animate-marquee"
        style={{
          animationDuration: `${adjustedDuration}s`,
          animationPlayState: isPaused ? 'paused' : 'running',
        }}
      >
        {items.map((testimonial, index) => (
          <TestimonialCard key={`${testimonial.authorName}-${index}`} testimonial={testimonial} />
        ))}
      </div>

      {/* Inline keyframes for the marquee animation */}
      <style>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
        .animate-marquee {
          animation: marquee linear infinite;
        }
      `}</style>
    </div>
  );
}

export default TestimonialMarquee;
