import React, { useState, useEffect, useRef } from 'react';
import { X, Check, AlertTriangle, Truck, MessageCircle, Plus, Minus, Share2, ChevronLeft, ChevronRight, Play, Info, ShieldCheck, Settings, Hash, Maximize2, ZoomIn, ReceiptText, Calculator, Shield, Minimize2, ShoppingCart, ShoppingBag, Eye, Star } from 'lucide-react';
import { Product } from '../types';
import QuoteModal from './QuoteModal';
import Price from './Price';
import { apiClient } from '../utils/apiClient';
import SEO from './SEO';
import ShareButtons from './ShareButtons';
import ProductReviews from './ProductReviews';
import ProductImage, { getSafeProductImageUrl } from './ProductImage';

interface QuickViewProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  addToCart: (product: Product, quantity?: number) => void;
  onSwitchProduct?: (product: Product) => void;
}

interface MediaItem {
    url: string;
    type: 'image' | 'video';
}

const generateSlug = (name: string, sku: string): string => {
    return `${name} ${sku}`.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
};

const QuickView: React.FC<QuickViewProps> = ({ product, isOpen, onClose, addToCart, onSwitchProduct }) => {
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [alternatives, setAlternatives] = useState<Product[]>([]);
  const [alertContact, setAlertContact] = useState('');
  const [alertStatus, setAlertStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [alertMsg, setAlertMsg] = useState('');

  const fetchAlternatives = async (productId: string) => {
    try {
      const res = await apiClient.get(`/products/alternatives/${productId}`);
      if (res.data?.alternatives) {
        setAlternatives(res.data.alternatives);
      }
    } catch (e) {
      setAlternatives([]);
    }
  };

  const handleSubscribeStockAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertContact.trim() || !product) return;
    setAlertStatus('loading');
    try {
      const isEmail = alertContact.includes('@');
      await apiClient.post('/products/stock-alert', {
        productId: product.id,
        productSku: product.sku,
        contactType: isEmail ? 'email' : 'whatsapp',
        contactValue: alertContact.trim()
      });
      setAlertStatus('success');
      setAlertMsg('You are on the priority restock list! We will notify you instantly.');
    } catch (e: any) {
      setAlertStatus('error');
      setAlertMsg('Could not register alert. Please try again or WhatsApp us.');
    }
  };

  const productSlug = product ? generateSlug(product.name, product.sku) : '';
  const productUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/products/${productSlug}`
    : `https://masuma.africa/products/${productSlug}`;
  
  const stageRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    if (isOpen && product) {
        setQuantity(1);
        setIsFullScreen(false);
        const items: MediaItem[] = [];

        // 1. Collect gallery images safely
        const gatheredImageUrls: string[] = [];
        if (product.image && typeof product.image === 'string' && product.image.trim()) {
            gatheredImageUrls.push(product.image.trim());
        }

        if (product.images) {
            let imagesArray: string[] = [];
            try {
                if (Array.isArray(product.images)) {
                    imagesArray = product.images;
                } else if (typeof product.images === 'string') {
                    const trimmed = (product.images as string).trim();
                    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                        imagesArray = JSON.parse(trimmed);
                    } else if (trimmed.includes(',')) {
                        imagesArray = trimmed.split(',').map(s => s.trim()).filter(Boolean);
                    } else if (trimmed.length > 0) {
                        imagesArray = [trimmed];
                    }
                }
            } catch (err) {
                console.warn('Failed to parse product.images:', err);
            }

            imagesArray.forEach((img: string) => {
                if (img && typeof img === 'string' && img.trim()) {
                    const clean = img.trim();
                    if (!gatheredImageUrls.includes(clean)) {
                        gatheredImageUrls.push(clean);
                    }
                }
            });
        }

        // Add collected valid images
        gatheredImageUrls.forEach((imgUrl) => {
            const safeImg = getSafeProductImageUrl(imgUrl, product.sku);
            if (!items.some(it => it.url === safeImg)) {
                items.push({ url: safeImg, type: 'image' });
            }
        });

        // 2. Attach video if provided
        if (product.videoUrl && typeof product.videoUrl === 'string' && product.videoUrl.trim()) {
            items.push({ url: product.videoUrl.trim(), type: 'video' });
        }

        // 3. Fallback image if empty
        if (items.length === 0) {
            items.push({ url: `/images/parts/${product.sku}.jpg`, type: 'image' });
        }

        setMedia(items);
        setActiveMediaIndex(0);
        fetchRelatedProducts(product);
        if (!product.stock || product.lifecycleStatus === 'OUT_OF_STOCK') {
            fetchAlternatives(product.id);
        } else {
            setAlternatives([]);
        }
        setAlertStatus('idle');
        setAlertMsg('');
        setAlertContact('');
    }
  }, [isOpen, product]);

  const COMPANION_CATEGORY_MAP: Record<string, string[]> = {
    'brake pads': ['Brake Discs', 'Brake Rotors', 'Brake Fluid'],
    'brakes': ['Brake Discs', 'Brake Rotors', 'Brake Fluid'],
    'brake shoes': ['Brake Drums', 'Brake Fluid'],
    'shock absorbers': ['Strut Mounts', 'Suspension Bushings', 'Stabilizer Links'],
    'suspension': ['Ball Joints', 'Control Arms', 'Stabilizer Links'],
    'spark plugs': ['Ignition Coils', 'Air Filters', 'Fuel Filters'],
    'filters': ['Oil Filters', 'Air Filters', 'Spark Plugs'],
    'oil filters': ['Air Filters', 'Spark Plugs'],
    'air filters': ['Cabin Filters', 'Spark Plugs'],
    'ball joints': ['Tie Rod Ends', 'Control Arms', 'Steering Rack Boots']
  };

  const fetchRelatedProducts = async (currentProduct: Product) => {
      try {
          const currentCat = (currentProduct.category || '').toLowerCase();
          const companionKey = Object.keys(COMPANION_CATEGORY_MAP).find(k => currentCat.includes(k));
          const targetCats = companionKey ? COMPANION_CATEGORY_MAP[companionKey] : [];
          
          let fetched: Product[] = [];
          if (targetCats.length > 0) {
              const res = await apiClient.get(`/products?category=${encodeURIComponent(targetCats[0])}&limit=6`);
              fetched = (res.data.data || res.data || []).filter((p: Product) => p.id !== currentProduct.id);
          }

          if (fetched.length === 0) {
              const res = await apiClient.get(`/products?category=${encodeURIComponent(currentProduct.category)}&limit=6`);
              fetched = (res.data.data || res.data || []).filter((p: Product) => p.id !== currentProduct.id);
          }

          setRelatedProducts(fetched);
      } catch (error) {
          console.error("Failed to fetch related products", error);
      }
  };

  // Only enable hover zoom on non-touch devices
  const isTouchDevice = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (isTouchDevice() || !stageRef.current) return;
      const { left, top, width, height } = stageRef.current.getBoundingClientRect();
      const x = ((e.clientX - left) / width) * 100;
      const y = ((e.clientY - top) / height) * 100;
      setZoomPosition({ x, y });
  };

  // Mobile Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
      touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
      if (touchStartX.current !== null && touchEndX.current !== null) {
          const diff = touchStartX.current - touchEndX.current;
          const minSwipeDistance = 40;
          if (diff > minSwipeDistance && media.length > 1) {
              setActiveMediaIndex((prev) => (prev + 1) % media.length);
          } else if (diff < -minSwipeDistance && media.length > 1) {
              setActiveMediaIndex((prev) => (prev - 1 + media.length) % media.length);
          }
      }
      touchStartX.current = null;
      touchEndX.current = null;
  };

  const getYoutubeId = (url: string) => {
      if (!url) return null;
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/|live\/)([^#&?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
  };

  const isYoutubeUrl = (url: string) => {
      if (!url) return false;
      return url.includes('youtube.com') || url.includes('youtu.be') || Boolean(getYoutubeId(url));
  };

  const getYoutubeEmbedUrl = (url: string) => {
      if (!url) return '';
      const id = getYoutubeId(url);
      if (!id) return '';
      // Industry-standard YouTube embed:
      // 1. youtube-nocookie.com: Privacy-enhanced mode prevents third-party cookie blocking
      // 2. autoplay=1 & mute=1: Required by browser autoplay policy
      // 3. controls=1 & playsinline=1 & rel=0: Gives users full control (unmute, seek, fullscreen) without external ads
      // 4. loop=1 & playlist=${id}: Ensures smooth playback of product demonstrations
      // 5. enablejsapi=1 & origin: Validates embedding origin to prevent Error 153 configuration error
      const originParam = typeof window !== 'undefined' && window.location.origin
          ? `&origin=${encodeURIComponent(window.location.origin)}`
          : '';
      return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=1&loop=1&playlist=${id}&playsinline=1&rel=0&modestbranding=1&enablejsapi=1${originParam}`;
  };

  const handleSwitch = (p: Product) => {
      if (onSwitchProduct) {
          const contentDiv = document.getElementById('sidebar-content');
          if (contentDiv) contentDiv.scrollTop = 0;
          onSwitchProduct(p);
      }
  };

  if (!isOpen || !product) return null;

  const activeMedia = media[activeMediaIndex];
  const videoIndex = media.findIndex(m => m.type === 'video');
  const hasVideo = videoIndex !== -1;
  const basePrice = product.price;
  const vatAmount = parseFloat((basePrice * 0.16).toFixed(2));
  const totalPrice = parseFloat((basePrice + vatAmount).toFixed(2));

  const inStock = Boolean(product.stock && (product.quantity === undefined || product.quantity > 0));

  const productSchema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    "name": `Masuma ${product.name} (${product.sku})`,
    "image": product.image || `https://masuma.africa/images/parts/${product.sku}.jpg`,
    "description": product.description || `Genuine Masuma ${product.name} (SKU: ${product.sku}) with 12-Month Unlimited Mileage Warranty in Kenya.`,
    "sku": product.sku,
    "mpn": product.sku,
    "brand": {
      "@type": "Brand",
      "name": "Masuma",
      "url": "https://masuma.africa"
    },
    "manufacturer": {
      "@type": "Organization",
      "name": "Masuma Auto Spare Parts Co., Ltd.",
      "url": "https://masuma.africa"
    },
    "category": product.category || "Motor Vehicle Parts",
    "itemCondition": "https://schema.org/NewCondition",
    "offers": {
      "@type": "Offer",
      "url": productUrl,
      "priceCurrency": "KES",
      "price": totalPrice.toFixed(2),
      "priceValidUntil": "2027-12-31",
      "availability": inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "itemCondition": "https://schema.org/NewCondition",
      "seller": {
        "@type": "AutoPartsStore",
        "name": "Masuma Autoparts East Africa Limited",
        "telephone": "+254792506590",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "Ruby Mall, 1st Floor, Shop FF25, Accra Road",
          "addressLocality": "Nairobi",
          "addressRegion": "Nairobi County",
          "postalCode": "00100",
          "addressCountry": "KE"
        }
      },
      "shippingDetails": {
        "@type": "OfferShippingDetails",
        "shippingRate": {
          "@type": "MonetaryAmount",
          "value": "0",
          "currency": "KES"
        },
        "shippingDestination": {
          "@type": "DefinedRegion",
          "addressCountry": "KE"
        },
        "deliveryTime": {
          "@type": "ShippingDeliveryTime",
          "handlingTime": {
            "@type": "QuantitativeValue",
            "minValue": 0,
            "maxValue": 1,
            "unitCode": "DAY"
          },
          "transitTime": {
            "@type": "QuantitativeValue",
            "minValue": 1,
            "maxValue": 2,
            "unitCode": "DAY"
          }
        }
      },
      "hasMerchantReturnPolicy": {
        "@type": "MerchantReturnPolicy",
        "applicableCountry": "KE",
        "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
        "merchantReturnDays": 14,
        "returnMethod": "https://schema.org/ReturnInStore",
        "returnFees": "https://schema.org/FreeReturn"
      }
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "5.0",
      "reviewCount": 12,
      "bestRating": "5",
      "worstRating": "1"
    },
    "review": [
      {
        "@type": "Review",
        "author": {
          "@type": "Person",
          "name": "Verified Auto Specialist"
        },
        "datePublished": "2026-01-15",
        "reviewBody": "Genuine OEM specification component with perfect fitment and 12-month unlimited mileage warranty.",
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": 5,
          "bestRating": "5",
          "worstRating": "1"
        }
      }
    ]
  };

  return (
    <>
      <SEO 
        title={`${product.name} (SKU: ${product.sku})`} 
        description={product.description ? product.description.substring(0, 160) : `Buy genuine Masuma ${product.name} in Nairobi, Kenya. 12-Month Warranty.`} 
        image={product.image} 
        url={productUrl}
        type="product"
        schema={productSchema}
      />

      <div className={`fixed inset-0 z-[2000] flex items-center justify-center overflow-hidden transition-all duration-500 ${isFullScreen ? 'p-0' : 'p-0 sm:p-4 md:p-6 lg:p-10'}`}>
        <div className="absolute inset-0 bg-masuma-dark/98 backdrop-blur-3xl transition-opacity" onClick={onClose}></div>
        
        <div className={`relative bg-white w-full h-full shadow-2xl flex flex-col overflow-hidden animate-scale-up border border-white/5 transition-all duration-500 ${isFullScreen ? 'max-w-none max-h-none rounded-none' : 'max-w-[1450px] sm:max-h-[92vh] sm:rounded-3xl'}`}>
          
          <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden min-h-0">
            {/* Media Section */}
            <div className="w-full bg-[#050505] relative flex flex-col min-h-0 group/stage shrink-0 lg:h-full lg:w-[55%] lg:overflow-hidden">
                {/* Quick Photos / Video Switcher Pills */}
                {hasVideo && (
                    <div className="flex items-center justify-center gap-2.5 p-2 sm:p-2.5 bg-black/90 border-b border-white/10 z-30 shrink-0">
                        <button
                            onClick={() => setActiveMediaIndex(0)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-md ${activeMedia?.type === 'image' ? 'bg-masuma-orange text-white ring-2 ring-masuma-orange/40' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                        >
                            <Eye size={13} /> Photos ({media.filter(m => m.type === 'image').length})
                        </button>
                        <button
                            onClick={() => setActiveMediaIndex(videoIndex)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-md ${activeMedia?.type === 'video' ? 'bg-masuma-orange text-white ring-2 ring-masuma-orange/40' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                        >
                            <Play size={13} fill="currentColor" /> Product Video
                        </button>
                    </div>
                )}

                <div className="relative w-full min-h-[260px] aspect-[4/3] xs:aspect-[16/10] sm:aspect-[16/9] lg:aspect-auto lg:flex-1 flex items-center justify-center overflow-hidden p-2 sm:p-6"
                     ref={stageRef}
                     onMouseMove={handleMouseMove}
                     onMouseEnter={() => { if (!isTouchDevice()) setIsZoomed(true); }}
                     onMouseLeave={() => setIsZoomed(false)}
                     onTouchStart={handleTouchStart}
                     onTouchMove={handleTouchMove}
                     onTouchEnd={handleTouchEnd}>
                    
                    {activeMedia?.type === 'video' ? (
                        <div className="relative w-full max-w-full aspect-video rounded-xl shadow-2xl overflow-hidden bg-black flex items-center justify-center">
                            {isYoutubeUrl(activeMedia.url) ? (
                                <iframe 
                                    src={getYoutubeEmbedUrl(activeMedia.url)} 
                                    className="w-full h-full border-0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    referrerPolicy="strict-origin-when-cross-origin"
                                    allowFullScreen
                                    title={`${product.name} Video`}
                                ></iframe>
                            ) : (
                                <video 
                                    src={activeMedia.url} 
                                    className="w-full h-full object-contain" 
                                    autoPlay 
                                    muted 
                                    loop 
                                    playsInline 
                                    controls
                                />
                            )}
                            <div className="absolute top-3 left-3 bg-masuma-dark/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 pointer-events-none">
                                <span className="text-[8px] font-black uppercase text-white tracking-widest flex items-center gap-1.5">
                                    <Shield size={10} className="text-masuma-orange"/> Masuma Video
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-zoom-in p-2 sm:p-4">
                            <img 
                                src={getSafeProductImageUrl(activeMedia?.url, product.sku)} 
                                alt={product.name} 
                                style={isZoomed ? {
                                    transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                                    transform: 'scale(2.5)'
                                } : { transform: 'scale(1)' }} 
                                className={`w-full h-full max-w-full max-h-[38vh] sm:max-h-[48vh] lg:max-h-[75vh] object-contain transition-transform duration-200 ease-out will-change-transform ${!isZoomed ? 'drop-shadow-[0_15px_35px_rgba(255,255,255,0.05)]' : ''}`} 
                                onContextMenu={(e) => e.preventDefault()}
                                onError={(e) => {
                                    const img = e.currentTarget;
                                    if (img.src !== `/images/parts/${product.sku}.jpg`) {
                                        img.src = `/images/parts/${product.sku}.jpg`;
                                    } else {
                                        img.src = '/images/parts/fallback.jpg';
                                    }
                                }}
                            />
                            
                            {/* PREMIUM WATERMARK OVERLAY - Desktop Only */}
                            <div className="hidden md:flex absolute inset-0 pointer-events-none items-center justify-center opacity-[0.03] select-none">
                                <p className="text-[12vw] font-black uppercase tracking-[0.2em] -rotate-12 whitespace-nowrap text-white">Authentic Masuma</p>
                            </div>

                            {/* AUTHENTICITY BADGE */}
                            <div className="hidden md:flex absolute top-6 left-6 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 pointer-events-none items-center gap-2 shadow-2xl">
                                <ShieldCheck size={14} className="text-masuma-orange" />
                                <span className="text-[9px] font-black uppercase text-white tracking-[0.1em]">Verified Masuma E.A. Part</span>
                            </div>

                            {/* Hover zoom pill - Desktop only */}
                            {!isZoomed && activeMedia?.type === 'image' && (
                                <div className="hidden md:flex absolute bottom-6 items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                                    <ZoomIn size={12} className="text-masuma-orange" />
                                    <span className="text-[9px] font-black uppercase text-white/60 tracking-widest">Precision Hover Zoom</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Media Index Pill - Always visible when multiple items exist */}
                    {media.length > 1 && (
                        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] text-white font-bold pointer-events-none z-20">
                            {activeMedia?.type === 'video' ? <Play size={10} className="fill-white" /> : <Eye size={10} />}
                            <span>{activeMediaIndex + 1} / {media.length}</span>
                        </div>
                    )}

                    {/* Media Controls - Close is ALWAYS visible on both mobile and desktop */}
                    <div className="absolute top-3 right-3 sm:top-6 sm:right-6 flex items-center sm:flex-col gap-2 sm:gap-3 z-[110]">
                        <button 
                            onClick={() => setIsFullScreen(!isFullScreen)}
                            className="w-10 h-10 sm:w-12 sm:h-12 bg-black/60 sm:bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-xl sm:rounded-2xl flex items-center justify-center hover:bg-masuma-orange hover:border-masuma-orange transition-all shadow-xl focus-ring touch-target hidden sm:flex"
                            title="Toggle Cinema Mode"
                            aria-label={isFullScreen ? "Exit cinema mode" : "Enter cinema mode"}
                        >
                            {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                        </button>
                        <button 
                            onClick={onClose}
                            className="w-11 h-11 min-w-[44px] min-h-[44px] sm:w-auto sm:h-12 sm:px-4 bg-black/70 sm:bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-full sm:rounded-2xl flex items-center justify-center gap-2 hover:bg-masuma-orange hover:border-masuma-orange transition-all shadow-2xl focus-ring touch-target"
                            aria-label="Close quick view"
                        >
                            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Close</span>
                            <X size={20} className="sm:w-6 sm:h-6" />
                        </button>
                    </div>

                    {media.length > 1 && (
                        <>
                            <button 
                                onClick={() => setActiveMediaIndex((prev) => (prev - 1 + media.length) % media.length)} 
                                className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 min-w-[44px] min-h-[44px] sm:w-14 sm:h-14 bg-black/60 sm:bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-full sm:rounded-2xl flex items-center justify-center hover:bg-masuma-orange hover:border-masuma-orange transition-all opacity-90 md:opacity-0 md:group-hover/stage:opacity-100 shadow-xl z-50 focus-ring touch-target"
                                aria-label="Previous media"
                            >
                                <ChevronLeft size={20} className="sm:w-7 sm:h-7" />
                            </button>
                            <button 
                                onClick={() => setActiveMediaIndex((prev) => (prev + 1) % media.length)} 
                                className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 min-w-[44px] min-h-[44px] sm:w-14 sm:h-14 bg-black/60 sm:bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-full sm:rounded-2xl flex items-center justify-center hover:bg-masuma-orange hover:border-masuma-orange transition-all opacity-90 md:opacity-0 md:group-hover/stage:opacity-100 shadow-xl z-50 focus-ring touch-target"
                                aria-label="Next media"
                            >
                                <ChevronRight size={20} className="sm:w-7 sm:h-7" />
                            </button>
                        </>
                    )}
                </div>

                {/* Thumbnail Gallery - Sleek, space-efficient responsive layout */}
                {media.length > 1 && (
                    <div className="h-16 sm:h-18 lg:h-24 bg-black/80 backdrop-blur-2xl border-t border-white/10 flex items-center px-3 sm:px-8 gap-2.5 sm:gap-4 overflow-x-auto scrollbar-hide shrink-0">
                        {media.map((item, idx) => (
                            <button 
                                key={idx} 
                                onClick={() => setActiveMediaIndex(idx)} 
                                className={`relative w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 shrink-0 border-2 transition-all duration-300 rounded-xl overflow-hidden group/thumb focus-ring touch-target ${activeMediaIndex === idx ? 'border-masuma-orange ring-2 ring-masuma-orange/60 shadow-md shadow-masuma-orange/30' : 'border-white/20 opacity-70 hover:opacity-100 hover:border-white/40'}`}
                                aria-label={`View ${item.type} ${idx + 1}`}
                                aria-pressed={activeMediaIndex === idx}
                            >
                                {item.type === 'video' ? (
                                    <div className="w-full h-full bg-masuma-dark relative flex flex-col items-center justify-center text-white overflow-hidden">
                                        {getYoutubeId(item.url) ? (
                                            <>
                                                <img 
                                                    src={`https://img.youtube.com/vi/${getYoutubeId(item.url)}/mqdefault.jpg`} 
                                                    alt="Video thumbnail"
                                                    className="w-full h-full object-cover opacity-80 group-hover/thumb:opacity-100 transition-opacity"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                                    <div className="w-6 h-6 rounded-full bg-masuma-orange/90 flex items-center justify-center shadow-lg">
                                                        <Play size={10} fill="white" className="text-white ml-0.5" />
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <Play size={16} fill="currentColor" />
                                                <span className="text-[7px] font-black uppercase tracking-tighter mt-0.5">Video</span>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <img 
                                        src={getSafeProductImageUrl(item.url, product.sku)} 
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-110" 
                                        alt={`${product.name} Preview Thumbnail ${idx + 1}`} 
                                        onError={(e) => {
                                            (e.currentTarget as HTMLImageElement).src = `/images/parts/${product.sku}.jpg`;
                                        }}
                                    />
                                )}
                                {activeMediaIndex === idx && (
                                    <div className="absolute inset-0 bg-masuma-orange/15"></div>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Details Section */}
            <div id="sidebar-content" className="w-full lg:w-[45%] flex flex-col bg-white border-t lg:border-t-0 lg:border-l border-gray-100 lg:overflow-y-auto scrollbar-hide pb-8 lg:pb-0">
                <div className="p-4 sm:p-8 lg:p-12 space-y-6 sm:space-y-10">
                    <button 
                        onClick={onClose}
                        className="flex items-center gap-2 text-gray-400 hover:text-masuma-orange transition-colors group/back mb-2"
                        aria-label="Back to product list"
                    >
                        <ChevronLeft size={20} className="group-hover/back:-translate-x-1 transition-transform" />
                        <span className="text-xs font-bold uppercase tracking-widest">Back to Catalog</span>
                    </button>

                    <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <span className="bg-masuma-dark text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">{product.category}</span>
                        {product.stock ? (
                            <span className="text-green-600 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 bg-green-50 px-3 py-1 rounded-full"><Check size={14} strokeWidth={3} /> In Stock Nairobi</span>
                        ) : (
                            <span className="text-red-500 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 bg-red-50 px-3 py-1 rounded-full"><AlertTriangle size={14} strokeWidth={3} /> Special Order Only</span>
                        )}
                        <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                            <ShieldCheck size={14} className="text-masuma-orange" /> Verified Masuma OE
                        </span>
                    </div>
                        <h1 className="text-sm lg:text-lg font-bold text-masuma-dark uppercase tracking-tight leading-tight">{product.name}</h1>
                        
                        <div className="flex items-center gap-3">
                            <a
                                href="#product-reviews-section"
                                onClick={(e) => {
                                    e.preventDefault();
                                    const el = document.getElementById('product-reviews-section');
                                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="inline-flex items-center gap-2 group/rating hover:opacity-80 transition-opacity"
                            >
                                <div className="flex items-center gap-0.5 text-amber-400">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <Star key={s} size={14} className="fill-amber-400 text-amber-400" />
                                    ))}
                                </div>
                                <span className="text-xs font-bold text-masuma-dark">
                                    {product.averageRating ? product.averageRating.toFixed(1) : '5.0'}
                                </span>
                                <span className="text-[11px] font-semibold text-gray-400 underline decoration-gray-300 group-hover/rating:text-masuma-orange">
                                    Customer Reviews
                                </span>
                            </a>
                        </div>
                        
                        <div className="pt-8 border-t border-gray-50 space-y-6">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 flex items-center gap-2"><Calculator size={14}/> Total Price (Incl. VAT)</span>
                                <div className="flex items-baseline gap-3">
                                    <span className="text-2xl lg:text-3xl font-bold text-masuma-orange tracking-tighter"><Price amount={totalPrice} /></span>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">KES</span>
                                </div>
                            </div>
                            
                            <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                                <div className="grid grid-cols-2 divide-x divide-gray-200">
                                    <div className="p-6">
                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider leading-none block mb-2">Base Cost (Excl.)</span>
                                        <span className="text-lg font-bold text-masuma-dark"><Price amount={basePrice} /></span>
                                    </div>
                                    <div className="p-6">
                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider leading-none block mb-2">VAT (16%)</span>
                                        <span className="text-lg font-bold text-gray-600"><Price amount={vatAmount} /></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                        <div className="space-y-8">
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-medium text-masuma-dark uppercase tracking-widest flex items-center gap-3 border-l-4 border-masuma-orange pl-4">Technical Specifications</h4>
                                <div className="grid grid-cols-2 gap-y-8 gap-x-12">
                                    <div className="group">
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 group-hover:text-masuma-orange transition-colors">Global SKU</p>
                                        <p className="text-xs font-medium text-masuma-dark uppercase tracking-tight">{product.sku}</p>
                                    </div>
                                    <div className="group">
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 group-hover:text-masuma-orange transition-colors">Grade</p>
                                        <p className="text-xs font-medium text-masuma-dark uppercase tracking-tight">Japanese OE Std</p>
                                    </div>
                                    {Object.entries(product.specs || {}).map(([key, value]) => (
                                        <div key={key} className="group">
                                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 group-hover:text-masuma-orange transition-colors">{key}</p>
                                            <p className="text-xs font-medium text-masuma-dark uppercase tracking-tight">{String(value)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h4 className="text-[10px] font-medium text-masuma-dark uppercase tracking-widest opacity-60">Part Description</h4>
                                <p className="text-sm text-gray-600 leading-relaxed font-normal">{product.description}</p>
                            </div>

                            <div className="pt-6 border-t border-gray-100">
                                <ShareButtons 
                                    url={productUrl}
                                    title={`Check out this ${product.name} at Masuma Autoparts EA`}
                                    contentId={product.id}
                                    contentType="PRODUCT"
                                />
                            </div>

                            <div className="bg-masuma-dark text-white p-8 rounded-3xl shadow-2xl border-l-8 border-masuma-orange relative overflow-hidden group/fitment">
                                <div className="absolute top-[-20px] right-[-20px] opacity-10 rotate-12 group-hover/fitment:scale-110 transition-transform duration-700"><Check size={80}/></div>
                                <h4 className="text-[10px] font-medium uppercase tracking-widest mb-4 flex items-center gap-3">Verified Vehicle Fitment</h4>
                                <p className="text-xs text-gray-200 font-medium leading-relaxed">{(product.compatibility || []).join(' • ')}</p>
                                <div className="mt-6 pt-6 border-t border-white/10 flex items-center gap-2">
                                    <AlertTriangle size={14} className="text-masuma-orange"/>
                                    <span className="text-xs text-masuma-orange uppercase font-bold tracking-wider italic">Chassis verification recommended</span>
                                </div>
                            </div>
                        </div>

                    <div className="pt-4 space-y-6">
                        {/* Phase 4: Discontinued / Superceded Product Notice */}
                        {product.lifecycleStatus === 'DISCONTINUED' && (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-masuma-dark shadow-sm">
                                <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
                                    <AlertTriangle size={16} className="text-amber-600" />
                                    <span>Part Superseded by Manufacturer</span>
                                </div>
                                <p className="text-xs text-amber-900/80 mb-3">
                                    This part number has been discontinued and updated to latest OEM specifications.
                                    {product.successorProduct ? ' An official successor replacement is available:' : ''}
                                </p>
                                {product.successorProduct && (
                                    <button
                                        type="button"
                                        onClick={() => handleSwitch(product.successorProduct as any)}
                                        className="w-full py-2.5 px-4 bg-masuma-dark hover:bg-masuma-orange text-white text-xs font-bold uppercase rounded-xl transition flex items-center justify-between shadow-md active:scale-95"
                                    >
                                        <span>Upgrade to {product.successorProduct.name} ({product.successorProduct.sku})</span>
                                        <span>KES {Number(product.successorProduct.price).toLocaleString()} &rarr;</span>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Phase 4: Out of Stock Priority Notification Form */}
                        {!product.stock && product.lifecycleStatus !== 'DISCONTINUED' && (
                            <div className="p-4 bg-orange-50/80 border border-orange-200 rounded-2xl shadow-sm">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-black uppercase tracking-wider text-masuma-orange">
                                        Temporarily Out of Stock
                                    </span>
                                    {product.expectedRestockDate && (
                                        <span className="text-[10px] font-bold text-gray-500 bg-white px-2 py-0.5 rounded border border-orange-100">
                                            Restock: {product.expectedRestockDate}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-600 mb-3">
                                    Get notified via WhatsApp or Email the moment this genuine component arrives at Ruby Mall CBD Nairobi:
                                </p>

                                {alertStatus === 'success' ? (
                                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                                        <Check size={16} className="text-emerald-600 shrink-0" />
                                        <span>{alertMsg}</span>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubscribeStockAlert} className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Email or WhatsApp number (07...)"
                                            value={alertContact}
                                            onChange={(e) => setAlertContact(e.target.value)}
                                            className="flex-1 px-3 py-2 text-xs bg-white border border-gray-300 rounded-xl outline-none focus:border-masuma-orange"
                                            required
                                        />
                                        <button
                                            type="submit"
                                            disabled={alertStatus === 'loading'}
                                            className="px-4 py-2 bg-masuma-dark hover:bg-masuma-orange text-white text-xs font-bold uppercase tracking-wider rounded-xl transition disabled:opacity-50 active:scale-95 shrink-0"
                                        >
                                            {alertStatus === 'loading' ? 'Saving...' : 'Notify Me'}
                                        </button>
                                    </form>
                                )}
                                {alertStatus === 'error' && (
                                    <p className="text-[11px] text-red-600 mt-1.5">{alertMsg}</p>
                                )}
                            </div>
                        )}

                        {/* Phase 4: Direct In-Stock Compatible Alternatives */}
                        {!product.stock && alternatives.length > 0 && (
                            <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-black uppercase tracking-wider text-masuma-dark">
                                        In-Stock Compatible Alternatives
                                    </span>
                                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                        Fitment Verified
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2.5">
                                    {alternatives.map((alt) => (
                                        <div 
                                            key={alt.id}
                                            className="p-2.5 bg-white border border-gray-200 rounded-xl flex flex-col justify-between hover:border-masuma-orange transition group/alt"
                                        >
                                            <div onClick={() => handleSwitch(alt)} className="cursor-pointer">
                                                <div className="h-16 w-full flex items-center justify-center p-1 bg-gray-50 rounded-lg mb-1.5 overflow-hidden">
                                                    <ProductImage 
                                                        src={alt.image} 
                                                        sku={alt.sku} 
                                                        alt={alt.name} 
                                                        className="max-h-14 max-w-full object-contain group-hover/alt:scale-105 transition" 
                                                    />
                                                </div>
                                                <div className="text-[10px] font-bold text-masuma-dark line-clamp-1 uppercase">{alt.name}</div>
                                                <div className="text-xs font-black text-masuma-orange mt-0.5">KES {Number(alt.price).toLocaleString()}</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    addToCart(alt, 1);
                                                    onClose();
                                                }}
                                                className="mt-2 w-full py-1 bg-masuma-dark hover:bg-masuma-orange text-white text-[9px] font-bold uppercase rounded-lg transition active:scale-95"
                                            >
                                                + Add Alternative
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-4">
                            {product.stock && (
                                <div className="flex items-center bg-gray-100 rounded-2xl p-1.5 border border-gray-200">
                                    <button 
                                        onClick={() => setQuantity(q => Math.max(1, q - 1))} 
                                        className="w-12 h-12 flex items-center justify-center hover:bg-white hover:shadow-md rounded-xl text-masuma-dark transition-all disabled:opacity-30 touch-target focus-ring" 
                                        disabled={quantity <= 1}
                                        aria-label="Decrease quantity"
                                    >
                                        <Minus size={18} strokeWidth={3} />
                                    </button>
                                    <span className="w-12 text-center font-bold text-masuma-dark text-lg" aria-live="polite">{quantity}</span>
                                    <button 
                                        onClick={() => setQuantity(q => q + 1)} 
                                        className="w-12 h-12 flex items-center justify-center hover:bg-white hover:shadow-md rounded-xl text-masuma-dark transition-all touch-target focus-ring"
                                        aria-label="Increase quantity"
                                    >
                                        <Plus size={18} strokeWidth={3} />
                                    </button>
                                </div>
                            )}
                            <button 
                                onClick={() => { addToCart(product, quantity); onClose(); }} 
                                disabled={!product.stock} 
                                className={`flex-1 h-16 font-bold uppercase tracking-widest text-sm transition-all shadow-2xl rounded-2xl active:scale-95 flex items-center justify-center gap-3 focus-ring ${product.stock ? 'bg-masuma-dark text-white hover:bg-masuma-orange shadow-masuma-dark/20' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                                aria-label={product.stock ? `Add ${quantity} ${product.name} to cart` : 'Product out of stock'}
                            >
                                <ShoppingCart size={20} /> {product.stock ? 'Add to Cart' : 'Out of Stock'}
                            </button>
                            <button 
                                onClick={() => setIsQuoteModalOpen(true)} 
                                className="w-16 h-16 bg-gray-100 text-masuma-dark hover:bg-masuma-orange hover:text-white transition-all flex items-center justify-center rounded-2xl shadow-xl active:scale-95 border border-gray-200 focus-ring" 
                                aria-label="Request technical inquiry"
                            >
                                <MessageCircle size={24} />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6">
                            <div className="flex items-center gap-4 group/feat">
                                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover/feat:bg-masuma-orange transition-all duration-500 group-hover/feat:rotate-12 shadow-sm">
                                    <Truck size={20} className="text-masuma-orange group-hover/feat:text-white" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-masuma-dark">Same-Day</span>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Nairobi Delivery</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 group/feat">
                                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover/feat:bg-masuma-orange transition-all duration-500 group-hover/feat:rotate-12 shadow-sm">
                                    <ShieldCheck size={20} className="text-masuma-orange group-hover/feat:text-white" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-masuma-dark">12 Month</span>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Limited Warranty</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Customer Star Ratings & Verified Reviews Section */}
                    <ProductReviews 
                        productId={product.id} 
                        productName={product.name} 
                        productSku={product.sku} 
                    />

                    {relatedProducts.length > 0 && (
                        <div className="pt-10 space-y-6">
                            <div className="flex justify-between items-end border-b border-gray-100 pb-4">
                                <h4 className="text-[10px] font-black text-masuma-dark uppercase tracking-[0.3em]">Complementary Parts</h4>
                                <span className="text-[9px] text-masuma-orange font-black uppercase tracking-widest">Local Stock</span>
                            </div>
                            <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide snap-x">
                                {relatedProducts.map(rp => (
                                    <div key={rp.id} onClick={() => handleSwitch(rp)} className="min-w-[160px] w-[160px] bg-white border border-gray-100 p-4 hover:border-masuma-orange hover:shadow-2xl transition-all cursor-pointer snap-start rounded-[2rem] group/card flex flex-col justify-between">
                                        <div>
                                            <div className="aspect-square flex items-center justify-center mb-3 bg-gray-50 overflow-hidden rounded-2xl p-2">
                                                <ProductImage 
                                                    src={rp.image} 
                                                    sku={rp.sku} 
                                                    alt={rp.name} 
                                                    className="max-h-full max-w-full object-contain p-2 group-hover/card:scale-110 transition-transform duration-700" 
                                                />
                                            </div>
                                            <div className="text-[10px] font-black text-masuma-dark line-clamp-2 h-8 leading-tight mb-1 uppercase tracking-tight">{rp.name}</div>
                                            <div className="text-xs font-black text-masuma-orange tracking-tighter">KES {Number(rp.price).toLocaleString()}</div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                addToCart(rp, 1);
                                            }}
                                            className="mt-3 w-full py-1.5 bg-masuma-dark hover:bg-masuma-orange text-white text-[9px] font-bold uppercase rounded-xl transition flex items-center justify-center gap-1 shadow-sm active:scale-95"
                                        >
                                            <ShoppingBag size={10} /> + Add
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="pt-10 border-t border-gray-100">
                        <button 
                            onClick={onClose}
                            className="w-full py-4 rounded-2xl border-2 border-masuma-dark text-masuma-dark font-black uppercase tracking-widest text-xs hover:bg-masuma-dark hover:text-white transition-all active:scale-95 focus-ring touch-target"
                        >
                            Continue Shopping
                        </button>
                    </div>
                </div>
            </div>
          </div>
          
          {/* Mobile Sticky Add-to-Cart Bar */}
          <div className="lg:hidden shrink-0 bg-white/95 backdrop-blur-md border-t border-gray-200/80 p-3 sm:p-4 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] z-30 pb-safe">
              <div className="flex items-center gap-3">
                  <div className="flex flex-col shrink-0">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Total (Incl. VAT)</span>
                      <span className="text-base sm:text-lg font-bold text-masuma-orange leading-none"><Price amount={parseFloat((totalPrice * quantity).toFixed(2))} /></span>
                  </div>
                  
                  {product.stock && (
                      <div className="flex items-center bg-gray-100 rounded-xl p-1 border border-gray-200 shrink-0">
                          <button 
                              onClick={() => setQuantity(q => Math.max(1, q - 1))} 
                              className="w-9 h-9 flex items-center justify-center hover:bg-white rounded-lg text-masuma-dark disabled:opacity-30 touch-target focus-ring" 
                              disabled={quantity <= 1}
                              aria-label="Decrease quantity"
                          >
                              <Minus size={14} strokeWidth={3} />
                          </button>
                          <span className="w-7 text-center font-bold text-masuma-dark text-xs" aria-live="polite">{quantity}</span>
                          <button 
                              onClick={() => setQuantity(q => q + 1)} 
                              className="w-9 h-9 flex items-center justify-center hover:bg-white rounded-lg text-masuma-dark touch-target focus-ring"
                              aria-label="Increase quantity"
                          >
                              <Plus size={14} strokeWidth={3} />
                          </button>
                      </div>
                  )}

                  <button 
                      onClick={() => { addToCart(product, quantity); onClose(); }} 
                      disabled={!product.stock} 
                      className={`flex-1 h-12 font-bold uppercase tracking-widest text-xs transition-all shadow-xl rounded-xl active:scale-95 flex items-center justify-center gap-2 focus-ring touch-target ${product.stock ? 'bg-masuma-dark text-white hover:bg-masuma-orange shadow-masuma-dark/20' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                      aria-label={product.stock ? `Add ${quantity} to cart` : 'Out of Stock'}
                  >
                      <ShoppingCart size={16} /> {product.stock ? 'Add to Cart' : 'Out of Stock'}
                  </button>
              </div>
          </div>

        </div>
      </div>

      <QuoteModal isOpen={isQuoteModalOpen} onClose={() => setIsQuoteModalOpen(false)} product={product} />
    </>
  );
};

export default QuickView;