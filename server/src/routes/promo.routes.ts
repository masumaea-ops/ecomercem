
import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { PromoCode } from '../entities/PromoCode';
import { authenticate, authorize } from '../middleware/auth';
import { z } from 'zod';
import { validate } from '../middleware/validate';

const router = Router();

// Validation schema for creating a promo
const createPromoSchema = z.object({
    code: z.string().min(3).max(20),
    type: z.enum(['PERCENTAGE', 'FIXED']),
    value: z.number().positive(),
    startDate: z.string(),
    endDate: z.string(),
    usageLimit: z.number().int().nonnegative(),
    isActive: z.boolean().optional()
});

// GET /api/promo - List all promos (Admin Only)
router.get('/', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
        const promoRepo = AppDataSource.getRepository(PromoCode);
        const promos = await promoRepo.find({ order: { createdAt: 'DESC' } });
        res.json(promos);
    } catch (error) {
        console.error('Fetch Promos Error:', error);
        res.status(500).json({ error: 'Failed to fetch promotions' });
    }
});

// GET /api/promo/validate?code=XYZ - Validate a promo code (Public)
router.get('/validate', async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) return res.status(400).json({ valid: false, message: 'Code is required' });

        const promoRepo = AppDataSource.getRepository(PromoCode);
        const promo = await promoRepo.findOneBy({ 
            code: (code as string).toUpperCase(),
            isActive: true 
        });

        if (!promo) {
            return res.json({ valid: false, message: 'Invalid or inactive promo code' });
        }

        const now = new Date();
        const start = new Date(promo.startDate);
        const end = new Date(promo.endDate);

        if (now < start) {
            return res.json({ valid: false, message: 'This promotion has not started yet' });
        }

        if (now > end) {
            return res.json({ valid: false, message: 'This promotion has expired' });
        }

        if (promo.currentUsage >= promo.usageLimit) {
            return res.json({ valid: false, message: 'This promotion has reached its usage limit' });
        }

        res.json({ valid: true, promo });
    } catch (error) {
        console.error('Validate Promo Error:', error);
        res.status(500).json({ error: 'Failed to validate promotion' });
    }
});

// POST /api/promo - Create a new promo (Admin Only)
router.post('/', authenticate, authorize(['ADMIN', 'MANAGER']), validate(createPromoSchema), async (req, res) => {
    try {
        const promoRepo = AppDataSource.getRepository(PromoCode);
        
        // Check if code already exists
        const existing = await promoRepo.findOneBy({ code: req.body.code.toUpperCase() });
        if (existing) {
            return res.status(400).json({ error: 'A promotion with this code already exists' });
        }

        const newPromo = promoRepo.create({
            ...req.body,
            code: req.body.code.toUpperCase()
        });

        await promoRepo.save(newPromo);
        res.status(201).json(newPromo);
    } catch (error) {
        console.error('Create Promo Error:', error);
        res.status(500).json({ error: 'Failed to create promotion' });
    }
});

// DELETE /api/promo/:id - Delete a promo (Admin Only)
router.delete('/:id', authenticate, authorize(['ADMIN']), async (req, res) => {
    try {
        const promoRepo = AppDataSource.getRepository(PromoCode);
        const result = await promoRepo.delete(req.params.id);
        if (result.affected === 0) {
            return res.status(404).json({ error: 'Promotion not found' });
        }
        res.json({ message: 'Promotion deleted successfully' });
    } catch (error) {
        console.error('Delete Promo Error:', error);
        res.status(500).json({ error: 'Failed to delete promotion' });
    }
});

export default router;
