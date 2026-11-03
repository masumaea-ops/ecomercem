import React, { useState, useEffect } from 'react';
import { 
  Car, Search, Filter, CheckCircle2, XCircle, 
  Clock, Eye, FileText, ExternalLink, Trash2,
  AlertTriangle, ShieldCheck, MapPin
} from 'lucide-react';
import { apiClient } from '../../utils/apiClient';
import { VehicleListing, ListingStatus } from '../../types';
import { formatPrice } from '../../utils/formatters';

const MarketplaceManager: React.FC = () => {
  const [listings, setListings] = useState<VehicleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    setLoading(true);
    try {
      // Fetch all listings for admin (including pending ones)
      const res = await apiClient.get('/marketplace/admin/all');
      setListings(res.data);
    } catch (e) {
      console.error('Error fetching listings', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: ListingStatus) => {
    try {
      await apiClient.patch(`/marketplace/${id}`, { status });
      fetchListings();
    } catch (e) {
      console.error('Error updating status', e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      await apiClient.delete(`/marketplace/${id}`);
      fetchListings();
    } catch (e) {
      console.error('Error deleting listing', e);
    }
  };

  const filteredListings = listings.filter(l => filter === 'ALL' || l.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 text-amber-700';
      case 'ACTIVE': return 'bg-green-100 text-green-700';
      case 'SOLD': return 'bg-blue-100 text-blue-700';
      case 'REJECTED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-masuma-dark font-display uppercase tracking-wider">Marketplace Management</h1>
          <p className="text-gray-500 font-medium">Review, approve, and manage vehicle listings across the platform.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 rounded-xl border-gray-200 text-sm font-bold text-masuma-dark focus:ring-masuma-orange focus:border-masuma-orange appearance-none bg-white shadow-sm"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending Approval</option>
              <option value="ACTIVE">Active</option>
              <option value="SOLD">Sold</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <button 
            onClick={fetchListings} 
            className="p-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all shadow-sm group"
          >
            <Clock className="w-5 h-5 text-gray-400 group-hover:text-masuma-orange transition-colors" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Vehicle</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Seller</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Price</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Verification</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [1,2,3,4].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-8 py-10 bg-gray-50/20"></td>
                  </tr>
                ))
              ) : filteredListings.length > 0 ? (
                filteredListings.map(listing => (
                  <tr key={listing.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center">
                        <div className="relative">
                          <img 
                            src={listing.images?.[0] || 'https://picsum.photos/seed/car/100/100'} 
                            className="w-14 h-14 rounded-2xl object-cover mr-4 shadow-sm group-hover:scale-105 transition-transform"
                            alt="Vehicle"
                          />
                          {listing.isImported && (
                            <span className="absolute -top-1 -left-1 bg-purple-600 text-[8px] font-black text-white px-1.5 py-0.5 rounded uppercase shadow-sm">Imp</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-black text-masuma-dark font-display uppercase tracking-tight">{listing.year} {listing.make} {listing.model}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center mt-0.5">
                            <MapPin className="w-3 h-3 mr-1 text-masuma-orange" />
                            {listing.location}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-masuma-dark">{listing.seller?.fullName}</p>
                      <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{listing.seller?.role}</span>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-black text-masuma-dark">{formatPrice(listing.price)}</p>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-2">
                        {listing.scanReportUrl ? (
                          <a 
                            href={listing.scanReportUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-[10px] font-black text-green-600 hover:text-green-800 uppercase tracking-widest bg-green-50 px-2 py-1 rounded-lg border border-green-100 w-fit"
                          >
                            <FileText className="w-3 h-3 mr-1.5" />
                            Scan Report
                            <ExternalLink className="w-2.5 h-2.5 ml-1.5" />
                          </a>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest italic">No Report</span>
                        )}
                        {listing.auctionSheetUrl ? (
                          <a 
                            href={listing.auctionSheetUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-[10px] font-black text-purple-600 hover:text-purple-800 uppercase tracking-widest bg-purple-50 px-2 py-1 rounded-lg border border-purple-100 w-fit"
                          >
                            <FileText className="w-3 h-3 mr-1.5" />
                            Auction Sheet
                            <ExternalLink className="w-2.5 h-2.5 ml-1.5" />
                          </a>
                        ) : listing.isImported && (
                          <span className="text-[10px] font-bold text-red-300 uppercase tracking-widest italic">Missing Sheet</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-[0.15em] shadow-sm ${getStatusColor(listing.status)}`}>
                        {listing.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {listing.status === 'PENDING' && (
                          <>
                            <button 
                              onClick={() => handleUpdateStatus(listing.id, ListingStatus.ACTIVE)}
                              className="p-2.5 text-green-600 hover:bg-green-50 rounded-xl transition-all hover:scale-110"
                              title="Approve"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleUpdateStatus(listing.id, ListingStatus.REJECTED)}
                              className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all hover:scale-110"
                              title="Reject"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => handleDelete(listing.id)}
                          className="p-2.5 text-gray-300 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all hover:scale-110"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Car className="w-10 h-10 text-gray-200" />
                    </div>
                    <h3 className="text-lg font-black text-masuma-dark font-display uppercase tracking-wider mb-2">No Listings Found</h3>
                    <p className="text-sm text-gray-400">There are no vehicle listings matching your current filter.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceManager;
