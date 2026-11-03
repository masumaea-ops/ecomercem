import React, { useState, useEffect } from 'react';
import { Lock, Loader2, CheckCircle, ArrowLeft, ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { apiClient } from '../utils/apiClient';
import { Logo } from './Logo';

interface ResetPasswordProps {
    onBack: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onBack }) => {
    const [token, setToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('token');
        if (t) {
            setToken(t);
        } else {
            setError('The reset link appears to be invalid or missing a security token.');
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirm) return setError('Passwords do not match.');
        if (password.length < 8) return setError('Security requirement: Password must be at least 8 characters.');

        setIsLoading(true);
        setError('');

        try {
            await apiClient.post('/auth/reset-password', { token, password });
            setSuccess(true);
            // Clear URL params to prevent re-submitting
            window.history.replaceState({}, '', window.location.pathname);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Password reset failed. The link may have expired or was already used.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md border-t-4 border-masuma-orange animate-scale-up">
                <div className="text-center mb-8 flex flex-col items-center">
                    <Logo />
                    <div className="h-1 w-12 bg-gray-100 my-4"></div>
                    <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">Secure Account Recovery</p>
                </div>

                {success ? (
                    <div className="text-center py-6 animate-fade-in">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle size={48} />
                        </div>
                        <h3 className="text-2xl font-bold text-masuma-dark mb-2">Success!</h3>
                        <p className="text-gray-600 mb-8 leading-relaxed">
                            Your password has been updated. You can now access the Masuma ERP with your new credentials.
                        </p>
                        <button 
                            onClick={onBack}
                            className="w-full bg-masuma-dark text-white py-4 rounded font-bold uppercase tracking-widest hover:bg-masuma-orange transition shadow-lg"
                        >
                            Return to Login
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="bg-blue-50 p-4 rounded border border-blue-100 text-xs text-blue-700 font-bold uppercase tracking-tight flex items-start gap-3">
                            <ShieldCheck size={18} className="shrink-0" />
                            <span>Create a strong password to protect your access to the Masuma ERP system.</span>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded text-sm font-bold border border-red-100 flex items-start gap-2 animate-pulse">
                                <AlertCircle size={18} className="shrink-0" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative">
                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">New Password</label>
                                <div className="relative">
                                    <input 
                                        type={showPass ? "text" : "password"} 
                                        required
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full p-3 pl-10 border border-gray-300 rounded focus:border-masuma-orange focus:ring-1 focus:ring-masuma-orange outline-none transition bg-gray-50 focus:bg-white" 
                                        placeholder="Min. 8 characters"
                                    />
                                    <Lock className="absolute left-3 top-3.5 text-gray-300" size={18} />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPass(!showPass)}
                                        className="absolute right-3 top-3.5 text-gray-400 hover:text-masuma-orange transition"
                                    >
                                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                {password.length > 0 && password.length < 8 && (
                                    <p className="text-[10px] text-red-500 font-bold mt-1 ml-1 uppercase">Too short</p>
                                )}
                            </div>

                            <div className="relative">
                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Confirm Password</label>
                                <div className="relative">
                                    <input 
                                        type={showPass ? "text" : "password"} 
                                        required
                                        value={confirm}
                                        onChange={e => setConfirm(e.target.value)}
                                        className={`w-full p-3 pl-10 border rounded outline-none transition bg-gray-50 focus:bg-white ${
                                            confirm && password !== confirm ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-masuma-orange'
                                        }`} 
                                        placeholder="Repeat your password"
                                    />
                                    <Lock className="absolute left-3 top-3.5 text-gray-300" size={18} />
                                </div>
                                {confirm && password !== confirm && (
                                    <p className="text-[10px] text-red-500 font-bold mt-1 ml-1 uppercase">Passwords do not match</p>
                                )}
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading || !token || password !== confirm || password.length < 8}
                            className="w-full bg-masuma-dark text-white py-4 rounded font-bold uppercase tracking-widest hover:bg-masuma-orange transition shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <ShieldCheck size={20} />
                                    Set New Password
                                </>
                            )}
                        </button>

                        <button 
                            type="button" 
                            onClick={onBack} 
                            className="w-full text-center text-xs text-gray-400 font-bold uppercase hover:text-masuma-dark mt-4 flex items-center justify-center gap-2"
                        >
                            <ArrowLeft size={14} /> Back to Login
                        </button>
                    </form>
                )}
            </div>
            
            <div className="fixed bottom-6 text-center text-[10px] text-gray-400 uppercase tracking-widest pointer-events-none">
                Masuma Autoparts EA Ltd • Internal Security System
            </div>
        </div>
    );
};

export default ResetPassword;