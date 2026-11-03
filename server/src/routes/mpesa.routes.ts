import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { MpesaTransaction } from '../entities/MpesaTransaction';
import { Order, OrderStatus } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { PromoCode } from '../entities/PromoCode';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { MpesaService } from '../services/mpesaService';
import { paymentRateLimiter } from '../middleware/rateLimiter';
import { calculateAuthoritativePricing } from '../utils/pricingValidator';
import { z } from 'zod';
import { logger } from '../utils/logger';

const router = Router();
const getMpesaRepo = () => AppDataSource.getRepository(MpesaTransaction);
const getOrderRepo = () => AppDataSource.getRepository(Order);

const mpesaOrderSchema = z.object({
  customerName: z.string().min(2),
  customerEmail: z.union([z.string().email(), z.string(), z.null(), z.undefined()]).optional(),
  customerPhone: z.string().min(8),
  shippingAddress: z.string().optional(),
  promoCodeUsed: z.string().optional(),
  discountAmount: z.number().optional(),
  items: z.array(z.object({ 
    productId: z.string().min(1), 
    quantity: z.coerce.number().int().min(1).max(100), 
    price: z.number().optional()
  })).min(1)
});

// POST /api/mpesa/pay - Protected against STK flooding, DoS, and client price tampering
router.post('/pay', paymentRateLimiter as any, validate(mpesaOrderSchema), async (req: any, res) => {
  try {
    const orderRepo = getOrderRepo();
    const { customerName, customerEmail, customerPhone, shippingAddress, items, promoCodeUsed } = req.body;
    
    // P0 Security Fix: Authoritative database pricing verification & calculation
    const pricing = await calculateAuthoritativePricing(items, promoCodeUsed);
    const totalAmount = Math.round(pricing.totalAmount); 

    const host = req.get('host') || 'masuma.africa';
    const protocol = req.protocol || 'https';
    const dynamicCallbackUrl = `${protocol}://${host}/api/mpesa/callback`;
    const siteSource = host.includes('shop') ? 'shop.masuma.africa' : 'masuma.africa';

    const order = new Order();
    // Prefix order number to avoid collision and identify source
    const prefix = host.includes('shop') ? 'S' : 'M';
    order.orderNumber = `${prefix}ORD-${Date.now().toString().slice(-6)}`;
    order.customerName = customerName.trim();
    order.customerEmail = (customerEmail && customerEmail.trim() !== '') ? customerEmail.trim() : undefined;
    order.customerPhone = customerPhone.trim();
    order.shippingAddress = shippingAddress || 'Walk-in / Pickup';
    order.totalAmount = totalAmount;
    order.amountPaid = 0; 
    order.balance = totalAmount;
    order.status = OrderStatus.PENDING;
    order.siteSource = siteSource;
    order.promoCodeUsed = pricing.promoCodeUsed;
    order.discountAmount = pricing.discountAmount;
    
    order.items = pricing.items.map((vi) => {
      const item = new OrderItem();
      item.product = { id: vi.productId } as any;
      item.quantity = vi.quantity;
      item.price = vi.unitPrice;
      return item;
    });

    await orderRepo.save(order);

    if (pricing.promoEntity) {
      try {
        pricing.promoEntity.currentUsage += 1;
        await AppDataSource.getRepository(PromoCode).save(pricing.promoEntity);
      } catch (pErr) {
        logger.error('Failed to increment promo usage:', pErr);
      }
    }
    
    try {
      const response = await MpesaService.initiateStkPush(order.id, customerPhone, totalAmount, {
        callbackUrl: dynamicCallbackUrl,
        siteSource: siteSource
      });
      res.status(201).json({ 
        message: 'STK Push initiated', 
        orderId: order.id,
        orderNumber: order.orderNumber,
        checkoutId: response.CheckoutRequestID
      });
    } catch (mpesaError: any) {
      logger.error(`STK Push Error [${siteSource}]:`, mpesaError.message);
      res.status(500).json({ 
        error: mpesaError.message || 'Payment Initiation Failed', 
        orderId: order.id 
      });
    }
  } catch (error: any) {
    logger.error('Mpesa Pay Route Error:', error);
    res.status(400).json({ error: error.message || 'Order creation failed' });
  }
});

// POST /api/mpesa/callback - Protected with callback token verification
router.post('/callback', async (req: any, res) => {
  try {
    const token = req.query.token as string | undefined;
    await MpesaService.handleCallback(req.body, token);
    res.json({ ResultCode: 0, ResultDesc: "Success" });
  } catch (error) {
    res.status(500).json({ error: 'Callback failed' });
  }
});

// GET /api/mpesa/logs
router.get('/logs', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const mpesaRepo = getMpesaRepo();
    const logs = await mpesaRepo.find({
      order: { createdAt: 'DESC' },
      take: 100,
      relations: ['order']
    });

    const formattedLogs = logs.map(log => ({
      id: log.id,
      checkoutRequestID: log.checkoutRequestID,
      phoneNumber: log.phoneNumber,
      amount: Number(log.amount),
      status: log.status,
      mpesaReceiptNumber: log.mpesaReceiptNumber,
      resultDesc: log.resultDesc,
      date: log.createdAt.toLocaleString()
    }));

    res.json(formattedLogs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch M-Pesa logs' });
  }
});

export default router;
