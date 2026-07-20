import { Card } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import type { Patient } from '@/modules/clinical/types/clinical.types';

interface PatientProfileCardProps {
    patient: Patient;
}

export function PatientProfileCard({ patient }: PatientProfileCardProps) {
    const initials = patient.name.split(' ').pop()?.charAt(0) || 'BN';

    return (
        <Card className="p-5 flex items-start gap-4">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-[24px] bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-lg shrink-0">
                {initials}
            </div>

            {/* Info */}
            <div className="space-y-1">
                <h3 className="font-bold text-slate-800 text-base">{patient.name}</h3>
                <p className="text-xs text-neutral-400 font-medium">Mã BN: {patient.code}</p>

                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {/* Gender & Age */}
                    <Badge variant="secondary" size="sm">
                        {patient.gender} • {patient.age} tuổi
                    </Badge>

                    {/* Insurance */}
                    {patient.insurance.hasInsurance && (
                        <Badge variant="success" size="sm">
                            BHYT: Có ({patient.insurance.coverage})
                        </Badge>
                    )}

                    {/* Visit type */}
                    <Badge variant="info" size="sm" className="text-brand-700 bg-brand-50 border-brand-100">
                        {patient.visitType}
                    </Badge>
                </div>
            </div>
        </Card>
    );
}
