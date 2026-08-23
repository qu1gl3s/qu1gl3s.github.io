import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv[2];

if (!target || !path.isAbsolute(target) || target === '/') {
  throw new Error('Pass a safe absolute output directory.');
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else files.push(fullPath);
  }
  return files;
}

function fingerprint(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 12);
}

function cleanHtml(html, stylesheet, script) {
  return html
    .replace(/<link rel="stylesheet" href="[^"]+" data-precedence="next"\/>/g, `<link rel="stylesheet" href="/${stylesheet}"/>`)
    .replace(/<link rel="preload" as="script"[^>]*\/>/g, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
    .replace('<div hidden=""><!--$--><!--/$--></div>', '')
    .replace(/<!--\$--><!--\/\$-->/g, '')
    .replace(/<!-- -->/g, '')
    .replace('</body>', `<script src="/${script}" defer></script></body>`);
}

await mkdir(target, { recursive: true });

const output = path.join(root, 'out');
const outputFiles = await walk(output);
const cssFiles = outputFiles.filter((file) => file.endsWith('.css'));
if (cssFiles.length !== 1) throw new Error(`Expected one stylesheet, found ${cssFiles.length}.`);

const css = await readFile(cssFiles[0]);
const javascript = await readFile(path.join(root, 'public', 'code-blocks.js'));
const stylesheetName = `style.${fingerprint(css)}.css`;
const scriptName = `code-blocks.${fingerprint(javascript)}.js`;

for (const file of outputFiles) {
  const relative = path.relative(output, file);
  const basename = path.basename(file);
  if (relative.startsWith('404/') || relative.startsWith('_not-found/')) continue;
  const keep = file.endsWith('.html') || file.endsWith('.xml') || ['robots.txt', 'favicon.svg', 'og.png', 'CNAME'].includes(basename);
  if (!keep) continue;

  const destination = path.join(target, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  if (file.endsWith('.html')) {
    await writeFile(destination, cleanHtml(await readFile(file, 'utf8'), stylesheetName, scriptName));
  } else {
    await cp(file, destination);
  }
}

await writeFile(path.join(target, stylesheetName), css);
await writeFile(path.join(target, scriptName), javascript);

await mkdir(path.join(target, 'posts'), { recursive: true });
const postsDirectory = path.join(root, 'posts');
for (const post of await readdir(postsDirectory)) {
  if (post.endsWith('.md')) await cp(path.join(postsDirectory, post), path.join(target, 'posts', post));
}

await writeFile(path.join(target, '.nojekyll'), '');
