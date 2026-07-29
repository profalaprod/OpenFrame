const FALLBACK_SITE_URL = 'https://frame.ndongala.tech';

function normalizeSiteUrl(rawUrl: string | undefined): string {
  if (!rawUrl) {
    return FALLBACK_SITE_URL;
  }

  const trimmed = rawUrl.trim();

  if (!trimmed) {
    return FALLBACK_SITE_URL;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export function getSiteUrl(): string {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL);
}

export const seoConfig = {
  name: 'FRAME',
  title: 'Private Video Review Platform',
  description:
    'FRAME is a private video review platform for collaborative feedback, review and approval.',
  keywords: [
    'FRAME',
    'video review platform',
    'private video review',
    'video feedback',
    'video collaboration',
    'video approval',
    'creative review workflow',
  ],
  url: getSiteUrl(),
  ogImage: '/meta.webp',
  logoPath: '/icon.svg',
  logo: '/icon.svg?v=2',
} as const;
