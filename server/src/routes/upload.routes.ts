import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { upload } from '../config/multer';
import { uploadRateLimiter } from '../middleware/rateLimiter';
import { validateAndCleanUploadedFile } from '../utils/fileSecurity';
import { logger } from '../utils/logger';
import { applyJijiStyleWatermark } from '../utils/watermark';

const router = Router();

// Apply rate limiting to all upload endpoints
router.use(uploadRateLimiter as any);

// POST /api/upload (Single or fallback upload)
router.post('/', authenticate as any, (req: any, res: any) => {
    upload.any()(req, res, async (err: any) => {
        if (err) {
            logger.warn(`Upload rejected by Multer: ${err.message}`);
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        }

        const file = (req.files && req.files.length > 0) ? req.files[0] : req.file;
        if (!file) {
            return res.status(400).json({ error: 'No file uploaded. Please select an image or video.' });
        }

        const validation = await validateAndCleanUploadedFile(file.path);
        if (!validation.isValid) {
            logger.warn(`File rejected by security validator: ${validation.error}`);
            return res.status(400).json({ error: validation.error });
        }

        // Apply permanent Jiji-style watermark to images
        if (validation.detectedType?.startsWith('image/')) {
            await applyJijiStyleWatermark(file.path);
        }

        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.get('host');
        const fileUrl = `${protocol}://${host}/media/${file.filename}`;

        res.json({ 
            url: fileUrl, 
            filename: file.filename, 
            originalName: file.originalname,
            detectedType: validation.detectedType 
        });
    });
});

// POST /api/upload/batch (Batch upload multiple pictures)
router.post('/batch', authenticate as any, (req: any, res: any) => {
    upload.any()(req, res, async (err: any) => {
        if (err) {
            logger.warn(`Batch upload rejected by Multer: ${err.message}`);
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        }

        const files: any[] = req.files || [];
        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded. Please select one or more pictures.' });
        }

        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.get('host');
        const results: string[] = [];

        for (const file of files) {
            const validation = await validateAndCleanUploadedFile(file.path);
            if (validation.isValid) {
                // Apply permanent Jiji-style watermark to images
                if (validation.detectedType?.startsWith('image/')) {
                    await applyJijiStyleWatermark(file.path);
                }
                results.push(`${protocol}://${host}/media/${file.filename}`);
            } else {
                logger.warn(`Batch file rejected: ${file.originalname} - ${validation.error}`);
            }
        }

        if (results.length === 0) {
            return res.status(400).json({ error: 'None of the uploaded files passed security verification.' });
        }

        res.json({ urls: results });
    });
});

// POST /api/upload/report
router.post('/report', authenticate as any, (req: any, res: any) => {
    upload.any()(req, res, async (err: any) => {
        if (err) {
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        }

        const file = (req.files && req.files.length > 0) ? req.files[0] : req.file;
        if (!file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }

        const validation = await validateAndCleanUploadedFile(file.path);
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.error });
        }

        if (validation.detectedType?.startsWith('image/')) {
            await applyJijiStyleWatermark(file.path);
        }

        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.get('host');
        const fileUrl = `${protocol}://${host}/media/${file.filename}`;

        res.json({ 
            url: fileUrl, 
            filename: file.filename, 
            detectedType: validation.detectedType 
        });
    });
});

export default router;
