
import React, { useState, useRef, useEffect } from 'react';
import { Search, Trash2, Plus, Minus, CreditCard, Printer, Save, CheckCircle, QrCode, User, X, Loader2, Smartphone, FileText, Banknote, AlertTriangle, Send, Percent, Tag, ChevronRight } from 'lucide-react';
import { Product, Customer, Sale } from '../../types';
import { apiClient } from '../../utils/apiClient';
import InvoiceTemplate from './InvoiceTemplate';
import { printDocument } from '../../utils/pdfGenerator';

// Robust local interface definition
interface PosItem {
    id: string;
    name: string;
    sku: string;
    price: number;
    wholesalePrice?: number;
    quantity?: number;
    oemNumbers?: string[];
    qty: number;
    appliedPrice: number;
    [key: string]: any;
}

type PaymentMethod = 'CASH' | 'MPESA' | 'CHEQUE' | 'CARD';

const PosTerminal: React.FC = () => {
    const [cart, setCart] = useState<PosItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [lastSale, setLastSale] = useState<Sale | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    
    // User Session State
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Payment & Discount State
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
    const [paymentReference, setPaymentReference] = useState('');
    const [discountValue, setDiscountValue] = useState<string>(''); // Allow empty string for input
    const [discountType, setDiscountType] = useState<'PERCENTAGE' | 'FIXED'>('FIXED');
    
    // M-Pesa Specific State
    const [mpesaPhone, setMpesaPhone] = useState('');
    const [pollingOrderId, setPollingOrderId] = useState<string | null>(null);
    const [pollingOrderNumber, setPollingOrderNumber] = useState<string | null>(null);
    const [waitingForPayment, setWaitingForPayment] = useState(false);

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [foundCustomers, setFoundCustomers] = useState<Customer[]>([]);
    
    const searchInputRef = useRef<HTMLInputElement>(null);
    const printRef = useRef<HTMLDivElement>(null);

    // Initial load - Get User for Branch ID
    useEffect(() => {
        const u = localStorage.getItem('masuma_user');
        if (u) {
            try {
                setCurrentUser(JSON.parse(u));
            } catch (e) { console.error('Failed to parse user session'); }
        }
    }, []);

    // Pre-fill phone if customer selected
    useEffect(() => {
        if (customer && customer.phone) {
            setMpesaPhone(customer.phone);
        } else {
            setMpesaPhone('');
        }
    }, [customer]);

    // Calculations
    const subTotal = Number(cart.reduce((sum, item) => sum + (item.appliedPrice * item.qty), 0).toFixed(2));
    
    let discountAmount = 0;
    const numDiscount = parseFloat(discountValue) || 0;
    
    if (numDiscount > 0) {
        if (discountType === 'PERCENTAGE') {
            discountAmount = Number((subTotal * (Math.min(numDiscount, 100) / 100)).toFixed(2));
        } else {
            discountAmount = Number(Math.min(numDiscount, subTotal).toFixed(2));
        }
    }
    
    const taxableAmount = Number(Math.max(0, subTotal - discountAmount).toFixed(2));
    const taxAmount = Number((taxableAmount * 0.16).toFixed(2));
    const finalTotal = Number((taxableAmount + taxAmount).toFixed(2));

    // Polling Logic for M-Pesa
    useEffect(() => {
        let interval: any;
        if (waitingForPayment && pollingOrderId && pollingOrderNumber) {
            interval = setInterval(async () => {
                try {
                    // Check order status
                    const statusRes = await apiClient.get(`/orders/${pollingOrderId}/status`);
                    if (statusRes.data.status === 'PAID') {
                        clearInterval(interval);
                        
                        setTimeout(async () => {
                            try {
                                const saleRes = await apiClient.get(`/sales/order/${pollingOrderNumber}`);
                                setLastSale(saleRes.data);
                                setCart([]);
                                setCustomer(null);
                                setPollingOrderId(null);
                                setPollingOrderNumber(null);
                                setWaitingForPayment(false);
                                setDiscountValue('');
                                
                                setTimeout(() => window.print(), 800);
                            } catch (e) {
                                console.error("Could not fetch generated sale", e);
                                alert("Payment confirmed, but receipt generation is delayed.");
                                setWaitingForPayment(false);
                            }
                        }, 1500); 
                    }
                } catch (err) {
                    console.error("Polling error", err);
                }
            }, 3000); 
        }
        return () => clearInterval(interval);
    }, [waitingForPayment, pollingOrderId, pollingOrderNumber]);

    const handleProductSearch = async (term: string) => {
        setSearchTerm(term);
        if (term.length < 2) {
            setSearchResults([]);
            return;
        }
        
        setIsSearching(true);
        try {
            const res = await apiClient.get(`/products?q=${term}`);
            const products = res.data.data || res.data || [];
            setSearchResults(Array.isArray(products) ? products : []);
        } catch (error) {
            console.error('Search failed');
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const addToCart = (product: Product | any) => {
        const currentQty = cart.find(p => p.id === product.id)?.qty || 0;
        const maxStock = product.quantity || 0;

        setCart(prev => {
            const exists = prev.find(p => p.id === product.id);
            if (exists) {
                return prev.map(p => p.id === product.id ? { ...p, qty: p.qty + 1 } : p);
            }
            const price = (customer?.isWholesale && product.wholesalePrice) 
                          ? product.wholesalePrice 
                          : product.price;

            const newItem: PosItem = {
                id: product.id,
                name: product.name,
                sku: product.sku,
                price: product.price,
                wholesalePrice: product.wholesalePrice,
                quantity: product.quantity,
                oemNumbers: product.oemNumbers,
                qty: 1, 
                appliedPrice: price,
                ...product
            };

            return [...prev, newItem];
        });
        setSearchTerm('');
        setSearchResults([]);
        searchInputRef.current?.focus();
    };

    const updateQty = (id: string, delta: number) => {
        setCart(prev => prev.map(p => {
            if (p.id === id) {
                const newQty = p.qty + delta;
                return { ...p, qty: Math.max(1, newQty) };
            }
            return p;
        }));
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(p => p.id !== id));
    };

    const handleSearchCustomer = async (term: string) => {
        setCustomerSearchTerm(term);
        try {
            const res = await apiClient.get(`/customers?search=${term}`);
            setFoundCustomers(res.data);
        } catch (err) {
            setFoundCustomers([]);
        }
    };

    const selectCustomer = (c: Customer) => {
        setCustomer(c);
        setIsCustomerSearchOpen(false);
        setCustomerSearchTerm('');
        setCart(prev => prev.map(item => ({
            ...item,
            appliedPrice: (c.isWholesale && item.wholesalePrice) ? item.wholesalePrice : item.price
        } as PosItem)));
    };

    const handleUseCustomCustomer = () => {
        if (!customerSearchTerm.trim()) return;
        const guestCustomer: Customer = {
            id: 'GUEST', 
            name: customerSearchTerm,
            phone: 'N/A',
            isWholesale: false,
            totalSpend: 0,
            lastVisit: new Date().toISOString()
        };
        selectCustomer(guestCustomer);
    };

    const handleInitiateStkPush = async () => {
        if (!mpesaPhone || mpesaPhone.length < 10) {
            alert("Please enter a valid phone number for STK Push");
            return;
        }

        setIsProcessing(true);
        try {
            const res = await apiClient.post('/mpesa/pay', {
                customerName: customer?.name || 'Walk-in Customer',
                customerEmail: customer?.email || '',
                customerPhone: mpesaPhone,
                shippingAddress: 'POS Transaction',
                items: cart.map(i => ({ 
                    productId: i.id, 
                    quantity: i.qty, 
                    price: i.appliedPrice 
                }))
            });

            setPollingOrderId(res.data.orderId);
            setPollingOrderNumber(res.data.orderNumber); 
            setWaitingForPayment(true);
        } catch (error: any) {
            alert("Failed to initiate M-Pesa: " + (error.response?.data?.error || error.message));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCompleteSale = async () => {
        let branchId = currentUser?.branch?.id;
        
        if (!branchId) {
            try {
                const branchRes = await apiClient.get('/branches');
                if (branchRes.data && branchRes.data.length > 0) {
                    branchId = branchRes.data[0].id;
                }
            } catch (e) {
                console.error("Failed to fetch fallback branch");
            }
        }

        if (!branchId) {
            alert("Error: No Branch ID found. Please assign a branch to your user account or create a branch first.");
            return;
        }

        if (paymentMethod === 'MPESA') {
            if (paymentReference.length < 5) {
                alert("Please enter a valid M-Pesa Transaction Code.");
                return;
            }
        }
        if (paymentMethod === 'CHEQUE' && paymentReference.length < 3) {
            alert("Please enter the Cheque Number.");
            return;
        }

        setIsProcessing(true);
        try {
            const payload = {
                items: cart.map(i => ({ 
                    productId: i.id, 
                    name: i.name, 
                    quantity: i.qty, 
                    price: i.appliedPrice,
                    sku: i.sku,
                    oem: (i.oemNumbers && i.oemNumbers.length > 0) ? i.oemNumbers[0] : ''
                })),
                totalAmount: finalTotal,
                discount: discountAmount,
                discountType: discountType,
                paymentMethod,
                paymentDetails: { reference: paymentReference },
                customerId: customer?.id === 'GUEST' ? undefined : customer?.id,
                customerName: customer?.name,
                branchId: branchId
            };

            const response = await apiClient.post('/sales', payload);
            setLastSale(response.data);
            setCart([]);
            setCustomer(null);
            setPaymentMethod('CASH');
            setPaymentReference('');
            setDiscountValue('');
            
            setTimeout(() => {
                if (printRef.current) {
                    printDocument(printRef.current, { isReceipt: true, title: `Receipt-${response.data.receiptNumber || 'POS'}` });
                } else {
                    window.print();
                }
            }, 300);
        } catch (error: any) {
            alert('Sale Failed: ' + (error.response?.data?.error || 'Network Error'));
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePrintReceipt = () => {
        if (printRef.current) {
            printDocument(printRef.current, { isReceipt: true, title: `Receipt-${lastSale?.receiptNumber || 'POS'}` });
        } else {
            window.print();
        }
    };

    if (waitingForPayment) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
                <div className="bg-white p-8 rounded-lg shadow-2xl text-center max-w-sm w-full border-t-4 border-green-500">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                        <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-green-500 rounded-full border-t-transparent animate-spin"></div>
                        <Smartphone className="absolute inset-0 m-auto text-gray-400" size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-masuma-dark mb-2">Waiting for Payment</h2>
                    <p className="text-sm text-gray-600 mb-6">
                        Prompt sent to <strong>{mpesaPhone}</strong>.<br/>
                        Ask customer to enter PIN.
                    </p>
                    <div className="bg-gray-100 p-3 rounded mb-6">
                        <p className="text-xs font-bold text-gray-500 uppercase">Amount Due</p>
                        <p className="text-2xl font-bold text-masuma-dark">KES {finalTotal.toLocaleString()}</p>
                    </div>
                    <button 
                        onClick={() => setWaitingForPayment(false)}
                        className="text-red-500 font-bold text-sm uppercase hover:underline"
                    >
                        Cancel & Return
                    </button>
                </div>
            </div>
        );
    }

    if (lastSale) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)] animate-scale-up">
                <div className="hidden print-force-container">
                    <InvoiceTemplate data={lastSale} type="RECEIPT" ref={printRef} />
                </div>

                <div className="bg-white p-8 rounded shadow-lg border border-gray-200 w-96 text-center">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-masuma-dark mb-1">Sale Completed</h2>
                    <p className="text-gray-500 text-sm mb-6">Receipt #{lastSale.receiptNumber}</p>
                    
                    <div className="bg-gray-50 p-4 border border-gray-200 rounded mb-6 text-left">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-bold text-gray-500 uppercase">KRA Control Code</span>
                            <span className="text-xs font-mono font-bold">{lastSale.kraControlCode || 'PENDING'}</span>
                        </div>
                        <div className="flex justify-center py-2">
                             <QrCode size={64} className="text-masuma-dark" />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={handlePrintReceipt} className="flex-1 bg-gray-800 text-white py-2 rounded font-bold text-sm uppercase flex items-center justify-center gap-2 hover:bg-gray-700">
                            <Printer size={16} /> Print Again
                        </button>
                        <button onClick={() => setLastSale(null)} className="flex-1 bg-masuma-orange text-white py-2 rounded font-bold text-sm uppercase hover:bg-orange-600">
                            New Sale
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-100px)] gap-4 font-sans">
            {/* Left: Product Selection */}
            <div className="flex-1 flex flex-col bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-3 border-b border-gray-200 flex gap-4 bg-gray-50">
                    <div className="relative flex-1">
                        <input 
                            ref={searchInputRef}
                            type="text" 
                            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 focus:border-masuma-orange outline-none rounded text-sm"
                            placeholder="Scan barcode or search SKU / Name..."
                            value={searchTerm}
                            onChange={(e) => handleProductSearch(e.target.value)}
                            autoFocus
                        />
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                    {isSearching ? (
                         <div className="flex justify-center pt-10"><Loader2 className="animate-spin text-masuma-orange"/></div>
                    ) : searchTerm ? (
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {searchResults.map(p => {
                                const isOutOfStock = (p.quantity || 0) <= 0;
                                return (
                                    <div 
                                        key={p.id} 
                                        onClick={() => addToCart(p)}
                                        className={`p-3 border rounded transition group relative cursor-pointer flex flex-col justify-between h-full hover:shadow-md ${
                                            isOutOfStock 
                                                ? 'border-red-100 bg-red-50 hover:bg-red-100' 
                                                : 'border-gray-200 hover:border-masuma-orange bg-white'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="text-[10px] font-bold text-gray-500 font-mono bg-gray-100 px-1 rounded">{p.sku}</div>
                                                {isOutOfStock && (
                                                    <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 rounded uppercase flex items-center gap-1">
                                                        <AlertTriangle size={8} />
                                                    </span>
                                                )}
                                            </div>
                                            <div className="font-bold text-xs text-masuma-dark line-clamp-2 leading-tight mb-2" title={p.name}>{p.name}</div>
                                        </div>
                                        <div className="mt-auto flex justify-between items-end">
                                            <div className="text-masuma-orange font-bold text-sm">{(p.price).toLocaleString()}</div>
                                            <div className="text-[10px] text-gray-400 font-bold">{p.quantity} left</div>
                                        </div>
                                    </div>
                                );
                            })}
                            {searchResults.length === 0 && <div className="col-span-full text-center text-gray-400 py-10">No products found</div>}
                        </div>
                    ) : (
                         <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <Search size={48} className="mb-4 opacity-20" />
                            <p className="text-sm">Start typing to search inventory</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Cart & Checkout (Restored Width and Structure) */}
            <div className="w-[380px] flex-shrink-0 flex flex-col bg-white rounded shadow-sm border border-gray-200 overflow-hidden relative">
                
                {/* Header */}
                <div className="p-3 bg-masuma-dark text-white border-b border-gray-800 flex justify-between items-center">
                    <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                        Current Sale
                    </h3>
                    <div className="text-right">
                        <span className="bg-masuma-orange px-2 py-0.5 text-[10px] rounded font-bold">{cart.length} Items</span>
                    </div>
                </div>

                {/* Customer Section - Simplified & Fixed */}
                <div className="p-3 border-b border-gray-200 bg-gray-50 relative z-20">
                    {!customer ? (
                        <div className="relative">
                            <button 
                                onClick={() => { setIsCustomerSearchOpen(true); setTimeout(() => document.getElementById('cust-search')?.focus(), 100); }}
                                className={`w-full py-2 border border-dashed border-gray-300 rounded text-gray-500 text-xs font-bold uppercase hover:border-masuma-orange hover:text-masuma-orange transition flex items-center justify-center gap-2 bg-white ${isCustomerSearchOpen ? 'hidden' : ''}`}
                            >
                                <User size={14} /> Add Customer
                            </button>
                            
                            {isCustomerSearchOpen && (
                                <div className="absolute top-0 left-0 w-full bg-white shadow-lg border border-gray-200 rounded z-30">
                                    <div className="flex items-center border-b border-gray-100 p-2">
                                        <Search size={14} className="text-gray-400 mr-2"/>
                                        <input 
                                            id="cust-search"
                                            type="text" 
                                            className="w-full text-sm outline-none"
                                            placeholder="Search Name / Phone..."
                                            value={customerSearchTerm}
                                            onChange={(e) => handleSearchCustomer(e.target.value)}
                                            autoFocus
                                        />
                                        <button onClick={() => setIsCustomerSearchOpen(false)}><X size={14} className="text-gray-400 hover:text-red-500"/></button>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto bg-white">
                                        {foundCustomers.map(c => (
                                            <div 
                                                key={c.id} 
                                                onClick={() => selectCustomer(c)}
                                                className="p-2 hover:bg-orange-50 cursor-pointer border-b border-gray-50 last:border-0"
                                            >
                                                <div className="font-bold text-xs text-gray-800">{c.name}</div>
                                                <div className="flex justify-between items-center mt-1">
                                                    <span className="text-[10px] text-gray-500">{c.phone}</span>
                                                    {c.isWholesale && <span className="text-[9px] bg-purple-100 text-purple-700 px-1 rounded font-bold">B2B</span>}
                                                </div>
                                            </div>
                                        ))}
                                        {customerSearchTerm && (
                                            <div 
                                                onClick={handleUseCustomCustomer}
                                                className="p-2 hover:bg-gray-100 cursor-pointer text-xs font-bold text-masuma-orange flex items-center gap-2 border-t border-gray-100"
                                            >
                                                <Plus size={12}/> Walk-in: "{customerSearchTerm}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex justify-between items-center bg-white border border-green-200 p-2 rounded shadow-sm">
                             <div className="flex flex-col">
                                 <span className="text-xs font-bold text-masuma-dark flex items-center gap-1"><User size={12} className="text-gray-400"/> {customer.name}</span>
                                 <div className="flex items-center gap-2 mt-0.5">
                                     {customer.isWholesale ? (
                                         <span className="text-[9px] bg-purple-100 text-purple-700 px-1 rounded font-bold uppercase">B2B</span>
                                     ) : (
                                         <span className="text-[9px] text-gray-500">Walk-in</span>
                                     )}
                                     <span className="text-[9px] text-gray-400">{customer.phone}</span>
                                 </div>
                             </div>
                             <button onClick={() => setCustomer(null)} className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded"><X size={14} /></button>
                        </div>
                    )}
                </div>

                {/* Cart Items List - Ensure it takes available space */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-white min-h-0">
                    {cart.map((item, idx) => (
                        <div key={idx} className="bg-white p-2 rounded border border-gray-100 hover:border-gray-300 flex justify-between items-start group shadow-sm">
                            <div className="flex-1 pr-2 min-w-0">
                                <div className="text-xs font-bold text-gray-800 leading-tight mb-1 break-words">{item.name}</div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-mono bg-gray-50 text-gray-500 px-1 rounded">{item.sku}</span>
                                    <span className="text-[9px] text-gray-400">@ {item.appliedPrice.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                                <div className="text-xs font-bold text-masuma-dark">{(item.appliedPrice * item.qty).toLocaleString()}</div>
                                <div className="flex items-center border border-gray-200 rounded bg-gray-50">
                                    <button onClick={() => updateQty(item.id, -1)} className="px-1.5 hover:bg-gray-200 text-gray-500"><Minus size={10} /></button>
                                    <span className="text-[10px] font-bold w-5 text-center bg-white">{item.qty}</span>
                                    <button onClick={() => updateQty(item.id, 1)} className="px-1.5 hover:bg-gray-200 text-gray-500"><Plus size={10} /></button>
                                </div>
                                <button 
                                    onClick={() => removeFromCart(item.id)} 
                                    className="text-gray-300 hover:text-red-500 transition mt-1"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {cart.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-300">
                            <Search size={32} className="mb-2 opacity-50" />
                            <p className="text-xs font-bold uppercase">Cart Empty</p>
                        </div>
                    )}
                </div>

                {/* Footer Controls - Compact */}
                <div className="p-3 border-t border-gray-200 bg-gray-50 space-y-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                    
                    {/* Discount */}
                    <div className="flex items-center gap-2 bg-white p-1.5 rounded border border-gray-200">
                        <Tag size={12} className="text-gray-400 ml-1" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Disc:</span>
                        <input 
                            type="number" 
                            className="w-full text-xs outline-none bg-transparent"
                            placeholder="0"
                            value={discountValue}
                            onChange={e => setDiscountValue(e.target.value)}
                        />
                        <div className="flex border-l pl-1 gap-1">
                            <button onClick={() => setDiscountType('PERCENTAGE')} className={`text-[9px] px-1 rounded ${discountType === 'PERCENTAGE' ? 'bg-masuma-dark text-white' : 'text-gray-400'}`}>%</button>
                            <button onClick={() => setDiscountType('FIXED')} className={`text-[9px] px-1 rounded ${discountType === 'FIXED' ? 'bg-masuma-dark text-white' : 'text-gray-400'}`}>KES</button>
                        </div>
                    </div>

                    {/* Compact Totals */}
                    <div className="flex justify-between items-end border-b border-gray-200 pb-2">
                        <div className="text-[10px] text-gray-500">
                            <div>Subtotal: {subTotal.toLocaleString()}</div>
                            {discountAmount > 0 && <div className="text-red-500">Discount: -{discountAmount.toLocaleString()}</div>}
                            <div className="text-masuma-dark font-bold">VAT (16%): {taxAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] text-gray-500 font-bold uppercase mr-2">Payable</span>
                            <span className="text-xl font-bold text-masuma-dark tracking-tight">KES {finalTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    {/* Payment Types - Small Buttons */}
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => setPaymentMethod('CASH')} className={`py-1.5 border rounded flex flex-col items-center justify-center transition ${paymentMethod === 'CASH' ? 'bg-masuma-dark text-white border-masuma-dark' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                            <span className="text-[10px] font-bold uppercase">Cash</span>
                        </button>
                        <button onClick={() => setPaymentMethod('MPESA')} className={`py-1.5 border rounded flex flex-col items-center justify-center transition ${paymentMethod === 'MPESA' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                            <span className="text-[10px] font-bold uppercase">M-Pesa</span>
                        </button>
                        <button onClick={() => setPaymentMethod('CHEQUE')} className={`py-1.5 border rounded flex flex-col items-center justify-center transition ${paymentMethod === 'CHEQUE' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                            <span className="text-[10px] font-bold uppercase">Cheque</span>
                        </button>
                    </div>

                    {/* Conditional Inputs */}
                    {paymentMethod === 'MPESA' && (
                        <div className="flex gap-1 animate-fade-in">
                            <input type="tel" value={mpesaPhone} onChange={e => setMpesaPhone(e.target.value)} placeholder="07..." className="flex-1 p-1.5 border rounded text-xs outline-none" />
                            <input type="text" value={paymentReference} onChange={e => setPaymentReference(e.target.value.toUpperCase())} placeholder="Ref Code" className="w-20 p-1.5 border rounded text-xs outline-none uppercase" />
                            <button onClick={handleInitiateStkPush} disabled={isProcessing || cart.length === 0} className="bg-green-600 text-white px-2 rounded hover:bg-green-700 disabled:opacity-50"><Send size={12}/></button>
                        </div>
                    )}
                    {paymentMethod === 'CHEQUE' && (
                        <input type="text" value={paymentReference} onChange={e => setPaymentReference(e.target.value.toUpperCase())} placeholder="Cheque Number" className="w-full p-1.5 border rounded text-xs outline-none uppercase animate-fade-in" />
                    )}

                    {/* Complete Sale Button */}
                    <button 
                        onClick={handleCompleteSale}
                        disabled={cart.length === 0 || isProcessing}
                        className="w-full flex items-center justify-center gap-2 bg-masuma-orange text-white py-3 rounded font-bold hover:bg-orange-600 uppercase tracking-widest shadow disabled:opacity-50 transition-all text-xs"
                    >
                        {isProcessing ? 'Processing...' : <><Printer size={16} /> Complete Sale</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PosTerminal;
