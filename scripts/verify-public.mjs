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

const host = (await readFile(path.join(target, 'CNAME'), 'utf8')).trim();
if (host !== 'quigley.au') {
  throw new Error('Pages artifact has an unexpected CNAME');
}
const origin = `https://${host}`;

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

// Every URL we advertise must be a URL we actually serve. `trailingSlash: true` means pages
// live at <dir>/index.html, so a slash-less URL is a 301 that Search Console reports back to us.
function articleFor(url) {
  if (!url.startsWith(`${origin}/`)) return { error: `is not on ${origin}` };
  const pathname = url.slice(origin.length);
  if (!pathname.endsWith('/')) return { error: 'has no trailing slash, so it redirects' };
  const file = path.posix.join(pathname.slice(1), 'index.html');
  if (!relativeFiles.has(file)) return { error: `has no ${file} in the artifact` };
  return { file };
}

const urlProblems = [];
function checkUrls(source, urls) {
  for (const url of urls) {
    const { error } = articleFor(url);
    if (error) urlProblems.push(`${source}: ${url} ${error}`);
  }
}

const sitemap = await readFile(path.join(target, 'sitemap.xml'), 'utf8');
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
if (!locations.length) throw new Error('sitemap.xml lists no URLs');
checkUrls('sitemap.xml', locations);

for (const file of relativeFiles) {
  if (!file.endsWith('feed.xml')) continue;
  const feed = await readFile(path.join(target, file), 'utf8');
  checkUrls(file, [
    ...[...feed.matchAll(/<link>([^<]+)<\/link>/g)].map((match) => match[1]),
    ...[...feed.matchAll(/<guid[^>]*>([^<]+)<\/guid>/g)].map((match) => match[1]),
  ]);
}

// Each page must declare itself canonical, so discovery order cannot decide which URL wins.
for (const file of relativeFiles) {
  if (path.basename(file) !== 'index.html') continue;
  const directory = path.posix.dirname(file);
  const expected = directory === '.' ? `${origin}/` : `${origin}/${directory}/`;
  const canonical = (await readFile(path.join(target, file), 'utf8')).match(/<link rel="canonical" href="([^"]+)"/i)?.[1];
  if (!canonical) urlProblems.push(`${file}: has no canonical link`);
  else if (canonical !== expected) urlProblems.push(`${file}: canonical is ${canonical}, expected ${expected}`);
}

for (const file of relativeFiles) {
  const match = file.match(/^tags\/([^/]+)\/index\.html$/);
  if (match && !relativeFiles.has(`tags/${match[1]}/feed.xml`)) {
    urlProblems.push(`tags/${match[1]}: tag page has no feed.xml`);
  }
}

const robots = await readFile(path.join(target, 'robots.txt'), 'utf8');
for (const line of ['Disallow: /feed.xml', 'Disallow: /tags/*/feed.xml', `Sitemap: ${origin}/sitemap.xml`]) {
  if (!robots.includes(line)) urlProblems.push(`robots.txt: missing "${line}"`);
}

if (urlProblems.length) throw new Error(`Published URLs disagree with published files:\n${urlProblems.join('\n')}`);

console.log(`Verified ${relativeFiles.size} published files, strict CSP, fingerprinted assets, and ${locations.length} canonical URLs.`);
