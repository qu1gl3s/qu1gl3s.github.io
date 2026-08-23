import { posts } from '@/lib/posts.generated';

export const dynamic = 'force-static';

function escapeXml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

export function GET() {
  const items = posts.map((post) => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>https://quigley.au/writing/${post.slug}</link>
      <guid>https://quigley.au/writing/${post.slug}</guid>
      <pubDate>${new Date(`${post.date}T00:00:00Z`).toUTCString()}</pubDate>
      <description>${escapeXml(post.excerpt)}</description>
      ${post.tags.map((tag) => `<category>${escapeXml(tag)}</category>`).join('')}
    </item>`).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8" ?><rss version="2.0"><channel><title>Quigles&apos; blog</title><link>https://quigley.au</link><description>Notes on technology, work, and other things.</description>${items}</channel></rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
