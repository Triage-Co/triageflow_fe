'use client';

import { PatientPaymentDisplay } from '@/modules/payment/components/PatientPaymentDisplay';

export default function PatientPaymentPage() {
    return (
        <div className="bg-[#FAF9FF] min-h-screen p-4 md:p-8 flex items-center justify-center">
            <PatientPaymentDisplay isStandalonePage={true} />
        </div>
    );
}
