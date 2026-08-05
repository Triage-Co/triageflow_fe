'use client';

import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { PaymentWorkflowPanel } from '@/modules/payment/components/PaymentWorkflowPanel';

export default function ReceptionPaymentPage() {
    return (
        <EMRWorkspaceLayout activeTabId="payment" activeTabName="Thanh Toán">
            <PaymentWorkflowPanel />
        </EMRWorkspaceLayout>
    );
}
