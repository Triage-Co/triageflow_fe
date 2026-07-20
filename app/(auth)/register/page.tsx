import { AuthBrandPanel } from '@/modules/auth/components/AuthBrandPanel';
import { RegisterForm } from '@/modules/auth/components/RegisterForm';

export const metadata = {
  title: 'Đăng ký | TriageFlowOPD',
};

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen">
      {/* Left: brand panel */}
      <AuthBrandPanel />

      {/* Right: form panel */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12 lg:px-16">
        <RegisterForm />
      </div>
    </main>
  );
}

