import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { TagLinks } from '@/components/TagLinks';
import { posts } from '@/lib/posts.generated';
import { pageAlternates } from '@/lib/site';

function readableDate(date: string) {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`));
}

export const metadata: Metadata = { alternates: pageAlternates('/') };

export default function Home() {
  return (
    <main>
      <SiteHeader />

      <section className="intro shell">
        <p>Notes on technology, work, and other things.</p>
      </section>

      <section className="post-list shell" aria-labelledby="writing-heading">
        <h1 id="writing-heading">Posts</h1>
        {posts.map((post) => (
          <article className="post-summary" key={post.slug}>
            <time dateTime={post.date}>{readableDate(post.date)}</time>
            <h2>
              <Link href={`/writing/${post.slug}`}>{post.title}</Link>
            </h2>
            <p>{post.excerpt}</p>
            <TagLinks tags={post.tags} />
          </article>
        ))}
      </section>

      <SiteFooter />
    </main>
  );
}
