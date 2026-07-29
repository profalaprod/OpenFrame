import { Suspense } from 'react';
import { LoginForm, LoginFormSkeleton } from './login-form';

export default function LoginPage() {
  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
  const githubEnabled = Boolean(
    process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07050d] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 38%, rgba(124,58,237,0.18), transparent 30%), radial-gradient(circle at 15% 85%, rgba(88,28,135,0.10), transparent 32%), radial-gradient(circle at 90% 10%, rgba(139,92,246,0.08), transparent 28%)',
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-12">
        <div className="w-full max-w-[420px]">
          <div className="mb-9 text-center">
            <div className="mb-3 flex items-center justify-center">
              <div className="h-px w-8 bg-gradient-to-r from-transparent to-violet-500/70" />
              <div className="mx-3 h-1.5 w-1.5 rotate-45 bg-violet-400 shadow-[0_0_16px_rgba(167,139,250,0.9)]" />
              <div className="h-px w-8 bg-gradient-to-l from-transparent to-violet-500/70" />
            </div>

            <h1 className="text-[34px] font-semibold tracking-[0.28em] text-white">
              FRAME
            </h1>

            <p className="mt-2 text-xs tracking-[0.16em] text-white/35">
              PRIVATE REVIEW PLATFORM
            </p>
          </div>

          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginForm
              googleEnabled={googleEnabled}
              githubEnabled={githubEnabled}
            />
          </Suspense>

          <p className="mt-6 text-center text-[11px] text-white/25">
            © 2026 NDONGALA
          </p>
        </div>
      </div>
    </main>
  );
}
