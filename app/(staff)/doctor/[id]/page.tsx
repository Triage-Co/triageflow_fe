'use client';

import { use } from 'react';
import { DoctorPatientPage } from '../_components/DoctorPatientPage';

export default function DoctorPatientRoutePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <DoctorPatientPage id={id} />;
}
