import Link from 'next/link';
import { tagSlug } from '@/lib/tags';

export function TagLinks({ tags }: { tags: readonly string[] }) {
  if (!tags.length) return null;
  return (
    <div className="tag-links" aria-label="Tags">
      {tags.map((tag) => (
        <Link href={`/tags/${tagSlug(tag)}`} key={tag}>#{tag}</Link>
      ))}
    </div>
  );
}
