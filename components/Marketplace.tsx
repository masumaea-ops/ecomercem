import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, MapPin, Calendar, Gauge, 
  Fuel, Settings2, Heart, Share2, MessageCircle,
  ChevronRight, ArrowRight, Star, Info, Car, Bike, Calculator, ShieldCheck, AlertTriangle, FileText, ExternalLink, Plus, XCircle, Maximize2
} from 'lucide-react';
import { apiClient } from '../utils/apiClient';
import { VehicleListing, Product } from '../types';
import { formatPrice } from '../utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';
import SEO from './SEO';
import FraudReportModal from './FraudReportModal';
import VehicleListingForm from './VehicleListingForm';
import ShareButtons from './ShareButtons';

interface MarketplaceProps {
  user: any;
  setView: (view: any) => void;
  initialListingId?: string | null;
  onSellerAuthRequired?: () => void;
}

const Marketplace: React.FC<MarketplaceProps> = ({ user, setView, initialListingId, onSellerAuthRequired }) => {
  const [listings, setListings] = useState<VehicleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'CAR' | 'MOTORCYCLE'>('ALL');
  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    minYear: '',
    maxYear: '',
    make: '',
    model: '',
    transmission: '',
    fuelType: '',
    condition: ''
  });
  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  
  const [selectedListing, setSelectedListing] = useState<VehicleListing | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [recommendedParts, setRecommendedParts] = useState<Product[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isListingFormOpen, setIsListingFormOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchListings();
    
    // Handle deep linking for listings
    const listingId = initialListingId || new URLSearchParams(window.location.search).get('listing');
    if (listingId) {
      const fetchListing = async () => {
        try {
          const res = await apiClient.get(`/marketplace/${listingId}`);
          if (res.data) {
            handleListingClick(res.data);
          }
        } catch (e) {
          console.error('Error fetching deep linked listing', e);
        }
      };
      fetchListing();
    }
  }, [filterType, initialListingId]);

  const fetchListings = async (isLoadMore = false) => {
    setLoading(true);
    try {
      const currentPage = isLoadMore ? page + 1 : 1;
      let url = `/marketplace?page=${currentPage}&limit=12`;
      const params = new URLSearchParams();
      if (filterType !== 'ALL') params.append('vehicleType', filterType);
      if (searchQuery) params.append('search', searchQuery);
      
      // Add advanced filters
      if (filters.minPrice) params.append('minPrice', filters.minPrice);
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
      if (filters.minYear) params.append('minYear', filters.minYear);
      if (filters.maxYear) params.append('maxYear', filters.maxYear);
      if (filters.make) params.append('make', filters.make);
      if (filters.model) params.append('model', filters.model);
      if (filters.transmission) params.append('transmission', filters.transmission);
      if (filters.fuelType) params.append('fuelType', filters.fuelType);
      if (filters.condition) params.append('condition', filters.condition);

      if (params.toString()) url += `&${params.toString()}`;
      
      const res = await apiClient.get(url);
      const newResults = res.data.results || [];
      
      if (isLoadMore) {
        setListings(prev => [...prev, ...newResults]);
        setPage(currentPage);
      } else {
        setListings(newResults);
        setPage(1);
      }
      
      setTotal(res.data.total || 0);
      setHasMore(newResults.length === 12);
    } catch (e) {
      console.error('Error fetching listings', e);
    } finally {
      setLoading(false);
    }
  };

  // Add useEffect to refetch when search query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchListings();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, filterType, filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      minPrice: '',
      maxPrice: '',
      minYear: '',
      maxYear: '',
      make: '',
      model: '',
      transmission: '',
      fuelType: '',
      condition: ''
    });
    setSearchQuery('');
    setFilterType('ALL');
  };

  const handleListingClick = async (listing: VehicleListing) => {
    setSelectedListing(listing);
    setCurrentImageIndex(0);
    
    // Update URL for deep linking with clean slug
    const slug = `${listing.year}-${listing.make}-${listing.model}-${listing.id}`.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    const newUrl = `/marketplace/${slug}`;
    window.history.pushState({ path: newUrl }, '', newUrl);

    // Scroll to top of details on mobile
    if (window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Fetch recommended parts for this vehicle
    try {
      const res = await apiClient.get(`/products?search=${listing.make} ${listing.model}`);
      setRecommendedParts(res.data.slice(0, 3));
    } catch (e) {
      console.error('Error fetching recommendations', e);
    }
  };

  const handleBackToListings = () => {
    setSelectedListing(null);
    const newUrl = '/marketplace';
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  const handleContactSeller = () => {
    if (!selectedListing) return;
    
    const phone = selectedListing.seller.phone || '+254700000000'; // Fallback
    const message = `Hi, I'm interested in your ${selectedListing.year} ${selectedListing.make} ${selectedListing.model} listed on Masuma Marketplace for ${formatPrice(selectedListing.price)}. Is it still available?`;
    const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const marketplaceSEO = selectedListing ? (
    <SEO 
      title={`${selectedListing.year} ${selectedListing.make} ${selectedListing.model} for Sale in ${selectedListing.location}`}
      description={`Buy this ${selectedListing.year} ${selectedListing.make} ${selectedListing.model} in ${selectedListing.location}. ${selectedListing.mileage}km, ${selectedListing.transmission} transmission. Price: ${formatPrice(selectedListing.price)}. Find more vehicles on Masuma Marketplace.`}
      image={selectedListing.images?.[0]}
      url={`${window.location.origin}${window.location.pathname}?listing=${selectedListing.id}`}
      type="product"
      keywords={`${selectedListing.make} ${selectedListing.model}, used ${selectedListing.make} Kenya, ${selectedListing.location} car sales`}
      schema={{
        "@context": "https://schema.org",
        "@type": "Product",
        "name": `${selectedListing.year} ${selectedListing.make} ${selectedListing.model}`,
        "description": selectedListing.description,
        "image": selectedListing.images,
        "offers": {
          "@type": "Offer",
          "price": selectedListing.price,
          "priceCurrency": "KES",
          "availability": "https://schema.org/InStock",
          "areaServed": selectedListing.location
        }
      }}
    />
  ) : (
    <SEO 
      title="Vehicle Marketplace | Buy & Sell Cars in Kenya" 
      description="Browse genuine vehicle listings from individuals and dealers in Kenya. Find your next car or motorcycle on Masuma Marketplace." 
      keywords="car marketplace Kenya, buy cars Nairobi, sell motorcycles Kenya, used cars Kenya"
    />
  );

  return (
    <div className="bg-gray-50 min-h-screen">
      {marketplaceSEO}
      {/* Header & Search */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="mb-3">
            <h1 className="text-xl md:text-2xl font-black text-masuma-dark font-display uppercase tracking-tight">
              Verified Vehicle Marketplace Kenya
            </h1>
            <p className="text-xs text-gray-500">
              Buy and sell verified Japanese cars and motorcycles with genuine Masuma parts history in Kenya.
            </p>
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text"
                placeholder="Search by make, model, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-orange-500 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
              <button 
                onClick={() => setFilterType('ALL')}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${filterType === 'ALL' ? 'bg-masuma-orange text-white shadow-lg shadow-masuma-orange/20' : 'bg-white text-gray-600 border border-gray-200 hover:border-masuma-orange'}`}
              >
                All Vehicles
              </button>
              <button 
                onClick={() => setFilterType('CAR')}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center ${filterType === 'CAR' ? 'bg-masuma-orange text-white shadow-lg shadow-masuma-orange/20' : 'bg-white text-gray-600 border border-gray-200 hover:border-masuma-orange'}`}
              >
                <Car className="w-4 h-4 mr-2" />
                Cars
              </button>
              <button 
                onClick={() => setFilterType('MOTORCYCLE')}
                className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all flex items-center ${filterType === 'MOTORCYCLE' ? 'bg-masuma-orange text-white shadow-lg shadow-masuma-orange/20' : 'bg-white text-gray-600 border border-gray-200 hover:border-masuma-orange'}`}
              >
                <Bike className="w-4 h-4 mr-2" />
                Motorcycles
              </button>
              <button 
                onClick={() => setIsFilterSidebarOpen(true)}
                className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors lg:hidden"
              >
                <Filter className="w-5 h-5 text-gray-600" />
              </button>
              
              <button 
                onClick={() => {
                  if (!user) {
                    if (onSellerAuthRequired) {
                      onSellerAuthRequired();
                    } else {
                      setView('LOGIN');
                    }
                    return;
                  }
                  setIsListingFormOpen(true);
                }}
                className="ml-auto bg-masuma-dark text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-black transition-all flex items-center shadow-xl shadow-gray-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                List Your Vehicle
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Filters or Details */}
          <div className={`lg:col-span-1 order-2 lg:order-last ${
            isFilterSidebarOpen || selectedListing
              ? 'fixed inset-0 z-[105] bg-white p-4 sm:p-6 overflow-y-auto pb-24 lg:pb-0 lg:relative lg:inset-auto lg:z-auto lg:bg-transparent lg:p-0 lg:overflow-visible' 
              : 'hidden lg:block'
          }`}>
            <div className="sticky top-24 space-y-6">
              {!selectedListing ? (
                <>
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-black text-masuma-dark uppercase tracking-widest flex items-center">
                      <Filter className="w-4 h-4 mr-2 text-masuma-orange" />
                      Advanced Filters
                    </h3>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={clearFilters}
                        className="text-[10px] font-black text-masuma-orange uppercase tracking-widest hover:underline"
                      >
                        Clear
                      </button>
                      <button 
                        onClick={() => setIsFilterSidebarOpen(false)}
                        className="lg:hidden p-2 hover:bg-gray-100 rounded-full"
                      >
                        <XCircle className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Price Range */}
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Price Range (KES)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input 
                          type="number" 
                          placeholder="Min"
                          value={filters.minPrice}
                          onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-masuma-orange transition-all"
                        />
                        <input 
                          type="number" 
                          placeholder="Max"
                          value={filters.maxPrice}
                          onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-masuma-orange transition-all"
                        />
                      </div>
                    </div>

                    {/* Year Range */}
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Year Range</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input 
                          type="number" 
                          placeholder="From"
                          value={filters.minYear}
                          onChange={(e) => handleFilterChange('minYear', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-masuma-orange transition-all"
                        />
                        <input 
                          type="number" 
                          placeholder="To"
                          value={filters.maxYear}
                          onChange={(e) => handleFilterChange('maxYear', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-masuma-orange transition-all"
                        />
                      </div>
                    </div>

                    {/* Make & Model */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Make</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Toyota"
                          value={filters.make}
                          onChange={(e) => handleFilterChange('make', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-masuma-orange transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Model</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Vitz"
                          value={filters.model}
                          onChange={(e) => handleFilterChange('model', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-masuma-orange transition-all"
                        />
                      </div>
                    </div>

                    {/* Transmission */}
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Transmission</label>
                      <div className="flex flex-wrap gap-2">
                        {['AUTOMATIC', 'MANUAL'].map(t => (
                          <button
                            key={t}
                            onClick={() => handleFilterChange('transmission', filters.transmission === t ? '' : t)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${filters.transmission === t ? 'bg-masuma-orange text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Fuel Type */}
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Fuel Type</label>
                      <div className="flex flex-wrap gap-2">
                        {['PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC'].map(f => (
                          <button
                            key={f}
                            onClick={() => handleFilterChange('fuelType', filters.fuelType === f ? '' : f)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${filters.fuelType === f ? 'bg-masuma-orange text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={() => setIsFilterSidebarOpen(false)}
                      className="w-full bg-masuma-dark text-white py-4 rounded-2xl font-black uppercase tracking-widest lg:hidden mt-8"
                    >
                      Apply Filters
                    </button>
                  </div>
                </motion.div>

                {/* General Spares Promo - Visible when no vehicle is selected */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-masuma-dark to-black rounded-[2rem] p-8 text-white relative overflow-hidden group shadow-xl"
                >
                  <div className="relative z-10">
                    <h4 className="text-xs font-black text-masuma-orange uppercase tracking-widest mb-4">Masuma Genuine Parts</h4>
                    <h3 className="text-2xl font-black mb-4 leading-tight">NEED SPARES FOR YOUR CURRENT RIDE?</h3>
                    <p className="text-sm text-gray-400 mb-8 leading-relaxed">Browse over 10,000+ genuine Masuma parts with 12-month warranty.</p>
                    <button 
                      onClick={() => setView('CATALOG')}
                      className="w-full bg-masuma-orange text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-masuma-orange/20 flex items-center justify-center group/btn"
                    >
                      Visit Catalog
                      <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                  <Settings2 className="absolute -bottom-10 -right-10 w-40 h-40 text-white/5 rotate-12 group-hover:rotate-45 transition-transform duration-1000" />
                </motion.div>
              </>
            ) : (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 p-8"
                >
                  <div className="flex justify-between items-center mb-6">
                    <button 
                      onClick={handleBackToListings}
                      className="flex items-center text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-masuma-orange transition-colors"
                    >
                      <ArrowRight className="w-3 h-3 mr-1 rotate-180" />
                      Back to Listings
                    </button>
                    <button
                      onClick={handleBackToListings}
                      className="lg:hidden p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-masuma-orange transition-colors"
                      title="Close details"
                    >
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>
                  {/* Image Gallery */}
                  <div 
                    className="relative aspect-video rounded-2xl overflow-hidden mb-4 group/gallery bg-gray-100 cursor-zoom-in"
                    onClick={() => setIsLightboxOpen(true)}
                  >
                    <AnimatePresence mode="wait">
                      <motion.img 
                        key={currentImageIndex}
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                        src={selectedListing.images?.[currentImageIndex] || 'https://picsum.photos/seed/car/800/600'} 
                        alt="Vehicle"
                        className="w-full h-full object-cover"
                      />
                    </AnimatePresence>
                    
                    {/* Expand Icon */}
                    <div className="absolute top-4 left-4 p-2 bg-black/20 backdrop-blur-md text-white rounded-lg opacity-0 group-hover/gallery:opacity-100 transition-opacity">
                      <Maximize2 className="w-4 h-4" />
                    </div>

                    {/* Counter */}
                    <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-white font-black uppercase tracking-widest pointer-events-none">
                      {currentImageIndex + 1} / {selectedListing.images?.length || 1}
                    </div>
                    
                    {selectedListing.images && selectedListing.images.length > 1 && (
                      <>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex(prev => (prev - 1 + selectedListing.images!.length) % selectedListing.images!.length);
                          }}
                          className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 sm:bg-white/20 backdrop-blur-md text-white rounded-full opacity-90 md:opacity-0 md:group-hover/gallery:opacity-100 transition-opacity hover:bg-white/40"
                          aria-label="Previous image"
                        >
                          <ChevronRight className="w-5 h-5 rotate-180" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex(prev => (prev + 1) % selectedListing.images!.length);
                          }}
                          className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 sm:bg-white/20 backdrop-blur-md text-white rounded-full opacity-90 md:opacity-0 md:group-hover/gallery:opacity-100 transition-opacity hover:bg-white/40"
                          aria-label="Next image"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Thumbnail Strip */}
                  {selectedListing.images && selectedListing.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
                      {selectedListing.images.map((img, idx) => (
                        <button 
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`relative flex-shrink-0 w-20 aspect-video rounded-xl overflow-hidden border-2 transition-all ${idx === currentImageIndex ? 'border-masuma-orange ring-4 ring-masuma-orange/10' : 'border-transparent opacity-50 hover:opacity-100'}`}
                        >
                          <img src={img} className="w-full h-full object-cover" alt={`Thumb ${idx}`} />
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="text-2xl font-black text-masuma-dark font-display">VEHICLE SPECS</h3>
                      <div className="w-12 h-1 bg-masuma-orange mt-1 rounded-full"></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Seller</p>
                      <p className="text-sm font-bold text-masuma-dark truncate">{selectedListing.seller.fullName}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Body</p>
                      <p className="text-sm font-bold text-masuma-dark">{selectedListing.bodyType || 'Sedan'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Engine</p>
                      <p className="text-sm font-bold text-masuma-dark">{selectedListing.engineSize || '1500'} CC</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Color</p>
                      <p className="text-sm font-bold text-masuma-dark">{selectedListing.color || 'Silver'}</p>
                    </div>
                  </div>

                  {/* Trust Verification Section */}
                  <div className="mb-8">
                    <h4 className="text-xs font-black text-masuma-dark uppercase tracking-widest mb-4 flex items-center">
                      <ShieldCheck className="w-4 h-4 mr-2 text-masuma-orange" />
                      Verification Status
                    </h4>
                    
                    <div className="space-y-3">
                      {selectedListing.scanReportUrl ? (
                        <div className="flex items-center p-3 bg-green-50 rounded-xl border border-green-100">
                          <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center mr-3">
                            <FileText className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Scan Report</p>
                            <a href={selectedListing.scanReportUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-green-800 hover:underline flex items-center">
                              View Full Report <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                          <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center mr-3">
                            <AlertTriangle className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest">Verification</p>
                            <p className="text-xs font-bold text-yellow-800">Pending physical inspection</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Compatible Spares Section */}
                  {recommendedParts.length > 0 && (
                    <div className="mb-8 bg-masuma-dark rounded-2xl p-6 relative overflow-hidden">
                      <div className="relative z-10">
                        <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center justify-between">
                          <span className="flex items-center">
                            <Star className="w-4 h-4 mr-2 text-masuma-orange fill-masuma-orange" />
                            Compatible Spares
                          </span>
                          <span className="bg-masuma-orange/20 text-masuma-orange text-[8px] px-2 py-0.5 rounded-full border border-masuma-orange/30">MATCHED</span>
                        </h4>
                        <div className="space-y-3">
                          {recommendedParts.map(part => (
                            <div 
                              key={part.id} 
                              className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 group cursor-pointer hover:bg-white/10 transition-all"
                              onClick={() => {
                                // Potentially open part details or just go to catalog
                                setView('CATALOG');
                              }}
                            >
                              <img 
                                src={part.image || 'https://picsum.photos/seed/part/100/100'} 
                                alt={part.name} 
                                className="w-10 h-10 object-cover rounded-lg" 
                              />
                              <div className="flex-grow min-w-0">
                                <p className="text-[10px] font-bold text-white truncate">{part.name}</p>
                                <p className="text-[10px] text-masuma-orange font-black">{formatPrice(part.price)}</p>
                              </div>
                              <ArrowRight className="w-3 h-3 text-white/30 group-hover:text-masuma-orange transition-colors" />
                            </div>
                          ))}
                        </div>
                        <button 
                          onClick={() => setView('CATALOG')}
                          className="w-full mt-4 bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10"
                        >
                          View All Compatible Parts
                        </button>
                      </div>
                      <Settings2 className="absolute -bottom-6 -right-6 w-24 h-24 text-white/5 rotate-12" />
                    </div>
                  )}

                  <div className="space-y-4">
                    <button 
                      onClick={handleContactSeller}
                      className="w-full bg-masuma-orange text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-masuma-orange/20 flex items-center justify-center group"
                    >
                      <MessageCircle className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                      Contact Seller
                    </button>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setIsReportModalOpen(true)}
                        className="flex-1 bg-gray-50 text-gray-400 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all border border-gray-100"
                      >
                        Report Fraud
                      </button>
                      <ShareButtons 
                        url={`${window.location.origin}${window.location.pathname}?listing=${selectedListing.id}`}
                        title={`${selectedListing.year} ${selectedListing.make} ${selectedListing.model} for Sale`}
                        contentId={selectedListing.id}
                        contentType="POST"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>

          {/* Main Content - Listings */}
          <div className="lg:col-span-3 order-1 lg:order-first">
            {loading ? (
              <div className={`grid grid-cols-1 md:grid-cols-2 ${selectedListing ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-6`}>
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="bg-white rounded-2xl h-96 animate-pulse" />
                ))}
              </div>
            ) : listings.length > 0 ? (
              <>
                <div className={`grid grid-cols-1 md:grid-cols-2 ${selectedListing ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-6`}>
                {listings.map(listing => {
                  const listingSlug = `${listing.year || ''}-${listing.make || ''}-${listing.model || ''}-${listing.id}`.toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)+/g, '');
                  return (
                  <motion.div 
                    key={listing.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => handleListingClick(listing)}
                    className={`bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group ${selectedListing?.id === listing.id ? 'ring-2 ring-masuma-orange border-transparent' : ''}`}
                  >
                    <a 
                      href={`/marketplace/${listingSlug}`}
                      onClick={(e) => { e.preventDefault(); handleListingClick(listing); }}
                      className="block text-inherit no-underline"
                      aria-label={`${listing.year} ${listing.make} ${listing.model}`}
                    >
                    <div className="relative h-64 overflow-hidden">
                      <img 
                        src={listing.images?.[0] || 'https://picsum.photos/seed/car/800/600'} 
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute top-4 left-4 flex flex-col gap-2">
                        <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-masuma-dark uppercase tracking-widest shadow-sm">
                          {listing.vehicleType}
                        </span>
                        {listing.isImported && (
                          <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                            Imported
                          </span>
                        )}
                      </div>
                      <button className="absolute top-4 right-4 p-2.5 bg-white/90 backdrop-blur-md rounded-full text-gray-400 hover:text-red-500 hover:scale-110 transition-all shadow-sm">
                        <Heart className="w-5 h-5" />
                      </button>
                      
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mb-1">Price</p>
                            <span className="text-2xl font-black text-white">{formatPrice(listing.price)}</span>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            {listing.seller?.role === 'DEALER' ? (
                              <span className="text-[9px] font-black bg-blue-600 text-white px-2 py-1 rounded-md flex items-center shadow-lg">
                                <ShieldCheck className="w-3 h-3 mr-1" />
                                DEALER
                              </span>
                            ) : (
                              <span className="text-[9px] font-black bg-masuma-orange text-white px-2 py-1 rounded-md shadow-lg">VERIFIED</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6">
                      <h3 className="text-base font-bold text-masuma-dark mb-3 group-hover:text-masuma-orange transition-colors line-clamp-1 font-display uppercase tracking-tight">
                        {listing.year} {listing.make} {listing.model}
                      </h3>
                      
                      <div className="grid grid-cols-3 gap-3 mb-6">
                        <div className="flex flex-col items-center justify-center text-center bg-gray-50 p-2.5 rounded-2xl border border-gray-100 group-hover:bg-white group-hover:border-masuma-orange/20 transition-colors">
                          <Gauge className="w-4 h-4 mb-1 text-masuma-orange" />
                          <span className="text-[10px] font-bold text-gray-900">{listing.mileage?.toLocaleString()}</span>
                          <span className="text-[8px] text-gray-400 uppercase font-bold">KM</span>
                        </div>
                        <div className="flex flex-col items-center justify-center text-center bg-gray-50 p-2.5 rounded-2xl border border-gray-100 group-hover:bg-white group-hover:border-masuma-orange/20 transition-colors">
                          <Fuel className="w-4 h-4 mb-1 text-masuma-orange" />
                          <span className="text-[10px] font-bold text-gray-900">{listing.fuelType}</span>
                          <span className="text-[8px] text-gray-400 uppercase font-bold">FUEL</span>
                        </div>
                        <div className="flex flex-col items-center justify-center text-center bg-gray-50 p-2.5 rounded-2xl border border-gray-100 group-hover:bg-white group-hover:border-masuma-orange/20 transition-colors">
                          <Settings2 className="w-4 h-4 mb-1 text-masuma-orange" />
                          <span className="text-[10px] font-bold text-gray-900">{listing.transmission?.substring(0, 4)}</span>
                          <span className="text-[8px] text-gray-400 uppercase font-bold">TRANS</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center text-xs font-bold text-gray-400">
                          <MapPin className="w-3.5 h-3.5 mr-1 text-masuma-orange" />
                          {listing.location || 'Nairobi'}
                        </div>
                        <div className="flex items-center text-xs font-black text-masuma-orange uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                          Details
                          <ChevronRight className="w-4 h-4 ml-0.5" />
                        </div>
                      </div>
                    </div>
                  </a>
                </motion.div>
              ); })}
              </div>

              {hasMore && (
                <div className="mt-12 flex justify-center">
                  <button 
                    onClick={() => fetchListings(true)}
                    disabled={loading}
                    className="px-8 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-black text-masuma-dark uppercase tracking-widest hover:border-masuma-orange hover:text-masuma-orange transition-all shadow-sm disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Load More Vehicles'}
                  </button>
                </div>
              )}
              </>
            ) : (
              <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-12 text-center">
                <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Car className="w-10 h-10 text-gray-200" />
                </div>
                <h3 className="text-xl font-black text-masuma-dark font-display uppercase tracking-wider mb-2">No listings found</h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-8">Try adjusting your filters or search query to find what you're looking for.</p>
                <button 
                  onClick={clearFilters}
                  className="px-8 py-4 bg-masuma-orange text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-masuma-orange/20"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {isReportModalOpen && selectedListing && (
          <FraudReportModal 
            listingId={selectedListing.id}
            listingTitle={`${selectedListing.year} ${selectedListing.make} ${selectedListing.model}`}
            onClose={() => setIsReportModalOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isListingFormOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="my-8 w-full max-w-4xl">
              <VehicleListingForm 
                onSuccess={() => {
                  setIsListingFormOpen(false);
                  fetchListings();
                }}
                onCancel={() => setIsListingFormOpen(false)}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {isLightboxOpen && selectedListing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsLightboxOpen(false)}
            className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-4 md:p-8 lg:p-12 cursor-zoom-out"
          >
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsLightboxOpen(false);
              }}
              className="absolute top-6 right-6 md:top-10 md:right-10 p-3 bg-white/10 text-white rounded-full hover:bg-masuma-orange hover:scale-110 transition-all z-[310] group"
            >
              <XCircle className="w-8 h-8 md:w-10 md:h-10" />
            </button>

            <div 
              className="relative w-full max-w-[95vw] lg:max-w-[85vw] xl:max-w-[1400px] aspect-video flex items-center justify-center cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <AnimatePresence mode="wait">
                <motion.img 
                  key={currentImageIndex}
                  initial={{ opacity: 0, scale: 0.98, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 1.02, x: -20 }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  src={selectedListing.images?.[currentImageIndex]} 
                  className="w-full h-full object-contain rounded-3xl shadow-2xl shadow-black/50"
                />
              </AnimatePresence>

              {/* Lightbox Nav - Prominent on Desktop */}
              {selectedListing.images && selectedListing.images.length > 1 && (
                <>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(prev => (prev - 1 + selectedListing.images!.length) % selectedListing.images!.length);
                    }}
                    className="absolute left-2 md:-left-24 top-1/2 -translate-y-1/2 p-2 md:p-6 text-white/70 hover:text-masuma-orange hover:scale-125 transition-all z-50"
                    aria-label="Previous image"
                  >
                    <ChevronRight className="w-8 h-8 md:w-16 md:h-16 rotate-180" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(prev => (prev + 1) % selectedListing.images!.length);
                    }}
                    className="absolute right-2 md:-right-24 top-1/2 -translate-y-1/2 p-2 md:p-6 text-white/70 hover:text-masuma-orange hover:scale-125 transition-all z-50"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-8 h-8 md:w-16 md:h-16" />
                  </button>
                </>
              )}
            </div>

            {/* Lightbox Thumbnails - Refined for Desktop */}
            <div 
              className="mt-12 flex gap-4 overflow-x-auto max-w-full px-8 pb-4 scrollbar-hide cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedListing.images?.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setCurrentImageIndex(idx)}
                  className={`relative flex-shrink-0 w-28 lg:w-36 aspect-video rounded-2xl overflow-hidden border-2 transition-all duration-300 ${idx === currentImageIndex ? 'border-masuma-orange scale-110 shadow-lg shadow-masuma-orange/20' : 'border-transparent opacity-30 hover:opacity-100 hover:scale-105'}`}
                >
                  <img src={img} className="w-full h-full object-cover" alt={`Thumb ${idx}`} />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Marketplace;
