
import React, { useState, useEffect } from 'react';
import { ShoppingCart, Menu, X, Bot, Phone, MessageCircle, MapPin, User, ChevronDown, Plane, LogOut, Shield, Car, Download } from 'lucide-react';
import { ViewState } from '../types';
import { useCurrency, CurrencyCode } from '../contexts/CurrencyContext';
import { apiClient } from '../utils/apiClient';
import SourcingModal from './SourcingModal';
import { Logo } from './Logo';

interface NavbarProps {
  cartCount: number;
  setView: (view: ViewState) => void;
  toggleCart: () => void;
  toggleAi: () => void;
  user?: any;
  onLogout?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ cartCount, setView, toggleCart, toggleAi, user, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { currency, setCurrency } = useCurrency();
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [contactPhone, setContactPhone] = useState('+254 792 506 590'); // Default
  const [isSourcingOpen, setIsSourcingOpen] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [canInstallPwa, setCanInstallPwa] = useState(false);

  const handlePwaInstall = async () => {
    const promptEvent = (window as any).deferredPWAInstallPrompt;
    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice?.outcome === 'accepted') {
          (window as any).deferredPWAInstallPrompt = null;
          setCanInstallPwa(false);
        }
      } catch (err) {
        console.error('PWA prompt failed:', err);
      }
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);

    // Check PWA installability state
    const checkPwa = () => {
      if ((window as any).deferredPWAInstallPrompt) {
        setCanInstallPwa(true);
      }
    };
    checkPwa();
    window.addEventListener('pwa-prompt-ready', checkPwa);
    window.addEventListener('beforeinstallprompt', checkPwa);
    window.addEventListener('appinstalled', () => setCanInstallPwa(false));
    
    // Fetch settings
    const fetchSettings = async () => {
        try {
            const res = await apiClient.get('/settings');
            if (res.data && res.data.CMS_HEADER_PHONE) {
                setContactPhone(res.data.CMS_HEADER_PHONE);
            }
        } catch (e) {
            // Ignore error, use default
        }
    };
    fetchSettings();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pwa-prompt-ready', checkPwa);
      window.removeEventListener('beforeinstallprompt', checkPwa);
    };
  }, []);

  const navItems: ViewState[] = ['HOME', 'CATALOG', 'PART_FINDER', 'MARKETPLACE', 'IMPORT_CALCULATOR', 'BLOG', 'ABOUT', 'CONTACT'];
  const currencies: CurrencyCode[] = ['KES', 'USD', 'UGX', 'TZS', 'RWF'];

  const formatNavLabel = (item: string) => {
      if (item === 'PART_FINDER') return 'PART FINDER';
      if (item === 'IMPORT_CALCULATOR') return 'IMPORT CALCULATOR';
      return item;
  };

  const getViewPath = (item: ViewState) => {
      switch (item) {
          case 'HOME': return '/';
          case 'CATALOG': return '/catalog';
          case 'PART_FINDER': return '/part-finder';
          case 'MARKETPLACE': return '/marketplace';
          case 'IMPORT_CALCULATOR': return '/import-calculator';
          case 'BLOG': return '/blog';
          case 'ABOUT': return '/about';
          case 'CONTACT': return '/contact';
          case 'LOGIN': return '/login';
          case 'WARRANTY': return '/warranty';
          case 'RETURNS': return '/returns';
          case 'FAQ': return '/faq';
          case 'PRIVACY': return '/privacy';
          case 'TERMS': return '/terms';
          case 'COOKIES': return '/cookies';
          default: return `/?view=${item}`;
      }
  };

  const handleNav = (e: React.MouseEvent, view: ViewState) => {
      e.preventDefault();
      setView(view);
      setIsMenuOpen(false);
  };

  return (
    <>
      {/* TOP UTILITY BAR - Visible on laptops and desktops */}
      <div className="bg-masuma-dark text-white text-[10px] font-medium py-2.5 border-b border-gray-800 hidden lg:block transition-colors relative z-[102]">
         <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            {/* Left: Contact & Chat */}
            <div className="flex items-center space-x-6">
               <span className="flex items-center gap-2 opacity-80 hover:opacity-100 transition cursor-default">
                 <Phone size={12} className="text-masuma-orange" />
                 Call us between 8 AM - 6 PM / <span className="text-white font-bold">{contactPhone}</span>
               </span>
               <button onClick={toggleAi} className="flex items-center gap-2 opacity-80 hover:opacity-100 transition hover:text-masuma-orange">
                 <MessageCircle size={12} className="text-masuma-orange" />
                 Live Chat / Chat with an Expert
               </button>
            </div>

            {/* Right: Locations, Settings, Login */}
            <div className="flex items-center divide-x divide-gray-700">
               <button onClick={() => setIsSourcingOpen(true)} className="flex items-center gap-2 px-4 text-masuma-orange font-bold hover:text-white transition uppercase tracking-wider">
                 <Plane size={12} className="transform -rotate-45" /> Special Orders
               </button>
               {canInstallPwa && (
                 <button 
                   onClick={handlePwaInstall}
                   className="flex items-center gap-1.5 px-3 py-1 bg-masuma-orange hover:bg-orange-600 text-white font-bold rounded text-[10px] uppercase tracking-wider transition shadow-sm ml-2"
                 >
                   <Download size={11} className="stroke-[2.5]" /> Install App
                 </button>
               )}
               <a href="/contact" onClick={(e) => handleNav(e, 'CONTACT')} className="flex items-center gap-2 px-4 opacity-80 hover:opacity-100 transition hover:text-masuma-orange">
                 <MapPin size={12} /> Locations
               </a>
               <div className="flex items-center gap-4 px-4 relative z-[1001]">
                  <div className="relative">
                    <button 
                        onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
                        className="cursor-pointer hover:text-masuma-orange flex items-center gap-1 transition opacity-80 hover:opacity-100"
                    >
                        {currency} <ChevronDown size={10}/>
                    </button>
                    {isCurrencyOpen && (
                        <div className="absolute top-8 right-0 bg-white text-masuma-dark shadow-2xl rounded-sm border border-gray-200 z-[1005] w-24 animate-slide-up">
                            {currencies.map(c => (
                                <button 
                                    key={c}
                                    onClick={() => { setCurrency(c); setIsCurrencyOpen(false); }}
                                    className={`block w-full text-left px-3 py-2 text-xs hover:bg-gray-100 border-b border-gray-50 last:border-0 ${currency === c ? 'font-bold text-masuma-orange' : ''}`}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    )}
                  </div>
               </div>
                {user ? (
                  <div className="flex items-center gap-3 pl-4 ml-2 border-l border-white/10">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        if (['ADMIN', 'MANAGER', 'CASHIER', 'B2B_USER'].includes(user.role)) {
                          setView('DASHBOARD');
                        } else if (['INDIVIDUAL_SELLER', 'DEALER'].includes(user.role)) {
                          setView('SELLER_DASHBOARD');
                        } else {
                          setView('BUYER_PORTAL');
                        }
                      }}
                      className="flex items-center gap-1.5 text-masuma-orange hover:text-white transition uppercase tracking-wider text-xs font-bold"
                    >
                      {['ADMIN', 'MANAGER', 'CASHIER'].includes(user.role) ? (
                        <><Shield size={12} /> Dashboard</>
                      ) : ['INDIVIDUAL_SELLER', 'DEALER'].includes(user.role) ? (
                        <><Car size={12} /> My Vehicles</>
                      ) : (
                        <><User size={12} /> Buyer Portal</>
                      )}
                    </button>
                    {onLogout && (
                      <button
                        onClick={onLogout}
                        className="text-gray-400 hover:text-red-400 transition ml-1"
                        title="Sign Out"
                        aria-label="Sign Out"
                      >
                        <LogOut size={12} />
                      </button>
                    )}
                  </div>
                ) : (
                  <a 
                    href="/login"
                    onClick={(e) => handleNav(e, 'LOGIN')}
                    className="flex items-center gap-2 pl-4 text-gray-400 hover:text-white transition uppercase tracking-wider ml-2"
                  >
                    <User size={12} /> Sign In
                  </a>
                )}
            </div>
         </div>
      </div>

      {/* MAIN NAVBAR */}
      <nav className={`sticky top-0 z-[100] transition-all duration-300 ${
          isScrolled 
          ? 'bg-white/85 backdrop-blur-xl shadow-md border-b border-masuma-orange/15 py-1.5' 
          : 'bg-white border-b-2 border-masuma-orange py-2 sm:py-2.5 shadow-sm'
      }`}>
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            
            {/* Logo Section */}
            <a href="/" className="flex-shrink-0 cursor-pointer group transition-transform duration-500 hover:scale-105" onClick={(e) => handleNav(e, 'HOME')}>
              <Logo />
            </a>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-3 xl:space-x-5 2xl:space-x-7" role="navigation" aria-label="Main Navigation">
              {/* Categories / Parts Dropdown Menu */}
              <div className="relative" onMouseLeave={() => setIsCategoriesOpen(false)}>
                <button
                  onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
                  onMouseEnter={() => setIsCategoriesOpen(true)}
                  className="flex items-center gap-1.5 bg-gray-100 hover:bg-masuma-orange hover:text-white text-masuma-dark px-2.5 py-1.5 rounded-lg text-[10px] xl:text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  aria-expanded={isCategoriesOpen}
                  aria-label="Browse Parts Menu"
                >
                  <Menu size={14} />
                  <span>Categories</span>
                  <ChevronDown size={11} className={`transition-transform duration-200 ${isCategoriesOpen ? 'rotate-180' : ''}`} />
                </button>
                {isCategoriesOpen && (
                  <div 
                    className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-[110] animate-slide-up"
                    onMouseEnter={() => setIsCategoriesOpen(true)}
                  >
                    <div className="px-4 py-1.5 border-b border-gray-100">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Genuine Japanese Lines</span>
                    </div>
                    <a 
                      href="/catalog?category=Suspension" 
                      onClick={(e) => { e.preventDefault(); setView('CATALOG'); setIsCategoriesOpen(false); }}
                      className="flex items-center justify-between px-4 py-2.5 text-xs text-masuma-dark hover:bg-orange-50 hover:text-masuma-orange transition font-semibold"
                    >
                      <span>Shock Absorbers & Suspension</span>
                      <span className="text-[10px] text-gray-400">Shocks, Bushings</span>
                    </a>
                    <a 
                      href="/catalog?category=Brakes" 
                      onClick={(e) => { e.preventDefault(); setView('CATALOG'); setIsCategoriesOpen(false); }}
                      className="flex items-center justify-between px-4 py-2.5 text-xs text-masuma-dark hover:bg-orange-50 hover:text-masuma-orange transition font-semibold"
                    >
                      <span>Brake System</span>
                      <span className="text-[10px] text-gray-400">Pads, Discs</span>
                    </a>
                    <a 
                      href="/catalog?category=Filters" 
                      onClick={(e) => { e.preventDefault(); setView('CATALOG'); setIsCategoriesOpen(false); }}
                      className="flex items-center justify-between px-4 py-2.5 text-xs text-masuma-dark hover:bg-orange-50 hover:text-masuma-orange transition font-semibold"
                    >
                      <span>Filtration System</span>
                      <span className="text-[10px] text-gray-400">Oil, Air, Cabin</span>
                    </a>
                    <a 
                      href="/catalog?category=Engine%20%26%20Ignition" 
                      onClick={(e) => { e.preventDefault(); setView('CATALOG'); setIsCategoriesOpen(false); }}
                      className="flex items-center justify-between px-4 py-2.5 text-xs text-masuma-dark hover:bg-orange-50 hover:text-masuma-orange transition font-semibold"
                    >
                      <span>Engine & Ignition</span>
                      <span className="text-[10px] text-gray-400">Iridium Plugs</span>
                    </a>
                    <a 
                      href="/catalog?category=Wiper%20Blades" 
                      onClick={(e) => { e.preventDefault(); setView('CATALOG'); setIsCategoriesOpen(false); }}
                      className="flex items-center justify-between px-4 py-2.5 text-xs text-masuma-dark hover:bg-orange-50 hover:text-masuma-orange transition font-semibold"
                    >
                      <span>Wiper Blades</span>
                      <span className="text-[10px] text-gray-400">All-Weather</span>
                    </a>
                    <div className="pt-2 mt-1 border-t border-gray-100 px-3">
                      <a 
                        href="/catalog" 
                        onClick={(e) => { e.preventDefault(); setView('CATALOG'); setIsCategoriesOpen(false); }}
                        className="block text-center py-2 bg-masuma-dark text-white hover:bg-masuma-orange text-[10px] font-bold uppercase rounded-lg tracking-wider transition"
                      >
                        View Full Parts Catalog →
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {navItems.map((item) => (
                  <a 
                      key={item}
                      href={getViewPath(item)}
                      onClick={(e) => handleNav(e, item)} 
                      className="relative text-masuma-dark font-bold uppercase tracking-wider text-[10px] xl:text-[11px] hover:text-masuma-orange transition-all duration-300 group focus-ring p-1 whitespace-nowrap"
                      aria-label={`Navigate to ${formatNavLabel(item)}`}
                  >
                      {formatNavLabel(item)}
                      <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-1 bg-masuma-orange transition-all duration-500 group-hover:w-full rounded-full"></span>
                  </a>
              ))}
            </div>

            {/* Right Side Icons */}
              <div className="flex items-center space-x-3 sm:space-x-5">
                <button 
                  onClick={toggleAi}
                  className="hidden 2xl:flex items-center space-x-3 bg-masuma-dark hover:bg-masuma-orange text-white px-5 py-2.5 rounded-xl transition-all duration-500 group border border-transparent shadow-xl shadow-masuma-dark/10 hover:shadow-masuma-orange/20 active:scale-95 focus-ring"
                  aria-label="Open AI Assistant"
                >
                  <Bot size={18} className="group-hover:rotate-[20deg] transition-transform duration-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Ask AI Expert</span>
                </button>

                <div className="relative cursor-pointer group touch-target focus-ring" onClick={toggleCart} aria-label={`View Cart with ${cartCount} items`} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && toggleCart()}>
                  <div className="p-2 rounded-xl hover:bg-gray-100 transition-all duration-500 group-hover:rotate-6">
                    <ShoppingCart className="text-masuma-dark group-hover:text-masuma-orange transition-colors duration-500" size={24} />
                  </div>
                  {cartCount > 0 && (
                    <span className="absolute top-1 right-1 bg-masuma-orange text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-lg shadow-masuma-orange/40 transform scale-100 animate-bounce-subtle">
                      {cartCount}
                    </span>
                  )}
                </div>

                {/* Mobile / Tablet Menu Button */}
                <div className="lg:hidden flex items-center">
                  <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)} 
                    className="flex items-center gap-1.5 text-masuma-dark px-3 py-2 hover:bg-gray-100 rounded-xl transition-colors touch-target border border-gray-200 bg-gray-50/80"
                    aria-label={isMenuOpen ? "Close Menu" : "Open Menu"}
                    aria-expanded={isMenuOpen}
                  >
                    {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
                    <span className="text-[11px] font-bold uppercase tracking-wider text-masuma-dark">Menu</span>
                  </button>
                </div>
              </div>
          </div>
        </div>

        {/* Mobile / Tablet Menu */}
        <div className={`lg:hidden bg-white absolute top-full left-0 right-0 z-[105] border-t border-gray-200 shadow-2xl transition-all duration-300 ease-in-out ${
            isMenuOpen ? 'max-h-[85vh] opacity-100 pointer-events-auto overflow-y-auto block' : 'max-h-0 opacity-0 pointer-events-none overflow-hidden hidden'
        }`}>
            <div className="px-4 py-4 space-y-1">
              {navItems.map((item) => (
                  <a 
                      key={item}
                      href={getViewPath(item)}
                      onClick={(e) => handleNav(e, item)} 
                      className="block w-full text-left px-4 py-4 text-xs font-bold text-masuma-dark hover:text-masuma-orange hover:bg-gray-50 border-b border-gray-100 uppercase tracking-wider"
                  >
                      {formatNavLabel(item)}
                  </a>
              ))}
              {/* Mobile Currency */}
              <div className="px-4 py-4 border-b border-gray-100 flex gap-2">
                  {currencies.map(c => (
                      <button key={c} onClick={() => setCurrency(c)} className={`text-xs border px-2 py-1 rounded ${currency === c ? 'bg-masuma-orange text-white border-masuma-orange' : 'bg-white text-gray-600'}`}>{c}</button>
                  ))}
              </div>
              
              {/* Mobile Special Order */}
               <button 
                  onClick={() => { setIsSourcingOpen(true); setIsMenuOpen(false); }} 
                  className="block w-full text-left px-4 py-4 text-sm font-bold text-masuma-orange hover:bg-gray-50 border-b border-gray-100 uppercase tracking-wider flex items-center gap-2"
              >
                  <Plane size={16} className="transform -rotate-45" /> Request Special Part
              </button>

              {/* Mobile PWA Install Button */}
              {canInstallPwa && (
                <button 
                  onClick={() => { handlePwaInstall(); setIsMenuOpen(false); }} 
                  className="block w-full text-left px-4 py-3.5 text-sm font-bold bg-orange-50 text-masuma-orange hover:bg-orange-100 border-b border-gray-100 uppercase tracking-wider flex items-center gap-2"
                >
                  <Download size={16} className="stroke-[2.5]" /> Install App to Device
                </button>
              )}

              {/* Mobile Account / Auth */}
              {user ? (
                <div className="border-b border-gray-100 py-2">
                  <button 
                    onClick={() => {
                      setIsMenuOpen(false);
                      if (['ADMIN', 'MANAGER', 'CASHIER', 'B2B_USER'].includes(user.role)) {
                        setView('DASHBOARD');
                      } else if (['INDIVIDUAL_SELLER', 'DEALER'].includes(user.role)) {
                        setView('SELLER_DASHBOARD');
                      } else {
                        setView('BUYER_PORTAL');
                      }
                    }} 
                    className="w-full text-left px-4 py-3 text-sm font-bold text-masuma-dark hover:text-masuma-orange hover:bg-gray-50 uppercase tracking-wider flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      {['ADMIN', 'MANAGER', 'CASHIER'].includes(user.role) ? (
                        <Shield size={16} className="text-masuma-orange" />
                      ) : ['INDIVIDUAL_SELLER', 'DEALER'].includes(user.role) ? (
                        <Car size={16} className="text-masuma-orange" />
                      ) : (
                        <User size={16} className="text-masuma-orange" />
                      )}
                      {user.name || user.email || 'My Account'}
                    </span>
                    <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                      {user.role}
                    </span>
                  </button>
                  {onLogout && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 uppercase tracking-wider flex items-center gap-2"
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  )}
                </div>
              ) : (
                <a 
                  href="/login"
                  onClick={(e) => handleNav(e, 'LOGIN')} 
                  className="block w-full text-left px-4 py-4 text-sm font-bold text-gray-600 hover:text-masuma-dark hover:bg-gray-50 border-b border-gray-100 uppercase tracking-wider flex items-center gap-2"
                >
                  <User size={16} /> Sign In / Account
                </a>
              )}
              
              <button 
                  onClick={() => { toggleAi(); setIsMenuOpen(false); }} 
                  className="mt-6 block w-full text-center px-4 py-4 text-sm font-bold text-white bg-masuma-orange hover:bg-masuma-dark transition rounded-sm uppercase tracking-widest"
              >
                  Ask AI Assistant
              </button>
            </div>
        </div>
      </nav>

      <SourcingModal isOpen={isSourcingOpen} onClose={() => setIsSourcingOpen(false)} />
    </>
  );
};

export default Navbar;
