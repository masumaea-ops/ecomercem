import React, { useState, useEffect } from 'react';
import { Plus, Car, Edit, Trash2, Eye, EyeOff, LayoutDashboard } from 'lucide-react';
import { apiClient } from '../utils/apiClient';
import { VehicleListing } from '../types';
import VehicleListingForm from './VehicleListingForm';

interface SellerDashboardProps {
  user: any;
  onBack: () => void;
}

const SellerDashboard: React.FC<SellerDashboardProps> = ({ user, onBack }) => {
  const [listings, setListings] = useState<VehicleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingListing, setEditingListing] = useState<VehicleListing | null>(null);

  useEffect(() => {
    fetchMyListings();
  }, []);

  const fetchMyListings = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/marketplace/my/all');
      setListings(res.data);
    } catch (error) {
      console.error('Failed to fetch listings', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      await apiClient.delete(`/marketplace/${id}`);
      fetchMyListings();
    } catch (error) {
      console.error('Failed to delete listing', error);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'PENDING' : 'ACTIVE';
    try {
      await apiClient.patch(`/marketplace/${id}`, { status: newStatus });
      fetchMyListings();
    } catch (error) {
      console.error('Failed to update status', error);
    }
  };

  if (showAddForm) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <button onClick={() => { setShowAddForm(false); setEditingListing(null); }} className="mb-6 text-gray-500 hover:text-masuma-dark font-bold uppercase tracking-widest text-xs flex items-center">
          &larr; Back to Dashboard
        </button>
        <VehicleListingForm 
          initialData={editingListing}
          onSuccess={() => {
            setShowAddForm(false);
            setEditingListing(null);
            fetchMyListings();
          }} 
          onCancel={() => {
            setShowAddForm(false);
            setEditingListing(null);
          }} 
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-wider flex items-center gap-3">
            <LayoutDashboard className="text-masuma-orange" />
            Seller Dashboard
          </h1>
          <p className="text-gray-500 mt-2">Manage your vehicle listings and inquiries.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={onBack} className="px-6 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors">
            Back to Home
          </button>
          <button 
            onClick={() => setShowAddForm(true)}
            className="bg-masuma-orange text-white px-6 py-3 rounded-xl font-bold hover:bg-masuma-orange-dark transition-colors flex items-center gap-2 shadow-lg shadow-masuma-orange/20"
          >
            <Plus size={20} /> Add Vehicle
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-masuma-orange border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : listings.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <Car className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No listings yet</h3>
          <p className="text-gray-500 mb-6">You haven't added any vehicles to the marketplace yet.</p>
          <button 
            onClick={() => setShowAddForm(true)}
            className="bg-masuma-dark text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-colors inline-flex items-center gap-2"
          >
            <Plus size={20} /> Create Your First Listing
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-widest">Vehicle</th>
                  <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-widest">Price</th>
                  <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-widest">Status</th>
                  <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-widest">Views</th>
                  <th className="p-4 text-xs font-black text-gray-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {listings.map(listing => (
                  <tr key={listing.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                          {listing.images && listing.images.length > 0 ? (
                            <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
                          ) : (
                            <Car className="w-8 h-8 text-gray-300 m-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{listing.title}</p>
                          <p className="text-sm text-gray-500">{listing.year} • {listing.make} {listing.model}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-gray-900">
                      KES {listing.price.toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        listing.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
                        listing.status === 'PENDING' ? 'bg-gray-100 text-gray-700' : 
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {listing.status}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 font-medium">
                      {listing.views || 0}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleToggleStatus(listing.id, listing.status)}
                          className="p-2 text-gray-400 hover:text-masuma-dark transition-colors"
                          title={listing.status === 'ACTIVE' ? 'Unpublish' : 'Publish'}
                        >
                          {listing.status === 'ACTIVE' ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                        <button 
                          onClick={() => { setEditingListing(listing); setShowAddForm(true); }}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(listing.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
