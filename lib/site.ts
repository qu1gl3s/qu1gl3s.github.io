export const SITE_ORIGIN = 'https://quigley.au';

/** Absolute URL for a page. Always trailing-slash, matching next.config trailingSlash. */
export function pageUrl(path = '/') {
  const trimmed = path.replace(/^\/+|\/+$/g, '');
  return trimmed ? `${SITE_ORIGIN}/${trimmed}/` : `${SITE_ORIGIN}/`;
}

/** Absolute URL for a file asset such as feed.xml or sitemap.xml. Never trailing-slash. */
export function fileUrl(path: string) {
  return `${SITE_ORIGIN}/${path.replace(/^\/+/, '')}`;
}

/** Canonical plus RSS discovery. Next merges `alternates` shallowly, so they travel together. */
export function pageAlternates(path: string, feed = '/feed.xml') {
  return { canonical: pageUrl(path), types: { 'application/rss+xml': feed } };
}
