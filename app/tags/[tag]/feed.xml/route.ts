import { postsWithTag, tagFromSlug, tagSlug, tags } from '@/lib/tags';

export const dynamic = 'force-static';

function escapeXml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
}

export const dynamicParams = false;

export function generateStaticParams() {
  return tags.map((tag) => ({ tag: tagSlug(tag) }));
}

export async function GET(_: Request, { params }: { params: Promise<{ tag: string }> }) {
  const { tag: slug } = await params;
  const tag = tagFromSlug(slug);
  if (!tag) return new Response('Not found', { status: 404 });
  const items = postsWithTag(tag).map((post) => `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>https://quigley.au/writing/${post.slug}</link>
      <guid>https://quigley.au/writing/${post.slug}</guid>
      <pubDate>${new Date(`${post.date}T00:00:00Z`).toUTCString()}</pubDate>
      <description>${escapeXml(post.excerpt)}</description>
      ${post.tags.map((postTag) => `<category>${escapeXml(postTag)}</category>`).join('')}
    </item>`).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8" ?><rss version="2.0"><channel><title>Quigles&apos; blog — #${escapeXml(tag)}</title><link>https://quigley.au/tags/${slug}</link><description>Posts tagged ${escapeXml(tag)}.</description>${items}</channel></rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
