import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Markdown } from '@/components/Markdown';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { TagLinks } from '@/components/TagLinks';
import { posts } from '@/lib/posts.generated';
import { pageAlternates, pageUrl } from '@/lib/site';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = posts.find((entry) => entry.slug === slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    alternates: pageAlternates(`/writing/${post.slug}`),
    openGraph: { title: post.title, description: post.excerpt, type: 'article', url: pageUrl(`/writing/${post.slug}`), images: [] },
    twitter: { card: 'summary', title: post.title, description: post.excerpt, images: [] },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = posts.find((entry) => entry.slug === slug);
  if (!post) notFound();
  return (
    <main>
      <SiteHeader />
      <article className="article shell">
        <header className="article-header">
          <Link className="back-link" href="/writing">← All writing</Link>
          <p className="eyebrow">{post.date} / {post.readingMinutes} min read</p>
          <h1>{post.title}</h1>
          <p className="article-deck">{post.excerpt}</p>
          <TagLinks tags={post.tags} />
        </header>
        <Markdown source={post.body} />
      </article>
      <SiteFooter />
    </main>
  );
}
