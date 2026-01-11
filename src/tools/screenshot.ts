import { getBrowserPool } from '../lib/browser-pool.js';

const LIMITS = {
  MAX_DIMENSION: 7680,
  MAX_MEGAPIXELS: 50,
  MAX_HEIGHT_CLIP: 4096,
  JPEG_THRESHOLD_MEGAPIXELS: 25,
  JPEG_QUALITY: 75,
};

interface DimensionValidation {
  shouldCapture: 'fullPage' | 'clip' | 'viewport';
  useJpeg: boolean;
  jpegQuality: number;
  clipHeight?: number;
  warning?: string;
}

interface ScreenshotParams {
  url: string;
  fullPage?: boolean;
  width?: number;
  height?: number;
  timeout?: number;
}

interface ScreenshotResult {
  url: string;
  base64: string;
  width: number;
  height: number;
  format: 'png' | 'jpeg';
  timestamp: string;
  warning?: string;
}

function validateImageDimensions(
  pageWidth: number,
  pageHeight: number,
  fullPage: boolean
): DimensionValidation {
  if (!fullPage) {
    return {
      shouldCapture: 'viewport',
      useJpeg: false,
      jpegQuality: LIMITS.JPEG_QUALITY,
    };
  }

  const megapixels = (pageWidth * pageHeight) / 1_000_000;
  const exceedsMaxDimension =
    pageWidth > LIMITS.MAX_DIMENSION || pageHeight > LIMITS.MAX_DIMENSION;
  const exceedsMaxMegapixels = megapixels > LIMITS.MAX_MEGAPIXELS;

  if (exceedsMaxDimension || exceedsMaxMegapixels) {
    if (pageHeight > LIMITS.MAX_HEIGHT_CLIP) {
      const clipHeight = LIMITS.MAX_HEIGHT_CLIP;
      const clippedMegapixels = (pageWidth * clipHeight) / 1_000_000;
      return {
        shouldCapture: 'clip',
        useJpeg: clippedMegapixels > LIMITS.JPEG_THRESHOLD_MEGAPIXELS,
        jpegQuality: LIMITS.JPEG_QUALITY,
        clipHeight,
        warning: `Page height (${pageHeight}px) exceeds ${LIMITS.MAX_HEIGHT_CLIP}px limit. Captured first ${clipHeight}px as JPEG.`,
      };
    }

    return {
      shouldCapture: 'viewport',
      useJpeg: true,
      jpegQuality: LIMITS.JPEG_QUALITY,
      warning: `Page dimensions (${pageWidth}x${pageHeight}) exceed limits. Captured viewport only as JPEG to reduce file size.`,
    };
  }

  const shouldUseJpeg = megapixels > LIMITS.JPEG_THRESHOLD_MEGAPIXELS;
  return {
    shouldCapture: 'fullPage',
    useJpeg: shouldUseJpeg,
    jpegQuality: LIMITS.JPEG_QUALITY,
    warning: shouldUseJpeg
      ? `Large image (${megapixels.toFixed(1)} megapixels) captured as JPEG for efficiency.`
      : undefined,
  };
}

export async function screenshot(
  params: ScreenshotParams
): Promise<ScreenshotResult> {
  const {
    url,
    fullPage = false,
    width = 1920,
    height = 1080,
    timeout = 15000,
  } = params;

  const { page, release } = await getBrowserPool().acquire();

  try {
    await page.setViewportSize({ width, height });
    await page.goto(url, { waitUntil: "networkidle", timeout });
    await page.waitForTimeout(1000);

    const pageDimensions = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }));

    const validation = validateImageDimensions(
      pageDimensions.width,
      pageDimensions.height,
      fullPage
    );

    let screenshotBuffer: Buffer;
    let finalWidth: number;
    let finalHeight: number;

    if (validation.shouldCapture === 'fullPage') {
      screenshotBuffer = await page.screenshot({
        fullPage: true,
        type: validation.useJpeg ? 'jpeg' : 'png',
        quality: validation.useJpeg ? validation.jpegQuality : undefined,
      } as Parameters<typeof page.screenshot>[0]);
      finalWidth = pageDimensions.width;
      finalHeight = pageDimensions.height;
    } else if (validation.shouldCapture === 'clip' && validation.clipHeight) {
      screenshotBuffer = await page.screenshot({
        clip: {
          x: 0,
          y: 0,
          width: pageDimensions.width,
          height: validation.clipHeight,
        },
        type: 'jpeg',
        quality: validation.jpegQuality,
      } as Parameters<typeof page.screenshot>[0]);
      finalWidth = pageDimensions.width;
      finalHeight = validation.clipHeight;
    } else {
      screenshotBuffer = await page.screenshot({
        fullPage: false,
        type: 'png',
      });
      finalWidth = width;
      finalHeight = height;
    }

    const result: ScreenshotResult = {
      url,
      base64: screenshotBuffer.toString("base64"),
      width: finalWidth,
      height: finalHeight,
      format: validation.useJpeg ? 'jpeg' : 'png',
      timestamp: new Date().toISOString(),
    };

    if (validation.warning) {
      result.warning = validation.warning;
    }

    return result;
  } finally {
    release();
  }
}
