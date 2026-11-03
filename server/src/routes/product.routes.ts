import { Router } from 'express';
import { ProductService } from '../services/productService';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { z } from 'zod';
import { In } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Product } from '../entities/Product';
import { Category } from '../entities/Category';
import { ProductStock } from '../entities/ProductStock';
import { Branch } from '../entities/Branch';
import { OemNumber } from '../entities/OemNumber';
import { Vehicle } from '../entities/Vehicle';
import { CacheService } from '../lib/cache';
import { createProductSchema, updateProductSchema } from '../schemas/product.schema';
import { searchRateLimiter, autocompleteRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/', searchRateLimiter as any, async (req, res) => {
    try {
        const query = (req.query.q as string || '').trim().slice(0, 100);
        const category = (req.query.category as string || 'All').trim().slice(0, 50);
        const page = Math.max(1, Math.min(1000, parseInt(req.query.page as string) || 1));
        const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 50));
        const sort = (req.query.sort as string || 'featured').trim().slice(0, 30);
        const minPrice = req.query.minPrice !== undefined && req.query.minPrice !== '' && !isNaN(Number(req.query.minPrice))
            ? Math.max(0, parseFloat(req.query.minPrice as string))
            : undefined;
        const maxPrice = req.query.maxPrice !== undefined && req.query.maxPrice !== '' && !isNaN(Number(req.query.maxPrice))
            ? Math.max(0, parseFloat(req.query.maxPrice as string))
            : undefined;
        const inStockOnly = req.query.inStock === 'true' || req.query.inStock === '1';
        
        const result = await ProductService.getAllProducts(query, category, page, limit, sort, {
            minPrice,
            maxPrice,
            inStockOnly
        });
        res.json(result); 
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

router.get('/suggest', autocompleteRateLimiter as any, async (req, res) => {
    try {
        const query = (req.query.q as string || '').trim().slice(0, 100);
        const limit = Math.max(1, Math.min(20, parseInt(req.query.limit as string) || 6));
        
        if (!query || query.length < 2) {
            return res.json({ query: '', products: [], categories: [], vehicles: [] });
        }

        const suggestions = await ProductService.getSuggestions(query, limit);
        res.json({ query, ...suggestions });
    } catch (error) {
        console.error('Failed to fetch search suggestions:', error);
        res.status(500).json({ error: 'Failed to fetch suggestions', products: [], categories: [], vehicles: [] });
    }
});

router.post('/bulk/clear-all', authenticate, authorize(['ADMIN']), async (req, res) => {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
        await queryRunner.manager.query('SET FOREIGN_KEY_CHECKS = 0');
        await queryRunner.manager.query('DELETE FROM oem_numbers');
        await queryRunner.manager.query('DELETE FROM product_stock');
        await queryRunner.manager.query('DELETE FROM product_vehicles');
        await queryRunner.manager.query('DELETE FROM products');
        await queryRunner.manager.query('SET FOREIGN_KEY_CHECKS = 1');
        await queryRunner.commitTransaction();
        res.json({ message: 'Catalog wiped successfully. Database is now clean.' });
    } catch (error: any) {
        await queryRunner.rollbackTransaction();
        res.status(500).json({ error: 'Failed to clear catalog' });
    } finally {
        await queryRunner.release();
    }
});

router.post('/bulk/delete', authenticate, authorize(['ADMIN', 'MANAGER']), validate(z.object({ ids: z.array(z.string()) })), async (req: any, res) => {
    try {
        await ProductService.bulkDelete(req.body.ids, req.user);
        res.json({ message: `Successfully deleted ${req.body.ids.length} products.` });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Bulk delete failed' });
    }
});

router.delete('/bulk/rollback/:batchId', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
    const { batchId } = req.params;
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
        const products = await queryRunner.manager.findBy(Product, { importBatchId: batchId as any });
        for (const p of products) {
            await queryRunner.manager.delete(ProductStock, { product: { id: p.id } } as any);
            await queryRunner.manager.delete(OemNumber, { product: { id: p.id } } as any);
            await queryRunner.manager.remove(p);
        }
        await queryRunner.commitTransaction();
        res.json({ message: `Successfully rolled back ${products.length} products from batch ${batchId}` });
    } catch (error: any) {
        await queryRunner.rollbackTransaction();
        res.status(500).json({ error: 'Rollback failed' });
    } finally {
        await queryRunner.release();
    }
});

router.post('/adjust-prices', authenticate, authorize(['ADMIN', 'MANAGER']), validate(z.object({ percentage: z.number() })), async (req: any, res) => {
    try {
        const { percentage } = req.body;
        await ProductService.applyGlobalPriceAdjustment(percentage, req.user);
        res.json({ message: `Successfully adjusted all prices by ${percentage}%` });
    } catch (error: any) {
        res.status(500).json({ error: 'Failed to adjust prices' });
    }
});

// Phase 4: Back-in-Stock Alert Registration
router.post('/stock-alert', async (req, res) => {
    try {
        const { productId, productSku, contactType, contactValue } = req.body;
        if (!productId || !contactValue || !contactValue.trim()) {
            return res.status(400).json({ error: 'Product ID and email or phone contact are required.' });
        }
        await ProductService.createStockAlert(productId, productSku || 'N/A', contactType || 'email', contactValue);
        return res.json({ 
            success: true, 
            message: 'You are on the priority waitlist! We will alert you the moment this item is replenished.' 
        });
    } catch (error: any) {
        console.error('Error creating stock alert:', error);
        return res.status(500).json({ error: 'Failed to register stock notification' });
    }
});

// Phase 4: In-Stock Compatible Alternatives for OOS / Discontinued Items
router.get('/alternatives/:id', async (req, res) => {
    try {
        const alternatives = await ProductService.getInStockAlternatives(req.params.id);
        return res.json({ alternatives });
    } catch (error) {
        console.error('Error fetching alternatives:', error);
        return res.status(500).json({ error: 'Failed to fetch alternative products' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const product = await ProductService.getProductById(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/', authenticate, authorize(['ADMIN', 'MANAGER']), validate(createProductSchema), async (req, res) => {
    try {
        const payload = { ...req.body, branchId: req.user?.branch?.id };
        const product = await ProductService.createProduct(payload);
        res.status(201).json(product);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to create product' });
    }
});

router.put('/:id', authenticate, authorize(['ADMIN', 'MANAGER']), validate(updateProductSchema), async (req, res) => {
    try {
        const payload = { ...req.body, branchId: req.user?.branch?.id };
        const product = await ProductService.updateProduct(req.params.id as any, payload);
        res.json(product);
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to update product' });
    }
});

router.delete('/:id', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
        await ProductService.deleteProduct(req.params.id as any);
        res.json({ message: 'Product deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Failed to delete product' });
    }
});

router.get('/bulk/export', authenticate, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
    try {
        const productRepo = AppDataSource.getRepository(Product);

        const escapeCsv = (field: any) => {
            if (field === null || field === undefined) return '';
            const stringValue = String(field);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        };

        const headers = ['SKU', 'Name', 'Category', 'Price', 'Cost Price', 'Description', 'OEM Numbers', 'Compatibility', 'Quantity', 'Image URL'];
        
        // Chunked HTTP response streaming: Prevents memory exhaustion (OOM) on 1M+ rows
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="Masuma_Product_Catalog_Export.csv"');
        res.setHeader('Transfer-Encoding', 'chunked');

        // Write header immediately
        res.write(headers.join(',') + '\n');

        const BATCH_SIZE = 1000;
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
            const products = await productRepo.find({
                relations: ['category', 'stock', 'oemNumbers', 'vehicles'],
                order: { id: 'ASC' },
                take: BATCH_SIZE,
                skip: offset
            });

            if (products.length === 0) {
                break;
            }

            for (const p of products) {
                const firstBranchStock = (p.stock && p.stock.length > 0) ? p.stock[0].quantity : 0;
                
                const row = [
                    p.sku,
                    p.name,
                    p.category?.name || 'General',
                    p.price,
                    p.costPrice || 0,
                    p.description || '',
                    p.oemNumbers ? p.oemNumbers.map(o => o.code).join('; ') : '',
                    p.vehicles ? p.vehicles.map(v => `${v.make} ${v.model}`).join('; ') : '',
                    firstBranchStock,
                    p.imageUrl || ''
                ].map(escapeCsv).join(',');
                
                res.write(row + '\n');
            }

            offset += products.length;
            if (products.length < BATCH_SIZE) {
                hasMore = false;
            }
        }

        res.end();
    } catch (error) {
        console.error('Export failed:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to export products' });
        } else {
            res.end();
        }
    }
});

const bulkImportSchema = z.object({
    branchId: z.string().optional(),
    batchId: z.string().optional(),
    dryRun: z.boolean().optional().default(false),
    products: z.array(z.object({
        sku: z.string().min(1, 'SKU is required'),
        name: z.string().default('Unnamed Part'),
        category: z.string().optional().default('General'),
        price: z.coerce.number().finite().default(0),
        costPrice: z.coerce.number().finite().nullable().optional().default(0), 
        wholesalePrice: z.coerce.number().finite().nullable().optional(), 
        description: z.string().optional().default(''),
        oemNumbers: z.string().optional().default(''), 
        compatibility: z.string().optional().default(''),
        quantity: z.coerce.number().finite().nullable().optional().default(0),
        lowStockThreshold: z.coerce.number().finite().nullable().optional().default(5),
        imageUrl: z.string().optional().default('')
    }))
});

router.post('/bulk', authenticate, authorize(['ADMIN', 'MANAGER']), validate(bulkImportSchema), async (req, res) => {
    const { branchId, products, dryRun } = req.body;
    const batchId = req.body.batchId || `BATCH-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.random().toString(36).substring(7).toUpperCase()}`;
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        // Safe branch resolution: provided branchId -> user branch -> NBI-HQ -> first branch -> auto-created fallback
        let branch: Branch | null = null;
        if (branchId) {
            branch = await queryRunner.manager.findOneBy(Branch, { id: branchId });
        }
        if (!branch && (req as any).user?.branch?.id) {
            branch = await queryRunner.manager.findOneBy(Branch, { id: (req as any).user.branch.id });
        }
        if (!branch) {
            branch = await queryRunner.manager.findOne(Branch, { where: { code: 'NBI-HQ' } });
        }
        if (!branch) {
            branch = await queryRunner.manager.findOne(Branch, { order: { name: 'ASC' } });
        }
        if (!branch) {
            branch = queryRunner.manager.create(Branch, {
                name: 'Ruby Mall Branch',
                code: 'NBI-HQ',
                address: 'First Floor (Shop FF25), Ruby Mall, Accra Road, Nairobi CBD',
                isActive: true
            });
            branch = await queryRunner.manager.save(Branch, branch);
        }

        let createdCount = 0;
        let updatedCount = 0;
        const reports: { row: number, sku: string, status: 'CREATED' | 'UPDATED' | 'ERROR', message: string }[] = [];

        // 1. High-Performance Bulk Category Resolution (1 query instead of N queries)
        const rawCategoryNames = Array.from(new Set(
            products.map((p: any) => (p.category ? p.category.toString().trim() : 'General')).filter(Boolean)
        )) as string[];
        
        const categoryMap = new Map<string, Category>();
        if (rawCategoryNames.length > 0) {
            const existingCategories = await queryRunner.manager.find(Category, {
                where: { name: In(rawCategoryNames) }
            });
            existingCategories.forEach(c => categoryMap.set(c.name.toLowerCase(), c));

            // Create any missing categories
            const missingCatNames = rawCategoryNames.filter(name => !categoryMap.has(name.toLowerCase()));
            for (const missingName of missingCatNames) {
                const newCat = queryRunner.manager.create(Category, { name: missingName });
                const savedCat = await queryRunner.manager.save(Category, newCat);
                categoryMap.set(missingName.toLowerCase(), savedCat);
            }
        }

        let defaultCategory = categoryMap.get('general');
        if (!defaultCategory) {
            defaultCategory = await queryRunner.manager.findOneBy(Category, { name: 'General' }) || undefined;
            if (!defaultCategory) {
                defaultCategory = await queryRunner.manager.save(Category, queryRunner.manager.create(Category, { name: 'General' }));
            }
            categoryMap.set('general', defaultCategory);
        }

        // 2. High-Performance Bulk SKU Resolution (1 query instead of N queries)
        const skus = Array.from(new Set(
            products.map((p: any) => p.sku ? p.sku.toString().trim().toUpperCase() : '').filter(Boolean)
        )) as string[];

        const productMap = new Map<string, Product>();
        if (skus.length > 0) {
            const existingProducts = await queryRunner.manager.find(Product, {
                where: { sku: In(skus) }
            });
            existingProducts.forEach(p => productMap.set(p.sku.toUpperCase(), p));
        }

        // 3. High-Performance Bulk Stock Resolution
        const existingProductIds = Array.from(productMap.values()).map(p => p.id);
        const stockMap = new Map<string, ProductStock>();
        if (existingProductIds.length > 0) {
            const existingStocks = await queryRunner.manager.find(ProductStock, {
                where: {
                    product: { id: In(existingProductIds) } as any,
                    branch: { id: branch.id } as any
                },
                relations: ['product']
            });
            existingStocks.forEach(s => {
                if (s.product && s.product.id) {
                    stockMap.set(s.product.id, s);
                }
            });
        }

        // 4. Process Batch with In-Memory Caches
        for (let i = 0; i < products.length; i++) {
            const item = products[i];
            try {
                const safeSku = (item.sku || '').toString().trim().toUpperCase();
                const safeName = (item.name || '').toString().trim().substring(0, 490);

                if (!safeSku) throw new Error('Missing SKU');

                const catKey = (item.category || '').toString().trim().toLowerCase();
                const category = categoryMap.get(catKey) || defaultCategory;
                const price = Number(item.price) || 0;

                let product = productMap.get(safeSku);

                if (product) {
                    product.name = safeName;
                    product.price = price;
                    product.costPrice = Number(item.costPrice) || product.costPrice;
                    if (item.wholesalePrice !== undefined && item.wholesalePrice !== null) {
                        product.wholesalePrice = Number(item.wholesalePrice);
                    }
                    product.description = item.description || product.description;
                    product.category = category;
                    if (item.imageUrl) product.imageUrl = item.imageUrl;
                    await queryRunner.manager.save(product);
                    updatedCount++;
                    reports.push({ row: i + 1, sku: safeSku, status: 'UPDATED', message: 'Refreshed existing part.' });
                } else {
                    product = new Product();
                    product.sku = safeSku;
                    product.name = safeName;
                    product.price = price;
                    product.costPrice = Number(item.costPrice) || 0;
                    if (item.wholesalePrice !== undefined && item.wholesalePrice !== null) {
                        product.wholesalePrice = Number(item.wholesalePrice);
                    }
                    product.description = item.description || '';
                    product.category = category;
                    product.imageUrl = item.imageUrl || '';
                    product.importBatchId = batchId; // Tag new products for rollback
                    product = await queryRunner.manager.save(product);
                    productMap.set(safeSku, product);
                    createdCount++;
                    reports.push({ row: i + 1, sku: safeSku, status: 'CREATED', message: 'New part added.' });
                }

                // Handle OEMs
                if (item.oemNumbers) {
                    await queryRunner.manager.delete(OemNumber, { product: { id: product.id } } as any);
                    const oems = item.oemNumbers.split(/[,;\n]/).map((s: string) => s.trim()).filter(Boolean).map((code: string) => {
                        const o = new OemNumber();
                        o.code = code.toUpperCase();
                        o.product = product!;
                        return o;
                    });
                    if (oems.length > 0) {
                        await queryRunner.manager.save(OemNumber, oems, { chunk: 100 });
                    }
                }

                // Handle Stock
                if (item.quantity !== undefined && item.quantity !== null) {
                    let stock = stockMap.get(product.id);
                    if (!stock) {
                        stock = new ProductStock();
                        stock.product = product;
                        stock.branch = branch;
                        stockMap.set(product.id, stock);
                    }
                    stock.quantity = Number(item.quantity) || 0;
                    if (item.lowStockThreshold !== undefined && item.lowStockThreshold !== null) {
                        stock.lowStockThreshold = Number(item.lowStockThreshold) || 0;
                    }
                    await queryRunner.manager.save(stock);
                }

                // Handle Compatibility / Vehicles
                if (item.compatibility) {
                    const rawVehicles = item.compatibility
                        .split(/[;\n]/)
                        .map((s: string) => s.trim())
                        .filter(Boolean);

                    if (rawVehicles.length > 0) {
                        const vehicles: Vehicle[] = [];
                        for (const cleanItem of rawVehicles) {
                            const parts = cleanItem.split(/\s+/);
                            let make = 'Generic';
                            let model = cleanItem;
                            if (parts.length > 1) {
                                make = parts[0];
                                model = parts.slice(1).join(' ');
                            }
                            let vehicle = await queryRunner.manager.findOne(Vehicle, { where: { make, model } });
                            if (!vehicle) {
                                vehicle = queryRunner.manager.create(Vehicle, { make, model });
                                vehicle = await queryRunner.manager.save(Vehicle, vehicle);
                            }
                            vehicles.push(vehicle);
                        }
                        product.vehicles = vehicles;
                        await queryRunner.manager.save(product);
                    }
                }
            } catch (rowError: any) {
                reports.push({ row: i + 1, sku: item.sku, status: 'ERROR', message: rowError.message });
            }
        }

        if (dryRun) {
            await queryRunner.rollbackTransaction();
            res.json({ message: 'Dry run completed.', created: createdCount, updated: updatedCount, reports, batchId, isDryRun: true });
        } else {
            await queryRunner.commitTransaction();
            await CacheService.invalidate('products:*');
            res.json({ message: 'Import finalized.', created: createdCount, updated: updatedCount, reports, batchId, isDryRun: false });
        }
    } catch (error: any) {
        await queryRunner.rollbackTransaction();
        res.status(500).json({ error: error.message || 'Import failed' });
    } finally {
        await queryRunner.release();
    }
});

export default router;