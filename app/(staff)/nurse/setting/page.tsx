'use client';

import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { StaffProfileSettings } from '@/modules/settings/components/StaffProfileSettings';

export default function NurseSettingsPage() {
    return (
        <EMRWorkspaceLayout activeTabId="setting" activeTabName="Cài đặt">
            <StaffProfileSettings />
        </EMRWorkspaceLayout>
    );
}
