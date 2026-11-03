import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { logger } from './logger';

export interface WatermarkOptions {
  brandName?: string;
  website?: string;
  tagline?: string;
  opacity?: number;
}

/**
 * Generates an SVG watermark overlay dynamically scaled to the image dimensions.
 * Combines:
 * 1. A semi-transparent diagonal repeating pattern across the entire canvas (Jiji-style anti-crop).
 * 2. A crisp official Masuma branded authentication badge in the bottom-right corner.
 */
function generateWatermarkSvg(
  width: number,
  height: number,
  options: WatermarkOptions = {}
): Buffer {
  const brandName = options.brandName || 'MASUMA';
  const website = options.website || 'masuma.africa';
  const tagline = options.tagline || 'GENUINE JAPANESE PARTS';

  // Responsive scaling based on image dimensions
  const baseDim = Math.min(width, height);
  const patternWidth = Math.max(200, Math.min(360, Math.round(width * 0.35)));
  const patternHeight = Math.round(patternWidth * 0.55);

  const mainFontSize = Math.max(16, Math.min(30, Math.round(patternWidth * 0.085)));
  const subFontSize = Math.max(10, Math.min(16, Math.round(patternWidth * 0.048)));

  // Bottom corner badge dimensions
  const badgeWidth = Math.max(180, Math.min(300, Math.round(width * 0.32)));
  const badgeHeight = Math.round(badgeWidth * 0.22);
  const badgeX = Math.max(10, width - badgeWidth - Math.round(width * 0.02));
  const badgeY = Math.max(10, height - badgeHeight - Math.round(height * 0.02));
  
  const iconSize = Math.round(badgeHeight * 0.6);
  const iconX = badgeX + Math.round(badgeHeight * 0.2);
  const iconY = badgeY + Math.round(badgeHeight * 0.2);

  const badgeTextX = iconX + iconSize + 10;
  const badgeTitleY = badgeY + Math.round(badgeHeight * 0.48);
  const badgeSubY = badgeY + Math.round(badgeHeight * 0.82);

  const badgeTitleSize = Math.max(11, Math.min(18, Math.round(badgeHeight * 0.36)));
  const badgeSubSize = Math.max(8, Math.min(12, Math.round(badgeHeight * 0.23)));

  const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Jiji-style repeating diagonal pattern -->
    <pattern id="jijiWatermarkPattern" width="${patternWidth}" height="${patternHeight}" patternTransform="rotate(-28 0 0)" patternUnits="userSpaceOnUse">
      <text 
        x="${Math.round(patternWidth * 0.08)}" 
        y="${Math.round(patternHeight * 0.45)}" 
        font-family="Arial, Helvetica, sans-serif" 
        font-size="${mainFontSize}" 
        font-weight="900" 
        fill="#FFFFFF" 
        fill-opacity="0.22" 
        stroke="#000000" 
        stroke-width="0.7" 
        stroke-opacity="0.25" 
        letter-spacing="2"
      >${brandName}</text>
      
      <text 
        x="${Math.round(patternWidth * 0.12)}" 
        y="${Math.round(patternHeight * 0.78)}" 
        font-family="Arial, Helvetica, sans-serif" 
        font-size="${subFontSize}" 
        font-weight="700" 
        fill="#FFFFFF" 
        fill-opacity="0.18" 
        stroke="#000000" 
        stroke-width="0.5" 
        stroke-opacity="0.22" 
        letter-spacing="0.5"
      >${website}</text>
    </pattern>

    <!-- Drop shadow for authentication badge -->
    <filter id="badgeShadow" x="-10%" y="-10%" width="125%" height="125%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
  </defs>

  <!-- 1. Full canvas diagonal watermark grid -->
  <rect width="100%" height="100%" fill="url(#jijiWatermarkPattern)" pointer-events="none" />

  <!-- 2. Permanent Branded Authentication Badge in Bottom Corner -->
  <g filter="url(#badgeShadow)">
    <!-- Badge container -->
    <rect 
      x="${badgeX}" 
      y="${badgeY}" 
      width="${badgeWidth}" 
      height="${badgeHeight}" 
      rx="8" 
      fill="#141414" 
      fill-opacity="0.85" 
      stroke="#ED1C24" 
      stroke-width="1.5" 
    />

    <!-- Brand Red Icon Square -->
    <rect 
      x="${iconX}" 
      y="${iconY}" 
      width="${iconSize}" 
      height="${iconSize}" 
      rx="4" 
      fill="#ED1C24" 
    />
    <text 
      x="${iconX + iconSize / 2}" 
      y="${iconY + iconSize * 0.78}" 
      font-family="Arial, Helvetica, sans-serif" 
      font-size="${Math.round(iconSize * 0.75)}" 
      font-weight="900" 
      fill="#FFFFFF" 
      text-anchor="middle"
    >M</text>

    <!-- Brand Name -->
    <text 
      x="${badgeTextX}" 
      y="${badgeTitleY}" 
      font-family="Arial, Helvetica, sans-serif" 
      font-size="${badgeTitleSize}" 
      font-weight="900" 
      fill="#FFFFFF" 
      letter-spacing="1.2"
    >${brandName}</text>

    <!-- Website & Tagline Subtitle -->
    <text 
      x="${badgeTextX}" 
      y="${badgeSubY}" 
      font-family="Arial, Helvetica, sans-serif" 
      font-size="${badgeSubSize}" 
      font-weight="700" 
      fill="#E5E7EB" 
      letter-spacing="0.5"
    >${website} • ${tagline}</text>
  </g>
</svg>
`;

  return Buffer.from(svg.trim());
}

/**
 * Applies a permanent Jiji-style watermark onto an image file on disk.
 * Supports JPEG, PNG, and WebP.
 * 
 * The watermark is baked directly into the image bitmap so any user downloading,
 * saving, sharing, or scraping the picture retains the watermark permanently.
 */
export async function applyJijiStyleWatermark(
  filePath: string,
  options: WatermarkOptions = {}
): Promise<boolean> {
  if (!fs.existsSync(filePath)) {
    logger.warn(`Watermark failed: file not found at ${filePath}`);
    return false;
  }

  const ext = path.extname(filePath).toLowerCase();
  const supported = new Set(['.jpg', '.jpeg', '.png', '.webp']);

  if (!supported.has(ext)) {
    // Non-image files (e.g. PDF or MP4) are left untouched
    return false;
  }

  const tempPath = `${filePath}.wm-tmp${ext}`;

  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();

    const width = metadata.width;
    const height = metadata.height;

    if (!width || !height || width < 80 || height < 80) {
      // Image too small to watermark safely
      return false;
    }

    const watermarkSvg = generateWatermarkSvg(width, height, options);

    // Apply composite and output based on file format
    let pipeline = sharp(filePath)
      .rotate() // Auto-orient based on EXIF
      .composite([
        {
          input: watermarkSvg,
          top: 0,
          left: 0,
          blend: 'over'
        }
      ]);

    if (ext === '.jpg' || ext === '.jpeg') {
      pipeline = pipeline.jpeg({ quality: 90, mozjpeg: true });
    } else if (ext === '.png') {
      pipeline = pipeline.png({ compressionLevel: 8 });
    } else if (ext === '.webp') {
      pipeline = pipeline.webp({ quality: 90 });
    }

    await pipeline.toFile(tempPath);

    // Atomically replace the original file with the watermarked file
    fs.renameSync(tempPath, filePath);
    logger.info(`Permanent watermark applied successfully to: ${path.basename(filePath)}`);
    return true;
  } catch (error: any) {
    logger.error(`Error applying watermark to ${filePath}: ${error.message}`);
    // Clean up temp file if left over
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {}
    }
    return false;
  }
}
