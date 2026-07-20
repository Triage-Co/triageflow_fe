import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  dot?: boolean;
  size?: 'sm' | 'md';
}

const VARIANT_STYLES: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: "bg-neutral-100 text-neutral-700 border-neutral-200/60",
  secondary: "bg-slate-50 text-slate-600 border-slate-100",
  success: "bg-emerald-50 text-emerald-700 border-emerald-100",
  warning: "bg-amber-50 text-amber-700 border-amber-100",
  danger: "bg-rose-50 text-rose-700 border-rose-100",
  info: "bg-blue-50 text-blue-700 border-blue-100",
  outline: "bg-transparent text-neutral-600 border-neutral-200",
}

const DOT_STYLES: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: "bg-neutral-500",
  secondary: "bg-slate-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  info: "bg-blue-500",
  outline: "bg-neutral-400",
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', dot = false, size = 'md', children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center font-semibold whitespace-nowrap border rounded-[24px] transition-colors",
          // Sizes
          size === 'sm' && "gap-1 px-2 py-0.5 text-[11px]",
          size === 'md' && "gap-1.5 px-2.5 py-1 text-[12px]",
          // Variant
          VARIANT_STYLES[variant],
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              "rounded-[24px] shrink-0",
              size === 'sm' ? "w-1.5 h-1.5" : "w-1.5 h-1.5",
              DOT_STYLES[variant]
            )}
          />
        )}
        {children}
      </span>
    )
  }
)
Badge.displayName = "Badge"

export { Badge }
