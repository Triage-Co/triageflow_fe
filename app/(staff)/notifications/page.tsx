'use client';

import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { NotificationPanel } from '@/modules/notifications/components/NotificationPanel';

export default function GeneralNotificationsPage() {
    return (
        <EMRWorkspaceLayout activeTabId="notifications">
            <NotificationPanel />
        </EMRWorkspaceLayout>
    );
}
