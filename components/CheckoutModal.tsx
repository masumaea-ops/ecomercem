
import React, { useState } from 'react';
import { X, CreditCard, Loader2, MapPin, User, Mail, Phone, Banknote, FileText } from 'lucide-react';
import { CartItem } from '../types';
import { apiClient } from '../utils/apiClient';
import Price from './Price';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    cartItems: CartItem[];
    onSuccess: () => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, cartItems, onSuccess }) => {
    const [step, setStep] = useState<'input' | 'processing' | 'success'>('input');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        paymentType: 'CASH' // 'CASH' or 'CHEQUE'
    });
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const subtotal = Number(cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2));
    const vatAmount = Number((subtotal * 0.16).toFixed(2));
    const totalAmount = Number((subtotal + vatAmount).toFixed(2));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStep('processing');
        setError('');

        try {
            await apiClient.post('/orders', {
                customerName: formData.name,
                customerEmail: formData.email,
                customerPhone: formData.phone,
                shippingAddress: formData.address,
                paymentMethod: formData.paymentType, // Send specific type (CASH/CHEQUE)
                items: cartItems.map(item => ({
                    productId: item.id,
                    quantity: item.quantity,
                    price: item.price
                }))
            });

            setStep('success');
            setTimeout(() => {
                onSuccess();
                onClose();
                setStep('input');
                setFormData({ name: '', email: '', phone: '', address: '', paymentType: 'CASH' });
            }, 3000);

        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to place order. Please try again.');
            setStep('input');
        }
    };

    return (
        <div className="fixed inset-0 z-[2050] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative bg-white w-full max-w-md rounded-lg shadow-2xl overflow-hidden animate-scale-up font-sans">
                {/* Header */}
                <div className="bg-masuma-dark p-5 flex justify-between items-center border-b-4 border-masuma-orange">
                    <h3 className="text-white font-bold text-lg uppercase tracking-wider flex items-center gap-2">
                        <CreditCard size={20} className="text-masuma-orange" /> Pay on Delivery
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition"><X size={24} /></button>
                </div>

                <div className="p-6">
                    {step === 'success' ? (
                        <div className="flex flex-col items-center text-center py-8">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                <CreditCard size={32} />
                            </div>
                            <h4 className="text-xl font-bold text-masuma-dark mb-2">Order Placed!</h4>
                            <p className="text-gray-600 text-sm">
                                Thank you, {formData.name}. Your order has been received. We will contact you at {formData.phone} to arrange delivery.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="bg-gray-50 p-4 border border-gray-200 rounded mb-4">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold">Subtotal</p>
                                    <p className="text-sm font-bold text-gray-600"><Price amount={subtotal} /></p>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold">VAT (16%)</p>
                                    <p className="text-sm font-bold text-gray-600"><Price amount={vatAmount} /></p>
                                </div>
                                <div className="h-px bg-gray-200 w-full mb-2"></div>
                                <div className="flex justify-between items-center text-center">
                                    <p className="text-xs text-gray-500 uppercase font-black tracking-widest">Total Payable</p>
                                    <p className="text-2xl font-black text-masuma-dark tracking-tighter"><Price amount={totalAmount} /></p>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded text-xs font-bold border border-red-200">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-masuma-dark uppercase flex items-center gap-1"><User size={12}/> Full Name</label>
                                <input 
                                    required 
                                    type="text" 
                                    value={formData.name} 
                                    onChange={e => setFormData({...formData, name: e.target.value})} 
                                    className="w-full p-3 border border-gray-300 rounded-sm focus:border-masuma-orange outline-none text-sm" 
                                    placeholder="Enter your name" 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-masuma-dark uppercase flex items-center gap-1"><Phone size={12}/> Phone</label>
                                    <input 
                                        required 
                                        type="tel" 
                                        value={formData.phone} 
                                        onChange={e => setFormData({...formData, phone: e.target.value})} 
                                        className="w-full p-3 border border-gray-300 rounded-sm focus:border-masuma-orange outline-none text-sm" 
                                        placeholder="07XX..." 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-masuma-dark uppercase flex items-center gap-1"><Mail size={12}/> Email (Optional)</label>
                                    <input 
                                        type="email" 
                                        value={formData.email} 
                                        onChange={e => setFormData({...formData, email: e.target.value})} 
                                        className="w-full p-3 border border-gray-300 rounded-sm focus:border-masuma-orange outline-none text-sm" 
                                        placeholder="john@doe.com" 
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-masuma-dark uppercase flex items-center gap-1"><MapPin size={12}/> Delivery Address</label>
                                <textarea 
                                    required 
                                    value={formData.address} 
                                    onChange={e => setFormData({...formData, address: e.target.value})} 
                                    className="w-full p-3 border border-gray-300 rounded-sm focus:border-masuma-orange outline-none text-sm h-16 resize-none" 
                                    placeholder="Street, Building, Pickup Station..." 
                                ></textarea>
                            </div>

                            {/* Payment Method Selection */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-masuma-dark uppercase">Payment Mode</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({...formData, paymentType: 'CASH'})}
                                        className={`p-3 border rounded flex items-center justify-center gap-2 text-xs font-bold uppercase transition ${formData.paymentType === 'CASH' ? 'bg-masuma-dark text-white border-masuma-dark' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <Banknote size={16} /> Cash
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({...formData, paymentType: 'CHEQUE'})}
                                        className={`p-3 border rounded flex items-center justify-center gap-2 text-xs font-bold uppercase transition ${formData.paymentType === 'CHEQUE' ? 'bg-masuma-dark text-white border-masuma-dark' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <FileText size={16} /> Cheque
                                    </button>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={step === 'processing'}
                                className="w-full bg-masuma-dark text-white font-bold uppercase tracking-widest py-4 rounded-sm hover:bg-masuma-orange transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {step === 'processing' ? <Loader2 className="animate-spin" size={20} /> : <CreditCard size={20} />}
                                {step === 'processing' ? 'Placing Order...' : 'Confirm Order'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CheckoutModal;
