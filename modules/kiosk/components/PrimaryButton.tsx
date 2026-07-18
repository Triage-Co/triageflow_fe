import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  className?: string;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  isLoading = false,
  variant = 'primary',
  className,
  disabled,
  ...props
}) => {
  const baseStyle = "px-6 py-3.5 rounded-2xl font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

  const variantStyles = {
    primary: "bg-[#155DFC] hover:bg-blue-700 text-white shadow-lg hover:shadow-xl shadow-blue-500/20",
    secondary: "bg-[#1E2939] hover:bg-neutral-800 text-white shadow-md",
    outline: "border border-neutral-200 text-neutral-700 hover:bg-neutral-50 bg-white",
    danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/20"
  };

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={cn(baseStyle, variantStyles[variant], className)}
    >
      {isLoading && <Loader2 className="w-5 h-5 animate-spin shrink-0" />}
      {children}
    </button>
  );
};
