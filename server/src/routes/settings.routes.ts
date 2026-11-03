import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { SystemSetting } from '../entities/SystemSetting';
import { authenticate, authorize } from '../middleware/auth';
import { AuditService } from '../services/auditService';
import { Security } from '../utils/security';
import { z } from 'zod';

const router = Router();
const getRepo = () => AppDataSource.getRepository(SystemSetting);

// GET /api/settings
// Publicly accessible, but filters sensitive keys for non-admins to prevent 401 errors on frontend
router.get('/', async (req, res) => {
    try {
        const repo = getRepo();
        const settings = await repo.find();
        const map: Record<string, string> = {};
        
        // Check for Admin Token manually to determine visibility
        const authHeader = req.headers['authorization'];
        let isAdmin = false;
        
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            const payload = Security.verifyToken(token);
            if (payload && (payload.role === 'ADMIN' || payload.role === 'MANAGER')) {
                isAdmin = true;
            }
        }

        // Define prefixes that are safe for public consumption
        const publicPrefixes = ['CMS_', 'BRANCH_', 'COMPANY_', 'SUPPORT_', 'PAYMENT_'];

        // Default Payment & Bank Settings (configurable from Settings Manager)
        const defaults: Record<string, string> = {
            PAYMENT_PAYBILL_NUMBER: '247247',
            PAYMENT_PAYBILL_ACCOUNT: '0792506590',
            PAYMENT_BANK_NAME: 'EQUITY BANK LTD',
            PAYMENT_BANK_BRANCH: 'Karen Branch',
            PAYMENT_BANK_ACCOUNT_NO: '1250285737086',
            PAYMENT_BANK_ACCOUNT_NAME: 'Masuma Autoparts East Africa',
            PAYMENT_INSTRUCTIONS: 'Please use Quote / Order Number as payment reference.'
        };

        Object.assign(map, defaults);

        settings.forEach(s => {
            // Return key if Admin OR if it matches public prefixes OR specific safe keys like META_PIXEL_ID
            if (isAdmin || publicPrefixes.some(p => s.key.startsWith(p)) || s.key === 'META_PIXEL_ID') {
                map[s.key] = s.value;
            }
        });

        res.json(map);
    } catch (error: any) {
        res.status(500).json({ error: error.message || error.toString() });
    }
});

// POST /api/settings (Protected: Admin Only)
router.post('/', authenticate, authorize(['ADMIN']), async (req, res) => {
    try {
        const repo = getRepo();
        const settings = req.body as Record<string, string>;
        const promises = Object.entries(settings).map(async ([key, value]) => {
            let s = await repo.findOneBy({ key });
            if (!s) {
                s = new SystemSetting();
                s.key = key;
            }
            s.value = String(value);
            return repo.save(s);
        });

        await Promise.all(promises);

        await AuditService.log('UPDATE_SETTINGS', 'SYSTEM', 'Updated system configuration', req.user, req.ip);

        res.json({ message: 'Settings saved' });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

export default router;