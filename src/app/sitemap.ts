import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://teaballoon.vercel.app';

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'always', // because balloons update constantly
      priority: 1.0,
    },
    // The app is a single-page experience right now. If there are other routes in the future
    // like /about, /terms, etc., they can be appended here.
  ];
}
