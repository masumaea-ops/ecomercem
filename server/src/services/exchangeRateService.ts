
import axios from 'axios';
import { CacheService } from '../lib/cache';
import { config } from '../config/env';

const RATES_CACHE_KEY = 'forex_rates_kes_base';
const CACHE_TTL = 3600; // 1 Hour

// Fallback rates in case external API fails
const FALLBACK_RATES = {
    KES: 1,
    USD: 0.0076, // Approx 130 KES
    UGX: 28.5,
    TZS: 19.5,
    RWF: 9.8
};

export class ExchangeRateService {
    static async getRates() {
        return CacheService.getOrSet(RATES_CACHE_KEY, async () => {
            try {
                // If API Key is present, use the authenticated endpoint (Reliable)
                // Otherwise, fallback to the open endpoint (Rate limited)
                const url = config.EXCHANGE_RATE_API_KEY 
                    ? `https://v6.exchangerate-api.com/v6/${config.EXCHANGE_RATE_API_KEY}/latest/KES`
                    : 'https://open.er-api.com/v6/latest/KES';

                const response = await axios.get(url);
                
                if (response.data && (response.data.result === 'success' || response.data.result === 'success')) {
                    const rates = response.data.conversion_rates || response.data.rates;
                    if (!rates) throw new Error("No rates in response");

                    return {
                        KES: 1,
                        USD: rates.USD,
                        UGX: rates.UGX,
                        TZS: rates.TZS,
                        RWF: rates.RWF
                    };
                }
                throw new Error('Invalid API response');
            } catch (error: any) {
                console.error('Forex API Error (Using Fallback):', error.message);
                return FALLBACK_RATES;
            }
        }, CACHE_TTL);
    }
}
