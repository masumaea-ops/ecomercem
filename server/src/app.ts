import 'reflect-metadata';
import path from 'path';
import fs from 'fs'; 

console.log(`\n🚀 [APP] Initializing Masuma ERP Server Module...`);

import { config } from './config/env'; 
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
declare const require: any;

import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { AppDataSource } from './config/database';
import { BlogPost } from './entities/BlogPost';
import { Product } from './entities/Product';
import { VehicleListing } from './entities/VehicleListing';
import { Review } from './entities/Review';
import { errorHandler } from './middleware/errorHandler'; 
import { httpLogger } from './middleware/httpLogger'; 
import { logger } from './utils/logger';
import { startEmailWorker } from './workers/emailWorker';
import { SeedService } from './services/seedService';
import { generateSlug } from './utils/slug';
import { isSearchEngineBot, buildProductSemanticSnapshot, buildCategorySemanticSnapshot, buildCompatibilitySemanticSnapshot } from './middleware/crawlerPrerender';
import { 
  buildProductSchemaGraph, 
  buildCategorySchemaGraph, 
  buildHomeSchemaGraph, 
  buildArticleSchemaGraph, 
  buildCompatibilitySchemaGraph,
  renderJsonLdScriptTag 
} from './services/schemaService';
import compatibilityRoutes from './routes/compatibility.routes';

// Route Imports
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/product.routes';
import inventoryRoutes from './routes/inventory.routes';
import salesRoutes from './routes/sales.routes';
import customerRoutes from './routes/customer.routes';
import statsRoutes from './routes/stats.routes';
import orderRoutes from './routes/order.routes';
import mpesaRoutes from './routes/mpesa.routes';
import blogRoutes from './routes/blog.routes';
import userRoutes from './routes/user.routes'; 
import auditRoutes from './routes/audit.routes'; 
import settingsRoutes from './routes/settings.routes'; 
import quoteRoutes from './routes/quote.routes';
import reportRoutes from './routes/report.routes'; 
import contactRoutes from './routes/contact.routes'; 
import branchRoutes from './routes/branch.routes'; 
import categoryRoutes from './routes/category.routes';
import returnRoutes from './routes/return.routes';
import healthRoutes from './routes/health.routes';
import exchangeRoutes from './routes/exchange.routes';
import vehicleRoutes from './routes/vehicle.routes';
import uploadRoutes from './routes/upload.routes'; 
import financeRoutes from './routes/finance.routes';
import notificationRoutes from './routes/notification.routes';
import newsletterRoutes from './routes/newsletter.routes';
import marketplaceRoutes from './routes/marketplace.routes';
import promoRoutes from './routes/promo.routes';
import sitemapRoutes from './routes/sitemap.routes';
import importCalculatorRoutes from './routes/import-calculator.routes';
import fraudRoutes from './routes/fraud.routes';
import importRequestRoutes from './routes/import-request.routes';
import analyticsRoutes from './routes/analytics.routes';
import productFeedRoutes from './routes/product-feed.routes';
import facebookVehicleFeedRoutes from './routes/facebook-vehicle-feed.routes';
import reviewRoutes from './routes/review.routes';
import backupRoutes from './routes/backup.routes';
import integrationRoutes from './routes/integration.routes';
import aiRoutes from './routes/ai.routes';

import { sanitizeInputs } from './utils/sanitizer';
import { generalApiLimiter } from './middleware/rateLimiter';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const autoHealProductsTable = async () => {

  const queryRunner = AppDataSource.createQueryRunner();
  try {
    const table = await queryRunner.getTable('products');
    if (table) {
      const hasCreatedAt = table.columns.some(col => col.name === 'createdAt');
      const hasUpdatedAt = table.columns.some(col => col.name === 'updatedAt');
      
      if (!hasCreatedAt) {
        logger.info("🔧 Auto-Heal: Adding missing column 'createdAt' to 'products' table...");
        await queryRunner.query("ALTER TABLE `products` ADD COLUMN `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)");
        logger.info("✅ Auto-Heal: Column 'createdAt' added successfully!");
      }
      
      if (!hasUpdatedAt) {
        logger.info("🔧 Auto-Heal: Adding missing column 'updatedAt' to 'products' table...");
        await queryRunner.query("ALTER TABLE `products` ADD COLUMN `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)");
        logger.info("✅ Auto-Heal: Column 'updatedAt' added successfully!");
      }
    }
  } catch (dbErr: any) {
    logger.error("❌ Schema sync failed for products table:", dbErr.message);
  } finally {
    await queryRunner.release();
  }
};

const startBackgroundServices = () => {
  console.log('👷 [WORKER] Starting background services...');
  startEmailWorker();
};

let dbInitPromise: Promise<void> | null = null;

const connectDatabase = async () => {
  if (AppDataSource.isInitialized) return;
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      try {
        if (!AppDataSource.isInitialized) {
          console.log('Entities in DataSource:', AppDataSource.options.entities); 
          await AppDataSource.initialize();
          logger.info(`✅ Database connected: ${config.DB_NAME} (${AppDataSource.options.type})`);
          await autoHealProductsTable();

          // Automatic Database Migration & Idempotent Seeding
          if (process.env.AUTO_SEED !== 'false') {
            await SeedService.runAutoMigrationAndSeed();
          }

          startBackgroundServices();
        }
      } catch (err: any) {
        dbInitPromise = null;
        logger.error('❌ Database connection failed:', err);
        throw err;
      }
    })();
  }
  return dbInitPromise;
};

connectDatabase();

// 2. Security Middleware (OWASP Top 10 & ASVS Level 2)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.googletagmanager.com", "https://apis.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
      connectSrc: [
        "'self'",
        "https://*.masuma.africa",
        "https://masuma.africa",
        "https://*.masuma.co.ke",
        "https://masuma.co.ke",
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com",
        ...((process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)),
        "https://*.a.run.app",
        "https://api.pesaflow.com",
        "https://sandbox.safaricom.co.ke",
        "https://api.safaricom.co.ke",
        "http://localhost:*",
        "ws://localhost:*",
        "https://generativelanguage.googleapis.com"
      ],
      frameSrc: [
        "'self'",
        "https://masuma.parts",
        "https://*.masuma.parts",
        "https://www.youtube.com",
        "https://youtube.com",
        "https://www.youtube-nocookie.com",
        "https://youtube-nocookie.com",
        "https://www.google.com",
        "https://maps.google.com"
      ],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
}) as any); 

app.use(compression() as any); 

// Custom origins from environment variables (comma-separated, e.g. "https://domain1.com,https://domain2.com")
const customOrigins = (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Strict CORS: Exact domain whitelisting & strict regex validation
const allowedExactOrigins = new Set([
  'https://masuma.africa',
  'https://www.masuma.africa',
  'https://shop.masuma.africa',
  'https://admin.masuma.africa',
  'https://pos.masuma.africa',
  'https://masuma.co.ke',
  'https://www.masuma.co.ke',
  'https://shop.masuma.co.ke',
  'https://admin.masuma.co.ke',
  'https://pos.masuma.co.ke',
  ...customOrigins
]);

const MASUMA_DOMAIN_REGEX = /^https?:\/\/([a-z0-9-]+\.)*masuma\.(africa|co\.ke|com|ke|ug|tz)(:\d+)?$/i;
const DEV_LOCALHOST_REGEX = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const GCP_RUN_REGEX = /^https:\/\/masuma-[a-z0-9-]+\.a\.run\.app$/;

app.use(cors({ 
  origin: (origin, callback) => {
    // Allow non-browser requests with no origin (curl, cron jobs, mobile apps, direct server requests)
    if (!origin) return callback(null, true);
    
    const isAllowed = 
      allowedExactOrigins.has(origin) ||
      MASUMA_DOMAIN_REGEX.test(origin) ||
      customOrigins.some(co => origin === co || origin.endsWith('.' + co.replace(/^https?:\/\//, ''))) ||
      GCP_RUN_REGEX.test(origin) ||
      (config.NODE_ENV !== 'production' && DEV_LOCALHOST_REGEX.test(origin));
                     
    if (isAllowed) {
      callback(null, true);
    } else {
      logger.warn(`Security Notice: CORS origin not whitelisted: ${origin}`);
      // Do not throw an error that crashes static assets with HTTP 500!
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-API-KEY', 'X-Integration-Client']
}) as any);

// Request body limits: 1MB max to mitigate memory exhaustion DoS
app.use(express.json({ limit: '1mb' }) as any);
app.use(express.urlencoded({ limit: '1mb', extended: true }) as any);

// XSS Sanitization Middleware
app.use(sanitizeInputs as any);

app.use(httpLogger as any);

// 1. Static Media serving with security isolation headers (anti-XSS sandbox) & 30-day Core Web Vitals caching
const mediaPath = path.join(process.cwd(), 'media');
if (!fs.existsSync(mediaPath)) fs.mkdirSync(mediaPath, { recursive: true });
app.use('/media', (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
  next();
}, express.static(mediaPath, { maxAge: '30d' }) as any);

// 2. Global API Rate Limiting
app.use('/api', generalApiLimiter as any);


// Ensure Database is initialized before any API request proceeds
app.use(async (req, res, next) => {
  try {
    if (!AppDataSource.isInitialized) {
      await connectDatabase();
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Database initializing or connection error' });
  }
});

// 3. API ROUTES (Must be registered BEFORE frontend static/catch-all)
app.use('/api/auth', authRoutes as any);
app.use('/api/reviews', reviewRoutes as any);
app.use('/api/products', reviewRoutes as any);
app.use('/api/products', productRoutes as any); 
app.use('/api/inventory', inventoryRoutes as any);
app.use('/api/sales', salesRoutes as any);
app.use('/api/customers', customerRoutes as any);
app.use('/api/admin/stats', statsRoutes as any);
app.use('/api/orders', orderRoutes as any);
app.use('/api/mpesa', mpesaRoutes as any);
app.use('/sitemap.xml', sitemapRoutes as any);
app.use('/sitemap-products.xml', sitemapRoutes as any);
app.use('/sitemap-categories.xml', sitemapRoutes as any);
app.use('/sitemap-compatibility.xml', sitemapRoutes as any);
app.use('/sitemap-blog.xml', sitemapRoutes as any);
app.use('/sitemap-marketplace.xml', sitemapRoutes as any);
app.use('/sitemap-static.xml', sitemapRoutes as any);
app.use('/google-product-feed.xml', productFeedRoutes as any);
app.use('/facebook-vehicle-feed.xml', facebookVehicleFeedRoutes as any);
app.use('/api/compatibility', compatibilityRoutes as any);
app.use('/api/blog', blogRoutes as any);
app.use('/api/users', userRoutes as any); 
app.use('/api/audit-logs', auditRoutes as any); 
app.use('/api/settings', settingsRoutes as any); 
app.use('/api/quotes', quoteRoutes as any);
app.use('/api/reports', reportRoutes as any);
app.use('/api/contact', rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 messages per hour
  message: { error: 'Too many messages. Please try again later.' }
}) as any, contactRoutes as any); 
app.use('/api/branches', branchRoutes as any); 
app.use('/api/categories', categoryRoutes as any);
app.use('/api/returns', returnRoutes as any);
app.use('/api/health', healthRoutes as any);
app.use('/api/exchange-rates', exchangeRoutes as any);
app.use('/api/vehicles', vehicleRoutes as any);
app.use('/api/upload', uploadRoutes as any);
app.use('/api/finance', financeRoutes as any);
app.use('/api/notifications', notificationRoutes as any);
app.use('/api/newsletter', rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 signups per hour
  message: { error: 'Too many subscription attempts. Please try again later.' }
}) as any, newsletterRoutes as any);
app.use('/api/promo', promoRoutes as any);
app.use('/api/marketplace', marketplaceRoutes as any);
app.use('/api/import-calculator', importCalculatorRoutes as any);
app.use('/api/fraud', fraudRoutes as any);
app.use('/api/import-requests', importRequestRoutes as any);
app.use('/api/analytics', analyticsRoutes as any);
app.use('/api/backup', backupRoutes as any);
app.use('/api/v1/integration', integrationRoutes as any);
app.use('/api/integration', integrationRoutes as any);
app.use('/api/ai', aiRoutes as any);
app.use('/api/chat', aiRoutes as any);

// 3.5 Technical SEO Routes
app.get('/robots.txt', (req, res) => {
    const protocol = req.get('x-forwarded-proto') || (req.get('host')?.includes('masuma') ? 'https' : req.protocol);
    const host = req.get('host');
    res.type('text/plain');
    res.send(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /admin
Disallow: /login
Disallow: /checkout
Disallow: /reset-password
Disallow: /*?*q=
Disallow: /*?*search=
Disallow: /*?*sort=
Disallow: /*?*order=
Disallow: /*?*price_min=
Disallow: /*?*price_max=
Disallow: /*?*ref=
Disallow: /*?*filter_*=

User-agent: Googlebot
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /login
Disallow: /checkout
Disallow: /*?*q=
Disallow: /*?*search=

User-agent: Googlebot-Image
Allow: /images/
Allow: /media/
Allow: /assets/

User-agent: Bingbot
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /login
Disallow: /checkout
Disallow: /*?*sort=
Disallow: /*?*price_min=
Disallow: /*?*price_max=

User-agent: GPTBot
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /checkout

User-agent: PerplexityBot
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /checkout

User-agent: ClaudeBot
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /checkout

Sitemap: ${protocol}://${host}/sitemap.xml
Sitemap: ${protocol}://${host}/sitemap-products.xml
Sitemap: ${protocol}://${host}/sitemap-categories.xml
Sitemap: ${protocol}://${host}/sitemap-compatibility.xml
Sitemap: ${protocol}://${host}/sitemap-blog.xml
Sitemap: ${protocol}://${host}/sitemap-marketplace.xml
Sitemap: ${protocol}://${host}/sitemap-static.xml
# LLMs.txt: ${protocol}://${host}/llms.txt`);
});

app.get('/llms.txt', (req, res) => {
    const llmsPath = path.join(process.cwd(), 'public', 'llms.txt');
    const altLlmsPath = path.join(process.cwd(), '..', 'public', 'llms.txt');
    if (fs.existsSync(llmsPath)) {
        res.type('text/plain');
        return res.sendFile(llmsPath);
    }
    if (fs.existsSync(altLlmsPath)) {
        res.type('text/plain');
        return res.sendFile(altLlmsPath);
    }
    res.type('text/plain');
    res.send(`# Masuma Autoparts East Africa\nOfficial distributor of genuine Japanese automotive parts in Nairobi, Kenya.\nWebsite: https://masuma.africa`);
});

// 4. FRONTEND SERVING
const possibleDistPaths = [
    path.join((process as any).cwd(), 'dist'),                         
    path.join((process as any).cwd(), '..', 'dist'),                   
];

let frontendPath = '';
for (const p of possibleDistPaths) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
        frontendPath = p;
        console.log(`📂 [SERVER] Frontend detected and serving from: ${p}`);
        // Enterprise Core Web Vitals caching: 1 year immutable for hashed assets, revalidate for html
        app.use(express.static(p, { 
            index: false,
            maxAge: '1d',
            setHeaders: (res: any, filePath: string) => {
                if (filePath.includes(path.sep + 'assets' + path.sep)) {
                    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
                } else if (filePath.endsWith('.html')) {
                    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
                } else {
                    res.setHeader('Cache-Control', 'public, max-age=86400');
                }
            }
        }) as any);
        break;
    }
}

if (!frontendPath) {
    console.warn('⚠️ [SERVER] WARNING: dist folder not found. Website frontend might not load.');
}

// 5. CATCH-ALL
app.get('*', async (req: any, res: any) => {
    // If it's an API request that wasn't handled, return 404 JSON
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Endpoint not found' });
    
    // Otherwise serve index.html for SPA routing
    if (frontendPath) {
        const indexPath = path.join(frontendPath, 'index.html');
        if (fs.existsSync(indexPath)) {
            try {
                let html = fs.readFileSync(indexPath, 'utf8');
                
                const sanitizeId = (val: any) => typeof val === 'string' ? val.replace(/[?/,!]$/g, '').trim() : '';
                const postId = sanitizeId(req.query.post);
                const productId = sanitizeId(req.query.product);
                const listingId = sanitizeId(req.query.listing);
                const viewParam = req.query.view as string;

                let metaData: any = null;
                const protocol = req.get('x-forwarded-proto') || (req.get('host')?.includes('masuma.africa') ? 'https' : req.protocol);
                const baseUrl = `${protocol}://${req.get('host')}`;
                let pathView = viewParam;
                let categoryTitle = '';

                const productRepo = AppDataSource.getRepository(Product);

                // 1. Resolve product from either ID param or Clean Slug Path
                let resolvedProduct: any = null;
                let isProductNotFound = false;
                if (productId) {
                    try {
                        resolvedProduct = await productRepo.findOne({
                            where: { id: productId },
                            relations: ['category', 'oemNumbers', 'vehicles', 'stock']
                        });
                    } catch (e) {}
                } else if (req.path.startsWith('/products/')) {
                    const slug = decodeURIComponent(req.path.substring('/products/'.length)).trim().split('?')[0];
                    if (slug) {
                        try {
                            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                            if (uuidRegex.test(slug)) {
                                resolvedProduct = await productRepo.findOne({
                                    where: { id: slug },
                                    relations: ['category', 'oemNumbers', 'vehicles', 'stock']
                                });
                            }
                            if (!resolvedProduct) {
                                // Try exact SKU
                                resolvedProduct = await productRepo.findOne({
                                    where: { sku: slug },
                                    relations: ['category', 'oemNumbers', 'vehicles', 'stock']
                                });
                            }
                            if (!resolvedProduct) {
                                // Try case-insensitive SKU match
                                resolvedProduct = await productRepo.createQueryBuilder('product')
                                    .leftJoinAndSelect('product.category', 'category')
                                    .leftJoinAndSelect('product.oemNumbers', 'oemNumbers')
                                    .leftJoinAndSelect('product.vehicles', 'vehicles')
                                    .leftJoinAndSelect('product.stock', 'stock')
                                    .where('LOWER(product.sku) = :sku', { sku: slug.toLowerCase() })
                                    .getOne();
                            }
                            if (!resolvedProduct && slug.includes('-')) {
                                const parts = slug.split('-');
                                const candidates = [];
                                if (parts.length > 0) candidates.push(parts[parts.length - 1].toLowerCase());
                                if (parts.length > 1) candidates.push(`${parts[parts.length - 2]}-${parts[parts.length - 1]}`.toLowerCase());
                                if (parts.length > 2) candidates.push(`${parts[parts.length - 3]}-${parts[parts.length - 2]}-${parts[parts.length - 1]}`.toLowerCase());
                                
                                for (const candidate of candidates) {
                                    resolvedProduct = await productRepo.createQueryBuilder('product')
                                        .leftJoinAndSelect('product.category', 'category')
                                        .leftJoinAndSelect('product.oemNumbers', 'oemNumbers')
                                        .leftJoinAndSelect('product.vehicles', 'vehicles')
                                        .leftJoinAndSelect('product.stock', 'stock')
                                        .where('LOWER(product.sku) = :sku', { sku: candidate })
                                        .getOne();
                                    if (resolvedProduct) break;
                                }
                            }
                            if (!resolvedProduct && slug.includes('-')) {
                                const parts = slug.split('-');
                                const firstWord = parts[0];
                                if (firstWord && firstWord.length > 2) {
                                    const matches = await productRepo.createQueryBuilder('product')
                                        .leftJoinAndSelect('product.category', 'category')
                                        .leftJoinAndSelect('product.oemNumbers', 'oemNumbers')
                                        .leftJoinAndSelect('product.vehicles', 'vehicles')
                                        .leftJoinAndSelect('product.stock', 'stock')
                                        .where('LOWER(product.name) LIKE :word', { word: `%${firstWord}%` })
                                        .getMany();
                                    resolvedProduct = matches.find(m => generateSlug(m.name, m.sku) === slug.toLowerCase()) || null;
                                }
                            }
                            if (!resolvedProduct) {
                                isProductNotFound = true;
                            } else if (resolvedProduct.lifecycleStatus === 'DISCONTINUED') {
                                // Phase 4 EOL Product 301 Redirection: Transfer 100% PageRank to successor
                                if (resolvedProduct.successorProductId) {
                                    try {
                                        const successor = await productRepo.findOne({
                                            where: { id: resolvedProduct.successorProductId }
                                        });
                                        if (successor) {
                                            return res.redirect(301, `/products/${generateSlug(successor.name, successor.sku)}`);
                                        }
                                    } catch (e) {}
                                }
                                if (resolvedProduct.category?.name) {
                                    return res.redirect(301, `/categories/${encodeURIComponent(resolvedProduct.category.name)}`);
                                }
                                return res.redirect(301, '/catalog');
                            }
                        } catch (e) {
                            console.error('Error matching product from slug:', e);
                        }
                    }
                }

                // 2. Resolve blog post from either post ID query param or Clean Blog Slug Path
                let resolvedPost: any = null;
                const postRepo = AppDataSource.getRepository(BlogPost);
                if (postId) {
                    try {
                        resolvedPost = await postRepo.findOneBy({ id: postId });
                    } catch (e) {}
                } else if (req.path.startsWith('/blog/')) {
                    const slug = decodeURIComponent(req.path.substring('/blog/'.length)).trim().split('?')[0];
                    if (slug) {
                        try {
                            const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
                            const match = slug.match(uuidRegex);
                            const extractedId = match ? match[0] : slug;
                            resolvedPost = await postRepo.findOneBy({ id: extractedId });
                        } catch (e) {
                            console.error('Error matching blog post from slug:', e);
                        }
                    }
                }

                // 3. Resolve vehicle listing from either listing ID query param or Clean Marketplace Slug Path
                let resolvedListing: any = null;
                let compatibilityData: any = null;
                const listingRepo = AppDataSource.getRepository(VehicleListing);
                if (listingId) {
                    try {
                        resolvedListing = await listingRepo.findOne({ 
                            where: { id: listingId },
                            relations: ['seller']
                        });
                    } catch (e) {}
                } else if (req.path.startsWith('/marketplace/')) {
                    const slug = decodeURIComponent(req.path.substring('/marketplace/'.length)).trim().split('?')[0];
                    if (slug) {
                        try {
                            const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
                            const match = slug.match(uuidRegex);
                            const extractedId = match ? match[0] : slug;
                            resolvedListing = await listingRepo.findOne({
                                where: { id: extractedId },
                                relations: ['seller']
                            });
                        } catch (e) {
                            console.error('Error matching vehicle listing from slug:', e);
                        }
                    }
                }

                if (resolvedPost) {
                    try {
                        metaData = {
                            title: resolvedPost.title,
                            description: resolvedPost.excerpt || resolvedPost.content.substring(0, 160).replace(/<[^>]*>/g, '') + '...',
                            image: resolvedPost.image ? (resolvedPost.image.startsWith('http') ? resolvedPost.image : `${baseUrl}${resolvedPost.image}`) : `${baseUrl}/og-image.jpg`,
                            url: `${baseUrl}${req.originalUrl}`,
                            type: 'article'
                        };
                    } catch (e) {
                        console.error('Error preparing blog post metadata:', e);
                    }
                } else if (isProductNotFound) {
                    metaData = {
                        title: 'Part Not Found | Masuma Autoparts EA',
                        description: 'The requested automotive spare part could not be found or has been moved.',
                        image: `${baseUrl}/og-image.jpg`,
                        url: `${baseUrl}${req.path}`,
                        type: 'website',
                        noindex: true
                    };
                } else if (resolvedProduct) {
                    try {
                        const totalStock = (resolvedProduct.stock || []).reduce((acc: number, s: any) => acc + s.quantity, 0);
                        const oemList = (resolvedProduct.oemNumbers || []).map((o: any) => o.code || o.number).filter(Boolean);
                        const oemSuffix = oemList.length > 0 ? ` OEM: ${oemList.slice(0, 3).join(', ')}.` : '';
                        metaData = {
                            title: `${resolvedProduct.name} (${resolvedProduct.sku})`,
                            description: resolvedProduct.description ? `${resolvedProduct.description.substring(0, 135).replace(/<[^>]*>/g, '')}${oemSuffix}`.trim() : `Buy genuine Japanese Masuma ${resolvedProduct.name} (${resolvedProduct.sku}) in Nairobi, Kenya. 12-Month Warranty.${oemSuffix}`,
                            image: resolvedProduct.imageUrl ? (resolvedProduct.imageUrl.startsWith('http') ? resolvedProduct.imageUrl : `${baseUrl}${resolvedProduct.imageUrl}`) : `${baseUrl}/og-image.jpg`,
                            url: `${baseUrl}${req.originalUrl}`,
                            sku: resolvedProduct.sku,
                            price: resolvedProduct.price,
                            availability: totalStock > 0 ? 'InStock' : 'OutOfStock',
                            type: 'product'
                        };
                    } catch (e) {
                        console.error('Error preparing product metadata:', e);
                    }
                } else if (resolvedListing) {
                    try {
                        metaData = {
                            title: `${resolvedListing.year} ${resolvedListing.make} ${resolvedListing.model}`,
                            description: resolvedListing.description ? resolvedListing.description.substring(0, 160) : `Verified ${resolvedListing.make} ${resolvedListing.model} for sale in Kenya.`,
                            image: resolvedListing.images && resolvedListing.images.length > 0 ? (resolvedListing.images[0].startsWith('http') ? resolvedListing.images[0] : `${baseUrl}${resolvedListing.images[0]}`) : `${baseUrl}/og-image.jpg`,
                            url: `${baseUrl}${req.originalUrl}`,
                            type: 'product'
                        };
                    } catch (e) {
                        console.error('Error preparing listing metadata:', e);
                    }
                } else {
                    // 2. Map Clean Pathname Views to ViewState for Static metadata fallback
                    const requestPath = req.path;
                    compatibilityData = null;
                    
                    if (requestPath.startsWith('/compatibility/')) {
                        pathView = 'COMPATIBILITY';
                        const compSegments = requestPath.substring('/compatibility/'.length).split('/').filter(Boolean);
                        const compMake = compSegments[0] ? decodeURIComponent(compSegments[0]).replace(/[-_]+/g, ' ').trim() : '';
                        const compModel = compSegments[1] ? decodeURIComponent(compSegments[1]).replace(/[-_]+/g, ' ').trim() : '';
                        const compCat = compSegments[2] ? decodeURIComponent(compSegments[2]).replace(/[-_]+/g, ' ').trim() : '';

                        try {
                            const qb = productRepo.createQueryBuilder('product')
                                .leftJoinAndSelect('product.category', 'category')
                                .leftJoinAndSelect('product.oemNumbers', 'oem')
                                .leftJoinAndSelect('product.vehicles', 'vehicle')
                                .leftJoinAndSelect('product.stock', 'stock');

                            if (compMake) {
                                qb.andWhere('LOWER(vehicle.make) LIKE :make', { make: `%${compMake.toLowerCase()}%` });
                            }
                            if (compModel) {
                                const mTokens = compModel.toLowerCase().split(/\s+/).filter(t => t.length > 1);
                                if (mTokens.length > 0) {
                                    const conds = mTokens.map((_, i) => `LOWER(vehicle.model) LIKE :mToken${i}`).join(' OR ');
                                    const params: Record<string, string> = {};
                                    mTokens.forEach((t, i) => { params[`mToken${i}`] = `%${t}%`; });
                                    qb.andWhere(`(${conds})`, params);
                                }
                            }
                            if (compCat && compCat.toLowerCase() !== 'all') {
                                qb.andWhere('LOWER(category.name) LIKE :cat', { cat: `%${compCat.toLowerCase()}%` });
                            }

                            const compProducts = await qb.orderBy('product.updatedAt', 'DESC').take(30).getMany();
                            const oemSet = new Set<string>();
                            compProducts.forEach(p => {
                                (p.oemNumbers || []).forEach(o => {
                                    const c = o.code || (o as any).number;
                                    if (c) oemSet.add(c.trim());
                                });
                            });

                            const formattedMake = compMake ? compMake.charAt(0).toUpperCase() + compMake.slice(1) : 'Japanese Vehicle';
                            const formattedModel = compModel ? compModel.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Fitment';
                            const formattedCat = compCat ? compCat.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'All Parts';

                            compatibilityData = {
                                make: formattedMake,
                                model: formattedModel,
                                category: formattedCat,
                                products: compProducts,
                                oemNumbers: Array.from(oemSet).slice(0, 15)
                            };

                            const targetCat = formattedCat !== 'All Parts' ? formattedCat : (compProducts[0]?.category?.name || 'Spare');
                            metaData = {
                                title: `${formattedMake} ${formattedModel} ${targetCat} Parts | Guaranteed Fitment - Masuma Kenya`,
                                description: `Buy guaranteed fitment Japanese Masuma ${targetCat} parts for ${formattedMake} ${formattedModel} in Nairobi, Kenya. 12-Month Warranty. Ruby Mall counter pickup & countrywide dispatch.`,
                                image: `${baseUrl}/og-image.jpg`,
                                url: `${baseUrl}${req.originalUrl}`,
                                type: 'website'
                            };
                        } catch (e) {
                            console.error('Error preparing compatibility metadata:', e);
                        }
                    } else if (requestPath === '/' || requestPath === '') {
                        pathView = 'HOME';
                    } else if (requestPath === '/catalog') {
                        pathView = 'CATALOG';
                    } else if (requestPath.startsWith('/categories/') || requestPath.startsWith('/category/')) {
                        pathView = 'CATALOG';
                        const catSegment = requestPath.startsWith('/categories/') ? requestPath.substring('/categories/'.length) : requestPath.substring('/category/'.length);
                        categoryTitle = decodeURIComponent(catSegment).trim();
                    } else if (requestPath === '/part-finder') {
                        pathView = 'PART_FINDER';
                    } else if (requestPath === '/marketplace') {
                        pathView = 'MARKETPLACE';
                    } else if (requestPath === '/import-calculator') {
                        pathView = 'IMPORT_CALCULATOR';
                    } else if (requestPath === '/blog') {
                        pathView = 'BLOG';
                    } else if (requestPath === '/about') {
                        pathView = 'ABOUT';
                    } else if (requestPath === '/contact') {
                        pathView = 'CONTACT';
                    } else if (requestPath === '/warranty') {
                        pathView = 'WARRANTY';
                    } else if (requestPath === '/returns' || requestPath === '/returns-policy' || requestPath === '/refund-policy') {
                        pathView = 'RETURNS';
                    } else if (requestPath === '/faq') {
                        pathView = 'FAQ';
                    } else if (requestPath === '/privacy') {
                        pathView = 'PRIVACY';
                    } else if (requestPath === '/terms') {
                        pathView = 'TERMS';
                    } else if (requestPath === '/cookies') {
                        pathView = 'COOKIES';
                    } else if (requestPath === '/checkout') {
                        pathView = 'CHECKOUT';
                    } else if (requestPath === '/site-directory' || requestPath === '/sitemap') {
                        pathView = 'SITE_DIRECTORY';
                    }

                    const viewTitles: Record<string, { t: string, d: string }> = {
                        'SITE_DIRECTORY': { t: 'Site Directory & Automotive Fitment Index | Masuma Kenya', d: 'Complete catalog sitemap and Japanese vehicle fitment index for Masuma genuine spare parts in Nairobi, Kenya.' },
                        'CATALOG': { t: categoryTitle ? `Genuine Masuma ${categoryTitle} in Nairobi, Kenya | 12-Month Warranty` : 'Automotive Spare Parts Catalog | Masuma Kenya', d: categoryTitle ? `Buy genuine Masuma ${categoryTitle} in Nairobi, Kenya. Japanese OEM precision, 12-Month unlimited mileage warranty. Fast dispatch across Kenya.` : 'Browse over 10,000+ genuine Japanese automotive spare parts with a 12-month warranty in Nairobi, Kenya.' },
                        'ABOUT': { t: 'About Us', d: 'Masuma Autoparts East Africa - Official Japanese parts distributor.' },
                        'CONTACT': { t: 'Contact Us', d: 'Get in touch with our Nairobi head office for genuine part inquiries.' },
                        'MARKETPLACE': { t: 'Vehicle Marketplace', d: 'Buy and sell verified cars and motorcycles in Kenya.' },
                        'IMPORT_CALCULATOR': { t: 'Import Duty Calculator', d: 'Calculate total taxes and duty for importing vehicles to Kenya.' },
                        'WARRANTY': { t: 'Warranty Policy', d: 'Learn about our industry-leading 12-month warranty on all parts.' },
                        'RETURNS': { t: 'Returns, Exchanges & Refund Policy', d: 'Official 7-day returns, exchanges and refund policy for Masuma Autoparts East Africa. 12-month defect replacement warranty.' },
                        'FAQ': { t: 'Frequently Asked Questions (FAQ)', d: 'Find answers to common questions about Masuma genuine automotive parts, compatibility, ordering, warranty and delivery in Kenya.' },
                        'PART_FINDER': { t: 'VIN & Part Finder', d: 'Identify compatible spare parts for your car using your chassis number.' },
                        'BLOG': { t: 'Automotive News & Blog', d: 'Stay updated with maintenance guides, car reviews, and company news.' },
                        'PRIVACY': { t: 'Privacy Policy', d: 'Read our privacy policy and learn how we protect your personal information.' },
                        'TERMS': { t: 'Terms of Service', d: 'Read our terms of service for purchasing automotive spare parts.' },
                        'COOKIES': { t: 'Cookie Policy', d: 'Learn how we use cookies to improve your user experience.' },
                        'CHECKOUT': { t: 'Secure Checkout', d: 'Complete your purchase securely via M-Pesa or credit card.' }
                    };

                    const viewData = pathView ? viewTitles[pathView] : null;
                    metaData = {
                        title: viewData ? viewData.t : 'Genuine Japanese Spare Parts Nairobi',
                        description: viewData ? viewData.d : 'Official Masuma distributor in Kenya. Filters, Brakes, Suspension & Spark Plugs.',
                        image: `${baseUrl}/og-image.jpg`,
                        url: `${baseUrl}${req.originalUrl}`,
                        type: 'website'
                    };
                }

                if (metaData) {
                    // Sanitize data
                    const cleanTitle = (metaData.title || 'Masuma Africa').replace(/<[^>]*>/g, '').trim();
                    const cleanDesc = (metaData.description || 'Genuine Japanese Autoparts').replace(/<[^>]*>/g, '').substring(0, 160).trim();
                    const cleanImage = metaData.image || `${baseUrl}/og-image.jpg`;
                    const cleanPath = req.path === '/' ? '' : req.path.split('?')[0];
                    let cleanUrl = `${baseUrl}${cleanPath}`;
                    if (resolvedProduct) {
                        // Phase 4: Keyword Cannibalization Prevention (Variant Canonical Master Clustering)
                        if (resolvedProduct.canonicalMasterId) {
                            try {
                                const master = await productRepo.findOne({ where: { id: resolvedProduct.canonicalMasterId } });
                                if (master) {
                                    cleanUrl = `${baseUrl}/products/${generateSlug(master.name, master.sku)}`;
                                } else {
                                    cleanUrl = `${baseUrl}/products/${generateSlug(resolvedProduct.name, resolvedProduct.sku)}`;
                                }
                            } catch (e) {
                                cleanUrl = `${baseUrl}/products/${generateSlug(resolvedProduct.name, resolvedProduct.sku)}`;
                            }
                        } else {
                            cleanUrl = `${baseUrl}/products/${generateSlug(resolvedProduct.name, resolvedProduct.sku)}`;
                        }
                    } else if (resolvedPost) {
                        cleanUrl = `${baseUrl}/blog/${encodeURIComponent(resolvedPost.id)}`;
                    } else if (resolvedListing) {
                        cleanUrl = `${baseUrl}/marketplace/${encodeURIComponent(resolvedListing.id)}`;
                    }

                    // Phase 4: Faceted Navigation Crawl Budget Firewall (noindex parameter traps, preserve clean canonical)
                    const queryKeys = Object.keys(req.query || {});
                    const hasFacetedFilter = queryKeys.some(k => 
                        ['sort', 'order', 'price_min', 'price_max', 'filter', 'ref', 'q'].includes(k.toLowerCase()) ||
                        k.toLowerCase().startsWith('filter_')
                    );
                    if (hasFacetedFilter) {
                        metaData.noindex = true;
                    }

                    const pageNum = req.query.page ? parseInt(req.query.page as string, 10) : 1;
                    if (!resolvedProduct && !resolvedPost && !resolvedListing && pageNum > 1) {
                        cleanUrl = `${cleanUrl}?page=${pageNum}`;
                    }
                    const ogType = metaData.type || 'website';

                    // 1. Replace Title & Meta Description
                    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${cleanTitle} | Masuma Africa</title>`);
                    html = html.replace(/<meta name="description" content=".*?"\s*\/?>/i, `<meta name="description" content="${cleanDesc}" />`);
                    
                    // 2. Remove existing OG/Twitter/Canonical tags to avoid duplicates
                    html = html.replace(/<meta property=["']og:.*?["'] content=["'].*?["']\s*\/?>/gi, '');
                    html = html.replace(/<meta name=["']twitter:.*?["'] content=["'].*?["']\s*\/?>/gi, '');
                    html = html.replace(/<link rel=["']canonical["'] href=["'].*?["']\s*\/?>/gi, '');
                    
                    let seoTags = `
    <link rel="canonical" href="${cleanUrl}" />
    <meta property="og:title" content="${cleanTitle}" />
    <meta property="og:description" content="${cleanDesc}" />
    <meta property="og:image" content="${cleanImage}" />
    <meta property="og:url" content="${cleanUrl}" />
    <meta property="og:site_name" content="Masuma Africa" />
    <meta property="og:type" content="${ogType}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${cleanTitle}" />
    <meta name="twitter:description" content="${cleanDesc}" />
    <meta name="twitter:image" content="${cleanImage}" />
    ${metaData.noindex ? '<meta name="robots" content="noindex, follow" />' : ''}
`;

                    let approvedReviews: any[] = [];
                    let ratingValue = 5.0;
                    let reviewCount = 1;

                    if ((productId || resolvedProduct) && (metaData as any).sku) {
                        if (resolvedProduct) {
                            try {
                                approvedReviews = await AppDataSource.getRepository(Review).find({
                                    where: { product: { id: resolvedProduct.id }, status: 'APPROVED' },
                                    order: { createdAt: 'DESC' },
                                    take: 10
                                });
                                if (approvedReviews.length > 0) {
                                    reviewCount = approvedReviews.length;
                                    ratingValue = Number((approvedReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewCount).toFixed(1));
                                }
                            } catch (e) {}

                            const productSchemaGraph = buildProductSchemaGraph({
                                product: resolvedProduct,
                                baseUrl,
                                cleanUrl,
                                cleanTitle,
                                cleanDesc,
                                ratingValue,
                                reviewCount,
                                reviews: approvedReviews
                            });
                            seoTags += `\n    ${renderJsonLdScriptTag(productSchemaGraph)}`;
                        }
                    }

                    if (resolvedPost) {
                        const articleSchemaGraph = buildArticleSchemaGraph({
                            post: resolvedPost,
                            baseUrl,
                            cleanUrl
                        });
                        seoTags += `\n    ${renderJsonLdScriptTag(articleSchemaGraph)}`;
                    }

                    let categoryProducts: any[] = [];
                    if (pathView === 'CATALOG' && !resolvedProduct && !productId) {
                        try {
                            const queryBuilder = productRepo.createQueryBuilder('product')
                                .leftJoinAndSelect('product.category', 'category')
                                .leftJoinAndSelect('product.stock', 'stock');
                            
                            if (categoryTitle && categoryTitle !== 'All') {
                                queryBuilder.where('LOWER(category.name) = :catName', { catName: categoryTitle.toLowerCase() });
                            }
                            
                            categoryProducts = await queryBuilder.orderBy('product.updatedAt', 'DESC').take(24).getMany();
                        } catch (e) {
                            console.error('Error fetching category products for SSR:', e);
                        }

                        const categorySchemaGraph = buildCategorySchemaGraph({
                            categoryTitle,
                            categoryProducts,
                            baseUrl,
                            cleanUrl,
                            cleanTitle,
                            cleanDesc
                        });
                        seoTags += `\n    ${renderJsonLdScriptTag(categorySchemaGraph)}`;
                    }

                    if (compatibilityData) {
                        const compSchemaGraph = buildCompatibilitySchemaGraph({
                            make: compatibilityData.make,
                            model: compatibilityData.model,
                            category: compatibilityData.category,
                            products: compatibilityData.products,
                            oemNumbers: compatibilityData.oemNumbers,
                            baseUrl,
                            cleanUrl,
                            cleanTitle,
                            cleanDesc
                        });
                        seoTags += `\n    ${renderJsonLdScriptTag(compSchemaGraph)}`;
                    }

                    // Inject Home Page Knowledge Graph, LocalBusiness, WebSite SearchAction & FAQ schema
                    if (req.path === '/' || req.path === '') {
                        const homeSchemaGraph = buildHomeSchemaGraph(baseUrl);
                        seoTags += `\n    ${renderJsonLdScriptTag(homeSchemaGraph)}`;
                    }

                    html = html.replace('</head>', `${seoTags}</head>`);

                    const isBot = isSearchEngineBot(req.get('user-agent'));

                    if (resolvedProduct) {
                        const oems = (resolvedProduct.oemNumbers || []).map((o: any) => o.code || o.number).filter(Boolean);
                        const vehicleNames = (resolvedProduct.vehicles || []).map((v: any) => 
                            `${v.make} ${v.model} ${v.yearFrom ? `(${v.yearFrom}-${v.yearTo || 'Present'})` : ''} ${v.engineCode ? `Engine: ${v.engineCode}` : ''} ${v.chassisCode ? `Chassis: ${v.chassisCode}` : ''}`.trim()
                        ).filter(Boolean);

                        const formattedPrice = Number((metaData as any).price || 0).toLocaleString('en-KE', { style: 'currency', currency: 'KES' });

                        if (isBot) {
                            const botHtml = buildProductSemanticSnapshot({
                                product: resolvedProduct,
                                cleanTitle,
                                cleanDesc,
                                cleanUrl,
                                formattedPrice,
                                baseUrl,
                                ratingValue,
                                reviewCount,
                                reviews: approvedReviews
                            });
                            html = html.replace('<div id="root"></div>', `<div id="root">${botHtml}</div>`);
                        } else {
                            const noscriptHtml = `
    <noscript>
      <article style="max-width: 900px; margin: 40px auto; padding: 24px; font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1f2937; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb;">
        <h1 style="font-size: 28px; font-weight: 800; color: #111827; margin-bottom: 8px;">${cleanTitle}</h1>
        <p style="font-size: 15px; color: #4b5563; margin-bottom: 12px;"><strong>SKU / Part Number:</strong> ${resolvedProduct.sku}</p>
        <p style="font-size: 22px; font-weight: 700; color: #E0621B; margin-bottom: 20px;">Price: ${formattedPrice} <span style="font-size: 14px; font-weight: normal; color: #6b7280;">(12-Month Unlimited Mileage Warranty)</span></p>
        <div style="margin-bottom: 20px;">
          <h2 style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 8px;">Part Details & Description</h2>
          <p style="color: #374151;">${cleanDesc}</p>
        </div>
        ${oems.length > 0 ? `
        <div style="margin-bottom: 20px;">
          <h2 style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 8px;">OEM Cross-Reference Numbers</h2>
          <p style="color: #374151;">${oems.join(' • ')}</p>
        </div>` : ''}
        ${vehicleNames.length > 0 ? `
        <div style="margin-bottom: 20px;">
          <h2 style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 8px;">Compatible Vehicles & Fitment</h2>
          <ul style="padding-left: 20px; color: #374151;">
            ${vehicleNames.map((name: string) => `<li style="margin-bottom: 4px;">${name}</li>`).join('')}
          </ul>
        </div>` : ''}
        <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; font-size: 13px; color: #6b7280;">
          <p><strong>Official Distributor:</strong> Masuma Autoparts East Africa Limited, Ruby Mall, Accra Road, Nairobi, Kenya.</p>
          <p>Countrywide delivery across Kenya. Genuine Japanese Quality Guaranteed.</p>
        </div>
      </article>
    </noscript>`;
                            html = html.replace('<div id="root"></div>', `<div id="root"></div>\n${noscriptHtml}`);
                        }
                    }

                    if (pathView === 'CATALOG' && !resolvedProduct && !productId && categoryProducts.length > 0) {
                        if (isBot) {
                            const botCategoryHtml = buildCategorySemanticSnapshot({
                                categoryTitle,
                                cleanDesc,
                                baseUrl,
                                cleanUrl,
                                categoryProducts
                            });
                            html = html.replace('<div id="root"></div>', `<div id="root">${botCategoryHtml}</div>`);
                        } else {
                            const noscriptCatalogHtml = `
    <noscript>
      <section style="max-width: 1200px; margin: 40px auto; padding: 24px; font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1f2937;">
        <h1 style="font-size: 28px; font-weight: 800; color: #111827; margin-bottom: 8px;">${cleanTitle}</h1>
        <p style="font-size: 15px; color: #4b5563; margin-bottom: 24px;">${cleanDesc}</p>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px;">
          ${categoryProducts.map((p: any) => `
            <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; background: #ffffff;">
              <h2 style="font-size: 15px; margin: 0 0 8px 0;"><a href="${baseUrl}/products/${generateSlug(p.name, p.sku)}" style="color: #111827; text-decoration: none; font-weight: bold;">${p.name}</a></h2>
              <p style="font-size: 12px; color: #6b7280; margin: 0 0 6px 0;">SKU: ${p.sku}</p>
              <p style="font-size: 15px; color: #E0621B; font-weight: bold; margin: 0;">KES ${Number(p.price || 0).toLocaleString()} <span style="font-size: 11px; color: #6b7280; font-weight: normal;">(12-Mo Warranty)</span></p>
            </div>
          `).join('')}
        </div>
      </section>
    </noscript>`;
                            html = html.replace('<div id="root"></div>', `<div id="root"></div>\n${noscriptCatalogHtml}`);
                        }
                    }

                    if (compatibilityData) {
                        if (isBot) {
                            const botCompHtml = buildCompatibilitySemanticSnapshot({
                                make: compatibilityData.make,
                                model: compatibilityData.model,
                                category: compatibilityData.category,
                                products: compatibilityData.products,
                                oemNumbers: compatibilityData.oemNumbers,
                                baseUrl,
                                cleanUrl
                            });
                            html = html.replace('<div id="root"></div>', `<div id="root">${botCompHtml}</div>`);
                        }
                    }
                }

                if (isProductNotFound) {
                    return res.status(404).send(html);
                }

                return res.send(html);
            } catch (err) {
                console.error('Error serving dynamic index.html:', err);
                return res.sendFile(indexPath);
            }
        }
    }

    res.status(404).send(`
        <html>
            <head><title>Masuma Africa - Setup Required</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #f9f9f9;">
                <div style="max-width: 500px; margin: auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-top: 5px solid #E0621B;">
                    <h1 style="color: #1A1A1A;">Frontend Build Missing</h1>
                    <p style="color: #666;">The server is running, but the frontend folder (dist) was not found in any expected location.</p>
                </div>
            </body>
        </html>
    `);
});

app.use(errorHandler as any);

const PORT = config.PORT || 3000;
const server = app.listen(Number(PORT), '0.0.0.0', () => {
  logger.info(`🚀 Server running on port ${PORT}`);
});

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`❌ [SERVER] Port ${PORT} is already in use by another running process. Kill it with: Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force`);
    process.exit(1);
  } else {
    logger.error('❌ [SERVER] Server listen error:', err);
    process.exit(1);
  }
});