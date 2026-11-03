
import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { Expense } from '../entities/Expense';
import { Sale } from '../entities/Sale';
import { Product } from '../entities/Product';
import { authenticate, authorize } from '../middleware/auth';
import { z } from 'zod';
import { validate } from '../middleware/validate';

const router = Router();
const getExpenseRepo = () => AppDataSource.getRepository(Expense);
const getSaleRepo = () => AppDataSource.getRepository(Sale);

const createExpenseSchema = z.object({
    title: z.string().min(3),
    amount: z.number().positive(),
    category: z.string(),
    date: z.string(), // ISO Date string
    notes: z.string().optional(),
    branchId: z.string().optional()
});

// GET /api/finance/summary
// Returns Profit & Loss Statement
router.get('/summary', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
        const expenseRepo = getExpenseRepo();
        const saleRepo = getSaleRepo();
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().getFullYear(), 0, 1);
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
        endDate.setHours(23, 59, 59, 999);

        // 1. Calculate Total Revenue (Sales)
        const sales = await saleRepo.createQueryBuilder('sale')
            .where('sale.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
            .getMany();

        const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.netAmount || sale.totalAmount / 1.16), 0); // Net of Tax

        // 2. Calculate COGS (Cost of Goods Sold)
        // Note: Ideally we track cost at time of sale. For now, we check current product cost.
        let cogs = 0;
        for (const sale of sales) {
            const items = sale.itemsSnapshot || [];
            for (const item of items) {
                // Fetch current cost of product
                // Optimization: In high scale, we'd bulk fetch or store cost in sale item
                const product = await AppDataSource.getRepository(Product).findOne({ 
                    where: { id: item.productId },
                    select: ['costPrice'] 
                });
                if (product) {
                    cogs += Number(product.costPrice) * Number(item.quantity || item.qty);
                }
            }
        }

        // 3. Calculate Operational Expenses
        const expenses = await expenseRepo.createQueryBuilder('expense')
            .where('expense.date BETWEEN :startDate AND :endDate', { startDate, endDate })
            .getMany();

        const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

        // 4. Breakdown
        const grossProfit = totalRevenue - cogs;
        const netProfit = grossProfit - totalExpenses;

        res.json({
            revenue: totalRevenue,
            cogs: cogs,
            grossProfit: grossProfit,
            expenses: totalExpenses,
            netProfit: netProfit,
            expenseBreakdown: expenses.reduce((acc: any, curr) => {
                acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount);
                return acc;
            }, {})
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate finance summary' });
    }
});

// POST /api/finance/expenses
router.post('/expenses', authenticate, authorize(['ADMIN', 'MANAGER']), validate(createExpenseSchema), async (req, res) => {
    try {
        const expenseRepo = getExpenseRepo();
        const { title, amount, category, date, notes, branchId } = req.body;

        const expense = new Expense();
        expense.title = title;
        expense.amount = amount;
        expense.category = category as any;
        expense.date = new Date(date);
        expense.notes = notes;
        expense.recordedBy = req.user!;
        
        if (branchId) expense.branch = { id: branchId } as any;

        await expenseRepo.save(expense);
        res.status(201).json(expense);
    } catch (error) {
        res.status(500).json({ error: 'Failed to record expense' });
    }
});

// GET /api/finance/expenses
router.get('/expenses', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
        const expenseRepo = getExpenseRepo();
        const expenses = await expenseRepo.find({
            order: { date: 'DESC' },
            take: 100,
            relations: ['recordedBy', 'branch']
        });
        
        const formatted = expenses.map(e => ({
            ...e,
            recordedBy: e.recordedBy.fullName,
            branch: e.branch?.name || 'General'
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
});

export default router;
