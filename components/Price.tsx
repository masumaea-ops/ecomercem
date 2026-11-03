
import React from 'react';
import { useCurrency } from '../contexts/CurrencyContext';

interface PriceProps {
    amount: number;
    className?: string;
}

const Price: React.FC<PriceProps> = ({ amount, className = '' }) => {
    const { format } = useCurrency();
    return <span className={className}>{format(amount)}</span>;
};

export default Price;
