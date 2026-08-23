import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const postsDir = path.join(root, 'posts');
const outputFile = path.join(root, 'lib', 'posts.generated.ts');
const filenamePattern = /^(\d{4}-\d{2}-\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;

function isRealDate(value) {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function parseFrontmatter(source, filename) {
  const filenameMatch = filename.match(filenamePattern);
  if (!filenameMatch) {
    throw new Error(`${filename}: expected YYYY-MM-DD-lowercase-slug.md`);
  }

  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`${filename}: missing frontmatter`);

  const values = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    values[key] = value;
  }

  for (const key of ['title', 'date', 'excerpt']) {
    if (!values[key]) throw new Error(`${filename}: missing ${key}`);
  }

  if (!isRealDate(values.date)) throw new Error(`${filename}: invalid date ${values.date}`);
  if (values.date !== filenameMatch[1]) {
    throw new Error(`${filename}: frontmatter date must match filename date`);
  }

  const tags = values.tags ? values.tags.split(',').map((tag) => tag.trim()).filter(Boolean) : [];
  for (const tag of tags) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag)) {
      throw new Error(`${filename}: invalid tag ${tag}`);
    }
  }
  if (new Set(tags).size !== tags.length) throw new Error(`${filename}: duplicate tag`);

  const body = match[2].trim();
  if (!body) throw new Error(`${filename}: empty post body`);
  const words = body.split(/\s+/).filter(Boolean).length;

  return {
    slug: filenameMatch[2],
    title: values.title,
    date: values.date,
    excerpt: values.excerpt,
    tags,
    readingMinutes: Math.max(1, Math.ceil(words / 220)),
    body,
  };
}

const files = (await readdir(postsDir)).filter((file) => file.endsWith('.md')).sort();
if (files.length === 0) throw new Error('posts/: no Markdown posts found');
const posts = await Promise.all(
  files.map(async (file) => parseFrontmatter(await readFile(path.join(postsDir, file), 'utf8'), file)),
);
if (new Set(posts.map((post) => post.slug)).size !== posts.length) {
  throw new Error('posts/: duplicate post slug');
}
posts.sort((a, b) => b.date.localeCompare(a.date));

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(
  outputFile,
  `// Generated from posts/. Do not edit by hand.\nexport const posts = ${JSON.stringify(posts, null, 2)} as const;\n`,
);

console.log(`Generated ${posts.length} post${posts.length === 1 ? '' : 's'}.`);
