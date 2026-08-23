import type { MetadataRoute } from 'next';
import { posts } from '@/lib/posts.generated';
import { tagSlug, tags } from '@/lib/tags';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://quigley.au';
  return [
    { url: base, lastModified: new Date(), priority: 1 },
    { url: `${base}/writing`, lastModified: new Date(), priority: 0.8 },
    { url: `${base}/about`, lastModified: new Date(), priority: 0.5 },
    { url: `${base}/tags`, lastModified: new Date(), priority: 0.6 },
    ...tags.map((tag) => ({ url: `${base}/tags/${tagSlug(tag)}`, lastModified: new Date(), priority: 0.5 })),
    ...posts.map((post) => ({ url: `${base}/writing/${post.slug}`, lastModified: new Date(`${post.date}T00:00:00Z`), priority: 0.7 })),
  ];
}
