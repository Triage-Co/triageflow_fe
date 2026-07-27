'use client';

import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { PatientCheckinPanel } from '@/modules/shared/components/PatientCheckinPanel';

export default function PharmacyPage() {
    return (
        <EMRWorkspaceLayout activeTabId="pharmacy" activeTabName="Tiếp Nhận Bệnh Nhân">
            <div className="flex-1 overflow-y-auto">
                <PatientCheckinPanel
                    moduleType="PHARMACY"
                    title="Tiếp Nhận Bệnh Nhân"
                    subtitle="Quét mã QR bệnh nhân hoặc nhập mã lượt khám để tiếp nhận"
                />
            </div>
        </EMRWorkspaceLayout>
    );
}
