import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Product } from '../entities/Product';
import { Vehicle } from '../entities/Vehicle';
import { Category } from '../entities/Category';
import { getComplementaryCategories, getCrossSellReason } from '../utils/crossSellEngine';

const router = Router();

// Popular East Africa vehicle hubs for programmatic indexing
export const POPULAR_VEHICLE_HUBS = [
  { make: 'Toyota', model: 'Corolla Fielder', chassis: 'NZE141 / NZE161', aliases: ['fielder', 'corolla-fielder', 'nze141', 'nze161'] },
  { make: 'Toyota', model: 'Premio', chassis: 'NZT260 / ZRT260', aliases: ['premio', 'allion', 'zrt260', 'nzt260'] },
  { make: 'Toyota', model: 'Probox / Succeed', chassis: 'NCP51 / NCP58 / NCP160', aliases: ['probox', 'succeed', 'ncp51', 'ncp160'] },
  { make: 'Toyota', model: 'Land Cruiser Prado', chassis: 'KDJ120 / KDJ150 / TRJ150', aliases: ['prado', 'land-cruiser-prado', 'kdj150', 'trj150'] },
  { make: 'Toyota', model: 'Vitz / Yaris', chassis: 'KSP130 / NSP130 / SCP90', aliases: ['vitz', 'yaris', 'ksp130', 'nsp130'] },
  { make: 'Toyota', model: 'Hiace', chassis: 'KDH200 / TRH200', aliases: ['hiace', 'kdh200', 'trh200'] },
  { make: 'Toyota', model: 'Prius', chassis: 'ZVW30 / ZVW50', aliases: ['prius', 'zvw30', 'zvw50'] },
  { make: 'Subaru', model: 'Forester', chassis: 'SG5 / SH5 / SJ5 / SK9', aliases: ['forester', 'sg5', 'sh5', 'sj5'] },
  { make: 'Subaru', model: 'Outback / Legacy', chassis: 'BP5 / BR9 / BS9', aliases: ['outback', 'legacy', 'bp5', 'br9'] },
  { make: 'Subaru', model: 'XV / Impreza', chassis: 'GP7 / GT7 / GJ7', aliases: ['xv', 'impreza', 'gp7'] },
  { make: 'Nissan', model: 'X-Trail', chassis: 'T31 / T32 / NT31', aliases: ['x-trail', 'xtrail', 't31', 't32'] },
  { make: 'Nissan', model: 'Note', chassis: 'E11 / E12 / NE12', aliases: ['note', 'e11', 'e12'] },
  { make: 'Nissan', model: 'Serena', chassis: 'C26 / C27', aliases: ['serena', 'c26', 'c27'] },
  { make: 'Honda', model: 'Fit', chassis: 'GE6 / GK3 / GP5', aliases: ['fit', 'jazz', 'gk3', 'gp5'] },
  { make: 'Honda', model: 'Vezel / HR-V', chassis: 'RU1 / RU3', aliases: ['vezel', 'hr-v', 'ru3'] },
  { make: 'Mazda', model: 'Demio', chassis: 'DE3FS / DJ5FS', aliases: ['demio', 'mazda2', 'dj5fs'] },
  { make: 'Mazda', model: 'CX-5', chassis: 'KE2FW / KF2P', aliases: ['cx-5', 'cx5', 'kf2p'] }
];

export const PRIMARY_CATEGORIES = [
  { name: 'Brake Pads', slug: 'brake-pads' },
  { name: 'Shock Absorbers', slug: 'shock-absorbers' },
  { name: 'Filters', slug: 'filters' },
  { name: 'Spark Plugs', slug: 'spark-plugs' },
  { name: 'Suspension Bushings', slug: 'suspension-bushings' },
  { name: 'Ball Joints', slug: 'ball-joints' }
];

/**
 * Normalizes input slug into recognizable make/model/category strings
 */
function cleanSegment(str: string | undefined): string {
  if (!str) return '';
  return decodeURIComponent(str).replace(/[-_]+/g, ' ').trim().toLowerCase();
}

function formatProductPayload(p: any) {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    category: p.category?.name || 'Uncategorized',
    price: Number(p.price || 0),
    costPrice: Number(p.costPrice || 0),
    wholesalePrice: Number(p.wholesalePrice || 0),
    description: p.description || '',
    image: p.imageUrl || '',
    images: p.images || [],
    videoUrl: p.videoUrl || '',
    quantity: Array.isArray(p.stock) ? p.stock.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0) : 0,
    stock: Array.isArray(p.stock) ? p.stock.some((s: any) => s.quantity > 0) : true,
    oemNumbers: (p.oemNumbers || []).map((o: any) => o.code || o.number || o).filter(Boolean),
    compatibility: (p.vehicles || []).map((v: any) => v.make === 'Generic' ? v.model : `${v.make} ${v.model}`),
    averageRating: 5.0,
    reviewCount: 0
  };
}

/**
 * GET /api/compatibility/hubs
 * Returns popular vehicle hubs and categories for landing pages & sitemaps
 */
router.get('/hubs', async (_req: Request, res: Response) => {
  try {
    const categoryRepo = AppDataSource.getRepository(Category);
    const dbCategories = await categoryRepo.find({ select: ['id', 'name'] });

    return res.json({
      vehicleHubs: POPULAR_VEHICLE_HUBS,
      categories: dbCategories.length > 0 ? dbCategories : PRIMARY_CATEGORIES
    });
  } catch (error) {
    console.error('Error fetching compatibility hubs:', error);
    return res.status(500).json({ error: 'Failed to load compatibility hubs' });
  }
});

/**
 * GET /api/compatibility/:make/:model/:category?
 * Programmatic compatibility query for Make + Model + Category
 */
router.get('/:make/:model/:category?', async (req: Request, res: Response) => {
  try {
    const rawMake = req.params.make;
    const rawModel = req.params.model;
    const rawCategory = req.params.category;

    const cleanMake = cleanSegment(rawMake);
    const cleanModel = cleanSegment(rawModel);
    const cleanCat = cleanSegment(rawCategory);

    const productRepo = AppDataSource.getRepository(Product);

    // Build vehicle-specific product query
    const qb = productRepo.createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.oemNumbers', 'oem')
      .leftJoinAndSelect('product.vehicles', 'vehicle')
      .leftJoinAndSelect('product.stock', 'stock');

    // Match vehicle make (e.g. Toyota, Subaru, Nissan)
    if (cleanMake) {
      qb.andWhere('LOWER(vehicle.make) LIKE :make', { make: `%${cleanMake}%` });
    }

    // Match model tokens (e.g. "corolla", "fielder", "nze141")
    if (cleanModel) {
      const modelTokens = cleanModel.split(/\s+/).filter(t => t.length > 1);
      if (modelTokens.length > 0) {
        const conditions = modelTokens.map((_, i) => `LOWER(vehicle.model) LIKE :mToken${i}`).join(' OR ');
        const params: Record<string, string> = {};
        modelTokens.forEach((t, i) => { params[`mToken${i}`] = `%${t}%`; });
        qb.andWhere(`(${conditions})`, params);
      }
    }

    // Match category if requested
    if (cleanCat && cleanCat !== 'all') {
      qb.andWhere('LOWER(category.name) LIKE :cat', { cat: `%${cleanCat}%` });
    }

    const products = await qb.orderBy('product.updatedAt', 'DESC').take(40).getMany();

    // Collect all OEM cross-reference codes for this vehicle & category cluster
    const oemSet = new Set<string>();
    products.forEach(p => {
      (p.oemNumbers || []).forEach(o => {
        const code = o.code || (o as any).number;
        if (code) oemSet.add(code.trim());
      });
    });

    // Determine target category name for cross-selling
    const targetCategory = products[0]?.category?.name || (cleanCat ? cleanCat.toUpperCase() : 'Brake Pads');
    const complementaryCats = getComplementaryCategories(targetCategory);
    const crossSellReason = getCrossSellReason(targetCategory);

    // Fetch related cross-sells
    let relatedCrossSells: any[] = [];
    if (complementaryCats.length > 0) {
      try {
        const crossQb = productRepo.createQueryBuilder('product')
          .leftJoinAndSelect('product.category', 'category')
          .leftJoinAndSelect('product.stock', 'stock')
          .where('LOWER(category.name) IN (:...cats)', { cats: complementaryCats.map(c => c.toLowerCase()) });

        if (cleanMake) {
          crossQb.leftJoin('product.vehicles', 'v')
            .andWhere('(LOWER(v.make) LIKE :make OR v.make IS NULL)', { make: `%${cleanMake}%` });
        }

        relatedCrossSells = await crossQb.take(6).getMany();
      } catch (e) {
        // Fallback gracefully
      }
    }

    // Format human-readable title
    const displayMake = cleanMake.charAt(0).toUpperCase() + cleanMake.slice(1);
    const displayModel = cleanModel.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const displayCategory = cleanCat ? cleanCat.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'All Parts';

    return res.json({
      make: displayMake,
      model: displayModel,
      category: displayCategory,
      totalCount: products.length,
      products: products.map(formatProductPayload),
      oemNumbers: Array.from(oemSet).slice(0, 20),
      crossSell: {
        reason: crossSellReason,
        complementaryCategories: complementaryCats,
        products: relatedCrossSells.map(formatProductPayload)
      },
      guaranteedFitment: true
    });
  } catch (error) {
    console.error('Error querying compatibility route:', error);
    return res.status(500).json({ error: 'Failed to query compatibility data' });
  }
});

export default router;
