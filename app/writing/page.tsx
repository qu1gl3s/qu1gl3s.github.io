import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { TagLinks } from '@/components/TagLinks';
import { posts } from '@/lib/posts.generated';

export const metadata: Metadata = { title: 'Posts', description: 'All posts published by quigles.' };

export default function WritingPage() {
  return (
    <main>
      <SiteHeader />
      <section className="page-intro shell">
        <h1>Posts</h1>
      </section>
      <section className="archive shell" aria-label="All posts">
        {posts.map((post) => (
          <article className="archive-row" key={post.slug}>
            <time dateTime={post.date}>{post.date}</time>
            <div><h2><Link href={`/writing/${post.slug}`}>{post.title}</Link></h2><p>{post.excerpt}</p><TagLinks tags={post.tags} /></div>
            <span>{post.readingMinutes} min</span>
          </article>
        ))}
      </section>
      <SiteFooter />
    </main>
  );
}
