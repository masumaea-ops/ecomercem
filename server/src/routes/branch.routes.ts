
import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { Branch } from '../entities/Branch';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { z } from 'zod';

const router = Router();
const getBranchRepo = () => AppDataSource.getRepository(Branch);

const branchSchema = z.object({
    name: z.string().min(3),
    code: z.string().min(2),
    address: z.string().optional(),
    phone: z.string().optional(),
    isActive: z.boolean().optional()
});

// GET /api/branches
router.get('/', authenticate, async (req, res) => {
    try {
        const branchRepo = getBranchRepo();
        const branches = await branchRepo.find({ order: { name: 'ASC' } });
        res.json(branches);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch branches' });
    }
});

// POST /api/branches (Admin)
router.post('/', authenticate, authorize(['ADMIN']), validate(branchSchema), async (req, res) => {
    try {
        const branchRepo = getBranchRepo();
        const branch = branchRepo.create(req.body);
        await branchRepo.save(branch);
        res.status(201).json(branch);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create branch' });
    }
});

// PUT /api/branches/:id (Admin)
router.put('/:id', authenticate, authorize(['ADMIN']), validate(branchSchema.partial()), async (req, res) => {
    try {
        const branchRepo = getBranchRepo();
        const branch = await branchRepo.findOneBy({ id: req.params.id as any });
        if (!branch) return res.status(404).json({ error: 'Branch not found' });

        branchRepo.merge(branch, req.body);
        await branchRepo.save(branch);
        res.json(branch);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update branch' });
    }
});

export default router;
