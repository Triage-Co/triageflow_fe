'use client';

import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import StaffSettingsView from '@/modules/settings/components/StaffSettingsView';

export default function NurseSettingsPage() {
    return (
        <EMRWorkspaceLayout activeTabId="setting" activeTabName="Thông tin cá nhân">
            <StaffSettingsView />
        </EMRWorkspaceLayout>
    );
}
