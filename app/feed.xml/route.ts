import { feedResponse } from '@/lib/feed';
import { posts } from '@/lib/posts.generated';
import { pageUrl } from '@/lib/site';

export const dynamic = 'force-static';

export function GET() {
  return feedResponse({
    title: "Quigles' blog",
    link: pageUrl('/'),
    description: 'Notes on technology, work, and other things.',
    self: '/feed.xml',
    posts,
  });
}
