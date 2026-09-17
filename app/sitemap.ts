import type { MetadataRoute } from 'next';
import { posts } from '@/lib/posts.generated';
import { pageUrl } from '@/lib/site';
import { tagSlug, tags } from '@/lib/tags';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const postDate = (date: string) => new Date(`${date}T00:00:00Z`);
  const latestDate = posts.at(0)?.date;
  const latest = latestDate ? postDate(latestDate) : undefined;
  return [
    { url: pageUrl('/'), lastModified: latest, priority: 1 },
    { url: pageUrl('/writing'), lastModified: latest, priority: 0.8 },
    { url: pageUrl('/about'), priority: 0.5 },
    { url: pageUrl('/tags'), lastModified: latest, priority: 0.6 },
    ...tags.map((tag) => ({ url: pageUrl(`/tags/${tagSlug(tag)}`), lastModified: latest, priority: 0.5 })),
    ...posts.map((post) => ({ url: pageUrl(`/writing/${post.slug}`), lastModified: postDate(post.date), priority: 0.7 })),
  ];
}
