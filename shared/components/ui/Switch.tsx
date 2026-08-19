import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      className,
      checked,
      onCheckedChange,
      disabled,
      onKeyDown,
      ...props
    },
    ref,
  ) => {
    const toggle = () => {
      if (disabled) return
      onCheckedChange?.(!checked)
    }

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={toggle}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (event.defaultPrevented) return
          if (event.key === ' ' || event.key === 'Enter') {
            event.preventDefault()
            toggle()
          }
        }}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 ease-out outline-none',
          'focus-visible:ring-2 focus-visible:ring-brand-500/30 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          checked
            ? 'bg-[#8B7CF6] border-[#8B7CF6]'
            : 'bg-neutral-200 border-neutral-200',
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out',
            checked ? 'translate-x-[18px]' : 'translate-x-0.5',
          )}
        />
      </button>
    )
  },
)
Switch.displayName = 'Switch'

export { Switch }
