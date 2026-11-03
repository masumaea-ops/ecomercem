import { apiClient } from './apiClient';
import { getStoredConsent } from './cookieConsent';

// Declare fbq on the window object for TypeScript
declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: any;
  }
}

let pixelInitialized = false;
let currentPixelId: string | null = null;

/**
 * Dynamically fetches the Meta Pixel ID from the system settings and injects
 * the Facebook Pixel tracking script into the document head.
 * Only runs if the user has granted 'marketing' cookie consent.
 */
export const initMetaPixel = async () => {
  if (pixelInitialized) return;

  const consent = getStoredConsent();
  if (!consent || !consent.marketing) {
    // User has not granted marketing consent
    return;
  }

  try {
    // Fetch settings publicly available
    const response = await apiClient.get('/settings');
    const pixelId = response.data?.META_PIXEL_ID;

    if (!pixelId) {
      console.log('Meta Pixel ID not configured in settings. Skipping initialization.');
      return;
    }

    currentPixelId = pixelId;

    // Inject base Meta Pixel Code
    /* eslint-disable */
    (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = '2.0';
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */

    // Initialize & send initial PageView
    if (window.fbq) {
      window.fbq('init', pixelId);
      window.fbq('track', 'PageView');
      pixelInitialized = true;
      console.log(`Meta Pixel (${pixelId}) successfully initialized.`);
    }
  } catch (error) {
    console.error('Failed to initialize Meta Pixel:', error);
  }
};

/**
 * Tracks 'ViewContent' event when a user views a product/listing.
 */
export const trackMetaViewContent = (contentName: string, category: string, value?: number) => {
  if (!pixelInitialized || !window.fbq || !getStoredConsent()?.marketing) return;

  window.fbq('track', 'ViewContent', {
    content_name: contentName,
    content_category: category,
    value: value || 0.00,
    currency: 'KES',
  });
};

/**
 * Tracks 'AddToCart' event when a user adds an item to cart.
 */
export const trackMetaAddToCart = (contentName: string, value: number) => {
  if (!pixelInitialized || !window.fbq || !getStoredConsent()?.marketing) return;

  window.fbq('track', 'AddToCart', {
    content_name: contentName,
    value: value,
    currency: 'KES',
  });
};

/**
 * Tracks 'Purchase' event when a checkout transaction is completed.
 */
export const trackMetaPurchase = (orderId: string, value: number) => {
  if (!pixelInitialized || !window.fbq || !getStoredConsent()?.marketing) return;

  window.fbq('track', 'Purchase', {
    content_ids: [orderId],
    value: value,
    currency: 'KES',
  });
};
