import * as React from "react";
import { cn } from "@/lib/utils";
import { ArrowRight, Home, TrendingUp } from "lucide-react";

interface BeforeAfterCardProps {
  /** "Before" state details */
  before: {
    image?: string;
    title: string;
    points: string[];
  };
  /** "After" state details */
  after: {
    image?: string;
    title: string;
    points: string[];
  };
  /** Person's name (optional) */
  personName?: string;
  /** Person's location */
  personLocation?: string;
  /** Timeline (e.g., "6 months later") */
  timeline?: string;
  className?: string;
  variant?: "horizontal" | "vertical" | "overlay";
}

const BeforeAfterCard: React.FC<BeforeAfterCardProps> = ({
  before,
  after,
  personName,
  personLocation,
  timeline = "Today",
  className,
  variant = "horizontal",
}) => {
  if (variant === "vertical") {
    return (
      <div
        className={cn(
          "bg-white rounded-2xl shadow-xl overflow-hidden",
          className
        )}
      >
        {/* Person header */}
        {personName && (
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 text-center">
            <div className="font-bold text-lg">{personName}'s Journey</div>
            {personLocation && (
              <div className="text-purple-200 text-sm">{personLocation}</div>
            )}
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Before */}
          <div className="relative">
            {before.image && (
              <div className="aspect-video rounded-xl overflow-hidden mb-4">
                <img
                  src={before.image}
                  alt="Before"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 px-3 py-1 bg-red-500 text-white text-xs font-bold uppercase rounded">
                  Before
                </div>
              </div>
            )}
            <h4 className="font-bold text-gray-900 mb-2">{before.title}</h4>
            <ul className="space-y-2">
              {before.points.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-600">
                  <span className="text-red-500 mt-0.5">✗</span>
                  <span className="text-sm">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
              <ArrowRight className="h-5 w-5 text-purple-600 rotate-90" />
            </div>
          </div>

          {/* After */}
          <div className="relative">
            {after.image && (
              <div className="aspect-video rounded-xl overflow-hidden mb-4">
                <img
                  src={after.image}
                  alt="After"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 px-3 py-1 bg-green-500 text-white text-xs font-bold uppercase rounded">
                  {timeline}
                </div>
              </div>
            )}
            <h4 className="font-bold text-gray-900 mb-2">{after.title}</h4>
            <ul className="space-y-2">
              {after.points.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-600">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span className="text-sm">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Horizontal variant (default)
  return (
    <div
      className={cn("bg-white rounded-2xl shadow-xl overflow-hidden", className)}
    >
      {/* Person header */}
      {personName && (
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 text-center">
          <div className="font-bold text-lg">{personName}'s Transformation</div>
          {personLocation && (
            <div className="text-purple-200 text-sm">{personLocation}</div>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-0">
        {/* Before */}
        <div className="p-6 bg-red-50/50 border-r border-red-100">
          <div className="inline-block px-3 py-1 bg-red-500 text-white text-xs font-bold uppercase rounded mb-4">
            Before
          </div>
          {before.image && (
            <div className="aspect-video rounded-xl overflow-hidden mb-4">
              <img
                src={before.image}
                alt="Before"
                className="w-full h-full object-cover grayscale"
              />
            </div>
          )}
          <h4 className="font-bold text-gray-900 mb-3">{before.title}</h4>
          <ul className="space-y-2">
            {before.points.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-600">
                <span className="text-red-500 mt-0.5 flex-shrink-0">✗</span>
                <span className="text-sm">{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* After */}
        <div className="p-6 bg-green-50/50">
          <div className="inline-block px-3 py-1 bg-green-500 text-white text-xs font-bold uppercase rounded mb-4">
            {timeline}
          </div>
          {after.image && (
            <div className="aspect-video rounded-xl overflow-hidden mb-4">
              <img
                src={after.image}
                alt="After"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <h4 className="font-bold text-gray-900 mb-3">{after.title}</h4>
          <ul className="space-y-2">
            {after.points.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-600">
                <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                <span className="text-sm">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

// Transformation Story - Full narrative card
interface TransformationStoryProps {
  personName: string;
  personImage?: string;
  personLocation: string;
  story: string;
  beforeSituation: string;
  afterSituation: string;
  keyMetric?: {
    label: string;
    before: string;
    after: string;
  };
  className?: string;
}

const TransformationStory: React.FC<TransformationStoryProps> = ({
  personName,
  personImage,
  personLocation,
  story,
  beforeSituation,
  afterSituation,
  keyMetric,
  className,
}) => {
  return (
    <div
      className={cn(
        "bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl p-8 shadow-xl",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        {personImage ? (
          <img
            src={personImage}
            alt={personName}
            className="w-16 h-16 rounded-full object-cover border-2 border-white"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-purple-500 flex items-center justify-center text-2xl font-bold">
            {personName.charAt(0)}
          </div>
        )}
        <div>
          <div className="font-bold text-xl">{personName}</div>
          <div className="text-gray-400">{personLocation}</div>
        </div>
      </div>

      {/* Story */}
      <p className="text-gray-300 leading-relaxed mb-6">{story}</p>

      {/* Before/After comparison */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white/10 rounded-xl p-4">
          <div className="text-red-400 text-sm font-semibold uppercase mb-2">
            Before
          </div>
          <p className="text-gray-200 text-sm">{beforeSituation}</p>
        </div>
        <div className="bg-white/10 rounded-xl p-4">
          <div className="text-green-400 text-sm font-semibold uppercase mb-2">
            After
          </div>
          <p className="text-gray-200 text-sm">{afterSituation}</p>
        </div>
      </div>

      {/* Key metric */}
      {keyMetric && (
        <div className="bg-gradient-to-r from-purple-500/20 to-orange-500/20 rounded-xl p-4 flex items-center justify-between">
          <div className="text-gray-300">{keyMetric.label}</div>
          <div className="flex items-center gap-3">
            <span className="text-red-400 line-through">{keyMetric.before}</span>
            <ArrowRight className="h-4 w-4 text-gray-500" />
            <span className="text-green-400 font-bold text-xl">
              {keyMetric.after}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export { BeforeAfterCard, TransformationStory };
