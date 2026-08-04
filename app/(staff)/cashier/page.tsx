'use client';

import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { PaymentWorkflowPanel } from '@/modules/payment/components/PaymentWorkflowPanel';

export default function CashierPage() {
    return (
        <EMRWorkspaceLayout activeTabId="cashier" activeTabName="Thanh Toán">
            <PaymentWorkflowPanel />
        </EMRWorkspaceLayout>
    );
}
