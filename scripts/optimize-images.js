#!/usr/bin/env node

/**
 * Image Optimization Script
 *
 * Resizes and re-compresses comic images for smaller file sizes.
 * - Strips alpha channel (comic art has no transparency)
 * - Uses maximum PNG compression (no palette — preserves gradients)
 * - Always re-compresses, even when dimensions are already at target
 * - Preserves original images in 'original/' subdirectories
 *
 * Usage:
 *   pnpm optimize-images <comic-id> [--dry-run]
 *   pnpm optimize-images 001
 *   pnpm optimize-images 001 --dry-run
 */

import { readFile, mkdir, copyFile, stat, unlink } from "fs/promises";
import { join, basename, dirname } from "path";
import sharp from "sharp";

const COMICS_CONTENT = "src/content/comics";

// Optimization presets per image type
const PRESETS = {
  cover: { width: 1280, quality: 90 },
  page: { width: 1280, quality: 85 },
};

const isDryRun = process.argv.includes("--dry-run");
const comicId = process.argv.slice(2).find((arg) => !arg.startsWith("--"));

if (!comicId) {
  console.error("Usage: pnpm optimize-images <comic-id> [--dry-run]");
  console.error("Example: pnpm optimize-images 001");
  process.exit(1);
}

const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  warning: (msg) => console.log(`⚠️  ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  dry: (msg) => console.log(`🔍 [DRY RUN] ${msg}`),
};

// ─── Frontmatter parsing ─────────────────────────

async function readFrontmatter(id) {
  const mdPath = join(COMICS_CONTENT, `${id}.md`);
  let content;
  try {
    content = await readFile(mdPath, "utf-8");
  } catch {
    console.error(`❌ Comic not found: ${mdPath}`);
    process.exit(1);
  }

  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) {
    console.error(`❌ No frontmatter found in ${mdPath}`);
    process.exit(1);
  }

  const fm = fmMatch[1];
  const cover = fm.match(/^cover:\s+(.+)/m)?.[1];
  const pages = [...fm.matchAll(/^\s+-\s+(.+)/gm)].map((m) => m[1]);

  if (!cover || pages.length === 0) {
    console.error(`❌ Missing cover or pages in frontmatter`);
    process.exit(1);
  }

  // Resolve paths relative to the markdown file
  const mdDir = dirname(mdPath);
  return {
    cover: join(mdDir, cover),
    pages: pages.map((p) => join(mdDir, p)),
  };
}

// ─── Image helpers ───────────────────────────────

async function hasOriginal(imagePath) {
  const dir = dirname(imagePath);
  const file = basename(imagePath);
  const originalPath = join(dir, "original", file);

  try {
    await stat(originalPath);
    return true;
  } catch {
    return false;
  }
}

async function backupOriginal(imagePath) {
  const dir = dirname(imagePath);
  const file = basename(imagePath);
  const originalDir = join(dir, "original");
  const originalPath = join(originalDir, file);

  if (await hasOriginal(imagePath)) {
    log.warning(`Original already exists: ${originalPath}`);
    return originalPath;
  }

  if (isDryRun) {
    log.dry(`Would create directory: ${originalDir}`);
    log.dry(`Would copy ${imagePath} → ${originalPath}`);
    return originalPath;
  }

  await mkdir(originalDir, { recursive: true });
  await copyFile(imagePath, originalPath);
  log.success(`Backed up: ${originalPath}`);

  return originalPath;
}

/**
 * Optimize image: resize if needed, then re-compress for smaller file size.
 * Always re-encodes even when dimensions are already at target.
 */
async function optimizeImage(imagePath, config) {
  const { width, height, quality, fit = "inside" } = config;
  const tmpPath = imagePath + ".tmp";

  if (isDryRun) {
    const dims = width && height ? `${width}×${height}` : width ? `${width}w` : `${height}h`;
    log.dry(`Would optimize ${imagePath} → ${dims} (quality: ${quality}%)`);
    return;
  }

  try {
    const metadata = await sharp(imagePath).metadata();
    const originalSize = `${metadata.width}×${metadata.height}`;
    const originalBytes = (await stat(imagePath)).size;

    const needsResize =
      (width && metadata.width > width) || (height && metadata.height > height);

    let pipeline = sharp(imagePath)
      .removeAlpha()       // Strip unused alpha channel (comic art has no transparency)
      .flatten({ background: "#ffffff" }); // Composite alpha onto white

    if (needsResize) {
      const resizeOptions = { fit, withoutEnlargement: true };
      if (width) resizeOptions.width = width;
      if (height) resizeOptions.height = height;
      pipeline = pipeline.resize(resizeOptions);
    }

    // Re-encode PNG with maximum lossless compression (no palette — preserves gradients)
    pipeline = pipeline.png({
      compressionLevel: 9,
      effort: 10,
    });

    await pipeline.toFile(tmpPath);

    const newBytes = (await stat(tmpPath)).size;
    const saved = originalBytes - newBytes;
    const pct = ((saved / originalBytes) * 100).toFixed(1);

    if (saved > 0) {
      await copyFile(tmpPath, imagePath);
      const newMeta = await sharp(imagePath).metadata();
      const newSize = `${newMeta.width}×${newMeta.height}`;
      log.success(
        `Optimized: ${imagePath} (${originalSize} → ${newSize}, ${formatBytes(originalBytes)} → ${formatBytes(newBytes)}, -${pct}%)`
      );
    } else {
      log.info(`Already optimal: ${imagePath} (${originalSize}, ${formatBytes(originalBytes)})`);
    }

    await unlink(tmpPath);
  } catch (error) {
    try { await unlink(tmpPath); } catch {}
    log.error(`Failed to optimize ${imagePath}: ${error.message}`);
    throw error;
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

// ─── Main ────────────────────────────────────────

async function main() {
  log.info(`Optimizing images for comic ${comicId} ${isDryRun ? "(DRY RUN)" : ""}...\n`);

  const { cover, pages } = await readFrontmatter(comicId);

  // Build image list: cover + pages, each with its preset
  const images = [
    { path: cover, category: "cover", ...PRESETS.cover },
    ...pages.map((p) => ({ path: p, category: "page", ...PRESETS.page })),
  ];

  console.log(`  Cover: ${basename(cover)}`);
  console.log(`  Pages: ${pages.length} (${pages.map((p) => basename(p)).join(", ")})\n`);

  const results = { processed: 0, skipped: 0, failed: 0 };

  for (const { path: imagePath, category, ...config } of images) {
    try {
      await stat(imagePath);

      log.info(`Processing [${category}]: ${basename(imagePath)}`);
      await backupOriginal(imagePath);
      await optimizeImage(imagePath, config);

      results.processed++;
      console.log("");
    } catch (error) {
      if (error.code === "ENOENT") {
        log.warning(`File not found: ${imagePath}`);
        results.skipped++;
      } else {
        log.error(`Error processing ${basename(imagePath)}: ${error.message}`);
        results.failed++;
      }
      console.log("");
    }
  }

  // Summary
  console.log("═".repeat(60));
  log.info("Summary:");
  log.success(`Processed: ${results.processed}`);
  if (results.skipped > 0) log.warning(`Skipped: ${results.skipped}`);
  if (results.failed > 0) log.error(`Failed: ${results.failed}`);
  console.log("═".repeat(60));

  if (isDryRun) {
    log.info("\nThis was a dry run. Run without --dry-run to apply changes.");
  } else {
    log.info('\nDone! Run "pnpm build" to regenerate AVIF/WebP versions.');
  }
}

main().catch((err) => {
  log.error(`Script failed: ${err.message}`);
  process.exit(1);
});
