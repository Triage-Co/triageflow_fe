import { Heart, Activity, Thermometer, Gauge } from 'lucide-react';
import { Card, CardTitle, CardContent, CardHeader } from '@/shared/components/ui/Card';
import type { Vitals } from '@/modules/clinical/types/clinical.types';

interface PatientVitalsGridProps {
    vitals: Vitals;
}

const VITAL_CONFIG = [
    {
        key: 'heartRate' as const,
        label: 'Nhịp tim',
        unit: 'nhịp/phút',
        Icon: Heart,
        iconClass: 'w-4 h-4 fill-rose-500 text-rose-500',
        labelClass: 'text-rose-600/85',
        bgClass: 'bg-rose-50/30 border-rose-50/50',
    },
    {
        key: 'bloodPressure' as const,
        label: 'Huyết áp',
        unit: 'mmHg',
        Icon: Activity,
        iconClass: 'w-4 h-4 text-blue-500',
        labelClass: 'text-blue-600/85',
        bgClass: 'bg-blue-50/30 border-blue-50/50',
    },
    {
        key: 'temperature' as const,
        label: 'Nhiệt độ',
        unit: '°C',
        Icon: Thermometer,
        iconClass: 'w-4 h-4 text-amber-500',
        labelClass: 'text-amber-600/85',
        bgClass: 'bg-amber-50/30 border-amber-50/50',
    },
    {
        key: 'spO2' as const,
        label: 'SpO2',
        unit: '%',
        Icon: Gauge,
        iconClass: 'w-4 h-4 text-emerald-500',
        labelClass: 'text-emerald-600/85',
        bgClass: 'bg-emerald-50/30 border-emerald-50/50',
    },
];

export function PatientVitalsGrid({ vitals }: PatientVitalsGridProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Sinh hiệu hiện tại</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-4">
                    {VITAL_CONFIG.map(({ key, label, unit, Icon, iconClass, labelClass, bgClass }) => (
                        <div key={key} className={`p-3.5 rounded-[24px] border flex flex-col ${bgClass}`}>
                            <div className={`flex items-center ${labelClass}`}>
                                <Icon className={iconClass} />
                                <span className="text-xs font-semibold ml-1.5">{label}</span>
                            </div>
                            <div className="mt-1.5 flex items-baseline">
                                <span className="text-xl font-bold text-slate-800">
                                    {vitals[key]}
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium ml-1">
                                    {unit}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
