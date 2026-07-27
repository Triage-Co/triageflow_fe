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
      className={cn(
        "w-full aspect-[4/3] bg-white text-[#1E2939] rounded-[36px] p-8 flex flex-col items-center justify-center text-center shadow-lg border border-neutral-100/80 hover:shadow-2xl hover:scale-[1.04] active:bg-[#155DFC] active:text-white active:border-transparent active:scale-[0.98] transition-all duration-200 group cursor-pointer select-none",
        className
      )}
    >
      <div className="w-20 h-20 rounded-2xl bg-[#E8F0FE] group-active:bg-white/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-2xl font-black tracking-tight mb-2 leading-snug">{title}</h3>
      <p className="text-[#4A5565] group-active:text-white/90 text-base font-semibold">{description}</p>
    </button>
  );
};
