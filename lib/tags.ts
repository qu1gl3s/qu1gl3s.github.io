import { posts } from '@/lib/posts.generated';

export function tagSlug(tag: string) {
  return tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const tags = Array.from(new Set(posts.flatMap((post) => [...post.tags])))
  .sort((a, b) => a.localeCompare(b));

export function tagFromSlug(slug: string) {
  return tags.find((tag) => tagSlug(tag) === slug);
}

export function postsWithTag(tag: string) {
  return posts.filter((post) => post.tags.includes(tag as never));
}
