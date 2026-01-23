import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ArrowRight, Phone, MessageCircle, Calendar, Sparkles } from "lucide-react";

const ctaButtonVariants = cva(
  "inline-flex items-center justify-center gap-2.5 whitespace-nowrap font-bold ring-offset-background transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden",
  {
    variants: {
      variant: {
        // Primary - Purple Homes branded gradient
        primary: [
          "bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800",
          "text-white uppercase tracking-wider",
          "shadow-[0_8px_30px_rgb(147,51,234,0.4)]",
          "hover:shadow-[0_12px_40px_rgb(147,51,234,0.5)]",
          "hover:-translate-y-1",
          "active:translate-y-0",
          "border border-purple-400/30",
          // Shimmer effect via pseudo-element
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-700",
        ].join(" "),
        // Secondary - Rich Purple with depth
        secondary: [
          "bg-gradient-to-br from-purple-500 via-purple-600 to-purple-800",
          "text-white",
          "shadow-[0_8px_30px_rgb(147,51,234,0.35)]",
          "hover:shadow-[0_12px_40px_rgb(147,51,234,0.45)]",
          "hover:-translate-y-1",
          "border border-purple-400/20",
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-700",
        ].join(" "),
        // Premium - Black with purple accents
        premium: [
          "bg-gradient-to-br from-gray-900 via-gray-800 to-black",
          "text-white uppercase tracking-widest",
          "shadow-[0_8px_30px_rgb(0,0,0,0.4)]",
          "hover:shadow-[0_12px_40px_rgb(0,0,0,0.5)]",
          "hover:-translate-y-1",
          "border border-purple-500/40",
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-purple-400/20 before:to-transparent before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-700",
        ].join(" "),
        // Outline - Elegant border
        outline: [
          "border-2 border-purple-500/70",
          "text-purple-700 bg-white/80 backdrop-blur-sm",
          "hover:bg-purple-50 hover:border-purple-600",
          "hover:-translate-y-0.5",
          "shadow-sm hover:shadow-md",
        ].join(" "),
        // White - For dark backgrounds with subtle glow
        white: [
          "bg-white text-gray-900",
          "shadow-[0_8px_30px_rgb(255,255,255,0.3)]",
          "hover:shadow-[0_12px_40px_rgb(255,255,255,0.4)]",
          "hover:-translate-y-1",
          "border border-white/50",
        ].join(" "),
        // Contrast - HIGH VISIBILITY on dark backgrounds (like green CTAs in reference funnels)
        contrast: [
          "bg-gradient-to-r from-white via-purple-50 to-white",
          "text-purple-900 uppercase tracking-wider font-extrabold",
          "shadow-[0_8px_40px_rgb(255,255,255,0.5)]",
          "hover:shadow-[0_16px_60px_rgb(255,255,255,0.6)]",
          "hover:-translate-y-2",
          "active:translate-y-0",
          "border-2 border-white",
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-purple-200/50 before:to-transparent before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-700",
        ].join(" "),
        // Ghost - Refined minimal
        ghost: [
          "text-purple-600 bg-transparent",
          "hover:text-purple-800 hover:bg-purple-50/50",
          "underline underline-offset-4 decoration-purple-300",
          "hover:decoration-purple-500",
        ].join(" "),
        // Urgency - Pulsing red
        urgency: [
          "bg-gradient-to-r from-red-500 via-red-600 to-rose-600",
          "text-white uppercase tracking-wider",
          "shadow-[0_8px_30px_rgb(239,68,68,0.4)]",
          "hover:shadow-[0_12px_40px_rgb(239,68,68,0.5)]",
          "hover:-translate-y-1",
          "animate-pulse",
          "border border-red-400/30",
        ].join(" "),
        // Gold - Light Purple luxury accent
        gold: [
          "bg-gradient-to-r from-purple-300 via-purple-400 to-purple-300",
          "text-purple-900 uppercase tracking-wider font-extrabold",
          "shadow-[0_8px_30px_rgb(168,85,247,0.4)]",
          "hover:shadow-[0_12px_40px_rgb(168,85,247,0.5)]",
          "hover:-translate-y-1",
          "border border-purple-200/50",
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-700",
        ].join(" "),
      },
      size: {
        sm: "h-10 px-6 text-sm rounded-lg",
        md: "h-12 px-8 text-base rounded-xl",
        lg: "h-14 px-10 text-lg rounded-xl",
        xl: "h-16 px-12 text-xl rounded-2xl",
        full: "w-full h-14 px-8 text-lg rounded-xl",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "lg",
    },
  }
);

export interface CTAButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof ctaButtonVariants> {
  asChild?: boolean;
  icon?: "arrow" | "phone" | "message" | "calendar" | "sparkle" | "none";
  iconPosition?: "left" | "right";
}

const iconMap = {
  arrow: ArrowRight,
  phone: Phone,
  message: MessageCircle,
  calendar: Calendar,
  sparkle: Sparkles,
  none: null,
};

const CTAButton = React.forwardRef<HTMLButtonElement, CTAButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      icon = "arrow",
      iconPosition = "right",
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    const IconComponent = icon !== "none" ? iconMap[icon] : null;

    return (
      <Comp
        className={cn(ctaButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {IconComponent && iconPosition === "left" && (
          <IconComponent className="h-5 w-5 flex-shrink-0" />
        )}
        <span className="relative z-10">{children}</span>
        {IconComponent && iconPosition === "right" && (
          <IconComponent className="h-5 w-5 flex-shrink-0" />
        )}
      </Comp>
    );
  }
);
CTAButton.displayName = "CTAButton";

export { CTAButton, ctaButtonVariants };
