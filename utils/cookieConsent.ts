export interface CookieConsentPreferences {
  necessary: boolean; // Always true (auth, security, cart)
  functional: boolean; // VIN filter, currency preferences, UI settings
  analytics: boolean; // Google Analytics 4, performance metrics
  marketing: boolean; // Meta Pixel, retargeting & conversions
  timestamp: string;
  version: string;
}

export const CONSENT_STORAGE_KEY = 'masuma_cookie_consent_v1';
export const CONSENT_COOKIE_NAME = 'masuma_cookie_consent';
export const CURRENT_CONSENT_VERSION = '1.0';
export const CONSENT_CHANGE_EVENT = 'masuma_cookie_consent_changed';
export const OPEN_CONSENT_MODAL_EVENT = 'masuma_open_cookie_preferences';

export const DEFAULT_CONSENT: CookieConsentPreferences = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
  timestamp: '',
  version: CURRENT_CONSENT_VERSION,
};

/**
 * Retrieve saved consent from localStorage or browser cookies.
 */
export const getStoredConsent = (): CookieConsentPreferences | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (raw) {
      const parsed: CookieConsentPreferences = JSON.parse(raw);
      if (parsed && parsed.version === CURRENT_CONSENT_VERSION) {
        return { ...parsed, necessary: true };
      }
    }
  } catch (e) {
    // Fall back to checking document.cookie
  }

  // Fallback to checking document.cookie
  try {
    const cookies = document.cookie.split(';');
    for (const c of cookies) {
      const [key, val] = c.trim().split('=');
      if (key === CONSENT_COOKIE_NAME && val) {
        const decoded = decodeURIComponent(val);
        const parsed: CookieConsentPreferences = JSON.parse(decoded);
        if (parsed && parsed.version === CURRENT_CONSENT_VERSION) {
          return { ...parsed, necessary: true };
        }
      }
    }
  } catch (e) {
    // Ignore error
  }

  return null;
};

/**
 * Check if the user has already responded to the cookie consent request.
 */
export const hasUserConsented = (): boolean => {
  return getStoredConsent() !== null;
};

/**
 * Save user preferences to localStorage and document.cookie.
 * Dispatches an event so active trackers (GA, Meta Pixel) can respond immediately.
 */
export const saveConsent = (
  prefs: Partial<Omit<CookieConsentPreferences, 'necessary' | 'timestamp' | 'version'>>
): CookieConsentPreferences => {
  const fullConsent: CookieConsentPreferences = {
    necessary: true,
    functional: Boolean(prefs.functional),
    analytics: Boolean(prefs.analytics),
    marketing: Boolean(prefs.marketing),
    timestamp: new Date().toISOString(),
    version: CURRENT_CONSENT_VERSION,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(fullConsent));
    } catch (e) {
      console.warn('Unable to write cookie consent to localStorage', e);
    }

    try {
      // 365-day expiry cookie
      const maxAge = 60 * 60 * 24 * 365;
      const isSecure = window.location.protocol === 'https:';
      document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(
        JSON.stringify(fullConsent)
      )}; path=/; max-age=${maxAge}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
    } catch (e) {
      console.warn('Unable to write cookie consent to document.cookie', e);
    }

    // Clean up rejected cookies if needed
    if (!fullConsent.analytics) {
      clearAnalyticsCookies();
    }
    if (!fullConsent.marketing) {
      clearMarketingCookies();
    }

    window.dispatchEvent(
      new CustomEvent(CONSENT_CHANGE_EVENT, { detail: fullConsent })
    );
  }

  return fullConsent;
};

/**
 * One-click helper to accept all categories.
 */
export const acceptAllCookies = (): CookieConsentPreferences => {
  return saveConsent({
    functional: true,
    analytics: true,
    marketing: true,
  });
};

/**
 * One-click helper to reject all non-essential cookies.
 */
export const rejectNonEssentialCookies = (): CookieConsentPreferences => {
  return saveConsent({
    functional: false,
    analytics: false,
    marketing: false,
  });
};

/**
 * Trigger opening of the preferences modal from anywhere (e.g. footer or policy page).
 */
export const openCookiePreferences = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OPEN_CONSENT_MODAL_EVENT));
  }
};

/**
 * Subscribe to cookie consent changes during runtime.
 */
export const subscribeToConsentChanges = (
  callback: (consent: CookieConsentPreferences) => void
): (() => void) => {
  if (typeof window === 'undefined') return () => {};

  const handler = (event: Event) => {
    const custom = event as CustomEvent<CookieConsentPreferences>;
    if (custom.detail) {
      callback(custom.detail);
    }
  };

  window.addEventListener(CONSENT_CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, handler);
  };
};

/**
 * Helper to remove known Google Analytics cookies if consent is revoked.
 */
export const clearAnalyticsCookies = () => {
  if (typeof document === 'undefined') return;
  const gaCookies = ['_ga', '_gid', '_gat', '_ga_'];
  const cookies = document.cookie.split(';');

  for (const c of cookies) {
    const name = c.trim().split('=')[0];
    if (gaCookies.some((prefix) => name.startsWith(prefix))) {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
      document.cookie = `${name}=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    }
  }
};

/**
 * Helper to remove known Meta/Facebook Pixel cookies if consent is revoked.
 */
export const clearMarketingCookies = () => {
  if (typeof document === 'undefined') return;
  const fbCookies = ['_fbp', '_fbc'];
  const cookies = document.cookie.split(';');

  for (const c of cookies) {
    const name = c.trim().split('=')[0];
    if (fbCookies.some((prefix) => name.startsWith(prefix))) {
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
      document.cookie = `${name}=; path=/; domain=${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    }
  }
};
