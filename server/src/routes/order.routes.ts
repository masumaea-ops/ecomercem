import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { Order, OrderStatus } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { Payment } from '../entities/Payment';
import { PromoCode } from '../entities/PromoCode';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { z } from 'zod';
import { SaleService } from '../services/saleService';
import { EmailService } from '../services/emailService';
import { logger } from '../utils/logger';
import { Security } from '../utils/security';
import { getPaymentSettings } from '../utils/paymentSettings';
import { calculateAuthoritativePricing } from '../utils/pricingValidator';

const router = Router();
const getOrderRepo = () => AppDataSource.getRepository(Order);
const getPaymentRepo = () => AppDataSource.getRepository(Payment);

router.get('/:id/status', async (req: any, res: any) => {
  try {
    const orderRepo = getOrderRepo();
    const { id } = req.params;
    const order = await orderRepo.findOne({
      where: { id: id as any },
      select: ['id', 'status', 'orderNumber']
    });

    if (!order) {
      logger.warn(`Order Status Polling: Order ${id} not found`);
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ status: order.status });
  } catch (error) {
    logger.error(`Status Check Error for Order ${req.params.id}:`, error);
    res.status(500).json({ error: 'Server error during status check' });
  }
});

const createOrderSchema = z.object({
    customerName: z.string().min(2, 'Name must be at least 2 characters'),
    customerEmail: z.union([z.string().email(), z.string(), z.null(), z.undefined()]).optional(),
    customerPhone: z.string().min(8, 'Valid phone number is required'),
    shippingAddress: z.string().optional(),
    items: z.array(z.object({
        productId: z.string().min(1, 'Product ID required'),
        quantity: z.coerce.number().int().min(1).max(100)
    })).min(1, 'Order must contain at least one item'),
    paymentMethod: z.string().optional(),
    promoCodeUsed: z.string().optional()
});

router.post('/', validate(createOrderSchema), async (req, res) => {
    try {
        const orderRepo = getOrderRepo();
        const { customerName, customerEmail, customerPhone, shippingAddress, items, paymentMethod, promoCodeUsed } = req.body;

        // P0 Security Fix: Authoritative database pricing verification & calculation
        const pricing = await calculateAuthoritativePricing(items, promoCodeUsed);
        
        const host = req.get('host') || 'masuma.africa';
        const siteSource = host.includes('shop') ? 'shop.masuma.africa' : 'masuma.africa';
        const prefix = host.includes('shop') ? 'S' : 'M';

        const order = new Order();
        order.orderNumber = `${prefix}ORD-${Date.now().toString().slice(-6)}`;
        order.customerName = customerName.trim();
        order.customerEmail = (customerEmail && customerEmail.trim().length > 0) ? customerEmail.trim() : undefined;
        order.customerPhone = customerPhone.trim();
        order.shippingAddress = shippingAddress || '';
        order.totalAmount = pricing.totalAmount;
        order.discountAmount = pricing.discountAmount;
        order.promoCodeUsed = pricing.promoCodeUsed;
        order.amountPaid = 0;
        order.balance = pricing.totalAmount;
        order.status = OrderStatus.PENDING;
        order.paymentMethod = paymentMethod || 'MANUAL';
        order.siteSource = siteSource;
        
        order.items = pricing.items.map((vi) => {
            const item = new OrderItem();
            item.product = { id: vi.productId } as any;
            item.quantity = vi.quantity;
            item.price = vi.unitPrice; // Authoritative DB price!
            return item;
        });

        await orderRepo.save(order);

        // Safely record promo code usage if applied
        if (pricing.promoEntity) {
            try {
                pricing.promoEntity.currentUsage += 1;
                await AppDataSource.getRepository(PromoCode).save(pricing.promoEntity);
            } catch (pErr) {
                logger.error('Failed to increment promo usage:', pErr);
            }
        }

        res.status(201).json({ 
            message: 'Order created successfully', 
            orderId: order.id,
            orderNumber: order.orderNumber,
            totalAmount: pricing.totalAmount,
            subtotal: pricing.subtotal,
            discount: pricing.discountAmount,
            vat: pricing.vatAmount
        });
    } catch (error: any) {
        logger.error('Failed to create order:', error);
        res.status(400).json({ error: error.message || 'Failed to create order' });
    }
});

// GET /api/orders/my - Strictly isolated to authenticated user's own orders (anti-IDOR)
router.get('/my', authenticate, async (req: any, res) => {
    try {
        const orderRepo = getOrderRepo();
        const userEmail = req.user?.email;
        const userPhone = req.user?.phone;

        if (!userEmail && !userPhone) {
            return res.json([]);
        }

        const query = orderRepo.createQueryBuilder('order')
            .leftJoinAndSelect('order.items', 'items')
            .leftJoinAndSelect('items.product', 'product')
            .orderBy('order.createdAt', 'DESC');

        if (userEmail && userPhone) {
            query.where('order.customerEmail = :userEmail OR order.customerPhone = :userPhone', { userEmail, userPhone });
        } else if (userEmail) {
            query.where('order.customerEmail = :userEmail', { userEmail });
        } else {
            query.where('order.customerPhone = :userPhone', { userPhone });
        }

        const orders = await query.take(50).getMany();
        const formattedOrders = orders.map(o => ({
            id: o.id,
            orderNumber: o.orderNumber || o.id.substring(0, 8).toUpperCase(),
            customerName: o.customerName,
            customerEmail: o.customerEmail,
            customerPhone: o.customerPhone,
            shippingAddress: o.shippingAddress,
            date: new Date(o.createdAt).toLocaleDateString(),
            total: Number(o.totalAmount),
            status: o.status,
            paymentMethod: o.paymentMethod || 'Manual',
            items: o.items.map(i => ({
                id: i.id,
                name: i.product?.name || 'Unknown Product',
                sku: i.product?.sku || 'N/A',
                qty: i.quantity,
                price: Number(i.price),
                image: i.product?.imageUrl
            }))
        }));

        res.json(formattedOrders);
    } catch (error) {
        logger.error('Failed to fetch personal orders:', error);
        res.status(500).json({ error: 'Failed to fetch your orders' });
    }
});

router.get('/', authenticate, authorize(['ADMIN', 'MANAGER', 'CASHIER']), async (req, res) => {
    try {
        const orderRepo = getOrderRepo();
        const status = req.query.status as string;
        const search = req.query.search as string;
        
        const query = orderRepo.createQueryBuilder('order')
            .leftJoinAndSelect('order.items', 'items')
            .leftJoinAndSelect('items.product', 'product')
            .leftJoinAndSelect('product.oemNumbers', 'oem')
            .leftJoinAndSelect('order.payments', 'payments')
            .orderBy('order.createdAt', 'DESC');

        if (status && status !== 'All Statuses' && status !== 'All') {
            query.andWhere('order.status = :status', { status });
        }

        if (search) {
            const cleanSearch = Security.escapeLikeString(search);
            query.andWhere('(order.id LIKE :search OR order.orderNumber LIKE :search OR order.customerName LIKE :search)', { search: `%${cleanSearch}%` });
        }

        const orders = await query.take(50).getMany();
        const formattedOrders = orders.map(o => {
            const total = Number(o.totalAmount || 0);
            const amountPaid = Number(o.amountPaid || 0);
            const balance = o.balance !== undefined && o.balance !== null ? Number(o.balance) : Math.max(0, parseFloat((total - amountPaid).toFixed(2)));

            return {
                id: o.id,
                orderNumber: o.orderNumber || o.id.substring(0, 8).toUpperCase(),
                customerName: o.customerName,
                customerEmail: o.customerEmail,
                customerPhone: o.customerPhone,
                shippingAddress: o.shippingAddress,
                date: new Date(o.createdAt).toLocaleDateString(),
                total,
                amountPaid,
                balance,
                status: o.status,
                paymentMethod: o.paymentMethod || 'Manual',
                payments: (o.payments || []).map(p => ({
                    id: p.id,
                    amount: Number(p.amount),
                    method: p.method,
                    reference: p.reference,
                    notes: p.notes,
                    date: p.date ? new Date(p.date).toLocaleString() : ''
                })),
                items: o.items.map(i => ({ 
                    id: i.id,
                    name: i.product?.name || 'Item', 
                    sku: i.product?.sku || 'N/A',
                    oem: i.product?.oemNumbers?.[0]?.code || '',
                    qty: i.quantity,
                    price: Number(i.price),
                    image: i.product?.imageUrl
                }))
            };
        });

        res.json(formattedOrders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// GET /api/orders/:id
router.get('/:id', authenticate, authorize(['ADMIN', 'MANAGER', 'CASHIER']), async (req, res) => {
    try {
        const orderRepo = getOrderRepo();
        const order = await orderRepo.findOne({
            where: { id: req.params.id as any },
            relations: ['items', 'items.product', 'items.product.oemNumbers', 'payments', 'payments.recordedBy', 'sourceQuote']
        });

        if (!order) return res.status(404).json({ error: 'Order not found' });

        const total = Number(order.totalAmount || 0);
        const amountPaid = Number(order.amountPaid || 0);
        const balance = order.balance !== undefined && order.balance !== null ? Number(order.balance) : Math.max(0, parseFloat((total - amountPaid).toFixed(2)));

        res.json({
            id: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            customerPhone: order.customerPhone,
            shippingAddress: order.shippingAddress,
            date: new Date(order.createdAt).toLocaleDateString(),
            total,
            amountPaid,
            balance,
            status: order.status,
            paymentMethod: order.paymentMethod,
            payments: (order.payments || []).map(p => ({
                id: p.id,
                amount: Number(p.amount),
                method: p.method,
                reference: p.reference,
                notes: p.notes,
                date: p.date ? new Date(p.date).toLocaleString() : '',
                recordedBy: (p.recordedBy as any)?.fullName || (p.recordedBy as any)?.email || 'Staff'
            })),
            items: order.items.map(i => ({
                id: i.id,
                name: i.product?.name || 'Item',
                sku: i.product?.sku || 'N/A',
                oem: i.product?.oemNumbers?.[0]?.code || '',
                qty: i.quantity,
                price: Number(i.price)
            }))
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve order details' });
    }
});

const updateStatusSchema = z.object({
    status: z.enum(['PENDING', 'PARTIALLY_PAID', 'PAID', 'SHIPPED', 'DELIVERED', 'FAILED', 'CANCELLED']),
    trackingInfo: z.string().optional()
});

router.patch('/:id/status', authenticate, authorize(['ADMIN', 'MANAGER']), validate(updateStatusSchema), async (req, res) => {
    try {
        const orderRepo = getOrderRepo();
        const { status } = req.body;
        const order = await orderRepo.findOne({ 
            where: { id: req.params.id as any },
            relations: ['items', 'items.product', 'payments'] 
        });
        
        if (!order) return res.status(404).json({ error: 'Order not found' });

        const previousStatus = order.status;
        order.status = status as OrderStatus;

        // If explicitly marking as PAID, ensure balance is cleared
        if (status === 'PAID') {
            order.amountPaid = Number(order.totalAmount);
            order.balance = 0;
        }

        await orderRepo.save(order);
        
        // Automation 1: Create Sale and Generate Official Receipt when Paid
        if (status === 'PAID' && previousStatus !== 'PAID') {
            try {
                await SaleService.createSaleFromOrder(order, req.user);
            } catch (saleError) {
                console.error("Sale conversion failed", saleError);
            }
        }

        // Automation 2: Notify customer when Shipped
        if (status === 'SHIPPED' && previousStatus !== 'SHIPPED') {
            if (order.customerEmail && order.customerEmail.includes('@')) {
                try {
                    await EmailService.sendEmail('SHIPMENT_DISPATCHED', {
                        email: order.customerEmail,
                        customerName: order.customerName,
                        orderNumber: order.orderNumber,
                        customerPhone: order.customerPhone,
                        shippingAddress: order.shippingAddress
                    });
                } catch (emailError) {
                    logger.error("Shipping notification failed", emailError);
                }
            }
        }

        res.json(order);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

// POST /api/orders/:id/payments
// Record partial or full payment against an Invoice/Order
const recordPaymentSchema = z.object({
    amount: z.coerce.number().positive('Payment amount must be greater than zero'),
    method: z.string().default('CASH'),
    reference: z.string().optional(),
    notes: z.string().optional()
});

router.post('/:id/payments', authenticate, authorize(['ADMIN', 'MANAGER', 'CASHIER']), validate(recordPaymentSchema), async (req: any, res) => {
    try {
        const orderRepo = getOrderRepo();
        const paymentRepo = getPaymentRepo();
        const orderId = req.params.id;
        const { amount, method, reference, notes } = req.body;

        const order = await orderRepo.findOne({
            where: { id: orderId as any },
            relations: ['items', 'items.product', 'payments']
        });

        if (!order) return res.status(404).json({ error: 'Invoice/Order not found' });

        const totalAmount = Number(order.totalAmount);
        const currentPaid = Number(order.amountPaid || 0);
        const currentBalance = Math.max(0, parseFloat((totalAmount - currentPaid).toFixed(2)));

        if (currentBalance <= 0) {
            return res.status(400).json({ error: 'This invoice is already fully paid and settled.' });
        }

        const paymentAmount = parseFloat(Number(amount).toFixed(2));
        if (paymentAmount > currentBalance + 0.01) {
            return res.status(400).json({
                error: `Payment amount (KES ${paymentAmount.toLocaleString()}) cannot exceed remaining balance (KES ${currentBalance.toLocaleString()})`
            });
        }

        // 1. Create Payment record
        const payment = new Payment();
        payment.order = order;
        payment.amount = paymentAmount;
        payment.method = method;
        payment.reference = reference || undefined;
        payment.notes = notes || undefined;
        payment.recordedBy = req.user;
        await paymentRepo.save(payment);

        // 2. Update Order balances & status
        const newAmountPaid = parseFloat((currentPaid + paymentAmount).toFixed(2));
        const newBalance = Math.max(0, parseFloat((totalAmount - newAmountPaid).toFixed(2)));

        order.amountPaid = newAmountPaid;
        order.balance = newBalance;
        order.paymentMethod = method;

        const isFullyPaid = newBalance <= 0;
        let generatedReceipt = null;

        if (isFullyPaid) {
            order.status = OrderStatus.PAID;
            order.balance = 0;
            // Generate Sale and Official Receipt
            try {
                generatedReceipt = await SaleService.createSaleFromOrder(order, req.user);
            } catch (saleErr) {
                console.error("Auto Sale creation failed upon full payment:", saleErr);
            }
        } else {
            order.status = OrderStatus.PARTIALLY_PAID;
        }

        await orderRepo.save(order);

        // 3. Dispatch Payment Receipt Email if customer email exists
        if (order.customerEmail && order.customerEmail.includes('@')) {
            getPaymentSettings().then(paymentSettings => {
                EmailService.sendEmail('PAYMENT_RECEIPT', {
                    email: order.customerEmail,
                    customerName: order.customerName,
                    orderNumber: order.orderNumber,
                    amountPaidThisTime: paymentAmount,
                    totalAmountPaid: newAmountPaid,
                    totalAmount: totalAmount,
                    balance: newBalance,
                    paymentMethod: method,
                    reference: reference,
                    receiptNumber: generatedReceipt?.receiptNumber || undefined,
                    paybillNumber: paymentSettings.paybillNumber,
                    paybillAccount: paymentSettings.paybillAccount,
                    bankName: paymentSettings.bankName,
                    bankBranch: paymentSettings.bankBranch,
                    bankAccountNo: paymentSettings.bankAccountNo,
                    bankAccountName: paymentSettings.bankAccountName,
                    paymentInstructions: paymentSettings.instructions
                }).catch(emailErr => console.error("Payment receipt email dispatch failed:", emailErr));
            }).catch(e => console.error("Error loading payment settings for receipt email:", e));
        }

        res.status(201).json({
            message: isFullyPaid 
                ? `Invoice #${order.orderNumber} is FULLY PAID! Official receipt generated.`
                : `Partial payment of KES ${paymentAmount.toLocaleString()} recorded. Remaining balance: KES ${newBalance.toLocaleString()}`,
            isFullyPaid,
            payment: {
                id: payment.id,
                amount: payment.amount,
                method: payment.method,
                reference: payment.reference,
                notes: payment.notes,
                date: payment.date
            },
            order: {
                id: order.id,
                orderNumber: order.orderNumber,
                total: totalAmount,
                amountPaid: newAmountPaid,
                balance: newBalance,
                status: order.status
            },
            receipt: generatedReceipt
        });
    } catch (error: any) {
        console.error('Record Payment Error:', error);
        res.status(500).json({ error: error.message || 'Failed to record payment' });
    }
});

export default router;