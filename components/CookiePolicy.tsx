import React, { useState, useEffect } from 'react';
import { Cookie, ShieldCheck, Settings, Info, MousePointer2, ExternalLink } from 'lucide-react';
import SEO from './SEO';
import { openCookiePreferences, getStoredConsent, subscribeToConsentChanges, CookieConsentPreferences } from '../utils/cookieConsent';

const CookiePolicy: React.FC = () => {
  const [currentConsent, setCurrentConsent] = useState<CookieConsentPreferences | null>(null);

  useEffect(() => {
    setCurrentConsent(getStoredConsent());
    const unsubscribe = subscribeToConsentChanges((consent) => {
      setCurrentConsent(consent);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="animate-fade-in bg-white min-h-screen">
      <SEO 
        title="Cookie Policy | Masuma Kenya" 
        description="Learn how Masuma Autoparts East Africa Limited uses cookies to improve your shopping experience."
        url="https://masuma.africa/cookies"
      />
      
      {/* Header */}
      <div className="bg-masuma-dark text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold font-display uppercase tracking-wider mb-4">Cookie Policy</h1>
          <div className="h-1 w-24 bg-masuma-orange mx-auto"></div>
          <p className="mt-6 text-gray-300 text-lg">
            Understanding how we use tracking technologies to power your experience.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16 text-gray-700 leading-relaxed">
        {/* Active Consent Status & Re-Configure Trigger */}
        <div className="bg-gradient-to-r from-masuma-dark to-slate-900 text-white p-6 rounded-2xl shadow-xl mb-12 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border border-white/10">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-masuma-orange block mb-1">
              Your Privacy Controls
            </span>
            <h3 className="text-lg font-bold font-display uppercase tracking-tight">
              Manage Your Cookie Consent
            </h3>
            <p className="text-xs text-gray-300 mt-1 max-w-md">
              You can change your consent settings, agree to selected cookie categories, or withdraw non-essential tracking at any time.
            </p>
            {currentConsent && (
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Necessary: Active
                </span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${currentConsent.functional ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-gray-700 text-gray-400 border-gray-600'}`}>
                  Functional: {currentConsent.functional ? 'Active' : 'Disabled'}
                </span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${currentConsent.analytics ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-gray-700 text-gray-400 border-gray-600'}`}>
                  Analytics: {currentConsent.analytics ? 'Active' : 'Disabled'}
                </span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${currentConsent.marketing ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-gray-700 text-gray-400 border-gray-600'}`}>
                  Marketing: {currentConsent.marketing ? 'Active' : 'Disabled'}
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={openCookiePreferences}
            className="px-6 py-3.5 bg-masuma-orange hover:bg-masuma-orange-hover text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-masuma-orange/30 transition active:scale-95 flex items-center justify-center gap-2 shrink-0"
          >
            <Settings size={16} /> Manage Preferences
          </button>
        </div>
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-masuma-dark uppercase font-display flex items-center gap-3 mb-6">
            <Cookie className="text-masuma-orange" /> 1. What are Cookies?
          </h2>
          <p>
            Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently, as well as to provide information to the owners of the site. At Masuma Autoparts EA, we use them to remember your cart, your currency preferences, and to understand how you interact with our catalog.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-masuma-dark uppercase font-display flex items-center gap-3 mb-6">
            <Settings className="text-masuma-orange" /> 2. Types of Cookies We Use
          </h2>
          <div className="grid gap-6">
            <div className="bg-gray-50 p-6 border-l-4 border-masuma-dark rounded-r-lg shadow-sm">
                <h3 className="font-bold text-masuma-dark uppercase text-sm mb-2">Essential Cookies</h3>
                <p className="text-sm text-gray-600">
                    These are necessary for the website to function. They allow you to add parts to your cart and proceed to the M-Pesa checkout securely. Without these, the core features of the storefront would not work.
                </p>
            </div>
            
            <div className="bg-gray-50 p-6 border-l-4 border-masuma-orange rounded-r-lg shadow-sm">
                <h3 className="font-bold text-masuma-dark uppercase text-sm mb-2">Preference Cookies</h3>
                <p className="text-sm text-gray-600">
                    These remember choices you make, such as your selected currency (KES, USD, etc.) or your vehicle identification (VIN) results, so you don't have to re-enter them on every visit.
                </p>
            </div>

            <div className="bg-gray-50 p-6 border-l-4 border-blue-500 rounded-r-lg shadow-sm">
                <h3 className="font-bold text-masuma-dark uppercase text-sm mb-2">Analytical Cookies</h3>
                <p className="text-sm text-gray-600">
                    We use Google Analytics to collect information about how visitors use our site. This helps us improve our catalog search and blog content. All data is aggregated and anonymous.
                </p>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-masuma-dark uppercase font-display flex items-center gap-3 mb-6">
            <MousePointer2 className="text-masuma-orange" /> 3. Managing Your Preferences
          </h2>
          <p className="mb-6">
            Most web browsers allow you to control cookies through their settings. If you choose to block essential cookies, please be aware that you will not be able to place orders through our website.
          </p>
          <div className="bg-masuma-dark text-white p-8 rounded-lg shadow-lg">
            <h4 className="font-bold uppercase text-xs mb-4 flex items-center gap-2">
                <Info size={16} className="text-masuma-orange" /> Browser Instructions:
            </h4>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <li className="flex items-center gap-2 bg-white/5 p-3 rounded hover:bg-white/10 transition cursor-default">
                    <span className="font-bold">Google Chrome:</span> Settings &gt; Privacy and Security &gt; Cookies
                </li>
                <li className="flex items-center gap-2 bg-white/5 p-3 rounded hover:bg-white/10 transition cursor-default">
                    <span className="font-bold">Safari (iOS/Mac):</span> Settings &gt; Safari &gt; Privacy
                </li>
                <li className="flex items-center gap-2 bg-white/5 p-3 rounded hover:bg-white/10 transition cursor-default">
                    <span className="font-bold">Mozilla Firefox:</span> Options &gt; Privacy & Security &gt; Cookies
                </li>
                <li className="flex items-center gap-2 bg-white/5 p-3 rounded hover:bg-white/10 transition cursor-default">
                    <span className="font-bold">Microsoft Edge:</span> Settings &gt; Site Permissions &gt; Cookies
                </li>
            </ul>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-masuma-dark uppercase font-display flex items-center gap-3 mb-6">
            <ShieldCheck className="text-masuma-orange" /> 4. Updates to this Policy
          </h2>
          <p>
            We may update this Cookie Policy from time to time in order to reflect, for example, changes to the cookies we use or for other operational, legal, or regulatory reasons. Please therefore re-visit this Cookie Policy regularly to stay informed about our use of cookies and related technologies.
          </p>
        </section>

        <section className="border-t border-gray-100 pt-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-sm text-gray-500">
                For more information on how we use your data, please read our 
                <a href="/?view=PRIVACY" className="text-masuma-orange font-bold ml-1 hover:underline">Privacy Policy</a>.
            </p>
            <div className="flex gap-4">
                <a 
                    href="https://www.aboutcookies.org" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-1 text-[10px] font-bold uppercase text-gray-400 hover:text-masuma-dark transition"
                >
                    Learn more about cookies <ExternalLink size={12} />
                </a>
            </div>
        </section>
      </div>
    </div>
  );
};

export default CookiePolicy;