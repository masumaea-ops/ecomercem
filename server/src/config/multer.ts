
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ALLOWED_EXTENSIONS, DANGEROUS_EXTENSIONS, sanitizeFilename } from '../utils/fileSecurity';

// Ensure media directory exists
const mediaDir = path.join(process.cwd(), 'media');
if (!fs.existsSync(mediaDir)) {
  fs.mkdirSync(mediaDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, mediaDir);
  },
  filename: (req, file, cb) => {
    const { safeName } = sanitizeFilename(file.originalname);
    cb(null, safeName);
  },
});

const fileFilter = (req: any, file: any, cb: any) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // Reject dangerous extensions immediately
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return cb(new Error(`Security Alert: File extension '${ext}' is strictly forbidden.`), false);
  }

  // Only allow explicitly whitelisted extensions
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new Error(`Only images (.jpg, .jpeg, .png, .webp), PDF, and MP4 files are permitted.`), false);
  }

  // Double check mimetype prefix
  const allowedMime = (
    file.mimetype.startsWith('image/') ||
    file.mimetype === 'application/pdf' ||
    file.mimetype === 'video/mp4'
  );

  if (allowedMime) {
    cb(null, true);
  } else {
    cb(new Error('Invalid MIME type provided for file upload.'), false);
  }
};

export const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { 
    fileSize: 50 * 1024 * 1024, // 50MB absolute cap
    files: 5 // Maximum 5 files per batch
  }
});

