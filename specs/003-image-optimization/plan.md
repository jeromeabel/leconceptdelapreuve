# 003 — Image Optimization & Fade-In Animation

## Problem

Comic images load with no visual transition — they pop in abruptly, creating a jarring experience. The first image lacks `fetchpriority` hints, and the Sharp optimization script is configured for a different project.

## Goals

1. **ComicImage component** — reusable wrapper around `<Picture>` with consistent styling, eager/lazy loading, and `fetchpriority` hints
2. **Fade-in animation** — smooth blur-to-sharp transition for uncached images; cached images appear instantly
3. **Optimize-images script** — adapted for comic assets (cover: 1280w, pages: 800w)
4. **Path aliases** — `@scripts` for clean imports

## Architecture

### Animation flow

1. `img[data-fade-in]` starts with inline `style="opacity: 0"`
2. `initFadeInImages()` runs on page load:
   - **Cached image** → set `opacity: 1` immediately (no animation)
   - **Uncached image** → on `load` event, add `.animate-fade-in` class + set `opacity: 1`
3. CSS `@keyframes fade-in` handles the blur-to-sharp transition (400ms)

### ComicImage component

| Prop | Type | Description |
|------|------|-------------|
| `src` | `ImageMetadata` | Image from content collection |
| `alt` | `string` | Alt text |
| `index` | `number` | 0 = eager + fetchpriority high |
| `class` | `string?` | Extra classes |

Outputs `<Picture>` with `formats={['avif', 'webp']}`, `data-fade-in`, `style="opacity: 0"`, border styling.

### Image optimization targets

| Type | Width | Quality | Example |
|------|-------|---------|---------|
| Cover | 1280px | 90 | OG/social sharing |
| Page | 1280px | 85 | 2-column grid layout (624px CSS × 2x retina) |

## Files

| Action | File |
|--------|------|
| Create | `src/components/ComicImage.astro` |
| Create | `src/scripts/animations.ts` |
| Modify | `src/styles/global.css` — add keyframes + animation class |
| Modify | `src/layouts/Layout.astro` — import and call `initFadeInImages()` |
| Modify | `src/pages/index.astro` — use `ComicImage` |
| Modify | `src/pages/[slug].astro` — use `ComicImage` |
| Modify | `scripts/optimize-images.js` — comic config |
| Modify | `tsconfig.json` — `@scripts` alias |
| Modify | `astro.config.mjs` — `@scripts` Vite alias |

## Acceptance Criteria

- [ ] Images fade in smoothly on first load (blur-to-sharp, 400ms)
- [ ] Cached images appear instantly without animation
- [ ] First image: `loading="eager"`, `fetchpriority="high"`
- [ ] Other images: `loading="lazy"`
- [ ] `pnpm build` succeeds, AVIF/WebP generated
- [ ] `pnpm optimize-images:dry` shows comic paths and target dimensions
- [ ] Works without JavaScript (images just visible, no animation)
