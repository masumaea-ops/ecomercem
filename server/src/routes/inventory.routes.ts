import { Router } from 'express';
import { InventoryService } from '../services/inventoryService';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { z } from 'zod';
import { AppDataSource } from '../config/database';
import { ProductStock } from '../entities/ProductStock';

const router = Router();

// GET /api/inventory
// Returns stock for a specific branch with Pagination
router.get('/', authenticate, async (req, res) => {
    try {
        const branchId = req.query.branchId as string || req.user?.branch?.id;
        const lowStock = req.query.lowStock === 'true';
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 100;
        const skip = (page - 1) * limit;

        if (!branchId) return res.status(400).json({ error: 'Branch ID required' });

        // Direct query with pagination
        const query = AppDataSource.getRepository(ProductStock)
            .createQueryBuilder('stock')
            .leftJoinAndSelect('stock.product', 'product')
            .leftJoinAndSelect('stock.branch', 'branch')
            .where('stock.branchId = :branchId', { branchId })
            .take(limit)
            .skip(skip);

        if (lowStock) {
            query.andWhere('stock.quantity <= stock.lowStockThreshold');
        }

        const [items, total] = await query.getManyAndCount();

        // Preserve existing format for frontend compatibility but add meta
        // Frontend currently expects an array, so we return array but include headers if needed
        // Or we stick to array if the frontend component doesn't handle {data, meta} yet.
        // For now, returning the array to prevent "Outlook" breakage, but backend is protected via 'take'.
        
        res.json(items);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// PATCH /api/inventory/:productId
// Adjust stock manually
const updateStockSchema = z.object({
    branchId: z.string(),
    quantity: z.number().min(0),
    operation: z.enum(['set', 'add', 'subtract'])
});

router.patch('/:productId', authenticate, authorize(['ADMIN', 'MANAGER']), validate(updateStockSchema), async (req, res) => {
    try {
        const { branchId, quantity, operation } = req.body;
        const updated = await InventoryService.updateStock(req.params.productId as any, branchId, quantity, operation);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update stock' });
    }
});

// POST /api/inventory/transfer
const transferStockSchema = z.object({
    productId: z.string(),
    fromBranchId: z.string(),
    toBranchId: z.string(),
    quantity: z.number().min(1)
});

router.post('/transfer', authenticate, authorize(['ADMIN', 'MANAGER']), validate(transferStockSchema), async (req, res) => {
    try {
        const { productId, fromBranchId, toBranchId, quantity } = req.body;
        
        if (fromBranchId === toBranchId) {
            return res.status(400).json({ error: 'Cannot transfer to the same branch' });
        }

        await InventoryService.transferStock(productId as any, fromBranchId as any, toBranchId as any, quantity, req.user!.id);
        res.json({ message: 'Transfer successful' });
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Transfer failed' });
    }
});

export default router;