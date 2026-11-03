import React from 'react';
import { 
  RotateCcw, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Package, 
  Clock, 
  Truck, 
  Wrench, 
  MessageCircle, 
  ExternalLink, 
  Car, 
  Info, 
  HelpCircle,
  Check,
  XCircle,
  Layers,
  ArrowRight
} from 'lucide-react';
import SEO from './SEO';
import { ViewState } from '../types';

interface ReturnsPolicyProps {
  setView?: (view: ViewState) => void;
}

const ReturnsPolicy: React.FC<ReturnsPolicyProps> = ({ setView }) => {
  const handleNav = (e: React.MouseEvent, view: ViewState) => {
    e.preventDefault();
    if (setView) {
      setView(view);
      const path = view === 'CATALOG' ? '/catalog' : (view === 'HOME' ? '/' : `/${view.toLowerCase().replace('_', '-')}`);
      window.history.pushState({ path }, '', path);
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="animate-fade-in bg-white min-h-screen font-sans">
      <SEO 
        title="Returns, Exchanges & Refund Policy | Masuma Kenya" 
        description="Official Masuma Autoparts East Africa Returns, Exchanges & Refund Policy. 7-day return window for eligible unused, uninstalled parts in original packaging. 12-month defect replacement warranty."
        keywords="Masuma returns policy, car parts returns Kenya, auto parts refund Nairobi, spare parts exchange Kenya, Masuma warranty Nairobi"
        url="https://masuma.africa/returns"
      />
      
      {/* Header Banner */}
      <div className="bg-masuma-dark text-white py-16 md:py-20 border-b-4 border-masuma-orange relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <svg width="100%" height="100%">
            <pattern id="wm-returns-hero" x="0" y="0" width="160" height="160" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
              <text x="0" y="80" className="font-display font-bold text-sm uppercase tracking-widest fill-white">MASUMA EA LTD</text>
            </pattern>
            <rect width="100%" height="100%" fill="url(#wm-returns-hero)" />
          </svg>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 text-masuma-orange rounded-full text-xs font-bold uppercase tracking-widest mb-4 backdrop-blur-sm">
            <RotateCcw size={14} /> Official Customer Policy
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display uppercase tracking-tight text-white mb-4">
            Returns, Exchanges & Refund Policy
          </h1>
          <div className="h-1 w-24 bg-masuma-orange mx-auto mb-6"></div>
          <p className="text-gray-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            At <strong className="text-white">Masuma Autoparts East Africa</strong>, we want you to receive the correct part for your vehicle and have confidence in your purchase.
          </p>
          <p className="text-xs text-gray-400 mt-4 font-mono uppercase tracking-wider">
            Effective Date: 22 September 2026
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 text-gray-700 leading-relaxed">

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200/70 text-center">
            <Clock className="text-masuma-orange mx-auto mb-2" size={26} />
            <span className="block text-xs font-bold uppercase tracking-wider text-masuma-dark">7 Calendar Days</span>
            <span className="text-[11px] text-gray-500">Return window for unused parts</span>
          </div>

          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200/70 text-center">
            <Package className="text-masuma-orange mx-auto mb-2" size={26} />
            <span className="block text-xs font-bold uppercase tracking-wider text-masuma-dark">Unopened / Uninstalled</span>
            <span className="text-[11px] text-gray-500">Original packaging & seals</span>
          </div>

          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200/70 text-center">
            <RotateCcw className="text-masuma-orange mx-auto mb-2" size={26} />
            <span className="block text-xs font-bold uppercase tracking-wider text-masuma-dark">5–7 Business Days</span>
            <span className="text-[11px] text-gray-500">Refund processing upon approval</span>
          </div>

          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200/70 text-center">
            <ShieldCheck className="text-masuma-orange mx-auto mb-2" size={26} />
            <span className="block text-xs font-bold uppercase tracking-wider text-masuma-dark">12-Month Warranty</span>
            <span className="text-[11px] text-gray-500">Manufacturing defect coverage</span>
          </div>
        </div>

        {/* Opening Notice */}
        <div className="bg-amber-50/80 border-l-4 border-amber-500 p-5 sm:p-6 mb-12 rounded-r-xl">
          <div className="flex items-start gap-3">
            <Info size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-amber-900 leading-relaxed">
              <p className="font-semibold mb-1">Vehicle-Specific Components Notice</p>
              <p>
                Because automotive parts are often vehicle-specific and some products cannot be resold once opened or installed, returns are subject to the conditions set out below. Please read these terms carefully before initiating a return or ordering fitment-sensitive components.
              </p>
            </div>
          </div>
        </div>

        {/* Policy Content Sections */}
        <div className="space-y-12 divide-y divide-gray-100">

          {/* 1. Eligibility for Returns */}
          <section className="pt-8 first:pt-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-masuma-dark text-white flex items-center justify-center font-bold text-sm shrink-0">1</div>
              <h2 className="text-xl sm:text-2xl font-bold text-masuma-dark uppercase font-display tracking-tight">
                Eligibility for Returns
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Eligible unused products may be returned within <strong className="text-masuma-dark">7 calendar days</strong> from the date of delivery or collection.
            </p>
            <p className="text-sm font-semibold text-gray-800 mb-3">To qualify for a return, the product must:</p>
            <ul className="grid sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-600 mb-4">
              <li className="flex items-start gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <Check className="text-green-600 shrink-0 mt-0.5" size={16} />
                <span>Be unused and uninstalled.</span>
              </li>
              <li className="flex items-start gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <Check className="text-green-600 shrink-0 mt-0.5" size={16} />
                <span>Be in its original, undamaged packaging.</span>
              </li>
              <li className="flex items-start gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <Check className="text-green-600 shrink-0 mt-0.5" size={16} />
                <span>Have all original labels, markings, seals and accessories intact.</span>
              </li>
              <li className="flex items-start gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <Check className="text-green-600 shrink-0 mt-0.5" size={16} />
                <span>Not have been modified, altered or damaged.</span>
              </li>
              <li className="flex items-start gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <Check className="text-green-600 shrink-0 mt-0.5" size={16} />
                <span>Be in a condition suitable for resale.</span>
              </li>
              <li className="flex items-start gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <Check className="text-green-600 shrink-0 mt-0.5" size={16} />
                <span>Be accompanied by the original invoice, receipt or order information.</span>
              </li>
            </ul>
            <p className="text-xs text-gray-500 italic bg-gray-50 p-3 rounded-lg border border-gray-200">
              Masuma Autoparts East Africa reserves the right to inspect returned products before approving a return, exchange or refund.
            </p>
          </section>

          {/* 2. Incorrect Part Supplied by Masuma */}
          <section className="pt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-masuma-dark text-white flex items-center justify-center font-bold text-sm shrink-0">2</div>
              <h2 className="text-xl sm:text-2xl font-bold text-masuma-dark uppercase font-display tracking-tight">
                Incorrect Part Supplied by Masuma
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              If we supply a different part from the one ordered or confirmed by Masuma, please contact us as soon as possible.
            </p>
            <p className="text-sm font-semibold text-gray-800 mb-2">After verification, we will arrange an appropriate resolution, which may include:</p>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-600 mb-4 pl-4 border-l-2 border-masuma-orange">
              <li>• Replacement with the correct part; or</li>
              <li>• A refund where replacement is not reasonably possible.</li>
            </ul>
            <div className="bg-emerald-50 text-emerald-900 border border-emerald-200 p-4 rounded-xl text-xs sm:text-sm flex items-start gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <span>Where the error is confirmed to be on our side, reasonable return or replacement delivery arrangements will be handled and covered by Masuma.</span>
            </div>
          </section>

          {/* 3. Customer Ordered the Wrong Part */}
          <section className="pt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-masuma-dark text-white flex items-center justify-center font-bold text-sm shrink-0">3</div>
              <h2 className="text-xl sm:text-2xl font-bold text-masuma-dark uppercase font-display tracking-tight">
                Customer Ordered the Wrong Part
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Automotive fitment can depend on the exact chassis, engine, transmission, production year and vehicle specification.
            </p>
            <p className="text-sm text-gray-600 mb-4">
              If a customer orders the wrong part, a return may be accepted <strong className="text-masuma-dark">only if the product is unused, uninstalled, undamaged and resalable</strong>.
            </p>
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-xs sm:text-sm text-gray-700 space-y-2 mb-4">
              <p>• The customer may be responsible for return delivery costs and any applicable difference in price if an alternative part is requested.</p>
              <p>• We strongly recommend providing the <strong className="text-masuma-dark">chassis number, VIN or OEM part number before ordering</strong> to reduce the risk of incorrect fitment.</p>
            </div>
            <a 
              href="/part-finder"
              onClick={(e) => handleNav(e, 'PART_FINDER')}
              className="inline-flex items-center gap-2 text-xs font-bold uppercase text-masuma-orange hover:underline"
            >
              Verify Fitment with our Technical Desk <ArrowRight size={14} />
            </a>
          </section>

          {/* 4. Change of Mind */}
          <section className="pt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-masuma-dark text-white flex items-center justify-center font-bold text-sm shrink-0">4</div>
              <h2 className="text-xl sm:text-2xl font-bold text-masuma-dark uppercase font-display tracking-tight">
                Change of Mind
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              A customer may request a return because they have changed their mind, provided the product is eligible for return and meets all return conditions.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-xs sm:text-sm text-gray-600">
              <li>The product must be returned within <strong className="text-masuma-dark">7 calendar days</strong> and remain unused, uninstalled and in its original condition.</li>
              <li>Return delivery costs are the customer's responsibility in a change-of-mind return.</li>
            </ul>
          </section>

          {/* 5. Installed or Used Parts */}
          <section className="pt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-sm shrink-0">5</div>
              <h2 className="text-xl sm:text-2xl font-bold text-masuma-dark uppercase font-display tracking-tight">
                Installed or Used Parts
              </h2>
            </div>
            <div className="bg-red-50 border-l-4 border-red-500 p-5 rounded-r-xl mb-4">
              <p className="text-xs sm:text-sm font-bold text-red-900 mb-2">
                Parts that have been installed, used, modified or subjected to installation attempts are not eligible for return due to change of mind, incorrect ordering or suspected fitment issues.
              </p>
              <p className="text-xs text-red-800">
                This includes situations where a part has been installed on a vehicle and subsequently removed.
              </p>
            </div>
            <p className="text-xs sm:text-sm text-gray-600">
              If an installed part is believed to have a manufacturing defect, it may instead be submitted for <strong className="text-masuma-dark">warranty or technical inspection</strong> under our Warranty Policy.
            </p>
          </section>

          {/* 6. Defective or Suspected Faulty Products */}
          <section className="pt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-masuma-dark text-white flex items-center justify-center font-bold text-sm shrink-0">6</div>
              <h2 className="text-xl sm:text-2xl font-bold text-masuma-dark uppercase font-display tracking-tight">
                Defective or Suspected Faulty Products
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              If you believe a Masuma product has a manufacturing defect, contact us promptly with the following details:
            </p>
            <div className="grid sm:grid-cols-2 gap-2 text-xs text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
              <div className="flex items-center gap-2"><strong>•</strong> Order or invoice number</div>
              <div className="flex items-center gap-2"><strong>•</strong> Vehicle details (Make/Model/Year)</div>
              <div className="flex items-center gap-2"><strong>•</strong> Chassis number or VIN</div>
              <div className="flex items-center gap-2"><strong>•</strong> Masuma part number</div>
              <div className="flex items-center gap-2"><strong>•</strong> Clear description of the problem</div>
              <div className="flex items-center gap-2"><strong>•</strong> Photographs or videos where useful</div>
              <div className="sm:col-span-2 flex items-center gap-2"><strong>•</strong> Details of installation and professional garage diagnosis</div>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 mb-3">
              The product may need to be inspected or tested before a warranty claim is approved. A suspected defect does not automatically constitute a confirmed manufacturing defect. Technical inspection may be required to distinguish a product fault from incorrect installation, incorrect application, vehicle-related faults or damage caused during use.
            </p>
            <p className="text-xs sm:text-sm text-gray-600">
              Where a manufacturing defect is confirmed and the claim falls within the applicable warranty terms, Masuma may provide a <strong className="text-masuma-dark">replacement, repair or refund</strong>, as appropriate.
            </p>
          </section>

          {/* 7. Electrical and Electronic Components */}
          <section className="pt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-masuma-dark text-white flex items-center justify-center font-bold text-sm shrink-0">7</div>
              <h2 className="text-xl sm:text-2xl font-bold text-masuma-dark uppercase font-display tracking-tight">
                Electrical and Electronic Components
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Electrical and electronic products (such as oxygen sensors, airflow meters, fuel pumps, ignition coils, and relays) require particular care because incorrect diagnosis, wiring, voltage, installation or vehicle faults can damage a component.
            </p>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-xs sm:text-sm text-amber-900 mb-2">
              <p className="font-bold">
                Electrical and electronic components are therefore not eligible for ordinary returns after installation.
              </p>
              <p className="mt-1 text-xs text-amber-800">
                Where a component is suspected to be defective, it must be submitted for technical inspection under the applicable warranty process.
              </p>
            </div>
          </section>

          {/* 8. Oils, Fluids and Other Sealed Products */}
          <section className="pt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-masuma-dark text-white flex items-center justify-center font-bold text-sm shrink-0">8</div>
              <h2 className="text-xl sm:text-2xl font-bold text-masuma-dark uppercase font-display tracking-tight">
                Oils, Fluids and Other Sealed Products
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Automotive oils, ATF, CVTF, coolant and similar liquid or sealed chemical products must be returned <strong className="text-masuma-dark">unopened, with factory foil seals intact, and unused</strong>.
            </p>
            <p className="text-xs sm:text-sm text-gray-600 mb-2">
              • Opened or partially used fluids are <strong className="text-red-600">not eligible for ordinary returns</strong>.
            </p>
            <p className="text-xs sm:text-sm text-gray-600">
              • Where a sealed product is believed to have a manufacturing or packaging defect, contact Masuma for technical assessment.
            </p>
          </section>

          {/* 9. Brake, Suspension and Other Safety-Critical Parts */}
          <section className="pt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-masuma-dark text-white flex items-center justify-center font-bold text-sm shrink-0">9</div>
              <h2 className="text-xl sm:text-2xl font-bold text-masuma-dark uppercase font-display tracking-tight">
                Brake, Suspension and Other Safety-Critical Parts
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Safety-critical components such as brake pads, brake discs, steering links, ball joints, and suspension units must be correctly identified and professionally installed.
            </p>
            <p className="text-xs sm:text-sm text-gray-600 mb-2">
              • Once installed, these products are not eligible for ordinary returns due to incorrect ordering or change of mind.
            </p>
            <p className="text-xs sm:text-sm text-gray-600">
              • Where a product is suspected to have a manufacturing defect, it must be submitted for inspection under the applicable warranty process.
            </p>
          </section>

          {/* 10. Special-Order and Non-Stock Items */}
          <section className="pt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-masuma-dark text-white flex items-center justify-center font-bold text-sm shrink-0">10</div>
              <h2 className="text-xl sm:text-2xl font-bold text-masuma-dark uppercase font-display tracking-tight">
                Special-Order and Non-Stock Items
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Parts specially ordered, air-freighted, imported or procured specifically for a customer from overseas inventory may be <strong className="text-masuma-dark">non-returnable</strong> because they cannot be readily resold in general local stock.
            </p>
            <p className="text-xs text-gray-500 italic">
              The specific return conditions for such products will be communicated to the customer before the special order is confirmed.
            </p>
          </section>

          {/* 11. Damaged Products on Delivery */}
          <section className="pt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-masuma-dark text-white flex items-center justify-center font-bold text-sm shrink-0">11</div>
              <h2 className="text-xl sm:text-2xl font-bold text-masuma-dark uppercase font-display tracking-tight">
                Damaged Products on Delivery
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              If your order arrives visibly damaged, please notify Masuma as soon as reasonably possible. Where possible, take clear photographs of:
            </p>
            <div className="grid sm:grid-cols-2 gap-3 text-xs sm:text-sm text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-200 mb-3">
              <div><strong>1.</strong> The outer packaging & shipping container</div>
              <div><strong>2.</strong> Shipping and courier waybill labels</div>
              <div><strong>3.</strong> The damaged product packaging</div>
              <div><strong>4.</strong> The product itself and any visible damage</div>
            </div>
            <p className="text-xs text-gray-500">
              This information helps us investigate and promptly resolve the issue with the relevant delivery or handling party.
            </p>
          </section>

          {/* 12. Return Process */}
          <section className="pt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-masuma-dark text-white flex items-center justify-center font-bold text-sm shrink-0">12</div>
              <h2 className="text-xl sm:text-2xl font-bold text-masuma-dark uppercase font-display tracking-tight">
                Return Process
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              To request a return, contact Masuma Autoparts East Africa with the following information:
            </p>
            <div className="bg-masuma-dark text-white p-5 rounded-2xl space-y-2 text-xs font-mono mb-4">
              <p><span className="text-masuma-orange font-bold">• Order / Invoice Number:</span> [Required]</p>
              <p><span className="text-masuma-orange font-bold">• Customer Name:</span> [Required]</p>
              <p><span className="text-masuma-orange font-bold">• Part Number:</span> [e.g. MC-1234]</p>
              <p><span className="text-masuma-orange font-bold">• Reason for Return:</span> [Brief explanation]</p>
              <p><span className="text-masuma-orange font-bold">• Vehicle Details:</span> [Make, Model, Year, Chassis Number]</p>
              <p><span className="text-masuma-orange font-bold">• Photographs:</span> [Where applicable]</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-900 font-bold flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              <span>Important: Do not send a product back without first contacting us and receiving official return instructions.</span>
            </div>
          </section>

          {/* 13. Inspection of Returned Products */}
          <section className="pt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-masuma-dark text-white flex items-center justify-center font-bold text-sm shrink-0">13</div>
              <h2 className="text-xl sm:text-2xl font-bold text-masuma-dark uppercase font-display tracking-tight">
                Inspection of Returned Products
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              All returned products are subject to technical inspection upon arrival at our Nairobi trade hub.
            </p>
            <p className="text-xs sm:text-sm font-semibold text-gray-800 mb-2">We may decline a return where the product:</p>
            <ul className="grid sm:grid-cols-2 gap-2 text-xs text-gray-600">
              <li className="flex items-start gap-2 bg-red-50/50 p-2.5 rounded border border-red-100">
                <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <span>Has been installed or used.</span>
              </li>
              <li className="flex items-start gap-2 bg-red-50/50 p-2.5 rounded border border-red-100">
                <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <span>Has been damaged after delivery.</span>
              </li>
              <li className="flex items-start gap-2 bg-red-50/50 p-2.5 rounded border border-red-100">
                <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <span>Has been modified or altered.</span>
              </li>
              <li className="flex items-start gap-2 bg-red-50/50 p-2.5 rounded border border-red-100">
                <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <span>Is missing original packaging or accessories.</span>
              </li>
              <li className="flex items-start gap-2 bg-red-50/50 p-2.5 rounded border border-red-100">
                <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <span>Has damaged or removed identification markings.</span>
              </li>
              <li className="flex items-start gap-2 bg-red-50/50 p-2.5 rounded border border-red-100">
                <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <span>Cannot reasonably be resold.</span>
              </li>
              <li className="flex items-start gap-2 bg-red-50/50 p-2.5 rounded border border-red-100">
                <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <span>Falls under an excluded product category.</span>
              </li>
              <li className="flex items-start gap-2 bg-red-50/50 p-2.5 rounded border border-red-100">
                <XCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                <span>Was specially ordered under non-returnable terms.</span>
              </li>
            </ul>
          </section>

          {/* 14. Exchanges */}
          <section className="pt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-masuma-dark text-white flex items-center justify-center font-bold text-sm shrink-0">14</div>
              <h2 className="text-xl sm:text-2xl font-bold text-masuma-dark uppercase font-display tracking-tight">
                Exchanges
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Where an exchange is approved, the replacement product will be subject to current stock availability.
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-gray-600 pl-4 border-l-2 border-masuma-orange">
              <li>• If the replacement product has a higher price, the customer will be required to pay the price difference.</li>
              <li>• If the replacement product costs less, the applicable difference may be refunded or credited to the customer account, depending on the circumstances of the exchange.</li>
            </ul>
          </section>

          {/* 15. Refunds */}
          <section className="pt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-masuma-dark text-white flex items-center justify-center font-bold text-sm shrink-0">15</div>
              <h2 className="text-xl sm:text-2xl font-bold text-masuma-dark uppercase font-display tracking-tight">
                Refunds
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Once an eligible return has been received, inspected and approved at our Nairobi facility, Masuma will process the applicable refund.
            </p>
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl space-y-2 text-xs sm:text-sm text-gray-700 mb-4">
              <p>• <strong className="text-masuma-dark">Processing Timeline:</strong> Approved refunds will normally be processed within <strong className="text-masuma-dark">5–7 business days</strong> after the return has been inspected and approved.</p>
              <p>• <strong className="text-masuma-dark">Payment Method:</strong> The actual time for funds to reflect depends on the original payment method (e.g. M-Pesa reversal or commercial bank processing).</p>
              <p>• <strong className="text-masuma-dark">Delivery Charges:</strong> Delivery charges are generally non-refundable where the return is due to customer error or change of mind.</p>
              <p>• <strong className="text-masuma-dark">Masuma Error:</strong> Where Masuma supplied the wrong product or a confirmed defective product is being handled under an approved claim, the applicable delivery costs will be assessed as part of the resolution.</p>
            </div>
          </section>

          {/* 16. Fitment Responsibility */}
          <section className="pt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-masuma-dark text-white flex items-center justify-center font-bold text-sm shrink-0">16</div>
              <h2 className="text-xl sm:text-2xl font-bold text-masuma-dark uppercase font-display tracking-tight">
                Fitment Responsibility
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Masuma Autoparts East Africa provides fitment assistance based on the vehicle and product information available to us.
            </p>
            <p className="text-sm text-gray-600 mb-3">
              Customers should provide accurate vehicle information, preferably including the <strong className="text-masuma-dark">chassis number, VIN or OEM part number</strong>, before purchasing fitment-sensitive products.
            </p>
            <p className="text-xs text-gray-500 mb-3">
              Providing incorrect or incomplete vehicle information may result in an incorrect application being selected.
            </p>
            <p className="text-xs sm:text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">
              Where Masuma has specifically confirmed a part based on accurate information supplied by the customer, the applicable order will be assessed according to the circumstances and the condition of the product.
            </p>
          </section>

          {/* 17. Warranty and Returns Are Different */}
          <section className="pt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-masuma-orange text-white flex items-center justify-center font-bold text-sm shrink-0">17</div>
              <h2 className="text-xl sm:text-2xl font-bold text-masuma-dark uppercase font-display tracking-tight">
                Warranty and Returns Are Different
              </h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-50/70 border-2 border-blue-200 p-5 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <RotateCcw className="text-blue-700" size={20} />
                  <h3 className="font-bold text-blue-900 text-sm uppercase tracking-wide">Ordinary Return / Exchange</h3>
                </div>
                <p className="text-xs text-blue-900 leading-relaxed">
                  A return is concerned with an eligible <strong className="text-blue-950">unused and resalable product</strong> within 7 days of purchase. It applies to uninstalled items in original packaging.
                </p>
              </div>

              <div className="bg-emerald-50/70 border-2 border-emerald-200 p-5 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="text-emerald-700" size={20} />
                  <h3 className="font-bold text-emerald-900 text-sm uppercase tracking-wide">Warranty Claim</h3>
                </div>
                <p className="text-xs text-emerald-900 leading-relaxed">
                  A warranty claim concerns a product that is <strong className="text-emerald-950">suspected to have a manufacturing defect</strong>. An installed part that develops a problem should be submitted through the technical inspection process.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
              <span className="text-xs text-gray-600">Want to read our complete 12-month defect replacement terms?</span>
              <a 
                href="/warranty" 
                onClick={(e) => handleNav(e, 'WARRANTY')}
                className="text-xs font-bold uppercase text-masuma-orange hover:underline inline-flex items-center gap-1"
              >
                Read Warranty Policy <ArrowRight size={14} />
              </a>
            </div>
          </section>

          {/* 18. Contact Us */}
          <section className="pt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-masuma-dark text-white flex items-center justify-center font-bold text-sm shrink-0">18</div>
              <h2 className="text-xl sm:text-2xl font-bold text-masuma-dark uppercase font-display tracking-tight">
                Contact Us for Returns, Exchanges & Warranty
              </h2>
            </div>
            
            <div className="bg-masuma-dark text-white p-6 sm:p-8 rounded-3xl shadow-xl">
              <h3 className="text-lg font-bold font-display uppercase tracking-tight text-white mb-2">
                Masuma Autoparts East Africa
              </h3>
              <p className="text-xs sm:text-sm text-gray-300 mb-6">
                Ruby Mall, First Floor, Charles Rubia Road, Nairobi, Kenya
              </p>

              <div className="grid sm:grid-cols-2 gap-4 text-xs mb-6">
                <div className="bg-white/10 p-3 rounded-xl">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Phone / WhatsApp</span>
                  <a href="https://wa.me/254792506590" target="_blank" rel="noopener noreferrer" className="text-white font-bold hover:text-masuma-orange transition">
                    +254 792 506 590
                  </a>
                </div>
                <div className="bg-white/10 p-3 rounded-xl">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Email</span>
                  <a href="mailto:sales@masuma.africa" className="text-white font-bold hover:text-masuma-orange transition">
                    sales@masuma.africa
                  </a>
                </div>
                <div className="bg-white/10 p-3 rounded-xl">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Official Portal</span>
                  <span className="text-white font-mono">masuma.africa</span>
                </div>
                <div className="bg-white/10 p-3 rounded-xl">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">Online Store</span>
                  <span className="text-white font-mono">shop.masuma.africa</span>
                </div>
              </div>

              {/* Before You Order Callout */}
              <div className="bg-white/5 border border-masuma-orange/40 p-5 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <Car className="text-masuma-orange" size={18} />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-masuma-orange">Before You Order</h4>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed mb-4">
                  To help us get your order right the first time: <strong>Send your chassis number, VIN or OEM part number.</strong> Our Nairobi technical team can verify the applicable Masuma part before you purchase.
                </p>
                <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/10">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white block">Quality Parts. Trusted Performance.</span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Do it right. Do it once.</span>
                  </div>
                  <a 
                    href="https://wa.me/254792506590?text=Hello%20Masuma%20EA,%20I%20would%20like%20to%20verify%20fitment%20for%20my%20chassis%20number%20before%20ordering."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl inline-flex items-center gap-2 transition shadow-lg"
                  >
                    <MessageCircle size={14} fill="currentColor" /> WhatsApp Technical Team
                  </a>
                </div>
              </div>
            </div>
          </section>

        </div>

      </div>
    </div>
  );
};

export default ReturnsPolicy;
