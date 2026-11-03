import React, { useState, useEffect } from 'react';
import { Cookie, ShieldCheck, Check, X, Settings2, SlidersHorizontal, ChevronRight, Lock } from 'lucide-react';
import {
  getStoredConsent,
  saveConsent,
  acceptAllCookies,
  rejectNonEssentialCookies,
  CookieConsentPreferences,
  OPEN_CONSENT_MODAL_EVENT,
} from '../utils/cookieConsent';

export const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [preferences, setPreferences] = useState<{
    functional: boolean;
    analytics: boolean;
    marketing: boolean;
  }>({
    functional: false,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Check if user already made a decision
    const stored = getStoredConsent();
    if (!stored) {
      // Show banner after brief delay so initial page render feels fluid
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 700);
      return () => clearTimeout(timer);
    } else {
      setPreferences({
        functional: stored.functional,
        analytics: stored.analytics,
        marketing: stored.marketing,
      });
    }

    // Listen for custom trigger to open modal (e.g. from footer link or Cookie Policy page)
    const handleOpenModal = () => {
      const current = getStoredConsent();
      if (current) {
        setPreferences({
          functional: current.functional,
          analytics: current.analytics,
          marketing: current.marketing,
        });
      }
      setIsModalOpen(true);
    };

    window.addEventListener(OPEN_CONSENT_MODAL_EVENT, handleOpenModal);
    return () => {
      window.removeEventListener(OPEN_CONSENT_MODAL_EVENT, handleOpenModal);
    };
  }, []);

  const handleAcceptAll = () => {
    acceptAllCookies();
    setPreferences({ functional: true, analytics: true, marketing: true });
    setIsVisible(false);
    setIsModalOpen(false);
  };

  const handleRejectAll = () => {
    rejectNonEssentialCookies();
    setPreferences({ functional: false, analytics: false, marketing: false });
    setIsVisible(false);
    setIsModalOpen(false);
  };

  const handleSaveSelected = () => {
    saveConsent({
      functional: preferences.functional,
      analytics: preferences.analytics,
      marketing: preferences.marketing,
    });
    setIsVisible(false);
    setIsModalOpen(false);
  };

  const togglePreference = (key: 'functional' | 'analytics' | 'marketing') => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // If user hasn't consented, show banner. If user opened preferences modal, show modal.
  if (!isVisible && !isModalOpen) return null;

  return (
    <>
      {/* 1. Floating Bottom Banner (Initial prompt) */}
      {isVisible && !isModalOpen && (
        <aside
          role="region"
          aria-label="Cookie consent banner"
          className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 z-[1900] max-w-xl animate-fade-in-up"
        >
          <div className="bg-masuma-dark/95 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl shadow-black/40 text-white">
            <div className="flex items-start gap-3 sm:gap-4 mb-4">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-masuma-orange/20 border border-masuma-orange/30 flex items-center justify-center shrink-0 text-masuma-orange">
                <Cookie size={22} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-display uppercase tracking-wide text-xs sm:text-sm font-bold text-white">
                    Cookie &amp; Privacy Notice
                  </h3>
                  <span className="text-[9px] bg-masuma-orange/20 text-masuma-orange font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
                    Compliance
                  </span>
                </div>
                <p className="text-gray-300 text-xs sm:text-[13px] leading-relaxed mt-1.5 font-normal">
                  We use cookies to maintain your shopping cart, remember vehicle fitments, analyze site performance, and personalize your experience. You can choose to accept all, reject non-essential, or customize your settings.
                </p>
              </div>
            </div>

            {/* Direct Actions: Accept All, Reject, Agree to Selected / Customize */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 text-gray-300 hover:text-white text-xs font-semibold py-2 px-3 rounded-lg hover:bg-white/5 transition"
                aria-label="Customize cookie settings"
              >
                <SlidersHorizontal size={14} className="text-masuma-orange" />
                <span>Customize Choices</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRejectAll}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-white/10 hover:bg-white/20 text-gray-200 text-xs font-bold uppercase tracking-wider rounded-xl transition border border-white/10 active:scale-95"
                  aria-label="Reject non-essential cookies"
                >
                  Reject All
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-masuma-orange hover:bg-masuma-orange-hover text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-masuma-orange/30 transition active:scale-95"
                  aria-label="Accept all cookies"
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* 2. Granular Cookie Preferences Modal (production grade) */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-preferences-title"
          className="fixed inset-0 z-[2100] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in"
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-gray-100 animate-scale-up">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-masuma-dark text-white flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-masuma-orange/20 border border-masuma-orange/30 flex items-center justify-center text-masuma-orange">
                  <Settings2 size={20} />
                </div>
                <div>
                  <h2
                    id="cookie-preferences-title"
                    className="text-base sm:text-lg font-bold font-display uppercase tracking-wide text-white"
                  >
                    Cookie Preferences
                  </h2>
                  <p className="text-[11px] text-gray-400">
                    Granular privacy controls pursuant to the Kenya Data Protection Act &amp; GDPR.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  // If user has not consented yet, closing modal returns to banner
                  setIsModalOpen(false);
                  if (!getStoredConsent()) {
                    setIsVisible(true);
                  }
                }}
                className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition"
                aria-label="Close preferences"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: Categories List */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                When you visit our store, we store information on your device in the form of cookies to enable essential shopping functions, remember your car parts preferences, and measure performance. You can adjust your consent below at any time.
              </p>

              {/* 1. Strictly Necessary */}
              <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 sm:p-5 transition">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-masuma-orange" />
                    <span className="font-bold text-xs uppercase tracking-wider text-masuma-dark">
                      Strictly Necessary Cookies
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-200/80 text-gray-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    <Lock size={11} /> Always Active
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Required for security, user authentication, session integrity, CSRF defense, and checkout operations (such as M-Pesa order creation). These cannot be deactivated.
                </p>
              </div>

              {/* 2. Functional & Preferences */}
              <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 sm:p-5 transition hover:border-gray-300">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <Cookie size={18} className="text-blue-500" />
                    <span className="font-bold text-xs uppercase tracking-wider text-masuma-dark">
                      Functional &amp; Preferences
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.functional}
                      onChange={() => togglePreference('functional')}
                      className="sr-only peer"
                      aria-label="Toggle Functional and Preferences cookies"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-masuma-orange"></div>
                  </label>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Enables helpful features such as remembering your VIN search results, preferred currency (KES / USD), catalog filters, and recently viewed Japanese spare parts.
                </p>
              </div>

              {/* 3. Analytics & Performance */}
              <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 sm:p-5 transition hover:border-gray-300">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal size={18} className="text-emerald-500" />
                    <span className="font-bold text-xs uppercase tracking-wider text-masuma-dark">
                      Analytics &amp; Performance
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={() => togglePreference('analytics')}
                      className="sr-only peer"
                      aria-label="Toggle Analytics and Performance cookies"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-masuma-orange"></div>
                  </label>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Helps us measure catalog search performance and traffic sources via Google Analytics 4. All collected metrics are aggregated and anonymous.
                </p>
              </div>

              {/* 4. Marketing & Advertising */}
              <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 sm:p-5 transition hover:border-gray-300">
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <Cookie size={18} className="text-purple-500" />
                    <span className="font-bold text-xs uppercase tracking-wider text-masuma-dark">
                      Marketing &amp; Retargeting
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={() => togglePreference('marketing')}
                      className="sr-only peer"
                      aria-label="Toggle Marketing and Retargeting cookies"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-masuma-orange"></div>
                  </label>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Enables Meta Pixel to measure campaign conversions and display relevant promotions on social media without selling personal data.
                </p>
              </div>

              <div className="pt-2 text-center">
                <a
                  href="/cookies"
                  className="text-[11px] font-bold text-masuma-orange hover:underline inline-flex items-center gap-1"
                >
                  Read our full Cookie Policy <ChevronRight size={12} />
                </a>
              </div>
            </div>

            {/* Modal Footer: Agree to Selected, Accept All, Reject All */}
            <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleRejectAll}
                className="px-4 py-3 bg-white hover:bg-gray-100 text-gray-600 border border-gray-200 text-xs font-bold uppercase tracking-wider rounded-xl transition active:scale-95 text-center"
              >
                Reject Non-Essential
              </button>

              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleSaveSelected}
                  className="w-full sm:w-auto px-5 py-3 bg-masuma-dark hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-xl transition active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Check size={14} className="text-masuma-orange" /> Agree to Selected
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="w-full sm:w-auto px-6 py-3 bg-masuma-orange hover:bg-masuma-orange-hover text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-masuma-orange/30 transition active:scale-95"
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CookieConsentBanner;
