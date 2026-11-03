import React from 'react';
import { ViewState } from '../types';
import SEO from './SEO';
import { ShieldCheck, MapPin, ChevronRight, Car, Wrench, FileText, ArrowRight } from 'lucide-react';
import { POPULAR_VEHICLE_HUBS, PRIMARY_CATEGORIES } from '../utils/siteDirectoryData';

interface SiteDirectoryProps {
  setView?: (view: ViewState) => void;
}

const SiteDirectory: React.FC<SiteDirectoryProps> = ({ setView }) => {
  const handleNav = (e: React.MouseEvent, view: ViewState, path?: string) => {
    if (path && typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
    }
    if (setView) {
      e.preventDefault();
      setView(view);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <SEO
        title="Site Directory & Automotive Fitment Index | Masuma Kenya"
        description="Complete site index and vehicle compatibility directory for genuine Masuma auto spare parts in Nairobi, Kenya. Guaranteed OEM fitment for Toyota, Subaru, Nissan, Honda, Mazda."
        keywords="Masuma site directory, car parts sitemap Nairobi, vehicle compatibility Kenya, spare parts catalog Nairobi"
        url="https://masuma.africa/site-directory"
      />

      {/* Header */}
      <div className="mb-12 border-b border-gray-100 pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-masuma-orange/10 text-masuma-orange rounded-full text-xs font-bold uppercase tracking-wider mb-3">
          <Wrench size={14} /> Full Catalog Topology
        </div>
        <h1 className="text-3xl sm:text-5xl font-black font-display uppercase tracking-tight text-masuma-dark">
          Site Directory & Vehicle Fitment Index
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2 max-w-3xl leading-relaxed">
          Traverse our complete inventory of genuine OEM Spec components calibrated for Kenyan roads. Every product is backed by our official 12-Month Unlimited Mileage Warranty and available for physical counter pick-up at Ruby Mall CBD, Nairobi.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Column 1 & 2: Vehicle Compatibility Hubs */}
        <div className="lg:col-span-2 space-y-10">
          <div>
            <div className="flex items-center gap-2 border-b-2 border-masuma-dark pb-3 mb-6">
              <Car className="text-masuma-orange" size={20} />
              <h2 className="text-xl sm:text-2xl font-bold font-display uppercase tracking-tight text-masuma-dark">
                Vehicle Compatibility Hubs (Guaranteed Fitment)
              </h2>
            </div>
            <p className="text-xs text-gray-500 mb-6">
              Select your vehicle make and model to view verified direct-fit Japanese aftermarket components with genuine OEM cross-reference numbers:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {POPULAR_VEHICLE_HUBS.map((hub) => {
                const makeSlug = encodeURIComponent(hub.make.toLowerCase());
                const modelSlug = encodeURIComponent(hub.aliases[0]);
                const hubUrl = `/compatibility/${makeSlug}/${modelSlug}`;

                return (
                  <div 
                    key={`${hub.make}-${hub.model}`} 
                    className="p-4 bg-white border border-gray-100 rounded-2xl hover:border-masuma-orange hover:shadow-md transition group"
                  >
                    <a href={hubUrl} className="block">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-masuma-orange">
                          {hub.make}
                        </span>
                        <ChevronRight size={14} className="text-gray-300 group-hover:text-masuma-orange group-hover:translate-x-0.5 transition" />
                      </div>
                      <h3 className="text-sm font-bold text-masuma-dark group-hover:text-masuma-orange transition">
                        {hub.model}
                      </h3>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                        Chassis: {hub.chassis}
                      </p>
                    </a>

                    {/* Quick Category Deep-Links for this Hub */}
                    <div className="mt-3 pt-3 border-t border-gray-50 flex flex-wrap gap-1.5">
                      {PRIMARY_CATEGORIES.slice(0, 3).map((cat) => (
                        <a
                          key={cat.slug}
                          href={`${hubUrl}/${encodeURIComponent(cat.slug)}`}
                          className="text-[9px] font-bold text-gray-500 hover:text-masuma-orange bg-gray-50 px-2 py-0.5 rounded transition"
                        >
                          {cat.name}
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Column 3: Component Categories & Policies */}
        <div className="space-y-10">
          {/* Primary Component Categories */}
          <div>
            <div className="flex items-center gap-2 border-b-2 border-masuma-dark pb-3 mb-6">
              <Wrench className="text-masuma-orange" size={20} />
              <h2 className="text-lg sm:text-xl font-bold font-display uppercase tracking-tight text-masuma-dark">
                Component Categories
              </h2>
            </div>
            <ul className="space-y-2.5">
              {PRIMARY_CATEGORIES.map((cat) => (
                <li key={cat.slug}>
                  <a
                    href={`/categories/${encodeURIComponent(cat.name)}`}
                    onClick={(e) => handleNav(e, 'CATALOG', `/categories/${encodeURIComponent(cat.name)}`)}
                    className="p-3 bg-white border border-gray-100 hover:border-masuma-orange rounded-xl flex items-center justify-between transition group"
                  >
                    <span className="text-xs font-bold text-masuma-dark group-hover:text-masuma-orange transition">
                      Masuma {cat.name}
                    </span>
                    <ArrowRight size={12} className="text-gray-300 group-hover:text-masuma-orange group-hover:translate-x-0.5 transition" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Core Store Policies & Customer Center */}
          <div>
            <div className="flex items-center gap-2 border-b-2 border-masuma-dark pb-3 mb-6">
              <FileText className="text-masuma-orange" size={20} />
              <h2 className="text-lg sm:text-xl font-bold font-display uppercase tracking-tight text-masuma-dark">
                Customer Care & Store Policies
              </h2>
            </div>
            <ul className="space-y-2 text-xs">
              <li>
                <a 
                  href="/warranty" 
                  onClick={(e) => handleNav(e, 'WARRANTY', '/warranty')}
                  className="block p-3 bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 rounded-xl transition"
                >
                  <strong className="text-masuma-dark block">12-Month Unlimited Mileage Warranty</strong>
                  <span className="text-[10px] text-gray-500">Official Japanese manufacturer replacement guarantee in Kenya.</span>
                </a>
              </li>
              <li>
                <a 
                  href="/returns" 
                  onClick={(e) => handleNav(e, 'RETURNS', '/returns')}
                  className="block p-3 bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 rounded-xl transition"
                >
                  <strong className="text-masuma-dark block">7-Day Return & Exchange Policy</strong>
                  <span className="text-[10px] text-gray-500">Easy returns and refund procedures at Ruby Mall CBD Nairobi.</span>
                </a>
              </li>
              <li>
                <a 
                  href="/part-finder" 
                  onClick={(e) => handleNav(e, 'PART_FINDER', '/part-finder')}
                  className="block p-3 bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 rounded-xl transition"
                >
                  <strong className="text-masuma-dark block">VIN & Chassis Search Engine</strong>
                  <span className="text-[10px] text-gray-500">Instant vehicle chassis match for exact Japanese parts.</span>
                </a>
              </li>
              <li>
                <a 
                  href="/faq" 
                  onClick={(e) => handleNav(e, 'FAQ', '/faq')}
                  className="block p-3 bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 rounded-xl transition"
                >
                  <strong className="text-masuma-dark block">Frequently Asked Questions (FAQ)</strong>
                  <span className="text-[10px] text-gray-500">Answers on ordering, bus courier delivery, and M-Pesa payments.</span>
                </a>
              </li>
              <li>
                <a 
                  href="/contact" 
                  onClick={(e) => handleNav(e, 'CONTACT', '/contact')}
                  className="block p-3 bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 rounded-xl transition"
                >
                  <strong className="text-masuma-dark block">CBD Counter & Contact Details</strong>
                  <span className="text-[10px] text-gray-500">Shop FF25 Ruby Mall, Accra Rd, Nairobi CBD. +254 792 506 590.</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SiteDirectory;
