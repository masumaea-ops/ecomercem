import React, { useState, useEffect } from 'react';
import { Save, Settings, Users, Building, FileText, Loader2, Activity, Server, Database, RefreshCw, Globe, Smartphone, Key, Shield, BarChart3, Facebook, Copy, Check, ExternalLink, CreditCard } from 'lucide-react';
import { apiClient } from '../../utils/apiClient';
import BackupManager from './BackupManager';

const SettingsManager: React.FC = () => {
    const [activeTab, setActiveTab] = useState('general');
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Health State
    const [healthData, setHealthData] = useState<any>(null);
    const [loadingHealth, setLoadingHealth] = useState(false);
    const [copiedProductFeed, setCopiedProductFeed] = useState(false);
    const [copiedVehicleFeed, setCopiedVehicleFeed] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await apiClient.get('/settings');
                setSettings(res.data);
            } catch (error) {
                console.error('Failed to fetch settings', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        if (activeTab === 'status') {
            fetchHealth();
        }
    }, [activeTab]);

    const fetchHealth = async () => {
        setLoadingHealth(true);
        try {
            const res = await apiClient.get('/health');
            setHealthData(res.data);
        } catch (error) {
            setHealthData({ server: 'Error', database: 'Unreachable', redis: 'Unreachable' });
        } finally {
            setLoadingHealth(false);
        }
    };

    const handleChange = (key: string, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await apiClient.post('/settings', settings);
            // Update Cache Immediately so Documents reflect changes without reload
            localStorage.setItem('masuma_settings_cache', JSON.stringify(settings));
            alert('Settings saved successfully.');
        } catch (error) {
            alert('Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

    return (
        <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-masuma-dark font-display uppercase">System Settings</h2>
                    <p className="text-sm text-gray-500">Configure Branch, API Keys, and Fiscal Integrations.</p>
                </div>
                <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="bg-masuma-dark text-white px-6 py-3 rounded font-bold uppercase tracking-widest text-sm hover:bg-masuma-orange transition shadow-lg flex items-center gap-2 disabled:opacity-50"
                >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
                    Save Configuration
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
                {/* Sidebar */}
                <div className="w-full md:w-64 bg-gray-50 border-r border-gray-200 flex md:flex-col overflow-x-auto md:overflow-visible">
                    {[
                        { id: 'general', label: 'General Config', icon: Settings },
                        { id: 'branch', label: 'Branch Details', icon: Building },
                        { id: 'payment', label: 'Payment & Banking', icon: CreditCard },
                        { id: 'seo', label: 'SEO & Analytics', icon: BarChart3 },
                        { id: 'meta', label: 'Meta Commerce Suite', icon: Facebook },
                        { id: 'integrations', label: 'API Integrations', icon: Globe },
                        { id: 'fiscal', label: 'Fiscal / eTIMS', icon: FileText },
                        { id: 'backup', label: 'Database Backup', icon: Database },
                        { id: 'status', label: 'System Health', icon: Activity },
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full text-left px-6 py-4 font-bold text-sm flex items-center gap-3 border-l-4 transition whitespace-nowrap ${
                                activeTab === tab.id ? 'bg-white border-masuma-orange text-masuma-orange' : 'border-transparent text-gray-500 hover:bg-gray-100'
                            }`}
                        >
                            <tab.icon size={18} /> {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 p-8 overflow-y-auto">
                    {/* ... (Previous tabs remain unchanged) ... */}
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold uppercase text-masuma-dark mb-6 pb-2 border-b border-gray-100">General Configuration</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-gray-500">Company Name</label>
                                    <input type="text" value={settings['COMPANY_NAME'] || ''} onChange={e => handleChange('COMPANY_NAME', e.target.value)} className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold uppercase text-gray-500">Default Currency</label>
                                    <input type="text" value="KES" disabled className="w-full p-3 border border-gray-200 bg-gray-100 rounded text-gray-500" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-gray-500">Support Email</label>
                                <input type="email" value={settings['SUPPORT_EMAIL'] || ''} onChange={e => handleChange('SUPPORT_EMAIL', e.target.value)} className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none" />
                            </div>
                        </div>
                    )}

                    {activeTab === 'branch' && (
                         <div className="space-y-6">
                            <h3 className="text-lg font-bold uppercase text-masuma-dark mb-6 pb-2 border-b border-gray-100">Branch Information</h3>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-gray-500">Branch Name</label>
                                <input type="text" value={settings['BRANCH_NAME'] || ''} onChange={e => handleChange('BRANCH_NAME', e.target.value)} className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-gray-500">Physical Address</label>
                                <textarea value={settings['BRANCH_ADDRESS'] || ''} onChange={e => handleChange('BRANCH_ADDRESS', e.target.value)} className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none h-24 resize-none"></textarea>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-gray-500">Phone Number</label>
                                <input type="text" value={settings['BRANCH_PHONE'] || ''} onChange={e => handleChange('BRANCH_PHONE', e.target.value)} className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none" />
                            </div>
                         </div>
                    )}

                    {/* PAYMENT & BANKING TAB */}
                    {activeTab === 'payment' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold uppercase text-masuma-dark mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                                <CreditCard size={20} className="text-masuma-orange" /> Payment & Banking Details
                            </h3>
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded mb-4">
                                <p className="text-xs text-amber-800">
                                    Configure company official receiving accounts. These details are dynamically rendered on Quotations, Invoices, Delivery notes, Receipts, and customer notification emails.
                                </p>
                            </div>

                            {/* M-PESA Box */}
                            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 space-y-4">
                                <h4 className="text-sm font-bold uppercase text-green-700 flex items-center gap-2">
                                    <Smartphone size={16} /> M-PESA Paybill Configuration
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase text-gray-500">Business / Paybill Number</label>
                                        <input 
                                            type="text" 
                                            value={settings['PAYMENT_PAYBILL_NUMBER'] !== undefined ? settings['PAYMENT_PAYBILL_NUMBER'] : '247247'} 
                                            onChange={e => handleChange('PAYMENT_PAYBILL_NUMBER', e.target.value)} 
                                            className="w-full p-3 border border-gray-300 rounded font-mono focus:border-masuma-orange outline-none bg-white" 
                                            placeholder="247247" 
                                        />
                                        <p className="text-[10px] text-gray-400">Official Lipa Na M-Pesa Paybill number.</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase text-gray-500">Account Number / Reference</label>
                                        <input 
                                            type="text" 
                                            value={settings['PAYMENT_PAYBILL_ACCOUNT'] !== undefined ? settings['PAYMENT_PAYBILL_ACCOUNT'] : '0792506590'} 
                                            onChange={e => handleChange('PAYMENT_PAYBILL_ACCOUNT', e.target.value)} 
                                            className="w-full p-3 border border-gray-300 rounded font-mono focus:border-masuma-orange outline-none bg-white" 
                                            placeholder="0792506590" 
                                        />
                                        <p className="text-[10px] text-gray-400">Default account string for customer reference.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Bank Details Box */}
                            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 space-y-4">
                                <h4 className="text-sm font-bold uppercase text-blue-700 flex items-center gap-2">
                                    <Building size={16} /> Direct Bank Transfer Details
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase text-gray-500">Bank Name</label>
                                        <input 
                                            type="text" 
                                            value={settings['PAYMENT_BANK_NAME'] !== undefined ? settings['PAYMENT_BANK_NAME'] : 'EQUITY BANK LTD'} 
                                            onChange={e => handleChange('PAYMENT_BANK_NAME', e.target.value)} 
                                            className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none bg-white font-semibold" 
                                            placeholder="EQUITY BANK LTD" 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase text-gray-500">Branch Name</label>
                                        <input 
                                            type="text" 
                                            value={settings['PAYMENT_BANK_BRANCH'] !== undefined ? settings['PAYMENT_BANK_BRANCH'] : 'Karen Branch'} 
                                            onChange={e => handleChange('PAYMENT_BANK_BRANCH', e.target.value)} 
                                            className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none bg-white" 
                                            placeholder="Karen Branch" 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase text-gray-500">Account Number</label>
                                        <input 
                                            type="text" 
                                            value={settings['PAYMENT_BANK_ACCOUNT_NO'] !== undefined ? settings['PAYMENT_BANK_ACCOUNT_NO'] : '1250285737086'} 
                                            onChange={e => handleChange('PAYMENT_BANK_ACCOUNT_NO', e.target.value)} 
                                            className="w-full p-3 border border-gray-300 rounded font-mono focus:border-masuma-orange outline-none bg-white font-bold" 
                                            placeholder="1250285737086" 
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase text-gray-500">Account Name</label>
                                        <input 
                                            type="text" 
                                            value={settings['PAYMENT_BANK_ACCOUNT_NAME'] !== undefined ? settings['PAYMENT_BANK_ACCOUNT_NAME'] : 'Masuma Autoparts East Africa'} 
                                            onChange={e => handleChange('PAYMENT_BANK_ACCOUNT_NAME', e.target.value)} 
                                            className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none bg-white" 
                                            placeholder="Masuma Autoparts East Africa" 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Additional Instructions */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-gray-500">Payment Instructions / Reference Notes</label>
                                <textarea 
                                    value={settings['PAYMENT_INSTRUCTIONS'] !== undefined ? settings['PAYMENT_INSTRUCTIONS'] : 'Please use Quote / Order Number as payment reference.'} 
                                    onChange={e => handleChange('PAYMENT_INSTRUCTIONS', e.target.value)} 
                                    className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none h-20 resize-none" 
                                    placeholder="Please use Quote / Order Number as payment reference."
                                ></textarea>
                                <p className="text-[10px] text-gray-400">Included on documents and emails to guide customers when remitting funds.</p>
                            </div>
                        </div>
                    )}

                    {/* NEW SEO TAB */}
                    {activeTab === 'seo' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-bold uppercase text-masuma-dark mb-6 pb-2 border-b border-gray-100 flex items-center gap-2">
                                <BarChart3 size={20} className="text-blue-600"/> SEO & Analytics (Site Kit)
                            </h3>
                            <div className="bg-blue-50 border border-blue-200 p-4 rounded mb-4">
                                <p className="text-xs text-blue-800">
                                    Configure Google integration here. Changes will reflect on the storefront immediately.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-gray-500">Google Analytics 4 (Measurement ID)</label>
                                <input 
                                    type="text" 
                                    value={settings['GOOGLE_ANALYTICS_ID'] || ''} 
                                    onChange={e => handleChange('GOOGLE_ANALYTICS_ID', e.target.value)} 
                                    className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none font-mono" 
                                    placeholder="G-XXXXXXXXXX"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-gray-500">Google Search Console (Verification Meta Tag)</label>
                                <input 
                                    type="text" 
                                    value={settings['GOOGLE_VERIFICATION_TAG'] || ''} 
                                    onChange={e => handleChange('GOOGLE_VERIFICATION_TAG', e.target.value)} 
                                    className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none font-mono" 
                                    placeholder="google-site-verification=..."
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'meta' && (
                        <div className="space-y-8 animate-fade-in">
                            <div>
                                <h3 className="text-lg font-bold uppercase text-masuma-dark mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                                    <Facebook size={20} className="text-blue-600"/> Meta Commerce &amp; Catalog Feeds
                                </h3>
                                <p className="text-sm text-gray-500 mb-6">
                                    Meta Commerce Manager automatically pulls your store inventory from these real-time XML data feeds to keep your Facebook Shop, Instagram Shop, and dynamic ads perfectly in-sync with your actual warehouse stock and pricing.
                                </p>

                                <div className="space-y-4">
                                    {/* Products Catalog Feed */}
                                    <div className="bg-gray-50 p-4 rounded border border-gray-200">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div>
                                                <h4 className="font-bold text-gray-800 text-sm uppercase tracking-wide">1. Autoparts Products Catalog Feed</h4>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Contains all automotive spare parts, pricing (KES), stock status, categorizations, and detailed product descriptions.
                                                </p>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    const url = `${window.location.origin}/google-product-feed.xml`;
                                                    navigator.clipboard.writeText(url);
                                                    setCopiedProductFeed(true);
                                                    setTimeout(() => setCopiedProductFeed(false), 3000);
                                                }}
                                                className="shrink-0 bg-masuma-dark text-white px-4 py-2 text-xs font-bold uppercase tracking-wider rounded hover:bg-masuma-orange transition flex items-center gap-2"
                                            >
                                                {copiedProductFeed ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                                {copiedProductFeed ? 'Copied URL!' : 'Copy Feed URL'}
                                            </button>
                                        </div>
                                        <div className="mt-3 flex items-center gap-2 bg-white px-3 py-2 rounded border border-gray-200">
                                            <span className="text-xs font-mono text-gray-600 truncate flex-1">{window.location.origin}/google-product-feed.xml</span>
                                            <a href="/google-product-feed.xml" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-masuma-orange" title="Test/View Feed XML">
                                                <ExternalLink size={14} />
                                            </a>
                                        </div>
                                    </div>

                                    {/* Vehicle Marketplace Feed */}
                                    <div className="bg-gray-50 p-4 rounded border border-gray-200">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div>
                                                <h4 className="font-bold text-gray-800 text-sm uppercase tracking-wide">2. Vehicle Marketplace Catalog Feed</h4>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Contains all verified active marketplace cars &amp; motorcycles, listing years, mileage, body style, and clean permalinks.
                                                </p>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    const url = `${window.location.origin}/facebook-vehicle-feed.xml`;
                                                    navigator.clipboard.writeText(url);
                                                    setCopiedVehicleFeed(true);
                                                    setTimeout(() => setCopiedVehicleFeed(false), 3000);
                                                }}
                                                className="shrink-0 bg-masuma-dark text-white px-4 py-2 text-xs font-bold uppercase tracking-wider rounded hover:bg-masuma-orange transition flex items-center gap-2"
                                            >
                                                {copiedVehicleFeed ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                                {copiedVehicleFeed ? 'Copied URL!' : 'Copy Feed URL'}
                                            </button>
                                        </div>
                                        <div className="mt-3 flex items-center gap-2 bg-white px-3 py-2 rounded border border-gray-200">
                                            <span className="text-xs font-mono text-gray-600 truncate flex-1">{window.location.origin}/facebook-vehicle-feed.xml</span>
                                            <a href="/facebook-vehicle-feed.xml" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-masuma-orange" title="Test/View Feed XML">
                                                <ExternalLink size={14} />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-bold uppercase text-masuma-dark mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                                    <Activity size={20} className="text-orange-600"/> Meta Pixel &amp; Conversions API (CAPI)
                                </h3>
                                <p className="text-sm text-gray-500 mb-6">
                                    Enable server-side Conversion Tracking to send Purchase, AddToCart, and ViewContent events directly from your server. This bypasses ad-blockers and iOS tracking limitations to significantly improve Facebook Ads optimization.
                                </p>

                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase text-gray-500 flex justify-between">
                                            <span>Meta Pixel ID</span>
                                            <span className="text-[10px] text-gray-400 font-normal">Requires standard numerical ID</span>
                                        </label>
                                        <input 
                                            type="text" 
                                            value={settings['META_PIXEL_ID'] || ''} 
                                            onChange={e => handleChange('META_PIXEL_ID', e.target.value)} 
                                            className="w-full p-3 border border-gray-300 rounded font-mono text-sm focus:border-masuma-orange outline-none" 
                                            placeholder="e.g. 847294820184720" 
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase text-gray-500 flex justify-between">
                                            <span>Conversions API Access Token</span>
                                            <span className="text-[10px] text-gray-400 font-normal">Generated in Meta Events Manager settings</span>
                                        </label>
                                        <textarea 
                                            value={settings['META_CAPI_TOKEN'] || ''} 
                                            onChange={e => handleChange('META_CAPI_TOKEN', e.target.value)} 
                                            className="w-full p-3 border border-gray-300 rounded font-mono text-xs focus:border-masuma-orange outline-none h-24" 
                                            placeholder="EAAGzD4..." 
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase text-gray-500 flex justify-between">
                                            <span>Meta Test Event Code</span>
                                            <span className="text-[10px] text-gray-400 font-normal">Optional: Used to debug real-time events in the events manager</span>
                                        </label>
                                        <input 
                                            type="text" 
                                            value={settings['META_TEST_EVENT_CODE'] || ''} 
                                            onChange={e => handleChange('META_TEST_EVENT_CODE', e.target.value)} 
                                            className="w-full p-3 border border-gray-300 rounded font-mono text-sm focus:border-masuma-orange outline-none" 
                                            placeholder="e.g. TEST12345" 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg space-y-4">
                                <h4 className="font-bold text-blue-900 text-sm uppercase tracking-wide">🚀 Setup Instructions in Meta Commerce Manager</h4>
                                <ol className="text-xs text-blue-800 list-decimal list-inside space-y-2">
                                    <li>Go to your <strong>Meta Commerce Manager</strong> (<a href="https://business.facebook.com/commerce" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-blue-900 inline-flex items-center gap-1">business.facebook.com/commerce <ExternalLink size={10} className="inline"/></a>).</li>
                                    <li>Click <strong>Add Catalog</strong>, choose <strong>E-Commerce (Products)</strong> or <strong>Automotive (Vehicles)</strong>, and click Next.</li>
                                    <li>Select <strong>Upload Product Info</strong>, name your Catalog, and click Create.</li>
                                    <li>In the left sidebar, click <strong>Data Sources</strong>, then click <strong>Add Items</strong>.</li>
                                    <li>Select <strong>Data Feed (Scheduled Feed)</strong> and click Next.</li>
                                    <li>Choose <strong>Use a URL</strong>, paste the copied feed URL from above, and set the update frequency to <strong>Hourly</strong> or <strong>Daily</strong>.</li>
                                    <li>Click Upload. Meta will automatically scan and synchronize all your products/vehicles, keep stocks updated, and prepare them for your Facebook/Instagram ads!</li>
                                </ol>
                            </div>
                        </div>
                    )}

                    {activeTab === 'integrations' && (
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-lg font-bold uppercase text-masuma-dark mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                                    <Smartphone size={20} className="text-green-600"/> Safaricom Daraja (M-Pesa)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase text-gray-500">Consumer Key</label>
                                        <input type="password" value={settings['MPESA_CONSUMER_KEY'] || ''} onChange={e => handleChange('MPESA_CONSUMER_KEY', e.target.value)} className="w-full p-3 border border-gray-300 rounded font-mono text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase text-gray-500">Consumer Secret</label>
                                        <input type="password" value={settings['MPESA_CONSUMER_SECRET'] || ''} onChange={e => handleChange('MPESA_CONSUMER_SECRET', e.target.value)} className="w-full p-3 border border-gray-300 rounded font-mono text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase text-gray-500">Passkey</label>
                                        <input type="password" value={settings['MPESA_PASSKEY'] || ''} onChange={e => handleChange('MPESA_PASSKEY', e.target.value)} className="w-full p-3 border border-gray-300 rounded font-mono text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase text-gray-500">Shortcode (Paybill/Till)</label>
                                        <input type="text" value={settings['MPESA_SHORTCODE'] || ''} onChange={e => handleChange('MPESA_SHORTCODE', e.target.value)} className="w-full p-3 border border-gray-300 rounded font-mono text-sm" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-bold uppercase text-masuma-dark mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                                    <Key size={20} className="text-blue-600"/> External Services
                                </h3>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase text-gray-500">VIN Decoder API Key</label>
                                        <input type="password" value={settings['VIN_API_KEY'] || ''} onChange={e => handleChange('VIN_API_KEY', e.target.value)} className="w-full p-3 border border-gray-300 rounded font-mono text-sm" placeholder="e.g. NHTSA or AutoLoop Key" />
                                        <p className="text-[10px] text-gray-400">Used for the Vehicle Identification module.</p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase text-gray-500">Google Gemini API Key</label>
                                        <input type="password" value={settings['GEMINI_API_KEY'] || ''} disabled className="w-full p-3 border border-gray-200 bg-gray-100 rounded font-mono text-sm cursor-not-allowed" placeholder="Managed via Environment Variables for Security" />
                                        <p className="text-[10px] text-gray-400">Contact system administrator to update AI keys.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'fiscal' && (
                        <div className="space-y-6">
                           <h3 className="text-lg font-bold uppercase text-masuma-dark mb-6 pb-2 border-b border-gray-100 flex items-center gap-2">
                               <Shield size={20} className="text-purple-600"/> KRA eTIMS Configuration
                           </h3>
                           <div className="bg-yellow-50 border border-yellow-200 p-4 rounded mb-4">
                               <p className="text-xs text-yellow-800"><strong>Warning:</strong> Changing these settings will affect fiscal signature generation. Ensure the device is online.</p>
                           </div>
                           <div className="space-y-2">
                               <label className="text-xs font-bold uppercase text-gray-500">Tax Payer PIN (P05...)</label>
                               <input type="text" value={settings['KRA_PIN'] || ''} onChange={e => handleChange('KRA_PIN', e.target.value)} className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none font-mono" />
                           </div>
                           <div className="space-y-2">
                               <label className="text-xs font-bold uppercase text-gray-500">Device Serial Number</label>
                               <input type="text" value={settings['DEVICE_SERIAL'] || ''} onChange={e => handleChange('DEVICE_SERIAL', e.target.value)} className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none font-mono" />
                           </div>
                           <div className="space-y-2">
                               <label className="text-xs font-bold uppercase text-gray-500">VSCU API URL</label>
                               <input type="text" value={settings['KRA_API_URL'] || ''} onChange={e => handleChange('KRA_API_URL', e.target.value)} className="w-full p-3 border border-gray-300 rounded focus:border-masuma-orange outline-none font-mono" placeholder="https://itax.kra.go.ke/eTIMS/api" />
                           </div>
                        </div>
                   )}

                    {activeTab === 'backup' && (
                        <BackupManager />
                    )}

                   {activeTab === 'status' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-100">
                                <h3 className="text-lg font-bold uppercase text-masuma-dark">System Health Monitor</h3>
                                <button onClick={fetchHealth} className="p-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-600">
                                    <RefreshCw size={16} className={loadingHealth ? 'animate-spin' : ''} />
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-green-50 p-4 rounded border border-green-200 flex items-start gap-3">
                                    <Server className="text-green-600 mt-1" size={24} />
                                    <div>
                                        <h4 className="font-bold text-green-800 text-sm">API Server</h4>
                                        <p className="text-xs text-green-600">{healthData?.server || 'Checking...'}</p>
                                        <p className="text-[10px] text-gray-500 mt-1">Uptime: {healthData ? (healthData.uptime / 60).toFixed(2) + ' mins' : '...'}</p>
                                    </div>
                                </div>

                                <div className={`p-4 rounded border flex items-start gap-3 ${healthData?.database === 'Connected' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                    <Database className={`${healthData?.database === 'Connected' ? 'text-green-600' : 'text-red-600'} mt-1`} size={24} />
                                    <div>
                                        <h4 className={`font-bold text-sm ${healthData?.database === 'Connected' ? 'text-green-800' : 'text-red-800'}`}>Primary Database</h4>
                                        <p className={`text-xs ${healthData?.database === 'Connected' ? 'text-green-600' : 'text-red-600'}`}>{healthData?.database || 'Checking...'}</p>
                                        <p className="text-[10px] text-gray-500 mt-1">MySQL 8.0</p>
                                    </div>
                                </div>

                                <div className={`p-4 rounded border flex items-start gap-3 ${healthData?.redis === 'Connected' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                    <Activity className={`${healthData?.redis === 'Connected' ? 'text-green-600' : 'text-red-600'} mt-1`} size={24} />
                                    <div>
                                        <h4 className={`font-bold text-sm ${healthData?.redis === 'Connected' ? 'text-green-800' : 'text-red-800'}`}>Cache (Redis)</h4>
                                        <p className={`text-xs ${healthData?.redis === 'Connected' ? 'text-green-600' : 'text-red-600'}`}>{healthData?.redis || 'Checking...'}</p>
                                        <p className="text-[10px] text-gray-500 mt-1">BullMQ / Caching</p>
                                    </div>
                                </div>

                                <div className="bg-blue-50 p-4 rounded border border-blue-200 flex items-start gap-3">
                                    <FileText className="text-blue-600 mt-1" size={24} />
                                    <div>
                                        <h4 className="font-bold text-blue-800 text-sm">Background Workers</h4>
                                        <p className="text-xs text-blue-600">Idle (BullMQ)</p>
                                        <p className="text-[10px] text-gray-500 mt-1">Queue Depth: 0</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                   )}
                </div>
            </div>
        </div>
    );
};

export default SettingsManager;