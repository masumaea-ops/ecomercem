import React, { useState, useEffect } from 'react';
import { RefreshCcw, CheckCircle, XCircle, Clock, Search, Eye, Loader2, MessageSquare } from 'lucide-react';
import { apiClient } from '../../utils/apiClient';

const ReturnManager: React.FC = () => {
    const [returns, setReturns] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedReturn, setSelectedReturn] = useState<any>(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchReturns = async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get('/returns');
            setReturns(res.data);
        } catch (error) {
            console.error('Failed to fetch returns');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchReturns();
    }, []);

    const handleUpdateStatus = async (id: string, status: string) => {
        setIsUpdating(true);
        try {
            await apiClient.patch(`/returns/${id}/status`, { status, adminNotes });
            fetchReturns();
            setSelectedReturn(null);
            setAdminNotes('');
        } catch (error) {
            alert('Failed to update return status');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-masuma-dark font-display uppercase">Returns & Claims Management</h2>
                    <p className="text-sm text-gray-500">Review and process B2B return requests, exchanges, and refunds.</p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="animate-spin text-masuma-orange" size={32} />
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white text-gray-500 uppercase font-bold text-xs border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4">RMA / Order</th>
                                <th className="px-6 py-4">Customer / Business</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {returns.map(ret => (
                                <tr key={ret.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="font-mono font-bold text-masuma-orange">{ret.rmaNumber}</div>
                                        <div className="text-[10px] text-gray-400">Order: {ret.order?.orderNumber}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-masuma-dark">{ret.user?.fullName}</div>
                                        <div className="text-xs text-masuma-orange font-bold uppercase">{ret.user?.businessName}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[10px] font-bold uppercase bg-gray-100 px-2 py-1 rounded">{ret.type}</span>
                                    </td>
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
                                    <td className="px-6 py-4 text-gray-500 text-xs">
                                        {new Date(ret.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => setSelectedReturn(ret)}
                                            className="p-2 text-gray-400 hover:text-masuma-orange transition"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Detail Modal */}
            {selectedReturn && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden animate-slide-up">
                        <div className="bg-masuma-dark p-6 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold uppercase tracking-tighter">Return Details: {selectedReturn.rmaNumber}</h3>
                                <p className="text-xs text-gray-400">Customer: {selectedReturn.user?.fullName} ({selectedReturn.user?.businessName})</p>
                            </div>
                            <button onClick={() => setSelectedReturn(null)} className="text-gray-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="text-[10px] font-black uppercase text-gray-400 mb-4 tracking-widest">Returned Items</h4>
                                <div className="space-y-4">
                                    {selectedReturn.items?.map((item: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                                            <div>
                                                <div className="font-bold text-sm">{item.product?.sku}</div>
                                                <div className="text-[10px] text-gray-500">{item.product?.name}</div>
                                                <div className="text-[10px] font-bold text-masuma-orange uppercase mt-1">Condition: {item.condition}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-mono font-bold">x{item.quantity}</div>
                                                <div className="text-[10px] text-gray-400">KES {Number(item.priceAtPurchase).toLocaleString()} ea</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-6 p-4 bg-orange-50 rounded border border-orange-100">
                                    <h5 className="text-[10px] font-black uppercase text-orange-700 mb-1">Customer Reason</h5>
                                    <p className="text-sm text-gray-700 italic">"{selectedReturn.reason}"</p>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-[10px] font-black uppercase text-gray-400 mb-4 tracking-widest">Process Claim</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Admin Notes / Internal Feedback</label>
                                        <textarea 
                                            value={adminNotes}
                                            onChange={e => setAdminNotes(e.target.value)}
                                            className="w-full p-3 border rounded text-sm outline-none focus:border-masuma-orange h-32 resize-none"
                                            placeholder="Enter notes for the customer or internal records..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button 
                                            onClick={() => handleUpdateStatus(selectedReturn.id, 'APPROVED')}
                                            disabled={isUpdating}
                                            className="bg-blue-600 text-white py-3 rounded font-bold uppercase text-[10px] hover:bg-blue-700 transition flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle size={14} /> Approve
                                        </button>
                                        <button 
                                            onClick={() => handleUpdateStatus(selectedReturn.id, 'REJECTED')}
                                            disabled={isUpdating}
                                            className="bg-red-600 text-white py-3 rounded font-bold uppercase text-[10px] hover:bg-red-700 transition flex items-center justify-center gap-2"
                                        >
                                            <XCircle size={14} /> Reject
                                        </button>
                                        <button 
                                            onClick={() => handleUpdateStatus(selectedReturn.id, 'RECEIVED')}
                                            disabled={isUpdating}
                                            className="bg-yellow-600 text-white py-3 rounded font-bold uppercase text-[10px] hover:bg-yellow-700 transition flex items-center justify-center gap-2"
                                        >
                                            <Package size={14} /> Received
                                        </button>
                                        <button 
                                            onClick={() => handleUpdateStatus(selectedReturn.id, 'COMPLETED')}
                                            disabled={isUpdating}
                                            className="bg-green-600 text-white py-3 rounded font-bold uppercase text-[10px] hover:bg-green-700 transition flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle size={14} /> Complete
                                        </button>
                                    </div>
                                </div>
                            </div>
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

const Package: React.FC<{size?: number, className?: string}> = ({size=24, className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16.5 9.4 7.5 4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/></svg>
);

export default ReturnManager;
