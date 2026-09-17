import type { posts } from '@/lib/posts.generated';
import { fileUrl, pageUrl } from '@/lib/site';

type Post = (typeof posts)[number];

export function escapeXml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

function item(post: Post) {
  const url = pageUrl(`/writing/${post.slug}`);
  return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(`${post.date}T00:00:00Z`).toUTCString()}</pubDate>
      <description>${escapeXml(post.excerpt)}</description>
      ${post.tags.map((tag) => `<category>${escapeXml(tag)}</category>`).join('')}
    </item>`;
}

type Channel = { title: string; link: string; description: string; self: string; posts: readonly Post[] };

export function feedResponse({ title, link, description, self, posts: entries }: Channel) {
  const selfUrl = fileUrl(self);
  const xml = `<?xml version="1.0" encoding="UTF-8" ?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>`
    + `<title>${escapeXml(title)}</title>`
    + `<link>${link}</link>`
    + `<description>${escapeXml(description)}</description>`
    + `<atom:link href="${selfUrl}" rel="self" type="application/rss+xml"/>`
    + `${entries.map(item).join('')}</channel></rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
