import Link from 'next/link';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';

export default function NotFound() {
  return (
    <main>
      <SiteHeader />
      <section className="not-found shell">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <p>That page does not exist or may have moved.</p>
        <Link href="/">Back to the posts</Link>
      </section>
      <SiteFooter />
    </main>
  );
}
