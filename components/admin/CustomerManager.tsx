import React, { useState, useEffect } from 'react';
import { Search, Edit2, Trash2, Plus, Loader2, RefreshCw, CheckCircle, XCircle, UserCheck, Ban } from 'lucide-react';
import { Customer } from '../../types';
import { apiClient, formatCurrency } from '../../utils/apiClient';

const CustomerManager: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    
    // CRM Dialog States
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // New Customer Form State
    const [newCustomer, setNewCustomer] = useState({
        name: '',
        phone: '',
        email: '',
        kraPin: '',
        isWholesale: false,
        address: ''
    });

    const fetchCustomers = async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get(`/customers?search=${searchTerm}`);
            setCustomers(res.data);
        } catch (error) {
            console.error('Failed to fetch customers', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => fetchCustomers(), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleCreate = async () => {
        setErrorMsg(null);
        try {
            if (!newCustomer.name?.trim()) throw new Error('Customer/Company Name is required');
            if (!newCustomer.phone?.trim()) throw new Error('Phone number is required');

            await apiClient.post('/customers', newCustomer);
            setIsCreating(false);
            setNewCustomer({ name: '', phone: '', email: '', kraPin: '', isWholesale: false, address: '' });
            setSuccessMsg('Client profile created successfully.');
            fetchCustomers();
            setTimeout(() => setSuccessMsg(null), 4000);
        } catch (error: any) {
            setErrorMsg(error.response?.data?.error || error.message || 'Failed to create customer profile');
        }
    };

    const handleUpdate = async () => {
        if (!editingCustomer) return;
        setErrorMsg(null);
        try {
            if (!editingCustomer.name?.trim()) throw new Error('Customer/Company Name is required');
            if (!editingCustomer.phone?.trim()) throw new Error('Phone number is required');

            await apiClient.patch(`/customers/${editingCustomer.id}`, {
                name: editingCustomer.name,
                phone: editingCustomer.phone,
                email: editingCustomer.email || '',
                kraPin: editingCustomer.kraPin || '',
                address: (editingCustomer as any).address || '',
                isWholesale: editingCustomer.isWholesale,
                status: editingCustomer.status
            });
            setSuccessMsg('Client profile successfully updated.');
            setEditingCustomer(null);
            fetchCustomers();
            setTimeout(() => setSuccessMsg(null), 4000);
        } catch (error: any) {
            console.error('Failed to update customer', error);
            setErrorMsg(error.response?.data?.error || error.message || 'Failed to update customer profile');
        }
    };

    const handleToggleStatus = async (customer: Customer, newStatus: 'APPROVED' | 'DISABLED' | 'PENDING_APPROVAL') => {
        setErrorMsg(null);
        try {
            await apiClient.patch(`/customers/${customer.id}`, { status: newStatus });
            setSuccessMsg(`Client status successfully changed to ${newStatus.replace('_', ' ')}.`);
            fetchCustomers();
            setTimeout(() => setSuccessMsg(null), 4000);
        } catch (error: any) {
            console.error('Failed to change customer status', error);
            setErrorMsg(error.response?.data?.error || 'Failed to update customer status');
        }
    };

    const handleDelete = async () => {
        if (!deletingCustomer) return;
        setErrorMsg(null);
        try {
            await apiClient.delete(`/customers/${deletingCustomer.id}`);
            setSuccessMsg('Client profile successfully deleted.');
            setDeletingCustomer(null);
            fetchCustomers();
            setTimeout(() => setSuccessMsg(null), 4000);
        } catch (error: any) {
            console.error('Failed to delete customer', error);
            setErrorMsg(error.response?.data?.error || 'Failed to delete customer profile');
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-masuma-dark font-display uppercase">Customer CRM</h2>
                    <p className="text-sm text-gray-500">Manage B2B/B2C clients, KRA PINs, and credit limits.</p>
                </div>
                <button 
                    onClick={() => {
                        setErrorMsg(null);
                        setIsCreating(!isCreating);
                    }}
                    className="bg-masuma-orange text-white px-4 py-2 rounded font-bold text-sm uppercase flex items-center gap-2 hover:bg-orange-600 transition shadow-md"
                >
                    <Plus size={16} /> {isCreating ? 'Cancel' : 'Add Customer'}
                </button>
            </div>

            {successMsg && (
                <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-100 flex items-center gap-3 mb-6 animate-slide-up">
                    <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
                    <span className="text-xs font-bold uppercase tracking-wider">{successMsg}</span>
                </div>
            )}

            {errorMsg && !editingCustomer && !deletingCustomer && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex items-center gap-3 mb-6 animate-slide-up">
                    <XCircle className="w-5 h-5 shrink-0 text-red-600" />
                    <span className="text-xs font-bold uppercase tracking-wider">{errorMsg}</span>
                </div>
            )}

            {isCreating && (
                <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 mb-6 animate-slide-up">
                    <h3 className="font-bold text-masuma-dark uppercase mb-4 border-b pb-2">New Client Registration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" placeholder="Full Name / Company Name" className="p-3 border rounded focus:border-masuma-orange outline-none" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
                        <input type="tel" placeholder="Phone Number" className="p-3 border rounded focus:border-masuma-orange outline-none" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
                        <input type="email" placeholder="Email Address" className="p-3 border rounded focus:border-masuma-orange outline-none" value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} />
                        <input type="text" placeholder="KRA PIN" className="p-3 border rounded focus:border-masuma-orange outline-none uppercase" value={newCustomer.kraPin} onChange={e => setNewCustomer({...newCustomer, kraPin: e.target.value})} />
                        <input type="text" placeholder="Physical Address" className="p-3 border rounded focus:border-masuma-orange outline-none md:col-span-2" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} />
                        
                        <div className="flex items-center gap-3 md:col-span-2 bg-gray-50 p-3 rounded">
                            <input 
                                type="checkbox" 
                                id="wholesale" 
                                className="w-5 h-5 text-masuma-orange cursor-pointer"
                                checked={newCustomer.isWholesale}
                                onChange={e => setNewCustomer({...newCustomer, isWholesale: e.target.checked})}
                            />
                            <label htmlFor="wholesale" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                                Enable Wholesale Pricing (B2B Account)
                            </label>
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button onClick={handleCreate} className="bg-masuma-dark text-white px-8 py-2.5 rounded font-bold uppercase hover:bg-gray-800 transition">Save Profile</button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded outline-none focus:border-masuma-orange bg-white" 
                            placeholder="Search Name, Phone, or KRA PIN..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button onClick={() => fetchCustomers()} className="p-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-500 transition">
                        <RefreshCw size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="animate-spin text-masuma-orange" size={32} />
                        </div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-white text-gray-500 uppercase font-bold text-xs border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4">Customer</th>
                                    <th className="px-6 py-4">Contact Info</th>
                                    <th className="px-6 py-4">Account Type</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Total Spend</th>
                                    <th className="px-6 py-4">Last Visit</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {customers.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${c.isWholesale ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
                                                    {c.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-gray-800 block">{c.name}</span>
                                                    {c.kraPin && (
                                                        <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100 uppercase tracking-wide mt-0.5 inline-block">
                                                            PIN: {c.kraPin}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-bold text-masuma-dark">{c.phone}</div>
                                            <div className="text-xs text-gray-500">{c.email || '-'}</div>
                                            {(c as any).address && (
                                                <div className="text-[10px] text-gray-400 mt-1 italic">Location: {(c as any).address}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {c.isWholesale ? (
                                                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Wholesale</span>
                                            ) : (
                                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">Retail</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {c.status === 'APPROVED' ? (
                                                <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider">Approved</span>
                                            ) : c.status === 'DISABLED' ? (
                                                <span className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider">Disabled</span>
                                            ) : (
                                                <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider">Pending</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-masuma-dark">
                                            {formatCurrency(c.totalSpend || 0)}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500">
                                            {c.lastVisit || 'Never'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-3 items-center">
                                                {c.status === 'PENDING_APPROVAL' && (
                                                    <button 
                                                        onClick={() => handleToggleStatus(c, 'APPROVED')}
                                                        className="p-1.5 bg-emerald-50 rounded text-emerald-600 hover:bg-emerald-100 transition"
                                                        title="Approve Customer"
                                                    >
                                                        <UserCheck size={15} />
                                                    </button>
                                                )}
                                                {c.status === 'APPROVED' && (
                                                    <button 
                                                        onClick={() => handleToggleStatus(c, 'DISABLED')}
                                                        className="p-1.5 bg-rose-50 rounded text-rose-600 hover:bg-rose-100 transition"
                                                        title="Disable Customer Profile"
                                                    >
                                                        <Ban size={15} />
                                                    </button>
                                                )}
                                                {c.status === 'DISABLED' && (
                                                    <button 
                                                        onClick={() => handleToggleStatus(c, 'APPROVED')}
                                                        className="p-1.5 bg-emerald-50 rounded text-emerald-600 hover:bg-emerald-100 transition"
                                                        title="Approve / Enable Account"
                                                    >
                                                        <UserCheck size={15} />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => {
                                                        setErrorMsg(null);
                                                        setEditingCustomer({ ...c });
                                                    }}
                                                    className="p-1.5 bg-gray-50 rounded text-gray-400 hover:text-masuma-orange hover:bg-orange-50 transition"
                                                    title="Edit Customer Details"
                                                >
                                                    <Edit2 size={15} />
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setErrorMsg(null);
                                                        setDeletingCustomer({ ...c });
                                                    }}
                                                    className="p-1.5 bg-gray-50 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                                                    title="Delete Customer Profile"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {customers.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No customers found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* EDIT CUSTOMER MODAL */}
            {editingCustomer && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scale-in">
                        <div className="bg-masuma-dark text-white p-6 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-widest font-display text-masuma-orange">Edit Client Profile</h3>
                                <p className="text-xs text-gray-400">Update company credentials and account classification.</p>
                            </div>
                            <button onClick={() => setEditingCustomer(null)} className="text-gray-400 hover:text-white transition p-1">
                                <XCircle size={22} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            {errorMsg && (
                                <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-200 flex items-center gap-2">
                                    <XCircle size={16} className="shrink-0 text-red-500" />
                                    <span>{errorMsg}</span>
                                </div>
                            )}
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Client Name / Company</label>
                                    <input 
                                        type="text" 
                                        className="p-3 border rounded-xl focus:border-masuma-orange outline-none text-sm text-gray-800"
                                        value={editingCustomer.name} 
                                        onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})} 
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Phone Number</label>
                                    <input 
                                        type="tel" 
                                        className="p-3 border rounded-xl focus:border-masuma-orange outline-none text-sm text-gray-800"
                                        value={editingCustomer.phone} 
                                        onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} 
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Email Address</label>
                                    <input 
                                        type="email" 
                                        className="p-3 border rounded-xl focus:border-masuma-orange outline-none text-sm text-gray-800"
                                        value={editingCustomer.email || ''} 
                                        onChange={e => setEditingCustomer({...editingCustomer, email: e.target.value})} 
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">KRA PIN</label>
                                    <input 
                                        type="text" 
                                        className="p-3 border rounded-xl focus:border-masuma-orange outline-none uppercase text-sm text-gray-800"
                                        value={editingCustomer.kraPin || ''} 
                                        onChange={e => setEditingCustomer({...editingCustomer, kraPin: e.target.value})} 
                                    />
                                </div>
                                <div className="flex flex-col gap-1 sm:col-span-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Physical Address</label>
                                    <input 
                                        type="text" 
                                        className="p-3 border rounded-xl focus:border-masuma-orange outline-none text-sm text-gray-800"
                                        value={(editingCustomer as any).address || ''} 
                                        onChange={e => setEditingCustomer({...editingCustomer, address: e.target.value} as any)} 
                                    />
                                </div>

                                <div className="flex flex-col gap-1 sm:col-span-2">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Account Status</label>
                                    <select 
                                        className="p-3 border rounded-xl focus:border-masuma-orange outline-none text-sm text-gray-800 bg-white"
                                        value={editingCustomer.status || 'APPROVED'}
                                        onChange={e => setEditingCustomer({...editingCustomer, status: e.target.value as any})}
                                    >
                                        <option value="APPROVED">Approved</option>
                                        <option value="PENDING_APPROVAL">Pending Approval</option>
                                        <option value="DISABLED">Disabled / Suspended</option>
                                    </select>
                                </div>
                                
                                <div className="flex items-center gap-3 sm:col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-150">
                                    <input 
                                        type="checkbox" 
                                        id="edit-wholesale" 
                                        className="w-5 h-5 text-masuma-orange accent-masuma-orange cursor-pointer"
                                        checked={editingCustomer.isWholesale}
                                        onChange={e => setEditingCustomer({...editingCustomer, isWholesale: e.target.checked})}
                                    />
                                    <label htmlFor="edit-wholesale" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                                        Enable Wholesale Pricing (B2B Account)
                                    </label>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-gray-50 p-6 flex justify-end gap-3 border-t border-gray-100">
                            <button 
                                onClick={() => setEditingCustomer(null)} 
                                className="px-5 py-2.5 bg-gray-200 text-gray-600 rounded-xl font-bold uppercase text-[10px] tracking-wider hover:bg-gray-300 transition"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleUpdate} 
                                className="px-6 py-2.5 bg-masuma-orange text-white rounded-xl font-bold uppercase text-[10px] tracking-wider hover:bg-orange-600 transition shadow-lg shadow-orange-500/20"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CUSTOMER MODAL */}
            {deletingCustomer && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-scale-in animation-duration-200">
                        <div className="bg-red-50 p-6 text-red-600 border-b border-red-100">
                            <h3 className="text-lg font-black uppercase tracking-widest font-display">Delete CRM Profile</h3>
                            <p className="text-xs text-red-500 mt-1">This action cannot be undone and will permanently remove this customer.</p>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            {errorMsg && (
                                <div className="p-3 bg-red-100/80 text-red-700 text-xs font-bold rounded-lg border border-red-200 flex items-center gap-2">
                                    <XCircle size={16} className="shrink-0 text-red-500" />
                                    <span>{errorMsg}</span>
                                </div>
                            )}
                            <p className="text-sm text-gray-600 leading-relaxed">
                                Are you sure you want to delete <span className="font-bold text-gray-900">{deletingCustomer.name}</span>? 
                                This will clear their standard contact registry but will be blocked if active sales or orders exist.
                            </p>
                        </div>
                        
                        <div className="bg-gray-50 p-6 flex justify-end gap-3 border-t border-gray-100">
                            <button 
                                onClick={() => {
                                    setDeletingCustomer(null);
                                    setErrorMsg(null);
                                }} 
                                className="px-5 py-2.5 bg-gray-200 text-gray-600 rounded-xl font-bold uppercase text-[10px] tracking-wider hover:bg-gray-300 transition"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDelete} 
                                className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-bold uppercase text-[10px] tracking-wider hover:bg-red-700 transition shadow-lg shadow-red-500/25"
                            >
                                Yes, Delete Profile
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerManager;
