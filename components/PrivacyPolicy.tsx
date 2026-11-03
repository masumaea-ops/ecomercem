import React from 'react';
import { Shield, Eye, Lock, FileText, Globe, UserCheck } from 'lucide-react';
import SEO from './SEO';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="animate-fade-in bg-white min-h-screen">
      <SEO 
        title="Privacy Policy" 
        description="Legal privacy policy for Masuma Autoparts East Africa Limited, compliant with the Kenya Data Protection Act 2019."
      />
      
      {/* Header */}
      <div className="bg-masuma-dark text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold font-display uppercase tracking-wider mb-4">Privacy Policy</h1>
          <div className="h-1 w-24 bg-masuma-orange mx-auto"></div>
          <p className="mt-6 text-gray-300 text-lg">
            How we protect your data at Masuma Autoparts East Africa Limited.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16 text-gray-700 leading-relaxed">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-12 rounded-r-lg">
            <p className="text-sm text-blue-800 italic">
                Last Updated: May 2024. This policy is drafted in accordance with the <strong>Data Protection Act, 2019 (Kenya)</strong> and the General Data Protection Regulation (GDPR).
            </p>
        </div>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-masuma-dark uppercase font-display flex items-center gap-3 mb-6">
            <UserCheck className="text-masuma-orange" /> 1. Introduction
          </h2>
          <p>
            Masuma Autoparts East Africa Limited ("we", "us", or "our") respects your privacy and is committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website (regardless of where you visit it from) and tell you about your privacy rights and how the law protects you in the Republic of Kenya.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-masuma-dark uppercase font-display flex items-center gap-3 mb-6">
            <Eye className="text-masuma-orange" /> 2. The Data We Collect
          </h2>
          <p className="mb-4">We collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
          <ul className="list-disc pl-6 space-y-2 marker:text-masuma-orange">
            <li><strong>Identity Data:</strong> Name, username or similar identifier.</li>
            <li><strong>Contact Data:</strong> Billing address, delivery address, email address, and telephone numbers.</li>
            <li><strong>Technical Data:</strong> Internet protocol (IP) address, your login data, browser type, and vehicle information (Chassis/VIN numbers) provided for part compatibility.</li>
            <li><strong>Transaction Data:</strong> Details about payments via M-Pesa, including transaction codes and purchase history.</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-masuma-dark uppercase font-display flex items-center gap-3 mb-6">
            <Shield className="text-masuma-orange" /> 3. How We Use Your Data
          </h2>
          <p className="mb-4">We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
          <ul className="list-disc pl-6 space-y-2 marker:text-masuma-orange">
            <li>Where we need to perform the contract we are about to enter into or have entered into with you (e.g., fulfilling an order).</li>
            <li>Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.</li>
            <li>Where we need to comply with a legal or regulatory obligation in Kenya (e.g., KRA eTIMS reporting).</li>
          </ul>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-masuma-dark uppercase font-display flex items-center gap-3 mb-6">
            <Lock className="text-masuma-orange" /> 4. Data Security
          </h2>
          <p>
            We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know. They will only process your personal data on our instructions and they are subject to a duty of confidentiality.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-bold text-masuma-dark uppercase font-display flex items-center gap-3 mb-6">
            <Globe className="text-masuma-orange" /> 5. Your Legal Rights (Kenya)
          </h2>
          <p className="mb-4">Under the Data Protection Act 2019 of Kenya, you have rights in relation to your personal data, including the right to:</p>
          <ul className="list-disc pl-6 space-y-2 marker:text-masuma-orange">
            <li><strong>Request access</strong> to your personal data.</li>
            <li><strong>Request correction</strong> of the personal data that we hold about you.</li>
            <li><strong>Request erasure</strong> of your personal data.</li>
            <li><strong>Object to processing</strong> of your personal data.</li>
            <li><strong>Withdraw consent</strong> at any time where we are relying on consent to process your data.</li>
          </ul>
        </section>

        <section className="bg-masuma-dark text-white p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold uppercase font-display flex items-center gap-3 mb-6">
            <FileText className="text-masuma-orange" /> 6. Contact Us
          </h2>
          <p className="text-gray-300 mb-4">
            If you have any questions about this privacy policy or our privacy practices, please contact our Data Protection Officer at:
          </p>
          <div className="space-y-2 text-sm">
            <p><strong>Email:</strong> privacy@masuma.africa</p>
            <p><strong>Address:</strong> Ruby Mall, Accra Road, Nairobi, Kenya</p>
            <p><strong>ODPC Registration:</strong> In Progress</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;