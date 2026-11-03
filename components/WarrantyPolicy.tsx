import React from 'react';
import { ShieldCheck, RefreshCw, AlertTriangle, FileText, CheckCircle, ArrowRight, MapPin } from 'lucide-react';
import { ViewState } from '../types';

interface WarrantyPolicyProps {
  setView?: (view: ViewState) => void;
}

const WarrantyPolicy: React.FC<WarrantyPolicyProps> = ({ setView }) => {
  const handleNav = (e: React.MouseEvent, view: ViewState) => {
    e.preventDefault();
    if (setView) {
      setView(view);
      const path = view === 'RETURNS' ? '/returns' : (view === 'CATALOG' ? '/catalog' : `/${view.toLowerCase().replace('_', '-')}`);
      window.history.pushState({ path }, '', path);
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="animate-fade-in bg-white min-h-screen font-sans">
      {/* Header */}
      <div className="bg-masuma-dark text-white py-16 border-b-4 border-masuma-orange relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 text-masuma-orange rounded-full text-xs font-bold uppercase tracking-widest mb-4">
            <ShieldCheck size={14} /> Official Manufacturer Guarantee
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display uppercase tracking-wider mb-4">
            12-Month Quality Warranty
          </h1>
          <div className="h-1 w-24 bg-masuma-orange mx-auto mb-6"></div>
          <p className="mt-4 text-gray-300 text-base sm:text-lg max-w-2xl mx-auto">
            We stand behind every genuine Masuma part with Japanese precision engineering. Here is our official guarantee to vehicle owners and trade partners.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16 space-y-16 text-gray-700 leading-relaxed">
        
        {/* Warranty Section */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-masuma-orange/10 p-3 rounded-full text-masuma-orange">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-masuma-dark uppercase font-display">12-Month Masuma Warranty</h2>
              <span className="text-xs text-gray-400 uppercase tracking-widest font-mono">Regardless of Mileage</span>
            </div>
          </div>
          <div className="bg-gray-50 p-8 border-l-4 border-masuma-orange rounded-r-lg shadow-sm">
            <p className="mb-4">
              Masuma Autoparts East Africa Limited warrants all genuine products to be free from defects in material and workmanship for a period of <strong>12 months</strong> from the date of purchase, regardless of vehicle mileage.
            </p>
            <p>
              If a part fails due to a confirmed manufacturing defect during normal and proper use, we will replace it free of charge or issue a full refund in accordance with our warranty inspection procedure.
            </p>
          </div>
        </section>

        {/* Distinct Returns Link Banner */}
        <section className="bg-blue-50/70 border-2 border-blue-200 rounded-2xl p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="bg-blue-600 text-white p-3 rounded-xl shrink-0 mt-1">
              <RefreshCw size={24} />
            </div>
            <div className="flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block mb-1">
                Policy Distinction Notice
              </span>
              <h3 className="text-lg font-bold text-blue-950 font-display uppercase tracking-tight mb-2">
                Need To Return An Unused Part or Change An Order?
              </h3>
              <p className="text-xs sm:text-sm text-blue-900 leading-relaxed mb-4">
                <strong>Warranty and Returns are different:</strong> A return applies to eligible <em>unused and resalable products</em> in original packaging within 7 calendar days. A warranty claim applies to products <em>suspected to have a manufacturing defect</em>.
              </p>
              <a 
                href="/returns"
                onClick={(e) => handleNav(e, 'RETURNS')}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl transition shadow-md"
              >
                View Full Returns, Exchanges & Refund Policy <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </section>

        {/* Exclusions Section */}
        <section>
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-red-50 p-3 rounded-full text-red-600">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-masuma-dark uppercase font-display">Warranty Exclusions</h2>
          </div>
          <p className="mb-4 text-sm sm:text-base">This manufacturer warranty does not cover damage caused by:</p>
          <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base marker:text-masuma-orange">
            <li>Improper installation or use of special tools not recommended by the manufacturer.</li>
            <li>Use in competitive racing, off-road rallying, or commercial heavy-duty applications beyond OEM specs.</li>
            <li>Normal wear and tear (e.g., brake friction material wearing down over time is normal; debonding or plate crack is a defect).</li>
            <li>Accidents, road hazards, foreign object contamination, or unapproved vehicle modifications.</li>
          </ul>
        </section>

        {/* Claim Process */}
        <section className="bg-masuma-dark text-white p-8 rounded-2xl shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <FileText size={32} className="text-masuma-orange" />
            <h2 className="text-2xl font-bold uppercase font-display tracking-tight">How to File a Warranty Claim</h2>
          </div>
          <ol className="space-y-4 list-decimal pl-6 text-gray-300 text-sm">
            <li>Take clear photographs and video of the part, the failure point, and the original Masuma packaging.</li>
            <li>Contact our technical support team at <strong className="text-white">sales@masuma.africa</strong> or call / WhatsApp <strong className="text-white">+254 792 506 590</strong>.</li>
            <li>Submit the part with the vehicle details and professional garage diagnosis for technical inspection at our trade hub: <strong className="text-white">Ruby Mall, First Floor, Charles Rubia Road, Nairobi, Kenya</strong>.</li>
            <li>Upon technical verification of the defect, an immediate replacement or refund will be issued.</li>
          </ol>
        </section>

      </div>
    </div>
  );
};

export default WarrantyPolicy;
