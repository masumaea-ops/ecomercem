
import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { Category } from '../entities/Category';
import { authenticate, authorize } from '../middleware/auth';
import { z } from 'zod';
import { validate } from '../middleware/validate';

const router = Router();
const getCategoryRepo = () => AppDataSource.getRepository(Category);

const categorySchema = z.object({
    name: z.string().min(2)
});

// GET /api/categories
router.get('/', async (req, res) => {
    try {
        const categoryRepo = getCategoryRepo();
        const categories = await categoryRepo.find({ order: { name: 'ASC' } });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// POST /api/categories (Admin/Manager)
router.post('/', authenticate, authorize(['ADMIN', 'MANAGER']), validate(categorySchema), async (req, res) => {
    try {
        const categoryRepo = getCategoryRepo();
        const { name } = req.body;
        const existing = await categoryRepo.findOneBy({ name: name as any });
        if (existing) return res.status(400).json({ error: 'Category already exists' });

        const category = categoryRepo.create({ name });
        await categoryRepo.save(category);
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create category' });
    }
});

// DELETE /api/categories/:id
router.delete('/:id', authenticate, authorize(['ADMIN']), async (req, res) => {
    try {
        const categoryRepo = getCategoryRepo();
        const category = await categoryRepo.findOne({ 
            where: { id: req.params.id as any },
            relations: ['products']
        });

        if (!category) return res.status(404).json({ error: 'Category not found' });
        
        if (category.products.length > 0) {
            return res.status(400).json({ error: `Cannot delete category. It has ${category.products.length} associated products.` });
        }

        await categoryRepo.remove(category);
        res.json({ message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

export default router;
