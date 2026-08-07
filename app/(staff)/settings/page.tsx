'use client';

import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { SettingsWorkflowPanel } from '@/modules/settings/components/SettingsWorkflowPanel';
import LabSettingsView from '@/modules/lab/views/LabSettingsView';
import { useAuthStore } from '@/store/authStore';

export default function SettingsPage() {
    const user = useAuthStore((s) => s.user);
    const isLabRole = user?.role === 'LAB_TECHNICIAN';

    return (
        <EMRWorkspaceLayout activeTabId="settings" activeTabName="Cài đặt">
            {isLabRole ? <LabSettingsView /> : <SettingsWorkflowPanel />}
        </EMRWorkspaceLayout>
    );
}
