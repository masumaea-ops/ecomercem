import { Router, Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { VehicleListing, ListingStatus } from '../entities/VehicleListing';
import { BlogPost } from '../entities/BlogPost';
import { Product } from '../entities/Product';
import { Category } from '../entities/Category';
import { generateSlug } from '../utils/slug';
import { POPULAR_VEHICLE_HUBS, PRIMARY_CATEGORIES } from './compatibility.routes';

const router = Router();

const getBaseUrl = (req: Request) => {
  const protocol = req.get('x-forwarded-proto') || (req.get('host')?.includes('masuma.africa') ? 'https' : req.protocol);
  const host = req.get('host') || 'masuma.africa';
  return `${protocol}://${host}`;
};

const escapeXml = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
};

/**
 * GET /sitemap.xml
 * Master XML Sitemap Index linking to segmented domain sitemaps
 */
router.get('/', async (req: Request, res: Response) => {
  const path = req.path;

  // Route to sub-sitemaps if called directly via subpath
  if (path === '/products' || path === '/sitemap-products.xml') return handleProductsSitemap(req, res);
  if (path === '/categories' || path === '/sitemap-categories.xml') return handleCategoriesSitemap(req, res);
  if (path === '/blog' || path === '/sitemap-blog.xml') return handleBlogSitemap(req, res);
  if (path === '/marketplace' || path === '/sitemap-marketplace.xml') return handleMarketplaceSitemap(req, res);
  if (path === '/compatibility' || path === '/sitemap-compatibility.xml') return handleCompatibilitySitemap(req, res);
  if (path === '/static' || path === '/sitemap-static.xml') return handleStaticSitemap(req, res);

  const baseUrl = getBaseUrl(req);
  const today = new Date().toISOString().split('T')[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap-products.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-categories.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-compatibility.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-blog.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-marketplace.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/sitemap-static.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;

  res.header('Content-Type', 'application/xml; charset=utf-8');
  res.header('Cache-Control', 'public, max-age=3600');
  res.send(xml);
});

/**
 * Product Catalog Sitemap
 */
const handleProductsSitemap = async (req: Request, res: Response) => {
  try {
    const baseUrl = getBaseUrl(req);
    const today = new Date().toISOString().split('T')[0];
    const productRepo = AppDataSource.getRepository(Product);

    const products = await productRepo.find({
      select: ['id', 'name', 'sku', 'imageUrl', 'updatedAt'],
      order: { updatedAt: 'DESC' }
    });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

    products.forEach((product) => {
      const lastMod = product.updatedAt ? new Date(product.updatedAt).toISOString().split('T')[0] : today;
      const slug = generateSlug(product.name, product.sku);
      const imageLoc = product.imageUrl ? (product.imageUrl.startsWith('http') ? product.imageUrl : `${baseUrl}${product.imageUrl}`) : null;
      const imgTag = imageLoc ? `
    <image:image>
      <image:loc>${escapeXml(imageLoc)}</image:loc>
      <image:title>${escapeXml(product.name)} - Masuma East Africa</image:title>
      <image:caption>Genuine Masuma Japanese Replacement Part (${escapeXml(product.sku)})</image:caption>
    </image:image>` : '';

      xml += `
  <url>
    <loc>${baseUrl}/products/${slug}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>${imgTag}
  </url>`;
    });

    xml += '\n</urlset>';

    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=7200');
    res.send(xml);
  } catch (err) {
    res.status(500).send('Error generating products sitemap');
  }
};

/**
 * Categories Sitemap
 */
const handleCategoriesSitemap = async (req: Request, res: Response) => {
  try {
    const baseUrl = getBaseUrl(req);
    const today = new Date().toISOString().split('T')[0];
    const categoryRepo = AppDataSource.getRepository(Category);

    const categories = await categoryRepo.find({ select: ['id', 'name'] });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    categories.forEach((cat) => {
      if (cat.name) {
        xml += `
  <url>
    <loc>${baseUrl}/categories/${encodeURIComponent(cat.name)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }
    });

    xml += '\n</urlset>';

    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=14400');
    res.send(xml);
  } catch (err) {
    res.status(500).send('Error generating categories sitemap');
  }
};

/**
 * Technical Blog & Diagnostic Guides Sitemap
 */
const handleBlogSitemap = async (req: Request, res: Response) => {
  try {
    const baseUrl = getBaseUrl(req);
    const today = new Date().toISOString().split('T')[0];
    const blogRepo = AppDataSource.getRepository(BlogPost);

    const posts = await blogRepo.find({
      select: ['id', 'title', 'image', 'updatedAt'],
      order: { updatedAt: 'DESC' }
    });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

    posts.forEach((post) => {
      const lastMod = post.updatedAt ? new Date(post.updatedAt).toISOString().split('T')[0] : today;
      const slug = post.title ? `${post.title} ${post.id}`.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') : post.id;
      const postImg = post.image ? (post.image.startsWith('http') ? post.image : `${baseUrl}${post.image}`) : null;
      const imgTag = postImg ? `
    <image:image>
      <image:loc>${escapeXml(postImg)}</image:loc>
      <image:title>${escapeXml(post.title)}</image:title>
    </image:image>` : '';

      xml += `
  <url>
    <loc>${baseUrl}/blog/${slug}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${imgTag}
  </url>`;
    });

    xml += '\n</urlset>';

    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=7200');
    res.send(xml);
  } catch (err) {
    res.status(500).send('Error generating blog sitemap');
  }
};

/**
 * Vehicle Marketplace Sitemap
 */
const handleMarketplaceSitemap = async (req: Request, res: Response) => {
  try {
    const baseUrl = getBaseUrl(req);
    const today = new Date().toISOString().split('T')[0];
    const listingRepo = AppDataSource.getRepository(VehicleListing);

    const listings = await listingRepo.find({
      where: { status: ListingStatus.ACTIVE },
      select: ['id', 'year', 'make', 'model', 'images', 'updatedAt'],
      order: { updatedAt: 'DESC' }
    });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

    listings.forEach((listing) => {
      const lastMod = listing.updatedAt ? new Date(listing.updatedAt).toISOString().split('T')[0] : today;
      const slug = `${listing.year || ''}-${listing.make || ''}-${listing.model || ''}-${listing.id}`.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      const listingImg = listing.images && listing.images.length > 0 ? (listing.images[0].startsWith('http') ? listing.images[0] : `${baseUrl}${listing.images[0]}`) : null;
      const imgTag = listingImg ? `
    <image:image>
      <image:loc>${escapeXml(listingImg)}</image:loc>
      <image:title>${escapeXml(`${listing.year} ${listing.make} ${listing.model}`)}</image:title>
    </image:image>` : '';

      xml += `
  <url>
    <loc>${baseUrl}/marketplace/${slug}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>${imgTag}
  </url>`;
    });

    xml += '\n</urlset>';

    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=7200');
    res.send(xml);
  } catch (err) {
    res.status(500).send('Error generating marketplace sitemap');
  }
};

/**
 * Core Static Navigation Pages Sitemap
 */
const handleStaticSitemap = async (req: Request, res: Response) => {
  const baseUrl = getBaseUrl(req);
  const today = new Date().toISOString().split('T')[0];

  const staticRoutes = [
    { loc: '/', changefreq: 'daily', priority: '1.0' },
    { loc: '/catalog', changefreq: 'daily', priority: '0.9' },
    { loc: '/part-finder', changefreq: 'weekly', priority: '0.8' },
    { loc: '/blog', changefreq: 'daily', priority: '0.8' },
    { loc: '/marketplace', changefreq: 'daily', priority: '0.8' },
    { loc: '/import-calculator', changefreq: 'weekly', priority: '0.7' },
    { loc: '/about', changefreq: 'monthly', priority: '0.6' },
    { loc: '/contact', changefreq: 'monthly', priority: '0.6' },
    { loc: '/warranty', changefreq: 'monthly', priority: '0.7' },
    { loc: '/returns', changefreq: 'monthly', priority: '0.6' },
    { loc: '/faq', changefreq: 'weekly', priority: '0.7' },
    { loc: '/privacy', changefreq: 'monthly', priority: '0.3' },
    { loc: '/terms', changefreq: 'monthly', priority: '0.3' },
    { loc: '/cookies', changefreq: 'monthly', priority: '0.3' }
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  staticRoutes.forEach((route) => {
    xml += `
  <url>
    <loc>${baseUrl}${route.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`;
  });

  xml += '\n</urlset>';

  res.header('Content-Type', 'application/xml; charset=utf-8');
  res.header('Cache-Control', 'public, max-age=14400');
  res.send(xml);
};

/**
 * Phase 3: Vehicle Compatibility Matrix Sitemap
 */
const handleCompatibilitySitemap = async (req: Request, res: Response) => {
  try {
    const baseUrl = getBaseUrl(req);
    const today = new Date().toISOString().split('T')[0];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    POPULAR_VEHICLE_HUBS.forEach((hub) => {
      const makeSlug = encodeURIComponent(hub.make.toLowerCase());
      const modelSlug = encodeURIComponent(hub.aliases[0]);

      // Hub master page (e.g. /compatibility/toyota/fielder)
      xml += `
  <url>
    <loc>${baseUrl}/compatibility/${makeSlug}/${modelSlug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`;

      // Hub category matrix combinations (e.g. /compatibility/toyota/fielder/brake-pads)
      PRIMARY_CATEGORIES.forEach((cat) => {
        xml += `
  <url>
    <loc>${baseUrl}/compatibility/${makeSlug}/${modelSlug}/${encodeURIComponent(cat.slug)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.80</priority>
  </url>`;
      });
    });

    xml += '\n</urlset>';

    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=7200');
    res.send(xml);
  } catch (error) {
    console.error('Error generating compatibility sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
};

// Direct sub-sitemap handlers
router.get('/products', handleProductsSitemap);
router.get('/sitemap-products.xml', handleProductsSitemap);

router.get('/categories', handleCategoriesSitemap);
router.get('/sitemap-categories.xml', handleCategoriesSitemap);

router.get('/compatibility', handleCompatibilitySitemap);
router.get('/sitemap-compatibility.xml', handleCompatibilitySitemap);

router.get('/blog', handleBlogSitemap);
router.get('/sitemap-blog.xml', handleBlogSitemap);

router.get('/marketplace', handleMarketplaceSitemap);
router.get('/sitemap-marketplace.xml', handleMarketplaceSitemap);

router.get('/static', handleStaticSitemap);
router.get('/sitemap-static.xml', handleStaticSitemap);

export default router;
