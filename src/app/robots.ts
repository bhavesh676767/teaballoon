import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/', // Prevent crawlers from indexing pure API routes directly
    },
    sitemap: 'https://teaballoon.vercel.app/sitemap.xml',
  };
}
