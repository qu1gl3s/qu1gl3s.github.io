import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const target = process.argv[2];
if (!target || !path.isAbsolute(target) || target === '/') {
  throw new Error('Pass a safe absolute Pages artifact directory.');
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

const files = await walk(target);
const relativeFiles = new Set(files.map((file) => path.relative(target, file)));
const required = ['.nojekyll', '404.html', 'CNAME', 'feed.xml', 'index.html', 'robots.txt', 'sitemap.xml'];
for (const file of required) {
  if (!relativeFiles.has(file)) throw new Error(`Pages artifact is missing ${file}`);
}

if ((await readFile(path.join(target, 'CNAME'), 'utf8')).trim() !== 'quigley.au') {
  throw new Error('Pages artifact has an unexpected CNAME');
}

const violations = [];
for (const file of files) {
  if (!file.endsWith('.html') && !file.endsWith('.js')) continue;
  const source = await readFile(file, 'utf8');
  const checks = [
    ['inline script', /<script(?![^>]*\bsrc=)/i],
    ['inline style element', /<style(?:\s|>)/i],
    ['inline style attribute', /\sstyle=/i],
    ['runtime style assignment', /\.style\./],
    ['eval', /\beval\s*\(/],
    ['Function constructor', /\bnew\s+Function\s*\(/],
  ];
  for (const [label, pattern] of checks) {
    if (pattern.test(source)) violations.push(`${path.relative(target, file)}: ${label}`);
  }
}
if (violations.length) throw new Error(`Strict CSP violations:\n${violations.join('\n')}`);

const index = await readFile(path.join(target, 'index.html'), 'utf8');
const stylesheet = index.match(/href="\/(style\.[a-f0-9]{12}\.css)"/i)?.[1];
const script = index.match(/src="\/(code-blocks\.[a-f0-9]{12}\.js)"/i)?.[1];
if (!stylesheet || !relativeFiles.has(stylesheet)) throw new Error('Fingerprinted stylesheet is missing');
if (!script || !relativeFiles.has(script)) throw new Error('Fingerprinted code-block script is missing');
if (relativeFiles.has('style.css') || relativeFiles.has('code-blocks.js')) {
  throw new Error('Unversioned CSS or JavaScript leaked into the Pages artifact');
}

for (const file of relativeFiles) {
  const match = file.match(/^posts\/\d{4}-\d{2}-\d{2}-(.+)\.md$/);
  if (!match) continue;
  const article = path.join('writing', match[1], 'index.html');
  if (!relativeFiles.has(article)) throw new Error(`${file}: generated article is missing`);
}

console.log(`Verified ${relativeFiles.size} published files, strict CSP, and fingerprinted assets.`);
