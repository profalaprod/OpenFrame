import type { MetadataRoute } from 'next';
import { seoConfig } from '@/lib/seo';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${seoConfig.name} - ${seoConfig.title}`,
    short_name: seoConfig.name,
    description: seoConfig.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#07050d',
    theme_color: '#07050d',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
