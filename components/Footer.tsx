import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Mail, Facebook, Instagram, ArrowRight, Loader2, CheckCircle, AlertCircle, MessageCircle } from 'lucide-react';
import { apiClient } from '../utils/apiClient';
import { ViewState } from '../types';
import { Logo } from './Logo';
import { openCookiePreferences } from '../utils/cookieConsent';

interface FooterProps {
    setView?: (view: ViewState) => void;
}

const Footer: React.FC<FooterProps> = ({ setView }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const [info, setInfo] = useState({
      about: 'Masuma Autoparts East Africa is the distributor and regional brand builder for Masuma Japan. Brand new, genuine-quality replacement parts engineered in Tokyo for Kenyan roads — without the dealer markup.',
      address: 'Ruby Mall, First Floor, Charles Rubia Road, Nairobi, Kenya',
      phone: '+254 792 506 590',
      email: 'sales@masuma.africa'
  });

  useEffect(() => {
      const fetchSettings = async () => {
          try {
              const res = await apiClient.get('/settings');
              const s = res.data;
              setInfo({
                  about: s.CMS_FOOTER_ABOUT || info.about,
                  address: s.CMS_CONTACT_ADDRESS || info.address,
                  phone: s.CMS_CONTACT_PHONE || info.phone,
                  email: s.CMS_CONTACT_EMAIL || info.email
              });
          } catch (e) {
              // Fail silently to defaults
          }
      };
      fetchSettings();
  }, []);

  const handleNav = (e: React.MouseEvent, view: ViewState) => {
      e.preventDefault();
      if (setView) {
          setView(view);
      }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedEmail = email.trim();
      if (!trimmedEmail) return;

      setStatus('loading');
      setMessage('');
      
      try {
          const res = await apiClient.post('/newsletter/subscribe', { email: trimmedEmail });
          setStatus('success');
          setMessage(res.data.message || 'Subscription confirmed!');
          setEmail('');
          // Clear success message after 8 seconds
          setTimeout(() => {
              setStatus('idle');
              setMessage('');
          }, 8000);
      } catch (err: any) {
          setStatus('error');
          // Try to extract specific Zod error if available
          const serverError = err.response?.data?.details?.[0]?.message || err.response?.data?.error || 'Subscription failed.';
          setMessage(serverError);
          // Don't auto-clear error so user can read it
      }
  };

  return (
    <footer className="bg-masuma-dark text-white pt-16 pb-8 border-t-4 border-masuma-orange">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="mb-4">
                <Logo variant="white" />
            </div>
            <p className="text-gray-400 text-xs leading-relaxed mb-6">
              {info.about}
            </p>
            <div className="flex space-x-3">
               <a href="https://www.facebook.com/masumakenya" target="_blank" rel="noopener noreferrer" aria-label="Masuma Kenya Facebook" className="bg-white/10 p-2 rounded-sm hover:bg-masuma-orange transition"><Facebook size={18} /></a>
               <a href="https://www.instagram.com/masumakenya" target="_blank" rel="noopener noreferrer" aria-label="Masuma Kenya Instagram" className="bg-white/10 p-2 rounded-sm hover:bg-masuma-orange transition"><Instagram size={18} /></a>
               <a href={`https://wa.me/${info.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" aria-label="Masuma Kenya WhatsApp" className="bg-white/10 p-2 rounded-sm hover:bg-[#25D366] transition"><MessageCircle size={18} fill="currentColor" /></a>
             </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-xs font-medium mb-4 text-white font-display uppercase tracking-wide border-l-2 border-masuma-orange pl-3">Quick Links</h3>
            <ul className="space-y-2 text-[10px] text-gray-400">
              <li><a href="/about" onClick={(e) => handleNav(e, 'ABOUT')} className="hover:text-masuma-orange transition">About Us</a></li>
              <li><a href="/faq" onClick={(e) => handleNav(e, 'FAQ')} className="hover:text-masuma-orange transition">Frequently Asked Questions</a></li>
              <li><a href="/blog" onClick={(e) => handleNav(e, 'BLOG')} className="hover:text-masuma-orange transition">Auto Guides & Blog</a></li>
              <li><a href="/part-finder" onClick={(e) => handleNav(e, 'PART_FINDER')} className="hover:text-masuma-orange transition">VIN & Part Finder</a></li>
              <li><a href="/warranty" onClick={(e) => handleNav(e, 'WARRANTY')} className="hover:text-masuma-orange transition">12-Month Warranty</a></li>
              <li><a href="/returns" onClick={(e) => handleNav(e, 'RETURNS')} className="hover:text-masuma-orange transition">Returns & Refunds</a></li>
              <li><a href="/catalog" onClick={(e) => handleNav(e, 'CATALOG')} className="hover:text-masuma-orange transition">Product Catalog</a></li>
              <li><a href="/site-directory" onClick={(e) => handleNav(e, 'SITE_DIRECTORY')} className="hover:text-masuma-orange transition font-semibold text-gray-300">Site Directory & Vehicle Index</a></li>
              <li><a href="/login" onClick={(e) => handleNav(e, 'LOGIN')} className="hover:text-masuma-orange transition">Distributor Portal</a></li>
              <li><button type="button" onClick={() => openCookiePreferences()} className="hover:text-masuma-orange transition text-left cursor-pointer">Cookie Preferences</button></li>
            </ul>
          </div>

          {/* Popular Categories */}
          <div>
            <h3 className="text-xs font-medium mb-4 text-white font-display uppercase tracking-wide border-l-2 border-masuma-orange pl-3">Popular Categories</h3>
            <ul className="space-y-2 text-[10px] text-gray-400">
              <li><a href="/categories/Brakes" className="hover:text-masuma-orange transition">Brake Pads & Rotors</a></li>
              <li><a href="/categories/Filters" className="hover:text-masuma-orange transition">Oil, Air & Cabin Filters</a></li>
              <li><a href="/categories/Suspension" className="hover:text-masuma-orange transition">Suspension & Ball Joints</a></li>
              <li><a href="/categories/Spark%20Plugs" className="hover:text-masuma-orange transition">Iridium Spark Plugs</a></li>
              <li><a href="/categories/Belts" className="hover:text-masuma-orange transition">Fan & Timing Belts</a></li>
              <li><a href="/categories/Cooling" className="hover:text-masuma-orange transition">Water Pumps & Thermostats</a></li>
              <li><a href="/categories/Wiper%20Blades" className="hover:text-masuma-orange transition">All-Weather Wiper Blades</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xs font-medium mb-4 text-white font-display uppercase tracking-wide border-l-2 border-masuma-orange pl-3">Contact Us</h3>
            <ul className="space-y-4 text-[10px] text-gray-400">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-masuma-orange flex-shrink-0 mt-0.5" />
                <span>{info.address}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={18} className="text-masuma-orange flex-shrink-0" />
                <span>{info.phone}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-masuma-orange flex-shrink-0" />
                <span>{info.email}</span>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
             <h3 className="text-xs font-medium mb-4 text-white font-display uppercase tracking-wide border-l-2 border-masuma-orange pl-3">Stay Updated</h3>
             <p className="text-[10px] text-gray-400 mb-4">Subscribe for price alerts, new shipments, and Japanese maintenance tips.</p>
             
             {status === 'success' ? (
                 <div className="bg-emerald-950/40 border border-emerald-500/50 p-4 rounded-lg text-xs text-white flex flex-col gap-3 animate-scale-up">
                     <div className="flex items-start gap-2.5">
                         <CheckCircle size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                         <div>
                             <p className="font-bold text-emerald-300 text-xs">{message}</p>
                             <p className="text-[10px] text-gray-300 mt-1">Check your inbox for your complete Japanese catalog guide.</p>
                         </div>
                     </div>
                     <div className="bg-black/40 border border-masuma-orange/40 p-2.5 rounded flex items-center justify-between">
                         <div>
                             <span className="text-[8px] uppercase tracking-wider text-masuma-orange font-bold block">Your 5% Off Voucher:</span>
                             <span className="font-mono font-black text-sm text-white tracking-wider">KARIBU5</span>
                         </div>
                         <a 
                             href="https://wa.me/254792506590?text=Hello%20Masuma%20EA,%20I%20just%20subscribed%20as%20a%20VIP.%20My%20code%20is%20KARIBU5." 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="bg-[#25D366] hover:bg-[#1EBE5D] text-white text-[10px] font-bold px-2.5 py-1.5 rounded flex items-center gap-1 transition shadow-md"
                         >
                             <MessageCircle size={12} fill="currentColor" /> WhatsApp Us
                         </a>
                     </div>
                 </div>
             ) : (
                <form className="flex flex-col gap-2" onSubmit={handleSubscribe}>
                    <div className="relative group">
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email" 
                            disabled={status === 'loading'}
                            className={`bg-white/5 border ${status === 'error' ? 'border-red-500' : 'border-white/10 group-hover:border-masuma-orange/50'} text-white px-4 py-4 text-xs focus:outline-none focus:border-masuma-orange transition w-full outline-none`}
                        />
                        <Mail size={16} className={`absolute right-4 top-4 transition-colors ${status === 'error' ? 'text-red-500' : 'text-white/20'}`} />
                    </div>
                    
                    {status === 'error' && (
                        <div className="bg-red-500/10 border border-red-500/20 p-2 rounded flex items-center gap-2 animate-slide-up">
                            <AlertCircle size={12} className="text-red-500" />
                            <p className="text-[10px] text-red-500 font-bold uppercase">{message}</p>
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={status === 'loading' || !email.trim()}
                        className="bg-masuma-orange text-white px-4 py-4 text-xs font-black uppercase tracking-widest hover:bg-white hover:text-masuma-orange transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
                    >
                        {status === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <><ArrowRight size={16} /> Get Updates</>}
                    </button>
                    <p className="text-[9px] text-gray-500 text-center mt-1 uppercase font-bold opacity-50">Japanese Precision in your inbox</p>
                </form>
             )}
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">&copy; {new Date().getFullYear()} Masuma Autoparts East Africa Limited. Licensed by Masuma Japan.</p>
          <div className="flex space-x-6 mt-4 md:mt-0 text-[10px] font-bold uppercase tracking-widest text-gray-500">
            <a href="/privacy" onClick={(e) => handleNav(e, 'PRIVACY')} className="hover:text-white transition">Privacy Policy</a>
            <a href="/terms" onClick={(e) => handleNav(e, 'TERMS')} className="hover:text-white transition">Terms of Service</a>
            <a href="/returns" onClick={(e) => handleNav(e, 'RETURNS')} className="hover:text-white transition">Returns & Refunds</a>
            <a href="/cookies" onClick={(e) => handleNav(e, 'COOKIES')} className="hover:text-white transition">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;