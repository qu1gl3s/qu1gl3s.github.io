# Quigles' blog

The source for [quigley.au](https://quigley.au).

## Publish a post

Add a Markdown file to `posts/` using this filename format:

```text
YYYY-MM-DD-lowercase-slug.md
```

Every post starts with:

```yaml
---
title: The post title
date: YYYY-MM-DD
excerpt: A short description used on index pages and in feeds.
tags: first-tag, second-tag
---
```

Commit and push the file to `main`. GitHub Actions validates the post, builds the site, and deploys it to GitHub Pages. Editing or deleting a post works the same way. If validation or the build fails, the previous deployment stays online.

The date in the filename must match the frontmatter date. Filenames and tags use lowercase letters, numbers, and hyphens.

## Preview locally

```bash
npm ci
npm run dev
```

Drafts and private working material do not belong in this public repository. Keep them in a separate private or local directory until they are ready to publish.
