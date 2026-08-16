'use client';

import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { SettingsWorkflowPanel } from '@/modules/settings/components/SettingsWorkflowPanel';
import LabSettingsView from '@/modules/lab/views/LabSettingsView';
import ReceptionSettingsView from '@/modules/reception/components/ReceptionSettingsView';
import { useAuthStore } from '@/store/authStore';

export default function SettingsPage() {
    const user = useAuthStore((s) => s.user);
    const isLabRole =
        user?.role === 'LAB_TECHNICIAN' ||
        (user?.role === 'DOCTOR' &&
            typeof window !== 'undefined' &&
            localStorage.getItem('tfopd_active_room_type') === 'PROCEDURE_ROOM');
    const isReceptionRole = user?.role === 'RECEPTIONIST';

    return (
        <EMRWorkspaceLayout activeTabId="settings" activeTabName="Cài đặt">
            {isLabRole ? (
                <LabSettingsView />
            ) : isReceptionRole ? (
                <ReceptionSettingsView />
            ) : (
                <SettingsWorkflowPanel />
            )}
        </EMRWorkspaceLayout>
    );
}

