
import React, { useState, useEffect, useRef } from 'react';
import { Package, ShoppingCart, Upload, FileText, Plus, Trash2, Download, Loader2, CheckCircle, AlertCircle, History, RefreshCcw, ChevronRight, Search } from 'lucide-react';
import { apiClient } from '../../utils/apiClient';
import Papa from 'papaparse';

type Tab = 'ORDER' | 'HISTORY' | 'RETURNS';

const B2BPortal: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('ORDER');
    const [orderItems, setOrderItems] = useState<{sku: string, qty: string | number}[]>([{ sku: '', qty: 1 }]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [userDiscount, setUserDiscount] = useState(15);
    const [orders, setOrders] = useState<any[]>([]);
    const [returns, setReturns] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Return Request State
    const [isReturning, setIsReturning] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [returnReason, setReturnReason] = useState('');
    const [returnType, setReturnType] = useState('REFUND');
    const [returnItems, setReturnItems] = useState<any[]>([]);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const res = await apiClient.get('/auth/me');
                if (res.data.discountPercentage !== undefined) {
                    setUserDiscount(res.data.discountPercentage);
                }
            } catch (e) {
                console.error('Failed to fetch user discount');
            }
        };
        fetchUserData();
    }, []);

    useEffect(() => {
        if (activeTab === 'HISTORY') fetchOrders();
        if (activeTab === 'RETURNS') fetchReturns();
    }, [activeTab]);

    const fetchOrders = async () => {
        setIsLoadingData(true);
        try {
            const res = await apiClient.get('/orders');
            // Filter orders for this user if not admin
            const userStr = localStorage.getItem('masuma_user');
            const user = userStr ? JSON.parse(userStr) : null;
            const filtered = res.data.filter((o: any) => o.customerEmail === user?.email);
            setOrders(filtered);
        } catch (e) {
            console.error('Failed to fetch orders');
        } finally {
            setIsLoadingData(false);
        }
    };

    const fetchReturns = async () => {
        setIsLoadingData(true);
        try {
            const res = await apiClient.get('/returns/my');
            setReturns(res.data);
        } catch (e) {
            console.error('Failed to fetch returns');
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleAddItem = () => {
        setOrderItems([...orderItems, { sku: '', qty: 1 }]);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...orderItems];
        newItems.splice(index, 1);
        setOrderItems(newItems.length > 0 ? newItems : [{ sku: '', qty: 1 }]);
    };

    const updateItem = (index: number, field: 'sku' | 'qty', value: string | number) => {
        const newItems = [...orderItems];
        if (field === 'qty') newItems[index].qty = value;
        else newItems[index].sku = String(value).toUpperCase();
        setOrderItems(newItems);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const importedItems = results.data.map((row: any) => ({
                    sku: String(row.sku || row.SKU || row.part_number || '').trim().toUpperCase(),
                    qty: Number(row.qty || row.QTY || row.quantity || 1)
                })).filter((item: any) => item.sku);

                if (importedItems.length > 0) {
                    setOrderItems(importedItems);
                    setSuccessMessage(`Imported ${importedItems.length} items from CSV.`);
                    setTimeout(() => setSuccessMessage(''), 5000);
                } else {
                    setErrorMessage('No valid items found in CSV. Ensure columns are named "sku" and "qty".');
                }
            },
            error: () => {
                setErrorMessage('Failed to parse CSV file.');
            }
        });
        
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDownloadPriceList = async () => {
        try {
            const res = await apiClient.get('/products');
            const products = res.data.data || res.data || [];
            
            const csvData = products.map((p: any) => {
                const retailExcl = Number(p.price);
                const wholesaleExcl = retailExcl * (1 - userDiscount / 100);
                return {
                    SKU: p.sku,
                    Name: p.name,
                    Category: p.category?.name || 'General',
                    Retail_Price_Excl_VAT: retailExcl.toFixed(2),
                    Retail_Price_Incl_VAT: (retailExcl * 1.16).toFixed(2),
                    Your_Wholesale_Excl_VAT: wholesaleExcl.toFixed(2),
                    Your_Wholesale_Incl_VAT: (wholesaleExcl * 1.16).toFixed(2),
                    VAT_Rate: '16%'
                };
            });

            const csv = Papa.unparse(csvData);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `Masuma_PriceList_Distributor.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            alert('Failed to download price list');
        }
    };

    const handlePlaceOrder = async () => {
        const validItems = orderItems
            .map(i => ({ sku: i.sku, qty: Number(i.qty) || 0 }))
            .filter(i => i.sku && i.qty > 0);

        if (validItems.length === 0) return setErrorMessage("Please add at least one valid item.");

        setIsSubmitting(true);
        setErrorMessage('');
        try {
            const payloadItems = [];
            const failedSkus = [];

            for (const item of validItems) {
                try {
                    const res = await apiClient.get(`/products?q=${item.sku}`);
                    const products = res.data.data || res.data || [];
                    const product = products.find((p: any) => p.sku === item.sku);
                    
                    if (product) {
                        payloadItems.push({
                            productId: product.id,
                            quantity: item.qty,
                            price: product.price * (1 - userDiscount / 100)
                        });
                    } else {
                        failedSkus.push(item.sku);
                    }
                } catch (e) {
                    failedSkus.push(item.sku);
                }
            }

            if (failedSkus.length > 0) {
                setErrorMessage(`The following SKUs were not found: ${failedSkus.join(', ')}`);
                setIsSubmitting(false);
                return;
            }

            const userStr = localStorage.getItem('masuma_user');
            const user = userStr ? JSON.parse(userStr) : null;

            await apiClient.post('/orders', {
                customerName: user?.name || 'Wholesale Partner',
                customerEmail: user?.email,
                customerPhone: user?.phone || '0700000000',
                items: payloadItems,
                paymentMethod: 'B2B_CREDIT'
            });

            setSuccessMessage('Bulk order placed successfully!');
            setOrderItems([{ sku: '', qty: 1 }]);
            setTimeout(() => setSuccessMessage(''), 8000);

        } catch (error: any) {
            setErrorMessage(error.message || 'Failed to place order.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const initiateReturn = (order: any) => {
        setSelectedOrder(order);
        setReturnItems(order.items.map((item: any) => ({
            productId: item.product.id,
            sku: item.product.sku,
            name: item.product.name,
            maxQty: item.quantity,
            quantity: 0,
            condition: 'GOOD'
        })));
        setIsReturning(true);
    };

    const submitReturn = async () => {
        const itemsToReturn = returnItems.filter(i => i.quantity > 0);
        if (itemsToReturn.length === 0) return alert('Please select at least one item to return');
        if (!returnReason) return alert('Please provide a reason for return');

        setIsSubmitting(true);
        try {
            await apiClient.post('/returns', {
                orderId: selectedOrder.id,
                type: returnType,
                reason: returnReason,
                items: itemsToReturn.map(i => ({
                    productId: i.productId,
                    quantity: i.quantity,
                    condition: i.condition
                }))
            });
            setSuccessMessage('Return request submitted successfully. Our team will review it.');
            setIsReturning(false);
            setActiveTab('RETURNS');
        } catch (e: any) {
            alert(e.response?.data?.error || 'Failed to submit return');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-masuma-dark font-display uppercase">B2B Wholesale Portal</h2>
                    <p className="text-sm text-gray-500">Manage bulk orders, history, and returns with <span className="text-masuma-orange font-bold">{userDiscount}% discount</span>.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button 
                        onClick={() => setActiveTab('ORDER')}
                        className={`flex-1 md:flex-none px-4 py-2 rounded font-bold uppercase text-[10px] flex items-center justify-center gap-2 transition ${activeTab === 'ORDER' ? 'bg-masuma-dark text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                    >
                        <ShoppingCart size={14} /> New Order
                    </button>
                    <button 
                        onClick={() => setActiveTab('HISTORY')}
                        className={`flex-1 md:flex-none px-4 py-2 rounded font-bold uppercase text-[10px] flex items-center justify-center gap-2 transition ${activeTab === 'HISTORY' ? 'bg-masuma-dark text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                    >
                        <History size={14} /> History
                    </button>
                    <button 
                        onClick={() => setActiveTab('RETURNS')}
                        className={`flex-1 md:flex-none px-4 py-2 rounded font-bold uppercase text-[10px] flex items-center justify-center gap-2 transition ${activeTab === 'RETURNS' ? 'bg-masuma-dark text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                    >
                        <RefreshCcw size={14} /> Returns
                    </button>
                </div>
            </div>

            {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4 flex items-center gap-2 animate-slide-up">
                    <CheckCircle size={20} className="shrink-0" /> 
                    <span className="text-sm font-bold">{successMessage}</span>
                </div>
            )}

            {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex items-center gap-2 animate-shake">
                    <AlertCircle size={20} className="shrink-0" /> 
                    <span className="text-sm font-bold">{errorMessage}</span>
                </div>
            )}

            {activeTab === 'ORDER' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
                    <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-masuma-dark uppercase text-xs tracking-widest">Quick Order Entry</h3>
                            <div className="flex gap-2">
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />
                                <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-bold uppercase flex items-center gap-1 text-gray-500 hover:text-masuma-orange transition">
                                    <Upload size={12} /> CSV
                                </button>
                                <button onClick={handleDownloadPriceList} className="text-[10px] font-bold uppercase flex items-center gap-1 text-gray-500 hover:text-masuma-orange transition">
                                    <Download size={12} /> Price List
                                </button>
                                <button onClick={handleAddItem} className="bg-masuma-orange text-white px-3 py-1 rounded font-bold text-[10px] uppercase flex items-center gap-1 hover:bg-masuma-dark transition">
                                    <Plus size={12} /> Add Row
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-0 flex-1 overflow-y-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="text-[10px] text-gray-400 font-black uppercase bg-gray-50/50 sticky top-0 z-10">
                                    <tr>
                                        <th className="py-3 px-4 border-b">Part Number (SKU)</th>
                                        <th className="py-3 px-4 border-b w-32 text-center">Quantity</th>
                                        <th className="py-3 px-4 border-b w-16"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {orderItems.map((item, index) => (
                                        <tr key={index} className="group hover:bg-gray-50/50 transition-colors">
                                            <td className="py-2 px-4">
                                                <input 
                                                    type="text" 
                                                    value={item.sku}
                                                    onChange={(e) => updateItem(index, 'sku', e.target.value)}
                                                    className="w-full p-2.5 border border-gray-200 rounded font-mono text-sm uppercase focus:border-masuma-orange outline-none transition"
                                                    placeholder="e.g. MFC-112"
                                                />
                                            </td>
                                            <td className="py-2 px-4">
                                                <input 
                                                    type="number" 
                                                    min="1"
                                                    value={item.qty}
                                                    onChange={(e) => updateItem(index, 'qty', e.target.value)}
                                                    className="w-full p-2.5 border border-gray-200 rounded text-center font-bold outline-none focus:border-masuma-orange transition"
                                                />
                                            </td>
                                            <td className="py-2 px-4 text-center">
                                                <button onClick={() => handleRemoveItem(index)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-masuma-dark text-white rounded-lg shadow-xl p-8 flex flex-col border-b-8 border-masuma-orange">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="bg-masuma-orange p-2 rounded">
                                <ShoppingCart size={24} className="text-white" />
                            </div>
                            <h3 className="font-bold text-xl uppercase tracking-tighter">Order Summary</h3>
                        </div>
                        
                        <div className="space-y-6 mb-auto">
                            <div className="flex justify-between items-end border-b border-gray-800 pb-4">
                                <span className="text-xs text-gray-400 uppercase font-bold">Total SKUs</span>
                                <span className="text-2xl font-mono">{orderItems.filter(i => i.sku).length}</span>
                            </div>
                            <div className="flex justify-between items-end border-b border-gray-800 pb-4">
                                <span className="text-xs text-gray-400 uppercase font-bold">Total Units</span>
                                <span className="text-2xl font-mono">
                                    {orderItems.reduce((acc, curr) => acc + (Number(curr.qty) || 0), 0)}
                                </span>
                            </div>
                            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                                <div className="flex justify-between text-masuma-orange font-black uppercase text-xs mb-1">
                                    <span>Distributor Discount</span>
                                    <span>{userDiscount}%</span>
                                </div>
                                <p className="text-[10px] text-gray-500 leading-tight">Your exclusive wholesale pricing will be applied to all verified parts in this order.</p>
                            </div>
                        </div>

                        <div className="mt-10">
                            <button 
                                onClick={handlePlaceOrder}
                                disabled={isSubmitting}
                                className="w-full bg-masuma-orange hover:bg-white hover:text-masuma-orange text-white font-black py-5 uppercase tracking-[0.2em] rounded shadow-2xl transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 group"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Package size={20} className="group-hover:scale-110 transition-transform" />}
                                {isSubmitting ? 'Verifying SKUs...' : 'Confirm Bulk Order'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'HISTORY' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-masuma-dark uppercase text-xs tracking-widest">Order History</h3>
                        <button onClick={fetchOrders} className="text-gray-400 hover:text-masuma-orange transition"><RefreshCcw size={16} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {isLoadingData ? (
                            <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-masuma-orange" /></div>
                        ) : orders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                <FileText size={48} className="mb-2 opacity-20" />
                                <p className="text-sm font-bold uppercase tracking-widest">No orders found</p>
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-3">Order #</th>
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3">Amount</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {orders.map(order => (
                                        <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-mono font-bold text-masuma-dark">{order.orderNumber}</td>
                                            <td className="px-6 py-4 text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 font-bold">KES {order.totalAmount.toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                                                    order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                                                    order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => initiateReturn(order)}
                                                    className="text-masuma-orange hover:text-masuma-dark font-bold text-[10px] uppercase flex items-center gap-1 ml-auto"
                                                >
                                                    Request Return <ChevronRight size={12} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'RETURNS' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-masuma-dark uppercase text-xs tracking-widest">Returns & Claims</h3>
                        <button onClick={fetchReturns} className="text-gray-400 hover:text-masuma-orange transition"><RefreshCcw size={16} /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {isLoadingData ? (
                            <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-masuma-orange" /></div>
                        ) : returns.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                                <RefreshCcw size={48} className="mb-2 opacity-20" />
                                <p className="text-sm font-bold uppercase tracking-widest">No return requests</p>
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-3">RMA #</th>
                                        <th className="px-6 py-3">Order #</th>
                                        <th className="px-6 py-3">Type</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {returns.map(ret => (
                                        <tr key={ret.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 font-mono font-bold text-masuma-orange">{ret.rmaNumber}</td>
                                            <td className="px-6 py-4 font-mono text-gray-500">{ret.order?.orderNumber}</td>
                                            <td className="px-6 py-4 font-bold text-[10px] uppercase">{ret.type}</td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
                                                    ret.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                    ret.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                                    ret.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                    'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {ret.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500">{new Date(ret.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* Return Modal */}
            {isReturning && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up">
                        <div className="bg-masuma-dark p-6 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold uppercase tracking-tighter">Request Return / Exchange</h3>
                                <p className="text-xs text-gray-400">Order: {selectedOrder?.orderNumber}</p>
                            </div>
                            <button onClick={() => setIsReturning(false)} className="text-gray-400 hover:text-white"><X size={24} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[70vh]">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Return Type</label>
                                    <select 
                                        value={returnType}
                                        onChange={e => setReturnType(e.target.value)}
                                        className="w-full p-2 border rounded font-bold text-sm outline-none focus:border-masuma-orange"
                                    >
                                        <option value="REFUND">Refund to Account</option>
                                        <option value="EXCHANGE">Exchange for Same Part</option>
                                        <option value="STORE_CREDIT">Store Credit</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Reason for Return</label>
                                    <input 
                                        type="text"
                                        placeholder="e.g. Damaged in transit, Wrong part"
                                        value={returnReason}
                                        onChange={e => setReturnReason(e.target.value)}
                                        className="w-full p-2 border rounded font-medium text-sm outline-none focus:border-masuma-orange"
                                    />
                                </div>
                            </div>

                            <table className="w-full text-left text-sm mb-6">
                                <thead className="text-[10px] font-black uppercase text-gray-400 border-b">
                                    <tr>
                                        <th className="py-2">Product</th>
                                        <th className="py-2 w-24 text-center">Qty to Return</th>
                                        <th className="py-2 w-32">Condition</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {returnItems.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="py-3">
                                                <div className="font-bold">{item.sku}</div>
                                                <div className="text-[10px] text-gray-500">{item.name}</div>
                                            </td>
                                            <td className="py-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    <input 
                                                        type="number"
                                                        min="0"
                                                        max={item.maxQty}
                                                        value={item.quantity}
                                                        onChange={e => {
                                                            const newItems = [...returnItems];
                                                            newItems[idx].quantity = Math.min(Number(e.target.value), item.maxQty);
                                                            setReturnItems(newItems);
                                                        }}
                                                        className="w-16 p-1 border rounded text-center font-bold"
                                                    />
                                                    <span className="text-[10px] text-gray-400">/ {item.maxQty}</span>
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <select 
                                                    value={item.condition}
                                                    onChange={e => {
                                                        const newItems = [...returnItems];
                                                        newItems[idx].condition = e.target.value;
                                                        setReturnItems(newItems);
                                                    }}
                                                    className="w-full p-1 border rounded text-[10px] font-bold"
                                                >
                                                    <option value="GOOD">Unopened</option>
                                                    <option value="OPENED">Opened Box</option>
                                                    <option value="DAMAGED">Damaged</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
                            <button onClick={() => setIsReturning(false)} className="px-6 py-2 text-xs font-bold uppercase text-gray-500 hover:text-masuma-dark">Cancel</button>
                            <button 
                                onClick={submitReturn}
                                disabled={isSubmitting}
                                className="bg-masuma-orange text-white px-8 py-2 rounded font-black uppercase text-xs tracking-widest hover:bg-masuma-dark transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : <RefreshCcw size={14} />}
                                Submit Claim
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const X: React.FC<{size?: number, className?: string}> = ({size=24, className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

export default B2BPortal;
