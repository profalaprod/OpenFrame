'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RegisterPageClientProps {
  requireInviteCode: boolean;
  googleEnabled: boolean;
  githubEnabled: boolean;
}

export default function RegisterPageClient({
  requireInviteCode,
}: RegisterPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const invitationToken = useMemo(
    () => searchParams.get('invitationToken') || '',
    [searchParams]
  );

  const invitedEmail = useMemo(
    () => searchParams.get('email') || '',
    [searchParams]
  );

  const isInvitationFlow = invitationToken.length > 0;
  const shouldShowInviteCode = requireInviteCode && !isInvitationFlow;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    inviteCode: '',
  });

  useEffect(() => {
    if (!invitedEmail) return;

    setFormData((prev) => ({
      ...prev,
      email: invitedEmail,
    }));
  }, [invitedEmail]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));

    setError('');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          inviteCode: shouldShowInviteCode
            ? formData.inviteCode || undefined
            : undefined,
          invitationToken: invitationToken || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      if (data.data?.emailVerificationRequired) {
        router.push(
          `/verify-email?email=${encodeURIComponent(formData.email)}`
        );
      } else {
        router.push('/login?registered=true');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    'border-white/[0.08] bg-black/20 text-white placeholder:text-white/20 focus-visible:border-violet-500/50 focus-visible:ring-violet-500/20';

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

          <Card className="border-white/[0.08] bg-white/[0.045] text-white shadow-[0_30px_100px_rgba(0,0,0,0.55),0_0_80px_rgba(109,40,217,0.08)] backdrop-blur-2xl">
            <CardHeader className="pb-5 text-center">
              <CardTitle className="text-xl font-medium tracking-tight text-white">
                Create account
              </CardTitle>

              <CardDescription className="text-white/40">
                Create your FRAME account
              </CardDescription>
            </CardHeader>

            <CardContent>
              {isInvitationFlow && (
                <div className="mb-4 rounded-md border border-violet-500/20 bg-violet-500/[0.07] p-3 text-sm text-violet-200">
                  You are registering via an invitation link.
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                {shouldShowInviteCode && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="inviteCode"
                      className="flex items-center gap-2 text-white/70"
                    >
                      <KeyRound className="h-4 w-4 text-violet-400" />
                      Invite Code
                    </Label>

                    <Input
                      id="inviteCode"
                      name="inviteCode"
                      type="text"
                      placeholder="Enter your invite code"
                      value={formData.inviteCode}
                      onChange={handleChange}
                      required
                      disabled={isLoading}
                      className={inputClass}
                    />

                    <p className="text-xs text-white/30">
                      An invite code is required to create an account.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-white/70">
                    Full Name
                  </Label>

                  <Input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    minLength={2}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white/70">
                    Email
                  </Label>

                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-white/70">
                    Password
                  </Label>

                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    minLength={8}
                    className={inputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-white/70">
                    Confirm Password
                  </Label>

                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                    className={inputClass}
                  />
                </div>

                {error && (
                  <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-violet-700 via-violet-600 to-purple-600 text-white shadow-[0_8px_30px_rgba(124,58,237,0.22)] transition hover:from-violet-600 hover:via-violet-500 hover:to-purple-500"
                  disabled={isLoading}
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create account
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-violet-500/40 bg-violet-500/[0.035] text-violet-300 hover:border-violet-400/70 hover:bg-violet-500/10 hover:text-violet-200"
                  asChild
                >
                  <Link href="/login">
                    Already have an account? Sign in
                    <span className="ml-2">→</span>
                  </Link>
                </Button>
              </form>

              <p className="mt-6 text-center text-[11px] leading-relaxed text-white/25">
                By creating an account, you agree to our{' '}
                <Link
                  href="/terms"
                  className="text-white/45 transition hover:text-violet-300"
                >
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link
                  href="/privacy"
                  className="text-white/45 transition hover:text-violet-300"
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-[11px] text-white/25">
            © 2026 NDONGALA
          </p>
        </div>
      </div>
    </main>
  );
}
