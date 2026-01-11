/**
 * Resource Guard - Centralized resource validation and security
 * Prevents API crashes, resource exhaustion, and security vulnerabilities
 */

// ============ CONSTANTS ============

export const LIMITS = {
  // Image limits
  IMAGE_MAX_DIMENSION: 4096,
  IMAGE_MAX_PIXELS: 8_000_000, // 8 megapixels
  IMAGE_MAX_SIZE_BYTES: 5 * 1024 * 1024, // 5MB

  // Content limits
  CONTENT_MAX_PER_PAGE: 50_000, // 50K chars per page
  CONTENT_MAX_TOTAL: 200_000, // 200K chars total response
  HTML_MAX_SIZE: 5_000_000, // 5MB HTML

  // Cache limits
  CACHE_MAX_ENTRIES: 500,
  CACHE_MAX_SIZE_BYTES: 50 * 1024 * 1024, // 50MB

  // Browser limits
  MAX_BROWSERS: 2,
  MAX_REDIRECTS: 5,
  PAGE_TIMEOUT: 30_000,

  // Network limits
  MAX_CONCURRENT_SCRAPES: 5,
} as const;

// ============ URL VALIDATION (SSRF Protection) ============

const BLOCKED_SCHEMES = ['file:', 'javascript:', 'data:', 'vbscript:', 'about:'];
const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal',
  '169.254.169.254', // AWS metadata
  'metadata.azure.com',
];

export interface UrlValidationResult {
  valid: boolean;
  url?: string;
  error?: string;
}

export function validateUrl(urlString: string): UrlValidationResult {
  try {
    const url = new URL(urlString);

    // Block dangerous schemes
    if (BLOCKED_SCHEMES.some(scheme => url.protocol.toLowerCase() === scheme)) {
      return { valid: false, error: `Blocked scheme: ${url.protocol}` };
    }

    // Only allow http/https
    if (!['http:', 'https:'].includes(url.protocol.toLowerCase())) {
      return { valid: false, error: `Invalid scheme: ${url.protocol}. Only http/https allowed.` };
    }

    // Block internal hosts
    const hostname = url.hostname.toLowerCase();
    if (BLOCKED_HOSTS.includes(hostname)) {
      return { valid: false, error: `Blocked host: ${hostname}` };
    }

    // Block private IP ranges
    if (isPrivateIP(hostname)) {
      return { valid: false, error: `Private IP not allowed: ${hostname}` };
    }

    return { valid: true, url: url.toString() };
  } catch {
    return { valid: false, error: `Invalid URL: ${urlString}` };
  }
}

function isPrivateIP(hostname: string): boolean {
  // Check for private IP ranges
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Regex);

  if (!match) return false;

  const [, a, b] = match.map(Number);

  // 10.x.x.x
  if (a === 10) return true;
  // 172.16.x.x - 172.31.x.x
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.x.x
  if (a === 192 && b === 168) return true;

  return false;
}

// ============ IMAGE VALIDATION ============

export interface ImageValidationResult {
  valid: boolean;
  shouldCapture: 'fullPage' | 'viewport' | 'clip';
  clipHeight?: number;
  useJpeg: boolean;
  jpegQuality: number;
  warning?: string;
}

export function validateImageDimensions(
  width: number,
  height: number,
  requestedFullPage: boolean
): ImageValidationResult {
  const totalPixels = width * height;

  // Case 1: Within all limits
  if (width <= LIMITS.IMAGE_MAX_DIMENSION &&
      height <= LIMITS.IMAGE_MAX_DIMENSION &&
      totalPixels <= LIMITS.IMAGE_MAX_PIXELS) {
    return {
      valid: true,
      shouldCapture: requestedFullPage ? 'fullPage' : 'viewport',
      useJpeg: totalPixels > 4_000_000, // Use JPEG for larger images
      jpegQuality: 80,
    };
  }

  // Case 2: Height exceeds but can clip
  if (width <= LIMITS.IMAGE_MAX_DIMENSION && height > LIMITS.IMAGE_MAX_DIMENSION) {
    const safeHeight = Math.min(
      LIMITS.IMAGE_MAX_DIMENSION,
      Math.floor(LIMITS.IMAGE_MAX_PIXELS / width)
    );
    return {
      valid: true,
      shouldCapture: 'clip',
      clipHeight: safeHeight,
      useJpeg: true,
      jpegQuality: 80,
      warning: `Page height (${height}px) exceeds limit. Clipping to ${safeHeight}px.`,
    };
  }

  // Case 3: Width exceeds - fallback to viewport
  if (width > LIMITS.IMAGE_MAX_DIMENSION) {
    return {
      valid: true,
      shouldCapture: 'viewport',
      useJpeg: false,
      jpegQuality: 80,
      warning: `Page width (${width}px) exceeds limit. Capturing viewport only.`,
    };
  }

  // Case 4: Total pixels exceed - fallback to viewport
  return {
    valid: true,
    shouldCapture: 'viewport',
    useJpeg: true,
    jpegQuality: 80,
    warning: `Total pixels (${totalPixels}) exceeds ${LIMITS.IMAGE_MAX_PIXELS}. Capturing viewport only.`,
  };
}

// ============ CONTENT TRUNCATION ============

export interface TruncationResult {
  content: string;
  truncated: boolean;
  originalLength: number;
  truncatedAt?: number;
}

export function truncateContent(
  content: string,
  maxLength: number = LIMITS.CONTENT_MAX_PER_PAGE
): TruncationResult {
  if (!content || content.length <= maxLength) {
    return {
      content: content || '',
      truncated: false,
      originalLength: content?.length || 0,
    };
  }

  // Find a good break point (end of sentence or paragraph)
  let breakPoint = maxLength;
  const lastParagraph = content.lastIndexOf('\n\n', maxLength);
  const lastSentence = content.lastIndexOf('. ', maxLength);

  if (lastParagraph > maxLength * 0.8) {
    breakPoint = lastParagraph;
  } else if (lastSentence > maxLength * 0.8) {
    breakPoint = lastSentence + 1;
  }

  return {
    content: content.substring(0, breakPoint) + '\n\n[Content truncated...]',
    truncated: true,
    originalLength: content.length,
    truncatedAt: breakPoint,
  };
}

export function truncateHtml(html: string): TruncationResult {
  return truncateContent(html, LIMITS.HTML_MAX_SIZE);
}

// ============ RESPONSE SIZE VALIDATION ============

export interface ResponseSizeResult {
  valid: boolean;
  sizeBytes: number;
  sizeFormatted: string;
  warning?: string;
}

export function validateResponseSize(response: unknown): ResponseSizeResult {
  const json = JSON.stringify(response);
  const sizeBytes = Buffer.byteLength(json, 'utf8');
  const sizeMB = sizeBytes / (1024 * 1024);

  return {
    valid: sizeBytes < LIMITS.CONTENT_MAX_TOTAL * 2, // ~400KB limit for JSON
    sizeBytes,
    sizeFormatted: sizeMB >= 1 ? `${sizeMB.toFixed(2)}MB` : `${(sizeBytes / 1024).toFixed(2)}KB`,
    warning: sizeBytes > LIMITS.CONTENT_MAX_TOTAL
      ? `Response size (${(sizeBytes / 1024).toFixed(0)}KB) is large. Consider using preview mode.`
      : undefined,
  };
}

// ============ REDIRECT TRACKING ============

export class RedirectTracker {
  private redirects: Map<string, number> = new Map();

  track(url: string): boolean {
    const count = (this.redirects.get(url) || 0) + 1;
    this.redirects.set(url, count);
    return count <= LIMITS.MAX_REDIRECTS;
  }

  reset(): void {
    this.redirects.clear();
  }

  getCount(url: string): number {
    return this.redirects.get(url) || 0;
  }
}

// ============ CONTENT HANDLE VALIDATION ============

export function validateContentHandle(handle: string): boolean {
  // Content handles should be URL-safe base64 or hex
  const validPattern = /^[a-zA-Z0-9_-]{16,64}$/;
  return validPattern.test(handle);
}

// ============ EXPORTS ============

export default {
  LIMITS,
  validateUrl,
  validateImageDimensions,
  truncateContent,
  truncateHtml,
  validateResponseSize,
  validateContentHandle,
  RedirectTracker,
};
