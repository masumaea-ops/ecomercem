import React, { useState, useEffect } from 'react';
import { Lock, Loader2, ArrowLeft, Mail, Send, CheckCircle, Building, User, Phone, MapPin, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { apiClient } from '../utils/apiClient';
import { Logo } from './Logo';
import SEO from './SEO';

interface AuthPortalProps {
  onLoginSuccess: (user: any, token: string) => void;
  onBack: () => void;
  initialMode?: 'login' | 'forgot' | 'register' | 'user-register';
  context?: string;
}

const AuthPortal: React.FC<AuthPortalProps> = ({ onLoginSuccess, onBack, initialMode, context }) => {
  const [view, setView] = useState<'login' | 'forgot' | 'register' | 'user-register'>(initialMode || 'login');
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '',
    fullName: '',
    businessName: '',
    taxId: '',
    phone: '',
    address: '',
    role: context === 'seller' ? 'INDIVIDUAL_SELLER' : 'BUYER'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Sync props when initialMode or context updates
  useEffect(() => {
    if (initialMode) {
      setView(initialMode);
    }
  }, [initialMode]);

  useEffect(() => {
    if (context === 'seller') {
      setFormData(prev => ({ ...prev, role: 'INDIVIDUAL_SELLER' }));
    }
  }, [context]);

  // Live password validation criteria
  const passwordCriteria = {
    length: formData.password.length >= 8,
    lowercase: /[a-z]/.test(formData.password),
    uppercase: /[A-Z]/.test(formData.password),
    number: /\d/.test(formData.password),
    special: /[^a-zA-Z0-9]/.test(formData.password),
  };
  const isPasswordValid = Object.values(passwordCriteria).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Pre-submission client-side validation
    if (view === 'register' || view === 'user-register') {
      if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
        setError('Please enter your full name (at least 2 characters).');
        return;
      }
      if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        setError('Please enter a valid email address.');
        return;
      }
      if (!isPasswordValid) {
        setError('Password does not meet security requirements. Please verify the checklist below.');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (view === 'login') {
          const response = await apiClient.post('/auth/login', {
            email: formData.email,
            password: formData.password
          });
          const { token, user } = response.data;
          onLoginSuccess(user, token);
      } else if (view === 'forgot') {
          await apiClient.post('/auth/forgot-password', { email: formData.email });
          setSuccess('Reset link sent! Please check your email inbox.');
      } else if (view === 'register') {
          // Register B2B
          await apiClient.post('/auth/register-b2b', {
            fullName: formData.fullName,
            email: formData.email,
            password: formData.password,
            businessName: formData.businessName,
            taxId: formData.taxId,
            phone: formData.phone,
            address: formData.address
          });
          setSuccess('Registration submitted! Our team will review your application and notify you via email.');
          setView('login');
      } else {
          // General User Register (Seller / Buyer / Importer)
          const response = await apiClient.post('/auth/register', {
            fullName: formData.fullName,
            email: formData.email,
            password: formData.password,
            phone: formData.phone,
            role: formData.role
          });
          
          if (response.data.token) {
            const { token, user } = response.data;
            onLoginSuccess(user, token);
          } else {
            setSuccess(response.data.message || 'Registration successful! Your account is pending approval.');
            setView('login');
          }
      }
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.details && Array.isArray(data.details) && data.details.length > 0) {
        const messages = data.details.map((d: any) => d.message).filter(Boolean);
        setError(messages.join('. ') || 'Validation error. Please verify your inputs.');
      } else if (data?.error && data.error !== 'Validation Error') {
        setError(data.error);
      } else if (data?.message) {
        setError(data.message);
      } else if (data?.error) {
        setError(data.error);
      } else {
        setError('Operation failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <SEO 
        title={view === 'login' ? 'Login' : 'Register'} 
        description="Secure access to Masuma Autoparts East Africa." 
        noindex={true}
      />
      <div className={`bg-white p-5 sm:p-8 rounded-2xl shadow-xl w-full ${view === 'register' || view === 'user-register' ? 'max-w-2xl' : 'max-w-md'} border-t-4 border-masuma-orange transition-all duration-500 animate-scale-up`}>
        <div className="text-center mb-6 flex flex-col items-center">
          <Logo />
          <p className="text-sm font-bold text-gray-600 uppercase tracking-wider mt-4">
              {view === 'login' ? 'Masuma Account Sign In' : view === 'forgot' ? 'Password Recovery' : view === 'register' ? 'Wholesale & B2B Application' : (formData.role === 'INDIVIDUAL_SELLER' || context === 'seller' ? 'Create Marketplace Seller Account' : 'Create Customer Account')}
          </p>
        </div>

        {(context === 'seller' || (view === 'user-register' && formData.role === 'INDIVIDUAL_SELLER')) && (
          <div className="bg-orange-50 border border-masuma-orange/30 p-3 rounded-xl mb-4 text-center">
            <p className="text-xs font-bold text-masuma-dark">
              Vehicle Marketplace Seller Portal
            </p>
            <p className="text-[11px] text-gray-600">
              Sign in or register your account to list and manage your vehicles on Masuma Marketplace.
            </p>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded text-sm mb-4 border border-red-200 flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-700 p-3 rounded text-sm mb-4 border border-green-200 flex items-center gap-2">
            <CheckCircle size={16} /> {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {view === 'register' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <h3 className="text-xs font-black uppercase text-masuma-orange mb-4 border-b pb-2">Business Information</h3>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Business Name *</label>
                <div className="relative">
                  <input 
                    type="text" 
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded focus:border-masuma-orange outline-none transition text-sm" 
                    placeholder="e.g. Masuma Garage Ltd"
                  />
                  <Building size={16} className="absolute left-3 top-3.5 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Tax ID / KRA PIN</label>
                <input 
                  type="text" 
                  value={formData.taxId}
                  onChange={(e) => setFormData({...formData, taxId: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none transition text-sm" 
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Business Phone *</label>
                <div className="relative">
                  <input 
                    type="tel" 
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded focus:border-masuma-orange outline-none transition text-sm" 
                    placeholder="+254..."
                  />
                  <Phone size={16} className="absolute left-3 top-3.5 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Physical Address *</label>
                <div className="relative">
                  <input 
                    type="text" 
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded focus:border-masuma-orange outline-none transition text-sm" 
                    placeholder="City, Street, Building"
                  />
                  <MapPin size={16} className="absolute left-3 top-3.5 text-gray-400" />
                </div>
              </div>

              <div className="md:col-span-2 mt-4">
                <h3 className="text-xs font-black uppercase text-masuma-orange mb-4 border-b pb-2">Contact Person & Credentials</h3>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Full Name *</label>
                <div className="relative">
                  <input 
                    type="text" 
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded focus:border-masuma-orange outline-none transition text-sm" 
                    placeholder="John Doe"
                  />
                  <User size={16} className="absolute left-3 top-3.5 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Email Address *</label>
                <div className="relative">
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded focus:border-masuma-orange outline-none transition text-sm" 
                    placeholder="john@business.com"
                  />
                  <Mail size={16} className="absolute left-3 top-3.5 text-gray-400" />
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold uppercase text-gray-500">Account Password *</label>
                  <span className="text-[10px] text-gray-400">Min. 8 characters</span>
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded focus:border-masuma-orange outline-none transition text-sm" 
                    placeholder="Create a strong password"
                  />
                  <Lock size={16} className="absolute left-3 top-3.5 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                
                {/* Real-time Password Requirements Checklist */}
                <div className="mt-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] space-y-1">
                  <p className="font-bold text-gray-600 text-[10px] uppercase tracking-wider mb-1">Password Requirements:</p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.length ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                      <Check size={12} className={passwordCriteria.length ? 'text-green-600' : 'text-gray-300'} />
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.uppercase ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                      <Check size={12} className={passwordCriteria.uppercase ? 'text-green-600' : 'text-gray-300'} />
                      <span>1 uppercase letter (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.lowercase ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                      <Check size={12} className={passwordCriteria.lowercase ? 'text-green-600' : 'text-gray-300'} />
                      <span>1 lowercase letter (a-z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.number ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                      <Check size={12} className={passwordCriteria.number ? 'text-green-600' : 'text-gray-300'} />
                      <span>1 number (0-9)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 col-span-2 ${passwordCriteria.special ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                      <Check size={12} className={passwordCriteria.special ? 'text-green-600' : 'text-gray-300'} />
                      <span>1 special symbol (!@#$%^&* etc.)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : view === 'user-register' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <h3 className="text-xs font-black uppercase text-masuma-orange mb-4 border-b pb-2">Personal Information</h3>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Full Name *</label>
                <div className="relative">
                  <input 
                    type="text" 
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded focus:border-masuma-orange outline-none transition text-sm" 
                    placeholder="John Doe"
                  />
                  <User size={16} className="absolute left-3 top-3.5 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Email Address *</label>
                <div className="relative">
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded focus:border-masuma-orange outline-none transition text-sm" 
                    placeholder="john@example.com"
                  />
                  <Mail size={16} className="absolute left-3 top-3.5 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Phone Number *</label>
                <div className="relative">
                  <input 
                    type="tel" 
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded focus:border-masuma-orange outline-none transition text-sm" 
                    placeholder="+254..."
                  />
                  <Phone size={16} className="absolute left-3 top-3.5 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Account Intent *</label>
                <select 
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none transition text-sm bg-white font-medium"
                >
                  <option value="INDIVIDUAL_SELLER">I want to sell a car</option>
                  <option value="BUYER">I want to buy a car</option>
                  <option value="IMPORT_USER">I want to import a car</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold uppercase text-gray-500">Account Password *</label>
                  <span className="text-[10px] text-gray-400">Min. 8 characters</span>
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded focus:border-masuma-orange outline-none transition text-sm" 
                    placeholder="Create a strong password"
                  />
                  <Lock size={16} className="absolute left-3 top-3.5 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Real-time Password Requirements Checklist */}
                <div className="mt-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] space-y-1">
                  <p className="font-bold text-gray-600 text-[10px] uppercase tracking-wider mb-1">Password Requirements:</p>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.length ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                      <Check size={12} className={passwordCriteria.length ? 'text-green-600' : 'text-gray-300'} />
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.uppercase ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                      <Check size={12} className={passwordCriteria.uppercase ? 'text-green-600' : 'text-gray-300'} />
                      <span>1 uppercase letter (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.lowercase ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                      <Check size={12} className={passwordCriteria.lowercase ? 'text-green-600' : 'text-gray-300'} />
                      <span>1 lowercase letter (a-z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordCriteria.number ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                      <Check size={12} className={passwordCriteria.number ? 'text-green-600' : 'text-gray-300'} />
                      <span>1 number (0-9)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 col-span-2 ${passwordCriteria.special ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                      <Check size={12} className={passwordCriteria.special ? 'text-green-600' : 'text-gray-300'} />
                      <span>1 special symbol (!@#$%^&* etc.)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Email Address</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none transition" 
                  placeholder="user@example.com"
                  required
                />
              </div>
              
              {view === 'login' && (
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Password</label>
                    <div className="relative">
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full pl-3 pr-10 py-3 border border-gray-300 rounded focus:border-masuma-orange outline-none transition" 
                        placeholder="••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
              )}
            </>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-masuma-dark text-white py-3 font-bold uppercase hover:bg-masuma-orange transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : view === 'login' ? <Lock size={18} /> : view === 'forgot' ? <Send size={18} /> : <CheckCircle size={18} />} 
            {isLoading ? 'Processing...' : view === 'login' ? 'Sign In' : view === 'forgot' ? 'Send Reset Link' : view === 'register' ? 'Submit Application' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-4">
           <div className="flex flex-wrap justify-center gap-4">
              {view === 'login' ? (
                  <>
                    <button onClick={() => setView('forgot')} className="text-[10px] font-bold text-gray-400 hover:text-masuma-orange uppercase tracking-wider">
                        Forgot Password?
                    </button>
                    <span className="text-gray-200">|</span>
                    <button 
                      onClick={() => {
                        setView('user-register');
                        setFormData(prev => ({ ...prev, role: 'INDIVIDUAL_SELLER' }));
                        setError('');
                      }} 
                      className="text-[10px] font-bold text-masuma-orange hover:underline uppercase tracking-wider"
                    >
                        Register as Seller
                    </button>
                    <span className="text-gray-200">|</span>
                    <button onClick={() => setView('register')} className="text-[10px] font-bold text-gray-400 hover:text-masuma-orange uppercase tracking-wider">
                        Wholesale & B2B Application
                    </button>
                  </>
              ) : (
                  <button onClick={() => setView('login')} className="text-xs font-bold text-gray-400 hover:text-masuma-dark uppercase tracking-wider flex items-center gap-1">
                      <ArrowLeft size={12} /> Back to Login
                  </button>
              )}
           </div>

           <button onClick={onBack} className="text-sm text-gray-400 hover:text-masuma-dark underline flex items-center justify-center gap-1">
             <ArrowLeft size={14} /> Back to Storefront
           </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPortal;