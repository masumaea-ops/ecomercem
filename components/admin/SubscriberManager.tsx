import React, { useState, useEffect } from 'react';
import { Mail, Trash2, Loader2, RefreshCw, CheckCircle, Search, UserCheck, Send, Megaphone, Info, AlertTriangle } from 'lucide-react';
import { apiClient } from '../../utils/apiClient';

interface Subscriber {
    id: string;
    email: string;
    isActive: boolean;
    createdAt: string;
}

const SubscriberManager: React.FC = () => {
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'list' | 'campaign' | 'diagnostics'>('list');

    // Campaign states
    const [subject, setSubject] = useState('');
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [actionUrl, setActionUrl] = useState('');
    const [actionText, setActionText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Diagnostics states
    const [smtpStatus, setSmtpStatus] = useState<{ ok?: boolean; message?: string; testing?: boolean } | null>(null);
    const [testEmailAddress, setTestEmailAddress] = useState('');
    const [isTestingEmail, setIsTestingEmail] = useState(false);
    const [testResult, setTestResult] = useState<{ ok?: boolean; message?: string } | null>(null);

    const checkSmtpStatus = async () => {
        setSmtpStatus({ testing: true });
        try {
            const res = await apiClient.get('/newsletter/smtp-status');
            setSmtpStatus(res.data);
        } catch (err: any) {
            setSmtpStatus({ ok: false, message: err.response?.data?.message || err.message });
        }
    };

    const handleSendTestEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!testEmailAddress.trim()) return;
        setIsTestingEmail(true);
        setTestResult(null);
        try {
            const res = await apiClient.post('/newsletter/test-smtp', { email: testEmailAddress.trim() });
            setTestResult(res.data);
        } catch (err: any) {
            setTestResult({ ok: false, message: err.response?.data?.message || err.message });
        } finally {
            setIsTestingEmail(false);
        }
    };

    const loadStockPreset = () => {
        setSubject("Exclusive Stock Arrival: Genuine Japanese Spare Parts Restocked at Ruby Mall!");
        setTitle("New Tokyo Shipment Arrived in Nairobi");
        setBody("Jambo Masuma VIP Subscriber,\n\nWe have received a major shipment of certified Masuma components directly from Japan at our Ruby Mall warehouse, Accra Road Nairobi.\n\nRestocked High-Demand Lines:\n• Genuine Ceramic & Semi-Metallic Brake Pads (Toyota Premio, Fielder, Prado 150, Hilux)\n• Iridium Platinum Spark Plugs for optimal fuel economy on Kenyan roads\n• Heavy-duty Suspension Bushings, Stabilizer Links & Ball Joints\n• Cabin, Air & Oil Filters\n\nAll parts are backed by our signature 12-Month Unlimited Mileage Warranty.\n\nReply directly to this email or click below to browse live inventory and reserve your parts before stocks run out!");
        setActionText("Browse Restocked Catalog");
        setActionUrl("https://masuma.africa/catalog");
    };

    const loadMaintenancePreset = () => {
        setSubject("Pro-Tip: How to Prevent Premature Suspension Failure on Kenyan Roads");
        setTitle("Japanese Precision vs East African Road Realities");
        setBody("Jambo Masuma VIP Subscriber,\n\nKenyan roads present extreme conditions: heavy potholes, dust, and temperature swings. Standard generic bushings and ball joints quickly crack, causing steering vibration and uneven tire wear.\n\nWhy Masuma Heavy-Duty Suspension Outlasts Generic Parts:\n1. Specially formulated natural chloroprene rubber that resists tropical heat and ozone cracking.\n2. Induction-hardened ball studs with mirror-finish chrome for frictionless articulation.\n3. Factory pre-greased with high-temp Japanese lithium complex.\n\nInspect your suspension today. If you need a fitment check for your chassis number (VIN), WhatsApp our technical desk directly on +254 792 506 590.");
        setActionText("Explore Suspension Parts");
        setActionUrl("https://masuma.africa/catalog?category=Suspension");
    };

    const fetchSubscribers = async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get('/newsletter');
            setSubscribers(res.data);
        } catch (error) {
            console.error('Failed to fetch subscribers', error);
            setSubscribers([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscribers();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Unsubscribe this user?')) return;
        try {
            await apiClient.delete(`/newsletter/${id}`);
            fetchSubscribers();
        } catch (error) {
            alert('Operation failed');
        }
    };

    const handleSendCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        if (!subject.trim() || !title.trim() || !body.trim()) {
            setErrorMsg('Campaign Subject, Heading Title, and Message Body are required.');
            return;
        }

        setIsSending(true);
        try {
            const response = await apiClient.post('/newsletter/campaign', {
                subject,
                title,
                body,
                actionUrl: actionUrl || undefined,
                actionText: actionText || undefined
            });

            setSuccessMsg(response.data.message || 'Campaign successfully dispatched to all active subscribers!');
            // Reset campaign form
            setSubject('');
            setTitle('');
            setBody('');
            setActionUrl('');
            setActionText('');
        } catch (error: any) {
            console.error('Failed to dispatch campaign:', error);
            setErrorMsg(error.response?.data?.error || 'Failed to dispatch campaign newsletter.');
        } finally {
            setIsSending(false);
        }
    };

    const activeSubscribers = subscribers.filter(s => s.isActive);
    const filtered = subscribers.filter(s => s.email.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="h-full flex flex-col">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-masuma-dark font-display uppercase flex items-center gap-2">
                        <Mail className="text-masuma-orange" /> Subscriptions & Campaigns
                    </h2>
                    <p className="text-sm text-gray-500">Manage newsletter audiences and broadcast premium insights.</p>
                </div>
                
                <div className="flex flex-wrap bg-gray-100 p-1.5 rounded-xl border self-start sm:self-center gap-1">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                            activeTab === 'list' 
                                ? 'bg-white text-masuma-dark shadow-sm' 
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        Audience List ({subscribers.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('campaign')}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                            activeTab === 'campaign' 
                                ? 'bg-white text-masuma-dark shadow-sm' 
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        Launch Broadcast
                    </button>
                    <button
                        onClick={() => { setActiveTab('diagnostics'); checkSmtpStatus(); }}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-1.5 ${
                            activeTab === 'diagnostics' 
                                ? 'bg-white text-masuma-dark shadow-sm' 
                                : 'text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Delivery Diagnostics
                    </button>
                </div>
            </div>

            {activeTab === 'list' ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="relative max-w-md w-full">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                            <input 
                                type="text" 
                                className="w-full pl-9 pr-4 py-2 border rounded focus:border-masuma-orange outline-none bg-white text-sm" 
                                placeholder="Search email..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-gray-650 bg-gray-200 px-3 py-1.5 rounded-lg border">
                                Active Deliveries: <strong>{activeSubscribers.length}</strong>
                            </span>
                            <button onClick={fetchSubscribers} className="p-2 bg-white border rounded-lg hover:bg-gray-50 transition">
                                <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-masuma-orange" /></div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b">
                                    <tr>
                                        <th className="px-6 py-4">Subscriber Email</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Joined Date</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filtered.map(sub => (
                                        <tr key={sub.id} className="hover:bg-gray-50 group">
                                            <td className="px-6 py-4 font-bold text-masuma-dark text-sm">{sub.email}</td>
                                            <td className="px-6 py-4">
                                                {sub.isActive ? (
                                                    <span className="bg-green-50 text-green-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase flex items-center gap-1 w-fit border border-green-150">
                                                        <UserCheck size={12}/> Active
                                                    </span>
                                                ) : (
                                                    <span className="bg-gray-50 text-gray-400 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase flex items-center gap-1 w-fit border">
                                                        Unsubscribed
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-500">
                                                {new Date(sub.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium">
                                                <button onClick={() => handleDelete(sub.id)} className="text-gray-300 hover:text-red-500 p-1 rounded-lg transition" title="Unsubscribe customer">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filtered.length === 0 && (
                                        <tr><td colSpan={4} className="text-center py-12 text-gray-400 text-sm font-medium">No subscribers found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            ) : activeTab === 'campaign' ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
                    {/* Launch Form */}
                    <div className="lg:col-span-7 bg-white p-6 rounded-xl border shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <Megaphone className="text-masuma-orange" size={20} />
                            <h3 className="font-bold text-masuma-dark uppercase text-sm tracking-wider">Compose Campaign Bulletin</h3>
                        </div>

                        {successMsg && (
                            <div className="mb-4 p-4 bg-green-50 text-green-700 border border-green-150 rounded-xl flex items-center gap-2 text-sm font-medium">
                                <CheckCircle size={18} /> {successMsg}
                            </div>
                        )}

                        {errorMsg && (
                            <div className="mb-4 p-4 bg-rose-50 text-rose-700 border border-rose-150 rounded-xl flex items-center gap-2 text-sm font-medium">
                                <AlertTriangle size={18} /> {errorMsg}
                            </div>
                        )}

                        {/* Fast Presets */}
                        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-gray-50 border rounded-xl">
                            <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Quick Fill Presets:</span>
                            <button
                                type="button"
                                onClick={loadStockPreset}
                                className="px-3 py-1.5 bg-white hover:bg-masuma-orange hover:text-white border border-gray-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-sm"
                            >
                                📦 New Stock Restock Alert
                            </button>
                            <button
                                type="button"
                                onClick={loadMaintenancePreset}
                                className="px-3 py-1.5 bg-white hover:bg-masuma-orange hover:text-white border border-gray-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-sm"
                            >
                                🔧 Kenyan Road Maintenance Guide
                            </button>
                        </div>

                        <form onSubmit={handleSendCampaign} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Email Subject Header</label>
                                <input
                                    type="text"
                                    className="p-3 border rounded-xl focus:border-masuma-orange outline-none text-sm bg-white text-gray-800"
                                    placeholder="e.g. Exclusive Stock Updates: Original Brake Pads Re-Stocked!"
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                    required
                                />
                                <p className="text-[10px] text-gray-500">This is what subscribers see in their main inbox folder.</p>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Campaign Banner Title</label>
                                <input
                                    type="text"
                                    className="p-3 border rounded-xl focus:border-masuma-orange outline-none text-sm bg-white text-gray-800"
                                    placeholder="e.g. Genuine Japanese Precision Available Now"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    required
                                />
                                <p className="text-[10px] text-gray-500">Featured headline displayed at the top of the email.</p>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Newsletter Message Body</label>
                                <textarea
                                    className="p-3 border rounded-xl focus:border-masuma-orange outline-none text-sm bg-white text-gray-800 min-h-[160px] resize-y"
                                    placeholder="Write your announcement or newsletter update here..."
                                    value={body}
                                    onChange={e => setBody(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Call to Action Link (Optional)</label>
                                    <input
                                        type="text"
                                        className="p-3 border rounded-xl focus:border-masuma-orange outline-none text-sm bg-white text-gray-800"
                                        placeholder="e.g. /?view=PRODUCTS"
                                        value={actionUrl}
                                        onChange={e => setActionUrl(e.target.value)}
                                    />
                                    <p className="text-[10px] text-gray-500">Adds an elegant action button leading to this URL.</p>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Button Label (Optional)</label>
                                    <input
                                        type="text"
                                        className="p-3 border rounded-xl focus:border-masuma-orange outline-none text-sm bg-white text-gray-800"
                                        placeholder="e.g. Shop Spare Parts"
                                        value={actionText}
                                        onChange={e => setActionText(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSending || activeSubscribers.length === 0}
                                className="mt-2 w-full p-3.5 bg-masuma-orange text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-masuma-orange-dark transition disabled:bg-gray-100 disabled:text-gray-400 shadow-sm flex justify-center items-center gap-2"
                            >
                                {isSending ? (
                                    <>
                                        <Loader2 className="animate-spin" size={16} /> Delivering Broadcast...
                                    </>
                                ) : (
                                    <>
                                        <Send size={15} /> Dispatch Campaign to {activeSubscribers.length} Subscribers
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Guidelines & Live Template preview */}
                    <div className="lg:col-span-5 flex flex-col gap-4">
                        <div className="bg-gray-50 p-5 rounded-xl border">
                            <h4 className="font-bold text-xs uppercase tracking-wider text-masuma-dark flex items-center gap-1.5 mb-2.5">
                                <Info size={14} className="text-masuma-orange" /> Campaign Advisory
                            </h4>
                            <ul className="text-xs text-gray-600 flex flex-col gap-2 list-disc pl-4">
                                <li><strong>Target Audience</strong>: Broadcast is immediately delivered to all <strong>{activeSubscribers.length} active</strong> subscribers.</li>
                                <li><strong>Unsubscribe Support</strong>: Every email automatically appended with a secure unsubscribe tag allowing users to sign-out with one click.</li>
                                <li><strong>Clean Standard Styling</strong>: Your text is beautifully formatted inside our official Japanese autoparts template framework.</li>
                            </ul>
                        </div>

                        {/* Visual Mock Preview */}
                        <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
                            <div className="bg-gray-50 p-3.5 border-b flex justify-between items-center">
                                <span className="text-[10px] font-extrabold text-gray-450 uppercase tracking-wider">Email Template Preview</span>
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            </div>
                            <div className="p-4 bg-gray-100 mini-mail-preview">
                                <div className="bg-white border rounded-lg overflow-hidden shadow-sm text-[11px] max-w-sm mx-auto">
                                    <div className="bg-[#1A1A1A] p-3 text-center">
                                        <h1 className="text-masuma-orange m-0 text-sm font-extrabold tracking-widest uppercase">Masuma Africa</h1>
                                    </div>
                                    <div className="p-4 text-gray-800">
                                        <h2 className="font-bold text-gray-900 border-b pb-1 mb-2 text-xs uppercase text-masuma-dark">
                                            {title || 'Client Update Headline'}
                                        </h2>
                                        <p className="text-gray-600 whitespace-pre-wrap leading-relaxed text-[10px]">
                                            {body || 'Configure your campaign message on the left to preview its content distribution here...'}
                                        </p>
                                        
                                        {(actionUrl || actionText) && (
                                            <div className="mt-4 text-center">
                                                <span className="inline-block bg-masuma-orange text-white font-extrabold px-3 py-1.5 rounded text-[9px] uppercase tracking-wider">
                                                    {actionText || 'Explore Catalog'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-gray-55 p-3 text-center border-t text-[8px] text-gray-400">
                                        <p>You received this because you subscribed to Masuma updates.</p>
                                        <p className="text-masuma-orange underline mt-1 font-bold">Unsubscribe</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl border shadow-sm p-6 flex flex-col gap-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
                        <div>
                            <h3 className="text-lg font-bold text-masuma-dark font-display uppercase tracking-wider flex items-center gap-2">
                                <Mail className="text-masuma-orange" size={20} />
                                Outbound Email Pipeline Diagnostics
                            </h3>
                            <p className="text-xs text-gray-500">
                                Verify SMTP connectivity, test subscriber notification delivery, and inspect server configuration.
                            </p>
                        </div>
                        <button
                            onClick={checkSmtpStatus}
                            disabled={smtpStatus?.testing}
                            className="px-4 py-2 bg-masuma-dark hover:bg-masuma-orange text-white text-xs font-bold uppercase tracking-wider rounded-lg transition flex items-center gap-2 disabled:opacity-50"
                        >
                            {smtpStatus?.testing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                            Re-Check SMTP Status
                        </button>
                    </div>

                    {/* SMTP Health Card */}
                    <div className={`p-5 rounded-xl border flex items-start gap-4 ${
                        smtpStatus === null ? 'bg-gray-50 border-gray-200' :
                        smtpStatus.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
                        'bg-rose-50 border-rose-200 text-rose-900'
                    }`}>
                        <div className="p-2 rounded-lg bg-white shadow-sm shrink-0">
                            {smtpStatus === null || smtpStatus.testing ? (
                                <Loader2 size={24} className="animate-spin text-masuma-orange" />
                            ) : smtpStatus.ok ? (
                                <CheckCircle size={24} className="text-emerald-600" />
                            ) : (
                                <AlertTriangle size={24} className="text-rose-600" />
                            )}
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-sm uppercase tracking-wide">
                                {smtpStatus === null || smtpStatus.testing ? 'Checking Mail Transport...' :
                                 smtpStatus.ok ? 'SMTP Connection Verified & Online' : 'SMTP Configuration Warning'}
                            </h4>
                            <p className="text-xs mt-1 leading-relaxed">
                                {smtpStatus?.message || 'Press Re-Check SMTP Status to verify your server connection.'}
                            </p>
                            {!smtpStatus?.ok && smtpStatus && (
                                <div className="mt-3 p-3 bg-white/80 rounded-lg text-[11px] text-gray-700 border">
                                    <p className="font-bold uppercase text-[10px] text-gray-500 mb-1">Common Troubleshooting Steps:</p>
                                    <ul className="list-disc pl-4 space-y-1">
                                        <li><strong>Gmail Accounts</strong>: You must use a 16-character <em>Google App Password</em>, not your regular Gmail account password.</li>
                                        <li><strong>Port Blocking</strong>: Cloud VPS providers often block port 587. If timeouts occur, set <code>SMTP_PORT=465</code> in <code>server/.env</code>.</li>
                                        <li><strong>Environment Variables</strong>: Ensure <code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code>, and <code>SMTP_PASS</code> are set in <code>server/.env</code>.</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Interactive Test Mail Dispatch */}
                    <div className="border rounded-xl p-5 bg-gray-50">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-masuma-dark mb-1 flex items-center gap-2">
                            <Send size={16} className="text-masuma-orange" /> Send Live Diagnostic Test Mail
                        </h4>
                        <p className="text-xs text-gray-500 mb-4">
                            Send an instant test email to verify that your notifications actually reach external inboxes.
                        </p>

                        <form onSubmit={handleSendTestEmail} className="flex flex-col sm:flex-row gap-3">
                            <input
                                type="email"
                                required
                                value={testEmailAddress}
                                onChange={e => setTestEmailAddress(e.target.value)}
                                placeholder="Enter your email to receive test message..."
                                className="flex-1 p-3 border rounded-xl bg-white text-sm outline-none focus:border-masuma-orange"
                            />
                            <button
                                type="submit"
                                disabled={isTestingEmail || !testEmailAddress.trim()}
                                className="px-6 py-3 bg-masuma-orange hover:bg-masuma-dark text-white text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
                            >
                                {isTestingEmail ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                Send Test Email
                            </button>
                        </form>

                        {testResult && (
                            <div className={`mt-4 p-3 rounded-lg text-xs font-bold flex items-center gap-2 ${
                                testResult.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                                {testResult.ok ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                                <span>{testResult.message}</span>
                            </div>
                        )}
                    </div>

                    {/* Subscriber Flow Blueprint */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="p-4 rounded-xl border bg-white shadow-sm">
                            <span className="text-[10px] font-black uppercase text-masuma-orange tracking-widest block mb-1">Step 1: VIP Signup</span>
                            <h5 className="font-bold text-gray-800 mb-1">Instant VIP Welcome</h5>
                            <p className="text-gray-500 text-[11px] leading-relaxed">
                                Subscriber instantly receives a confirmation email containing voucher code <strong>KARIBU5</strong> for 5% off, shop location, and WhatsApp contact.
                            </p>
                        </div>
                        <div className="p-4 rounded-xl border bg-white shadow-sm">
                            <span className="text-[10px] font-black uppercase text-masuma-orange tracking-widest block mb-1">Step 2: Admin Alert</span>
                            <h5 className="font-bold text-gray-800 mb-1">Lead Capture & Bell Alert</h5>
                            <p className="text-gray-500 text-[11px] leading-relaxed">
                                The store sales desk receives an email alert and system notification in the top navbar bell whenever a new lead subscribes.
                            </p>
                        </div>
                        <div className="p-4 rounded-xl border bg-white shadow-sm">
                            <span className="text-[10px] font-black uppercase text-masuma-orange tracking-widest block mb-1">Step 3: Audience Broadcast</span>
                            <h5 className="font-bold text-gray-800 mb-1">Stock & Blog Bulletins</h5>
                            <p className="text-gray-500 text-[11px] leading-relaxed">
                                Use the Launch Broadcast tab or publish blog articles to automatically notify all {activeSubscribers.length} active subscribers with 1 click.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubscriberManager;
