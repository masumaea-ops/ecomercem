import ReactGA from 'react-ga4';
import { apiClient } from './apiClient';
import { v4 as uuidv4 } from 'uuid';
import { initMetaPixel, trackMetaViewContent, trackMetaAddToCart, trackMetaPurchase } from './metaPixel';

// Use environment variable for the Measurement ID
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

// Session and Visitor Management
const getVisitorId = () => {
  let id = localStorage.getItem('masuma_visitor_id');
  if (!id) {
    id = uuidv4();
    localStorage.setItem('masuma_visitor_id', id);
  }
  return id;
};

const getSessionId = () => {
  let id = sessionStorage.getItem('masuma_session_id');
  if (!id) {
    id = uuidv4();
    sessionStorage.setItem('masuma_session_id', id);
  }
  return id;
};

const logInternalEvent = (type: string, data?: any) => {
  const scheduleLog = () => {
    try {
      const user = JSON.parse(localStorage.getItem('masuma_user') || 'null');
      const payload = {
        type,
        data,
        visitorId: getVisitorId(),
        sessionId: getSessionId(),
        userId: user?.id,
        pageUrl: window.location.href,
        referrer: document.referrer
      };

      // Use navigator.sendBeacon if available for non-blocking transport, otherwise apiClient
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon('/api/analytics/log', blob);
      } else {
        apiClient.post('/analytics/log', payload).catch(() => {});
      }
    } catch (e) {
      // Silent fail for analytics
    }
  };

  // Schedule during browser idle time to keep main thread free for LCP & INP
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(scheduleLog, { timeout: 3000 });
  } else {
    setTimeout(scheduleLog, 1500);
  }
};

import { getStoredConsent, subscribeToConsentChanges } from './cookieConsent';

let gaInitialized = false;
let consentSubscriptionActive = false;

export const initGA = () => {
  const consent = getStoredConsent();

  if (consent?.analytics && GA_MEASUREMENT_ID && !gaInitialized) {
    ReactGA.initialize(GA_MEASUREMENT_ID);
    gaInitialized = true;
    console.log('Google Analytics Initialized (Consent Granted)');
  } else if (!consent?.analytics) {
    console.log('Google Analytics deferred (Awaiting Analytics Cookie Consent)');
  }

  // Initialize Meta Pixel if marketing consent granted
  if (consent?.marketing) {
    initMetaPixel();
  }

  // Set up live subscriber for consent state updates (e.g. user clicks "Accept All" or "Agree to Selected")
  if (!consentSubscriptionActive && typeof window !== 'undefined') {
    consentSubscriptionActive = true;
    subscribeToConsentChanges((newConsent) => {
      if (newConsent.analytics && GA_MEASUREMENT_ID && !gaInitialized) {
        ReactGA.initialize(GA_MEASUREMENT_ID);
        gaInitialized = true;
        ReactGA.send({ hitType: 'pageview', page: window.location.pathname + window.location.search });
      }
      if (newConsent.marketing) {
        initMetaPixel();
      }
    });
  }

  logInternalEvent('SESSION_START');
};

export const trackPageView = (path: string) => {
  const consent = getStoredConsent();
  if (gaInitialized && consent?.analytics) {
    ReactGA.send({ hitType: 'pageview', page: path });
  }
  logInternalEvent('PAGE_VIEW', { path });
};

export const trackEvent = (category: string, action: string, label?: string, value?: number) => {
  const consent = getStoredConsent();
  if (gaInitialized && consent?.analytics) {
    ReactGA.event({
      category,
      action,
      label,
      value,
    });
  }
  logInternalEvent('CLICK', { category, action, label, value });
};

// Custom Benchmarking Events
export const trackProductView = (productName: string, category: string, price?: number) => {
  trackEvent('Product', 'View', `${productName} (${category})`);
  logInternalEvent('PRODUCT_VIEW', { productName, category });
  trackMetaViewContent(productName, category, price);
};

export const trackAddToCart = (productName: string, price: number) => {
  trackEvent('Ecommerce', 'Add to Cart', productName, price);
  logInternalEvent('ADD_TO_CART', { productName, price });
  trackMetaAddToCart(productName, price);
};

export const trackCheckoutInitiated = (totalAmount: number, itemCount: number) => {
  trackEvent('Ecommerce', 'Checkout Initiated', `Items: ${itemCount}`, totalAmount);
  logInternalEvent('CHECKOUT_START', { totalAmount, itemCount });
};

export const trackCheckoutComplete = (orderId: string, totalAmount: number) => {
  trackEvent('Ecommerce', 'Checkout Complete', orderId, totalAmount);
  logInternalEvent('CHECKOUT_COMPLETE', { orderId, totalAmount });
  trackMetaPurchase(orderId, totalAmount);
};

export const trackWhatsAppClick = (location: string) => {
  trackEvent('Support', 'WhatsApp Click', location);
};

export const trackAIInteraction = (query: string) => {
  trackEvent('AI Assistant', 'Query', query);
};

export const trackSearch = (searchTerm: string, resultsCount: number = 0) => {
  trackEvent('Search', 'Product Search', searchTerm, resultsCount);
  logInternalEvent('SEARCH', { 
    term: searchTerm, 
    resultsCount, 
    isZeroResult: resultsCount === 0 
  });
};

export const trackShare = (platform: string, contentId: string, contentType: 'PRODUCT' | 'POST') => {
  trackEvent('Social', 'Share', `${platform} - ${contentType}: ${contentId}`);
  logInternalEvent('SHARE', { platform, contentId, contentType });
};
