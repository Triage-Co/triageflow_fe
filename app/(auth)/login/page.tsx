import { AuthBrandPanel } from '@/modules/auth/components/AuthBrandPanel';
import { LoginForm } from '@/modules/auth/components/LoginForm';

export const metadata = {
  title: 'Đăng nhập | TriageFlowOPD',
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen">
      {/* Left: brand panel */}
      <AuthBrandPanel />

      {/* Right: form panel */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12 lg:px-16">
        <LoginForm />
      </div>
    </main>
  );
}

