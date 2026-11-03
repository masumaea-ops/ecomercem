
import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { Product } from '../entities/Product';
import { generateSlug } from '../utils/slug';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const protocol = req.get('x-forwarded-proto') || (req.get('host')?.includes('masuma.africa') ? 'https' : req.protocol);
        const baseUrl = `${protocol}://${req.get('host')}`;
        const productRepo = AppDataSource.getRepository(Product);
        
        // Fetch products with stock data and category
        const products = await productRepo.find({ 
            relations: ['stock', 'category'],
            select: {
                id: true,
                name: true,
                description: true,
                price: true,
                sku: true,
                imageUrl: true,
                updatedAt: true
            }
        });

        const escapeXml = (unsafe: string | null | undefined) => {
            if (!unsafe) return '';
            return unsafe.replace(/[<>&'"]/g, (c) => {
                switch (c) {
                    case '<': return '&lt;';
                    case '>': return '&gt;';
                    case '&': return '&amp;';
                    case '\'': return '&apos;';
                    case '"': return '&quot;';
                }
                return c;
            });
        };

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Masuma Autoparts East Africa</title>
    <link>${baseUrl}</link>
    <description>Genuine Japanese precision automotive parts in Nairobi, Kenya. Filters, Brakes, Suspension &amp; Spark Plugs.</description>
    <language>en-us</language>`;

        products.forEach(p => {
            const totalStock = (p.stock || []).reduce((acc, s) => acc + s.quantity, 0);
            const availability = totalStock > 0 ? 'in_stock' : 'out_of_stock';
            const imageUrl = p.imageUrl ? (p.imageUrl.startsWith('http') ? p.imageUrl : `${baseUrl}${p.imageUrl}`) : `${baseUrl}/og-image.jpg`;
            const productLink = `${baseUrl}/products/${generateSlug(p.name, p.sku)}`;
            const cleanDesc = (p.description || 'Genuine Masuma Autopart').replace(/<[^>]*>/g, '').substring(0, 4900);

            xml += `
    <item>
      <g:id>${escapeXml(p.sku || p.id)}</g:id>
      <g:title>${escapeXml(p.name)}</g:title>
      <g:description>${escapeXml(cleanDesc)}</g:description>
      <g:link>${escapeXml(productLink)}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
      <g:condition>new</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${Number(p.price).toFixed(2)} KES</g:price>
      <g:brand>Masuma</g:brand>
      <g:mpn>${escapeXml(p.sku)}</g:mpn>
      <g:identifier_exists>true</g:identifier_exists>
      <g:google_product_category>Vehicles &amp; Parts &gt; Vehicle Parts &amp; Accessories</g:google_product_category>
      <g:product_type>${escapeXml(p.category?.name || 'Automotive Parts')}</g:product_type>
      <g:shipping>
        <g:country>KE</g:country>
        <g:service>Standard Delivery</g:service>
        <g:price>0.00 KES</g:price>
      </g:shipping>
    </item>`;
        });

        xml += `
  </channel>
</rss>`;

        res.set('Content-Type', 'text/xml; charset=utf-8');
        res.send(xml);
    } catch (e) {
        console.error('Error generating Google Product Feed:', e);
        res.status(500).send('Error generating product feed');
    }
});

export default router;
