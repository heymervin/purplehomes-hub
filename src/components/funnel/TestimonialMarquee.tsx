/**
 * Testimonial Marquee Component
 *
 * A slow auto-scrolling horizontal carousel of testimonial cards.
 * Used on property funnel pages for social proof.
 */

import { useEffect, useRef, useState } from 'react';
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
  return (
    <div className="flex-shrink-0 w-[350px] md:w-[400px] bg-gradient-to-br from-[#1e1a2e] to-[#13101c] border border-purple-500/20 rounded-2xl p-6 mx-3 shadow-xl">
      {/* Quote icon */}
      <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4">
        <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
        </svg>
      </div>

      {/* Stars */}
      <StarRating rating={testimonial.rating} />

      {/* Quote */}
      <p className="text-white/90 text-base leading-relaxed mt-4 mb-6 line-clamp-4">
        "{testimonial.quote}"
      </p>

      {/* Author */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-500/30 rounded-full flex items-center justify-center text-purple-300 font-bold">
          {testimonial.authorName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-white font-semibold text-sm">{testimonial.authorName}</p>
          <p className="text-gray-400 text-xs">{testimonial.authorTitle || 'Purple Homes Homeowner'}</p>
        </div>
      </div>
    </div>
  );
}

export function TestimonialMarquee({ testimonials, speed = 30 }: TestimonialMarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Duplicate testimonials for seamless loop
  const items = [...testimonials, ...testimonials];

  useEffect(() => {
    const container = containerRef.current;
    if (!container || testimonials.length === 0) return;

    let animationId: number;
    let position = 0;

    const animate = () => {
      if (!isPaused) {
        position -= speed / 60; // Convert to per-frame movement

        // Reset when first set is fully scrolled
        const singleSetWidth = container.scrollWidth / 2;
        if (Math.abs(position) >= singleSetWidth) {
          position = 0;
        }

        container.style.transform = `translateX(${position}px)`;
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [testimonials, speed, isPaused]);

  if (testimonials.length === 0) {
    return null;
  }

  return (
    <div
      className="overflow-hidden py-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        ref={containerRef}
        className="flex"
        style={{ willChange: 'transform' }}
      >
        {items.map((testimonial, index) => (
          <TestimonialCard key={`${testimonial.authorName}-${index}`} testimonial={testimonial} />
        ))}
      </div>
    </div>
  );
}

export default TestimonialMarquee;
