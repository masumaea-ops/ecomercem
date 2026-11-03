import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { ReturnRequest, ReturnStatus, ReturnType } from '../entities/ReturnRequest';
import { ReturnItem } from '../entities/ReturnItem';
import { Order } from '../entities/Order';
import { Product } from '../entities/Product';
import { authenticate, authorize } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

const createReturnSchema = z.object({
  orderId: z.string().uuid(),
  type: z.nativeEnum(ReturnType),
  reason: z.string().min(10),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().positive(),
    condition: z.string().optional()
  })).min(1)
});

// Create a return request (B2B User)
router.post('/', authenticate, async (req: any, res) => {
  try {
    const validatedData = createReturnSchema.parse(req.body);
    const orderRepo = AppDataSource.getRepository(Order);
    const productRepo = AppDataSource.getRepository(Product);
    const returnRepo = AppDataSource.getRepository(ReturnRequest);

    const order = await orderRepo.findOne({
      where: { id: validatedData.orderId },
      relations: ['items', 'items.product']
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Strict anti-IDOR/BOLA: Verify that non-staff users can only initiate returns for their own orders
    const isStaff = ['ADMIN', 'MANAGER', 'CASHIER'].includes(req.user.role);
    if (!isStaff) {
      const matchesEmail = Boolean(order.customerEmail && req.user.email && order.customerEmail.toLowerCase() === req.user.email.toLowerCase());
      const matchesPhone = Boolean(order.customerPhone && req.user.phone && order.customerPhone.includes(req.user.phone.slice(-9)));
      if (!matchesEmail && !matchesPhone) {
        return res.status(403).json({ error: 'Forbidden: You can only create returns for orders matching your verified email or phone.' });
      }
    }


    const rmaNumber = `RMA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const returnRequest = returnRepo.create({
      rmaNumber,
      order,
      user: req.user,
      type: validatedData.type,
      reason: validatedData.reason,
      status: ReturnStatus.PENDING,
      items: []
    });

    for (const itemData of validatedData.items) {
      const product = await productRepo.findOneBy({ id: itemData.productId });
      if (!product) continue;

      const orderItem = order.items.find(oi => oi.product.id === itemData.productId);
      if (!orderItem) continue;

      const returnItem = new ReturnItem();
      returnItem.product = product;
      returnItem.quantity = Math.min(itemData.quantity, orderItem.quantity);
      returnItem.priceAtPurchase = orderItem.price;
      returnItem.condition = itemData.condition;
      
      returnRequest.items.push(returnItem);
    }

    await returnRepo.save(returnRequest);
    res.status(201).json(returnRequest);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get all return requests (Admin/Manager)
router.get('/', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const returnRepo = AppDataSource.getRepository(ReturnRequest);
    const returns = await returnRepo.find({
      relations: ['order', 'user', 'items', 'items.product'],
      order: { createdAt: 'DESC' }
    });
    res.json(returns);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's return requests
router.get('/my', authenticate, async (req: any, res) => {
  try {
    const returnRepo = AppDataSource.getRepository(ReturnRequest);
    const returns = await returnRepo.find({
      where: { user: { id: req.user.id } },
      relations: ['order', 'items', 'items.product'],
      order: { createdAt: 'DESC' }
    });
    res.json(returns);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update return status (Admin/Manager)
router.patch('/:id/status', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const returnRepo = AppDataSource.getRepository(ReturnRequest);
    
    const returnRequest = await returnRepo.findOne({
      where: { id: req.params.id as any },
      relations: ['order', 'items', 'items.product']
    });

    if (!returnRequest) {
      return res.status(404).json({ error: 'Return request not found' });
    }

    returnRequest.status = status;
    if (adminNotes) returnRequest.adminNotes = adminNotes;

    await returnRepo.save(returnRequest);

    // If completed, update order status
    if (status === ReturnStatus.COMPLETED) {
      const orderRepo = AppDataSource.getRepository(Order);
      const order = await orderRepo.findOneBy({ id: returnRequest.order.id });
      if (order) {
        if (returnRequest.type === ReturnType.REFUND) {
          order.status = 'REFUNDED' as any;
        } else {
          order.status = 'RETURNED' as any;
        }
        await orderRepo.save(order);
      }
    }

    res.json(returnRequest);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
