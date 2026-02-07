# 001 — Landing Page MVP

> **Status:** ready
> **Goal:** A minimalistic landing page that displays the latest comic from a content collection.

## Content Collection

### Schema

Each comic is a markdown file in `src/content/comics/` with frontmatter:

| Field   | Type   | Required | Description                              |
|---------|--------|----------|------------------------------------------|
| `title` | string | yes      | Comic title                              |
| `date`  | date   | yes      | Publication date (used for sorting)      |
| `image` | image  | yes      | Path to image in `src/assets/comics/`    |
| `alt`   | string | yes      | Accessible description of the comic      |

### File structure

```
src/
  assets/comics/          # Comic images (Astro-optimized)
  content/comics/         # Markdown files (one per comic)
    001-premier-strip.md
  content.config.ts       # Collection definition with glob() loader
```

### Example entry

```markdown
---
title: "Premier strip"
date: 2025-01-01
image: ../../assets/comics/001-premier-strip.jpg
alt: "Description accessible du premier strip"
---
```

## Components

### Layout (`src/layouts/Layout.astro`)

- `<html lang="fr">`
- `<title>Le concept de la preuve</title>`
- Imports `src/styles/global.css`
- Renders: `<Header />` → `<slot />` → `<Footer />`

### Header (`src/components/Header.astro`)

- Site name "Le concept de la preuve" as a link to `/`
- Bottom border separator
- No navigation, no tagline

### Footer (`src/components/Footer.astro`)

- Single line: `© 2025 Le concept de la preuve`
- Top border separator, muted text

### Index page (`src/pages/index.astro`)

1. Fetch all comics via `getCollection('comics')`
2. Sort by `date` descending
3. Take the first (latest) entry
4. Render:
   - Comic title (heading)
   - Comic image — full-width, centered, max-width constrained
   - Date below in small muted text

## Styling

- Tailwind utility classes only
- Neutral color palette (grays, black, white)
- System font stack (`font-sans`)
- No custom fonts, no comic-style aesthetics
- Responsive: image scales down on small screens

## Files to create/modify

| Action | File                          |
|--------|-------------------------------|
| create | `src/content.config.ts`       |
| create | `src/content/comics/001-premier-strip.md` |
| create | `src/assets/comics/` (directory + placeholder image) |
| create | `src/components/Header.astro` |
| create | `src/components/Footer.astro` |
| modify | `src/layouts/Layout.astro`    |
| modify | `src/pages/index.astro`       |
| delete | `src/components/Welcome.astro` |

## Out of scope

- Navigation (prev/next) — no need with one comic
- Archive/listing page
- Vote system / Astro DB
- SEO meta tags beyond `<title>`
- Dark mode
