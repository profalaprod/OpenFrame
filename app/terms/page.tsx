import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | FRAME',
  description: 'Terms of Service for FRAME.',
};

export default function TermsOfServicePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07050d] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 15%, rgba(124,58,237,0.16), transparent 30%), radial-gradient(circle at 10% 80%, rgba(88,28,135,0.08), transparent 30%)',
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="relative z-10">
        <header className="border-b border-white/[0.06] bg-black/10 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[900px] items-center justify-between px-5 py-5">
            <Link
              href="/login"
              className="text-sm font-semibold tracking-[0.24em] text-white transition hover:text-violet-300"
            >
              FRAME
            </Link>

            <Link
              href="/login"
              className="text-xs text-white/35 transition hover:text-white/70"
            >
              ← Back to sign in
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-[900px] px-5 py-14 sm:py-20">
          <div className="mb-12">
            <div className="mb-4 flex items-center gap-3">
              <div className="h-1.5 w-1.5 rotate-45 bg-violet-400 shadow-[0_0_16px_rgba(167,139,250,0.9)]" />
              <span className="text-[10px] tracking-[0.2em] text-violet-300/60">
                FRAME
              </span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Terms of Service
            </h1>

            <p className="mt-3 text-sm text-white/30">
              Last updated: July 29, 2026
            </p>
          </div>

          <div className="space-y-10 text-sm leading-7 text-white/55">
            <section>
              <h2 className="mb-3 text-base font-medium text-white">
                1. Agreement to Terms
              </h2>
              <p>
                These Terms of Service govern your access to and use of FRAME,
                operated by NDONGALA. By creating an account or using FRAME,
                you agree to these Terms.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-base font-medium text-white">
                2. Description of Service
              </h2>
              <p>
                FRAME is a private video review and collaboration platform.
                It provides features for uploading and reviewing videos,
                comments, annotations, version management, sharing, and
                approval workflows.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-base font-medium text-white">
                3. Accounts
              </h2>
              <p>
                You are responsible for providing accurate account information,
                protecting your login credentials, and for activity performed
                through your account. Please contact us if you believe your
                account has been accessed without authorization.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-base font-medium text-white">
                4. User Content
              </h2>
              <p>
                You retain your rights to videos, comments, annotations, and
                other content you submit to FRAME. You are responsible for
                ensuring that you have the necessary rights to upload, process,
                and share that content.
              </p>
              <p className="mt-3">
                By uploading content, you permit FRAME to store, process, and
                display that content as necessary to provide the service and
                features you use.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-base font-medium text-white">
                5. Acceptable Use
              </h2>
              <p>
                You may not use FRAME for unlawful purposes, attempt to gain
                unauthorized access to accounts or infrastructure, interfere
                with the operation or security of the service, distribute
                malicious software, or upload content that you are not
                authorized to use.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-base font-medium text-white">
                6. Availability
              </h2>
              <p>
                We aim to keep FRAME available and reliable, but continuous or
                error-free availability is not guaranteed. Features may be
                changed, maintained, suspended, or discontinued when necessary.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-base font-medium text-white">
                7. Account Suspension and Termination
              </h2>
              <p>
                Access may be restricted or terminated where necessary to
                protect FRAME, its infrastructure, its users, or third parties,
                or where these Terms are violated.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-base font-medium text-white">
                8. Privacy
              </h2>
              <p>
                Information about the processing of personal data is available
                in our{' '}
                <Link
                  href="/privacy"
                  className="text-violet-300 transition hover:text-violet-200"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-base font-medium text-white">
                9. Changes
              </h2>
              <p>
                These Terms may be updated when FRAME, its operation, or
                applicable requirements change. The current version will be
                published on this page.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-base font-medium text-white">
                10. Contact
              </h2>
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-5 backdrop-blur-xl">
                <p className="font-medium text-white">NDONGALA</p>
                <p className="mt-1">
                  <a
                    href="mailto:contact@ndongala.tech"
                    className="text-violet-300 transition hover:text-violet-200"
                  >
                    contact@ndongala.tech
                  </a>
                </p>
              </div>
            </section>
          </div>
        </div>

        <footer className="border-t border-white/[0.06]">
          <div className="mx-auto flex max-w-[900px] flex-col gap-4 px-5 py-7 text-[11px] text-white/25 sm:flex-row sm:items-center sm:justify-between">
            <span>© 2026 NDONGALA</span>

            <div className="flex gap-5">
              <Link
                href="/privacy"
                className="transition hover:text-violet-300"
              >
                Privacy Policy
              </Link>
              <Link
                href="/login"
                className="transition hover:text-violet-300"
              >
                Sign in
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
