
import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { Sale } from '../entities/Sale';
import { Order } from '../entities/Order';
import { ProductStock } from '../entities/ProductStock';
import { Product } from '../entities/Product';
import { Quote } from '../entities/Quote';
import { User, UserStatus } from '../entities/User';
import { authenticate } from '../middleware/auth';
import { MoreThanOrEqual } from 'typeorm';

const router = Router();

// GET /api/admin/stats
router.get('/', authenticate, async (req, res) => {
    try {
        const saleRepo = AppDataSource.getRepository(Sale);
        const orderRepo = AppDataSource.getRepository(Order);
        const stockRepo = AppDataSource.getRepository(ProductStock);
        const quoteRepo = AppDataSource.getRepository(Quote);
        const productRepo = AppDataSource.getRepository(Product);
        const userRepo = AppDataSource.getRepository(User);

        // 1. Calculate Time Boundaries
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        // 2. Revenue Calculations (Actualized Sales)
        const { allTimeRevenue } = await saleRepo.createQueryBuilder('sale')
            .select('SUM(sale.totalAmount)', 'allTimeRevenue')
            .getRawOne();

        const { revenueToday } = await saleRepo.createQueryBuilder('sale')
            .select('SUM(sale.totalAmount)', 'revenueToday')
            .where('sale.createdAt >= :startOfToday', { startOfToday })
            .getRawOne();

        // 3. Activity Counts (Sales + Orders Created Today)
        const salesCountToday = await saleRepo.count({
            where: { createdAt: MoreThanOrEqual(startOfToday) }
        });
        
        const ordersCountToday = await orderRepo.count({
            where: { createdAt: MoreThanOrEqual(startOfToday) }
        });

        // 4. Operational Alerts
        const lowStockCount = await stockRepo.createQueryBuilder('stock')
            .where('stock.quantity <= stock.lowStockThreshold')
            .getCount();

        const pendingQuotes = await quoteRepo.count({ 
            where: { status: 'DRAFT' as any } 
        });

        const pendingUsers = await userRepo.count({
            where: { status: UserStatus.PENDING }
        });

        // 5. Monthly Revenue Trend (Last 6 Months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        sixMonthsAgo.setDate(1);
        
        const monthlyData = await saleRepo.createQueryBuilder('sale')
            .select("DATE_FORMAT(sale.createdAt, '%Y-%m')", "month")
            .addSelect("SUM(sale.totalAmount)", "revenue")
            .where("sale.createdAt >= :sixMonthsAgo", { sixMonthsAgo })
            .groupBy("month")
            .orderBy("month", "ASC")
            .getRawMany();

        // 6. Product Category Distribution
        const categoryData = await productRepo.createQueryBuilder('product')
            .leftJoin('product.category', 'category')
            .select('category.name', 'name')
            .addSelect('COUNT(product.id)', 'value')
            .groupBy('category.name')
            .getRawMany();

        res.json({
            totalSales: parseFloat(allTimeRevenue || 0),
            todayRevenue: parseFloat(revenueToday || 0),
            todaysOrders: salesCountToday + ordersCountToday, // Combined volume
            lowStockItems: lowStockCount,
            pendingQuotes,
            pendingUsers,
            monthlyRevenue: monthlyData.map(d => ({
                name: d.month, 
                value: parseFloat(d.revenue)
            })),
            categorySales: categoryData.map(c => ({ 
                name: c.name || 'Uncategorized', 
                value: parseInt(c.value) 
            }))
        });
    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ error: 'Failed to aggregate system data' });
    }
});

export default router;
