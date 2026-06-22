import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, startIcon, endIcon, error, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {startIcon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-neutral-400">
            {startIcon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-9 w-full rounded-[24px] border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm transition-all placeholder:text-neutral-400 focus-visible:outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-50",
            startIcon && "pl-9",
            endIcon && "pr-9",
            error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
            className
          )}
          ref={ref}
          {...props}
        />
        {endIcon && (
          <div className="absolute right-3 flex items-center pointer-events-none text-neutral-400">
            {endIcon}
          </div>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
