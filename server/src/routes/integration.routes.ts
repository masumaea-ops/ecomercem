import { Router, Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Product } from '../entities/Product';
import { OemNumber } from '../entities/OemNumber';
import { Vehicle } from '../entities/Vehicle';
import { ProductStock } from '../entities/ProductStock';
import { Order, OrderStatus } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { logger } from '../utils/logger';

const router = Router();

/**
 * B2B / TecAlliance API Authentication Middleware
 * Validates request header against INTEGRATION_API_KEY.
 */
const authenticateIntegrationKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = (req.headers['x-api-key'] as string) || 
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);

  const configuredKey = process.env.INTEGRATION_API_KEY || 'masuma_integration_secret_key_2026';

  if (!apiKey || apiKey !== configuredKey) {
    logger.warn(`Integration API authentication failed from IP ${req.ip}`);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing API key. Provide a valid key via X-API-KEY header or Bearer token.',
      code: 'AUTH_FAILED',
    });
  }

  next();
};

// Apply API Key authentication across all integration routes
router.use(authenticateIntegrationKey as any);

/**
 * 1. Health & Protocol Status
 * GET /api/v1/integration/health
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ACTIVE',
    service: 'Masuma B2B & TecAlliance Automotive Integration Gateway',
    version: '1.0.0',
    protocolsSupported: ['TecCom Order2Cash', 'TecDoc Article/OE Matrix', 'REST/JSON'],
    timestamp: new Date().toISOString(),
    currency: 'KES',
    system: 'Masuma Autoparts East Africa Ltd'
  });
});

/**
 * 2. Stock & Price Inquiry (TecCom StockAndPrice equivalent)
 * POST /api/v1/integration/inquiry
 * Checks live stock levels and pricing across branches for single or bulk articles/OEMs.
 */
const inquirySchema = z.object({
  items: z.array(z.object({
    identifier: z.string().min(1, 'Identifier (SKU or OEM number) is required'),
    requestedQuantity: z.number().int().positive().default(1)
  })).min(1, 'At least one item is required for inquiry')
});

router.post('/inquiry', validate(inquirySchema), async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    const productRepo = AppDataSource.getRepository(Product);
    const oemRepo = AppDataSource.getRepository(OemNumber);

    const results = [];

    for (const item of items) {
      const cleanId = item.identifier.trim();

      // Check by SKU first
      let product = await productRepo.findOne({
        where: { sku: cleanId },
        relations: ['stock', 'stock.branch', 'category', 'oemNumbers']
      });

      // If not found by SKU, check OEM numbers (column 'code')
      if (!product) {
        const oemMatch = await oemRepo.findOne({
          where: { code: cleanId },
          relations: ['product', 'product.stock', 'product.stock.branch', 'product.category', 'product.oemNumbers']
        });
        if (oemMatch && oemMatch.product) {
          product = oemMatch.product;
        }
      }

      if (!product) {
        results.push({
          queryIdentifier: item.identifier,
          found: false,
          status: 'NOT_FOUND',
          message: 'Part not registered in catalog'
        });
        continue;
      }

      // Calculate total stock and branch distribution
      const branchBreakdown = (product.stock || []).map((s: ProductStock) => ({
        branchId: s.branch?.id,
        branchName: s.branch?.name || 'Main Warehouse',
        quantity: s.quantity || 0
      }));

      const totalQuantity = branchBreakdown.reduce((sum, b) => sum + b.quantity, 0);
      const isAvailable = totalQuantity >= item.requestedQuantity;

      results.push({
        queryIdentifier: item.identifier,
        found: true,
        sku: product.sku,
        name: product.name,
        category: product.category?.name || 'General',
        brand: 'Masuma',
        retailPrice: Number(product.price).toFixed(2),
        wholesalePrice: product.wholesalePrice ? Number(product.wholesalePrice).toFixed(2) : null,
        currency: 'KES',
        requestedQuantity: item.requestedQuantity,
        availableQuantity: totalQuantity,
        isSufficient: isAvailable,
        availabilityStatus: totalQuantity > 0 ? (isAvailable ? 'IN_STOCK' : 'PARTIAL_STOCK') : 'OUT_OF_STOCK',
        branches: branchBreakdown,
        oemReferences: (product.oemNumbers || []).map(o => o.code)
      });
    }

    res.json({
      inquiryId: `INQ-${Date.now()}`,
      inquiryTimestamp: new Date().toISOString(),
      itemCount: results.length,
      results
    });
  } catch (error: any) {
    logger.error('Integration stock inquiry failed:', error);
    res.status(500).json({ error: 'Failed to process stock inquiry', details: error.message });
  }
});

/**
 * 3. Deep Article & OE Cross-Reference Lookup (TecDoc Matrix)
 * GET /api/v1/integration/parts/:identifier
 */
router.get('/parts/:identifier', async (req: Request, res: Response) => {
  try {
    const identifier = req.params.identifier.trim();
    const productRepo = AppDataSource.getRepository(Product);
    const oemRepo = AppDataSource.getRepository(OemNumber);

    let product = await productRepo.findOne({
      where: { sku: identifier },
      relations: ['category', 'oemNumbers', 'vehicles', 'stock', 'stock.branch']
    });

    if (!product) {
      const oem = await oemRepo.findOne({
        where: { code: identifier },
        relations: ['product', 'product.category', 'product.oemNumbers', 'product.vehicles', 'product.stock', 'product.stock.branch']
      });
      if (oem && oem.product) {
        product = oem.product;
      }
    }

    if (!product) {
      return res.status(404).json({
        error: 'Part not found',
        identifier,
        message: 'No matching part found for the specified SKU or OEM reference.'
      });
    }

    const totalStock = (product.stock || []).reduce((acc, s) => acc + (s.quantity || 0), 0);

    res.json({
      article: {
        id: product.id,
        sku: product.sku,
        name: product.name,
        brand: 'Masuma',
        brandId: '365', // Standard TecDoc Masuma brand identifier
        category: product.category?.name || 'Automotive',
        description: product.description,
        price: {
          retail: Number(product.price).toFixed(2),
          wholesale: product.wholesalePrice ? Number(product.wholesalePrice).toFixed(2) : null,
          currency: 'KES',
          taxIncluded: false,
          vatRate: '16%'
        },
        stock: {
          total: totalStock,
          status: totalStock > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK',
          branches: (product.stock || []).map(s => ({
            branchId: s.branch?.id,
            branchName: s.branch?.name,
            quantity: s.quantity
          }))
        },
        oemNumbers: (product.oemNumbers || []).map(o => o.code),
        vehicleFitments: (product.vehicles || []).map(v => ({
          make: v.make,
          model: v.model,
          rawDisplay: `${v.make} ${v.model}`
        })),
        media: {
          primaryImage: product.imageUrl,
          gallery: product.images || [],
          videoUrl: product.videoUrl
        },
        warrantyMonths: 12
      }
    });
  } catch (error: any) {
    logger.error(`Integration part lookup failed for ${req.params.identifier}:`, error);
    res.status(500).json({ error: 'Internal lookup error', details: error.message });
  }
});

/**
 * 4. Automated B2B Order Placement (TecCom Order2Cash)
 * POST /api/v1/integration/orders
 */
const integrationOrderSchema = z.object({
  partnerPoNumber: z.string().min(1, 'Partner PO number is required'),
  customerName: z.string().min(1, 'Customer/Company name is required'),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().min(5, 'Phone number is required'),
  shippingAddress: z.string().min(1, 'Shipping destination address is required'),
  items: z.array(z.object({
    sku: z.string().min(1, 'SKU is required'),
    quantity: z.number().int().positive('Quantity must be greater than 0'),
    expectedUnitPrice: z.number().positive().optional()
  })).min(1, 'Order must contain at least one line item')
});

router.post('/orders', validate(integrationOrderSchema), async (req: Request, res: Response) => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const { partnerPoNumber, customerName, customerEmail, customerPhone, shippingAddress, items } = req.body;
    const productRepo = queryRunner.manager.getRepository(Product);

    let subtotal = 0;
    const orderItems: OrderItem[] = [];

    for (const item of items) {
      const product = await productRepo.findOne({
        where: { sku: item.sku },
        relations: ['stock']
      });

      if (!product) {
        throw new Error(`SKU ${item.sku} not found in catalog`);
      }

      const totalStock = (product.stock || []).reduce((acc, s) => acc + (s.quantity || 0), 0);
      if (totalStock < item.quantity) {
        throw new Error(`Insufficient stock for SKU ${item.sku}. Requested: ${item.quantity}, Available: ${totalStock}`);
      }

      const unitPrice = product.wholesalePrice ? Number(product.wholesalePrice) : Number(product.price);
      subtotal += unitPrice * item.quantity;

      const orderItem = new OrderItem();
      orderItem.product = product;
      orderItem.quantity = item.quantity;
      orderItem.price = unitPrice;
      orderItems.push(orderItem);
    }

    const orderNumber = `B2B-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const order = new Order();
    order.orderNumber = orderNumber;
    order.customerName = customerName;
    order.customerEmail = customerEmail || `${partnerPoNumber.toLowerCase()}@partner.masuma.africa`;
    order.customerPhone = customerPhone;
    order.shippingAddress = `${shippingAddress} [PO: ${partnerPoNumber}]`;
    order.totalAmount = Number(subtotal.toFixed(2));
    order.amountPaid = 0;
    order.balance = Number(subtotal.toFixed(2));
    order.discountAmount = 0;
    order.status = OrderStatus.PENDING;
    order.paymentMethod = 'B2B_INVOICE';
    order.siteSource = 'B2B_INTEGRATION_API';
    order.items = orderItems;

    await queryRunner.manager.save(order);
    await queryRunner.commitTransaction();

    logger.info(`B2B Order successfully created via Integration API: ${orderNumber} for PO: ${partnerPoNumber}`);

    res.status(201).json({
      success: true,
      message: 'B2B Order placed successfully',
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        partnerPoNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        currency: 'KES',
        itemsCount: orderItems.length,
        createdAt: order.createdAt
      }
    });
  } catch (error: any) {
    await queryRunner.rollbackTransaction();
    logger.error('Failed to create B2B integration order:', error);
    res.status(400).json({
      error: 'Order creation rejected',
      message: error.message
    });
  } finally {
    await queryRunner.release();
  }
});

/**
 * 5. Full TecDoc Supplier Catalog Feed Export
 * GET /api/v1/integration/tecdoc/export
 * Dumps all products formatted with TecDoc Article identifiers, OEM numbers, and vehicle linkages.
 */
router.get('/tecdoc/export', async (req: Request, res: Response) => {
  try {
    const productRepo = AppDataSource.getRepository(Product);
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 500, 1000);

    const [products, total] = await productRepo.findAndCount({
      relations: ['category', 'oemNumbers', 'vehicles', 'stock'],
      skip: (page - 1) * limit,
      take: limit,
      order: { sku: 'ASC' }
    });

    const articles = products.map((p) => {
      const stockTotal = (p.stock || []).reduce((acc, s) => acc + (s.quantity || 0), 0);
      return {
        brand: 'Masuma',
        brandId: 365,
        articleNo: p.sku,
        articleDescription: p.name,
        category: p.category?.name || 'Automotive Parts',
        priceKES: Number(p.price).toFixed(2),
        wholesalePriceKES: p.wholesalePrice ? Number(p.wholesalePrice).toFixed(2) : null,
        stockAvailable: stockTotal,
        oeNumbers: (p.oemNumbers || []).map(o => o.code),
        linkages: (p.vehicles || []).map(v => ({
          make: v.make,
          model: v.model
        }))
      };
    });

    res.json({
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        timestamp: new Date().toISOString()
      },
      articles
    });
  } catch (error: any) {
    logger.error('Failed to export TecDoc feed:', error);
    res.status(500).json({ error: 'Failed to generate TecDoc catalog feed', details: error.message });
  }
});

export default router;
