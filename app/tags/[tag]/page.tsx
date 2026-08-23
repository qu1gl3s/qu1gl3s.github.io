import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FaRss } from 'react-icons/fa6';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { postsWithTag, tagFromSlug, tagSlug, tags } from '@/lib/tags';

type Props = { params: Promise<{ tag: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return tags.map((tag) => ({ tag: tagSlug(tag) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag: slug } = await params;
  const tag = tagFromSlug(slug);
  if (!tag) return {};
  const description = `Posts tagged ${tag} on Quigles' blog.`;
  return {
    title: `#${tag}`,
    description,
    openGraph: { title: `#${tag}`, description, url: `/tags/${slug}`, images: [] },
    twitter: { card: 'summary', title: `#${tag}`, description, images: [] },
  };
}

export default async function TagPage({ params }: Props) {
  const { tag: slug } = await params;
  const tag = tagFromSlug(slug);
  if (!tag) notFound();
  const matchingPosts = postsWithTag(tag);
  return (
    <main>
      <SiteHeader />
      <section className="page-intro shell tag-heading">
        <h1>#{tag}</h1>
        <a href={`/tags/${slug}/feed.xml`}><FaRss aria-hidden="true" /> RSS</a>
      </section>
      <section className="archive shell" aria-label={`Posts tagged ${tag}`}>
        {matchingPosts.map((post) => (
          <article className="archive-row" key={post.slug}>
            <time dateTime={post.date}>{post.date}</time>
            <div><h2><Link href={`/writing/${post.slug}`}>{post.title}</Link></h2><p>{post.excerpt}</p></div>
            <span>{post.readingMinutes} min</span>
          </article>
        ))}
      </section>
      <SiteFooter />
    </main>
  );
}
