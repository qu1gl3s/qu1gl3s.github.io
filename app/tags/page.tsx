import type { Metadata } from 'next';
import Link from 'next/link';
import { FaRss } from 'react-icons/fa6';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { postsWithTag, tagSlug, tags } from '@/lib/tags';

export const metadata: Metadata = {
  title: 'Tags',
  description: "Browse Quigles' blog by tag.",
};

export default function TagsPage() {
  return (
    <main>
      <SiteHeader />
      <section className="page-intro shell"><h1>Tags</h1></section>
      <section className="tags-index shell" aria-label="All tags">
        {tags.map((tag) => (
          <div className="tag-row" key={tag}>
            <Link href={`/tags/${tagSlug(tag)}`}>#{tag}</Link>
            <span>{postsWithTag(tag).length} {postsWithTag(tag).length === 1 ? 'post' : 'posts'}</span>
            <a href={`/tags/${tagSlug(tag)}/feed.xml`} aria-label={`RSS feed for ${tag}`} title={`RSS feed for ${tag}`}><FaRss aria-hidden="true" /></a>
          </div>
        ))}
      </section>
      <SiteFooter />
    </main>
  );
}
