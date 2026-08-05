'use client';

import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { SettingsWorkflowPanel } from '@/modules/settings/components/SettingsWorkflowPanel';

export default function SettingsPage() {
    return (
        <EMRWorkspaceLayout activeTabId="settings" activeTabName="Cài đặt">
            <SettingsWorkflowPanel />
        </EMRWorkspaceLayout>
    );
}
