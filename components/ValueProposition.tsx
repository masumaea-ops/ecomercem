import React from 'react';
import { 
  ShieldCheck, 
  Search, 
  Wrench, 
  Truck, 
  Store, 
  Building2, 
  CheckCircle2, 
  ArrowRight, 
  MessageCircle, 
  AlertTriangle, 
  Check, 
  Layers, 
  Car,
  FileCheck
} from 'lucide-react';
import { ViewState } from '../types';

interface ValuePropositionProps {
  setView: (view: ViewState) => void;
}

const ValueProposition: React.FC<ValuePropositionProps> = ({ setView }) => {
  const handleNav = (e: React.MouseEvent, view: ViewState) => {
    e.preventDefault();
    setView(view);
    const newUrl = view === 'CATALOG' ? '/catalog' : (view === 'HOME' ? '/' : `/${view.toLowerCase().replace('_', '-')}`);
    window.history.pushState({ path: newUrl }, '', newUrl);
    window.scrollTo(0, 0);
  };

  const productLines = [
    { title: 'Ceramic Brake Pads', desc: 'Low-dust, noise-free friction formulations' },
    { title: 'Oil, Air & Cabin Filters', desc: 'Micron-level filtration for dusty conditions' },
    { title: 'Iridium & Platinum Spark Plugs', desc: 'Precision ignition and optimal combustion' },
    { title: 'Shocks & Suspension Units', desc: 'Hydraulic dampers built for East African roads' },
    { title: 'Wheel Hubs & Bearings', desc: 'High-load Japanese steel bearing assemblies' },
    { title: 'Stabilizer Links & Bushings', desc: 'Reinforced ball joints for chassis stability' },
    { title: 'Sensors & Engine Management', desc: 'Oxygen, airflow, and ABS diagnostic sensors' },
    { title: 'Fuel Pumps & Delivery', desc: 'Consistent pressure delivery for EFI engines' },
    { title: 'Motor Oils & Lubricants', desc: 'Full synthetic & multi-grade engine protection' },
    { title: 'ATF & CVTF Transmission Fluids', desc: 'Precision hydraulic fluids for Japanese gearboxes' },
    { title: 'Long-Life Coolants', desc: 'Anti-corrosion glycol for tropical engine cooling' },
    { title: 'Hybrid Wiper Blades', desc: 'Aerodynamic steel-framed all-weather wipers' },
    { title: 'Automotive Batteries', desc: 'Maintenance-free high-cranking calcium units' },
    { title: 'TPMS & Lighting Systems', desc: 'Tire pressure sensors & high-output bulbs' }
  ];

  const audiences = [
    {
      title: 'Vehicle Owners',
      role: 'Private Drivers',
      desc: 'Get genuine Japanese replacement parts without dealer monopoly pricing. Protect your car with components that match factory specifications.',
      cta: 'Browse Catalog',
      view: 'CATALOG' as ViewState
    },
    {
      title: 'Garages & Mechanics',
      role: 'Automotive Technicians',
      desc: 'Precision fitment that installs cleanly without modifications. Eliminate warranty bounce-backs with parts tested for Kenyan road conditions.',
      cta: 'Technical Fitment',
      view: 'PART_FINDER' as ViewState
    },
    {
      title: 'Spare Parts Retailers',
      role: 'Auto Spares Shops',
      desc: 'Expand your retail inventory with an internationally recognized brand. Gain healthy wholesale margins and fast regional fulfillment.',
      cta: 'Wholesale Inquiries',
      view: 'CONTACT' as ViewState
    },
    {
      title: 'Fleets & Commercial Users',
      role: 'Transport Operators',
      desc: 'Minimize vehicle downtime with scheduled maintenance components. Predictable operating costs and verified fleet durability.',
      cta: 'Fleet Inquiries',
      view: 'CONTACT' as ViewState
    }
  ];

  return (
    <section className="bg-white border-b border-gray-100 font-sans">
      {/* 1. Value Anchor Bar: The 4 Core Guarantees */}
      <div className="border-y border-gray-200 bg-gray-50/70">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-gray-200">
            <div className="flex items-center gap-3.5 pt-3 md:pt-0">
              <div className="w-10 h-10 rounded-lg bg-masuma-dark text-white flex items-center justify-center shrink-0">
                <ShieldCheck size={20} className="text-masuma-orange" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase text-masuma-dark tracking-tight">Masuma Japan Direct</h3>
                <p className="text-[11px] text-gray-500 leading-tight">Distributor & regional brand builder</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 pt-3 md:pt-0 md:pl-6">
              <div className="w-10 h-10 rounded-lg bg-masuma-dark text-white flex items-center justify-center shrink-0">
                <FileCheck size={20} className="text-masuma-orange" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase text-masuma-dark tracking-tight">Chassis & VIN Fitment</h3>
                <p className="text-[11px] text-gray-500 leading-tight">Right application, the first time</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 pt-3 md:pt-0 md:pl-6">
              <div className="w-10 h-10 rounded-lg bg-masuma-dark text-white flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} className="text-masuma-orange" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase text-masuma-dark tracking-tight">12-Month Warranty</h3>
                <p className="text-[11px] text-gray-500 leading-tight">Defect replacement guarantee</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 pt-3 md:pt-0 md:pl-6">
              <div className="w-10 h-10 rounded-lg bg-masuma-dark text-white flex items-center justify-center shrink-0">
                <Building2 size={20} className="text-masuma-orange" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase text-masuma-dark tracking-tight">Nairobi Central Hub</h3>
                <p className="text-[11px] text-gray-500 leading-tight">Ruby Mall, Charles Rubia Road</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. The Market Dilemma: Why Masuma East Africa Exists */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="max-w-3xl mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-md mb-3">
            <span className="w-1.5 h-1.5 bg-masuma-orange rounded-full"></span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-masuma-dark">Market Reality & Solution</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-masuma-dark uppercase tracking-tight font-display">
            Genuine Quality Without The Dealer Price
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mt-4 leading-relaxed font-normal">
            Vehicle owners in East Africa often face an unfair choice between expensive dealer parts, counterfeit products, or low-cost aftermarket components that fail prematurely on tough terrain. We provide a dependable third alternative: <strong>engineered Japanese quality, verified fitment, and consumer-friendly pricing.</strong>
          </p>
        </div>

        {/* 3-Way Comparative Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Main Dealer */}
          <div className="bg-gray-50 p-6 lg:p-8 rounded-2xl border border-gray-200 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-2">Option 1</div>
              <h3 className="text-base font-bold text-gray-700 uppercase tracking-tight mb-4">Official Dealerships</h3>
              <ul className="space-y-3 text-xs text-gray-600">
                <li className="flex items-start gap-2.5">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span><strong>High Cost:</strong> Exorbitant retail markups and franchise overheads.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span><strong>Limited Coverage:</strong> Frequently out of stock for vehicles older than 5 years.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span><strong>Long Lead Times:</strong> Multi-week backorders from overseas hubs.</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-200 text-[11px] font-semibold text-gray-500">
              Result: Punishing maintenance costs for everyday drivers.
            </div>
          </div>

          {/* Column 2: Cheap/Counterfeit Market */}
          <div className="bg-red-50/50 p-6 lg:p-8 rounded-2xl border border-red-200 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-red-500 mb-2">Option 2</div>
              <h3 className="text-base font-bold text-red-900 uppercase tracking-tight mb-4">Unverified / Counterfeit Spares</h3>
              <ul className="space-y-3 text-xs text-red-800/80">
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span><strong>Uncertain Lifespan:</strong> Sub-standard metallurgy and friction materials that degrade rapidly.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span><strong>No Warranty:</strong> Sellers rarely honor replacements once the box is opened.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span><strong>Safety Hazards:</strong> Risk of brake failure, ball-joint shearing, or engine seizure.</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-red-200 text-[11px] font-semibold text-red-700">
              Result: False economy resulting in repeat garage bills.
            </div>
          </div>

          {/* Column 3: Masuma East Africa */}
          <div className="bg-masuma-dark text-white p-6 lg:p-8 rounded-2xl border-2 border-masuma-orange flex flex-col justify-between shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-masuma-orange text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-lg">
              The Masuma Standard
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-masuma-orange mb-2">The Solution</div>
              <h3 className="text-base font-bold text-white uppercase tracking-tight mb-4">Masuma Autoparts EA</h3>
              <ul className="space-y-3 text-xs text-gray-200">
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-masuma-orange shrink-0 mt-0.5" />
                  <span><strong>Tokyo Engineering:</strong> Manufactured to strict OE geometry and tolerances.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-masuma-orange shrink-0 mt-0.5" />
                  <span><strong>12-Month Warranty:</strong> Backed by direct regional brand distributor replacement.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-masuma-orange shrink-0 mt-0.5" />
                  <span><strong>Consumer-Friendly Pricing:</strong> High value without inflated middleman margins.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check size={16} className="text-masuma-orange shrink-0 mt-0.5" />
                  <span><strong>Accurate Fitment:</strong> Chassis number & VIN verification before dispatch.</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-masuma-orange">Do It Right. Do It Once.</span>
              <a 
                href="/catalog" 
                onClick={(e) => handleNav(e, 'CATALOG')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-white hover:text-masuma-orange transition-colors"
              >
                Shop Now <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Fitment First Banner: The Right Part. The Right Application. */}
      <div className="bg-gray-100 py-16 border-y border-gray-200">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-gray-200 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-widest text-masuma-orange">Precision Fitment Policy</span>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold font-display uppercase text-masuma-dark mt-2 tracking-tight">
                The Right Part. The Right Application. The First Time.
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-3 leading-relaxed">
                In Kenya, vehicles of the same model name often feature different engine variants, production generations, or chassis specs. Never gamble on guessing part numbers. Provide your <strong>Chassis Number, VIN, or OEM Part Number</strong>, and our Nairobi technical desk will verify exact vehicle compatibility before you finalize your order.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
              <a 
                href="/part-finder"
                onClick={(e) => handleNav(e, 'PART_FINDER')}
                className="bg-masuma-dark hover:bg-masuma-orange text-white font-bold text-xs uppercase tracking-widest px-6 py-4 rounded-xl transition duration-300 flex items-center justify-center gap-2 shadow-lg"
              >
                <Search size={16} /> Look Up By VIN / Chassis
              </a>
              <a 
                href="https://wa.me/254792506590?text=Hello%20Masuma%20EA,%20I%20would%20like%20to%20verify%20part%20fitment%20for%20my%20vehicle.%20My%20Chassis/VIN%20is:%20"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs uppercase tracking-widest px-6 py-4 rounded-xl transition duration-300 flex items-center justify-center gap-2 shadow-lg"
              >
                <MessageCircle size={16} fill="currentColor" /> WhatsApp Technical Desk
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Serving the Automotive Aftermarket: 4 Key Ecosystem Audiences */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-masuma-orange">Ecosystem Support</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-masuma-dark uppercase tracking-tight font-display mt-2">
            Serving The Entire Aftermarket
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-2">
            From single vehicle owners to fleet commercial managers and spare parts stockists.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {audiences.map((aud, idx) => (
            <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-200 hover:border-masuma-orange hover:shadow-lg transition-all flex flex-col justify-between group">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-masuma-orange bg-orange-50 px-2 py-0.5 rounded">
                    {aud.role}
                  </span>
                  <span className="text-xs font-mono text-gray-300">0{idx + 1}</span>
                </div>
                <h3 className="text-base font-bold text-masuma-dark uppercase tracking-tight mb-2 group-hover:text-masuma-orange transition-colors">
                  {aud.title}
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {aud.desc}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <a 
                  href={aud.view === 'CATALOG' ? '/catalog' : (aud.view === 'PART_FINDER' ? '/part-finder' : '/contact')}
                  onClick={(e) => handleNav(e, aud.view)}
                  className="text-xs font-bold uppercase tracking-wider text-masuma-dark group-hover:text-masuma-orange transition-colors inline-flex items-center gap-1.5"
                >
                  {aud.cta} <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Complete Vehicle Systems Portfolio */}
      <div className="bg-gray-50 py-16 border-t border-gray-200">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-masuma-orange">System Coverage</span>
              <h2 className="text-2xl sm:text-3xl font-bold font-display uppercase text-masuma-dark tracking-tight mt-1">
                Full Systems Replacement Portfolio
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Engineered for Japanese, European, and American vehicle platforms across East Africa.
              </p>
            </div>
            <a 
              href="/catalog"
              onClick={(e) => handleNav(e, 'CATALOG')}
              className="text-xs font-bold uppercase tracking-widest text-masuma-dark hover:text-masuma-orange transition-colors inline-flex items-center gap-1.5 self-start md:self-auto"
            >
              View Complete Parts Catalog <ArrowRight size={14} />
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {productLines.map((prod, idx) => (
              <div 
                key={idx}
                onClick={(e) => handleNav(e, 'CATALOG')}
                className="bg-white p-3.5 rounded-xl border border-gray-200 hover:border-masuma-orange transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-[11px] font-bold text-masuma-dark uppercase tracking-tight group-hover:text-masuma-orange transition-colors leading-tight mb-1">
                    {prod.title}
                  </h3>
                  <p className="text-[10px] text-gray-600 line-clamp-2 leading-tight">
                    {prod.desc}
                  </p>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="text-[9px] font-bold uppercase text-gray-600 group-hover:text-masuma-orange transition-colors">
                    In Stock →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ValueProposition;
