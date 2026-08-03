'use client';

import React from 'react';
import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { PatientCheckinPanel } from '@/modules/shared/components/PatientCheckinPanel';

export default function PharmacyCheckinPage() {
    return (
        <EMRWorkspaceLayout activeTabId="pharmacy_checkin" activeTabName="Tiếp Nhận Đơn Thuốc Tại Quầy">
            <div className="flex-1 flex overflow-hidden p-4 md:p-6 bg-slate-50 dark:bg-slate-900">
                <PatientCheckinPanel
                    moduleType="PHARMACY"
                    title="Tiếp Nhận Đơn Thuốc Tại Quầy"
                    subtitle="Quét mã QR đơn thuốc hoặc nhập mã lượt khám để tiếp nhận"
                />
            </div>
        </EMRWorkspaceLayout>
    );
}
