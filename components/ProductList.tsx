import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product } from '../types';
import { Search, AlertCircle, Eye, ShoppingBag, Plane, ChevronLeft, ChevronRight, Filter, ShieldCheck, Star, Play, Sparkles, CheckCircle2, ArrowRight, X, Loader2, Tag, Car, SlidersHorizontal, ArrowUpDown, RotateCcw, ChevronDown } from 'lucide-react';
import VinSearch from './VinSearch';
import { apiClient } from '../utils/apiClient';
import Price from './Price';
import { useCurrency } from '../contexts/CurrencyContext';
import SourcingModal from './SourcingModal';
import { trackProductView, trackAddToCart, trackSearch } from '../utils/analytics';
import ProductImage from './ProductImage';
import SEO from './SEO';

const generateSlug = (name: string, sku: string): string => {
    return `${name} ${sku}`.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
};

interface ProductListProps {
  addToCart: (product: Product, quantity?: number) => void;
  onProductClick: (product: Product) => void;
  initialCategory?: string;
  onCategoryChange?: (category: string) => void;
  compatibilityContext?: { make: string; model: string; category?: string };
}

const ProductList: React.FC<ProductListProps> = ({ 
  addToCart, 
  onProductClick, 
  initialCategory = 'All', 
  onCategoryChange,
  compatibilityContext 
}) => {
  const [categories, setCategories] = useState<string[]>(['All']);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);

  // Sync selectedCategory with parent/url state when initialCategory prop changes
  useEffect(() => {
    if (initialCategory) {
      // Find case-insensitive match from categories if fetched, else use directly
      const matched = categories.find(c => c.toLowerCase() === initialCategory.toLowerCase());
      setSelectedCategory(matched || initialCategory);
    }
  }, [initialCategory, categories]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [semanticInfo, setSemanticInfo] = useState<{
    detectedSymptom?: string;
    suggestedParts?: string[];
    originalQuery?: string;
    suggestedCategory?: string;
  } | null>(null);
  const [compatibilityInfo, setCompatibilityInfo] = useState<{
    make: string;
    model: string;
    category?: string;
    totalCount: number;
    oemNumbers: string[];
    crossSell?: {
      reason: string;
      complementaryCategories: string[];
      products: Product[];
    };
    guaranteedFitment: boolean;
  } | null>(null);
  const [vinFilter, setVinFilter] = useState('');
  const [error, setError] = useState(false);
  
  const [isSourcingOpen, setIsSourcingOpen] = useState(false);

  // Typo Auto-Correction State (Gap 3)
  const [typoCorrection, setTypoCorrection] = useState<{
    originalQuery: string;
    correctedQuery: string;
  } | null>(null);

  // Search Autocomplete State
  const [suggestions, setSuggestions] = useState<{
    products: Product[];
    categories: string[];
    vehicles: string[];
    correctedQuery?: string;
  } | null>(null);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);
  const [selectedSuggestIndex, setSelectedSuggestIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sorting & Advanced Filtering State (Gap 2)
  const { currency } = useCurrency();
  const [sortBy, setSortBy] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('sort') || 'featured';
    }
    return 'featured';
  });
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [tempMinPrice, setTempMinPrice] = useState<string>('');
  const [tempMaxPrice, setTempMaxPrice] = useState<string>('');
  const [inStockOnly, setInStockOnly] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('inStock') === 'true';
    }
    return false;
  });
  const [isPricePopoverOpen, setIsPricePopoverOpen] = useState<boolean>(false);
  const pricePopoverRef = useRef<HTMLDivElement>(null);

  const handleResetFilters = () => {
    setSortBy('featured');
    setMinPrice('');
    setMaxPrice('');
    setTempMinPrice('');
    setTempMaxPrice('');
    setInStockOnly(false);
  };

  // Pagination State with URL Sync
  const [currentPage, setCurrentPage] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('page');
      const num = parseInt(p || '1', 10);
      return !isNaN(num) && num > 0 ? num : 1;
    }
    return 1;
  });
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const ITEMS_PER_PAGE = 12;

  const isFirstRender = useRef(true);

  const getPageUrl = (pageNumber: number) => {
    const basePath = selectedCategory && selectedCategory !== 'All'
      ? `/categories/${encodeURIComponent(selectedCategory)}`
      : '/catalog';
    return pageNumber > 1 ? `${basePath}?page=${pageNumber}` : basePath;
  };

  // Fetch Categories on Mount
  useEffect(() => {
      const fetchCategories = async () => {
          try {
              const res = await apiClient.get('/categories');
              if (res.data && Array.isArray(res.data)) {
                  const catNames = res.data.map((c: any) => c.name);
                  setCategories(['All', ...catNames]);
              }
          } catch (e) {
              setCategories(['All', 'Filters', 'Brakes', 'Suspension']);
          }
      };
      fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
        setIsLoading(true);
        setError(false);
        try {
            // Priority 1: If routed to a programmatic vehicle compatibility hub
            if (compatibilityContext && compatibilityContext.make && compatibilityContext.model) {
                const cMake = encodeURIComponent(compatibilityContext.make);
                const cModel = encodeURIComponent(compatibilityContext.model);
                const activeCat = (selectedCategory && selectedCategory !== 'All')
                  ? selectedCategory
                  : (compatibilityContext.category || '');
                const cCat = activeCat ? encodeURIComponent(activeCat) : '';
                const compUrl = cCat ? `/compatibility/${cMake}/${cModel}/${cCat}` : `/compatibility/${cMake}/${cModel}`;
                
                const response = await apiClient.get(compUrl);
                const compData = response.data;
                if (compData && Array.isArray(compData.products)) {
                    setProducts(compData.products);
                    setCompatibilityInfo(compData);
                    setTotalPages(1);
                    setTotalProducts(compData.totalCount || compData.products.length);
                    setSemanticInfo(null);
                } else {
                    setProducts([]);
                    setCompatibilityInfo(null);
                }
                return;
            }

            // Normal catalog query
            setCompatibilityInfo(null);
            const params = new URLSearchParams();
            params.append('page', currentPage.toString());
            params.append('limit', ITEMS_PER_PAGE.toString());
            if (searchQuery) params.append('q', searchQuery);
            if (selectedCategory !== 'All') params.append('category', selectedCategory);
            if (sortBy && sortBy !== 'featured') params.append('sort', sortBy);
            if (minPrice && !isNaN(Number(minPrice))) params.append('minPrice', minPrice);
            if (maxPrice && !isNaN(Number(maxPrice))) params.append('maxPrice', maxPrice);
            if (inStockOnly) params.append('inStock', 'true');
            
            const response = await apiClient.get(`/products?${params.toString()}`);
            const responseData = response.data;
            
            if (responseData.data && Array.isArray(responseData.data)) {
                const totalCount = responseData.meta?.total ?? responseData.data.length;
                setProducts(responseData.data);
                if (searchQuery) {
                    trackSearch(searchQuery, totalCount);
                }
                if (responseData.meta) {
                    setTotalPages(responseData.meta.pages || 1);
                    setTotalProducts(responseData.meta.total || 0);
                    setSemanticInfo(responseData.meta.semanticMatch || null);
                    setTypoCorrection(responseData.meta.typoCorrection || null);
                } else {
                    setSemanticInfo(null);
                    setTypoCorrection(null);
                }
            } else {
                setProducts([]);
                if (searchQuery) {
                    trackSearch(searchQuery, 0);
                }
                setSemanticInfo(null);
                setTypoCorrection(null);
            }
        } catch (error) {
            console.error('API Error', error);
            setError(true);
        } finally {
            setIsLoading(false);
        }
    };

    const timer = setTimeout(() => {
        fetchProducts();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, currentPage, compatibilityContext, sortBy, minPrice, maxPrice, inStockOnly]); 

  useEffect(() => {
      if (isFirstRender.current) {
          isFirstRender.current = false;
          return;
      }
      setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortBy, minPrice, maxPrice, inStockOnly]);

  // Autocomplete Suggestions: Fast debounce (180ms) when user types >= 2 characters
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSuggestions(null);
      setIsSuggestOpen(false);
      setIsSuggestLoading(false);
      setSelectedSuggestIndex(-1);
      return;
    }

    setIsSuggestLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/products/suggest?q=${encodeURIComponent(trimmed)}&limit=6`);
        if (res.data) {
          setSuggestions({
            products: res.data.products || [],
            categories: res.data.categories || [],
            vehicles: res.data.vehicles || [],
            correctedQuery: res.data.correctedQuery
          });
          setIsSuggestOpen(true);
          setSelectedSuggestIndex(-1);
        }
      } catch (err) {
        console.error('Failed to fetch search suggestions:', err);
      } finally {
        setIsSuggestLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close suggestions dropdown and price popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setIsSuggestOpen(false);
      }
      if (pricePopoverRef.current && !pricePopoverRef.current.contains(target)) {
        setIsPricePopoverOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleClearSearch = () => {
    setSearchQuery('');
    setSuggestions(null);
    setTypoCorrection(null);
    setIsSuggestOpen(false);
    setSelectedSuggestIndex(-1);
    searchInputRef.current?.focus();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSuggestOpen || !suggestions) {
      if (e.key === 'Escape') {
        setIsSuggestOpen(false);
      }
      return;
    }

    const productCount = suggestions.products.length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestIndex(prev => (prev < productCount - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestIndex(prev => (prev > 0 ? prev - 1 : productCount - 1));
    } else if (e.key === 'Enter') {
      if (selectedSuggestIndex >= 0 && selectedSuggestIndex < productCount) {
        e.preventDefault();
        onProductClick(suggestions.products[selectedSuggestIndex]);
        setIsSuggestOpen(false);
      } else {
        setIsSuggestOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsSuggestOpen(false);
    }
  };

  const displayProducts = useMemo(() => {
    let filtered = products;
    if (vinFilter) {
        filtered = filtered.filter(product => 
            product.compatibility.some((c: string) => c.toLowerCase().includes(vinFilter.toLowerCase()) || vinFilter.toLowerCase().includes(c.toLowerCase()))
        );
    }
    return filtered;
  }, [vinFilter, products]);

  const handlePageChange = (newPage: number, e?: React.MouseEvent) => {
      if (e) {
          e.preventDefault();
      }
      if (newPage >= 1 && newPage <= totalPages) {
          setCurrentPage(newPage);
          if (typeof window !== 'undefined') {
              const url = getPageUrl(newPage);
              window.history.pushState({ page: newPage }, '', url);
          }
          const listElement = document.getElementById('product-list-top');
          if (listElement) {
              listElement.scrollIntoView({ behavior: 'smooth' });
          }
      }
  };

  const handleCardClick = (e: React.MouseEvent, product: Product) => {
      e.preventDefault();
      trackProductView(product.name, product.category);
      onProductClick(product);
  };

  const ProductSkeleton = () => (
    <div className="bg-white rounded-2xl sm:rounded-[2.5rem] border border-gray-100 h-full flex flex-col animate-pulse overflow-hidden shadow-sm">
      <div className="h-36 xs:h-44 sm:h-64 md:h-72 bg-gray-100 w-full"></div>
      <div className="p-3 sm:p-6 md:p-8 flex-1 flex flex-col space-y-2 sm:space-y-4">
        <div className="h-4 sm:h-6 bg-gray-100 w-3/4 rounded-lg"></div>
        <div className="h-3 sm:h-4 bg-gray-100 w-1/2 rounded-lg"></div>
        <div className="hidden sm:block h-12 bg-gray-50 w-full rounded-xl"></div>
        <div className="flex justify-between items-center mt-auto pt-2 sm:pt-4">
            <div className="h-5 sm:h-8 bg-gray-100 w-16 sm:w-24 rounded-lg"></div>
            <div className="h-9 w-9 sm:h-12 sm:w-12 bg-gray-100 rounded-xl"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div id="product-list-top" className="max-w-screen-2xl mx-auto px-3 sm:px-6 lg:px-8 py-8 sm:py-16">
      {selectedCategory && selectedCategory !== 'All' && (
        <SEO
          title={`Genuine Masuma ${selectedCategory} in Nairobi, Kenya`}
          description={`Shop official Masuma ${selectedCategory} spare parts with a 12-month warranty in Nairobi, Kenya. Best prices on Japanese parts at Ruby Mall.`}
          keywords={`Masuma ${selectedCategory}, ${selectedCategory} Nairobi, ${selectedCategory} Kenya, buy ${selectedCategory} Kenya`}
          url={`https://masuma.africa/categories/${encodeURIComponent(selectedCategory)}${currentPage > 1 ? `?page=${currentPage}` : ''}`}
        />
      )}
      <SourcingModal isOpen={isSourcingOpen} onClose={() => setIsSourcingOpen(false)} />

      {compatibilityInfo ? (
        <div className="mb-10 p-6 sm:p-10 bg-gradient-to-br from-masuma-dark via-slate-950 to-black text-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-white/10">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-masuma-orange/15 rounded-full blur-3xl pointer-events-none"></div>

          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-400 mb-4 flex-wrap">
            <a href="/" className="hover:text-white transition">Home</a>
            <span>/</span>
            <a href="/catalog" className="hover:text-white transition">Catalog</a>
            <span>/</span>
            <span className="text-masuma-orange font-bold">{compatibilityInfo.make}</span>
            <span>/</span>
            <span className="text-white font-bold">{compatibilityInfo.model}</span>
            {compatibilityInfo.category && compatibilityInfo.category !== 'All Parts' && (
              <>
                <span>/</span>
                <span className="text-gray-300 font-semibold">{compatibilityInfo.category}</span>
              </>
            )}
          </nav>

          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-masuma-orange text-white rounded-full text-[11px] font-bold uppercase tracking-wider mb-3 shadow-md">
                <ShieldCheck size={16} /> Guaranteed Japanese Fitment
              </div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black font-display tracking-tight uppercase leading-tight">
                {compatibilityInfo.make} {compatibilityInfo.model} {compatibilityInfo.category && compatibilityInfo.category !== 'All Parts' ? compatibilityInfo.category : 'Spare Parts'}
              </h1>
              <p className="text-xs sm:text-sm text-gray-300 mt-2 font-normal leading-relaxed max-w-2xl">
                Precision Japanese aftermarket components engineered specifically for <strong>{compatibilityInfo.make} {compatibilityInfo.model}</strong>. Tested and verified for Kenyan road conditions, complete with our 12-month defect replacement warranty.
              </p>

              {/* Verified OEM Numbers Pills */}
              {compatibilityInfo.oemNumbers && compatibilityInfo.oemNumbers.length > 0 && (
                <div className="mt-5 pt-4 border-t border-white/10">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span>Verified OEM Cross-References:</span>
                    <span className="text-masuma-orange font-mono">({compatibilityInfo.oemNumbers.length} Codes)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto scrollbar-hide">
                    {compatibilityInfo.oemNumbers.map((oem) => (
                      <span 
                        key={oem} 
                        className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-gray-200 text-[10px] font-mono rounded-lg border border-white/10 tracking-wider transition cursor-default"
                        title="Manufacturer OEM Cross Reference"
                      >
                        OEM: {oem}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Trust Badges */}
            <div className="flex flex-col gap-3 bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 lg:w-80 shrink-0">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-gray-200">Ruby Mall CBD Pick-up Available</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-gray-200">Same-Day Dispatch Across Kenya</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-gray-200">12-Month Unlimited Mileage Warranty</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6">
          <div className="text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-masuma-orange/10 text-masuma-orange rounded-full mb-4">
                  <Filter size={14} />
                  <span className="text-xs font-bold uppercase tracking-widest">Local Inventory</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-masuma-dark mb-4 font-display uppercase tracking-tight">
                  {selectedCategory && selectedCategory !== 'All' ? `${selectedCategory} Parts` : 'Parts Catalog'}
              </h1>
              <p className="text-gray-600 max-w-2xl text-base font-normal leading-relaxed">
              Brand-new automotive replacement and maintenance parts engineered to OEM specifications for Kenyan road conditions. Verified fitment and 12-month defect replacement warranty.
              </p>
          </div>
        </div>
      )}

      <VinSearch onVehicleIdentified={setVinFilter} />

      {/* Modern Floating Search/Filter Bar */}
      <div className="sticky top-20 lg:top-24 z-30 bg-white/95 backdrop-blur-xl p-3 sm:p-4 shadow-2xl shadow-black/5 border border-gray-100 mb-8 sm:mb-12 rounded-2xl sm:rounded-3xl transition-all">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-stretch lg:items-center">
          <div ref={searchContainerRef} className="w-full lg:w-1/3 relative group">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by SKU, Name, or OEM..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim().length >= 2 && suggestions) {
                  setIsSuggestOpen(true);
                }
              }}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-12 pr-10 py-3 sm:py-4 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-masuma-orange rounded-xl sm:rounded-2xl outline-none text-base sm:text-xs font-bold transition-all focus-ring"
              aria-label="Search product catalog"
              role="combobox"
              aria-expanded={isSuggestOpen}
              aria-autocomplete="list"
            />
            {isSuggestLoading ? (
              <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 text-masuma-orange animate-spin" size={20} />
            ) : (
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-masuma-orange transition-colors" size={20} />
            )}
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-full transition-all"
                aria-label="Clear search query"
              >
                <X size={16} />
              </button>
            )}

            {/* Instant Suggestions Dropdown */}
            {isSuggestOpen && (suggestions || isSuggestLoading) && (
              <div 
                className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200/90 overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150 max-h-[85vh] sm:max-h-[480px] overflow-y-auto text-left"
                role="listbox"
              >
                {isSuggestLoading && !suggestions && (
                  <div className="p-6 text-center text-gray-400 text-xs flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin text-masuma-orange" />
                    <span>Searching catalog...</span>
                  </div>
                )}

                {suggestions && (
                  <>
                    {/* Typo Auto-Correction Hint in Dropdown */}
                    {suggestions.correctedQuery && (
                      <div className="px-3 py-2 bg-orange-50 border-b border-orange-100 flex items-center gap-1.5 text-xs text-masuma-orange font-bold">
                        <Sparkles size={13} className="shrink-0" />
                        <span>Showing matches for &ldquo;{suggestions.correctedQuery}&rdquo;</span>
                      </div>
                    )}

                    {/* Matching Categories */}
                    {suggestions.categories.length > 0 && (
                      <div className="p-3 border-b border-gray-100 bg-gray-50/60">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                          <Tag size={12} className="text-masuma-orange" />
                          <span>Matching Categories</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {suggestions.categories.map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                setSelectedCategory(cat);
                                setSearchQuery('');
                                setIsSuggestOpen(false);
                                if (onCategoryChange) onCategoryChange(cat);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-masuma-orange hover:text-white text-gray-700 rounded-lg border border-gray-200 transition-colors shadow-sm"
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Matching Vehicles */}
                    {suggestions.vehicles.length > 0 && (
                      <div className="p-3 border-b border-gray-100 bg-orange-50/40">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                          <Car size={12} className="text-masuma-orange" />
                          <span>Compatible Vehicles</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {suggestions.vehicles.map((veh) => (
                            <button
                              key={veh}
                              type="button"
                              onClick={() => {
                                setSearchQuery(veh);
                                setIsSuggestOpen(false);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-masuma-dark hover:text-white text-gray-700 rounded-lg border border-orange-200 transition-colors shadow-sm"
                            >
                              {veh}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Matching Products */}
                    {suggestions.products.length > 0 ? (
                      <div className="py-2">
                        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          Matching Products ({suggestions.products.length})
                        </div>
                        <div className="divide-y divide-gray-50">
                          {suggestions.products.map((prod, idx) => (
                            <div
                              key={prod.id}
                              onClick={() => {
                                onProductClick(prod);
                                setIsSuggestOpen(false);
                              }}
                              className={`px-3 py-2.5 flex items-center gap-3 cursor-pointer transition-colors ${
                                selectedSuggestIndex === idx
                                  ? 'bg-orange-50/80 border-l-4 border-masuma-orange pl-2'
                                  : 'hover:bg-gray-50'
                              }`}
                              role="option"
                              aria-selected={selectedSuggestIndex === idx}
                            >
                              <div className="w-11 h-11 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                {prod.image ? (
                                  <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" />
                                ) : (
                                  <ShoppingBag size={18} className="text-gray-300" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0 text-left">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-[10px] font-mono font-bold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                                    {prod.sku}
                                  </span>
                                  <span className="text-[10px] text-gray-500 truncate">
                                    {prod.category}
                                  </span>
                                </div>
                                <div className="text-xs font-bold text-gray-900 truncate">
                                  {prod.name}
                                </div>
                              </div>

                              <div className="text-right flex-shrink-0">
                                <div className="text-xs font-bold text-masuma-dark">
                                  <Price amount={prod.price} />
                                </div>
                                <div className="text-[10px] mt-0.5">
                                  {prod.stock ? (
                                    <span className="text-emerald-600 font-semibold inline-flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span> In Stock
                                    </span>
                                  ) : (
                                    <span className="text-amber-600 font-semibold inline-flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span> Pre-order
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      suggestions.categories.length === 0 && suggestions.vehicles.length === 0 && (
                        <div className="p-6 text-center">
                          <p className="text-xs font-bold text-gray-700 mb-1">
                            No matching parts found for "{searchQuery}"
                          </p>
                          <p className="text-[11px] text-gray-500">
                            Try checking the SKU, OEM number, or vehicle model.
                          </p>
                        </div>
                      )
                    )}

                    {/* View All Footer */}
                    <div 
                      onClick={() => setIsSuggestOpen(false)}
                      className="p-2.5 bg-gray-50 hover:bg-gray-100 border-t border-gray-100 text-center cursor-pointer transition-colors"
                    >
                      <span className="text-xs font-bold text-masuma-orange flex items-center justify-center gap-1.5">
                        <span>View all search results</span>
                        <ArrowRight size={13} />
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="w-full lg:w-2/3">
            <div className="flex overflow-x-auto pb-2 lg:pb-0 flex-nowrap gap-2 justify-start scrollbar-hide">
              {categories.map((cat) => (
                <a
                  key={cat}
                  href={cat === 'All' ? '/catalog' : `/categories/${encodeURIComponent(cat)}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedCategory(cat);
                    if (onCategoryChange) {
                      onCategoryChange(cat);
                    }
                  }}
                  className={`px-4 py-2.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-all duration-300 rounded-xl border-2 flex-shrink-0 cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-masuma-dark border-masuma-dark text-white shadow-lg shadow-masuma-dark/20 scale-105'
                      : 'bg-white border-gray-100 text-gray-500 hover:border-masuma-orange hover:text-masuma-orange hover:bg-masuma-orange/5'
                  }`}
                  aria-label={`Filter by ${cat}`}
                  aria-current={selectedCategory === cat ? 'page' : undefined}
                >
                  {cat}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Secondary Toolbar: Sorting, Price Filter & In-Stock Availability */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mr-1">
              {totalProducts} {totalProducts === 1 ? 'part' : 'parts'}
            </span>

            {/* In-Stock Only Pill */}
            <button
              type="button"
              onClick={() => setInStockOnly(!inStockOnly)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                inStockOnly
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-800 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
              aria-pressed={inStockOnly}
            >
              <span className={`w-2 h-2 rounded-full ${inStockOnly ? 'bg-emerald-500' : 'bg-gray-300'}`} />
              <span>In Stock Only</span>
            </button>

            {/* Price Filter Toggle Button */}
            <div className="relative" ref={pricePopoverRef}>
              <button
                type="button"
                onClick={() => setIsPricePopoverOpen(!isPricePopoverOpen)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                  minPrice || maxPrice
                    ? 'bg-orange-50 border-masuma-orange text-masuma-dark shadow-sm'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
                aria-expanded={isPricePopoverOpen}
              >
                <SlidersHorizontal size={13} className={minPrice || maxPrice ? 'text-masuma-orange' : 'text-gray-400'} />
                <span>
                  {minPrice || maxPrice
                    ? `${currency} ${minPrice || '0'} - ${maxPrice || '∞'}`
                    : 'Price Range'}
                </span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${isPricePopoverOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Price Filter Popover Card */}
              {isPricePopoverOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-40 animate-in fade-in zoom-in-95 duration-150">
                  <div className="text-xs font-bold text-gray-900 mb-2 flex items-center justify-between">
                    <span>Filter by Price ({currency})</span>
                    {(tempMinPrice || tempMaxPrice) && (
                      <button
                        type="button"
                        onClick={() => {
                          setTempMinPrice('');
                          setTempMaxPrice('');
                        }}
                        className="text-[10px] text-gray-400 hover:text-masuma-orange font-bold uppercase tracking-wider"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Min</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={tempMinPrice}
                        onChange={(e) => setTempMinPrice(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold focus:border-masuma-orange focus:bg-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Max</label>
                      <input
                        type="number"
                        placeholder="Any"
                        value={tempMaxPrice}
                        onChange={(e) => setTempMaxPrice(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold focus:border-masuma-orange focus:bg-white outline-none"
                      />
                    </div>
                  </div>

                  {/* Quick Price Presets */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {[
                      { label: '< 2,000', min: '', max: '2000' },
                      { label: '2k - 5k', min: '2000', max: '5000' },
                      { label: '5k - 15k', min: '5000', max: '15000' },
                      { label: '> 15,000', min: '15000', max: '' },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setTempMinPrice(preset.min);
                          setTempMaxPrice(preset.max);
                        }}
                        className="px-2 py-0.5 text-[10px] font-bold bg-gray-100 hover:bg-orange-50 hover:text-masuma-orange text-gray-600 rounded-md transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMinPrice(tempMinPrice);
                        setMaxPrice(tempMaxPrice);
                        setIsPricePopoverOpen(false);
                      }}
                      className="flex-1 py-1.5 bg-masuma-orange text-white text-xs font-bold rounded-xl shadow-md hover:bg-masuma-orange/90 transition-all"
                    >
                      Apply
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPricePopoverOpen(false);
                        setTempMinPrice(minPrice);
                        setTempMaxPrice(maxPrice);
                      }}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Active Filters Reset Pill */}
            {(sortBy !== 'featured' || minPrice || maxPrice || inStockOnly) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-gray-500 hover:text-masuma-orange bg-gray-100 hover:bg-orange-50 rounded-lg transition-colors"
                title="Reset all filters to default"
              >
                <RotateCcw size={11} />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Sort Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1 hover:border-masuma-orange transition-colors">
            <ArrowUpDown size={13} className="text-masuma-orange flex-shrink-0" />
            <label htmlFor="catalog-sort" className="text-[11px] font-bold text-gray-400 uppercase tracking-wider hidden sm:inline">
              Sort:
            </label>
            <select
              id="catalog-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent font-bold text-gray-800 text-xs outline-none cursor-pointer pr-1"
              aria-label="Sort products by"
            >
              <option value="featured">Featured & Best Match</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Newest Arrivals</option>
              <option value="rating">Highest Rated</option>
              <option value="name_asc">Name: A to Z</option>
            </select>
          </div>
        </div>
      </div>

      {compatibilityInfo?.crossSell?.products && compatibilityInfo.crossSell.products.length > 0 && (
        <div className="mb-8 p-5 sm:p-6 bg-gradient-to-r from-orange-50/80 via-amber-50/50 to-orange-50/80 border border-orange-200/80 rounded-2xl sm:rounded-3xl shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-masuma-orange">
                <Sparkles size={14} /> Recommended Wear-and-Tear Companions
              </div>
              <p className="text-xs text-gray-600 mt-1 max-w-3xl">
                {compatibilityInfo.crossSell.reason}
              </p>
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest self-start sm:self-center">
              Direct Cart Bundling
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {compatibilityInfo.crossSell.products.map(cp => (
              <div key={cp.id} className="bg-white rounded-2xl p-3 border border-orange-100 flex flex-col justify-between hover:shadow-lg transition group/companion">
                <div 
                  onClick={() => onProductClick(cp)} 
                  className="cursor-pointer flex flex-col items-center text-center"
                >
                  <div className="h-24 w-full flex items-center justify-center p-1 bg-gray-50 rounded-xl mb-2 overflow-hidden">
                    <ProductImage 
                      src={cp.image} 
                      sku={cp.sku} 
                      alt={cp.name} 
                      className="max-h-20 max-w-full object-contain group-hover/companion:scale-105 transition duration-300" 
                    />
                  </div>
                  <span className="text-[10px] font-bold text-masuma-dark line-clamp-2 h-7 leading-tight uppercase">
                    {cp.name}
                  </span>
                  <span className="text-xs font-black text-masuma-orange mt-1">
                    KES {Number(cp.price).toLocaleString()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    trackAddToCart(cp.name, cp.price);
                    addToCart(cp);
                  }}
                  className="mt-2.5 w-full py-1.5 bg-masuma-dark hover:bg-masuma-orange text-white text-[10px] font-bold uppercase rounded-lg transition active:scale-95 flex items-center justify-center gap-1 shadow-sm"
                >
                  <ShoppingBag size={11} /> + Add to Cart
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {typoCorrection && (
        <div className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200 text-masuma-dark">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-masuma-orange text-white rounded-xl shadow-sm shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-masuma-dark text-white px-2 py-0.5 rounded">
                  Spelling Auto-Corrected
                </span>
                <span className="text-xs font-bold text-gray-800">
                  Showing results for: <strong className="text-masuma-orange font-black text-sm">{typoCorrection.correctedQuery}</strong>
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                No exact parts matched &ldquo;{typoCorrection.originalQuery}&rdquo;. Results shown for corrected automotive term.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setTypoCorrection(null);
            }}
            className="text-[11px] font-bold text-gray-600 hover:text-masuma-orange bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-sm transition-all self-start sm:self-center"
          >
            Search instead for &ldquo;{typoCorrection.originalQuery}&rdquo;
          </button>
        </div>
      )}

      {semanticInfo && (
        <div className="mb-6 p-4 bg-gradient-to-r from-masuma-orange/10 via-amber-50 to-orange-50 border border-masuma-orange/30 rounded-2xl animate-fade-in flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-masuma-dark">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-masuma-orange text-white rounded-xl shadow-sm shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-masuma-orange text-white px-2 py-0.5 rounded">
                  Semantic Match
                </span>
                {semanticInfo.detectedSymptom && (
                  <span className="text-xs font-bold text-gray-800">
                    Symptom: <strong className="text-masuma-dark font-black">{semanticInfo.detectedSymptom}</strong>
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Showing genuine Masuma components ({semanticInfo.suggestedParts?.join(', ') || 'related parts'}) matched to "{semanticInfo.originalQuery}".
              </p>
            </div>
          </div>
          <button
            onClick={() => setSearchQuery('')}
            className="text-[11px] font-bold text-masuma-orange hover:text-orange-700 transition underline whitespace-nowrap self-end sm:self-center"
          >
            Clear Search
          </button>
        </div>
      )}

      {error && (
           <div className="flex flex-col items-center justify-center py-24 text-center bg-red-50/50 rounded-3xl border border-red-100">
                <div className="p-8 bg-white rounded-full mb-6 text-red-500 shadow-xl shadow-red-500/10"><AlertCircle size={56} /></div>
                <h3 className="text-xl font-bold text-masuma-dark font-display uppercase tracking-tight">Database Offline</h3>
                <p className="text-gray-500 mb-8 max-w-xs mx-auto">We're experiencing a temporary connection issue with our warehouse servers.</p>
                <button onClick={() => window.location.reload()} className="px-10 py-3 bg-masuma-dark text-white rounded-xl font-bold uppercase text-xs tracking-[0.2em] shadow-lg hover:bg-masuma-orange transition-all">Reconnect</button>
           </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-6 lg:gap-8">
           {[1,2,3,4,5,6,7,8,9,10].map(i => <ProductSkeleton key={i} />)}
        </div>
      ) : !error && displayProducts.length === 0 ? (
        <div className="text-center py-24 bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center">
          <div className="inline-flex p-8 bg-white rounded-full shadow-xl mb-8">
            <Search className="text-masuma-orange opacity-20" size={56} />
          </div>
          <h3 className="text-2xl font-bold text-masuma-dark font-display uppercase tracking-tight">No Match Found</h3>
          <p className="text-gray-500 max-w-md mx-auto mt-2 mb-10 text-lg font-light leading-relaxed">
            We couldn't find a match for "{searchQuery}" {vinFilter && `for ${vinFilter}`}.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
              <button 
                onClick={() => {setSearchQuery(''); setSelectedCategory('All'); setVinFilter('');}}
                className="px-8 py-4 bg-white border border-gray-200 text-gray-500 font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-gray-100 transition shadow-sm"
              >
                Reset Filters
              </button>
              
              <button 
                onClick={() => setIsSourcingOpen(true)}
                className="px-10 py-4 bg-masuma-orange text-white font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-masuma-dark transition shadow-xl shadow-masuma-orange/20 flex items-center gap-2"
              >
                <Plane size={16} className="transform -rotate-45" /> Request Special Sourcing
              </button>
          </div>
        </div>
      ) : !error && (
        <>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-6 lg:gap-8">
            {displayProducts.map((product) => (
                <div 
                    key={product.id}
                    className="group bg-white border border-gray-100 hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1.5 transition-all duration-500 flex flex-col h-full relative overflow-hidden rounded-2xl sm:rounded-[2.5rem] shadow-sm"
                    onContextMenu={(e) => e.preventDefault()}
                >
                    {/* Upper Interactive Area -> Opens QuickView */}
                    <a 
                        href={`/products/${generateSlug(product.name, product.sku)}`}
                        onClick={(e) => handleCardClick(e, product)}
                        className="flex flex-col flex-1 block focus:outline-none cursor-pointer"
                        aria-label={`View details for ${product.name}`}
                    >
                        {/* Enhanced Responsive Image Container */}
                        <div className="relative h-36 xs:h-44 sm:h-64 md:h-72 bg-gradient-to-br from-gray-50 to-white p-2.5 sm:p-6 md:p-8 flex items-center justify-center overflow-hidden rounded-t-2xl sm:rounded-t-[2.5rem] border-b border-gray-50 select-none">
                            <ProductImage 
                              src={product.image || (product as any).images?.[0]} 
                              sku={product.sku}
                              alt={`${product.name} - Masuma Genuine Part Kenya`} 
                              priority={currentPage === 1 && displayProducts.indexOf(product) < 2}
                              className="w-full h-full max-h-28 xs:max-h-36 sm:max-h-56 md:max-h-64 object-contain transform group-hover:scale-105 transition duration-700 ease-out drop-shadow-md sm:drop-shadow-xl"
                            />
                            
                            {/* Watermark overlay */}
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] transition-opacity group-hover:opacity-[0.06]">
                                <svg width="100%" height="100%">
                                    <pattern id={`wm-card-${product.id}`} x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
                                        <text x="0" y="60" className="font-display font-bold text-[10px] uppercase tracking-widest fill-masuma-dark">MASUMA EA LTD</text>
                                    </pattern>
                                    <rect width="100%" height="100%" fill={`url(#wm-card-${product.id})`} />
                                </svg>
                            </div>

                            {/* Gloss Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none"></div>

                            {/* Badges */}
                            <div className="absolute top-2 left-2 right-2 sm:top-5 sm:left-5 sm:right-5 flex justify-between items-start gap-1">
                                <div className="flex items-center gap-1.5 flex-wrap max-w-[75%]">
                                    <span className="bg-white/95 backdrop-blur-md text-masuma-dark text-[8px] sm:text-xs font-bold px-2 py-0.5 sm:px-3 sm:py-1 rounded-full uppercase tracking-wider border border-gray-100 shadow-sm truncate">
                                        {product.category}
                                    </span>
                                    {Boolean(product.videoUrl && product.videoUrl.trim()) && (
                                        <span className="bg-masuma-dark/90 backdrop-blur-md text-white text-[8px] sm:text-[10px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full uppercase tracking-wider border border-white/20 shadow-sm flex items-center gap-1 shrink-0">
                                            <Play size={8} className="fill-masuma-orange text-masuma-orange" /> Video
                                        </span>
                                    )}
                                </div>
                                {!product.stock && (
                                    <span className="bg-red-500 text-white text-[8px] sm:text-xs font-bold px-2 py-0.5 sm:px-3 sm:py-1 rounded-full uppercase tracking-wider shadow-sm shrink-0">
                                        Out
                                    </span>
                                )}
                            </div>

                            {/* Desktop Hover Quick View */}
                            <div className="hidden sm:flex absolute inset-0 bg-masuma-dark/60 items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-sm">
                                <span 
                                    className="bg-white text-masuma-dark hover:bg-masuma-orange hover:text-white px-6 py-3 font-bold uppercase text-[10px] tracking-[0.2em] flex items-center gap-2 transform translate-y-6 group-hover:translate-y-0 transition-all duration-300 shadow-xl rounded-xl active:scale-95"
                                >
                                    <Eye size={14} /> Quick View
                                </span>
                            </div>
                        </div>

                        {/* Card Details Area */}
                        <div className="p-3 sm:p-6 md:p-8 flex-1 flex flex-col">
                            <div className="mb-2 sm:mb-4">
                                <div className="flex items-center gap-1.5 mb-1 sm:mb-2">
                                    <div className="w-1.5 h-1.5 bg-masuma-orange rounded-full"></div>
                                    <span className="text-[9px] sm:text-xs font-bold text-gray-600 uppercase tracking-wider truncate">OEM Spec</span>
                                </div>
                                <h3 className="text-xs sm:text-sm font-bold text-masuma-dark leading-tight font-display group-hover:text-masuma-orange transition-colors line-clamp-2 min-h-[2.5rem] sm:min-h-[2.75rem] md:min-h-[3rem] h-auto uppercase tracking-tight">
                                    {product.name}
                                </h3>
                                <div className="flex items-center justify-between mt-1 sm:mt-2">
                                    <p className="text-[9px] sm:text-[10px] text-gray-500 font-bold tracking-wider uppercase truncate">SKU: {product.sku}</p>
                                    <div className="flex items-center gap-0.5 shrink-0">
                                        <Star size={10} className="fill-amber-400 text-amber-400" />
                                        <span className="text-[9px] sm:text-[11px] font-bold text-masuma-dark">{product.averageRating ? product.averageRating.toFixed(1) : '5.0'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Compatibility Box (Tablet / Desktop) */}
                            <div className="mt-auto">
                                <div className="hidden sm:flex p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100/50 mb-2 flex-col justify-center group-hover:bg-white group-hover:border-masuma-orange/20 transition-colors">
                                    <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-1">Compatibility:</p>
                                    <p className="text-[9px] sm:text-[10px] text-gray-700 line-clamp-1 font-semibold uppercase tracking-tight" title={(product.compatibility || []).join(', ')}>
                                        {(product.compatibility || []).join(', ')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </a>

                    {/* Dedicated Bottom Action Bar - Isolated from card navigation to guarantee reliable taps */}
                    <div className="px-3 pb-3 sm:px-6 sm:pb-6 md:px-8 md:pb-8 pt-0">
                        <div className="flex items-center justify-between border-t border-gray-100 pt-2 sm:pt-3">
                            <div className="flex flex-col">
                                <span className="text-xs sm:text-lg md:text-xl font-bold text-masuma-dark tracking-tight">
                                    <Price amount={product.price} />
                                </span>
                                <span className="text-[8px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-wider leading-none mt-0.5">Excl. VAT</span>
                            </div>
                            
                            <button
                                type="button"
                                onClick={(e) => { 
                                    e.preventDefault(); 
                                    e.stopPropagation(); 
                                    trackAddToCart(product.name, product.price);
                                    addToCart(product); 
                                }}
                                onTouchEnd={(e) => {
                                    e.stopPropagation();
                                }}
                                disabled={!product.stock}
                                className={`min-h-[44px] h-11 sm:h-12 md:h-14 px-3.5 sm:px-4 rounded-xl sm:rounded-2xl transition-all duration-300 shadow-md flex items-center justify-center gap-1.5 focus-ring touch-target ${
                                    product.stock 
                                    ? 'bg-masuma-dark text-white hover:bg-masuma-orange active:scale-95 shadow-masuma-dark/15' 
                                    : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                }`}
                                aria-label={`Add ${product.name} to cart`}
                            >
                                <ShoppingBag size={15} className="sm:w-5 sm:h-5 transition-transform" />
                                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider hidden xs:inline sm:inline">
                                    Add
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            ))}
            </div>

            {/* Modern Curved Pagination */}
            {totalPages > 1 && (
                <div className="mt-20 flex flex-col items-center gap-6">
                    <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-2xl border border-gray-100">
                        <a 
                            href={currentPage > 1 ? getPageUrl(currentPage - 1) : '#'}
                            onClick={(e) => {
                                if (currentPage <= 1) {
                                    e.preventDefault();
                                    return;
                                }
                                handlePageChange(currentPage - 1, e);
                            }}
                            aria-disabled={currentPage === 1}
                            className={`p-3 bg-white border border-gray-100 rounded-xl transition-all shadow-sm focus-ring touch-target flex items-center justify-center ${
                                currentPage === 1 
                                ? 'opacity-30 cursor-not-allowed pointer-events-none' 
                                : 'hover:bg-masuma-orange hover:text-white text-masuma-dark'
                            }`}
                            aria-label="Previous page"
                        >
                            <ChevronLeft size={22} />
                        </a>
                        
                        <div className="flex gap-1 px-4">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pNum = i + 1;
                                if (totalPages > 5) {
                                    if (currentPage > 3) pNum = currentPage - 2 + i;
                                    if (pNum > totalPages) pNum = totalPages - (4 - i);
                                }
                                
                                return (
                                    <a
                                        key={pNum}
                                        href={getPageUrl(pNum)}
                                        onClick={(e) => handlePageChange(pNum, e)}
                                        className={`w-12 h-12 text-xs font-black rounded-xl transition-all focus-ring touch-target flex items-center justify-center ${
                                            currentPage === pNum 
                                            ? 'bg-masuma-dark text-white shadow-xl shadow-masuma-dark/20' 
                                            : 'bg-transparent text-gray-600 hover:text-masuma-dark hover:bg-gray-100'
                                        }`}
                                        aria-label={`Go to page ${pNum}`}
                                        aria-current={currentPage === pNum ? 'page' : undefined}
                                    >
                                        {pNum}
                                    </a>
                                );
                            })}
                        </div>

                        <a 
                            href={currentPage < totalPages ? getPageUrl(currentPage + 1) : '#'}
                            onClick={(e) => {
                                if (currentPage >= totalPages) {
                                    e.preventDefault();
                                    return;
                                }
                                handlePageChange(currentPage + 1, e);
                            }}
                            aria-disabled={currentPage === totalPages}
                            className={`p-3 bg-white border border-gray-100 rounded-xl transition-all shadow-sm focus-ring touch-target flex items-center justify-center ${
                                currentPage === totalPages 
                                ? 'opacity-30 cursor-not-allowed pointer-events-none' 
                                : 'hover:bg-masuma-orange hover:text-white text-masuma-dark'
                            }`}
                            aria-label="Next page"
                        >
                            <ChevronRight size={22} />
                        </a>
                    </div>
                    <div className="text-[10px] text-gray-600 font-black uppercase tracking-[0.3em]">
                        Page {currentPage} of {totalPages} • {totalProducts} items
                    </div>
                </div>
            )}
        </>
      )}
    </div>
  );
};

export default ProductList;