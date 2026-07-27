'use client';

import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { NotificationPanel } from '@/modules/notifications/components/NotificationPanel';

export default function DoctorNotificationPage() {
    return (
        <EMRWorkspaceLayout activeTabId="notification">
            <NotificationPanel />
        </EMRWorkspaceLayout>
    );
}
