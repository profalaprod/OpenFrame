import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | FRAME',
  description: 'Privacy Policy for FRAME.',
};

export default function PrivacyPolicyPage() {
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
              Privacy Policy
            </h1>

            <p className="mt-3 text-sm text-white/30">
              Last updated: July 29, 2026
            </p>
          </div>

          <div className="space-y-10 text-sm leading-7 text-white/55">
            <section>
              <h2 className="mb-3 text-base font-medium text-white">
                1. Introduction
              </h2>
              <p>
                NDONGALA operates FRAME, a private video review and
                collaboration platform. This Privacy Policy describes the
                personal information that may be processed when you use FRAME.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-base font-medium text-white">
                2. Information We Process
              </h2>
              <p>
                Depending on how you use FRAME, information processed through
                the service may include account information such as your name
                and email address, authentication information, uploaded videos,
                comments, annotations, project information, share links, and
                other content you provide.
              </p>
              <p className="mt-3">
                Technical information required to operate and secure the
                service may also be processed, including IP addresses, request
                information, timestamps, browser information, session data, and
                application logs.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-base font-medium text-white">
                3. Purpose of Processing
              </h2>
              <p>
                Information is processed to provide FRAME and its collaboration
                features, authenticate users, store and deliver uploaded
                content, maintain account and project functionality, protect
                the service from misuse, troubleshoot technical problems, and
                communicate with users when necessary.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-base font-medium text-white">
                4. Video and User Content
              </h2>
              <p>
                Videos and other content uploaded to FRAME are processed and
                stored as necessary to provide video review, playback,
                commenting, version management, sharing, and related
                functionality.
              </p>
              <p className="mt-3">
                Content shared through a share link may be accessible to people
                who receive that link according to the permissions configured
                for it.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-base font-medium text-white">
                5. Cookies and Sessions
              </h2>
              <p>
                FRAME may use cookies or similar browser storage where
                necessary for authentication, session management, security,
                and application functionality.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-base font-medium text-white">
                6. Data Sharing
              </h2>
              <p>
                Personal information is not sold. Information may be processed
                by infrastructure or technical service providers where this is
                necessary to operate, secure, store, or deliver FRAME and its
                content. Information may also be disclosed where required by
                applicable law.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-base font-medium text-white">
                7. Data Retention
              </h2>
              <p>
                Information is retained for as long as necessary to provide and
                operate FRAME or to meet applicable legal, security, and
                operational requirements. Deleted content may remain in
                technical backups for a limited period before being removed.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-base font-medium text-white">
                8. Security
              </h2>
              <p>
                Technical and organizational measures are used to protect
                information against unauthorized access, loss, alteration, and
                misuse. No internet-based service can guarantee absolute
                security.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-base font-medium text-white">
                9. Your Rights
              </h2>
              <p>
                Depending on applicable data protection law, you may have
                rights relating to your personal data, including rights of
                access, correction, deletion, restriction, objection, and data
                portability.
              </p>
              <p className="mt-3">
                Requests concerning personal data can be sent to{' '}
                <a
                  href="mailto:contact@ndongala.tech"
                  className="text-violet-300 transition hover:text-violet-200"
                >
                  contact@ndongala.tech
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-base font-medium text-white">
                10. Changes to This Policy
              </h2>
              <p>
                This Privacy Policy may be updated when the operation of FRAME,
                its technical infrastructure, or applicable requirements
                change. The current version will be published on this page.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-base font-medium text-white">
                11. Contact
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
                href="/terms"
                className="transition hover:text-violet-300"
              >
                Terms of Service
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
