'use client';

import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { NotificationPanel } from '@/modules/notifications/components/NotificationPanel';

export default function NurseNotificationPage() {
    return (
        <EMRWorkspaceLayout activeTabId="notification">
            <NotificationPanel />
        </EMRWorkspaceLayout>
    );
}
