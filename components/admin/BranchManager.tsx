
import React, { useState, useEffect } from 'react';
import { Building, MapPin, Phone, Edit2, Plus, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { apiClient } from '../../utils/apiClient';
import { Branch } from '../../types';

const BranchManager: React.FC = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<Branch>>({});

    const fetchBranches = async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get('/branches');
            setBranches(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    const handleAdd = () => {
        setFormData({ name: '', code: '', address: '', phone: '' });
        setIsEditing(true);
    };

    const handleEdit = (branch: Branch) => {
        setFormData(branch);
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.code) return alert('Name and Code required');
        try {
            if (formData.id) {
                await apiClient.put(`/branches/${formData.id}`, formData);
            } else {
                await apiClient.post('/branches', formData);
            }
            setIsEditing(false);
            fetchBranches();
        } catch (error) {
            alert('Failed to save branch');
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-masuma-dark font-display uppercase">Branch Management</h2>
                    <p className="text-sm text-gray-500">Manage store locations and warehouses.</p>
                </div>
                <button 
                    onClick={handleAdd}
                    className="bg-masuma-orange text-white px-4 py-2 rounded font-bold text-sm uppercase flex items-center gap-2 hover:bg-orange-600 transition shadow-md"
                >
                    <Plus size={16} /> Add Branch
                </button>
            </div>

            {/* Editor */}
            {isEditing && (
                <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 mb-6 animate-slide-up">
                    <h3 className="font-bold text-masuma-dark uppercase mb-4 border-b pb-2">Branch Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                             <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Branch Name</label>
                             <input type="text" className="w-full p-3 border rounded focus:border-masuma-orange outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Mombasa Road Outlet" />
                        </div>
                        <div>
                             <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Branch Code</label>
                             <input type="text" className="w-full p-3 border rounded focus:border-masuma-orange outline-none font-mono uppercase" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} placeholder="e.g. MSA-001" />
                        </div>
                        <div>
                             <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Phone Number</label>
                             <input type="text" className="w-full p-3 border rounded focus:border-masuma-orange outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                        </div>
                        <div>
                             <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Address / Location</label>
                             <input type="text" className="w-full p-3 border rounded focus:border-masuma-orange outline-none" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                        </div>
                    </div>
                    <div className="mt-4 flex justify-end gap-3">
                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 border rounded text-gray-600 font-bold uppercase text-xs hover:bg-gray-50">Cancel</button>
                        <button onClick={handleSave} className="bg-masuma-dark text-white px-6 py-2 rounded font-bold uppercase text-xs hover:bg-masuma-orange transition">Save Branch</button>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="animate-spin text-masuma-orange" size={32} />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-xs border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4">Branch Name</th>
                                    <th className="px-6 py-4">Code</th>
                                    <th className="px-6 py-4">Location</th>
                                    <th className="px-6 py-4">Contact</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {branches.map(branch => (
                                    <tr key={branch.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-bold text-masuma-dark flex items-center gap-2">
                                            <Building size={16} className="text-gray-400" /> {branch.name}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-gray-600 bg-gray-50 w-fit px-2 rounded">{branch.code}</td>
                                        <td className="px-6 py-4 text-gray-600 text-xs flex items-center gap-1">
                                            <MapPin size={12} /> {branch.address || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 text-xs">
                                            <div className="flex items-center gap-1"><Phone size={12} /> {branch.phone || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-green-600 font-bold text-[10px] uppercase bg-green-50 px-2 py-1 rounded flex items-center gap-1 w-fit">
                                                <CheckCircle size={12} /> Active
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => handleEdit(branch)} className="p-1 text-gray-400 hover:text-masuma-orange transition">
                                                <Edit2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {branches.length === 0 && (
                                    <tr><td colSpan={6} className="text-center py-8 text-gray-500">No branches found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BranchManager;
