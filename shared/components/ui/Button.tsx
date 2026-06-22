import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'brand' | 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    children,
    variant = 'brand',
    size = 'md',
    startIcon,
    endIcon,
    isLoading = false,
    disabled,
    type = 'button',
    ...props
  }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          // Base interactive styles with premium transitions
          "inline-flex items-center justify-center font-medium transition-all duration-200 ease-out select-none outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",

          // Variants
          variant === 'brand' && [
            "bg-brand-500 text-white shadow-md shadow-brand-500/10",
            "hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/20",
            "rounded-[24px]"
          ],
          variant === 'default' && [
            "bg-neutral-900 text-white hover:bg-neutral-800",
            "rounded-[24px]"
          ],
          variant === 'secondary' && [
            "bg-neutral-100 text-neutral-800 hover:bg-neutral-200/80",
            "rounded-[24px]"
          ],
          variant === 'outline' && [
            "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50/50 hover:border-neutral-300",
            "rounded-[24px]"
          ],
          variant === 'ghost' && [
            "text-neutral-700 hover:bg-neutral-100/70",
            "rounded-[24px]"
          ],
          variant === 'destructive' && [
            "bg-destructive/10 text-destructive hover:bg-destructive/20",
            "rounded-[24px]"
          ],

          // Sizes
          size === 'sm' && "h-8 px-3.5 text-xs gap-1.5",
          size === 'md' && "h-10 px-5 text-sm gap-2",
          size === 'lg' && "h-11 px-6 text-sm gap-2",
          size === 'xl' && "h-12 px-8 text-base gap-2.5",

          className
        )}
        {...props}
      >
        {/* Loading Spinner */}
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}

        {/* Start Icon (rendered only if not loading) */}
        {!isLoading && startIcon && (
          <span className="inline-flex shrink-0 items-center justify-center">
            {startIcon}
          </span>
        )}

        {/* Button Content */}
        <span className="leading-none">{children}</span>

        {/* End Icon */}
        {!isLoading && endIcon && (
          <span className="inline-flex shrink-0 items-center justify-center">
            {endIcon}
          </span>
        )}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
