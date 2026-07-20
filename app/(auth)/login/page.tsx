import { AuthBrandPanel } from '@/modules/auth/components/AuthBrandPanel';
import { LoginForm } from '@/modules/auth/components/LoginForm';

export const metadata = {
  title: 'Đăng nhập | TriageFlowOPD',
};

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col lg:flex-row lg:min-h-screen">
      {/* Left: brand panel */}
      <AuthBrandPanel />

      {/* Right: form panel — scrollable on mobile when keyboard opens */}
      <div className="flex flex-1 flex-col overflow-y-auto overscroll-y-contain min-h-dvh lg:min-h-screen items-stretch justify-start lg:items-center lg:justify-center bg-white px-4 py-8 sm:px-6 sm:py-12 lg:px-16">
        <div className="w-full max-w-md mx-auto my-auto lg:my-0 py-4">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}

