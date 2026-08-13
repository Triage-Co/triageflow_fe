'use client';

import React from 'react';
import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { DoctorPrescriptionTab } from '@/modules/clinical/components/DoctorPrescriptionTab';

export default function CreatePrescriptionPage() {
    return (
        <EMRWorkspaceLayout activeTabId="pharmacy_create" activeTabName="Kê Đơn Thuốc Mới">
            <div className="flex-1 overflow-hidden p-6 h-full">
                <DoctorPrescriptionTab />
            </div>
        </EMRWorkspaceLayout>
    );
}
