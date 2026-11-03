
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { apiClient } from '../utils/apiClient';

export type CurrencyCode = 'KES' | 'USD' | 'UGX' | 'TZS' | 'RWF';

interface CurrencyContextType {
    currency: CurrencyCode;
    setCurrency: (code: CurrencyCode) => void;
    rates: Record<string, number>;
    convert: (amountInKes: number) => number;
    format: (amountInKes: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currency, setCurrency] = useState<CurrencyCode>('KES');
    const [rates, setRates] = useState<Record<string, number>>({ KES: 1 });

    useEffect(() => {
        const fetchRates = async () => {
            try {
                const res = await apiClient.get('/exchange-rates');
                if (res.data) {
                    setRates(res.data);
                }
            } catch (error) {
                console.warn('Exchange Rate API unreachable.');
            }
        };
        fetchRates();
    }, []);

    const convert = (amountInKes: number) => {
        const rate = rates[currency] || 1;
        return amountInKes * rate;
    };

    const format = (amountInKes: number) => {
        const converted = convert(amountInKes);
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: currency === 'USD' ? 2 : 0,
            maximumFractionDigits: currency === 'USD' ? 2 : 0,
        }).format(converted);
    };

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency, rates, convert, format }}>
            {children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = () => {
    const context = useContext(CurrencyContext);
    if (!context) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
};
