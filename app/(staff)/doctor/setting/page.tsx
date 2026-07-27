'use client';

import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { SettingsWorkflowPanel } from '@/modules/settings/components/SettingsWorkflowPanel';

export default function DoctorSettingsPage() {
    return (
        <EMRWorkspaceLayout activeTabId="setting" activeTabName="Cài đặt">
            <SettingsWorkflowPanel />
        </EMRWorkspaceLayout>
    );
}
