import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://quigley.au'),
  authors: [{ name: 'quigles', url: 'https://github.com/qu1gl3s' }],
  alternates: { types: { 'application/rss+xml': '/feed.xml' } },
  title: {
    default: "Quigles' blog",
    template: "%s — Quigles' blog",
  },
  description: 'Notes on technology, work, and other things.',
  openGraph: {
    title: "Quigles' blog",
    description: 'Notes on technology, work, and other things.',
    url: 'https://quigley.au',
    siteName: "Quigles' blog",
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: "Quigles' blog — quigley.au" }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Quigles' blog",
    description: 'Notes on technology, work, and other things.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <script src="/code-blocks.js" defer />
      </body>
    </html>
  );
}
