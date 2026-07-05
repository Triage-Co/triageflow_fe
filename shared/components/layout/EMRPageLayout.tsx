'use client';

import { useState } from 'react';
import type { Patient } from '@/modules/clinical/types/clinical.types';
import { EMRWorkspaceLayout } from './EMRWorkspaceLayout';
import { LeftPatientPanel } from './LeftPatientPanel';
import { RightMedicalArea } from './RightMedicalArea';

interface EMRPageLayoutProps {
    patient: Patient;
}

export function EMRPageLayout({ patient: initialPatient }: EMRPageLayoutProps) {
    const [patient, setPatient] = useState<Patient>(initialPatient);

    const handleUpdatePatient = (updated: Patient) => {
        setPatient(updated);
    };

    return (
        <EMRWorkspaceLayout activeTabId={patient.id} activeTabName={patient.name}>
            {/* ── Body below header ── */}
            <div className="flex-1 flex overflow-hidden">
                {/* 1. Collapsible patient info panel */}
                <div className="relative shrink-0">
                    <LeftPatientPanel
                        patient={patient}
                        isOpen={true}
                    />
                </div>

                {/* 2. Medical record area (flex-1) */}
                <RightMedicalArea patient={patient} onUpdatePatient={handleUpdatePatient} />
            </div>
        </EMRWorkspaceLayout>
    );
}
