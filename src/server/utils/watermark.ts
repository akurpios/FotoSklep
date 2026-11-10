import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { db, UPLOADS_DIR } from '../db';

/**
 * Checks if a watermark is configured in the studio settings.
 * Returns the absolute path to the watermark PNG file if present.
 */
export function getConfiguredWatermarkPath(): string | null {
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'watermark_url'").get() as { value: string } | undefined;
    if (!row || !row.value) return null;

    const storedFilename = path.basename(row.value);
    const absPath = path.join(UPLOADS_DIR, storedFilename);

    if (fs.existsSync(absPath)) {
      return absPath;
    }
  } catch (err) {
    console.warn('[Watermark] Failed to get watermark path:', err);
  }
  return null;
}

/**
 * Applies a watermark PNG onto an image file using sharp.
 * Places the watermark resized proportionally in the center of the image.
 */
export async function generateWatermarkedImage(
  sourcePath: string,
  outputPath: string,
  watermarkPath: string
): Promise<void> {
  try {
    const sourceMetadata = await sharp(sourcePath).metadata();
    const sourceWidth = sourceMetadata.width || 1600;
    const sourceHeight = sourceMetadata.height || 1200;

    // Scale watermark to approximately 40% of the image width
    const targetWatermarkWidth = Math.round(sourceWidth * 0.40);

    // Resize the watermark buffer to fit proportionally
    const resizedWatermarkBuffer = await sharp(watermarkPath)
      .resize({
        width: targetWatermarkWidth,
        fit: 'inside',
        withoutEnlargement: false,
      })
      .toBuffer();

    // Composite centered with original
    await sharp(sourcePath)
      .composite([
        {
          input: resizedWatermarkBuffer,
          gravity: 'center',
          blend: 'over',
        },
      ])
      .toFile(outputPath);
  } catch (error) {
    console.error('[Watermark] Sharp processing error, copying source as fallback:', error);
    // Graceful fallback: copy source if composite fails
    fs.copyFileSync(sourcePath, outputPath);
  }
}

