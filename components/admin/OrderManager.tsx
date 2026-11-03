import React, { useState, useEffect } from 'react';
import { Search, Eye, CheckCircle, Clock, Truck, Loader2, RefreshCw, XCircle, DollarSign, CreditCard, Banknote, Smartphone, FileText } from 'lucide-react';
import { Order } from '../../types';
import { apiClient } from '../../utils/apiClient';
import OrderDetailsModal from './OrderDetailsModal';

const OrderManager: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    
    // Payment Modal State
    const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [paymentRef, setPaymentRef] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');

    const openPaymentModal = (order: Order) => {
        setPaymentOrder(order);
        const bal = order.balance !== undefined ? Number(order.balance) : Math.max(0, Number(order.total) - Number(order.amountPaid || 0));
        setPaymentAmount(bal);
        setPaymentMethod('CASH');
        setPaymentRef('');
        setPaymentNotes('');
    };

    const fetchOrders = async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get('/orders');
            setOrders(res.data);
        } catch (error) {
            console.error("Fetch orders failed", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const updateStatus = async (id: string, status: string) => {
        if (!confirm(`Are you sure you want to mark this order as ${status}?`)) return;
        setProcessingId(id);
        try {
            await apiClient.patch(`/orders/${id}/status`, { status });
            fetchOrders();
        } catch (error) {
            alert('Failed to update status');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReceivePayment = async () => {
        if (!paymentOrder) return;
        if (!paymentAmount || paymentAmount <= 0) {
            alert('Please enter a valid payment amount greater than 0.');
            return;
        }

        const maxBalance = paymentOrder.balance !== undefined ? Number(paymentOrder.balance) : Math.max(0, Number(paymentOrder.total) - Number(paymentOrder.amountPaid || 0));
        if (paymentAmount > maxBalance + 0.01) {
            alert(`Payment amount (KES ${paymentAmount.toLocaleString()}) cannot exceed the remaining balance (KES ${maxBalance.toLocaleString()}).`);
            return;
        }

        setProcessingId(paymentOrder.id);
        try {
            const res = await apiClient.post(`/orders/${paymentOrder.id}/payments`, {
                amount: paymentAmount,
                method: paymentMethod,
                reference: paymentRef,
                notes: paymentNotes
            });

            alert(res.data?.message || 'Payment recorded successfully!');
            setPaymentOrder(null);
            fetchOrders();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Payment processing failed');
        } finally {
            setProcessingId(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING': return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 w-fit"><Clock size={12} /> Unpaid Invoice</span>;
            case 'PARTIALLY_PAID': return <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 w-fit"><Clock size={12} /> Partially Paid</span>;
            case 'PAID': return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 w-fit"><CheckCircle size={12} /> Paid in Full</span>;
            case 'SHIPPED': return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 w-fit"><Truck size={12} /> Shipped</span>;
            case 'DELIVERED': return <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 w-fit"><CheckCircle size={12} /> Delivered</span>;
            case 'FAILED': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 w-fit"><XCircle size={12} /> Failed</span>;
            case 'CANCELLED': return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 w-fit"><XCircle size={12} /> Cancelled</span>;
            default: return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-[10px] font-bold uppercase">{status}</span>;
        }
    };

    const filteredOrders = orders.filter(order => {
        const matchesStatus = filterStatus === 'All' || order.status === filterStatus;
        const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              order.customerName.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    return (
        <div>
            <OrderDetailsModal 
                order={selectedOrder} 
                isOpen={!!selectedOrder} 
                onClose={() => setSelectedOrder(null)} 
                onUpdateStatus={updateStatus} 
            />

            {/* Payment Modal */}
            {paymentOrder && (() => {
                const total = Number(paymentOrder.total || 0);
                const paid = Number(paymentOrder.amountPaid || 0);
                const bal = paymentOrder.balance !== undefined ? Number(paymentOrder.balance) : Math.max(0, total - paid);

                return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
                        <div className="bg-masuma-dark text-white p-4 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold uppercase flex items-center gap-2 text-sm tracking-wide">
                                    <DollarSign size={18} className="text-green-400" /> Record Invoice Payment
                                </h3>
                                <p className="text-xs text-gray-300">Invoice #{paymentOrder.orderNumber} • {paymentOrder.customerName}</p>
                            </div>
                            <button onClick={() => setPaymentOrder(null)} className="text-gray-400 hover:text-white transition">
                                <XCircle size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            {/* Financial Breakdown Card */}
                            <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-5">
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase font-bold">Total Invoice</p>
                                        <p className="text-sm font-bold text-gray-900">KES {total.toLocaleString()}</p>
                                    </div>
                                    <div className="border-x border-gray-200 px-1">
                                        <p className="text-[10px] text-gray-500 uppercase font-bold">Already Paid</p>
                                        <p className="text-sm font-bold text-green-600">KES {paid.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase font-bold">Balance Due</p>
                                        <p className="text-sm font-bold text-masuma-orange">KES {bal.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                {/* Amount Input & Quick buttons */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-xs font-bold text-gray-700 uppercase">Payment Amount (KES)</label>
                                        <span className="text-[11px] text-gray-500">Max: KES {bal.toLocaleString()}</span>
                                    </div>
                                    <input 
                                        type="number"
                                        min="1"
                                        max={bal}
                                        value={paymentAmount}
                                        onChange={e => setPaymentAmount(Number(e.target.value))}
                                        className="w-full p-2.5 border border-gray-300 rounded focus:border-green-500 outline-none text-lg font-mono font-bold text-gray-900"
                                        placeholder={`Up to ${bal}`}
                                    />
                                    <div className="flex gap-2 mt-1.5">
                                        <button 
                                            type="button"
                                            onClick={() => setPaymentAmount(bal)}
                                            className="text-[11px] px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-bold uppercase transition"
                                        >
                                            Full Balance (KES {bal.toLocaleString()})
                                        </button>
                                        {bal > 2000 && (
                                            <button 
                                                type="button"
                                                onClick={() => setPaymentAmount(Math.round(bal / 2))}
                                                className="text-[11px] px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-bold uppercase transition"
                                            >
                                                50% (KES {Math.round(bal / 2).toLocaleString()})
                                            </button>
                                        )}
                                    </div>
                                    {paymentAmount === bal && bal > 0 && (
                                        <p className="text-[11px] text-green-700 mt-1 font-semibold flex items-center gap-1">
                                            <CheckCircle size={12} /> This will settle the invoice in full and generate an official receipt.
                                        </p>
                                    )}
                                    {paymentAmount > 0 && paymentAmount < bal && (
                                        <p className="text-[11px] text-amber-700 mt-1 font-semibold">
                                            Partial installment: remaining balance will be KES {(bal - paymentAmount).toLocaleString()}.
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Payment Method</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {['CASH', 'MPESA', 'BANK', 'CHEQUE'].map(m => (
                                            <button 
                                                key={m}
                                                type="button"
                                                onClick={() => setPaymentMethod(m)}
                                                className={`p-2 border rounded text-xs font-bold uppercase transition ${
                                                    paymentMethod === m ? 'bg-masuma-dark text-white border-masuma-dark shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50'
                                                }`}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                
                                {paymentMethod !== 'CASH' && (
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1">
                                            {paymentMethod === 'MPESA' ? 'M-PESA Confirmation Code' : paymentMethod === 'CHEQUE' ? 'Cheque Number' : 'Bank Reference Number'}
                                        </label>
                                        <input 
                                            type="text" 
                                            value={paymentRef} 
                                            onChange={e => setPaymentRef(e.target.value)}
                                            className="w-full p-2 border rounded focus:border-green-500 outline-none uppercase font-mono text-sm"
                                            placeholder={paymentMethod === 'MPESA' ? 'e.g. QKH4891...' : 'Reference / Check #'}
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Notes / Description (Optional)</label>
                                    <input 
                                        type="text" 
                                        value={paymentNotes} 
                                        onChange={e => setPaymentNotes(e.target.value)}
                                        className="w-full p-2 border rounded focus:border-green-500 outline-none text-xs"
                                        placeholder="e.g. Installment 1 of 2, verified via NCBA"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                                <button 
                                    type="button"
                                    onClick={() => setPaymentOrder(null)} 
                                    className="flex-1 py-2.5 border rounded font-bold text-xs uppercase hover:bg-gray-50 text-gray-700"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button"
                                    onClick={handleReceivePayment}
                                    disabled={!!processingId || paymentAmount <= 0}
                                    className="flex-1 py-2.5 bg-green-600 text-white rounded font-bold text-xs uppercase hover:bg-green-700 flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-50"
                                >
                                    {processingId ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle size={16}/>}
                                    Confirm Payment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                );
            })()}

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-masuma-dark font-display uppercase">Order & Invoice Manager</h2>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                         <span>Unpaid Invoices: <strong className="text-yellow-700">{orders.filter(o => o.status === 'PENDING').length}</strong></span>
                         <span>Partially Paid: <strong className="text-amber-700">{orders.filter(o => o.status === 'PARTIALLY_PAID').length}</strong></span>
                         <span>Fully Settled: <strong className="text-green-700">{orders.filter(o => o.status === 'PAID').length}</strong></span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchOrders} className="p-2 bg-white border border-gray-300 rounded hover:bg-gray-50" title="Refresh">
                         <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-gray-200 flex gap-4 items-center bg-gray-50">
                     <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded outline-none focus:border-masuma-orange bg-white" 
                            placeholder="Search Invoice #, Customer Name..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                     </div>
                     <select 
                        className="p-2 border border-gray-300 rounded bg-white text-sm font-bold text-gray-600 outline-none"
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                     >
                        <option value="All">All Invoices & Orders</option>
                        <option value="PENDING">Unpaid Invoices</option>
                        <option value="PARTIALLY_PAID">Partially Paid</option>
                        <option value="PAID">Paid in Full</option>
                        <option value="SHIPPED">Dispatched</option>
                        <option value="DELIVERED">Delivered</option>
                     </select>
                </div>

                <div className="overflow-x-auto">
                    {isLoading ? (
                         <div className="flex justify-center items-center h-64">
                            <Loader2 className="animate-spin text-masuma-orange" size={32} />
                         </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-white text-gray-500 uppercase font-bold text-xs border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4">Invoice #</th>
                                    <th className="px-6 py-4">Customer</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4 text-right">Total (KES)</th>
                                    <th className="px-6 py-4 text-right">Paid (KES)</th>
                                    <th className="px-6 py-4 text-right">Balance (KES)</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {filteredOrders.map(order => {
                                    const total = Number(order.total || 0);
                                    const paid = Number(order.amountPaid || 0);
                                    const bal = order.balance !== undefined ? Number(order.balance) : Math.max(0, total - paid);

                                    return (
                                    <tr key={order.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedOrder(order)}>
                                        <td className="px-6 py-4 font-mono font-bold text-masuma-dark">{order.orderNumber}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-sm text-gray-800">{order.customerName}</div>
                                            <div className="text-xs text-gray-500">{order.items?.length || 0} items</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">{order.date}</td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900 font-mono">{total.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right font-bold text-green-600 font-mono">{paid.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right font-bold font-mono">
                                            {bal > 0 ? (
                                                <span className="text-masuma-orange">KES {bal.toLocaleString()}</span>
                                            ) : (
                                                <span className="text-gray-400">0.00</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                {bal > 0 && (
                                                    <button 
                                                        onClick={() => openPaymentModal(order)}
                                                        className="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded text-xs font-bold uppercase flex items-center gap-1 border border-green-200 transition"
                                                        title="Record Payment / Installment"
                                                    >
                                                        <DollarSign size={12} /> Pay
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => setSelectedOrder(order)}
                                                    className="p-1 text-gray-400 hover:text-masuma-orange transition" 
                                                    title="View Invoice & Details"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })}
                                {filteredOrders.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="text-center py-8 text-gray-500">No invoices or orders found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderManager;