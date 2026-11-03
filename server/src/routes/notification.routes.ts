
import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { ProductStock } from '../entities/ProductStock';
import { Order, OrderStatus } from '../entities/Order';
import { Quote, QuoteStatus, QuoteType } from '../entities/Quote';
import { Subscriber } from '../entities/Subscriber';
import { User, UserRole, UserStatus } from '../entities/User';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// GET /api/notifications
router.get('/', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
        const notifications = [];

        // 1. Special Sourcing Requests (High Priority)
        const sourcingRequests = await AppDataSource.getRepository(Quote)
            .count({ where: { status: QuoteStatus.DRAFT, requestType: QuoteType.SOURCING } });

        if (sourcingRequests > 0) {
            notifications.push({
                id: 'sourcing-pending',
                title: 'Special Import Requests',
                message: `${sourcingRequests} customers are waiting for part sourcing (VIN provided).`,
                type: 'warning', // Orange/Red to grab attention
                time: 'Action Required',
                link: 'quotes'
            });
        }

        // 1.5 Pending B2B Wholesale Applications
        const pendingB2BCount = await AppDataSource.getRepository(User)
            .count({ where: { role: UserRole.B2B_USER, status: UserStatus.PENDING } });

        if (pendingB2BCount > 0) {
            notifications.push({
                id: 'b2b-pending',
                title: 'B2B Wholesale Applications',
                message: `${pendingB2BCount} trade/wholesale accounts waiting for review and discount assignment.`,
                type: 'warning',
                time: 'Review Pending',
                link: 'users'
            });
        }

        // 2. Low Stock Alerts
        const lowStockItems = await AppDataSource.getRepository(ProductStock)
            .createQueryBuilder('stock')
            .leftJoinAndSelect('stock.product', 'product')
            .leftJoinAndSelect('stock.branch', 'branch')
            .where('stock.quantity <= stock.lowStockThreshold')
            .take(5)
            .getMany();

        lowStockItems.forEach(item => {
            notifications.push({
                id: `stock-${item.id}`,
                title: 'Low Stock Alert',
                message: `${item.product.name} is low (${item.quantity} left) at ${item.branch.name}.`,
                type: 'info',
                time: 'Live',
                link: 'inventory'
            });
        });

        // 3. Pending Orders
        const pendingOrdersCount = await AppDataSource.getRepository(Order)
            .count({ where: { status: OrderStatus.PENDING } });

        if (pendingOrdersCount > 0) {
            notifications.push({
                id: 'orders-pending',
                title: 'New Orders',
                message: `${pendingOrdersCount} orders are pending processing.`,
                type: 'success',
                time: 'Live',
                link: 'orders'
            });
        }

        // 4. Standard Quotes
        const pendingQuotesCount = await AppDataSource.getRepository(Quote)
            .count({ where: { status: QuoteStatus.DRAFT, requestType: QuoteType.STANDARD } });

        if (pendingQuotesCount > 0) {
            notifications.push({
                id: 'quotes-pending',
                title: 'General Quotes',
                message: `${pendingQuotesCount} standard price inquiries received.`,
                type: 'info',
                time: 'Live',
                link: 'quotes'
            });
        }

        // 5. Recent VIP Subscribers (Last 48 Hours)
        try {
            const subscriberRepo = AppDataSource.getRepository(Subscriber);
            const recentSubscribers = await subscriberRepo.find({
                where: { isActive: true },
                order: { createdAt: 'DESC' },
                take: 5
            });

            const fortyEightHoursAgo = Date.now() - (48 * 60 * 60 * 1000);
            const freshSubs = recentSubscribers.filter(s => new Date(s.createdAt).getTime() > fortyEightHoursAgo);

            if (freshSubs.length > 0) {
                notifications.push({
                    id: 'new-subscribers-alert',
                    title: 'New VIP Subscribers',
                    message: `${freshSubs.length} new subscriber(s) joined recently (${freshSubs.map(s => s.email).slice(0, 2).join(', ')}${freshSubs.length > 2 ? '...' : ''}).`,
                    type: 'success',
                    time: 'Recent',
                    link: 'subscribers'
                });
            }
        } catch (subErr: any) {
            console.warn('Failed to query recent subscribers for notifications:', subErr.message);
        }

        res.json(notifications);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

export default router;
