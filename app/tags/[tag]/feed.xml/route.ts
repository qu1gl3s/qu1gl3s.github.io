import { feedResponse } from '@/lib/feed';
import { pageUrl } from '@/lib/site';
import { postsWithTag, tagFromSlug, tagSlug, tags } from '@/lib/tags';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return tags.map((tag) => ({ tag: tagSlug(tag) }));
}

export async function GET(_: Request, { params }: { params: Promise<{ tag: string }> }) {
  const { tag: slug } = await params;
  const tag = tagFromSlug(slug);
  if (!tag) return new Response('Not found', { status: 404 });
  return feedResponse({
    title: `Quigles' blog — #${tag}`,
    link: pageUrl(`/tags/${slug}`),
    description: `Posts tagged ${tag}.`,
    self: `/tags/${slug}/feed.xml`,
    posts: postsWithTag(tag),
  });
}
