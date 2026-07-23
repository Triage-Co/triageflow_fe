import { AuthBrandPanel } from '@/modules/auth/components/AuthBrandPanel';
import { RegisterForm } from '@/modules/auth/components/RegisterForm';

export const metadata = {
  title: 'Đăng ký | TriageFlowOPD',
};

export default function RegisterPage() {
  return (
    <main className="flex min-h-dvh flex-col overflow-y-auto lg:flex-row lg:min-h-screen">
      {/* Left: brand panel */}
      <AuthBrandPanel />

      {/* Right: form panel */}
      <div className="flex flex-1 flex-col min-h-dvh lg:min-h-screen items-stretch justify-start lg:items-center lg:justify-center bg-white px-4 py-8 sm:px-6 sm:py-12 lg:px-16">
        <div className="w-full max-w-md mx-auto my-auto lg:my-0 py-4">
          <RegisterForm />
        </div>
      </div>
    </main>
  );
}

