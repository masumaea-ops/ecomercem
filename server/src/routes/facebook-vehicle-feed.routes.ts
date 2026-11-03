import { Router } from 'express';
import { AppDataSource } from '../config/database';
import { VehicleListing, ListingStatus } from '../entities/VehicleListing';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const protocol = req.get('x-forwarded-proto') || (req.get('host')?.includes('masuma.africa') ? 'https' : req.protocol);
        const baseUrl = `${protocol}://${req.get('host')}`;
        const listingRepo = AppDataSource.getRepository(VehicleListing);
        
        // Fetch only active listings
        const listings = await listingRepo.find({
            where: { status: ListingStatus.ACTIVE },
            relations: ['seller']
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
    <title>Masuma Vehicle Marketplace Feed</title>
    <link>${baseUrl}</link>
    <description>Verified cars and motorcycles for sale in Kenya - Masuma Vehicle Marketplace.</description>
    <language>en-us</language>`;

        listings.forEach(item => {
            const availability = 'in_stock';
            const imageUrls = item.images || [];
            const primaryImageUrl = imageUrls.length > 0 
                ? (imageUrls[0].startsWith('http') ? imageUrls[0] : `${baseUrl}${imageUrls[0]}`)
                : `${baseUrl}/og-image.jpg`;
            
            // Generate clean slug for deep link matching frontend logic
            const slug = `${item.year}-${item.make}-${item.model}-${item.id}`.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '');
            const listingLink = `${baseUrl}/marketplace/${slug}`;
            
            const cleanDesc = (item.description || `Verified ${item.year} ${item.make} ${item.model} for sale.`)
                .replace(/<[^>]*>/g, '')
                .substring(0, 4900);

            xml += `
    <item>
      <g:id>${escapeXml(item.id)}</g:id>
      <g:title>${escapeXml(`${item.year} ${item.make} ${item.model}`)}</g:title>
      <g:description>${escapeXml(cleanDesc)}</g:description>
      <g:link>${escapeXml(listingLink)}</g:link>
      <g:image_link>${escapeXml(primaryImageUrl)}</g:image_link>
      <g:condition>used</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${Number(item.price).toFixed(2)} KES</g:price>
      <g:brand>${escapeXml(item.make)}</g:brand>
      <g:google_product_category>Vehicles &amp; Parts &gt; Vehicles &gt; Motor Vehicles &gt; Cars, Trucks &amp; Vans</g:google_product_category>
      <g:product_type>${escapeXml(item.bodyType || 'Cars')}</g:product_type>
      <g:year>${item.year}</g:year>
      <g:make>${escapeXml(item.make)}</g:make>
      <g:model>${escapeXml(item.model)}</g:model>
      ${item.mileage ? `<g:mileage>${item.mileage}</g:mileage>` : ''}
      ${item.transmission ? `<g:transmission>${escapeXml(item.transmission)}</g:transmission>` : ''}
      ${item.fuelType ? `<g:fuel_type>${escapeXml(item.fuelType)}</g:fuel_type>` : ''}
      ${item.color ? `<g:color>${escapeXml(item.color)}</g:color>` : ''}
    </item>`;
        });

        xml += `
  </channel>
</rss>`;

        res.set('Content-Type', 'text/xml; charset=utf-8');
        res.send(xml);
    } catch (e) {
        console.error('Error generating Facebook Vehicle Feed:', e);
        res.status(500).send('Error generating vehicle feed');
    }
});

export default router;
