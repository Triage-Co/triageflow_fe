import { Suspense } from 'react';
import { ReceptionPaymentForm } from '@/modules/reception/components/ReceptionPaymentForm';
import { Loader2 } from 'lucide-react';

export default function ReceptionPaymentPage() {
    return (
        <Suspense
            fallback={
                <div className="flex-1 flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-[#8B7CF6]" />
                </div>
            }
        >
            <ReceptionPaymentForm />
        </Suspense>
    );
}
