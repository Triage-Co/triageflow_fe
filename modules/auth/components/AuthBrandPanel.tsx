import { Cross } from 'lucide-react';

export function AuthBrandPanel() {
    return (
        <div className="hidden lg:flex lg:w-[55%] min-h-screen flex-col items-center justify-center relative overflow-hidden bg-brand-500">
            {/* Subtle decorative circles */}
            <div className="absolute -top-30 -left-30 w-105 h-105 rounded-full bg-white/5 pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-75 h-75 rounded-full bg-white/5 pointer-events-none" />
            <div className="absolute top-[40%] -right-15 w-50 h-50 rounded-full bg-brand-400/30 pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center text-center px-12 max-w-120">
                {/* Logo circle */}
                <div className="mb-8 flex items-center justify-center w-28 h-28 rounded-full border-2 border-white/40 bg-white/10 shadow-xl">
                    <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white/20">
                        <Cross className="w-8 h-8 text-white" strokeWidth={2.5} />
                    </div>
                </div>

                {/* Brand name */}
                <h1 className="text-4xl font-bold text-white tracking-tight mb-3">
                    TriageFlowOPD
                </h1>

                {/* Tagline */}
                <p className="text-brand-200 text-base leading-relaxed font-light max-w-xs">
                    AI Intelligent Triage and Patient Flow Coordination System
                </p>

                {/* Feature badges */}
                <div className="mt-10 flex items-center gap-6">
                    {[
                        { label: 'AI', sub: 'Powered' },
                        { label: 'Smart', sub: 'Routing' },
                        { label: 'Real-time', sub: 'Tracking' },
                    ].map(({ label, sub }) => (
                        <div key={label} className="flex flex-col items-center gap-1">
                            <span className="text-sm font-semibold text-white px-3 py-1 rounded-full bg-white/15 border border-white/20">
                                {label}
                            </span>
                            <span className="text-[11px] text-brand-200/80">{sub}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
