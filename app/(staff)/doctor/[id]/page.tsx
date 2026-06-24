'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { getPatientById } from '@/modules/clinical/services/clinicalService';
import { PatientDetailPage } from '@/modules/clinical/components/PatientDetailPage';

export default function DoctorPatientPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const patient = getPatientById(id);

    if (!patient) {
        notFound();
    }

    return <PatientDetailPage patient={patient} />;
}
