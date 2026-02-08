# Scripts

Automation scripts for the sp3ctra-web project.

## optimize-images.js

Automated image optimization script that resizes images according to their usage patterns while preserving originals.

### Usage

```bash
# Preview changes (recommended first)
pnpm optimize-images:dry

# Apply optimizations
pnpm optimize-images

# After optimization, rebuild to generate AVIF/WebP
pnpm build
```

### Features

- ✅ Backs up originals to `original/` subdirectories
- ✅ Resizes images based on layout usage (hero: 1280px, grid: 600px, news: 640px)
- ✅ Optimizes quality (85% JPEG, 9 PNG compression)
- ✅ Skips already-optimized images
- ✅ Never upscales (preserves quality)
- ✅ Detailed progress reporting

### Configuration

Edit `RESIZE_CONFIG` in [optimize-images.js](./optimize-images.js) to add/modify image resize settings.

See [specs/004-image-optimization/image-resize-plan.md](../specs/004-image-optimization/image-resize-plan.md) for the full optimization strategy.
