import React, { useState } from 'react';
import { Search, ShoppingBag, Plane, ArrowRight, ExternalLink, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { apiClient } from '../utils/apiClient';
import { Product } from '../types';
import Price from './Price';
import SourcingModal from './SourcingModal';
import ProductImage from './ProductImage';

interface PartFinderProps {
    addToCart: (product: Product) => void;
}

const PartFinder: React.FC<PartFinderProps> = ({ addToCart }) => {
    const [sku, setSku] = useState('');
    const [loading, setLoading] = useState(false);
    const [foundProduct, setFoundProduct] = useState<Product | null>(null);
    const [searchAttempted, setSearchAttempted] = useState(false);
    const [isSourcingOpen, setIsSourcingOpen] = useState(false);

    const handleLocalCheck = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedSku = sku.trim();
        if (!trimmedSku) return;
        
        setLoading(true);
        setSearchAttempted(false);
        setFoundProduct(null);
        
        try {
            const res = await apiClient.get(`/products?q=${trimmedSku}`);
            const products = res.data.data || res.data || [];
            
            if (products && products.length > 0) {
                // IMPROVED: Robust SKU normalization comparison
                // Removes all non-alphanumeric chars for the "Exact" check
                const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
                const target = normalize(trimmedSku);
                
                const exact = products.find((p: any) => 
                    normalize(p.sku) === target || 
                    (Array.isArray(p.oemNumbers) && p.oemNumbers.some((o: string) => normalize(o) === target))
                );
                setFoundProduct(exact || products[0]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setSearchAttempted(true);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-white animate-fade-in">
            <SourcingModal isOpen={isSourcingOpen} onClose={() => setIsSourcingOpen(false)} />

            {/* 1. Top Control Bar: Local Search */}
            <div className="bg-masuma-dark text-white py-8 border-b-4 border-masuma-orange">
                <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h1 className="text-xl font-bold font-display uppercase tracking-wide mb-1">Part Finder</h1>
                        <p className="text-xs text-gray-400">
                            Step 1: Find your part number below. <br/> 
                            Step 2: Enter the SKU here to check local stock.
                        </p>
                    </div>
                    
                    <div className="w-full md:w-1/2 relative">
                        <form onSubmit={handleLocalCheck} className="flex bg-white rounded-2xl shadow-xl overflow-hidden p-1.5 border border-white/20 focus-within:ring-2 focus-within:ring-masuma-orange transition-all">
                            <input 
                                type="text" 
                                value={sku}
                                onChange={e => setSku(e.target.value)}
                                placeholder="Enter SKU (e.g. MS 7460 or MS-7460)"
                                className="flex-1 px-4 py-3 text-masuma-dark font-medium text-sm outline-none bg-transparent"
                            />
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="bg-masuma-dark hover:bg-masuma-orange text-white font-bold px-6 py-3 uppercase tracking-wider text-xs rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 shadow-md active:scale-95"
                            >
                                {loading ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
                                Check Stock
                            </button>
                        </form>

                        {/* Search Result Dropdown */}
                        {searchAttempted && (
                            <div className="absolute top-full left-0 w-full bg-white text-masuma-dark shadow-2xl border border-gray-100 z-50 p-5 mt-2 animate-slide-up rounded-2xl">
                                {foundProduct ? (
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden shrink-0 border border-gray-100 p-1 flex items-center justify-center">
                                            <ProductImage 
                                                src={foundProduct.image} 
                                                sku={foundProduct.sku} 
                                                alt={foundProduct.name} 
                                                className="w-full h-full object-contain" 
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-[10px] uppercase text-emerald-600 flex items-center gap-1 mb-0.5">
                                                <CheckCircle size={14} /> Local Stock Found
                                            </h4>
                                            <p className="font-bold text-xs text-masuma-dark truncate">{foundProduct.name}</p>
                                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">SKU: {foundProduct.sku}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-bold text-masuma-orange text-base"><Price amount={foundProduct.price} /></p>
                                            <button 
                                                onClick={() => addToCart(foundProduct)}
                                                className="mt-1 bg-masuma-dark text-white px-4 py-2 text-[10px] font-bold uppercase rounded-xl hover:bg-masuma-orange transition-all flex items-center gap-1.5 shadow-md active:scale-95"
                                            >
                                                <ShoppingBag size={14} /> Add
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5 text-red-500">
                                            <XCircle size={22} className="shrink-0" />
                                            <div>
                                                <p className="font-bold text-xs uppercase">Not in Local Warehouse</p>
                                                <p className="text-[11px] text-gray-500">SKU "{sku}" not found in Nairobi store.</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setIsSourcingOpen(true)}
                                            className="bg-masuma-orange text-white px-4 py-2.5 text-[10px] font-bold uppercase rounded-xl hover:bg-masuma-dark transition-all flex items-center gap-2 shadow-lg shadow-masuma-orange/20 active:scale-95 shrink-0"
                                        >
                                            <Plane size={14} className="transform -rotate-45" /> Request Sourcing
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. Warning Banner */}
            <div className="bg-gray-100 py-2 text-center border-b border-gray-200">
                <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
                    <ExternalLink size={12} />
                    You are viewing the Global Masuma Catalog. Use it to find part numbers, then search above to buy locally.
                </p>
            </div>

            {/* 3. Embedded Iframe */}
            <div className="flex-1 relative w-full bg-gray-50">
                <iframe 
                    src="https://masuma.parts/" 
                    className="w-full h-full min-h-[800px] border-none"
                    title="Masuma Global Catalog"
                    loading="lazy"
                ></iframe>
            </div>
        </div>
    );
};

export default PartFinder;