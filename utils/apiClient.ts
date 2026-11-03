
import axios from 'axios';

// Robust base URL detection
const getBaseUrl = () => {
  try {
      // @ts-ignore - Vite specific
      const metaEnv = import.meta.env;
      if (metaEnv && metaEnv.VITE_API_URL) {
        return metaEnv.VITE_API_URL;
      }
  } catch (e) {
      // Ignore
  }
  return '/api';
};

export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000,
  // Removed hardcoded Content-Type to allow Axios to auto-detect (JSON vs FormData)
});

// Cache & Deduplication store for critical high-frequency read endpoints
const inFlightRequests: Record<string, Promise<any>> = {};
const responseCache: Record<string, { data: any; expiry: number }> = {};
const originalGet = apiClient.get.bind(apiClient);

apiClient.get = function (url: string, config?: any): Promise<any> {
  const cleanPath = (url || '').split('?')[0].replace(/^\/api/, '');
  const isCachableEndpoint = cleanPath === '/settings' || cleanPath === '/exchange-rates';

  if (isCachableEndpoint) {
    const now = Date.now();
    const cached = responseCache[cleanPath];
    if (cached && cached.expiry > now) {
      return Promise.resolve({ data: cached.data, status: 200, statusText: 'OK', headers: {}, config: config || {} } as any);
    }

    if (inFlightRequests[cleanPath]) {
      return inFlightRequests[cleanPath];
    }

    const promise = originalGet(url, config)
      .then((res) => {
        responseCache[cleanPath] = { data: res.data, expiry: Date.now() + 60000 };
        delete inFlightRequests[cleanPath];
        return res;
      })
      .catch((err) => {
        delete inFlightRequests[cleanPath];
        throw err;
      });

    inFlightRequests[cleanPath] = promise;
    return promise;
  }

  return originalGet(url, config);
};

// Request Interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('masuma_auth_token');
    if (token) {
      if (!config.headers) {
        config.headers = {} as any;
      }
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle Auth Error (401)
    if (error.response?.status === 401) {
        const url = error.config?.url || '';
        const isLoginRequest = url.includes('/login');
        const isHealthCheck = url.includes('/health');
        
        if (!isLoginRequest && !isHealthCheck) {
            localStorage.removeItem('masuma_auth_token');
            localStorage.removeItem('masuma_user');
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('masuma_auth_expired'));
            }
        }
    }
    return Promise.reject(error);
  }
);

export const formatCurrency = (amount: number) => {
  const val = Number(amount);
  if (isNaN(val)) return 'KES 0';
  
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
};
