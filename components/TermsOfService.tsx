import React from 'react';
import { Gavel, ShoppingCart, Truck, CreditCard, ShieldAlert, Scale } from 'lucide-react';
import SEO from './SEO';

const TermsOfService: React.FC = () => {
  return (
    <div className="animate-fade-in bg-white min-h-screen">
      <SEO 
        title="Terms of Service" 
        description="Official terms and conditions for transactions with Masuma Autoparts East Africa Limited under Kenyan Law."
      />
      
      {/* Header */}
      <div className="bg-masuma-dark text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold font-display uppercase tracking-wider mb-4">Terms of Service</h1>
          <div className="h-1 w-24 bg-masuma-orange mx-auto"></div>
          <p className="mt-6 text-gray-300 text-lg">
            Legal terms governing your use of Masuma Autoparts EA services.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16 text-gray-700 leading-relaxed">
        <div className="bg-gray-50 border-2 border-gray-200 p-6 mb-12 rounded-lg">
            <p className="text-sm font-bold text-gray-600">
                PLEASE READ THESE TERMS CAREFULLY. By accessing our website or purchasing parts from Masuma Autoparts East Africa Limited, you agree to be bound by these terms, which are governed by the laws of the Republic of Kenya.
            </p>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-masuma-dark uppercase font-display flex items-center gap-3 mb-6">
            <ShoppingCart className="text-masuma-orange" /> 1. Ordering & Contract
          </h2>
          <p>
            When you place an order, you are making an offer to purchase a product. The contract between you and Masuma Autoparts East Africa Limited is formed only when we dispatch the goods or receive a full payment through our POS or website. We reserve the right to decline any order due to stock unavailability or pricing errors.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-masuma-dark uppercase font-display flex items-center gap-3 mb-6">
            <CreditCard className="text-masuma-orange" /> 2. Pricing and Payment
          </h2>
          <p className="mb-4">All prices are quoted in Kenyan Shillings (KES) and are inclusive of Value Added Tax (VAT) at the prevailing rate of 16%, unless stated otherwise.</p>
          <ul className="list-disc pl-6 space-y-2 marker:text-masuma-orange">
            <li><strong>M-Pesa:</strong> We use Safaricom Daraja for secure STK pushes. Do not share your PIN with anyone.</li>
            <li><strong>E-Receipts:</strong> Every transaction is reported to the Kenya Revenue Authority (KRA) via our eTIMS integrated system. You will receive a fiscalized receipt.</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-masuma-dark uppercase font-display flex items-center gap-3 mb-6">
            <Truck className="text-masuma-orange" /> 3. Delivery and Risk
          </h2>
          <p>
            While we aim for same-day delivery within Nairobi CBD and 24-48 hours nationwide, delivery times are estimates. Risk of loss or damage to the parts passes to you upon delivery. Please inspect all components (especially fragile items like filters or glass) immediately upon receipt.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-masuma-dark uppercase font-display flex items-center gap-3 mb-6">
            <ShieldAlert className="text-masuma-orange" /> 4. Limitation of Liability
          </h2>
          <p className="bg-red-50 p-4 border border-red-100 rounded text-sm text-red-800">
            <strong>IMPORTANT:</strong> Masuma parts are high-precision components. We are NOT liable for any damages, accidents, or engine failures resulting from improper installation by unqualified individuals. We strongly recommend all parts be fitted by certified mechanics at professional workshops.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-masuma-dark uppercase font-display flex items-center gap-3 mb-6">
            <Gavel className="text-masuma-orange" /> 5. Intellectual Property
          </h2>
          <p>
            All content on this site, including the Masuma logo, technical diagrams, and product descriptions, is the property of Masuma Autoparts East Africa Limited or Masuma Japan. Unauthorized reproduction is strictly prohibited and subject to legal action under the Copyright Act of Kenya.
          </p>
        </section>

        <section className="bg-masuma-dark text-white p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold uppercase font-display flex items-center gap-3 mb-6">
            <Scale className="text-masuma-orange" /> 6. Governing Law
          </h2>
          <p className="text-gray-300">
            These terms and any dispute arising from them shall be governed by and construed in accordance with the <strong>laws of the Republic of Kenya</strong>. The courts of Nairobi shall have exclusive jurisdiction.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;