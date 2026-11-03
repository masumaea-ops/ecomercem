
import React, { useState, useEffect } from 'react';
import { List, Plus, Trash2, Loader2, Tag } from 'lucide-react';
import { apiClient } from '../../utils/apiClient';

interface Category {
    id: string;
    name: string;
}

const CategoryManager: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newCategory, setNewCategory] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const fetchCategories = async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get('/categories');
            setCategories(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategory.trim()) return;
        setIsAdding(true);
        try {
            await apiClient.post('/categories', { name: newCategory });
            setNewCategory('');
            fetchCategories();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to add category');
        } finally {
            setIsAdding(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this category?')) return;
        try {
            await apiClient.delete(`/categories/${id}`);
            fetchCategories();
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to delete category');
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-masuma-dark font-display uppercase">Categories</h2>
                    <p className="text-sm text-gray-500">Organize products into logical groups.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* List */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-200 font-bold text-masuma-dark uppercase text-xs flex items-center gap-2">
                        <List size={16} /> Existing Categories
                    </div>
                    <div className="p-4 h-96 overflow-y-auto">
                         {isLoading ? (
                             <div className="flex justify-center py-10"><Loader2 className="animate-spin text-masuma-orange" /></div>
                         ) : (
                            <ul className="space-y-2">
                                {categories.map(cat => (
                                    <li key={cat.id} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded hover:border-masuma-orange transition group">
                                        <span className="font-bold text-sm text-gray-700">{cat.name}</span>
                                        <button onClick={() => handleDelete(cat.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                                            <Trash2 size={16} />
                                        </button>
                                    </li>
                                ))}
                                {categories.length === 0 && <p className="text-gray-400 text-sm text-center">No categories found.</p>}
                            </ul>
                         )}
                    </div>
                </div>

                {/* Add New */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-fit p-6">
                    <h3 className="font-bold text-masuma-dark uppercase text-sm mb-4 flex items-center gap-2">
                        <Plus size={16} className="text-masuma-orange" /> Add New Category
                    </h3>
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category Name</label>
                            <input 
                                type="text" 
                                value={newCategory}
                                onChange={e => setNewCategory(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none"
                                placeholder="e.g. Solar Batteries"
                                required
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={isAdding}
                            className="w-full bg-masuma-dark text-white py-3 rounded font-bold uppercase tracking-widest hover:bg-masuma-orange transition flex items-center justify-center gap-2 disabled:opacity-70"
                        >
                            {isAdding ? <Loader2 className="animate-spin" size={18} /> : <Tag size={18} />} 
                            Create Category
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CategoryManager;
