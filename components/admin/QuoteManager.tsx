
import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, CheckCircle, XCircle, MoreHorizontal, ArrowRight, DollarSign, RefreshCw, Loader2, Send, Eye, Plane, ShoppingBag, Plus, User, Trash2, Save, X } from 'lucide-react';
import { Quote, QuoteStatus, Product, Customer } from '../../types';
import { apiClient } from '../../utils/apiClient';
import QuoteDetailsModal from './QuoteDetailsModal';
import Price from '../Price';

const QuoteManager: React.FC = () => {
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
    const [activeTab, setActiveTab] = useState<'ALL' | 'STANDARD' | 'SOURCING'>('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Creation State
    const [isCreating, setIsCreating] = useState(false);
    const [newQuoteData, setNewQuoteData] = useState({
        name: '', email: '', phone: '', items: [] as any[]
    });
    const [productSearch, setProductSearch] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const fetchQuotes = async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get('/quotes');
            setQuotes(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchQuotes();
    }, []);

    // Search Products for New Quote
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (productSearch.length > 2) {
                try {
                    const res = await apiClient.get(`/products?q=${productSearch}`);
                    setSearchResults(res.data.data || res.data || []);
                } catch (e) { setSearchResults([]); }
            } else {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [productSearch]);

    const addToNewQuote = (product: Product) => {
        setNewQuoteData(prev => ({
            ...prev,
            items: [...prev.items, {
                productId: product.id,
                name: product.name,
                quantity: 1,
                unitPrice: product.price,
                total: product.price,
                sku: product.sku,
                oem: product.oemNumbers?.[0] || ''
            }]
        }));
        setProductSearch('');
        setSearchResults([]);
        searchInputRef.current?.focus();
    };

    const updateNewItem = (index: number, field: string, value: any) => {
        setNewQuoteData(prev => {
            const items = [...prev.items];
            items[index] = { ...items[index], [field]: value };
            
            // Recalc total safely
            const qty = Number(items[index].quantity) || 0;
            const price = Number(items[index].unitPrice) || 0;
            items[index].total = qty * price;
            
            return { ...prev, items };
        });
    };

    const removeNewItem = (index: number) => {
        setNewQuoteData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const handleCreateQuote = async () => {
        if (!newQuoteData.name || !newQuoteData.phone || newQuoteData.items.length === 0) {
            return alert('Please fill in customer details and add at least one item.');
        }
        try {
            // Sanitize items before sending
            const sanitizedItems = newQuoteData.items.map(item => ({
                ...item,
                quantity: Number(item.quantity) || 1,
                unitPrice: Number(item.unitPrice) || 0
            }));

            await apiClient.post('/quotes', {
                ...newQuoteData,
                items: sanitizedItems,
                requestType: 'STANDARD'
            });
            setIsCreating(false);
            setNewQuoteData({ name: '', email: '', phone: '', items: [] });
            fetchQuotes();
            alert('Quote created successfully');
        } catch (error) {
            alert('Failed to create quote');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'DRAFT': return <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-bold uppercase">Draft</span>;
            case 'SENT': return <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded text-[10px] font-bold uppercase">Sent</span>;
            case 'ACCEPTED': return <span className="bg-green-100 text-green-600 px-2 py-1 rounded text-[10px] font-bold uppercase">Accepted</span>;
            case 'CONVERTED': return <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded text-[10px] font-bold uppercase">Invoiced</span>;
            case 'EXPIRED': return <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-[10px] font-bold uppercase">Expired</span>;
            default: return null;
        }
    };

    const filteredQuotes = quotes.filter(q => {
        const matchesTab = activeTab === 'ALL' || q.type === activeTab;
        const matchesSearch = q.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              q.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (q.vin && q.vin.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesTab && matchesSearch;
    });

    const newQuoteTotal = newQuoteData.items.reduce((sum, i) => sum + (Number(i.total) || 0), 0);

    return (
        <div className="h-full flex flex-col">
            <QuoteDetailsModal 
                quote={selectedQuote} 
                isOpen={!!selectedQuote} 
                onClose={() => setSelectedQuote(null)} 
                onUpdate={fetchQuotes} 
            />

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-masuma-dark font-display uppercase">Quotations</h2>
                    <p className="text-sm text-gray-500">Manage sales quotes and special sourcing requests.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsCreating(true)}
                        className="bg-masuma-dark text-white px-4 py-2 rounded font-bold uppercase text-xs hover:bg-masuma-orange transition flex items-center gap-2"
                    >
                        <Plus size={16} /> New Quote
                    </button>
                    <button onClick={fetchQuotes} className="p-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-600">
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Create Quote Panel */}
            {isCreating && (
                <div className="bg-white rounded-lg shadow-lg border border-masuma-orange mb-6 overflow-hidden animate-slide-up">
                    <div className="bg-masuma-dark text-white p-4 flex justify-between items-center">
                        <h3 className="font-bold uppercase tracking-wider text-sm">Create New Quote</h3>
                        <button onClick={() => setIsCreating(false)}><X size={18} /></button>
                    </div>
                    <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Customer Details */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-500 uppercase border-b pb-1">Customer Info</h4>
                            <input type="text" placeholder="Customer Name *" className="w-full p-2 border rounded text-sm" value={newQuoteData.name} onChange={e => setNewQuoteData({...newQuoteData, name: e.target.value})} />
                            <input type="tel" placeholder="Phone Number *" className="w-full p-2 border rounded text-sm" value={newQuoteData.phone} onChange={e => setNewQuoteData({...newQuoteData, phone: e.target.value})} />
                            <input type="email" placeholder="Email (Optional)" className="w-full p-2 border rounded text-sm" value={newQuoteData.email} onChange={e => setNewQuoteData({...newQuoteData, email: e.target.value})} />
                        </div>

                        {/* Items */}
                        <div className="lg:col-span-2 space-y-3 flex flex-col">
                            <h4 className="text-xs font-bold text-gray-500 uppercase border-b pb-1">Quote Items</h4>
                            <div className="relative mb-2">
                                <Search className="absolute left-2 top-2.5 text-gray-400" size={14} />
                                <input 
                                    ref={searchInputRef}
                                    type="text" 
                                    placeholder="Search product to add..." 
                                    className="w-full pl-8 p-2 border rounded text-sm bg-gray-50 focus:bg-white focus:border-masuma-orange outline-none"
                                    value={productSearch}
                                    onChange={e => setProductSearch(e.target.value)}
                                />
                                {searchResults.length > 0 && (
                                    <div className="absolute top-full left-0 w-full bg-white shadow-xl border z-10 max-h-40 overflow-y-auto">
                                        {searchResults.map(p => (
                                            <div key={p.id} onClick={() => addToNewQuote(p)} className="p-2 hover:bg-gray-100 cursor-pointer text-sm flex justify-between">
                                                <span>{p.name}</span>
                                                <span className="font-bold"><Price amount={p.price} /></span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto max-h-40 border rounded bg-gray-50">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-100 text-gray-500">
                                        <tr>
                                            <th className="p-2">Item</th>
                                            <th className="p-2 w-16">Qty</th>
                                            <th className="p-2 w-24">Price</th>
                                            <th className="p-2 w-24 text-right">Total</th>
                                            <th className="p-2 w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {newQuoteData.items.map((item, idx) => (
                                            <tr key={idx} className="border-b border-gray-200">
                                                <td className="p-2">{item.name}</td>
                                                <td className="p-2"><input type="number" className="w-full p-1 border rounded" value={item.quantity} onChange={e => updateNewItem(idx, 'quantity', e.target.value)} /></td>
                                                <td className="p-2"><input type="number" className="w-full p-1 border rounded" value={item.unitPrice} onChange={e => updateNewItem(idx, 'unitPrice', e.target.value)} /></td>
                                                <td className="p-2 text-right font-bold"><Price amount={item.total} /></td>
                                                <td className="p-2"><button onClick={() => removeNewItem(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={12} /></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            <div className="flex justify-between items-center pt-2">
                                <span className="font-bold text-lg">Total: <Price amount={newQuoteTotal} /></span>
                                <button onClick={handleCreateQuote} className="bg-green-600 text-white px-6 py-2 rounded font-bold uppercase text-xs hover:bg-green-700 flex items-center gap-2">
                                    <Save size={14} /> Save Quote
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button 
                        onClick={() => setActiveTab('ALL')}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide border-b-4 transition ${activeTab === 'ALL' ? 'border-masuma-orange text-masuma-orange bg-gray-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
                    >
                        All Quotes
                    </button>
                    <button 
                        onClick={() => setActiveTab('SOURCING')}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide border-b-4 transition flex items-center justify-center gap-2 ${activeTab === 'SOURCING' ? 'border-purple-600 text-purple-700 bg-purple-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
                    >
                        <Plane size={16} className="transform -rotate-45" /> Special Imports
                        {quotes.filter(q => q.type === 'SOURCING' && q.status === 'DRAFT').length > 0 && (
                            <span className="bg-purple-600 text-white text-[10px] px-2 rounded-full">
                                {quotes.filter(q => q.type === 'SOURCING' && q.status === 'DRAFT').length}
                            </span>
                        )}
                    </button>
                    <button 
                        onClick={() => setActiveTab('STANDARD')}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide border-b-4 transition flex items-center justify-center gap-2 ${activeTab === 'STANDARD' ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}
                    >
                        <ShoppingBag size={16} /> Standard Inquiries
                    </button>
                </div>

                {/* Toolbar */}
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded outline-none focus:border-masuma-orange bg-white" 
                            placeholder="Search Quote #, Customer, or VIN..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    {isLoading && quotes.length === 0 ? (
                        <div className="flex justify-center items-center h-64">
                             <Loader2 className="animate-spin text-masuma-orange" size={32} />
                        </div>
                    ) : (
                    <table className="w-full text-left">
                        <thead className="bg-white text-gray-500 uppercase font-bold text-xs border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4">Quote #</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Details</th>
                                <th className="px-6 py-4">Value</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {filteredQuotes.map(quote => (
                                <tr key={quote.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedQuote(quote)}>
                                    <td className="px-6 py-4 font-mono font-bold text-masuma-dark">{quote.quoteNumber}</td>
                                    <td className="px-6 py-4">
                                        {quote.type === 'SOURCING' ? (
                                            <span className="flex items-center gap-1 text-purple-700 font-bold text-[10px] uppercase bg-purple-100 px-2 py-1 rounded w-fit">
                                                <Plane size={12} className="transform -rotate-45" /> Import
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-blue-600 font-bold text-[10px] uppercase bg-blue-50 px-2 py-1 rounded w-fit">
                                                <FileText size={12} /> Standard
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-700">{quote.customerName}</div>
                                        <div className="text-xs text-gray-500">{quote.date}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {quote.type === 'SOURCING' && quote.vin ? (
                                            <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded w-fit border border-gray-300">
                                                VIN: {quote.vin}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-500">{quote.itemsCount} items</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-bold">
                                        {quote.total > 0 ? `KES ${quote.total.toLocaleString()}` : <span className="text-gray-400 italic">Pending</span>}
                                    </td>
                                    <td className="px-6 py-4">{getStatusBadge(quote.status)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button 
                                                onClick={() => setSelectedQuote(quote)}
                                                className="p-2 text-gray-400 hover:text-masuma-orange transition bg-white border border-gray-200 rounded"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredQuotes.length === 0 && (
                                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No quotes found matching your filters.</td></tr>
                            )}
                        </tbody>
                    </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuoteManager;
