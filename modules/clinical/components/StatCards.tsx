import { cn } from '@/lib/utils';
import { Card } from '@/shared/components/ui/Card';
import type { StatItem } from '@/modules/clinical/types/clinical.types';

interface StatCardsProps {
    stats: StatItem[];
}

export function StatCards({ stats }: StatCardsProps) {
    return (
        <div className="flex items-center gap-3 shrink-0">
            {stats.map((stat, i) => (
                <Card
                    key={i}
                    className="flex flex-col items-center min-w-[72px] px-4 py-2.5 border-neutral-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
                >
                    <span className={cn('text-2xl font-bold', stat.color ?? 'text-brand-500')}>
                        {stat.value}
                    </span>
                    <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold mt-0.5">
                        {stat.label}
                    </span>
                </Card>
            ))}
        </div>
    );
}
