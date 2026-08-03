'use client';

import React from 'react';
import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { DoctorPrescriptionTab } from '@/modules/clinical/components/DoctorPrescriptionTab';

export default function CreatePrescriptionPage() {
    return (
        <EMRWorkspaceLayout activeTabId="pharmacy_create" activeTabName="Kê Đơn Thuốc Mới">
            <div className="flex-1 flex overflow-hidden p-4 md:p-6 bg-slate-50 dark:bg-slate-900">
                <DoctorPrescriptionTab />
            </div>
        </EMRWorkspaceLayout>
    );
}
