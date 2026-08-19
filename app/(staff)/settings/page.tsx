'use client';

import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import StaffSettingsView from '@/modules/settings/components/StaffSettingsView';

export default function SettingsPage() {
    return (
        <EMRWorkspaceLayout activeTabId="settings" activeTabName="Thông tin cá nhân">
            <StaffSettingsView />
        </EMRWorkspaceLayout>
    );
}
