import Link from 'next/link';
import {
  FaBluesky,
  FaCircleInfo,
  FaGithub,
  FaLinkedin,
  FaRss,
  FaTags,
} from 'react-icons/fa6';

export function SiteHeader() {
  return (
    <header className="site-header shell">
      <Link className="site-name" href="/">
        Quigles&apos; blog
      </Link>
      <nav className="icon-nav" aria-label="Site and profile links">
        <Link href="/about" aria-label="About" title="About">
          <FaCircleInfo aria-hidden="true" />
        </Link>
        <Link href="/tags" aria-label="Tags" title="Tags">
          <FaTags aria-hidden="true" />
        </Link>
        <a href="https://github.com/qu1gl3s" rel="me" aria-label="GitHub" title="GitHub">
          <FaGithub aria-hidden="true" />
        </a>
        <a href="https://www.linkedin.com/in/rowanquigley/" rel="me" aria-label="LinkedIn" title="LinkedIn">
          <FaLinkedin aria-hidden="true" />
        </a>
        <a href="https://bsky.app/profile/quigley.au" rel="me" aria-label="Bluesky" title="Bluesky">
          <FaBluesky aria-hidden="true" />
        </a>
        <a href="/feed.xml" aria-label="RSS feed" title="RSS feed">
          <FaRss aria-hidden="true" />
        </a>
      </nav>
    </header>
  );
}
