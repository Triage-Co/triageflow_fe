'use client';

import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { PatientCheckinPanel } from '@/modules/shared/components/PatientCheckinPanel';

export default function LabPage() {
    return (
        <EMRWorkspaceLayout activeTabId="lab" activeTabName="Tiếp Nhận Khám">
            <PatientCheckinPanel
                moduleType="LAB"
                title="Tiếp Nhận Khám"
                subtitle="Quét mã QR bệnh nhân hoặc nhập mã lượt khám để tiếp nhận"
            />
        </EMRWorkspaceLayout>
    );
}
