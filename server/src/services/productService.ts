import { AppDataSource } from '../config/database';
import { Product } from '../entities/Product';
import { Category } from '../entities/Category';
import { OemNumber } from '../entities/OemNumber';
import { ProductStock } from '../entities/ProductStock';
import { Branch } from '../entities/Branch';
import { Vehicle } from '../entities/Vehicle'; 
import { StockAlert } from '../entities/StockAlert';
import { CacheService } from '../lib/cache';
import { AuditService } from './auditService';
import { User } from '../entities/User';
import { Review } from '../entities/Review';
import { In } from 'typeorm';
import { generateSlug } from '../utils/slug';
import { analyzeSemanticQuery } from './semanticSearch';
import { correctTypo } from '../utils/typoCorrection';
import { Buffer } from 'buffer';

const AUTOMOTIVE_SYNONYMS: Record<string, string[]> = {
  'engine': ['motor'],
  'motor': ['engine'],
  'oil': ['lubricant', 'motor oil'],
  'oils': ['oil', 'motor oil', 'lubricant'],
  'lube': ['oil', 'lubricant'],
  'lubricant': ['oil', 'motor oil'],
  'lubricants': ['oil', 'motor oil', 'lubricant'],
  'shocks': ['shock', 'strut'],
  'shock': ['strut', 'shock absorber'],
  'struts': ['strut', 'shock'],
  'strut': ['shock', 'shock absorber'],
  'bushes': ['bushing', 'bush'],
  'bush': ['bushing'],
  'bushings': ['bushing'],
  'pads': ['pad', 'brake pad'],
  'rotors': ['rotor', 'disc', 'brake disc'],
  'rotor': ['disc', 'brake disc'],
  'discs': ['disc', 'rotor'],
  'disc': ['rotor'],
  'plugs': ['plug', 'spark plug'],
  'coils': ['coil', 'ignition coil'],
  'filters': ['filter'],
  'belts': ['belt'],
  'wipers': ['wiper', 'blade'],
  'blades': ['blade', 'wiper']
};

export class ProductService {
  private static productRepo = AppDataSource.getRepository(Product);
  private static categoryRepo = AppDataSource.getRepository(Category);
  private static stockRepo = AppDataSource.getRepository(ProductStock);
  private static branchRepo = AppDataSource.getRepository(Branch);
  private static vehicleRepo = AppDataSource.getRepository(Vehicle);
  private static stockAlertRepo = AppDataSource.getRepository(StockAlert);
  
  private static async processVehicles(compatibility: string[]): Promise<Vehicle[]> {
      const vehicles: Vehicle[] = [];
      for (const item of compatibility) {
          const cleanItem = item.trim();
          if (!cleanItem) continue;

          const parts = cleanItem.split(/\s+/);
          
          let make = 'Generic';
          let model = cleanItem;

          if (parts.length > 1) {
              make = parts[0]; 
              model = parts.slice(1).join(' ');
          }

          let vehicle = await this.vehicleRepo.findOne({ 
              where: { make: make, model: model } 
          });
          
          if (!vehicle) {
              vehicle = this.vehicleRepo.create({ make, model });
              await this.vehicleRepo.save(vehicle);
          }
          vehicles.push(vehicle);
      }
      return vehicles;
  }

  static async getAllProducts(
    query: string = '',
    categoryName: string = 'All',
    page: number = 1,
    limit: number = 50,
    sort: string = 'featured',
    filters?: {
      minPrice?: number;
      maxPrice?: number;
      inStockOnly?: boolean;
    }
  ) {
      // P1 Security & Performance Guard: Clamp query and pagination limits to prevent DoS query explosion
      const sanitizedQuery = (query || '').trim().slice(0, 100);
      const sanitizedCategory = (categoryName || 'All').trim().slice(0, 50);
      const safePage = Math.max(1, Math.min(1000, page || 1));
      const safeLimit = Math.max(1, Math.min(100, limit || 50));
      const safeSort = (sort || 'featured').trim().toLowerCase();
      const minPrice = filters?.minPrice !== undefined && !isNaN(filters.minPrice) ? Math.max(0, filters.minPrice) : undefined;
      const maxPrice = filters?.maxPrice !== undefined && !isNaN(filters.maxPrice) ? Math.max(0, filters.maxPrice) : undefined;
      const inStockOnly = !!filters?.inStockOnly;
      
      const cacheKey = `products:search:${Buffer.from(`${sanitizedQuery}:${sanitizedCategory}:${safePage}:${safeLimit}:${safeSort}:${minPrice ?? ''}:${maxPrice ?? ''}:${inStockOnly}`).toString('base64')}`;

      return CacheService.getOrSet(cacheKey, async () => {
        const skip = (safePage - 1) * safeLimit;
        
        const applySorting = (queryBuilder: any, sortOrder: string) => {
          switch (sortOrder) {
            case 'price_asc':
              queryBuilder.orderBy('product.price', 'ASC');
              break;
            case 'price_desc':
              queryBuilder.orderBy('product.price', 'DESC');
              break;
            case 'newest':
              queryBuilder.orderBy('product.createdAt', 'DESC');
              break;
            case 'name_asc':
              queryBuilder.orderBy('product.name', 'ASC');
              break;
            case 'rating':
              queryBuilder.orderBy(
                `(SELECT COALESCE(AVG(r.rating), 5.0) FROM reviews r WHERE r.productId = product.id AND r.status = 'APPROVED')`,
                'DESC'
              ).addOrderBy('product.createdAt', 'DESC');
              break;
            case 'featured':
            default:
              queryBuilder.orderBy('product.createdAt', 'DESC');
              break;
          }
        };

        const qb = this.productRepo.createQueryBuilder('product')
          .leftJoinAndSelect('product.category', 'category')
          .leftJoinAndSelect('product.oemNumbers', 'oem')
          .leftJoinAndSelect('product.vehicles', 'vehicle')
          .leftJoinAndSelect('product.stock', 'stock')
          .leftJoinAndSelect('product.reviews', 'reviews')
          .take(safeLimit)
          .skip(skip);

        if (sanitizedCategory && sanitizedCategory !== 'All') {
          qb.andWhere('category.name = :categoryName', { categoryName: sanitizedCategory });
        }

        // Price range filters
        if (minPrice !== undefined) {
          qb.andWhere('product.price >= :minPrice', { minPrice });
        }
        if (maxPrice !== undefined) {
          qb.andWhere('product.price <= :maxPrice', { maxPrice });
        }

        // In-stock availability filter
        if (inStockOnly) {
          qb.andWhere('EXISTS (SELECT 1 FROM product_stock ps WHERE ps.productId = product.id AND ps.quantity > 0)');
        }

        let semanticMatchInfo: any = null;

        if (sanitizedQuery) {
          // Split by standard whitespace to extract individual search tokens (capped at max 6 tokens for performance)
          const tokens = sanitizedQuery.toLowerCase().split(/\s+/).filter(t => t.length > 0).slice(0, 6);
          const cleanFullQuery = sanitizedQuery.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        tokens.forEach((token, index) => {
          const mainParamKey = `token_${index}`;
          const cleanParamKey = `clean_token_${index}`;
          const altParamKey = `alt_token_${index}`;
          
          const params: any = { [mainParamKey]: `%${token}%` };
          
          let tokenConditions = [
            'LOWER(product.name) LIKE :' + mainParamKey,
            'LOWER(product.sku) LIKE :' + mainParamKey,
            'LOWER(product.description) LIKE :' + mainParamKey,
            'LOWER(category.name) LIKE :' + mainParamKey,
            'LOWER(oem.code) LIKE :' + mainParamKey,
            'LOWER(vehicle.make) LIKE :' + mainParamKey,
            'LOWER(vehicle.model) LIKE :' + mainParamKey,
          ];
          
          // 1. Bidirectional alphanumeric stripping for SKU and OEM numbers:
          // e.g. searching "ms7460" matches "MS-7460" AND searching "ms-7460" matches "MS7460"
          const cleanToken = token.replace(/[^a-z0-9]/g, '');
          if (cleanToken.length >= 2) {
            tokenConditions.push(
              `REPLACE(REPLACE(REPLACE(LOWER(product.sku), '-', ''), ' ', ''), '_', '') LIKE :${cleanParamKey}`,
              `REPLACE(REPLACE(REPLACE(LOWER(oem.code), '-', ''), ' ', ''), '_', '') LIKE :${cleanParamKey}`
            );
            params[cleanParamKey] = `%${cleanToken}%`;
          }

          // 2. Support dual viscosity formats: e.g., "5w30" <=> "5w-30" or "10w40" <=> "10w-40"
          if (/^\d+w-?\d+$/i.test(token)) {
            const hasHyphen = token.includes('-');
            const alternativeToken = hasHyphen ? token.replace(/-/g, '') : token.replace(/w/i, 'W-');
            
            tokenConditions.push(
              'LOWER(product.name) LIKE :' + altParamKey,
              'LOWER(product.sku) LIKE :' + altParamKey,
              'LOWER(product.description) LIKE :' + altParamKey,
              'LOWER(category.name) LIKE :' + altParamKey,
              'LOWER(oem.code) LIKE :' + altParamKey,
              'LOWER(vehicle.make) LIKE :' + altParamKey,
              'LOWER(vehicle.model) LIKE :' + altParamKey
            );
            params[altParamKey] = `%${alternativeToken}%`;
          }

          // 3. Automotive Term Synonyms & Plural Stemming
          // e.g. "engine" <=> "motor" (so "engine oil" matches "motor oil" & vice versa)
          // e.g. "oils" matches "oil"
          const synList: string[] = [];
          if (AUTOMOTIVE_SYNONYMS[token]) {
            synList.push(...AUTOMOTIVE_SYNONYMS[token]);
          }
          if (token.endsWith('s') && token.length > 3) {
            const singular = token.slice(0, -1);
            if (!synList.includes(singular)) {
              synList.push(singular);
            }
          }

          synList.forEach((syn, sIdx) => {
            const synParamKey = `syn_${index}_${sIdx}`;
            tokenConditions.push(
              `LOWER(product.name) LIKE :${synParamKey}`,
              `LOWER(product.description) LIKE :${synParamKey}`,
              `LOWER(category.name) LIKE :${synParamKey}`
            );
            params[synParamKey] = `%${syn}%`;
          });
          
          qb.andWhere(`(${tokenConditions.join(' OR ')})`, params);
        });

        // 4. If full multi-word query forms a clean SKU or OEM code (e.g. "MS 7460" or "04465 42140")
        if (cleanFullQuery.length >= 3 && cleanFullQuery !== tokens[0]) {
          qb.orWhere(`REPLACE(REPLACE(REPLACE(LOWER(product.sku), '-', ''), ' ', ''), '_', '') = :exactCleanSku`, { exactCleanSku: cleanFullQuery });
          qb.orWhere(`REPLACE(REPLACE(REPLACE(LOWER(oem.code), '-', ''), ' ', ''), '_', '') = :exactCleanSku`, { exactCleanSku: cleanFullQuery });
        }
      }

      applySorting(qb, safeSort);

      let [products, total] = await qb.getManyAndCount();
      let typoMatchInfo: { originalQuery: string; correctedQuery: string } | null = null;

      // 5. Typo Correction & Fuzzy Matching Fallback:
      // If direct keyword search returns 0 products, analyze query for misspelled automotive words (Levenshtein distance <= 2)
      if (total === 0 && sanitizedQuery) {
        const typo = correctTypo(sanitizedQuery);
        if (typo.hasCorrection && typo.correctedQuery.toLowerCase() !== sanitizedQuery.toLowerCase()) {
          const typoTokens = typo.correctedQuery.toLowerCase().split(/\s+/).filter(t => t.length > 0).slice(0, 6);
          const typoCleanFullQuery = typo.correctedQuery.toLowerCase().replace(/[^a-z0-9]/g, '');

          const typoQb = this.productRepo.createQueryBuilder('product')
            .leftJoinAndSelect('product.category', 'category')
            .leftJoinAndSelect('product.oemNumbers', 'oem')
            .leftJoinAndSelect('product.vehicles', 'vehicle')
            .leftJoinAndSelect('product.stock', 'stock')
            .leftJoinAndSelect('product.reviews', 'reviews')
            .take(safeLimit)
            .skip(skip);

          if (sanitizedCategory && sanitizedCategory !== 'All') {
            typoQb.andWhere('category.name = :categoryName', { categoryName: sanitizedCategory });
          }
          if (minPrice !== undefined) {
            typoQb.andWhere('product.price >= :minPrice', { minPrice });
          }
          if (maxPrice !== undefined) {
            typoQb.andWhere('product.price <= :maxPrice', { maxPrice });
          }
          if (inStockOnly) {
            typoQb.andWhere('EXISTS (SELECT 1 FROM product_stock ps WHERE ps.productId = product.id AND ps.quantity > 0)');
          }

          typoTokens.forEach((token, index) => {
            const mainParamKey = `typo_token_${index}`;
            const cleanParamKey = `typo_clean_token_${index}`;
            const altParamKey = `typo_alt_token_${index}`;
            
            const params: any = { [mainParamKey]: `%${token}%` };
            
            let tokenConditions = [
              'LOWER(product.name) LIKE :' + mainParamKey,
              'LOWER(product.sku) LIKE :' + mainParamKey,
              'LOWER(product.description) LIKE :' + mainParamKey,
              'LOWER(category.name) LIKE :' + mainParamKey,
              'LOWER(oem.code) LIKE :' + mainParamKey,
              'LOWER(vehicle.make) LIKE :' + mainParamKey,
              'LOWER(vehicle.model) LIKE :' + mainParamKey,
            ];
            
            const cleanToken = token.replace(/[^a-z0-9]/g, '');
            if (cleanToken.length >= 2) {
              tokenConditions.push(
                `REPLACE(REPLACE(REPLACE(LOWER(product.sku), '-', ''), ' ', ''), '_', '') LIKE :${cleanParamKey}`,
                `REPLACE(REPLACE(REPLACE(LOWER(oem.code), '-', ''), ' ', ''), '_', '') LIKE :${cleanParamKey}`
              );
              params[cleanParamKey] = `%${cleanToken}%`;
            }

            if (/^\d+w-?\d+$/i.test(token)) {
              const hasHyphen = token.includes('-');
              const alternativeToken = hasHyphen ? token.replace(/-/g, '') : token.replace(/w/i, 'W-');
              tokenConditions.push(
                'LOWER(product.name) LIKE :' + altParamKey,
                'LOWER(product.sku) LIKE :' + altParamKey,
                'LOWER(product.description) LIKE :' + altParamKey,
                'LOWER(category.name) LIKE :' + altParamKey,
                'LOWER(oem.code) LIKE :' + altParamKey,
                'LOWER(vehicle.make) LIKE :' + altParamKey,
                'LOWER(vehicle.model) LIKE :' + altParamKey
              );
              params[altParamKey] = `%${alternativeToken}%`;
            }

            const synList: string[] = [];
            if (AUTOMOTIVE_SYNONYMS[token]) {
              synList.push(...AUTOMOTIVE_SYNONYMS[token]);
            }
            if (token.endsWith('s') && token.length > 3) {
              const singular = token.slice(0, -1);
              if (!synList.includes(singular)) synList.push(singular);
            }

            synList.forEach((syn, sIdx) => {
              const synParamKey = `typo_syn_${index}_${sIdx}`;
              tokenConditions.push(
                `LOWER(product.name) LIKE :${synParamKey}`,
                `LOWER(product.description) LIKE :${synParamKey}`,
                `LOWER(category.name) LIKE :${synParamKey}`
              );
              params[synParamKey] = `%${syn}%`;
            });
            
            typoQb.andWhere(`(${tokenConditions.join(' OR ')})`, params);
          });

          if (typoCleanFullQuery.length >= 3 && typoCleanFullQuery !== typoTokens[0]) {
            typoQb.orWhere(`REPLACE(REPLACE(REPLACE(LOWER(product.sku), '-', ''), ' ', ''), '_', '') = :exactCleanSku`, { exactCleanSku: typoCleanFullQuery });
            typoQb.orWhere(`REPLACE(REPLACE(REPLACE(LOWER(oem.code), '-', ''), ' ', ''), '_', '') = :exactCleanSku`, { exactCleanSku: typoCleanFullQuery });
          }

          applySorting(typoQb, safeSort);
          const [typoProducts, typoTotal] = await typoQb.getManyAndCount();
          if (typoTotal > 0) {
            products = typoProducts;
            total = typoTotal;
            typoMatchInfo = {
              originalQuery: sanitizedQuery,
              correctedQuery: typo.correctedQuery
            };
          }
        }
      }

      // 6. Semantic / Symptom Fallback Search:
      // If direct keyword search returns 0 products, analyze query for automotive symptoms and part synonyms
      if (total === 0 && query) {
        const semantic = analyzeSemanticQuery(query);
        if (semantic.isSemantic && (semantic.suggestedParts.length > 0 || semantic.detectedVehicles.length > 0)) {
          const semQb = this.productRepo.createQueryBuilder('product')
            .leftJoinAndSelect('product.category', 'category')
            .leftJoinAndSelect('product.oemNumbers', 'oem')
            .leftJoinAndSelect('product.vehicles', 'vehicle')
            .leftJoinAndSelect('product.stock', 'stock')
            .leftJoinAndSelect('product.reviews', 'reviews')
            .take(safeLimit)
            .skip(skip);

          if (sanitizedCategory && sanitizedCategory !== 'All') {
            semQb.andWhere('category.name = :categoryName', { categoryName: sanitizedCategory });
          } else if (semantic.suggestedCategory) {
            semQb.andWhere('(LOWER(category.name) LIKE :sugCat OR LOWER(category.name) LIKE :sugCatAlt)', {
              sugCat: `%${semantic.suggestedCategory.toLowerCase()}%`,
              sugCatAlt: `%oil%`
            });
          }

          // Apply price & stock filters to semantic query as well
          if (minPrice !== undefined) {
            semQb.andWhere('product.price >= :minPrice', { minPrice });
          }
          if (maxPrice !== undefined) {
            semQb.andWhere('product.price <= :maxPrice', { maxPrice });
          }
          if (inStockOnly) {
            semQb.andWhere('EXISTS (SELECT 1 FROM product_stock ps WHERE ps.productId = product.id AND ps.quantity > 0)');
          }

          const semConditions: string[] = [];
          const semParams: any = {};

          semantic.suggestedParts.forEach((part, idx) => {
            const pKey = `sem_part_${idx}`;
            semConditions.push(`LOWER(product.name) LIKE :${pKey}`);
            semConditions.push(`LOWER(product.description) LIKE :${pKey}`);
            semConditions.push(`LOWER(category.name) LIKE :${pKey}`);
            semParams[pKey] = `%${part.toLowerCase()}%`;
          });

          semantic.detectedVehicles.forEach((veh, idx) => {
            const vKey = `sem_veh_${idx}`;
            semConditions.push(`LOWER(vehicle.make) LIKE :${vKey}`);
            semConditions.push(`LOWER(vehicle.model) LIKE :${vKey}`);
            semParams[vKey] = `%${veh.toLowerCase()}%`;
          });

          if (semConditions.length > 0) {
            semQb.andWhere(`(${semConditions.join(' OR ')})`, semParams);
            applySorting(semQb, safeSort);
            const [semProducts, semTotal] = await semQb.getManyAndCount();
            if (semTotal > 0) {
              products = semProducts;
              total = semTotal;
              semanticMatchInfo = {
                detectedSymptom: semantic.detectedSymptom,
                suggestedCategory: semantic.suggestedCategory,
                suggestedParts: semantic.suggestedParts,
                detectedVehicles: semantic.detectedVehicles,
                originalQuery: query
              };
            }
          }
        }
      }

      const data = products.map(p => {
        const approvedReviews = (p.reviews || []).filter(r => r.status === 'APPROVED');
        const reviewCount = approvedReviews.length;
        const averageRating = reviewCount > 0
          ? Number((approvedReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(1))
          : 5.0;

        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category?.name || 'Uncategorized',
          price: Number(p.price),
          costPrice: Number(p.costPrice),
          wholesalePrice: Number(p.wholesalePrice || 0),
          description: p.description,
          image: p.imageUrl || '',
          images: p.images || [],
          videoUrl: p.videoUrl || '',
          quantity: p.stock?.reduce((sum, s) => sum + s.quantity, 0) || 0,
          stock: p.stock?.some(s => s.quantity > 0) || false,
          lifecycleStatus: p.lifecycleStatus || (p.stock?.some(s => s.quantity > 0) ? 'ACTIVE' : 'OUT_OF_STOCK'),
          successorProductId: p.successorProductId || null,
          canonicalMasterId: p.canonicalMasterId || null,
          expectedRestockDate: p.expectedRestockDate || null,
          oemNumbers: p.oemNumbers?.map(o => o.code) || [],
          compatibility: p.vehicles?.map(v => v.make === 'Generic' ? v.model : `${v.make} ${v.model}`) || [],
          averageRating,
          reviewCount
        };
      });

      return { 
        data, 
        meta: { 
          total, 
          page: safePage, 
          limit: safeLimit, 
          pages: Math.ceil(total / safeLimit), 
          semanticMatch: semanticMatchInfo,
          typoCorrection: typoMatchInfo
        } 
      };
    }, 300);
  }

  /**
   * Intelligently queries the product catalog for MasumaBot AI Assistant recommendations,
   * matching vehicle, parts, and symptoms against live inventory.
   */
  static async searchProductsForAI(userQuery: string, limit: number = 4) {
    try {
      const semantic = analyzeSemanticQuery(userQuery);
      const cleanSku = userQuery.toLowerCase().replace(/[^a-z0-9]/g, '');
      const tokens = userQuery.trim().toLowerCase().split(/\s+/).filter(t => t.length > 2);

      const qb = this.productRepo.createQueryBuilder('product')
        .leftJoinAndSelect('product.category', 'category')
        .leftJoinAndSelect('product.oemNumbers', 'oem')
        .leftJoinAndSelect('product.vehicles', 'vehicle')
        .leftJoinAndSelect('product.stock', 'stock')
        .take(limit);

      const conditions: string[] = [];
      const params: any = {};

      if (cleanSku.length >= 3) {
        conditions.push(`REPLACE(REPLACE(REPLACE(LOWER(product.sku), '-', ''), ' ', ''), '_', '') LIKE :cleanSku`);
        conditions.push(`REPLACE(REPLACE(REPLACE(LOWER(oem.code), '-', ''), ' ', ''), '_', '') LIKE :cleanSku`);
        params.cleanSku = `%${cleanSku}%`;
      }

      tokens.forEach((token, idx) => {
        const k = `t_${idx}`;
        conditions.push(`LOWER(product.name) LIKE :${k}`);
        conditions.push(`LOWER(product.sku) LIKE :${k}`);
        conditions.push(`LOWER(category.name) LIKE :${k}`);
        conditions.push(`LOWER(oem.code) LIKE :${k}`);
        conditions.push(`LOWER(vehicle.make) LIKE :${k}`);
        conditions.push(`LOWER(vehicle.model) LIKE :${k}`);
        params[k] = `%${token}%`;
      });

      semantic.suggestedParts.forEach((part, idx) => {
        const k = `sp_${idx}`;
        conditions.push(`LOWER(product.name) LIKE :${k}`);
        conditions.push(`LOWER(product.description) LIKE :${k}`);
        params[k] = `%${part.toLowerCase()}%`;
      });

      semantic.detectedVehicles.forEach((veh, idx) => {
        const k = `sv_${idx}`;
        conditions.push(`LOWER(vehicle.make) LIKE :${k}`);
        conditions.push(`LOWER(vehicle.model) LIKE :${k}`);
        params[k] = `%${veh.toLowerCase()}%`;
      });

      if (conditions.length > 0) {
        qb.where(`(${conditions.join(' OR ')})`, params);
      }

      const products = await qb.getMany();
      return products.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category?.name || 'Uncategorized',
        price: Number(p.price),
        description: p.description,
        image: p.imageUrl || '',
        stock: p.stock?.some(s => s.quantity > 0) || false,
        quantity: p.stock?.reduce((sum, s) => sum + s.quantity, 0) || 0,
        oemNumbers: p.oemNumbers?.map(o => o.code) || [],
        compatibility: p.vehicles?.map(v => v.make === 'Generic' ? v.model : `${v.make} ${v.model}`) || []
      }));
    } catch (e) {
      return [];
    }
  }

  /**
   * Fast search autocomplete suggestions: returns matching products, categories, and vehicle models.
   * Results are cached for 120 seconds to eliminate redundant DB roundtrips.
   */
  static async getSuggestions(query: string, limit: number = 6) {
    const cleanQuery = (query || '').trim().slice(0, 100);
    if (cleanQuery.length < 2) {
      return { products: [], categories: [], vehicles: [] };
    }

    const cacheKey = `autocomplete:${cleanQuery.toLowerCase()}:${limit}`;

    return CacheService.getOrSet(cacheKey, async () => {
      const tokens = cleanQuery.toLowerCase().split(/\s+/).filter(t => t.length > 0);
      const cleanFullQuery = cleanQuery.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

      try {
        // 1. Fetch matching products
        const pQb = this.productRepo.createQueryBuilder('product')
          .select([
            'product.id',
            'product.name',
            'product.sku',
            'product.price',
            'product.imageUrl',
            'product.description'
          ])
          .leftJoin('product.category', 'category')
          .addSelect(['category.name'])
          .leftJoin('product.stock', 'stock')
          .addSelect(['stock.quantity'])
          .leftJoin('product.oemNumbers', 'oem')
          .leftJoin('product.vehicles', 'vehicle')
          .take(limit);

        tokens.forEach((token, index) => {
          const paramKey = `tok_${index}`;
          const cleanParamKey = `clean_${index}`;

          const conditions = [
            `LOWER(product.name) LIKE :${paramKey}`,
            `LOWER(product.sku) LIKE :${paramKey}`,
            `LOWER(category.name) LIKE :${paramKey}`,
            `LOWER(oem.code) LIKE :${paramKey}`,
            `LOWER(vehicle.make) LIKE :${paramKey}`,
            `LOWER(vehicle.model) LIKE :${paramKey}`
          ];
          const params: Record<string, string> = { [paramKey]: `%${token}%` };

          const cleanToken = token.replace(/[^a-z0-9]/g, '');
          if (cleanToken.length >= 2 && cleanToken !== token) {
            conditions.push(
              `REPLACE(REPLACE(REPLACE(LOWER(product.sku), '-', ''), ' ', ''), '_', '') LIKE :${cleanParamKey}`,
              `REPLACE(REPLACE(REPLACE(LOWER(oem.code), '-', ''), ' ', ''), '_', '') LIKE :${cleanParamKey}`
            );
            params[cleanParamKey] = `%${cleanToken}%`;
          }

          if (AUTOMOTIVE_SYNONYMS[token]) {
            AUTOMOTIVE_SYNONYMS[token].forEach((syn, sIdx) => {
              const synKey = `syn_${index}_${sIdx}`;
              conditions.push(
                `LOWER(product.name) LIKE :${synKey}`,
                `LOWER(category.name) LIKE :${synKey}`
              );
              params[synKey] = `%${syn}%`;
            });
          }

          pQb.andWhere(`(${conditions.join(' OR ')})`, params);
        });

        if (cleanFullQuery.length >= 3 && cleanFullQuery !== tokens[0]) {
          pQb.orWhere(`REPLACE(REPLACE(REPLACE(LOWER(product.sku), '-', ''), ' ', ''), '_', '') LIKE :exactCleanSku`, { exactCleanSku: `%${cleanFullQuery}%` });
          pQb.orWhere(`REPLACE(REPLACE(REPLACE(LOWER(oem.code), '-', ''), ' ', ''), '_', '') LIKE :exactCleanSku`, { exactCleanSku: `%${cleanFullQuery}%` });
        }

        const products = await pQb.getMany();

        let productSuggestions = products.map(p => {
          const totalStock = p.stock?.reduce((sum, s) => sum + s.quantity, 0) || 0;
          return {
            id: p.id,
            name: p.name,
            sku: p.sku,
            category: p.category?.name || 'Uncategorized',
            price: Number(p.price),
            image: p.imageUrl || '',
            stock: totalStock > 0,
            quantity: totalStock,
            description: p.description || '',
            oemNumbers: [],
            compatibility: []
          };
        });

        // 2. Fetch matching categories
        const catQb = this.categoryRepo.createQueryBuilder('category');
        const catConditions: string[] = [];
        const catParams: Record<string, string> = {};
        tokens.forEach((t, i) => {
          catConditions.push(`LOWER(category.name) LIKE :c_${i}`);
          catParams[`c_${i}`] = `%${t}%`;
          if (AUTOMOTIVE_SYNONYMS[t]) {
            AUTOMOTIVE_SYNONYMS[t].forEach((syn, si) => {
              catConditions.push(`LOWER(category.name) LIKE :cs_${i}_${si}`);
              catParams[`cs_${i}_${si}`] = `%${syn}%`;
            });
          }
        });
        if (catConditions.length > 0) {
          catQb.where(`(${catConditions.join(' OR ')})`, catParams);
        }
        const matchedCats = await catQb.take(4).getMany();
        let categorySuggestions = matchedCats.map(c => c.name);

        // 3. Fetch matching vehicles
        const vehQb = this.vehicleRepo.createQueryBuilder('v')
          .select(['v.make', 'v.model']);
        const vehConditions: string[] = [];
        const vehParams: Record<string, string> = {};
        tokens.forEach((t, i) => {
          vehConditions.push(`LOWER(v.make) LIKE :v_${i} OR LOWER(v.model) LIKE :v_${i}`);
          vehParams[`v_${i}`] = `%${t}%`;
        });
        if (vehConditions.length > 0) {
          vehQb.where(`(${vehConditions.join(' OR ')})`, vehParams);
        }
        const matchedVehicles = await vehQb.take(8).getMany();
        const vehicleSuggestions = Array.from(
          new Set(
            matchedVehicles
              .filter(v => v.make && v.model && v.make !== 'Generic')
              .map(v => `${v.make} ${v.model}`)
          )
        ).slice(0, 4);

        let correctedQuery: string | undefined = undefined;

        // If direct keyword search produced no suggestions, attempt typo correction
        if (productSuggestions.length === 0 && categorySuggestions.length === 0 && vehicleSuggestions.length === 0) {
          const typo = correctTypo(cleanQuery);
          if (typo.hasCorrection && typo.correctedQuery.toLowerCase() !== cleanQuery.toLowerCase()) {
            const typoTokens = typo.correctedQuery.toLowerCase().split(/\s+/).filter(t => t.length > 0);
            const typoCleanFullQuery = typo.correctedQuery.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

            const typoPqb = this.productRepo.createQueryBuilder('product')
              .select([
                'product.id',
                'product.name',
                'product.sku',
                'product.price',
                'product.imageUrl',
                'product.description'
              ])
              .leftJoin('product.category', 'category')
              .addSelect(['category.name'])
              .leftJoin('product.stock', 'stock')
              .addSelect(['stock.quantity'])
              .leftJoin('product.oemNumbers', 'oem')
              .leftJoin('product.vehicles', 'vehicle')
              .take(limit);

            typoTokens.forEach((token, index) => {
              const paramKey = `ttok_${index}`;
              const cleanParamKey = `tclean_${index}`;

              const conditions = [
                `LOWER(product.name) LIKE :${paramKey}`,
                `LOWER(product.sku) LIKE :${paramKey}`,
                `LOWER(category.name) LIKE :${paramKey}`,
                `LOWER(oem.code) LIKE :${paramKey}`,
                `LOWER(vehicle.make) LIKE :${paramKey}`,
                `LOWER(vehicle.model) LIKE :${paramKey}`
              ];
              const params: Record<string, string> = { [paramKey]: `%${token}%` };

              const cleanToken = token.replace(/[^a-z0-9]/g, '');
              if (cleanToken.length >= 2 && cleanToken !== token) {
                conditions.push(
                  `REPLACE(REPLACE(REPLACE(LOWER(product.sku), '-', ''), ' ', ''), '_', '') LIKE :${cleanParamKey}`,
                  `REPLACE(REPLACE(REPLACE(LOWER(oem.code), '-', ''), ' ', ''), '_', '') LIKE :${cleanParamKey}`
                );
                params[cleanParamKey] = `%${cleanToken}%`;
              }

              if (AUTOMOTIVE_SYNONYMS[token]) {
                AUTOMOTIVE_SYNONYMS[token].forEach((syn, sIdx) => {
                  const synKey = `tsyn_${index}_${sIdx}`;
                  conditions.push(
                    `LOWER(product.name) LIKE :${synKey}`,
                    `LOWER(category.name) LIKE :${synKey}`
                  );
                  params[synKey] = `%${syn}%`;
                });
              }

              typoPqb.andWhere(`(${conditions.join(' OR ')})`, params);
            });

            if (typoCleanFullQuery.length >= 3 && typoCleanFullQuery !== typoTokens[0]) {
              typoPqb.orWhere(`REPLACE(REPLACE(REPLACE(LOWER(product.sku), '-', ''), ' ', ''), '_', '') LIKE :exactCleanSku`, { exactCleanSku: `%${typoCleanFullQuery}%` });
              typoPqb.orWhere(`REPLACE(REPLACE(REPLACE(LOWER(oem.code), '-', ''), ' ', ''), '_', '') LIKE :exactCleanSku`, { exactCleanSku: `%${typoCleanFullQuery}%` });
            }

            const typoProducts = await typoPqb.getMany();
            if (typoProducts.length > 0) {
              productSuggestions = typoProducts.map(p => {
                const totalStock = p.stock?.reduce((sum, s) => sum + s.quantity, 0) || 0;
                return {
                  id: p.id,
                  name: p.name,
                  sku: p.sku,
                  category: p.category?.name || 'Uncategorized',
                  price: Number(p.price),
                  image: p.imageUrl || '',
                  stock: totalStock > 0,
                  quantity: totalStock,
                  description: p.description || '',
                  oemNumbers: [],
                  compatibility: []
                };
              });
              correctedQuery = typo.correctedQuery;
            }

            // Also check matching categories for corrected term
            const typoCatQb = this.categoryRepo.createQueryBuilder('category');
            const typoCatConditions: string[] = [];
            const typoCatParams: Record<string, string> = {};
            typoTokens.forEach((t, i) => {
              typoCatConditions.push(`LOWER(category.name) LIKE :tc_${i}`);
              typoCatParams[`tc_${i}`] = `%${t}%`;
            });
            if (typoCatConditions.length > 0) {
              typoCatQb.where(`(${typoCatConditions.join(' OR ')})`, typoCatParams);
              const matchedTypoCats = await typoCatQb.take(4).getMany();
              if (matchedTypoCats.length > 0) {
                categorySuggestions = matchedTypoCats.map(c => c.name);
                correctedQuery = typo.correctedQuery;
              }
            }
          }
        }

        return {
          products: productSuggestions,
          categories: categorySuggestions,
          vehicles: vehicleSuggestions,
          correctedQuery
        };
      } catch (err) {
        console.error('getSuggestions error:', err);
        return { products: [], categories: [], vehicles: [] };
      }
    }, 120);
  }

  static async getProductById(idOrSlug: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let p: Product | null = null;

    if (uuidRegex.test(idOrSlug)) {
      p = await this.productRepo.findOne({
        where: { id: idOrSlug },
        relations: ['category', 'oemNumbers', 'vehicles', 'stock']
      });
    }

    if (!p) {
      // Try exact SKU match first
      p = await this.productRepo.findOne({
        where: { sku: idOrSlug },
        relations: ['category', 'oemNumbers', 'vehicles', 'stock']
      });
    }

    if (!p) {
      // Try exact SKU match case-insensitive
      p = await this.productRepo.createQueryBuilder('product')
        .leftJoinAndSelect('product.category', 'category')
        .leftJoinAndSelect('product.oemNumbers', 'oemNumbers')
        .leftJoinAndSelect('product.vehicles', 'vehicles')
        .leftJoinAndSelect('product.stock', 'stock')
        .where('LOWER(product.sku) = :sku', { sku: idOrSlug.toLowerCase() })
        .getOne();
    }

    if (!p) {
      // Try stripped alphanumeric SKU match (e.g. "ms7460" for "MS-7460" or "MS 7460")
      const cleanSku = idOrSlug.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanSku.length >= 2) {
        p = await this.productRepo.createQueryBuilder('product')
          .leftJoinAndSelect('product.category', 'category')
          .leftJoinAndSelect('product.oemNumbers', 'oemNumbers')
          .leftJoinAndSelect('product.vehicles', 'vehicles')
          .leftJoinAndSelect('product.stock', 'stock')
          .where("REPLACE(REPLACE(REPLACE(LOWER(product.sku), '-', ''), ' ', ''), '_', '') = :cleanSku", { cleanSku })
          .getOne();
      }
    }

    if (!p && idOrSlug.includes('-')) {
      const parts = idOrSlug.split('-');
      const candidates: string[] = [];
      
      if (parts.length > 0) {
        candidates.push(parts[parts.length - 1].toLowerCase());
      }
      if (parts.length > 1) {
        candidates.push(`${parts[parts.length - 2]}-${parts[parts.length - 1]}`.toLowerCase());
      }
      if (parts.length > 2) {
        candidates.push(`${parts[parts.length - 3]}-${parts[parts.length - 2]}-${parts[parts.length - 1]}`.toLowerCase());
      }

      const noHyphensSlug = idOrSlug.replace(/-/g, '').toLowerCase();

      for (const candidate of candidates) {
        p = await this.productRepo.createQueryBuilder('product')
          .leftJoinAndSelect('product.category', 'category')
          .leftJoinAndSelect('product.oemNumbers', 'oemNumbers')
          .leftJoinAndSelect('product.vehicles', 'vehicles')
          .leftJoinAndSelect('product.stock', 'stock')
          .where('LOWER(product.sku) = :sku', { sku: candidate })
          .getOne();
        if (p) break;
      }

      if (!p) {
        p = await this.productRepo.createQueryBuilder('product')
          .leftJoinAndSelect('product.category', 'category')
          .leftJoinAndSelect('product.oemNumbers', 'oemNumbers')
          .leftJoinAndSelect('product.vehicles', 'vehicles')
          .leftJoinAndSelect('product.stock', 'stock')
          .where("LOWER(REPLACE(product.sku, '-', '')) = :sku", { sku: noHyphensSlug })
          .getOne();
      }
      
      if (!p) {
        const firstWord = parts[0];
        if (firstWord && firstWord.length > 2) {
          const matches = await this.productRepo.createQueryBuilder('product')
            .leftJoinAndSelect('product.category', 'category')
            .leftJoinAndSelect('product.oemNumbers', 'oemNumbers')
            .leftJoinAndSelect('product.vehicles', 'vehicles')
            .leftJoinAndSelect('product.stock', 'stock')
            .where('LOWER(product.name) LIKE :word', { word: `%${firstWord}%` })
            .getMany();
            
          const targetSlug = idOrSlug.toLowerCase();
          p = matches.find(m => generateSlug(m.name, m.sku) === targetSlug) || null;
        }
      }
    }

    if (!p) return null;

    let successorProduct: any = null;
    if (p.successorProductId) {
      try {
        const succ = await this.productRepo.findOne({
          where: { id: p.successorProductId },
          relations: ['category', 'stock']
        });
        if (succ) {
          successorProduct = {
            id: succ.id,
            name: succ.name,
            sku: succ.sku,
            price: Number(succ.price),
            image: succ.imageUrl || '',
            stock: succ.stock?.some(s => s.quantity > 0) || false
          };
        }
      } catch (e) {}
    }

    let canonicalMasterProduct: any = null;
    if (p.canonicalMasterId) {
      try {
        const master = await this.productRepo.findOne({
          where: { id: p.canonicalMasterId },
          relations: ['category']
        });
        if (master) {
          canonicalMasterProduct = {
            id: master.id,
            name: master.name,
            sku: master.sku
          };
        }
      } catch (e) {}
    }

    const approvedReviews = await AppDataSource.getRepository(Review).find({
      where: { product: { id: p.id }, status: 'APPROVED' }
    });
    const reviewCount = approvedReviews.length;
    const averageRating = reviewCount > 0
      ? Number((approvedReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(1))
      : 5.0;

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category?.name || 'Uncategorized',
      price: Number(p.price),
      costPrice: Number(p.costPrice),
      wholesalePrice: Number(p.wholesalePrice || 0),
      description: p.description,
      image: p.imageUrl || '',
      images: p.images || [],
      videoUrl: p.videoUrl || '',
      quantity: p.stock?.reduce((sum, s) => sum + s.quantity, 0) || 0,
      stock: p.stock?.some(s => s.quantity > 0) || false,
      lifecycleStatus: p.lifecycleStatus || (p.stock?.some(s => s.quantity > 0) ? 'ACTIVE' : 'OUT_OF_STOCK'),
      successorProductId: p.successorProductId || null,
      successorProduct,
      canonicalMasterId: p.canonicalMasterId || null,
      canonicalMasterProduct,
      expectedRestockDate: p.expectedRestockDate || null,
      oemNumbers: p.oemNumbers?.map(o => o.code) || [],
      compatibility: p.vehicles?.map(v => v.make === 'Generic' ? v.model : `${v.make} ${v.model}`) || [],
      averageRating,
      reviewCount
    };
  }

  static async createProduct(data: any) {
    const category = await this.categoryRepo.findOneBy({ name: data.category });
    if (!category) throw new Error(`Category ${data.category} not found`);

    const product = new Product();
    product.name = data.name;
    product.sku = data.sku;
    product.price = data.price;
    product.costPrice = data.costPrice || 0;
    product.wholesalePrice = data.wholesalePrice;
    product.description = data.description;
    product.imageUrl = data.imageUrl;
    product.images = data.images;
    product.videoUrl = data.videoUrl;
    product.category = category;

    if (data.oemNumbers && Array.isArray(data.oemNumbers)) {
      product.oemNumbers = data.oemNumbers.map((code: string) => {
        const oem = new OemNumber();
        oem.code = code;
        return oem;
      });
    }

    if (data.compatibility && Array.isArray(data.compatibility)) {
        product.vehicles = await this.processVehicles(data.compatibility);
    }

    const saved = await this.productRepo.save(product);

    if (data.branchId) {
        const branch = await this.branchRepo.findOneBy({ id: data.branchId });
        if (branch) {
            const stock = new ProductStock();
            stock.product = saved;
            stock.branch = branch;
            stock.quantity = data.quantity || 0; 
            stock.lowStockThreshold = 5;
            await this.stockRepo.save(stock);
        }
    }

    await CacheService.invalidate('products:*');
    await CacheService.invalidate('autocomplete:*');
    return saved;
  }

  static async updateProduct(id: string, data: any) {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['oemNumbers', 'vehicles']
    });

    if (!product) throw new Error('Product not found');

    if (data.category) {
       const category = await this.categoryRepo.findOneBy({ name: data.category });
       if (category) product.category = category;
    }

    product.name = data.name || product.name;
    product.sku = data.sku || product.sku;
    product.price = data.price || product.price;
    product.costPrice = (data.costPrice !== undefined) ? data.costPrice : product.costPrice;
    product.wholesalePrice = data.wholesalePrice || product.wholesalePrice;
    product.description = data.description || product.description;
    product.imageUrl = data.imageUrl || product.imageUrl;
    if (data.images) product.images = data.images;
    if (data.videoUrl !== undefined) product.videoUrl = data.videoUrl;

    if (data.oemNumbers && Array.isArray(data.oemNumbers)) {
        await AppDataSource.getRepository(OemNumber).delete({ product: { id: product.id } } as any);
        product.oemNumbers = data.oemNumbers.map((code: string) => {
          const oem = new OemNumber();
          oem.code = code;
          return oem;
        });
    }

    if (data.compatibility && Array.isArray(data.compatibility)) {
        product.vehicles = await this.processVehicles(data.compatibility);
    }

    const saved = await this.productRepo.save(product);

    if (data.quantity !== undefined && data.branchId) {
        let stock = await this.stockRepo.findOne({
            where: { product: { id: product.id } as any, branch: { id: data.branchId } as any }
        });

        if (!stock) {
            stock = new ProductStock();
            stock.product = product;
            stock.branch = { id: data.branchId } as Branch;
            stock.quantity = data.quantity;
            stock.lowStockThreshold = 5;
        } else {
            stock.quantity = data.quantity;
        }
        await this.stockRepo.save(stock);
    }

    await CacheService.invalidate('products:*');
    await CacheService.invalidate(`product:detail:${id}`);
    await CacheService.invalidate('autocomplete:*');
    return saved;
  }

  static async applyGlobalPriceAdjustment(percentage: number, user: User) {
    const factor = percentage / 100;
    const isReduction = percentage < 0;
    
    await AppDataSource.query(`
        UPDATE products 
        SET 
            price = ROUND(price * (1 + ?), 0),
            wholesalePrice = CASE WHEN wholesalePrice IS NOT NULL THEN ROUND(wholesalePrice * (1 + ?), 0) ELSE NULL END
    `, [factor, factor]);

    await CacheService.invalidate('products:*');
    await CacheService.invalidate('autocomplete:*');

    await AuditService.log(
        'GLOBAL_PRICE_ADJUSTMENT',
        'CATALOG',
        `Adjusted all prices by ${percentage}% (${isReduction ? 'Reduction' : 'Increase'})`,
        user
    );

    return true;
  }

  static async deleteProduct(id: string) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const product = await queryRunner.manager.findOne(Product, { where: { id } });
      if (!product) throw new Error('Product not found');

      await queryRunner.manager.delete(ProductStock, { product: { id: id } } as any);
      await queryRunner.manager.delete(OemNumber, { product: { id: id } } as any);
      await queryRunner.manager.remove(product);

      await queryRunner.commitTransaction();

      await CacheService.invalidate('products:*');
      await CacheService.invalidate(`product:detail:${id}`);
      await CacheService.invalidate('autocomplete:*');
      return true;
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      if (error.message?.includes('foreign key constraint fails')) {
          throw new Error('Cannot delete this product because it is part of existing Orders or Sales.');
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  static async bulkDelete(ids: string[], user: User) {
    if (!ids.length) return;
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        await queryRunner.manager.delete(ProductStock, { product: { id: In(ids) } } as any);
        await queryRunner.manager.delete(OemNumber, { product: { id: In(ids) } } as any);
        await queryRunner.manager.delete(Product, { id: In(ids) });
        
        await queryRunner.commitTransaction();
        
        await AuditService.log('BULK_DELETE_PRODUCTS', 'CATALOG', `Deleted ${ids.length} products manually.`, user);
        await CacheService.invalidate('products:*');
        await CacheService.invalidate('autocomplete:*');
        return true;
    } catch (error: any) {
        await queryRunner.rollbackTransaction();
        if (error.message?.includes('foreign key constraint fails')) {
            throw new Error('One or more products cannot be deleted because they are linked to sales or orders.');
        }
        throw error;
    } finally {
        await queryRunner.release();
    }
  }
  
  static async getAllProductIdsForSitemap() {
     return this.productRepo.find({
       select: { id: true }
     });
  }

  static async createStockAlert(productId: string, productSku: string, contactType: string, contactValue: string) {
    const alert = new StockAlert();
    alert.productId = productId;
    alert.productSku = productSku;
    alert.contactType = contactType || 'email';
    alert.contactValue = contactValue.trim();
    alert.status = 'PENDING';
    return await this.stockAlertRepo.save(alert);
  }

  static async getInStockAlternatives(productId: string, limit: number = 4) {
    const original = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['category', 'vehicles']
    });
    if (!original) return [];

    const categoryId = original.category?.id;
    const vehicleIds = (original.vehicles || []).map(v => v.id);

    const qb = this.productRepo.createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.stock', 'stock')
      .leftJoinAndSelect('product.vehicles', 'vehicle')
      .where('product.id != :id', { id: productId })
      .andWhere('(stock.quantity > 0)');

    if (vehicleIds.length > 0) {
      qb.andWhere('vehicle.id IN (:...vehicleIds)', { vehicleIds });
    } else if (categoryId) {
      qb.andWhere('category.id = :catId', { catId: categoryId });
    }

    let alternatives = await qb.take(limit).getMany();

    // If vehicle matching returned fewer than limit, fall back to same category
    if (alternatives.length < limit && categoryId) {
      const existingIds = [productId, ...alternatives.map(a => a.id)];
      const fallback = await this.productRepo.createQueryBuilder('product')
        .leftJoinAndSelect('product.category', 'category')
        .leftJoinAndSelect('product.stock', 'stock')
        .where('product.id NOT IN (:...existingIds)', { existingIds })
        .andWhere('category.id = :catId', { catId: categoryId })
        .andWhere('(stock.quantity > 0)')
        .take(limit - alternatives.length)
        .getMany();

      alternatives = [...alternatives, ...fallback];
    }

    return alternatives.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category?.name || 'Uncategorized',
      price: Number(p.price),
      image: p.imageUrl || '',
      stock: true,
      compatibility: p.vehicles?.map(v => v.make === 'Generic' ? v.model : `${v.make} ${v.model}`) || []
    }));
  }
}