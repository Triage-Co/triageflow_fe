import { AuthBrandPanel } from '@/modules/auth/components/AuthBrandPanel';
import { ForgotPasswordForm } from '@/modules/auth/components/ForgotPasswordForm';

export const metadata = {
    title: 'Quên mật khẩu | TriageFlowOPD',
};

export default function ForgotPasswordPage() {
    return (
        <main className="flex min-h-screen">
            {/* Left: brand panel */}
            <AuthBrandPanel />

            {/* Right: form panel */}
            <div className="flex flex-1 items-center justify-center bg-white px-6 py-12 lg:px-16">
                <ForgotPasswordForm />
            </div>
        </main>
    );
}
