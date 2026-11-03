/**
 * Input sanitization utility for XSS and content injection protection
 */

const DANGEROUS_TAGS_REGEX = /<\/?(script|iframe|object|embed|applet|meta|link|base|form|input|button|textarea|select|style)\b[^>]*>/gi;
const INLINE_EVENT_REGEX = /\s*on[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const JAVASCRIPT_URI_REGEX = /javascript\s*:\s*[^"'>\s]+/gi;
const VBSCRIPT_URI_REGEX = /vbscript\s*:\s*[^"'>\s]+/gi;


/**
 * Sanitizes an HTML string by removing executable tags, JavaScript URIs, and event handlers.
 * Leaves safe semantic tags (p, b, i, strong, em, h1-h6, ul, ol, li, a, img, table, etc.).
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return input;

  let clean = input
    // Remove dangerous script, iframe, object, embed tags completely
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove isolated dangerous tags
    .replace(DANGEROUS_TAGS_REGEX, '')
    // Remove inline JS event handlers (onload, onerror, onclick, etc.)
    .replace(INLINE_EVENT_REGEX, '')
    // Remove javascript: and vbscript: URIs
    .replace(JAVASCRIPT_URI_REGEX, 'about:blank')
    .replace(VBSCRIPT_URI_REGEX, 'about:blank');

  return clean;
}

/**
 * Recursively sanitizes strings in an object or array to neutralize XSS vectors
 */
export function sanitizeObject<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    if (typeof obj === 'string') {
      return sanitizeHtml(obj) as any;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as any;
  }

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = sanitizeObject(value);
  }
  return result;
}

/**
 * Express middleware to sanitize incoming req.body, req.query, and req.params
 */
export function sanitizeInputs(req: any, res: any, next: any) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  next();
}
