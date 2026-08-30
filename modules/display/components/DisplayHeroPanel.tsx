'use client';

import Image from 'next/image';

interface DisplayHeroPanelProps {
  compact?: boolean;
}

export function DisplayHeroPanel({ compact = false }: DisplayHeroPanelProps) {
  return (
    <div
      className={`relative h-full min-h-0 flex flex-col items-center justify-center overflow-hidden ${
        compact ? 'rounded-3xl' : ''
      }`}
      style={{ background: 'linear-gradient(160deg, #4F6BED 0%, #6B7FF0 45%, #F0A98A 100%)' }}
    >
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full bg-white/10 pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center text-center px-8 max-w-md">
        <div className="mb-6 flex items-center justify-center w-24 h-24 rounded-full border-2 border-white/40 bg-white shadow-xl">
          <Image
            src="/logo.png?v=2"
            alt="TriageFlow Logo"
            width={56}
            height={56}
            className="w-full h-full object-contain"
            unoptimized
            priority
          />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
          TriageFlowOPD
        </h1>
        <p className="text-white/80 text-sm sm:text-base leading-relaxed font-light max-w-xs">
          Hệ thống phân loại bệnh nhân thông minh và điều phối luồng bệnh nhân
        </p>
        <div className="mt-8 flex items-center gap-4">
          {[
            { label: 'AI', sub: 'Powered' },
            { label: 'Smart', sub: 'Routing' },
            { label: 'Real-time', sub: 'Tracking' },
          ].map(({ label, sub }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <span className="text-xs font-semibold text-white px-3 py-1 rounded-full bg-white/15 border border-white/20">
                {label}
              </span>
              <span className="text-[10px] text-white/70">{sub}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
