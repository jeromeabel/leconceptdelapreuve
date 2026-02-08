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
 *   pnpm optimize-images [--dry-run]
 */

import { mkdir, copyFile, stat, unlink } from "fs/promises";
import { join, basename, dirname } from "path";
import sharp from "sharp";

const isDryRun = process.argv.includes("--dry-run");
const BASE_PATH = "src/assets/comics";

// Image resize configurations for comic assets
const RESIZE_CONFIG = {
  // Cover images (OG/social sharing)
  "001/jeromeabel-cc0-leconceptdelapreuve-001-cover.png": { width: 1280, quality: 90, category: "cover" },

  // Comic pages (2-column grid → 624px CSS, need 1280w for 2x retina)
  "001/jeromeabel-cc0-leconceptdelapreuve-001-p1.png": { width: 1280, quality: 85, category: "page" },
  "001/jeromeabel-cc0-leconceptdelapreuve-001-p2.png": { width: 1280, quality: 85, category: "page" },
};

const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  warning: (msg) => console.log(`⚠️  ${msg}`),
  error: (msg) => console.error(`❌ ${msg}`),
  dry: (msg) => console.log(`🔍 [DRY RUN] ${msg}`),
};

/**
 * Check if original already exists
 */
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

/**
 * Backup original image to 'original/' subdirectory
 */
async function backupOriginal(imagePath) {
  const dir = dirname(imagePath);
  const file = basename(imagePath);
  const originalDir = join(dir, "original");
  const originalPath = join(originalDir, file);

  // Check if original already exists
  if (await hasOriginal(imagePath)) {
    log.warning(`Original already exists: ${originalPath}`);
    return originalPath;
  }

  if (isDryRun) {
    log.dry(`Would create directory: ${originalDir}`);
    log.dry(`Would copy ${imagePath} → ${originalPath}`);
    return originalPath;
  }

  // Create original directory if it doesn't exist
  await mkdir(originalDir, { recursive: true });

  // Copy original file
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

    // Only replace if we actually saved space
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
    // Clean up temp file on failure
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

/**
 * Process all configured images
 */
async function processImages() {
  log.info(`Starting image optimization ${isDryRun ? "(DRY RUN)" : ""}...\n`);

  const results = {
    processed: 0,
    skipped: 0,
    failed: 0,
  };

  for (const [relativePath, config] of Object.entries(RESIZE_CONFIG)) {
    const imagePath = join(BASE_PATH, relativePath);

    try {
      // Check if file exists
      await stat(imagePath);

      log.info(`Processing [${config.category}]: ${relativePath}`);

      // Backup original
      await backupOriginal(imagePath);

      // Optimize image (resize + compress)
      await optimizeImage(imagePath, config);

      results.processed++;
      console.log(""); // Empty line for readability
    } catch (error) {
      if (error.code === "ENOENT") {
        log.warning(`File not found: ${imagePath}`);
        results.skipped++;
      } else {
        log.error(`Error processing ${relativePath}: ${error.message}`);
        results.failed++;
      }
      console.log(""); // Empty line for readability
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

// Run the script
processImages().catch((error) => {
  log.error(`Script failed: ${error.message}`);
  process.exit(1);
});
