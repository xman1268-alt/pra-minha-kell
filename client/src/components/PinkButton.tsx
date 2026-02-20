import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface PinkButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const PinkButton = forwardRef<HTMLButtonElement, PinkButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "relative font-semibold rounded-2xl transition-all duration-200 flex items-center justify-center gap-2",
          "active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
          // sizes
          size === "sm" && "px-4 py-2 text-sm",
          size === "md" && "px-6 py-3 text-base",
          size === "lg" && "px-8 py-4 text-lg",
          // variants
          variant === "primary" && [
            "bg-gradient-to-r from-[#e91e8c] via-[#9c27b0] to-[#c2185b] text-white",
            "shadow-lg shadow-pink-500/30",
            "hover:shadow-xl hover:shadow-pink-500/40 hover:-translate-y-0.5",
          ],
          variant === "outline" && [
            "border-2 border-[#e91e8c] text-[#e91e8c] bg-transparent",
            "hover:bg-[#e91e8c]/10 hover:-translate-y-0.5",
          ],
          variant === "ghost" && [
            "text-[#e91e8c] bg-transparent",
            "hover:bg-[#e91e8c]/10",
          ],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : children}
      </button>
    );
  }
);

PinkButton.displayName = "PinkButton";
