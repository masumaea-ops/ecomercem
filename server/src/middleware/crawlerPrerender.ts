import { getComplementaryCategories, getCrossSellReason } from '../utils/crossSellEngine';

/**
 * Masuma Autoparts East Africa - Enterprise Crawler Pre-rendering & Semantic Snapshot Generator
 * 
 * Intercepts search engine bots and social media scrapers (Googlebot, Bingbot, Applebot, etc.)
 * and serves fully hydrated semantic HTML snapshots with complete headings, technical specifications,
 * OEM numbers, vehicle fitment tables, and internal links directly inside the initial HTTP response.
 */

export const BOT_USER_AGENTS = [
  'googlebot',
  'bingbot',
  'yandex',
  'baiduspider',
  'applebot',
  'duckduckbot',
  'slurp',
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'whatsapp',
  'telegrambot',
  'slackbot',
  'discordbot',
  'pinterest',
  'bytespider',
  'sogou'
];

export function isSearchEngineBot(userAgent: string | undefined): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_USER_AGENTS.some(bot => ua.includes(bot));
}

interface ProductSnapshotData {
  product: any;
  cleanTitle: string;
  cleanDesc: string;
  cleanUrl: string;
  formattedPrice: string;
  baseUrl: string;
  ratingValue: number;
  reviewCount: number;
  reviews?: any[];
}

/**
 * Builds a search-engine crawlable HTML snapshot for a Product Detail Page
 */
export function buildProductSemanticSnapshot(data: ProductSnapshotData): string {
  const { product, cleanTitle, cleanDesc, cleanUrl, formattedPrice, baseUrl, ratingValue, reviewCount, reviews } = data;
  const oems = (product.oemNumbers || []).map((o: any) => o.code || o.number).filter(Boolean);
  const vehicles = (product.vehicles || []).map((v: any) => {
    const make = v.make === 'Generic' ? '' : v.make;
    const model = v.model || '';
    const years = v.yearFrom ? `(${v.yearFrom}-${v.yearTo || 'Present'})` : '';
    const engine = v.engineCode ? `Engine: ${v.engineCode}` : '';
    const chassis = v.chassisCode ? `Chassis: ${v.chassisCode}` : '';
    return `${make} ${model} ${years} ${engine} ${chassis}`.trim();
  }).filter(Boolean);

  const categoryName = product.category?.name || 'Automotive Parts';
  const inStock = (product.stock || []).reduce((sum: number, s: any) => sum + (s.quantity || 0), 0) > 0;
  const imageUrl = product.imageUrl ? (product.imageUrl.startsWith('http') ? product.imageUrl : `${baseUrl}${product.imageUrl}`) : `${baseUrl}/og-image.jpg`;

  return `
  <main id="main-content" style="max-width: 1100px; margin: 30px auto; padding: 20px; font-family: system-ui, -apple-system, sans-serif; color: #111827; line-height: 1.6;">
    <!-- Breadcrumb Navigation for Spiders -->
    <nav aria-label="Breadcrumb" style="font-size: 13px; color: #6b7280; margin-bottom: 20px;">
      <a href="${baseUrl}/" style="color: #4b5563; text-decoration: none;">Home</a> &rsaquo;
      <a href="${baseUrl}/catalog" style="color: #4b5563; text-decoration: none;">Catalog</a> &rsaquo;
      <a href="${baseUrl}/categories/${encodeURIComponent(categoryName)}" style="color: #4b5563; text-decoration: none;">${categoryName}</a> &rsaquo;
      <span aria-current="page" style="color: #111827; font-weight: 600;">${product.name}</span>
    </nav>

    <article itemscope itemtype="https://schema.org/Product">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 32px; margin-bottom: 32px;">
        <!-- Product Imagery -->
        <div>
          <img 
            src="${imageUrl}" 
            alt="Genuine Masuma ${product.name} (${product.sku}) - Japanese Auto Spare Part Nairobi Kenya" 
            itemprop="image"
            style="width: 100%; max-height: 480px; object-fit: contain; border-radius: 12px; border: 1px solid #e5e7eb; background: #f9fafb;"
          />
        </div>

        <!-- Product Core Metadata -->
        <div>
          <span style="display: inline-block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #E0621B; background: #fff7ed; padding: 4px 8px; border-radius: 6px; margin-bottom: 8px;">
            ${categoryName} &bull; Japanese OEM Spec
          </span>
          <h1 itemprop="name" style="font-size: 26px; font-weight: 800; color: #111827; margin: 0 0 8px 0; line-height: 1.25;">
            ${cleanTitle}
          </h1>
          <p style="font-size: 14px; color: #4b5563; margin: 0 0 16px 0;">
            <strong>Genuine SKU:</strong> <span itemprop="sku">${product.sku}</span>
          </p>

          <!-- Pricing & Stock Offer Block -->
          <div itemprop="offers" itemscope itemtype="https://schema.org/Offer" style="background: #fdfaf6; border: 1px solid #fed7aa; padding: 16px; border-radius: 10px; margin-bottom: 20px;">
            <p style="font-size: 26px; font-weight: 900; color: #E0621B; margin: 0 0 6px 0;">
              <span itemprop="priceCurrency" content="KES">KSh</span> <span itemprop="price" content="${product.price}">${Number(product.price || 0).toLocaleString()}</span>
            </p>
            <link itemprop="availability" href="https://schema.org/${inStock ? 'InStock' : 'OutOfStock'}" />
            <p style="font-size: 13px; font-weight: 700; color: ${inStock ? '#15803d' : '#b45309'}; margin: 0;">
              ${inStock ? '&#10004; In Stock at Ruby Mall Counter & Ready for Dispatch' : '&#9888; Order Online for Next Courier Dispatch'}
            </p>
            <p style="font-size: 12px; color: #6b7280; margin: 6px 0 0 0;">
              Includes <strong>12-Month Unlimited Mileage Warranty</strong> against manufacturer defects.
            </p>
          </div>

          <!-- Store Purchase Directions -->
          <div style="font-size: 13px; color: #374151; background: #f3f4f6; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 4px 0; font-weight: 700; color: #111827;">🏬 Physical Store & Counter Pickup:</p>
            <p style="margin: 0;">First Floor (Shop FF25), Ruby Mall, Accra Road (Behind NCBA Bank), Nairobi CBD. 1-Hour rider delivery across Nairobi; same-day bus courier across Kenya.</p>
          </div>
        </div>
      </div>

      <!-- Description Section -->
      <section style="margin-bottom: 32px; border-top: 1px solid #e5e7eb; padding-top: 24px;">
        <h2 style="font-size: 20px; font-weight: 800; color: #111827; margin-bottom: 12px;">Product Overview & Technical Description</h2>
        <div itemprop="description" style="font-size: 15px; color: #374151; line-height: 1.7;">
          ${cleanDesc}
        </div>
      </section>

      <!-- OEM Cross Reference Numbers -->
      ${oems.length > 0 ? `
      <section style="margin-bottom: 32px; border-top: 1px solid #e5e7eb; padding-top: 24px;">
        <h2 style="font-size: 20px; font-weight: 800; color: #111827; margin-bottom: 12px;">OEM Cross-Reference & Part Numbers</h2>
        <p style="font-size: 13px; color: #6b7280; margin-bottom: 12px;">This genuine Masuma replacement component corresponds to the following vehicle manufacturer part numbers:</p>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${oems.map((code: string) => `<span style="display: inline-block; font-family: monospace; font-size: 13px; font-weight: 700; background: #f3f4f6; color: #111827; padding: 6px 12px; border-radius: 6px; border: 1px solid #e5e7eb;">${code}</span>`).join('')}
        </div>
      </section>` : ''}

      <!-- Vehicle Compatibility Matrix -->
      ${vehicles.length > 0 ? `
      <section style="margin-bottom: 32px; border-top: 1px solid #e5e7eb; padding-top: 24px;">
        <h2 style="font-size: 20px; font-weight: 800; color: #111827; margin-bottom: 12px;">Guaranteed Vehicle Fitment Matrix</h2>
        <p style="font-size: 13px; color: #6b7280; margin-bottom: 16px;">Verified compatibility for Japanese domestic market and regional models:</p>
        <ul style="padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
          ${vehicles.map((vStr: string) => `<li><strong>${vStr}</strong></li>`).join('')}
        </ul>
      </section>` : ''}

      <!-- Phase 3: Automated Contextual Cross-Selling & Internal Linking Hooks -->
      <section style="margin-bottom: 32px; border-top: 1px solid #e5e7eb; padding-top: 24px;">
        <h2 style="font-size: 20px; font-weight: 800; color: #111827; margin-bottom: 8px;">Frequently Replaced Together & Companion Parts</h2>
        <p style="font-size: 13px; color: #6b7280; margin-bottom: 14px;">${getCrossSellReason(categoryName)}</p>
        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
          ${getComplementaryCategories(categoryName).map(cat => `
            <a href="${baseUrl}/categories/${encodeURIComponent(cat)}" style="display: inline-flex; align-items: center; gap: 6px; background: #fff7ed; border: 1px solid #fed7aa; color: #c2410c; padding: 8px 14px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: 700;">
              &rarr; Masuma ${cat} in Kenya
            </a>
          `).join('')}
        </div>
      </section>

      <!-- Ratings & Reviews -->
      <section style="border-top: 1px solid #e5e7eb; padding-top: 24px;">
        <h2 style="font-size: 20px; font-weight: 800; color: #111827; margin-bottom: 12px;">Verified Customer Reviews (${reviewCount})</h2>
        <p style="font-size: 14px; color: #374151; margin-bottom: 16px;">
          Average Customer Rating: <strong>${ratingValue} / 5.0</strong> based on ${reviewCount} verified Kenyan vehicle owners.
        </p>
        ${Array.isArray(reviews) && reviews.length > 0 ? `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${reviews.slice(0, 3).map((r: any) => `
            <div style="background: #f9fafb; padding: 12px 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
              <p style="margin: 0 0 4px 0; font-weight: 700; font-size: 13px; color: #111827;">${r.customerName || 'Verified Customer'} &bull; ${r.rating} / 5 Stars</p>
              <p style="margin: 0; font-size: 13px; color: #4b5563;">"${r.comment}"</p>
            </div>
          `).join('')}
        </div>` : ''}
      </section>
    </article>
  </main>
`;
}

interface CategorySnapshotData {
  categoryTitle: string;
  cleanDesc: string;
  baseUrl: string;
  cleanUrl: string;
  categoryProducts: any[];
}

/**
 * Builds a search-engine crawlable HTML snapshot for Category / Catalog pages
 */
export function buildCategorySemanticSnapshot(data: CategorySnapshotData): string {
  const { categoryTitle, cleanDesc, baseUrl, cleanUrl, categoryProducts } = data;

  return `
  <main id="main-content" style="max-width: 1200px; margin: 30px auto; padding: 20px; font-family: system-ui, -apple-system, sans-serif; color: #111827; line-height: 1.6;">
    <nav aria-label="Breadcrumb" style="font-size: 13px; color: #6b7280; margin-bottom: 20px;">
      <a href="${baseUrl}/" style="color: #4b5563; text-decoration: none;">Home</a> &rsaquo;
      <a href="${baseUrl}/catalog" style="color: #4b5563; text-decoration: none;">Catalog</a>
      ${categoryTitle ? `&rsaquo; <span aria-current="page" style="color: #111827; font-weight: 600;">${categoryTitle}</span>` : ''}
    </nav>

    <header style="margin-bottom: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 20px;">
      <h1 style="font-size: 30px; font-weight: 900; color: #111827; margin: 0 0 8px 0;">
        ${categoryTitle ? `Genuine Masuma ${categoryTitle} in Nairobi, Kenya` : 'Masuma Automotive Parts Catalog Nairobi, Kenya'}
      </h1>
      <p style="font-size: 15px; color: #4b5563; max-width: 800px; margin: 0;">
        ${cleanDesc}
      </p>
      <p style="font-size: 13px; color: #6b7280; margin-top: 8px;">
        Japanese OEM standards, 12-Month Unlimited Mileage Warranty. Ruby Mall FF25, Accra Road, Nairobi CBD.
      </p>
    </header>

    <section>
      <h2 style="font-size: 20px; font-weight: 800; color: #111827; margin-bottom: 20px;">Available In-Stock Replacement Parts (${categoryProducts.length})</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
        ${categoryProducts.map((p: any) => {
          const productSlug = `${p.name} ${p.sku}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
          const productUrl = `${baseUrl}/products/${productSlug}`;
          const inStock = typeof p.stock === 'boolean'
            ? p.stock
            : Array.isArray(p.stock)
              ? p.stock.reduce((sum: number, s: any) => sum + (Number(s.quantity) || 0), 0) > 0
              : true;
          return `
          <div style="border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; background: #ffffff; display: flex; flex-direction: column;">
            <p style="font-size: 11px; font-weight: 800; color: #E0621B; text-transform: uppercase; margin: 0 0 6px 0;">${p.category?.name || 'Spare Part'}</p>
            <h3 style="font-size: 16px; font-weight: 700; margin: 0 0 8px 0; line-height: 1.3;">
              <a href="${productUrl}" style="color: #111827; text-decoration: none;">${p.name}</a>
            </h3>
            <p style="font-size: 12px; color: #6b7280; font-family: monospace; margin: 0 0 12px 0;">SKU: ${p.sku}</p>
            <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f3f4f6; padding-top: 10px;">
              <span style="font-size: 17px; font-weight: 900; color: #E0621B;">KSh ${Number(p.price || 0).toLocaleString()}</span>
              <span style="font-size: 11px; font-weight: 700; color: ${inStock ? '#15803d' : '#b45309'};">${inStock ? 'In Stock' : 'Order Ready'}</span>
            </div>
          </div>
          `;
        }).join('')}
      </div>
    </section>
  </main>
`;
}

export interface CompatibilitySnapshotData {
  make: string;
  model: string;
  category: string;
  products: any[];
  oemNumbers: string[];
  baseUrl: string;
  cleanUrl: string;
  crossSell?: any;
}

/**
 * Phase 3: Builds search-engine crawlable HTML snapshot for Programmatic Compatibility Hubs
 */
export function buildCompatibilitySemanticSnapshot(data: CompatibilitySnapshotData): string {
  const { make, model, category, products, oemNumbers, baseUrl, cleanUrl, crossSell } = data;
  const pageTitle = `${make} ${model} ${category && category !== 'All Parts' ? category : 'Automotive Spare'} Parts in Nairobi, Kenya`;
  const isGenericCategory = !category || category.toLowerCase() === 'all parts';

  return `
  <main id="main-content" style="max-width: 1200px; margin: 30px auto; padding: 20px; font-family: system-ui, -apple-system, sans-serif; color: #111827; line-height: 1.6;">
    <!-- Breadcrumb Trail -->
    <nav aria-label="Breadcrumb" style="font-size: 13px; color: #6b7280; margin-bottom: 20px;">
      <a href="${baseUrl}/" style="color: #4b5563; text-decoration: none;">Home</a> &rsaquo;
      <a href="${baseUrl}/catalog" style="color: #4b5563; text-decoration: none;">Catalog</a> &rsaquo;
      <a href="${baseUrl}/compatibility/${encodeURIComponent(make.toLowerCase())}/${encodeURIComponent(model.toLowerCase().replace(/\s+/g, '-'))}" style="color: #4b5563; text-decoration: none;">${make} ${model}</a>
      ${!isGenericCategory ? `&rsaquo; <span aria-current="page" style="color: #111827; font-weight: 600;">${category}</span>` : ''}
    </nav>

    <!-- Compatibility Hub Header -->
    <header style="background: linear-gradient(135deg, #111827 0%, #1f2937 100%); color: #ffffff; padding: 32px 28px; border-radius: 16px; margin-bottom: 32px; border-bottom: 4px solid #E0621B;">
      <div style="display: inline-block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #fed7aa; background: rgba(224, 98, 27, 0.2); padding: 4px 10px; border-radius: 6px; margin-bottom: 12px;">
        100% Guaranteed Japanese Fitment &bull; Nairobi Counter Pickup
      </div>
      <h1 style="font-size: 32px; font-weight: 900; margin: 0 0 12px 0; line-height: 1.25; color: #ffffff;">
        ${pageTitle}
      </h1>
      <p style="font-size: 15px; color: #d1d5db; max-width: 850px; margin: 0 0 16px 0; line-height: 1.6;">
        Explore verified Japanese-engineered genuine Masuma replacement components for <strong>${make} ${model}</strong>. Guaranteed exact factory fitment, 12-Month Unlimited Mileage Warranty, and countrywide dispatch across Kenya.
      </p>
      <div style="display: flex; flex-wrap: wrap; gap: 16px; font-size: 13px; color: #f3f4f6;">
        <span>🏬 <strong>Counter:</strong> Ruby Mall FF25, Accra Rd, Nairobi</span>
        <span>🚚 <strong>Delivery:</strong> 1-Hour Nairobi / Same-Day Countrywide</span>
        <span>🛡️ <strong>Guarantee:</strong> 12-Month Defect Replacement</span>
      </div>
    </header>

    <!-- OEM Cross Reference Section -->
    ${oemNumbers && oemNumbers.length > 0 ? `
    <section style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 32px;">
      <h2 style="font-size: 18px; font-weight: 800; color: #111827; margin: 0 0 8px 0;">OEM Part Numbers for ${make} ${model}</h2>
      <p style="font-size: 13px; color: #6b7280; margin: 0 0 12px 0;">These Japanese OEM codes directly correspond to genuine Masuma components in stock:</p>
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        ${oemNumbers.map((code: string) => `<span style="font-family: monospace; font-size: 12px; font-weight: 700; background: #ffffff; color: #111827; padding: 6px 12px; border-radius: 6px; border: 1px solid #d1d5db;">${code}</span>`).join('')}
      </div>
    </section>` : ''}

    <!-- In-Stock Products Grid -->
    <section style="margin-bottom: 36px;">
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 20px;">
        <h2 style="font-size: 22px; font-weight: 800; color: #111827; margin: 0;">
          Direct-Fit In-Stock Parts (${products.length})
        </h2>
        <span style="font-size: 13px; color: #15803d; font-weight: 700;">&#10004; Fitment Verified for ${make} ${model}</span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;">
        ${products.map((p: any) => {
          const productSlug = `${p.name} ${p.sku}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
          const productUrl = `${baseUrl}/products/${productSlug}`;
          const inStock = typeof p.stock === 'boolean'
            ? p.stock
            : Array.isArray(p.stock)
              ? p.stock.reduce((sum: number, s: any) => sum + (Number(s.quantity) || 0), 0) > 0
              : true;
          return `
          <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px; background: #ffffff; display: flex; flex-direction: column;">
            <span style="font-size: 11px; font-weight: 800; color: #E0621B; text-transform: uppercase; margin-bottom: 6px;">${p.category?.name || 'Spare Part'}</span>
            <h3 style="font-size: 16px; font-weight: 700; margin: 0 0 8px 0; line-height: 1.35;">
              <a href="${productUrl}" style="color: #111827; text-decoration: none;">${p.name}</a>
            </h3>
            <p style="font-size: 12px; color: #6b7280; font-family: monospace; margin: 0 0 12px 0;">SKU: ${p.sku}</p>
            <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f3f4f6; padding-top: 12px;">
              <span style="font-size: 18px; font-weight: 900; color: #E0621B;">KSh ${Number(p.price || 0).toLocaleString()}</span>
              <span style="font-size: 11px; font-weight: 700; color: ${inStock ? '#15803d' : '#b45309'};">${inStock ? 'In Stock (Nairobi)' : 'Order Ready'}</span>
            </div>
          </div>
          `;
        }).join('')}
      </div>
    </section>

    <!-- Contextual Cross-Selling Section -->
    ${crossSell && crossSell.complementaryCategories && crossSell.complementaryCategories.length > 0 ? `
    <section style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
      <h2 style="font-size: 18px; font-weight: 800; color: #9a3412; margin: 0 0 8px 0;">Recommended Companion Upgrades for ${make} ${model}</h2>
      <p style="font-size: 13px; color: #7c2d12; margin: 0 0 16px 0;">${crossSell.reason}</p>
      <div style="display: flex; flex-wrap: wrap; gap: 10px;">
        ${crossSell.complementaryCategories.map((cName: string) => `
          <a href="${baseUrl}/compatibility/${encodeURIComponent(make.toLowerCase())}/${encodeURIComponent(model.toLowerCase().replace(/\s+/g, '-'))}/${encodeURIComponent(cName.toLowerCase().replace(/\s+/g, '-'))}" style="display: inline-block; background: #ffffff; border: 1px solid #ea580c; color: #c2410c; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 700; text-decoration: none;">
            &rarr; View ${cName} for ${model}
          </a>
        `).join('')}
      </div>
    </section>` : ''}
  </main>
  `;
}
