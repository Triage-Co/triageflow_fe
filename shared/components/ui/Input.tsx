import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  error?: boolean;
  variant?: 'default' | 'pill';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, startIcon, endIcon, error, variant = 'default', ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {startIcon && (
          <div className={cn(
            "absolute flex items-center pointer-events-none text-neutral-400 transition-colors",
            variant === 'pill' ? "left-4" : "left-3.5"
          )}>
            {startIcon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            // Base styles
            "flex w-full text-sm text-neutral-900 transition-all placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:opacity-50",

            // Default variant styles
            variant === 'default' && [
              "h-11 rounded-[24px] border border-neutral-200 bg-white px-4 py-3 shadow-sm",
              "focus-visible:outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100",
              startIcon && "pl-10",
              endIcon && "pr-10"
            ],

            // Pill variant styles (based on the provided design reference)
            variant === 'pill' && [
              "h-12 rounded-[24px] border border-transparent bg-neutral-100/70 px-5 py-3.5",
              "focus-visible:outline-none focus-visible:bg-neutral-200/50 focus-visible:border-neutral-200/30",
              startIcon && "pl-12",
              endIcon && "pr-12"
            ],

            // Error states
            error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",

            className
          )}
          ref={ref}
          {...props}
        />
        {endIcon && (
          <div className={cn(
            "absolute flex items-center pointer-events-none text-neutral-400 transition-colors",
            variant === 'pill' ? "right-4" : "right-3.5"
          )}>
            {endIcon}
          </div>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
