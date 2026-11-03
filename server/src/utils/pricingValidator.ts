import { AppDataSource } from '../config/database';
import { Product } from '../entities/Product';
import { PromoCode } from '../entities/PromoCode';
import { In } from 'typeorm';
import { logger } from './logger';

export interface RawOrderItemInput {
  productId: string;
  quantity: number;
}

export interface VerifiedOrderItem {
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface PricingCalculationResult {
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  totalAmount: number;
  promoCodeUsed?: string;
  promoEntity?: PromoCode;
  items: VerifiedOrderItem[];
}

/**
 * Enterprise Server-Side Pricing & Discount Verification Engine
 * 
 * Guarantees that:
 * 1. Unit prices are strictly derived from authoritative database records (zero client price trust).
 * 2. Quantities are validated positive integers.
 * 3. Promotional discounts are strictly verified against the database PromoCode entity.
 * 4. VAT (16%) and totals are computed with floating-point precision guards.
 */
export async function calculateAuthoritativePricing(
  rawItems: RawOrderItemInput[],
  promoCode?: string
): Promise<PricingCalculationResult> {
  if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('Order must contain at least one item.');
  }

  // 1. Sanitize quantities and collect product IDs
  const productRepo = AppDataSource.getRepository(Product);
  const sanitizedItems: Array<{ productId: string; quantity: number }> = [];

  for (const item of rawItems) {
    const qty = Math.floor(Number(item.quantity));
    if (isNaN(qty) || qty < 1) {
      throw new Error(`Invalid quantity ${item.quantity} for product ${item.productId}`);
    }
    if (qty > 100) {
      throw new Error(`Quantity ${qty} exceeds maximum allowable threshold (100) per line item.`);
    }
    sanitizedItems.push({ productId: String(item.productId).trim(), quantity: qty });
  }

  const uniqueProductIds = Array.from(new Set(sanitizedItems.map(i => i.productId)));
  const products = await productRepo.find({
    where: { id: In(uniqueProductIds) },
    select: ['id', 'name', 'sku', 'price']
  });

  const productMap = new Map<string, Product>();
  products.forEach(p => productMap.set(p.id, p));

  // 2. Build verified items with authoritative prices
  let subtotal = 0;
  const verifiedItems: VerifiedOrderItem[] = [];

  for (const item of sanitizedItems) {
    const product = productMap.get(item.productId);
    if (!product) {
      logger.warn(`Security Warning: Order submission with non-existent product ID: ${item.productId}`);
      throw new Error(`Product with ID ${item.productId} was not found in active inventory.`);
    }

    const unitPrice = Number(product.price);
    if (isNaN(unitPrice) || unitPrice < 0) {
      throw new Error(`Invalid authoritative price for product ${product.sku}`);
    }

    const lineTotal = parseFloat((unitPrice * item.quantity).toFixed(2));
    subtotal = parseFloat((subtotal + lineTotal).toFixed(2));

    verifiedItems.push({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      unitPrice,
      quantity: item.quantity,
      lineTotal
    });
  }

  // 3. Authoritative Promotional Discount Verification
  let discountAmount = 0;
  let promoEntity: PromoCode | undefined;
  let cleanPromoCode: string | undefined;

  if (promoCode && typeof promoCode === 'string' && promoCode.trim().length > 0) {
    cleanPromoCode = promoCode.trim().toUpperCase();
    const promoRepo = AppDataSource.getRepository(PromoCode);
    const promo = await promoRepo.findOne({
      where: { code: cleanPromoCode, isActive: true }
    });

    if (promo) {
      const now = new Date();
      const startDate = new Date(promo.startDate);
      const endDate = new Date(promo.endDate);

      const isDateValid = now >= startDate && now <= endDate;
      const isUsageValid = promo.usageLimit <= 0 || promo.currentUsage < promo.usageLimit;

      if (isDateValid && isUsageValid) {
        if (promo.type === 'PERCENTAGE') {
          discountAmount = parseFloat(((subtotal * Number(promo.value)) / 100).toFixed(2));
        } else {
          discountAmount = parseFloat(Math.min(subtotal, Number(promo.value)).toFixed(2));
        }
        discountAmount = Math.min(subtotal, Math.max(0, discountAmount));
        promoEntity = promo;
      } else {
        logger.warn(`Rejected expired/exhausted promo code: ${cleanPromoCode}`);
        cleanPromoCode = undefined;
      }
    } else {
      logger.warn(`Rejected invalid promo code: ${cleanPromoCode}`);
      cleanPromoCode = undefined;
    }
  }

  // 4. Compute Net Taxable, Kenya 16% VAT, and Final Total
  const netTaxable = Math.max(0, parseFloat((subtotal - discountAmount).toFixed(2)));
  const vatAmount = parseFloat((netTaxable * 0.16).toFixed(2));
  const totalAmount = parseFloat((netTaxable + vatAmount).toFixed(2));

  return {
    subtotal,
    discountAmount,
    vatAmount,
    totalAmount,
    promoCodeUsed: cleanPromoCode,
    promoEntity,
    items: verifiedItems
  };
}
