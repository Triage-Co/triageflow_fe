'use client';

import { use } from 'react';
import { EMRPageLayout } from '@/shared/components/layout/EMRPageLayout';
import { MOCK_EMR_PATIENTS } from '@/modules/clinical/data/emr-mock-data';
import { notFound } from 'next/navigation';

export default function DoctorPatientPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const patient = MOCK_EMR_PATIENTS[id] ?? MOCK_EMR_PATIENTS['1'];

    if (!patient) {
        notFound();
    }

    return <EMRPageLayout patient={patient} />;
}
