import type { MetadataRoute } from 'next';
import { fileUrl } from '@/lib/site';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/feed.xml', '/tags/*/feed.xml'] },
    sitemap: fileUrl('sitemap.xml'),
  };
}
