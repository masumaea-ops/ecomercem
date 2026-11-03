import fs from 'fs';
import path from 'path';

export const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.mp4']);

export const DANGEROUS_EXTENSIONS = new Set([
  '.svg', '.html', '.htm', '.shtml', '.php', '.phtml', '.php3', '.php4', '.php5',
  '.sh', '.bash', '.exe', '.bat', '.cmd', '.com', '.msi', '.vbs', '.ps1',
  '.js', '.mjs', '.cjs', '.ts', '.py', '.pl', '.cgi', '.jar', '.war', '.ear',
  '.jsp', '.asp', '.aspx', '.cer', '.csr', '.htaccess', '.htpasswd'
]);

export interface ValidationResult {
  isValid: boolean;
  detectedType?: string;
  error?: string;
}

/**
 * Inspects binary magic numbers (file header bytes) to verify authenticity
 */
export function verifyFileSignature(buffer: Buffer): ValidationResult {
  if (!buffer || buffer.length < 4) {
    return { isValid: false, error: 'File buffer too small or empty' };
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { isValid: true, detectedType: 'image/jpeg' };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    return { isValid: true, detectedType: 'image/png' };
  }

  // 3. WEBP: "RIFF" .... "WEBP"
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && // RIFF
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50  // WEBP
  ) {
    return { isValid: true, detectedType: 'image/webp' };
  }

  // 4. PDF: %PDF (25 50 44 46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return { isValid: true, detectedType: 'application/pdf' };
  }

  // 5. MP4: ....ftyp (66 74 79 70 at offset 4)
  if (
    buffer.length >= 12 &&
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70
  ) {
    return { isValid: true, detectedType: 'video/mp4' };
  }

  return { isValid: false, error: 'Unrecognized or unauthorized file signature (magic bytes mismatch)' };
}

/**
 * Validates a file on disk: checks extension and inspects magic bytes.
 * If invalid, unlinks the file immediately.
 */
export async function validateAndCleanUploadedFile(filePath: string): Promise<ValidationResult> {
  const ext = path.extname(filePath).toLowerCase();

  // 1. Strict extension check
  if (DANGEROUS_EXTENSIONS.has(ext) || !ALLOWED_EXTENSIONS.has(ext)) {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {}
    return {
      isValid: false,
      error: `File extension '${ext}' is not permitted for security reasons.`
    };
  }

  // 2. Read first 64 bytes for signature check
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(64);
    const bytesRead = fs.readSync(fd, buffer, 0, 64, 0);
    fs.closeSync(fd);

    if (bytesRead < 4) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return { isValid: false, error: 'File is empty or truncated' };
    }

    const sigResult = verifyFileSignature(buffer.subarray(0, bytesRead));
    if (!sigResult.isValid) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return {
        isValid: false,
        error: `Security verification failed: File content does not match allowed types. ${sigResult.error}`
      };
    }

    return sigResult;
  } catch (err: any) {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {}
    return { isValid: false, error: `Failed to inspect file signature: ${err.message}` };
  }
}

/**
 * Sanitizes filename: removes directory traversal, special characters, and ensures safe extension
 */
export function sanitizeFilename(originalName: string): { safeName: string; ext: string } {
  const rawExt = path.extname(originalName).toLowerCase();
  const ext = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : '.bin';
  
  // Create secure random name
  const randomPart = `${Date.now()}-${Math.random().toString(36).substring(2, 12)}`;
  const base = path.basename(originalName, rawExt)
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .substring(0, 30);

  const safeName = `${base ? base + '-' : ''}${randomPart}${ext}`;
  return { safeName, ext };
}
