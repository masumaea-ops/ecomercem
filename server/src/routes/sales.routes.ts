
import { Router } from 'express';
import { SaleService } from '../services/saleService';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { Sale } from '../entities/Sale';
import { z } from 'zod';

const router = Router();

const createSaleSchema = z.object({
    items: z.array(z.object({
        productId: z.string(),
        name: z.string(),
        quantity: z.number(),
        price: z.number(),
        sku: z.string().optional(),
        oem: z.string().optional()
    })),
    totalAmount: z.number(),
    discount: z.number().optional(),
    discountType: z.string().optional(),
    paymentMethod: z.string(),
    branchId: z.string().optional(),
    customerId: z.string().optional(),
    customerName: z.string().optional(),
    paymentDetails: z.any().optional()
});

// POST /api/sales
router.post('/', authenticate, validate(createSaleSchema), async (req: any, res) => {
    try {
        const saleData = {
            ...req.body,
            // Prioritize body branchId, fall back to user's branch
            branchId: req.body.branchId || req.user.branch?.id,
            cashierId: req.user.id
        };

        if (!saleData.branchId) {
            return res.status(400).json({ error: 'Branch ID is required to record a sale. Please ensure you are assigned to a branch.' });
        }

        const sale = await SaleService.createSale(saleData);
        res.status(201).json(sale);
    } catch (error: any) {
        console.error('Sale Creation Error:', error);
        res.status(500).json({ error: error.message || 'Failed to create sale' });
    }
});

// GET /api/sales
router.get('/', authenticate, authorize(['ADMIN', 'MANAGER', 'CASHIER']), async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const search = req.query.search as string;
        const date = req.query.date as string;

        const skip = (page - 1) * limit;
        
        const repo = AppDataSource.getRepository(Sale);
        const query = repo.createQueryBuilder('sale')
            .leftJoinAndSelect('sale.branch', 'branch')
            .leftJoinAndSelect('sale.cashier', 'cashier')
            .leftJoinAndSelect('sale.customer', 'customer')
            .orderBy('sale.createdAt', 'DESC')
            .take(limit)
            .skip(skip);

        if (search) {
            query.andWhere('(sale.receiptNumber LIKE :search OR sale.customerName LIKE :search)', { search: `%${search}%` });
        }

        if (date) {
            query.andWhere('DATE(sale.createdAt) = :date', { date });
        }

        const [data, total] = await query.getManyAndCount();

        res.json({
            data,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch sales' });
    }
});

// GET /api/sales/order/:orderNumber
// Used by POS to check if payment was completed and sale created
router.get('/order/:orderNumber', authenticate, authorize(['ADMIN', 'MANAGER', 'CASHIER']), async (req, res) => {
    try {
        const orderNumber = req.params.orderNumber;
        
        // Check both direct references and those embedded in paymentDetails JSON
        const sale = await AppDataSource.getRepository(Sale).createQueryBuilder("sale")
            .where("JSON_UNQUOTE(JSON_EXTRACT(sale.paymentDetails, '$.reference')) = :ref", { ref: orderNumber })
            .orWhere("JSON_UNQUOTE(JSON_EXTRACT(sale.paymentDetails, '$.orderReference')) = :ref", { ref: orderNumber })
            .orWhere("sale.receiptNumber = :ref", { ref: orderNumber })
            .getOne();
        
        if (!sale) return res.status(404).json({ error: 'Sale not found for this order' });
        res.json(sale);
    } catch (error) {
        // console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
