import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Ticket, Calendar, CheckCircle, XCircle, Loader2, RefreshCw, Save, Percent, DollarSign } from 'lucide-react';
import { apiClient } from '../../utils/apiClient';
import { PromoCode } from '../../types';

const PromoManager: React.FC = () => {
    const [promos, setPromos] = useState<PromoCode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({
        code: '',
        type: 'PERCENTAGE',
        value: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        usageLimit: '100',
        isActive: true
    });

    const fetchPromos = async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get('/promo');
            setPromos(res.data);
        } catch (e) {
            console.error(e);
            setPromos([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPromos();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await apiClient.post('/promo', {
                ...formData,
                value: parseFloat(formData.value as string),
                usageLimit: parseInt(formData.usageLimit as string)
            });
            setIsCreating(false);
            fetchPromos();
        } catch (e) {
            alert('Failed to create promo');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this promo code?')) return;
        try {
            await apiClient.delete(`/promo/${id}`);
            fetchPromos();
        } catch (e) {
            alert('Delete failed');
        }
    };

    const isExpired = (endDate: string) => new Date(endDate) < new Date();

    return (
        <div className="h-full flex flex-col font-sans">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-masuma-dark font-display uppercase tracking-tight">Campaign Manager</h2>
                    <p className="text-sm text-gray-500">Generate discount codes and schedule sales events.</p>
                </div>
                <button 
                    onClick={() => setIsCreating(!isCreating)}
                    className="bg-masuma-orange text-white px-6 py-3 rounded font-bold uppercase text-xs flex items-center gap-2 hover:bg-masuma-dark transition shadow-lg"
                >
                    {isCreating ? 'Cancel' : <><Plus size={16}/> New Code</>}
                </button>
            </div>

            {isCreating && (
                <div className="bg-white p-8 rounded-lg shadow-xl border border-gray-200 mb-8 animate-slide-up">
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-400">Promo Code</label>
                            <input required type="text" className="w-full p-3 border rounded focus:border-masuma-orange outline-none font-mono uppercase" placeholder="e.g. MASUMA10" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-400">Discount Type</label>
                            <select className="w-full p-3 border rounded bg-white outline-none" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                                <option value="PERCENTAGE">Percentage (%)</option>
                                <option value="FIXED">Fixed Amount (KES)</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-400">Value</label>
                            <input required type="number" className="w-full p-3 border rounded focus:border-masuma-orange outline-none" placeholder="10" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-400">Usage Limit</label>
                            <input required type="number" className="w-full p-3 border rounded focus:border-masuma-orange outline-none" placeholder="100" value={formData.usageLimit} onChange={e => setFormData({...formData, usageLimit: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-400">Start Date</label>
                            <input required type="date" className="w-full p-3 border rounded focus:border-masuma-orange outline-none" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-400">Expiry Date</label>
                            <input required type="date" className="w-full p-3 border rounded focus:border-masuma-orange outline-none" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                        </div>
                        <div className="lg:col-span-2 flex gap-4">
                            <button type="submit" className="flex-1 bg-masuma-dark text-white py-3 rounded font-bold uppercase text-xs flex items-center justify-center gap-2 hover:bg-masuma-orange transition shadow-md">
                                <Save size={16} /> Save Campaign
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-masuma-orange" /></div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b">
                                <tr>
                                    <th className="px-6 py-4">Code</th>
                                    <th className="px-6 py-4">Value</th>
                                    <th className="px-6 py-4">Active Period</th>
                                    <th className="px-6 py-4">Usage</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {promos.map(promo => (
                                    <tr key={promo.id} className="hover:bg-gray-50 group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Ticket size={16} className="text-masuma-orange" />
                                                <span className="font-mono font-bold text-masuma-dark text-lg">{promo.code}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-bold flex items-center gap-1">
                                                {promo.type === 'PERCENTAGE' ? <><Percent size={14}/> {promo.value}%</> : <><DollarSign size={14}/> {promo.value.toLocaleString()}</>}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-gray-500 flex flex-col">
                                                <span className="flex items-center gap-1"><Calendar size={12}/> {promo.startDate}</span>
                                                <span className="text-gray-300">to</span>
                                                <span className={`flex items-center gap-1 ${isExpired(promo.endDate) ? 'text-red-500 font-bold' : ''}`}><Calendar size={12}/> {promo.endDate}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="w-full max-w-[100px]">
                                                <div className="flex justify-between text-[9px] font-bold text-gray-400 mb-1">
                                                    <span>{promo.currentUsage} used</span>
                                                    <span>{promo.usageLimit}</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                                    <div className={`h-full transition-all ${promo.currentUsage >= promo.usageLimit ? 'bg-red-500' : 'bg-masuma-orange'}`} style={{ width: `${(promo.currentUsage / promo.usageLimit) * 100}%` }}></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {isExpired(promo.endDate) ? (
                                                <span className="text-red-600 bg-red-50 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 w-fit"><XCircle size={12}/> Expired</span>
                                            ) : promo.currentUsage >= promo.usageLimit ? (
                                                <span className="text-red-600 bg-red-50 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 w-fit"><XCircle size={12}/> Depleted</span>
                                            ) : (
                                                <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 w-fit"><CheckCircle size={12}/> Active</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => handleDelete(promo.id)} className="p-2 text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {promos.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-gray-400 italic">No promotional campaigns configured.</td></tr>}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PromoManager;