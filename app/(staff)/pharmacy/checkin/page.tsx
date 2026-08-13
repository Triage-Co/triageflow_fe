'use client';

import React from 'react';
import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { PatientCheckinPanel } from '@/modules/shared/components/PatientCheckinPanel';

export default function PharmacyCheckinPage() {
    return (
        <EMRWorkspaceLayout activeTabId="pharmacy_checkin" activeTabName="Tiếp Nhận Đơn Thuốc Tại Quầy">
            <div className="flex-1 overflow-hidden p-6 h-full">
                <PatientCheckinPanel
                    moduleType="PHARMACY"
                    title="Tiếp Nhận Đơn Thuốc Tại Quầy"
                    subtitle="Quét mã QR đơn thuốc hoặc nhập mã lượt khám để tiếp nhận"
                />
            </div>
        </EMRWorkspaceLayout>
    );
}
