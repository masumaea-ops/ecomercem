/**
 * Client-side DOM XSS sanitizer to ensure no executable scripts or malicious event handlers
 * are rendered via dangerouslySetInnerHTML.
 */

const DANGEROUS_TAGS_REGEX = /<\/?(script|iframe|object|embed|applet|meta|link|base|form|input|button|textarea|select|style)\b[^>]*>/gi;
const INLINE_EVENT_REGEX = /\s*on[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const JAVASCRIPT_URI_REGEX = /javascript\s*:\s*[^"'>\s]+/gi;
const VBSCRIPT_URI_REGEX = /vbscript\s*:\s*[^"'>\s]+/gi;


export function sanitizeClientHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';

  return html
    // Strip entire script & style block contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Strip isolated dangerous tags
    .replace(DANGEROUS_TAGS_REGEX, '')
    // Strip inline event listeners (onload, onerror, onclick, etc.)
    .replace(INLINE_EVENT_REGEX, '')
    // Strip javascript: / vbscript: pseudo-protocols
    .replace(JAVASCRIPT_URI_REGEX, 'about:blank')
    .replace(VBSCRIPT_URI_REGEX, 'about:blank');
}
