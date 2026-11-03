import React, { useEffect } from 'react';
import { 
  ShieldCheck, 
  Check, 
  Search, 
  Wrench, 
  Truck, 
  Store, 
  Building2, 
  Users, 
  MapPin, 
  Phone, 
  Mail, 
  ArrowRight, 
  MessageCircle, 
  Layers, 
  CheckCircle2, 
  FileCheck,
  Target,
  Eye,
  Award
} from 'lucide-react';
import { ViewState } from '../types';
import SEO from './SEO';

interface AboutProps {
  setView: (view: ViewState) => void;
}

const About: React.FC<AboutProps> = ({ setView }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleNav = (e: React.MouseEvent, view: ViewState) => {
    e.preventDefault();
    setView(view);
    const newUrl = view === 'CATALOG' ? '/catalog' : (view === 'HOME' ? '/' : `/${view.toLowerCase().replace('_', '-')}`);
    window.history.pushState({ path: newUrl }, '', newUrl);
    window.scrollTo(0, 0);
  };

  const productPortfolio = [
    'Ceramic brake pads',
    'Oil, air and cabin filters',
    'Spark plugs (Iridium & Platinum)',
    'Shocks and suspension components',
    'Wheel hubs and bearings',
    'Stabilizer links and suspension parts',
    'Sensors and electrical components',
    'Fuel pumps and fuel-system components',
    'Automotive oils',
    'ATF and CVTF fluids',
    'Long-life coolants',
    'Wiper blades',
    'Automotive batteries',
    'TPMS and lighting products'
  ];

  const customerSegments = [
    {
      title: 'Vehicle Owners',
      desc: 'We help individual vehicle owners find replacement and maintenance parts for their cars without relying solely on expensive dealer channels.',
      cta: 'Explore Catalog',
      view: 'CATALOG' as ViewState
    },
    {
      title: 'Garages and Mechanics',
      desc: 'We support technicians and workshops with parts identification, product technical information, and dependable supply for customer vehicles.',
      cta: 'Part Finder Desk',
      view: 'PART_FINDER' as ViewState
    },
    {
      title: 'Spare Parts Retailers',
      desc: 'We work with businesses looking to expand their product offering with a growing automotive parts catalogue and an established international brand.',
      cta: 'Contact Trade Desk',
      view: 'CONTACT' as ViewState
    },
    {
      title: 'Fleets and Commercial Users',
      desc: 'Reliable maintenance is critical for businesses operating multiple vehicles. We supply parts for routine maintenance and replacement requirements across applicable vehicle fleets.',
      cta: 'Fleet Inquiries',
      view: 'CONTACT' as ViewState
    },
    {
      title: 'Wholesale and Trade Customers',
      desc: 'Our distribution model is designed to support the independent automotive trade, including retailers, workshops and other automotive businesses seeking competitive wholesale supply.',
      cta: 'Partner With Us',
      view: 'CONTACT' as ViewState
    }
  ];

  return (
    <div className="bg-white min-h-screen font-sans text-gray-900">
      <SEO 
        title="About Us | Quality Parts. Trusted Performance. | Masuma East Africa" 
        description="Masuma Autoparts East Africa is the distributor and regional brand builder for Masuma Japan. Brand new, genuine-quality automotive replacement parts in Kenya without the dealer markup."
      />

      {/* 1. Header Hero */}
      <section className="bg-masuma-dark text-white py-20 lg:py-28 relative overflow-hidden border-b-4 border-masuma-orange">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/20 rounded-md mb-6 backdrop-blur-md">
              <span className="w-2 h-2 bg-masuma-orange rounded-full"></span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-gray-200">
                Distributor & Regional Brand Builder for Masuma Japan
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold uppercase tracking-tight font-display leading-tight mb-6">
              Quality Parts. <br />
              <span className="text-masuma-orange">Trusted Performance.</span>
            </h1>

            <p className="text-base sm:text-lg text-gray-300 font-normal leading-relaxed mb-8 border-l-2 border-masuma-orange pl-6">
              <strong>Masuma Autoparts East Africa</strong> is a Kenya-based automotive parts company serving vehicle owners, workshops, garages, retailers, fleets and automotive businesses across Kenya and the wider East African market. We exist to make <strong>reliable, genuine-quality automotive replacement parts more accessible and affordable.</strong>
            </p>

            <div className="flex flex-wrap gap-4">
              <a 
                href="/catalog"
                onClick={(e) => handleNav(e, 'CATALOG')}
                className="bg-masuma-orange hover:bg-white hover:text-masuma-orange text-white font-bold text-xs uppercase tracking-widest px-8 py-4 rounded-none transition duration-300 shadow-xl inline-flex items-center gap-2"
              >
                Browse Inventory <ArrowRight size={16} />
              </a>
              <a 
                href="https://wa.me/254792506590?text=Hello%20Masuma%20East%20Africa,%20I%20have%20an%20inquiry%20regarding%20parts."
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 hover:bg-[#25D366] hover:border-[#25D366] border border-white/20 text-white font-bold text-xs uppercase tracking-widest px-8 py-4 rounded-none transition duration-300 inline-flex items-center gap-2 shadow-xl"
              >
                <MessageCircle size={16} fill="currentColor" /> Direct WhatsApp Desk
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Executive Statement: The Aftermarket Challenge */}
      <section className="py-16 lg:py-20 bg-gray-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-masuma-orange">The Aftermarket Dilemma</span>
          <h2 className="text-2xl sm:text-3xl font-bold font-display uppercase tracking-tight text-masuma-dark mt-2 mb-6">
            A Better Way To Maintain Vehicles in East Africa
          </h2>
          <p className="text-sm sm:text-base text-gray-700 leading-relaxed font-normal">
            The automotive aftermarket can be challenging. Vehicle owners often have to choose between expensive dealer parts, uncertain aftermarket quality, counterfeit products, or low-cost components that may not deliver the expected service life. At Masuma Autoparts East Africa, we are building a different approach: <strong>quality parts, accurate fitment information, competitive pricing and dependable customer support.</strong>
          </p>
        </div>
      </section>

      {/* 3. Our Relationship with Masuma Japan */}
      <section className="py-16 lg:py-24 border-b border-gray-100">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-masuma-orange">International Manufacturing & Local Distribution</span>
              <h2 className="text-2xl sm:text-4xl font-extrabold font-display uppercase text-masuma-dark tracking-tight mt-2 mb-6">
                Our Relationship With Masuma Japan
              </h2>
              <div className="space-y-4 text-sm sm:text-base text-gray-700 leading-relaxed">
                <p>
                  Masuma is an established automotive parts brand originating from Japan, with its headquarters in Tokyo and a broad catalogue covering thousands of automotive applications.
                </p>
                <p className="bg-gray-50 p-5 border-l-4 border-masuma-dark font-medium text-masuma-dark rounded-r">
                  <strong>Masuma Japan is the manufacturer and brand owner, while Masuma Autoparts East Africa operates as the distributor and local brand builder in Kenya and the East African market.</strong>
                </p>
                <p>
                  Our role goes beyond selling parts. We are developing the infrastructure, customer relationships, market presence and distribution channels required to make Masuma a trusted automotive aftermarket brand in the region.
                </p>
                <p>
                  We work to connect the manufacturer's product range with the realities of the East African automotive market, where vehicle age, road conditions, maintenance practices, availability of parts and affordability all influence purchasing decisions.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-8 sm:p-10 rounded-2xl border border-gray-200 space-y-6">
              <h3 className="text-base font-bold uppercase tracking-tight text-masuma-dark flex items-center gap-2">
                <Building2 size={20} className="text-masuma-orange" /> Regional Brand Builder Infrastructure
              </h3>
              <div className="space-y-4 text-xs text-gray-600">
                <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-gray-200">
                  <CheckCircle2 size={18} className="text-masuma-orange shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-masuma-dark uppercase tracking-tight text-xs">Direct Supply Channel</h4>
                    <p className="mt-0.5 leading-normal">Direct pipeline from Tokyo manufacturing lines to our central Nairobi distribution warehouse.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-gray-200">
                  <CheckCircle2 size={18} className="text-masuma-orange shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-masuma-dark uppercase tracking-tight text-xs">Tropical & Severe-Road Specifications</h4>
                    <p className="mt-0.5 leading-normal">Components configured and selected to endure heat, dust, and severe road vibration typical of East Africa.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-white p-4 rounded-xl border border-gray-200">
                  <CheckCircle2 size={18} className="text-masuma-orange shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-masuma-dark uppercase tracking-tight text-xs">12-Month Official Warranty</h4>
                    <p className="mt-0.5 leading-normal">Local replacement support backed directly by the regional distributor. No overseas claim delays.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Fitment First: Built Around The Right Part */}
      <section className="py-16 lg:py-24 bg-masuma-dark text-white border-b border-gray-800">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-widest text-masuma-orange">Core Engineering Philosophy</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold font-display uppercase tracking-tight mt-2 mb-6">
              Built Around The Right Part
            </h2>
            <p className="text-sm sm:text-base text-gray-300 leading-relaxed mb-6 font-normal">
              One of the biggest problems in the automotive aftermarket is not simply finding a part. It is finding the <strong>right part for the specific vehicle</strong>.
            </p>
            <p className="text-sm sm:text-base text-gray-300 leading-relaxed mb-8 font-normal">
              A vehicle may have several engine variants, model generations, transmission types or production specifications. A part that looks correct may still be the wrong application. That is why we place strong emphasis on <strong>fitment verification</strong>.
            </p>

            <div className="bg-white/5 border border-white/10 p-6 sm:p-8 rounded-xl mb-8">
              <p className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-2">Our Standard</p>
              <h3 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-masuma-orange font-display">
                The Right Part. The Right Application. The First Time.
              </h3>
              <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                Customers can provide a <strong>chassis number, VIN, vehicle model, engine information or OEM part number</strong>, where available, so that the appropriate application can be checked before purchase.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <a 
                href="/part-finder"
                onClick={(e) => handleNav(e, 'PART_FINDER')}
                className="bg-masuma-orange hover:bg-white hover:text-masuma-orange text-white font-bold text-xs uppercase tracking-widest px-8 py-4 transition shadow-lg inline-flex items-center gap-2"
              >
                <Search size={16} /> Use Part Finder
              </a>
              <a 
                href="https://wa.me/254792506590?text=Hello%20Masuma%20EA,%20please%20verify%20fitment%20for%20my%20chassis%20number:%20"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 hover:bg-[#25D366] text-white border border-white/20 font-bold text-xs uppercase tracking-widest px-8 py-4 transition shadow-lg inline-flex items-center gap-2"
              >
                <MessageCircle size={16} fill="currentColor" /> Send Chassis via WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Genuine Quality Without The Dealer Price */}
      <section className="py-16 lg:py-24 border-b border-gray-100">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-masuma-orange">Value Proposition</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold font-display uppercase text-masuma-dark tracking-tight mt-2 mb-4">
              Genuine Quality Without The Dealer Price
            </h2>
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed font-normal">
              Masuma Autoparts East Africa was built around a simple market need: <strong>vehicle owners should not have to compromise between quality and affordability.</strong>
            </p>
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed mt-3 font-normal">
              We understand that genuine dealer parts can be expensive, while the cheapest aftermarket option may introduce uncertainty around quality, durability or fitment. Masuma provides an alternative for the independent aftermarket by offering professionally manufactured replacement parts at <strong>consumer-friendly prices and strong value for money</strong>.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 p-6 sm:p-8 rounded-2xl border border-gray-200 text-center">
            <div className="p-4">
              <span className="text-xs uppercase font-bold text-gray-400 block mb-1">Standard</span>
              <span className="text-base sm:text-lg font-bold text-masuma-dark uppercase tracking-tight">Brand New</span>
            </div>
            <div className="p-4 border-l border-gray-200">
              <span className="text-xs uppercase font-bold text-gray-400 block mb-1">Authenticity</span>
              <span className="text-base sm:text-lg font-bold text-masuma-dark uppercase tracking-tight">Genuine</span>
            </div>
            <div className="p-4 border-l border-gray-200">
              <span className="text-xs uppercase font-bold text-gray-400 block mb-1">Performance</span>
              <span className="text-base sm:text-lg font-bold text-masuma-dark uppercase tracking-tight">Trusted Quality</span>
            </div>
            <div className="p-4 border-l border-gray-200">
              <span className="text-xs uppercase font-bold text-gray-400 block mb-1">Economics</span>
              <span className="text-base sm:text-lg font-bold text-masuma-orange uppercase tracking-tight">Affordable</span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. What We Do - Full Product Portfolio */}
      <section className="py-16 lg:py-24 bg-gray-50 border-b border-gray-200">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-masuma-orange">Catalog Coverage</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display uppercase text-masuma-dark tracking-tight mt-2 mb-4">
              What We Supply
            </h2>
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed font-normal">
              We supply replacement and maintenance components across a growing range of vehicle systems for <strong>Japanese, European and American vehicles</strong>, with product information and fitment references designed to make part identification easier.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {productPortfolio.map((item, idx) => (
              <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 flex items-center gap-3">
                <Check size={18} className="text-masuma-orange shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-masuma-dark uppercase tracking-tight">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Serving the Automotive Aftermarket: 5 Audience Profiles */}
      <section className="py-16 lg:py-24 border-b border-gray-100">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-masuma-orange">Target Ecosystem</span>
            <h2 className="text-2xl sm:text-4xl font-extrabold font-display uppercase text-masuma-dark tracking-tight mt-2 mb-4">
              Serving The Automotive Aftermarket
            </h2>
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed font-normal">
              Our customers come from across the automotive ecosystem. We tailor our product delivery, support, and terms to the unique operating realities of each group.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {customerSegments.map((seg, idx) => (
              <div key={idx} className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 flex flex-col justify-between hover:border-masuma-orange hover:shadow-md transition">
                <div>
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block mb-2">0{idx + 1}</span>
                  <h3 className="text-lg font-bold uppercase text-masuma-dark tracking-tight mb-3">{seg.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{seg.desc}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <a 
                    href={seg.view === 'CATALOG' ? '/catalog' : (seg.view === 'PART_FINDER' ? '/part-finder' : '/contact')}
                    onClick={(e) => handleNav(e, seg.view)}
                    className="text-xs font-bold uppercase text-masuma-dark hover:text-masuma-orange transition inline-flex items-center gap-1.5"
                  >
                    {seg.cta} <ArrowRight size={13} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Technology & Building Trust */}
      <section className="py-16 lg:py-24 bg-gray-50 border-b border-gray-200">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Tech */}
            <div className="bg-white p-8 sm:p-10 rounded-2xl border border-gray-200">
              <span className="text-xs font-bold uppercase tracking-widest text-masuma-orange">Digital Efficiency</span>
              <h3 className="text-xl sm:text-2xl font-bold font-display uppercase text-masuma-dark tracking-tight mt-2 mb-4">
                Technology & Modern Parts Buying
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-4">
                We believe the automotive parts business should be easier to navigate. Our digital platforms are developed to make it easier for customers to <strong>search for parts, check applications, view product information, understand pricing and place orders.</strong>
              </p>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-4">
                Our online catalogue at <strong>shop.masuma.africa</strong> gives customers access to part-number searches, technical specifications, available stock and online purchasing.
              </p>
              <p className="text-xs text-gray-500 italic border-l-2 border-masuma-orange pl-3">
                "Technology is not replacing automotive expertise. It is being used to make that expertise more accessible."
              </p>
            </div>

            {/* Building Trust */}
            <div className="bg-white p-8 sm:p-10 rounded-2xl border border-gray-200">
              <span className="text-xs font-bold uppercase tracking-widest text-masuma-orange">Brand Integrity</span>
              <h3 className="text-xl sm:text-2xl font-bold font-display uppercase text-masuma-dark tracking-tight mt-2 mb-4">
                Building Trust in the Kenyan Market
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-4">
                Masuma Autoparts East Africa is committed to building a brand based on <strong>consistency, transparency and customer confidence</strong>. We believe trust in the aftermarket is earned through every transaction:
              </p>
              <ul className="space-y-2 text-xs text-gray-600">
                <li className="flex items-center gap-2"><Check size={14} className="text-masuma-orange" /> Supplying the correct application</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-masuma-orange" /> Providing clear, accurate product information</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-masuma-orange" /> Transparent pricing (Excl. and Incl. 16% VAT)</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-masuma-orange" /> Supporting customers before and after purchase</li>
                <li className="flex items-center gap-2"><Check size={14} className="text-masuma-orange" /> Maintaining professional business standards</li>
              </ul>
              <p className="text-xs text-gray-700 font-semibold mt-4">
                A strong brand is built when a mechanic installs a part, the vehicle performs as expected, and the customer comes back because the experience worked.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Vision & Mission Grid */}
      <section className="py-16 lg:py-24 border-b border-gray-100">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 sm:p-10 rounded-2xl bg-masuma-dark text-white border-t-4 border-masuma-orange">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center mb-4">
                <Eye size={20} className="text-masuma-orange" />
              </div>
              <h3 className="text-xl font-bold font-display uppercase tracking-tight mb-3">Our Vision</h3>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                To build <strong>Masuma into a recognized and trusted automotive aftermarket brand across East Africa</strong>. We see an opportunity to create a stronger connection between international automotive manufacturing and the rapidly developing African aftermarket.
              </p>
            </div>

            <div className="p-8 sm:p-10 rounded-2xl bg-gray-50 border border-gray-200 border-t-4 border-masuma-dark">
              <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center mb-4">
                <Target size={20} className="text-masuma-dark" />
              </div>
              <h3 className="text-xl font-bold font-display uppercase tracking-tight text-masuma-dark mb-3">Our Mission</h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                To <strong>provide reliable automotive replacement parts at accessible prices while making vehicle maintenance simpler, more transparent and more dependable.</strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. FAQ Knowledge Base Banner */}
      <section className="py-12 bg-gray-100 border-b border-gray-200">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white p-6 sm:p-8 rounded-2xl border border-gray-200">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-masuma-orange">Customer Knowledge Base</span>
              <h3 className="text-lg sm:text-xl font-bold uppercase font-display text-masuma-dark tracking-tight mt-1">
                Have Questions About Fitment, Warranty, or Delivery?
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Read our comprehensive Frequently Asked Questions covering chassis checks, brake pads, fluids, wholesale orders, and more.
              </p>
            </div>
            <a 
              href="/faq"
              onClick={(e) => handleNav(e, 'FAQ')}
              className="bg-masuma-dark hover:bg-masuma-orange text-white text-xs font-bold uppercase tracking-widest px-6 py-3.5 rounded-none transition duration-300 inline-flex items-center gap-2 shrink-0 shadow-md"
            >
              Read Full FAQ <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* 11. Our Promise & Physical Contact Anchor */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-50 border-2 border-gray-200 rounded-3xl p-8 sm:p-12">
            <div className="max-w-3xl mb-8">
              <span className="text-xs font-bold uppercase tracking-widest text-masuma-orange">Our Promise</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold uppercase font-display text-masuma-dark tracking-tight mt-1">
                Quality Parts. Trusted Performance.
              </h2>
              <p className="text-base font-bold text-masuma-orange uppercase tracking-widest mt-1">
                Do It Right. Do It Once.
              </p>
              <p className="text-xs sm:text-sm text-gray-600 mt-4 leading-relaxed">
                When you buy an automotive part, you are not simply buying a box. You are buying confidence that the component is appropriate for your vehicle, that you understand what you are purchasing, and that you are receiving genuine value for your money.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-200">
              <div className="flex items-start gap-3">
                <MapPin size={20} className="text-masuma-orange shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase text-masuma-dark">Physical Hub</h4>
                  <p className="text-xs text-gray-600 mt-0.5">Ruby Mall, First Floor, Charles Rubia Road, Nairobi, Kenya</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone size={20} className="text-masuma-orange shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase text-masuma-dark">Direct Support</h4>
                  <p className="text-xs text-gray-600 mt-0.5">+254 792 506 590</p>
                  <p className="text-[11px] text-gray-400">Call / WhatsApp fitment desk</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail size={20} className="text-masuma-orange shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold uppercase text-masuma-dark">Digital Portals</h4>
                  <p className="text-xs text-gray-600 mt-0.5">masuma.africa | shop.masuma.africa</p>
                  <p className="text-[11px] text-gray-400">sales@masuma.africa</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;