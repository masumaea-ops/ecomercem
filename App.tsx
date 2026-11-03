import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ProductList from './components/ProductList';
import CartDrawer from './components/CartDrawer';
import AIAssistant from './components/AIAssistant';
import Footer from './components/Footer';
import ValueProposition from './components/ValueProposition';

// Lazy load non-critical routes and heavy admin panels for mobile CWV performance
const AuthPortal = lazy(() => import('./components/AuthPortal'));
const ResetPassword = lazy(() => import('./components/ResetPassword'));
const DashboardLayout = lazy(() => import('./components/admin/DashboardLayout'));
const DashboardHome = lazy(() => import('./components/admin/DashboardHome'));
const ProductManager = lazy(() => import('./components/admin/ProductManager'));
const InventoryManager = lazy(() => import('./components/admin/InventoryManager'));
const OrderManager = lazy(() => import('./components/admin/OrderManager'));
const SalesHistory = lazy(() => import('./components/admin/SalesHistory'));
const CustomerManager = lazy(() => import('./components/admin/CustomerManager'));
const MpesaLogs = lazy(() => import('./components/admin/MpesaLogs'));
const UserManager = lazy(() => import('./components/admin/UserManager'));
const AuditLogs = lazy(() => import('./components/admin/AuditLogs'));
const SettingsManager = lazy(() => import('./components/admin/SettingsManager'));
const QuoteManager = lazy(() => import('./components/admin/QuoteManager'));
const ReportsManager = lazy(() => import('./components/admin/ReportsManager'));
const BranchManager = lazy(() => import('./components/admin/BranchManager'));
const PosTerminal = lazy(() => import('./components/admin/PosTerminal'));
const BlogManager = lazy(() => import('./components/admin/BlogManager'));
const CmsManager = lazy(() => import('./components/admin/CmsManager'));
const Profile = lazy(() => import('./components/admin/Profile'));
const B2BPortal = lazy(() => import('./components/admin/B2BPortal'));
const ReturnManager = lazy(() => import('./components/admin/ReturnManager'));
const ShippingManager = lazy(() => import('./components/admin/ShippingManager'));
const FinanceManager = lazy(() => import('./components/admin/FinanceManager'));
const CategoryManager = lazy(() => import('./components/admin/CategoryManager'));
const SubscriberManager = lazy(() => import('./components/admin/SubscriberManager'));
const PromoManager = lazy(() => import('./components/admin/PromoManager'));
const FraudAdmin = lazy(() => import('./components/admin/FraudAdmin'));
const ImportAdmin = lazy(() => import('./components/admin/ImportAdmin'));
const MarketplaceManager = lazy(() => import('./components/admin/MarketplaceManager'));
const AnalyticsDashboard = lazy(() => import('./components/admin/AnalyticsDashboard'));
const CrspManager = lazy(() => import('./components/admin/CrspManager'));
const ImportSettings = lazy(() => import('./components/admin/ImportSettings'));
const BackupManager = lazy(() => import('./components/admin/BackupManager'));
const Marketplace = lazy(() => import('./components/Marketplace'));
const SellerDashboard = lazy(() => import('./components/SellerDashboard'));
const ImportCalculator = lazy(() => import('./components/ImportCalculator'));
const PartFinder = lazy(() => import('./components/PartFinder'));
const Blog = lazy(() => import('./components/Blog'));
const Contact = lazy(() => import('./components/Contact'));
const About = lazy(() => import('./components/About'));
const FAQ = lazy(() => import('./components/FAQ'));
const WarrantyPolicy = lazy(() => import('./components/WarrantyPolicy'));
const ReturnsPolicy = lazy(() => import('./components/ReturnsPolicy'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./components/TermsOfService'));
const CookiePolicy = lazy(() => import('./components/CookiePolicy'));
const Checkout = lazy(() => import('./components/Checkout'));
const SiteDirectory = lazy(() => import('./components/SiteDirectory'));
const BuyerPortal = lazy(() => import('./components/BuyerPortal'));
import Toast, { ToastType } from './components/Toast';
import SEO from './components/SEO';
import QuickView from './components/QuickView';
import WhatsAppButton from './components/WhatsAppButton';
import MobileBottomNav from './components/MobileBottomNav';
import CookieConsentBanner from './components/CookieConsentBanner';
import { ViewState, Product, CartItem } from './types';
import { apiClient } from './utils/apiClient';
import { initGA, trackPageView } from './utils/analytics';

const generateSlug = (name: string, sku: string): string => {
    return `${name} ${sku}`.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('HOME');
  const [urlCategory, setUrlCategory] = useState<string>('All');
  const [compatibilityContext, setCompatibilityContext] = useState<{ make: string; model: string; category?: string } | null>(null);
  const [urlListingId, setUrlListingId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [adminModule, setAdminModule] = useState('dashboard');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'forgot' | 'register' | 'user-register'>('login');
  const [authContext, setAuthContext] = useState<string>('');

  const handleLogout = () => {
    localStorage.removeItem('masuma_auth_token');
    localStorage.removeItem('masuma_user');
    setUser(null);
    setToken(null);
    setView('HOME');
  };

  const handleAddToCart = (product: Product, quantity: number = 1) => {
    const qty = quantity && quantity > 0 ? quantity : 1;
    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + qty
        };
        return updated;
      } else {
        return [...prevCart, { ...product, quantity: qty }];
      }
    });
    setToast({
      message: `Added ${product.name} to cart`,
      type: 'success'
    });
  };

  useEffect(() => {
      initGA();
  }, []);

  useEffect(() => {
      trackPageView(window.location.pathname + window.location.search);
  }, [view, selectedProduct, activePostId, urlCategory]);

  // Deep Link & Clean URL Route Resolver
  const resolveDeepLinks = useCallback(async () => {
      const pathname = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      let postParam = params.get('post');
      if (!postParam && pathname.startsWith('/blog/')) {
          const slug = pathname.substring('/blog/'.length);
          if (slug) {
              const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
              const match = slug.match(uuidRegex);
              postParam = match ? match[0] : slug;
          }
      }
      let listingParam = params.get('listing');
      if (!listingParam && pathname.startsWith('/marketplace/')) {
          const slug = pathname.substring('/marketplace/'.length);
          if (slug) {
              const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
              const match = slug.match(uuidRegex);
              listingParam = match ? match[0] : slug;
          }
      }
      setUrlListingId(listingParam);
      const viewParam = params.get('view');

      // 1. Clean Pathname to View Mapping (query parameters & specific paths take precedence)
      let resolvedView: ViewState = 'HOME';
      if (viewParam) {
          resolvedView = viewParam as ViewState;
      } else if (pathname.startsWith('/reset-password') || params.get('token')) {
          resolvedView = 'RESET_PASSWORD';
      } else if (pathname === '/' || pathname === '') {
          resolvedView = 'HOME';
      } else if (pathname.startsWith('/catalog') || pathname.startsWith('/categories/') || pathname.startsWith('/category/')) {
          resolvedView = 'CATALOG';
      } else if (pathname.startsWith('/part-finder')) {
          resolvedView = 'PART_FINDER';
      } else if (pathname.startsWith('/marketplace')) {
          resolvedView = 'MARKETPLACE';
      } else if (pathname.startsWith('/import-calculator')) {
          resolvedView = 'IMPORT_CALCULATOR';
      } else if (pathname.startsWith('/blog')) {
          resolvedView = 'BLOG';
      } else if (pathname.startsWith('/about')) {
          resolvedView = 'ABOUT';
      } else if (pathname.startsWith('/faq')) {
          resolvedView = 'FAQ';
      } else if (pathname.startsWith('/contact')) {
          resolvedView = 'CONTACT';
      } else if (pathname.startsWith('/login')) {
          resolvedView = 'LOGIN';
      } else if (pathname.startsWith('/warranty')) {
          resolvedView = 'WARRANTY';
      } else if (pathname.startsWith('/returns') || pathname.startsWith('/refund')) {
          resolvedView = 'RETURNS';
      } else if (pathname.startsWith('/privacy')) {
          resolvedView = 'PRIVACY';
      } else if (pathname.startsWith('/terms')) {
          resolvedView = 'TERMS';
      } else if (pathname.startsWith('/cookies')) {
          resolvedView = 'COOKIES';
      } else if (pathname.startsWith('/checkout')) {
          resolvedView = 'CHECKOUT';
      } else if (pathname.startsWith('/site-directory') || (pathname.startsWith('/sitemap') && !pathname.endsWith('.xml'))) {
          resolvedView = 'SITE_DIRECTORY';
      } else if (pathname.startsWith('/buyer-portal') || pathname.startsWith('/my-account')) {
          resolvedView = 'BUYER_PORTAL';
      }

      // If viewing a product detail slug, default view should be preserved or CATALOG
      if (pathname.startsWith('/products/')) {
          resolvedView = viewParam ? (viewParam as ViewState) : 'CATALOG';
      }

      if (pathname.startsWith('/compatibility/')) {
          resolvedView = 'CATALOG';
          const compSegments = pathname.substring('/compatibility/'.length).split('/').filter(Boolean);
          const cMake = compSegments[0] ? decodeURIComponent(compSegments[0]).replace(/[-_]+/g, ' ') : '';
          const cModel = compSegments[1] ? decodeURIComponent(compSegments[1]).replace(/[-_]+/g, ' ') : '';
          const cCat = compSegments[2] ? decodeURIComponent(compSegments[2]).replace(/[-_]+/g, ' ') : undefined;
          if (cMake && cModel) {
              setCompatibilityContext({ make: cMake, model: cModel, category: cCat });
          }
      } else {
          setCompatibilityContext(null);
      }

      setView(resolvedView);

      // 2. Clean Category Mapping
      if (pathname.startsWith('/categories/')) {
          const cat = decodeURIComponent(pathname.substring('/categories/'.length));
          setUrlCategory(cat);
      } else if (pathname.startsWith('/category/')) {
          const cat = decodeURIComponent(pathname.substring('/category/'.length));
          setUrlCategory(cat);
      } else if (pathname.startsWith('/compatibility/')) {
          const compSegments = pathname.substring('/compatibility/'.length).split('/').filter(Boolean);
          const cCat = compSegments[2] ? decodeURIComponent(compSegments[2]).replace(/[-_]+/g, ' ') : undefined;
          setUrlCategory(cCat || 'All');
      } else {
          const catParam = params.get('category');
          if (catParam) {
              setUrlCategory(catParam);
          } else {
              setUrlCategory('All');
          }
      }

      // 3. Product resolution
      let productParam = params.get('product');
      if (!productParam && pathname.startsWith('/products/')) {
          productParam = pathname.substring('/products/'.length);
      }

      if (productParam) {
          try {
              const res = await apiClient.get(`/products/${productParam}`);
              if (res.data) {
                  setSelectedProduct(res.data);
                  const slug = generateSlug(res.data.name, res.data.sku);
                  const cleanProductPath = `/products/${slug}`;
                  if (window.location.pathname !== cleanProductPath) {
                      window.history.replaceState({ path: cleanProductPath }, '', cleanProductPath);
                  }
              }
          } catch (e) {
              console.error("Deep linked product not found");
          }
      }

      if (postParam) {
          setActivePostId(postParam);
          setView('BLOG');
      } 
      else if (listingParam) {
          setView('MARKETPLACE');
      }
  }, []);

  useEffect(() => {
      resolveDeepLinks();
      
      const currentParams = new URLSearchParams(window.location.search);
      const isResettingPassword = currentParams.get('view') === 'RESET_PASSWORD' || 
                                  Boolean(currentParams.get('token')) || 
                                  window.location.pathname.startsWith('/reset-password');

      const storedToken = localStorage.getItem('masuma_auth_token');
      const storedUser = localStorage.getItem('masuma_user');
      if (storedToken && storedUser && !isResettingPassword) {
          try {
              const parsed = JSON.parse(storedUser);
              setUser(parsed);
              setToken(storedToken);

              // Proactively verify token against backend to prevent stale / invalid session access
              apiClient.get('/auth/me')
                  .then((res) => {
                      if (res.data) {
                          setUser(res.data);
                          localStorage.setItem('masuma_user', JSON.stringify(res.data));
                      }
                  })
                  .catch((err) => {
                      if (err.response?.status === 401 || err.response?.status === 403) {
                          localStorage.removeItem('masuma_auth_token');
                          localStorage.removeItem('masuma_user');
                          setUser(null);
                          setToken(null);
                          const searchParams = new URLSearchParams(window.location.search);
                          if (searchParams.get('view') !== 'RESET_PASSWORD' && !searchParams.get('token') && !window.location.pathname.startsWith('/reset-password')) {
                              setView('HOME');
                          }
                      }
                  });
          } catch (e) {
              localStorage.removeItem('masuma_auth_token');
              localStorage.removeItem('masuma_user');
              setUser(null);
              setToken(null);
          }
      }
      const storedCart = localStorage.getItem('masuma_cart');
      if (storedCart) setCart(JSON.parse(storedCart));

      const handlePopState = () => {
          const params = new URLSearchParams(window.location.search);
          const path = window.location.pathname;
          if (!path.startsWith('/products/') && !params.get('product')) {
              setSelectedProduct(null);
          }
          if (!params.get('post')) setActivePostId(null);
          resolveDeepLinks();
      };

      const handleAuthExpired = () => {
          setUser(null);
          setToken(null);
          localStorage.removeItem('masuma_auth_token');
          localStorage.removeItem('masuma_user');
          const searchParams = new URLSearchParams(window.location.search);
          if (searchParams.get('view') !== 'RESET_PASSWORD' && !searchParams.get('token') && !window.location.pathname.startsWith('/reset-password')) {
              setView('HOME');
          }
          setToast({ message: 'Session expired. Please log in again.', type: 'error' });
      };

      window.addEventListener('popstate', handlePopState);
      window.addEventListener('masuma_auth_expired', handleAuthExpired);
      return () => {
          window.removeEventListener('popstate', handlePopState);
          window.removeEventListener('masuma_auth_expired', handleAuthExpired);
      };
  }, [resolveDeepLinks]);

  const navigateToView = (nextView: ViewState) => {
      setView(nextView);
      let newUrl = '/';
      switch (nextView) {
          case 'HOME': newUrl = '/'; break;
          case 'CATALOG': newUrl = urlCategory && urlCategory !== 'All' ? `/categories/${encodeURIComponent(urlCategory)}` : '/catalog'; break;
          case 'PART_FINDER': newUrl = '/part-finder'; break;
          case 'MARKETPLACE': newUrl = '/marketplace'; break;
          case 'IMPORT_CALCULATOR': newUrl = '/import-calculator'; break;
          case 'BLOG': newUrl = '/blog'; break;
          case 'ABOUT': newUrl = '/about'; break;
          case 'CONTACT': newUrl = '/contact'; break;
          case 'LOGIN': newUrl = '/login'; break;
          case 'WARRANTY': newUrl = '/warranty'; break;
          case 'RETURNS': newUrl = '/returns'; break;
          case 'PRIVACY': newUrl = '/privacy'; break;
          case 'TERMS': newUrl = '/terms'; break;
          case 'COOKIES': newUrl = '/cookies'; break;
          case 'CHECKOUT': newUrl = '/checkout'; break;
          case 'SITE_DIRECTORY': newUrl = '/site-directory'; break;
          case 'BUYER_PORTAL': newUrl = '/buyer-portal'; break;
          default: newUrl = `/?view=${nextView}`;
      }
      window.history.pushState({ path: newUrl }, '', newUrl);
      window.scrollTo(0, 0);
  };

  const handleCategoryChange = (category: string) => {
      setUrlCategory(category);
      const newUrl = category === 'All' ? '/catalog' : `/categories/${encodeURIComponent(category)}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
  };

  const openProduct = (product: Product) => {
      setSelectedProduct(product);
      const slug = generateSlug(product.name, product.sku);
      const newUrl = `/products/${slug}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
  };

  const closeProduct = () => {
      setSelectedProduct(null);
      const currentPath = window.location.pathname;
      let newUrl = '/';
      if (currentPath.startsWith('/products/')) {
          if (view === 'CATALOG') {
              newUrl = urlCategory && urlCategory !== 'All' ? `/categories/${encodeURIComponent(urlCategory)}` : '/catalog';
          } else if (view === 'BLOG') {
              newUrl = '/blog';
          } else if (view === 'HOME') {
              newUrl = '/';
          } else {
              newUrl = `/${view.toLowerCase().replace('_', '-')}`;
          }
      } else {
          newUrl = currentPath;
      }
      window.history.replaceState({ path: newUrl }, '', newUrl);
  };

  const navigateToPost = (postId: string, title?: string) => {
      setActivePostId(postId);
      setView('BLOG');
      const slug = title ? `${title} ${postId}`.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '') : postId;
      const newUrl = `/blog/${slug}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
      window.scrollTo(0, 0);
  };

  const clearCart = () => {
      setCart([]);
      localStorage.removeItem('masuma_cart');
      setToast({ message: 'Operation Successful!', type: 'success' });
  };

  const renderContent = () => {
    if (view === 'RESET_PASSWORD') {
        return (
            <>
                <SEO title="Reset Password" description="Account Security" noindex={true} />
                <ResetPassword onBack={() => setView('LOGIN')} />
            </>
        );
    }

    if (view === 'SELLER_DASHBOARD') {
        if (!user) {
            setAuthMode('user-register');
            setAuthContext('seller');
            setView('LOGIN');
            return null;
        }
        return (
            <>
                <SEO title="Seller Dashboard" description="Masuma Marketplace Seller" noindex={true} />
                <SellerDashboard user={user} onBack={() => setView('HOME')} />
            </>
        );
    }

    if (view === 'DASHBOARD') {
        if (!user) {
            setView('LOGIN');
            return null;
        }
        const staffRoles = ['ADMIN', 'MANAGER', 'CASHIER', 'B2B_USER'];
        if (!staffRoles.includes(user.role)) {
            if (user.role === 'INDIVIDUAL_SELLER' || user.role === 'DEALER') {
                setView('SELLER_DASHBOARD');
            } else {
                setView('HOME');
            }
            return null;
        }
        return (
            <DashboardLayout 
                activeModule={adminModule} 
                onNavigate={(module) => {
                    if (module === 'return_to_store') {
                        setView('HOME');
                    } else if (module === 'return_to_calculator') {
                        setView('IMPORT_CALCULATOR');
                    } else {
                        setAdminModule(module);
                    }
                }} 
                onLogout={handleLogout}
            >
                <SEO title="Admin Dashboard" description="Masuma ERP System Internal Access" noindex={true} />
                {(() => {
                    switch(adminModule) {
                        case 'dashboard': return <DashboardHome onNavigate={setAdminModule} />;
                        case 'products': return <ProductManager />;
                        case 'promos': return <PromoManager />;
                        case 'inventory': return <InventoryManager />;
                        case 'orders': return <OrderManager />;
                        case 'sales_history': return <SalesHistory />;
                        case 'customers': return <CustomerManager />;
                        case 'subscribers': return <SubscriberManager />;
                        case 'mpesa': return <MpesaLogs />;
                        case 'users': return <UserManager />;
                        case 'audit': return <AuditLogs />;
                        case 'settings': return <SettingsManager />;
                        case 'quotes': return <QuoteManager />;
                        case 'reports': return <ReportsManager />;
                        case 'branches': return <BranchManager />;
                        case 'pos': return <PosTerminal />;
                        case 'blog': return <BlogManager />;
                        case 'cms': return <CmsManager />;
                        case 'profile': return <Profile />;
                        case 'b2b': return <B2BPortal />;
                        case 'returns_admin': return <ReturnManager />;
                        case 'shipping': return <ShippingManager />;
                        case 'finance': return <FinanceManager />;
                        case 'categories': return <CategoryManager />;
                        case 'fraud_admin': return <FraudAdmin />;
                        case 'import_admin': return <ImportAdmin />;
                        case 'crsp_admin': return <CrspManager />;
                        case 'import_settings': return <ImportSettings />;
                        case 'marketplace_admin': return <MarketplaceManager />;
                        case 'analytics': return <AnalyticsDashboard />;
                        case 'backup': return <BackupManager />;
                        default: return <DashboardHome onNavigate={setAdminModule} />;
                    }
                })()}
            </DashboardLayout>
        );
    }

    if (view === 'LOGIN') {
        return <AuthPortal 
            initialMode={authMode}
            context={authContext}
            onLoginSuccess={(u, t) => { 
                setUser(u); 
                setToken(t); 
                localStorage.setItem('masuma_auth_token', t);
                localStorage.setItem('masuma_user', JSON.stringify(u));
                setAuthMode('login');
                setAuthContext('');
                if (u.role === 'INDIVIDUAL_SELLER' || u.role === 'DEALER') {
                    setView('SELLER_DASHBOARD');
                } else if (u.role === 'BUYER' || u.role === 'CUSTOMER' || u.role === 'IMPORT_USER') {
                    setView('BUYER_PORTAL');
                } else {
                    setView('DASHBOARD'); 
                }
            }} 
            onBack={() => {
                setAuthMode('login');
                setAuthContext('');
                setView('HOME');
            }} 
        />;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans w-full max-w-full overflow-x-clip">
            <Navbar 
                cartCount={cart.reduce((a, b) => a + b.quantity, 0)} 
                setView={navigateToView} 
                toggleCart={() => setIsCartOpen(true)} 
                toggleAi={() => setIsAiOpen(true)} 
                user={user}
                onLogout={handleLogout}
            />
            <main className={`flex-grow ${view !== 'CHECKOUT' ? 'pb-24 md:pb-0' : ''}`}>
            {view === 'HOME' && (
                <>
                <SEO 
                    title="Genuine Japanese Spare Parts in Nairobi" 
                    description="Masuma Autoparts East Africa. Official distributor of Japanese precision automotive parts in Nairobi, Kenya. 12-month warranty on filters, brakes, spark plugs, and suspension." 
                    keywords="Masuma Kenya, car parts Nairobi, Japanese spare parts Kenya, Toyota parts Kenya, Nissan parts Kenya, genuine spark plugs Kenya, Masuma spark plugs Nairobi, brake pads Kenya, oil filters Nairobi"
                    schema={{
                        "@context": "https://schema.org",
                        "@type": "Organization",
                        "name": "Masuma Autoparts East Africa",
                        "url": "https://masuma.africa",
                        "logo": "https://masuma.africa/logo.png",
                        "contactPoint": {
                            "@type": "ContactPoint",
                            "telephone": "+254-792-506590",
                            "contactType": "customer service",
                            "areaServed": "KE",
                            "availableLanguage": "en"
                        },
                        "sameAs": [
                            "https://www.facebook.com/masumakenya",
                            "https://www.instagram.com/masumakenya"
                        ]
                    }}
                />
                <Hero setView={navigateToView} />
                <ValueProposition setView={navigateToView} />
                <ProductList addToCart={handleAddToCart} onProductClick={openProduct} initialCategory={urlCategory} onCategoryChange={handleCategoryChange} compatibilityContext={compatibilityContext || undefined} />
                </>
            )}
            {view === 'CATALOG' && (
                <>
                {(!urlCategory || urlCategory === 'All') && !compatibilityContext && (
                    <SEO 
                        title="Automotive Parts Catalog | Masuma Kenya" 
                        description="Browse our extensive catalog of genuine Masuma automotive parts. High-quality spark plugs, filters, brakes, and suspension components for Japanese vehicles in Kenya." 
                        keywords="car parts catalog Kenya, Masuma inventory Nairobi, automotive components Kenya, spark plugs Kenya, brake pads Nairobi, suspension parts Kenya"
                        url="https://masuma.africa/catalog"
                    />
                )}
                {compatibilityContext && (
                    <SEO
                        title={`Genuine Masuma Parts for ${compatibilityContext.make} ${compatibilityContext.model} | Kenya Fitment Guarantee`}
                        description={`Buy genuine Masuma Japanese spare parts engineered for ${compatibilityContext.make} ${compatibilityContext.model}${compatibilityContext.category ? ` - ${compatibilityContext.category}` : ''}. In stock in Nairobi with 12-month warranty & verified OEM numbers.`}
                        keywords={`${compatibilityContext.make} ${compatibilityContext.model} parts Kenya, ${compatibilityContext.make} spare parts Nairobi, Masuma ${compatibilityContext.model} Kenya`}
                        url={`https://masuma.africa/compatibility/${encodeURIComponent(compatibilityContext.make.toLowerCase().replace(/\s+/g, '-'))}/${encodeURIComponent(compatibilityContext.model.toLowerCase().replace(/\s+/g, '-'))}${compatibilityContext.category ? `/${encodeURIComponent(compatibilityContext.category.toLowerCase().replace(/\s+/g, '-'))}` : ''}`}
                    />
                )}
                <ProductList addToCart={handleAddToCart} onProductClick={openProduct} initialCategory={urlCategory} onCategoryChange={handleCategoryChange} compatibilityContext={compatibilityContext || undefined} />
                </>
            )}
            {view === 'PART_FINDER' && (
                <>
                <SEO 
                    title="VIN & Part Finder | Find Car Parts in Kenya" 
                    description="Use our advanced VIN and part finder to locate the exact genuine Masuma component for your vehicle. Precision fitment for Kenyan roads." 
                    keywords="VIN search Kenya, part finder Nairobi, car part lookup Kenya"
                    url="https://masuma.africa/part-finder"
                />
                <PartFinder addToCart={handleAddToCart} />
                </>
            )}
            {view === 'BLOG' && (
                <>
                {!activePostId && (
                    <SEO 
                        title="Automotive News & Maintenance Tips | Masuma Kenya" 
                        description="Stay updated with the latest automotive news, maintenance tips, and product guides from Masuma Autoparts East Africa." 
                        keywords="car maintenance tips Kenya, automotive blog Nairobi, Masuma news Kenya"
                        url="https://masuma.africa/blog"
                    />
                )}
                <Blog addToCart={handleAddToCart} initialPostId={activePostId} onProductClick={openProduct} onNavigateToPost={navigateToPost} />
                </>
            )}
            {view === 'ABOUT' && (
                <>
                <SEO 
                    title="About Masuma Autoparts East Africa" 
                    description="Learn about Masuma Autoparts East Africa, the leading distributor of genuine Japanese automotive parts in Kenya and the East African region." 
                    url="https://masuma.africa/about"
                />
                <About setView={navigateToView} />
                </>
            )}
            {view === 'FAQ' && (
                <FAQ setView={navigateToView} />
            )}
            {view === 'CONTACT' && (
                <>
                <SEO 
                    title="Contact Us | Masuma Nairobi Office" 
                    description="Get in touch with Masuma Autoparts East Africa. Visit our Nairobi office or contact us for genuine Japanese spare parts inquiries." 
                    url="https://masuma.africa/contact"
                />
                <Contact />
                </>
            )}
            {view === 'WARRANTY' && (
                <>
                <SEO 
                    title="Warranty Policy | 12-Month Guarantee" 
                    description="Read about our 12-month warranty policy on all genuine Masuma automotive parts sold in Kenya." 
                    url="https://masuma.africa/warranty"
                />
                <WarrantyPolicy setView={navigateToView} />
                </>
            )}
            {view === 'RETURNS' && (
                <ReturnsPolicy setView={navigateToView} />
            )}
            {view === 'PRIVACY' && (
                <>
                <SEO 
                    title="Privacy Policy | Masuma Kenya" 
                    description="Our commitment to protecting your privacy and personal data at Masuma Autoparts East Africa." 
                    url="https://masuma.africa/privacy"
                />
                <PrivacyPolicy />
                </>
            )}
            {view === 'TERMS' && (
                <>
                <SEO 
                    title="Terms of Service | Masuma Kenya" 
                    description="Terms and conditions for using the Masuma Autoparts East Africa website and services." 
                    url="https://masuma.africa/terms"
                />
                <TermsOfService />
                </>
            )}
            {view === 'COOKIES' && (
                <>
                <SEO 
                    title="Cookie Policy | Masuma Kenya" 
                    description="Information about how we use cookies on the Masuma Autoparts East Africa website." 
                    url="https://masuma.africa/cookies"
                />
                <CookiePolicy />
                </>
            )}
            {view === 'CHECKOUT' && (
                <>
                <SEO title="Secure Checkout | Masuma Kenya" description="Complete your purchase of genuine Masuma automotive parts securely with M-Pesa or Card." noindex={true} />
                <Checkout cartItems={cart} onSuccess={clearCart} setView={navigateToView} />
                </>
            )}
            {view === 'MARKETPLACE' && (
                <Marketplace 
                    user={user} 
                    setView={navigateToView} 
                    initialListingId={urlListingId} 
                    onSellerAuthRequired={() => {
                        setAuthMode('user-register');
                        setAuthContext('seller');
                        setView('LOGIN');
                    }}
                />
            )}
            {view === 'IMPORT_CALCULATOR' && (
                <ImportCalculator user={user} setView={navigateToView} setAdminModule={setAdminModule} />
            )}
            {view === 'SITE_DIRECTORY' && (
                <SiteDirectory setView={navigateToView} />
            )}
            {view === 'BUYER_PORTAL' && user && (
                <BuyerPortal user={user} setView={navigateToView} onLogout={handleLogout} />
            )}
            </main>
            <Footer setView={navigateToView} />
            <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} cartItems={cart} removeFromCart={(id) => setCart(cart.filter(i => i.id !== id))} onCheckout={() => { setIsCartOpen(false); navigateToView('CHECKOUT'); }} updateQuantity={(id, q) => setCart(cart.map(i => i.id === id ? {...i, quantity: q} : i))} />
            <AIAssistant isOpen={isAiOpen} onClose={() => setIsAiOpen(false)} addToCart={handleAddToCart} onSelectProduct={openProduct} />
            <QuickView product={selectedProduct} isOpen={!!selectedProduct} onClose={closeProduct} addToCart={handleAddToCart} onSwitchProduct={openProduct} />
            <WhatsAppButton />
            <CookieConsentBanner />
            {view !== 'CHECKOUT' && (
              <MobileBottomNav currentView={view} setView={navigateToView} cartCount={cart.reduce((a, b) => a + b.quantity, 0)} toggleCart={() => setIsCartOpen(true)} toggleAi={() => setIsAiOpen(true)} />
            )}
        </div>
    );
  };

  return (
    <>
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
                <Loader2 className="animate-spin text-masuma-orange" size={36} />
            </div>
        }>
            {renderContent()}
        </Suspense>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
};

export default App;