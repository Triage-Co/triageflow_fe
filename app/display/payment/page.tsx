'use client';

import { PatientPaymentDisplay } from '@/modules/payment/components/PatientPaymentDisplay';

export default function CashierDisplayPage() {
    return (
        <div className="bg-[#FAF9FF] dark:bg-neutral-950 h-screen w-screen max-h-screen overflow-hidden p-3 md:p-4 flex items-center justify-center font-['Be_Vietnam_Pro']">
            <PatientPaymentDisplay isStandalonePage={true} />
        </div>
    );
}
