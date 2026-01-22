import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, X, ArrowRight } from "lucide-react";

interface ComparisonRow {
  feature: string;
  optionA: boolean | string;
  optionB: boolean | string;
}

interface ComparisonTableProps {
  title?: string;
  subtitle?: string;
  optionALabel?: string;
  optionBLabel?: string;
  optionAHighlight?: boolean;
  optionBHighlight?: boolean;
  rows: ComparisonRow[];
  className?: string;
  variant?: "default" | "detailed" | "compact" | "cards" | "luxury-cards";
}

const defaultRows: ComparisonRow[] = [
  { feature: "Monthly payment goes to", optionA: "Landlord's pocket", optionB: "YOUR equity" },
  { feature: "Build wealth over time", optionA: false, optionB: true },
  { feature: "Tax benefits available", optionA: false, optionB: true },
  { feature: "Price locked in today", optionA: false, optionB: true },
  { feature: "Make it your own", optionA: false, optionB: true },
  { feature: "Risk of rent increases", optionA: true, optionB: false },
  { feature: "Can be asked to move", optionA: true, optionB: false },
];

const ComparisonTable: React.FC<ComparisonTableProps> = ({
  title = "Renting vs. Owning With Purple Homes",
  subtitle = "See why hundreds of families are making the switch",
  optionALabel = "Renting",
  optionBLabel = "Purple Homes",
  optionAHighlight = false,
  optionBHighlight = true,
  rows = defaultRows,
  className,
  variant = "default",
}) => {
  const renderValue = (value: boolean | string, isHighlighted: boolean) => {
    if (typeof value === "string") {
      return (
        <span className={cn(isHighlighted ? "font-semibold text-green-600" : "text-gray-600")}>
          {value}
        </span>
      );
    }
    if (value) {
      return isHighlighted ? (
        <Check className="h-6 w-6 text-green-500 mx-auto" />
      ) : (
        <X className="h-6 w-6 text-red-400 mx-auto" />
      );
    }
    return isHighlighted ? (
      <X className="h-6 w-6 text-red-400 mx-auto" />
    ) : (
      <Check className="h-6 w-6 text-green-500 mx-auto" />
    );
  };

  if (variant === "compact") {
    return (
      <div className={cn("bg-white rounded-xl shadow-lg overflow-hidden", className)}>
        <div className="grid grid-cols-3 text-center">
          <div className="p-4 bg-gray-50" />
          <div className="p-4 bg-gray-100">
            <span className="font-semibold text-gray-600">{optionALabel}</span>
          </div>
          <div className="p-4 bg-purple-600 text-white">
            <span className="font-bold">{optionBLabel}</span>
          </div>
        </div>
        {rows.slice(0, 5).map((row, index) => (
          <div
            key={index}
            className={cn(
              "grid grid-cols-3 text-center border-t border-gray-100",
              index % 2 === 0 ? "bg-white" : "bg-gray-50"
            )}
          >
            <div className="p-3 text-left text-sm text-gray-700">{row.feature}</div>
            <div className="p-3">{renderValue(row.optionA, optionAHighlight)}</div>
            <div className="p-3 bg-purple-50">{renderValue(row.optionB, optionBHighlight)}</div>
          </div>
        ))}
      </div>
    );
  }

  // Premium side-by-side cards variant
  if (variant === "cards" || variant === "luxury-cards") {
    const isLuxury = variant === "luxury-cards";

    return (
      <div className={cn("", className)}>
        {/* Header */}
        {title && (
          <div className="text-center mb-12">
            <h2 className={cn(
              "text-3xl md:text-4xl lg:text-5xl mb-4",
              isLuxury ? "font-light tracking-tight text-gray-900" : "font-bold text-gray-900"
            )}>
              {isLuxury ? (
                <>
                  <span className="font-light">Renting vs. </span>
                  <span className="font-bold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                    Owning
                  </span>
                </>
              ) : title}
            </h2>
            {subtitle && <p className="text-gray-500 text-lg">{subtitle}</p>}
          </div>
        )}

        {/* Side-by-side Cards */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-10 max-w-5xl mx-auto">
          {/* Option A Card (Muted/Renting) */}
          <div className={cn(
            "rounded-2xl p-8 transition-all duration-300",
            isLuxury
              ? "bg-gray-50/80 border border-gray-200/50 opacity-75"
              : "bg-gray-100 opacity-70"
          )}>
            <div className={cn(
              "text-sm uppercase tracking-wider font-medium mb-6",
              isLuxury ? "text-gray-400" : "text-gray-500"
            )}>
              {optionALabel}
            </div>
            <div className="space-y-5">
              {rows.map((row, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-gray-200/50 last:border-0">
                  <span className="text-gray-500 text-sm">{row.feature}</span>
                  <span className={cn(
                    "text-sm font-medium",
                    typeof row.optionA === "boolean"
                      ? row.optionA
                        ? "text-red-400"
                        : "text-gray-400"
                      : "text-gray-600"
                  )}>
                    {typeof row.optionA === "boolean" ? (
                      row.optionA ? (
                        <X className="h-5 w-5 text-red-400" />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )
                    ) : (
                      <span className="line-through opacity-60">{row.optionA}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Option B Card (Highlighted/Purple Homes) */}
          <div className={cn(
            "rounded-2xl p-8 relative transition-all duration-300",
            isLuxury
              ? "bg-white shadow-[0_8px_40px_rgba(30,27,75,0.16)] border border-purple-100"
              : "bg-white shadow-2xl border-2 border-purple-200"
          )}>
            {/* Recommended Badge */}
            <div className={cn(
              "absolute -top-3 left-6 text-white text-xs font-semibold uppercase tracking-wider px-4 py-1.5 rounded-full",
              isLuxury
                ? "bg-gradient-to-r from-purple-600 to-purple-800"
                : "bg-purple-600"
            )}>
              Recommended
            </div>

            <div className={cn(
              "text-sm uppercase tracking-wider font-semibold mb-6",
              isLuxury
                ? "text-purple-600"
                : "text-purple-700"
            )}>
              {optionBLabel}
            </div>
            <div className="space-y-5">
              {rows.map((row, index) => (
                <div key={index} className="flex items-center justify-between py-3 border-b border-purple-100/50 last:border-0">
                  <span className="text-gray-700 text-sm font-medium">{row.feature}</span>
                  <span className="text-sm font-semibold">
                    {typeof row.optionB === "boolean" ? (
                      row.optionB ? (
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100">
                          <Check className="h-4 w-4 text-green-600" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100">
                          <X className="h-4 w-4 text-gray-400" />
                        </div>
                      )
                    ) : (
                      <span className="text-green-600 font-bold">{row.optionB}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>

            {/* Card Footer CTA */}
            <div className="mt-8 pt-6 border-t border-purple-100">
              <button className={cn(
                "w-full py-4 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2",
                isLuxury
                  ? "bg-gradient-to-r from-purple-600 to-purple-800 hover:shadow-lg hover:shadow-purple-500/25 hover:-translate-y-0.5"
                  : "bg-purple-600 hover:bg-purple-700"
              )}>
                Get Started Today
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("", className)}>
      {/* Header */}
      {title && (
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            {title}
          </h2>
          {subtitle && <p className="text-gray-500">{subtitle}</p>}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
        {/* Table Header */}
        <div className="grid grid-cols-3">
          <div className="p-6 bg-gray-50 border-r border-gray-200">
            <span className="text-gray-400 text-sm font-medium uppercase tracking-wide">
              Compare
            </span>
          </div>
          <div
            className={cn(
              "p-6 text-center border-r border-gray-200",
              optionAHighlight ? "bg-purple-600 text-white" : "bg-gray-100"
            )}
          >
            <span className="font-bold text-lg">{optionALabel}</span>
          </div>
          <div
            className={cn(
              "p-6 text-center",
              optionBHighlight ? "bg-purple-600 text-white" : "bg-gray-100"
            )}
          >
            <span className="font-bold text-lg">{optionBLabel}</span>
            {optionBHighlight && (
              <div className="text-purple-200 text-xs mt-1">Recommended</div>
            )}
          </div>
        </div>

        {/* Table Rows */}
        {rows.map((row, index) => (
          <div
            key={index}
            className={cn(
              "grid grid-cols-3 border-t border-gray-100",
              index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
            )}
          >
            <div className="p-5 border-r border-gray-100 flex items-center">
              <span className="text-gray-700 font-medium">{row.feature}</span>
            </div>
            <div
              className={cn(
                "p-5 text-center border-r border-gray-100 flex items-center justify-center",
                optionAHighlight && "bg-purple-50"
              )}
            >
              {renderValue(row.optionA, optionAHighlight)}
            </div>
            <div
              className={cn(
                "p-5 text-center flex items-center justify-center",
                optionBHighlight && "bg-purple-50"
              )}
            >
              {renderValue(row.optionB, optionBHighlight)}
            </div>
          </div>
        ))}

        {/* Footer CTA */}
        <div className="p-6 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-center">
          <p className="text-purple-100 mb-2">
            Ready to stop renting and start owning?
          </p>
          <button className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-700 rounded-lg font-bold hover:bg-purple-50 transition-colors">
            Get Started Today
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Simple Pros/Cons List
interface ProsConsListProps {
  pros: string[];
  cons: string[];
  prosTitle?: string;
  consTitle?: string;
  className?: string;
}

const ProsConsList: React.FC<ProsConsListProps> = ({
  pros,
  cons,
  prosTitle = "Benefits",
  consTitle = "Drawbacks",
  className,
}) => {
  return (
    <div className={cn("grid md:grid-cols-2 gap-6", className)}>
      {/* Pros */}
      <div className="bg-green-50 rounded-xl p-6 border border-green-200">
        <h4 className="font-bold text-green-800 mb-4 flex items-center gap-2">
          <Check className="h-5 w-5" />
          {prosTitle}
        </h4>
        <ul className="space-y-3">
          {pros.map((pro, index) => (
            <li key={index} className="flex items-start gap-2 text-green-700">
              <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span>{pro}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Cons */}
      <div className="bg-red-50 rounded-xl p-6 border border-red-200">
        <h4 className="font-bold text-red-800 mb-4 flex items-center gap-2">
          <X className="h-5 w-5" />
          {consTitle}
        </h4>
        <ul className="space-y-3">
          {cons.map((con, index) => (
            <li key={index} className="flex items-start gap-2 text-red-700">
              <X className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{con}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// Feature Checklist
interface FeatureChecklistProps {
  features: string[];
  title?: string;
  columns?: 1 | 2 | 3;
  className?: string;
}

const FeatureChecklist: React.FC<FeatureChecklistProps> = ({
  features,
  title,
  columns = 2,
  className,
}) => {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  };

  return (
    <div className={className}>
      {title && (
        <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>
      )}
      <div className={cn("grid gap-3", gridCols[columns])}>
        {features.map((feature, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 bg-green-50 rounded-lg"
          >
            <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="h-4 w-4 text-white" />
            </div>
            <span className="text-gray-700">{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export { ComparisonTable, ProsConsList, FeatureChecklist };
