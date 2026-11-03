import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  MessageCircle, 
  Phone, 
  MapPin, 
  ArrowRight, 
  FileCheck, 
  ShieldCheck, 
  Truck, 
  Building2, 
  CheckCircle2,
  HelpCircle,
  X
} from 'lucide-react';
import { ViewState } from '../types';
import SEO from './SEO';

interface FAQProps {
  setView: (view: ViewState) => void;
}

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_DATA: FAQItem[] = [
  // 1. About Masuma Autoparts East Africa
  {
    category: 'About Masuma EA',
    question: 'What is Masuma Autoparts East Africa?',
    answer: 'Masuma Autoparts East Africa is a Kenya-based automotive parts company and the distributor and regional brand builder for Masuma Japan in Kenya and East Africa. We supply brand-new automotive replacement and maintenance parts for a wide range of Japanese, European and American vehicles. Our customers include vehicle owners, mechanics, garages, workshops, spare-parts retailers, fleets and automotive businesses.'
  },
  {
    category: 'About Masuma EA',
    question: 'Is Masuma Autoparts East Africa part of Masuma Japan?',
    answer: 'Masuma Autoparts East Africa is the distributor and regional brand builder for Masuma Japan in Kenya and East Africa. Masuma Japan is the manufacturer and brand owner. Our role is to develop the local and regional market, distribute Masuma products and build customer and trade relationships across the region.'
  },
  {
    category: 'About Masuma EA',
    question: 'Where is Masuma Autoparts East Africa located?',
    answer: 'Our physical location is: Ruby Mall, First Floor, Charles Rubia Road, Nairobi, Kenya. Customers can also access our online catalogue and product information through masuma.africa and shop.masuma.africa.'
  },
  {
    category: 'About Masuma EA',
    question: 'Do you sell genuine Masuma products?',
    answer: 'We supply Masuma-branded products through our distribution operation in Kenya. Our focus is on brand-new automotive replacement parts and maintenance products, rather than used or refurbished components.'
  },
  {
    category: 'About Masuma EA',
    question: 'Are Masuma parts made for specific vehicle applications?',
    answer: 'Yes. Automotive parts are designed for particular vehicle applications, specifications and configurations. Because the same vehicle model can have different engines, transmissions, production years and specifications, we recommend verifying fitment before purchasing. You can provide your chassis number, VIN, OEM part number, vehicle model or relevant vehicle specifications to help us identify the correct application.'
  },

  // 2. Buying Masuma Parts
  {
    category: 'Buying Parts',
    question: 'How can I find the right Masuma part for my car?',
    answer: 'The easiest way is to provide your: Chassis number, VIN, vehicle registration details, vehicle make and model, model year, engine code, or OEM part number. Where possible, providing the chassis number or VIN gives us more information to work with when checking vehicle-specific applications.'
  },
  {
    category: 'Buying Parts',
    question: 'Can I search for Masuma parts online?',
    answer: 'Yes. Our online catalogue allows customers to search for products and part numbers, view available product information and purchase selected products online. Visit: shop.masuma.africa.'
  },
  {
    category: 'Buying Parts',
    question: 'Do you sell individual parts or complete sets?',
    answer: 'It depends on the product. Some products are sold individually, while others are supplied as pairs, sets or specified quantities. The product listing or quotation should indicate the applicable selling unit.'
  },
  {
    category: 'Buying Parts',
    question: 'Can I buy Masuma parts for an older vehicle?',
    answer: 'Yes. Masuma has applications covering a wide range of vehicle models and generations. However, availability and fitment depend on the specific vehicle and part. For older vehicles, providing the chassis number or OEM part number is particularly useful when checking compatibility.'
  },
  {
    category: 'Buying Parts',
    question: 'Do you supply parts for Japanese vehicles?',
    answer: 'Yes. Our catalogue includes applications for a wide range of Japanese vehicle brands, including vehicles from manufacturers such as Toyota, Subaru, Mazda, Honda, Nissan, Mitsubishi and Suzuki, subject to product availability.'
  },
  {
    category: 'Buying Parts',
    question: 'Do you supply parts for European vehicles?',
    answer: 'Yes. We have applications for selected European vehicles and continue to expand our catalogue. European applications can vary significantly by engine, transmission, production year and specification, so we recommend fitment verification before ordering.'
  },
  {
    category: 'Buying Parts',
    question: 'Do you supply parts for American vehicles?',
    answer: 'We also support selected American vehicle applications, subject to catalogue coverage and availability. Customers should provide the vehicle identification details so that the correct application can be checked.'
  },

  // 3. Product Quality
  {
    category: 'Product Quality',
    question: 'What type of automotive parts does Masuma supply?',
    answer: 'Our growing product range includes: Ceramic brake pads, oil filters, air filters, cabin filters, spark plugs, shocks, suspension components, stabilizer links, wheel hubs and bearings, sensors, fuel pumps, automotive oils, ATF and CVTF fluids, coolants, wipers, automotive batteries, TPMS products, lighting products, and other automotive replacement components.'
  },
  {
    category: 'Product Quality',
    question: 'What are Masuma ceramic brake pads?',
    answer: 'Masuma ceramic brake pads are replacement brake pads designed for applicable vehicle braking systems. The ceramic formulation is intended to provide consistent braking performance, thermal stability and reduced brake dust compared with some conventional pad formulations. Fitment should always be confirmed for the specific vehicle.'
  },
  {
    category: 'Product Quality',
    question: 'Do Masuma brake pads fit original brake systems?',
    answer: "Masuma replacement brake pads are produced for specified vehicle applications and are intended as replacement components for those applications. The correct Masuma part should be selected based on the vehicle's specifications and, where possible, the original/OEM part number."
  },
  {
    category: 'Product Quality',
    question: 'Do you sell automotive oils?',
    answer: 'Yes. Masuma Autoparts East Africa supplies selected automotive lubricants, including fully synthetic engine oils and transmission fluids. Oil selection should always be based on the vehicle manufacturer’s required viscosity and specification.'
  },
  {
    category: 'Product Quality',
    question: 'How do I know which engine oil my car needs?',
    answer: 'Do not choose engine oil based only on viscosity. You should consider: Vehicle manufacturer specification, engine type, required viscosity, API classification, ACEA classification where applicable, emissions equipment, DPF requirements for applicable diesel vehicles, and operating conditions. If you are unsure, provide your vehicle details and the required specification can be checked.'
  },
  {
    category: 'Product Quality',
    question: 'Do you supply ATF and CVTF?',
    answer: 'Yes. We supply selected automatic transmission fluids and continuously variable transmission fluids for applicable vehicle specifications. Transmission fluid is highly application-specific. The fluid specification must match the transmission manufacturer’s requirements.'
  },

  // 4. Fitment & Technical Support
  {
    category: 'Fitment & Tech Support',
    question: 'Why do you ask for a chassis number or VIN?',
    answer: 'A vehicle model name alone may not identify the exact parts required. For example, the same model can have different engines, transmissions, brake systems or suspension configurations depending on the production year and market. A chassis number or VIN can help narrow the application and reduce the risk of ordering the wrong part.'
  },
  {
    category: 'Fitment & Tech Support',
    question: 'Can you check an OEM part number?',
    answer: 'Yes. Where catalogue information is available, we can use an OEM part number as a reference when identifying the corresponding Masuma application. Customers should provide the complete part number, including any suffixes or revisions.'
  },
  {
    category: 'Fitment & Tech Support',
    question: 'Can I send you a photo of my old part?',
    answer: "Yes. A clear photograph can be useful for identification, particularly when accompanied by the vehicle's chassis number, VIN or OEM part number. However, a photograph alone may not always be sufficient to confirm fitment."
  },
  {
    category: 'Fitment & Tech Support',
    question: 'Can you help me identify a part from my vehicle?',
    answer: 'Yes. Send us the vehicle details and, where available, the chassis number, VIN or OEM part number. Our team can use the available catalogue information to help identify the applicable component.'
  },

  // 5. Pricing and Orders
  {
    category: 'Pricing & Orders',
    question: 'How are Masuma prices determined?',
    answer: 'Prices can change depending on the product, quantity, stock position, import costs, exchange rates and the timing of purchase. Our online prices are intended to provide customers with current product pricing where available. For larger quantities or wholesale purchases, customers can request a quotation.'
  },
  {
    category: 'Pricing & Orders',
    question: 'Do you offer wholesale prices?',
    answer: 'Yes. We work with garages, mechanics, spare-parts retailers, workshops, fleets and other trade customers. Wholesale pricing may depend on the product, quantity and order requirements.'
  },
  {
    category: 'Pricing & Orders',
    question: 'Can I order Masuma parts in bulk?',
    answer: 'Yes. We support trade and bulk enquiries. Businesses requiring larger quantities should contact our team with the required part numbers, quantities and vehicle applications so that availability and pricing can be assessed.'
  },
  {
    category: 'Pricing & Orders',
    question: 'Can I request a quotation?',
    answer: 'Yes. Send us the required part numbers, quantities and vehicle information. For fitment-sensitive products, include the chassis number or VIN where possible.'
  },
  {
    category: 'Pricing & Orders',
    question: 'How long is a quotation valid?',
    answer: 'Quotation validity depends on the terms stated on the quotation. Because automotive parts can be affected by exchange rates, import costs and stock availability, customers should confirm the quotation before placing an order.'
  },

  // 6. Delivery
  {
    category: 'Delivery',
    question: 'Do you deliver automotive parts in Kenya?',
    answer: 'Yes. We serve customers across Kenya and arrange delivery depending on the order and destination.'
  },
  {
    category: 'Delivery',
    question: 'Do you deliver outside Nairobi?',
    answer: 'Yes. We can arrange delivery to customers in other parts of Kenya. Delivery time and cost depend on the destination, order size and delivery method.'
  },
  {
    category: 'Delivery',
    question: 'Can I get same-day delivery in Nairobi?',
    answer: 'Selected Nairobi orders may qualify for fast local delivery depending on the product, order confirmation, location and availability. Customers should contact us to confirm the available delivery option for their order.'
  },

  // 7. Trade & Business Customers
  {
    category: 'Trade & Wholesale',
    question: 'Do you supply garages and mechanics?',
    answer: 'Yes. Garages and mechanics are an important part of our customer network. We support workshops with replacement parts, fitment information and product sourcing.'
  },
  {
    category: 'Trade & Wholesale',
    question: 'Can a spare-parts shop become a Masuma customer?',
    answer: 'Yes. We work with automotive retailers and spare-parts businesses interested in stocking Masuma products. Trade customers can contact us to discuss product availability, wholesale quantities and account requirements.'
  },
  {
    category: 'Trade & Wholesale',
    question: 'Do you supply vehicle fleets?',
    answer: 'Yes. We can support fleet maintenance requirements with applicable replacement and service parts. Fleet customers can provide their vehicle list, maintenance requirements or recurring part requirements so that an appropriate supply arrangement can be discussed.'
  },
  {
    category: 'Trade & Wholesale',
    question: 'Do you supply automotive businesses outside Kenya?',
    answer: "Our long-term objective is to expand Masuma's distribution and market presence across East Africa. Businesses outside Kenya can contact us regarding regional distribution, trade supply and partnership opportunities."
  },

  // 8. Buying With Confidence
  {
    category: 'Confidence & Standards',
    question: 'What makes Masuma different?',
    answer: 'Masuma Autoparts East Africa combines an international automotive parts brand with local market knowledge, fitment support, digital access to parts information and customer-focused distribution. Our objective is to make quality automotive parts easier to identify, purchase and maintain.'
  },
  {
    category: 'Confidence & Standards',
    question: 'Why should I verify fitment before buying?',
    answer: 'Buying the wrong part can result in wasted time, additional costs and installation problems. Vehicle specifications can differ even within the same model. That is why we encourage customers to send the chassis number, VIN or OEM part number before purchasing, particularly for technical components.'
  },
  {
    category: 'Confidence & Standards',
    question: 'Do you sell used or second-hand parts?',
    answer: 'Our focus is on brand-new automotive replacement and maintenance parts. We are not a used Japanese-car-parts yard.'
  },
  {
    category: 'Confidence & Standards',
    question: 'Are Masuma parts an alternative to dealer parts?',
    answer: 'Masuma products are positioned within the automotive aftermarket as replacement components for specified vehicle applications. Whether a particular Masuma component is suitable for a vehicle depends on its application and specifications. Customers should verify the required part and specification before purchase.'
  },

  // 9. Customer Support & Approach
  {
    category: 'Customer Support',
    question: 'How can I contact Masuma Autoparts East Africa?',
    answer: 'You can contact our team through: Phone / WhatsApp: +254 792 506 590. Physical location: Ruby Mall, First Floor, Charles Rubia Road, Nairobi, Kenya. Website: masuma.africa. Online shop: shop.masuma.africa.'
  },
  {
    category: 'Customer Support',
    question: 'What information should I send when asking for a part?',
    answer: 'For the fastest response, send: Vehicle make and model, production/model year, engine size/code if known, Chassis/VIN where available, part required (e.g. front brake pads), OEM number if available, and quantity required. For example: "Subaru Forester SG5, EJ20 Turbo, 2004, chassis number XXXXX, front brake pads." This gives us a much better basis for checking the correct application.'
  },
  {
    category: 'Customer Support',
    question: 'What is Masuma Autoparts East Africa’s mission and vision?',
    answer: 'Our mission is to make reliable automotive replacement parts accessible, understandable and affordable while improving the way customers identify and purchase parts. Our vision is to establish Masuma as a recognized automotive aftermarket brand across East Africa, supported by stronger distribution, broader product availability, digital parts information and relationships with vehicle owners, workshops, retailers and fleets.'
  },
  {
    category: 'Customer Support',
    question: 'What does "Do it right. Do it once." mean?',
    answer: 'It reflects our approach to vehicle maintenance: identify the correct application, use an appropriate quality component and carry out the repair properly. The objective is simple: Correct part. Correct application. Reliable maintenance.'
  }
];

const CATEGORIES = [
  'All',
  'About Masuma EA',
  'Buying Parts',
  'Product Quality',
  'Fitment & Tech Support',
  'Pricing & Orders',
  'Delivery',
  'Trade & Wholesale',
  'Confidence & Standards',
  'Customer Support'
];

const FAQ: React.FC<FAQProps> = ({ setView }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [openIndices, setOpenIndices] = useState<number[]>([0]); // Open first item by default

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

  const toggleAccordion = (index: number) => {
    setOpenIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const filteredFaqs = useMemo(() => {
    return FAQ_DATA.filter(faq => {
      const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = !q || 
        faq.question.toLowerCase().includes(q) || 
        faq.answer.toLowerCase().includes(q) ||
        faq.category.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [selectedCategory, searchQuery]);

  // Google Search Central FAQPage Structured Data Schema
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_DATA.slice(0, 30).map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }))
  };

  return (
    <div className="bg-white min-h-screen font-sans text-gray-900">
      <SEO 
        title="Frequently Asked Questions (FAQ) | Masuma Autoparts East Africa"
        description="Find answers to common questions about Masuma Autoparts East Africa, fitment verification, Japanese parts authenticity, wholesale inquiries, delivery, and warranty."
        schema={faqSchema}
      />

      {/* Header Banner */}
      <section className="bg-masuma-dark text-white py-16 lg:py-24 border-b-4 border-masuma-orange">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-widest text-masuma-orange block mb-3">
              Knowledge Base & Technical Guidance
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold uppercase font-display tracking-tight leading-tight">
              Frequently Asked <span className="text-masuma-orange">Questions</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-300 mt-4 leading-relaxed">
              Everything you need to know about purchasing genuine Masuma parts in Kenya, verifying chassis and VIN fitment, wholesale pricing, delivery, and trade accounts.
            </p>

            {/* Search Box */}
            <div className="mt-8 relative max-w-xl">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions by topic (e.g. chassis, ceramic brake pads, warranty, wholesale)..."
                className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-400 pl-12 pr-10 py-4 text-xs sm:text-sm rounded-none focus:outline-none focus:border-masuma-orange transition backdrop-blur-md"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')} 
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="py-12 lg:py-20 bg-gray-50/50 border-b border-gray-200">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-10 scrollbar-hide border-b border-gray-200">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition shrink-0 ${
                  selectedCategory === cat 
                    ? 'bg-masuma-dark text-white shadow-md' 
                    : 'bg-white text-gray-600 hover:text-masuma-dark hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Results Summary */}
          <div className="flex justify-between items-center mb-6 text-xs text-gray-500 font-medium">
            <span>Showing {filteredFaqs.length} questions {selectedCategory !== 'All' ? `in "${selectedCategory}"` : ''}</span>
            {searchQuery && (
              <span className="text-masuma-orange font-bold">Filtered by "{searchQuery}"</span>
            )}
          </div>

          {/* Accordion List */}
          {filteredFaqs.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-gray-200">
              <HelpCircle size={40} className="text-gray-300 mx-auto mb-4" />
              <h3 className="text-base font-bold text-masuma-dark uppercase tracking-tight mb-2">No matching questions found</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto mb-6">
                We could not find an FAQ matching "{searchQuery}". You can contact our technical support team directly on WhatsApp.
              </p>
              <a 
                href="https://wa.me/254792506590?text=Hello%20Masuma%20EA,%20I%20have%20a%20question%20regarding%20parts."
                target="_blank"
                rel="noopener noreferrer"
                className="bg-masuma-dark hover:bg-masuma-orange text-white text-xs font-bold uppercase tracking-widest px-6 py-3 rounded-none inline-flex items-center gap-2 transition"
              >
                <MessageCircle size={15} fill="currentColor" /> Ask On WhatsApp
              </a>
            </div>
          ) : (
            <div className="space-y-4 max-w-4xl">
              {filteredFaqs.map((faq, index) => {
                const isOpen = openIndices.includes(index);
                return (
                  <div 
                    key={index}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden transition-all hover:border-gray-300 shadow-sm"
                  >
                    <button
                      onClick={() => toggleAccordion(index)}
                      className="w-full p-5 sm:p-6 text-left flex items-start justify-between gap-4 focus:outline-none"
                      aria-expanded={isOpen}
                    >
                      <div className="flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-masuma-orange bg-orange-50 px-2 py-0.5 rounded inline-block mb-2">
                          {faq.category}
                        </span>
                        <h3 className="text-sm sm:text-base font-bold text-masuma-dark uppercase tracking-tight leading-snug">
                          {faq.question}
                        </h3>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-gray-50 text-gray-500 flex items-center justify-center shrink-0 mt-1">
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-5 sm:px-6 pb-6 pt-1 text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-gray-100 bg-gray-50/40">
                        <p>{faq.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Need A Part - Direct Action Section */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-masuma-dark text-white rounded-3xl p-8 sm:p-14 border-2 border-masuma-orange shadow-2xl relative overflow-hidden">
            <div className="max-w-3xl">
              <span className="text-xs font-bold uppercase tracking-widest text-masuma-orange">Fitment Reassurance</span>
              <h2 className="text-2xl sm:text-4xl font-extrabold uppercase font-display tracking-tight mt-2 mb-3">
                Need A Part? Don't Guess The Part Number.
              </h2>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6">
                Do It Right. Do It Once.
              </p>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-8">
                Send us your <strong>chassis number, VIN, or OEM part number</strong>. For the fastest response, include:
                <br /><br />
                <span className="font-mono text-gray-200 bg-white/10 px-3 py-1.5 rounded inline-block">
                  Subaru Forester SG5, EJ20 Turbo, 2004, chassis number XXXXX, front brake pads
                </span>
                <br /><br />
                Our Nairobi technical desk will verify the applicable component and provide current stock availability and pricing.
              </p>

              <div className="flex flex-wrap gap-4">
                <a 
                  href="https://wa.me/254792506590?text=Hello%20Masuma%20EA,%20I%20need%20a%20part.%20Vehicle:%20%0AYear:%20%0AEngine:%20%0AChassis/VIN:%20%0APart%20Required:%20"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs uppercase tracking-widest px-8 py-4 rounded-none transition duration-300 shadow-xl inline-flex items-center gap-2"
                >
                  <MessageCircle size={18} fill="currentColor" /> Send Chassis on WhatsApp
                </a>
                <a 
                  href="/part-finder"
                  onClick={(e) => handleNav(e, 'PART_FINDER')}
                  className="bg-white/10 hover:bg-masuma-orange border border-white/20 text-white font-bold text-xs uppercase tracking-widest px-8 py-4 rounded-none transition duration-300 shadow-xl inline-flex items-center gap-2"
                >
                  <Search size={18} /> Look Up In Part Finder
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Physical Anchor Footer Info */}
      <section className="py-12 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <MapPin size={18} className="text-masuma-orange shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-masuma-dark uppercase block">Showroom & Distribution Hub</span>
              <span>Ruby Mall, First Floor, Charles Rubia Road, Nairobi, Kenya</span>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone size={18} className="text-masuma-orange shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-masuma-dark uppercase block">Direct Parts Hotline</span>
              <span>+254 792 506 590 (Voice & WhatsApp)</span>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Building2 size={18} className="text-masuma-orange shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-masuma-dark uppercase block">Online Ordering Portals</span>
              <span>masuma.africa | shop.masuma.africa</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FAQ;
