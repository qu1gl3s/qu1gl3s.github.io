import type { Metadata } from 'next';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';
import { pageAlternates } from '@/lib/site';

export const metadata: Metadata = {
  title: 'About',
  description: "About Quigles' blog.",
  alternates: pageAlternates('/about'),
};

export default function AboutPage() {
  return (
    <main>
      <SiteHeader />
      <article className="about shell">
        <h1>About</h1>
        <p>I&apos;m Quigles. This is my personal blog.</p>
        <p>I write about technology, work, creativity, and things I want to remember. Some posts will be essays; others will be short notes.</p>
        <p>You can also find me on <a href="https://github.com/qu1gl3s" rel="me">GitHub as qu1gl3s</a>.</p>
      </article>
      <SiteFooter />
    </main>
  );
}
