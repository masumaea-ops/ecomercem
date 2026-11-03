
import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, Loader2, MessageSquare, MessageCircle } from 'lucide-react';
import { apiClient } from '../utils/apiClient';
import { trackWhatsAppClick, trackEvent } from '../utils/analytics';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      await apiClient.post('/contact', formData);
      setStatus('success');
      trackEvent('Engagement', 'Contact Form Submission', formData.subject);
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  return (
    <div className="animate-fade-in bg-white min-h-screen">
      {/* Header */}
      <div className="bg-masuma-dark text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold font-display uppercase tracking-wider mb-2">Contact Us</h1>
          <div className="h-1 w-24 bg-masuma-orange mx-auto mb-6"></div>
          <p className="text-gray-400 text-sm">Get in touch with our sales team or visit our showroom.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-medium text-masuma-dark font-display uppercase mb-8">Get In Touch</h3>
            
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="bg-masuma-orange/10 p-3 rounded-full text-masuma-orange">
                  <MapPin size={24} />
                </div>
                <div>
                  <h4 className="text-xs font-medium text-masuma-dark uppercase mb-1">Headquarters & Showroom</h4>
                  <p className="text-gray-600 text-xs leading-relaxed">
                    Ruby Mall, First Floor, Charles Rubia Road<br />
                    Nairobi, Kenya
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-masuma-orange/10 p-3 rounded-full text-masuma-orange">
                  <Phone size={24} />
                </div>
                <div>
                  <h4 className="text-xs font-medium text-masuma-dark uppercase mb-1">Phone & WhatsApp</h4>
                  <p className="text-gray-600 text-xs mb-1">General Inquiries: <a href="tel:+254792506590" className="font-bold hover:text-masuma-orange">+254 792 506 590</a></p>
                  <a 
                    href="https://wa.me/254792506590" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => trackWhatsAppClick('Contact Page')}
                    className="inline-flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[#128C7E] transition mt-2 shadow-md"
                  >
                    <MessageCircle size={16} fill="currentColor" /> Chat on WhatsApp
                  </a>
                  <p className="text-[10px] text-gray-500 mt-2">Mon - Sat: 8:00 AM - 6:00 PM</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-masuma-orange/10 p-3 rounded-full text-masuma-orange">
                  <Mail size={24} />
                </div>
                <div>
                  <h4 className="text-xs font-medium text-masuma-dark uppercase mb-1">Email Support</h4>
                  <p className="text-gray-600 text-xs">
                    Orders: <a href="mailto:sales@masuma.africa" className="font-bold hover:text-masuma-orange">sales@masuma.africa</a>
                  </p>
                </div>
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="mt-12 h-64 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden relative group">
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3988.819917806043!2d36.82282207496564!3d-1.281816698705973!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f10d44324203b%3A0x702677942702220!2sRuby%20Complex!5e0!3m2!1sen!2ske!4v1709280000000!5m2!1sen!2ske" 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen={true} 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Masuma Location"
                ></iframe>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-100 h-fit">
            <h3 className="text-lg font-medium text-masuma-dark font-display uppercase mb-6 flex items-center gap-2">
              <MessageSquare size={24} className="text-masuma-orange" /> Send a Message
            </h3>

            {status === 'success' ? (
              <div className="bg-green-50 border border-green-200 text-green-700 p-6 rounded-lg text-center">
                <div className="flex justify-center mb-4">
                  <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                    <Send size={24} />
                  </div>
                </div>
                <h4 className="font-bold text-lg mb-2">Message Sent Successfully!</h4>
                <p className="text-sm">Thank you for contacting Masuma Autoparts EA. Our sales team has received your message and will respond via <strong>sales@masuma.africa</strong> within 24 hours.</p>
                <button 
                  onClick={() => setStatus('idle')}
                  className="mt-6 text-sm font-bold underline hover:text-green-800"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-gray-500 uppercase">Full Name *</label>
                    <input 
                      type="text" 
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none transition"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-gray-500 uppercase">Phone Number</label>
                    <input 
                      type="tel" 
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none transition"
                      placeholder="+254..."
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-gray-500 uppercase">Email Address *</label>
                  <input 
                    type="email" 
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none transition"
                    placeholder="john@example.com"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-gray-500 uppercase">Subject *</label>
                  <input 
                    type="text" 
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none transition"
                    placeholder="Product Inquiry / Partnership / Other"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-gray-500 uppercase">Message *</label>
                  <textarea 
                    name="message"
                    required
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none transition h-32 resize-none"
                    placeholder="How can we help you today?"
                  ></textarea>
                </div>

                {status === 'error' && (
                  <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded border border-red-100">
                    Failed to send message. Please check your connection and try again.
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={status === 'submitting'}
                  className="w-full bg-masuma-dark text-white font-bold uppercase tracking-widest py-4 rounded hover:bg-masuma-orange transition flex items-center justify-center gap-2 disabled:opacity-70 text-xs"
                >
                  {status === 'submitting' ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                  Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
