import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  icon,
  title,
  description,
  className,
  ...props
}) => {
  return (
    <button
      {...props}
      aria-label={props['aria-label'] ?? title}
      className={cn(
        "w-full aspect-[4/3] bg-white text-[#1E2939] rounded-[28px] sm:rounded-[36px] p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center text-center shadow-lg border border-neutral-100/80 hover:shadow-2xl hover:scale-[1.03] active:bg-[#155DFC] active:text-white active:border-transparent active:scale-[0.98] transition-all duration-200 group cursor-pointer select-none",
        className
      )}
    >
      <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-2xl bg-[#E8F0FE] group-active:bg-white/20 flex items-center justify-center mb-2 sm:mb-4 lg:mb-5 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-base sm:text-xl lg:text-2xl font-black tracking-tight mb-1 sm:mb-2 leading-snug">{title}</h3>
      <p className="text-[#4A5565] group-active:text-white/90 text-xs sm:text-sm lg:text-base font-semibold line-clamp-2">{description}</p>
    </button>
  );
};
