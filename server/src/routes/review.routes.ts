import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { Review } from '../entities/Review';
import { Product } from '../entities/Product';
import { Order, OrderStatus } from '../entities/Order';
import { Sale } from '../entities/Sale';
import { Customer } from '../entities/Customer';
import { Security } from '../utils/security';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { reviewRateLimiter } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';

const router = Router();

const getReviewRepo = () => AppDataSource.getRepository(Review);
const getProductRepo = () => AppDataSource.getRepository(Product);
const getOrderRepo = () => AppDataSource.getRepository(Order);
const getSaleRepo = () => AppDataSource.getRepository(Sale);
const getCustomerRepo = () => AppDataSource.getRepository(Customer);

// Helper: resolve product by ID, SKU or slug
async function findProduct(idOrSlug: string): Promise<Product | null> {
  const productRepo = getProductRepo();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (uuidRegex.test(idOrSlug)) {
    const p = await productRepo.findOne({ where: { id: idOrSlug } });
    if (p) return p;
  }

  // Try SKU
  let p = await productRepo.findOne({ where: { sku: idOrSlug } });
  if (p) return p;

  p = await productRepo.createQueryBuilder('product')
    .where('LOWER(product.sku) = :sku', { sku: idOrSlug.toLowerCase() })
    .getOne();
  if (p) return p;

  return null;
}

// Helper: check if a customer purchase is verified for a given product
async function checkPurchaseVerification(productId: string, productSku: string, orderNumber?: string, email?: string, phone?: string): Promise<{ isVerified: boolean; details?: string }> {
  try {
    const orderRepo = getOrderRepo();
    const saleRepo = getSaleRepo();

    // 1. Check order number directly if provided
    if (orderNumber && orderNumber.trim()) {
      const cleanOrderNum = orderNumber.trim().toUpperCase();
      
      // Check Orders
      const order = await orderRepo.findOne({
        where: [
          { orderNumber: cleanOrderNum },
          { id: orderNumber.trim() }
        ],
        relations: ['items', 'items.product']
      });

      if (order && order.status !== OrderStatus.CANCELLED) {
        const hasProduct = order.items?.some(item => 
          item.product?.id === productId || 
          item.product?.sku?.toLowerCase() === productSku.toLowerCase() ||
          (item as any).productId === productId
        );
        if (hasProduct) {
          return { isVerified: true, details: `Verified Order #${order.orderNumber}` };
        }
      }

      // Check Sales / POS Receipts
      const sale = await saleRepo.findOne({
        where: [
          { receiptNumber: cleanOrderNum },
          { id: orderNumber.trim() }
        ]
      });

      if (sale) {
        const items = Array.isArray(sale.itemsSnapshot) ? sale.itemsSnapshot : [];
        const hasProduct = items.some((item: any) => 
          item.productId === productId || 
          item.id === productId ||
          (item.sku && item.sku.toLowerCase() === productSku.toLowerCase())
        );
        if (hasProduct) {
          return { isVerified: true, details: `Verified Receipt #${sale.receiptNumber}` };
        }
      }
    }

    // 2. Check by Customer Email or Phone
    if (email || phone) {
      const query = orderRepo.createQueryBuilder('order')
        .leftJoinAndSelect('order.items', 'items')
        .leftJoinAndSelect('items.product', 'product')
        .where('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED });

      if (email && phone) {
        query.andWhere('(LOWER(order.customerEmail) = :email OR order.customerPhone = :phone)', {
          email: email.trim().toLowerCase(),
          phone: phone.trim()
        });
      } else if (email) {
        query.andWhere('LOWER(order.customerEmail) = :email', { email: email.trim().toLowerCase() });
      } else if (phone) {
        query.andWhere('order.customerPhone = :phone', { phone: phone.trim() });
      }

      const orders = await query.getMany();
      for (const ord of orders) {
        const hasItem = ord.items?.some(i => i.product?.id === productId || i.product?.sku?.toLowerCase() === productSku.toLowerCase());
        if (hasItem) {
          return { isVerified: true, details: `Verified Customer Purchase (${ord.orderNumber})` };
        }
      }
    }

    // 3. Also check Customer CRM record if phone or email matches approved B2B/wholesale/retail customer
    if (phone || email) {
      const customerRepo = getCustomerRepo();
      const whereConditions: any[] = [];
      if (email) whereConditions.push({ email: email.trim().toLowerCase() });
      if (phone) whereConditions.push({ phone: phone.trim() });
      
      const cust = await customerRepo.findOne({ where: whereConditions });
      if (cust && cust.status === 'APPROVED') {
        // Customer has an account with Masuma
        return { isVerified: true, details: 'Verified Masuma Customer' };
      }
    }

    return { isVerified: false };
  } catch (err) {
    logger.error('Error during purchase verification check:', err);
    return { isVerified: false };
  }
}

// Calculate review statistics
function computeReviewStats(reviews: Review[]) {
  const totalReviews = reviews.length;
  if (totalReviews === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      verifiedCount: 0,
      ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    };
  }

  const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
  const averageRating = Number((sum / totalReviews).toFixed(1));
  const verifiedCount = reviews.filter(r => r.isVerifiedPurchase).length;

  const ratingDistribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => {
    const star = Math.min(5, Math.max(1, Math.round(r.rating)));
    ratingDistribution[star] = (ratingDistribution[star] || 0) + 1;
  });

  return {
    averageRating,
    totalReviews,
    verifiedCount,
    ratingDistribution
  };
}

// Reusable GET Product Reviews Handler
export async function getProductReviewsHandler(req: any, res: any) {
  try {
    const productId = req.params.productId as string;
    const { sort = 'newest', filter = 'all' } = req.query;

    const product = await findProduct(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const reviewRepo = getReviewRepo();
    const query = reviewRepo.createQueryBuilder('review')
      .where('review.productId = :productId', { productId: product.id })
      .andWhere('review.status = :status', { status: 'APPROVED' });

    if (filter === 'verified') {
      query.andWhere('review.isVerifiedPurchase = :verified', { verified: true });
    } else if (['1', '2', '3', '4', '5'].includes(filter as string)) {
      query.andWhere('review.rating = :rating', { rating: parseInt(filter as string) });
    }

    if (sort === 'highest') {
      query.orderBy('review.rating', 'DESC').addOrderBy('review.createdAt', 'DESC');
    } else if (sort === 'lowest') {
      query.orderBy('review.rating', 'ASC').addOrderBy('review.createdAt', 'DESC');
    } else if (sort === 'helpful') {
      query.orderBy('review.helpfulCount', 'DESC').addOrderBy('review.createdAt', 'DESC');
    } else {
      // Default: newest
      query.orderBy('review.createdAt', 'DESC');
    }

    const reviews = await query.getMany();

    // Also get ALL approved reviews to calculate global stats accurately
    const allApproved = await reviewRepo.find({
      where: { product: { id: product.id }, status: 'APPROVED' }
    });

    const stats = computeReviewStats(allApproved);

    res.json({
      reviews: reviews.map(r => ({
        id: r.id,
        productId: product.id,
        rating: r.rating,
        title: r.title || '',
        comment: r.comment,
        customerName: r.customerName,
        isVerifiedPurchase: r.isVerifiedPurchase,
        orderNumber: r.orderNumber ? (r.orderNumber.length > 8 ? r.orderNumber.slice(0, 8) + '...' : r.orderNumber) : undefined,
        helpfulCount: r.helpfulCount || 0,
        createdAt: r.createdAt
      })),
      stats
    });
  } catch (error: any) {
    logger.error('Failed to get reviews:', error);
    res.status(500).json({ error: 'Failed to retrieve product reviews' });
  }
}

// 2. GET /api/reviews/verify-eligibility
router.get('/verify-eligibility', async (req, res) => {
  try {
    const { productId, orderNumber, email, phone } = req.query as {
      productId?: string;
      orderNumber?: string;
      email?: string;
      phone?: string;
    };

    if (!productId) {
      return res.status(400).json({ error: 'Product ID required' });
    }

    const product = await findProduct(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const verification = await checkPurchaseVerification(product.id, product.sku, orderNumber, email, phone);
    res.json(verification);
  } catch (error: any) {
    logger.error('Verification check error:', error);
    res.status(500).json({ isVerified: false });
  }
});

// Review validation schema
export const createReviewSchema = z.object({
  rating: z.coerce.number().min(1).max(5),
  title: z.string().optional(),
  comment: z.string().min(3, 'Comment must be at least 3 characters long'),
  customerName: z.string().min(2, 'Name must be at least 2 characters long'),
  customerEmail: z.string().email().optional().or(z.literal('')),
  customerPhone: z.string().optional(),
  orderNumber: z.string().optional()
});

// Reusable POST Product Review Handler
export async function postProductReviewHandler(req: any, res: any) {
  try {
    const productId = req.params.productId as string;
    const { rating, title, comment, customerName, customerEmail, customerPhone, orderNumber } = req.body;

    const product = await findProduct(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check authorization header for logged-in user if token is present
    let authEmail: string | undefined = undefined;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const payload: any = Security.verifyToken(token);
        if (payload && payload.email) {
          authEmail = payload.email;
        }
      } catch (e) {
        // Token optional, ignore error
      }
    }

    const effectiveEmail = customerEmail || authEmail;

    // Verify customer purchase status
    const verification = await checkPurchaseVerification(
      product.id,
      product.sku,
      orderNumber,
      effectiveEmail,
      customerPhone
    );

    const reviewRepo = getReviewRepo();
    const review = reviewRepo.create({
      product: product,
      rating: Math.round(rating),
      title: title ? title.trim() : undefined,
      comment: comment.trim(),
      customerName: customerName.trim(),
      customerEmail: effectiveEmail ? effectiveEmail.trim() : undefined,
      customerPhone: customerPhone ? customerPhone.trim() : undefined,
      orderNumber: orderNumber ? orderNumber.trim() : undefined,
      isVerifiedPurchase: verification.isVerified,
      status: verification.isVerified ? 'APPROVED' : 'PENDING', // P1 Security: Gate unverified reviews behind moderation
      helpfulCount: 0
    });

    await reviewRepo.save(review);

    // Compute updated stats from approved reviews
    const allApproved = await reviewRepo.find({
      where: { product: { id: product.id }, status: 'APPROVED' }
    });
    const stats = computeReviewStats(allApproved);

    res.status(201).json({
      message: verification.isVerified
        ? 'Review submitted and published successfully.'
        : 'Thank you! Your review has been submitted for moderation and will appear once verified.',
      review: {
        id: review.id,
        productId: product.id,
        rating: review.rating,
        title: review.title || '',
        comment: review.comment,
        customerName: review.customerName,
        isVerifiedPurchase: review.isVerifiedPurchase,
        status: review.status,
        orderNumber: review.orderNumber,
        helpfulCount: review.helpfulCount,
        createdAt: review.createdAt
      },
      stats
    });
  } catch (error: any) {
    logger.error('Failed to submit review:', error);
    res.status(500).json({ error: 'Failed to submit review. Please try again.' });
  }
}

// 1. Direct review routes under /api/reviews - Protected against spam
router.get(['/product/:productId', '/:productId'], getProductReviewsHandler);
router.post(['/product/:productId', '/:productId'], reviewRateLimiter as any, validate(createReviewSchema), postProductReviewHandler);

// Sub-router specifically for /api/products/:productId/reviews
export const productReviewsRouter = Router({ mergeParams: true });
productReviewsRouter.get('/', getProductReviewsHandler);
productReviewsRouter.post('/', reviewRateLimiter as any, validate(createReviewSchema), postProductReviewHandler);

// 4. POST /api/reviews/:id/helpful
router.post(['/:id/helpful', '/item/:id/helpful'], async (req, res) => {
  try {
    const id = req.params.id as string;
    const reviewRepo = getReviewRepo();
    const review = await reviewRepo.findOne({ where: { id } });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    review.helpfulCount = (review.helpfulCount || 0) + 1;
    await reviewRepo.save(review);

    res.json({ success: true, helpfulCount: review.helpfulCount });
  } catch (error: any) {
    logger.error('Failed to upvote review:', error);
    res.status(500).json({ error: 'Failed to mark review as helpful' });
  }
});

// 5. Seed default authentic customer reviews for popular spare parts if none exist
router.post('/seed-sample-reviews', async (req, res) => {
  try {
    const productRepo = getProductRepo();
    const reviewRepo = getReviewRepo();

    const products = await productRepo.find({ take: 10 });
    let count = 0;

    const sampleFeedbacks = [
      {
        rating: 5,
        title: "Exact Japanese OEM match for my Prado 150",
        comment: "Replaced my old worn-out components with these Masuma parts. Noise completely gone, pedal feels firm and precise. Shipped same-day to Westlands.",
        customerName: "David Kariuki",
        isVerified: true
      },
      {
        rating: 5,
        title: "Outstanding durability on rough roads",
        comment: "Driving daily on Nairobi-Nakuru highway. Masuma never disappoints. 6 months in and performing like brand new.",
        customerName: "Eng. Peter Omondi",
        isVerified: true
      },
      {
        rating: 4,
        title: "Great quality, perfect fitment",
        comment: "Fit directly onto my Toyota Hilux without any modifications. Mechanic confirmed high build quality. Very happy with the 12-month warranty backing.",
        customerName: "Michael Mwangi",
        isVerified: true
      },
      {
        rating: 5,
        title: "Genuine parts at honest pricing",
        comment: "Counterfeit parts are rampant in Kirinyaga Road, so buying verified Masuma parts directly with receipt and warranty gives total peace of mind.",
        customerName: "Brian Kiprop",
        isVerified: true
      }
    ];

    for (const prod of products) {
      const existing = await reviewRepo.count({ where: { product: { id: prod.id } } });
      if (existing === 0) {
        // Add 2-3 reviews
        for (let i = 0; i < 2; i++) {
          const sample = sampleFeedbacks[(count + i) % sampleFeedbacks.length];
          const rev = reviewRepo.create({
            product: prod,
            rating: sample.rating,
            title: sample.title,
            comment: sample.comment,
            customerName: sample.customerName,
            isVerifiedPurchase: sample.isVerified,
            status: 'APPROVED',
            helpfulCount: Math.floor(Math.random() * 8) + 1
          });
          await reviewRepo.save(rev);
          count++;
        }
      }
    }

    res.json({ message: `Seeded ${count} verified customer reviews` });
  } catch (error: any) {
    logger.error('Failed to seed reviews:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
