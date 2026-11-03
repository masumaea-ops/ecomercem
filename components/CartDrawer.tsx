import React from 'react';
import { X, Trash2, Smartphone, Plus, Minus, ShieldCheck, ChevronRight } from 'lucide-react';
import { CartItem } from '../types';
import Price from './Price';
import ProductImage from './ProductImage';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  removeFromCart: (id: string) => void;
  onCheckout: () => void;
  updateQuantity: (id: string, quantity: number) => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose, cartItems, removeFromCart, onCheckout, updateQuantity }) => {
  const subtotal = Number(cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2));
  const vatAmount = Number((subtotal * 0.16).toFixed(2));
  const total = Number((subtotal + vatAmount).toFixed(2));

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-masuma-dark/60 backdrop-blur-sm z-[1000] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-[100dvh] w-full sm:w-[400px] bg-white z-[1001] transform transition-transform duration-500 ease-out shadow-2xl ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
            <div>
                <h2 className="text-lg font-bold font-display uppercase tracking-tight text-masuma-dark">Your Order</h2>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{cartItems.length} items selected</p>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-gray-100 rounded-full transition text-gray-400 hover:text-masuma-dark focus-ring touch-target"
              aria-label="Close cart drawer"
            >
              <X size={24} />
            </button>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50/30 scroll-smooth">
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 text-gray-200 shadow-inner border border-gray-100">
                    <Smartphone size={48} strokeWidth={1} />
                </div>
                <h3 className="font-bold text-masuma-dark uppercase text-base tracking-widest">Your Cart is Empty</h3>
                <p className="text-xs text-gray-400 mt-3 max-w-[220px] uppercase font-bold leading-relaxed">Add genuine Masuma precision parts to start your local order.</p>
                <button 
                  onClick={onClose} 
                  className="mt-10 bg-masuma-dark text-white px-10 py-4 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-masuma-orange transition-all shadow-xl shadow-masuma-dark/10 active:scale-95 focus-ring"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              <div className="space-y-4 pb-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex gap-4 bg-white p-4 rounded-3xl shadow-sm border border-gray-100 transition-all hover:shadow-md hover:border-masuma-orange/20 group relative overflow-hidden">
                    <div className="h-24 w-24 bg-gray-50 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-gray-50 group-hover:bg-white transition-colors p-2">
                      <ProductImage 
                        src={item.image} 
                        sku={item.sku} 
                        alt={item.name} 
                        className="max-h-full max-w-full object-contain p-1 transition-transform group-hover:scale-110 duration-700 ease-out" 
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                            <h4 className="font-bold text-xs text-masuma-dark line-clamp-2 leading-tight group-hover:text-masuma-orange transition-colors uppercase tracking-tight">{item.name}</h4>
                            <button 
                              onClick={() => removeFromCart(item.id)}
                              className="text-gray-300 hover:text-red-500 transition-colors p-1 -mr-1 focus-ring touch-target"
                              aria-label={`Remove ${item.name} from cart`}
                            >
                              <X size={18} />
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold tracking-wider mt-1.5 uppercase opacity-60">SKU: {item.sku}</p>
                      </div>
                      
                      <div className="flex justify-between items-center mt-4">
                        <span className="text-masuma-dark font-bold text-xs tracking-tighter">
                          <Price amount={item.price} />
                        </span>
                        
                        <div className="flex items-center bg-gray-100/80 rounded-2xl p-1 border border-gray-200/50 backdrop-blur-sm">
                          <button 
                              onClick={() => updateQuantity(item.id, item.quantity - 1)} 
                              className="w-10 h-10 flex items-center justify-center hover:bg-white hover:shadow-sm rounded-xl text-gray-400 hover:text-masuma-dark transition-all disabled:opacity-30 focus-ring touch-target"
                              disabled={item.quantity <= 1}
                              aria-label="Decrease quantity"
                          >
                              <Minus size={14} strokeWidth={3}/>
                          </button>
                          <span className="text-sm font-bold w-10 text-center text-masuma-dark" aria-live="polite">{item.quantity}</span>
                          <button 
                              onClick={() => updateQuantity(item.id, item.quantity + 1)} 
                              className="w-10 h-10 flex items-center justify-center hover:bg-white hover:shadow-sm rounded-xl text-gray-400 hover:text-masuma-dark transition-all focus-ring touch-target"
                              aria-label="Increase quantity"
                          >
                              <Plus size={14} strokeWidth={3}/>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {cartItems.length > 0 && (
              <div className="p-4 sm:p-6 sm:p-8 border-t border-gray-100 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-10 pb-safe">
                <div className="space-y-2.5 sm:space-y-3 mb-4 sm:mb-6">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0"></div>
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider leading-tight">
                          Free Nairobi Pickup (Ruby Mall) • Kenya Dispatch
                      </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500 font-bold uppercase tracking-wider">
                      <span>Subtotal (Excl. VAT)</span>
                      <span className="text-masuma-dark"><Price amount={subtotal} /></span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500 font-bold uppercase tracking-wider">
                      <span>VAT (16%)</span>
                      <span className="text-masuma-dark"><Price amount={vatAmount} /></span>
                  </div>
                  <div className="h-px bg-gray-100 w-full my-1.5 sm:my-2"></div>
                  <div className="flex justify-between items-end">
                      <div>
                          <p className="text-[10px] text-masuma-orange font-bold uppercase tracking-widest mb-1">Total Payable</p>
                          <p className="text-xl font-bold text-masuma-dark tracking-tighter leading-none"><Price amount={total} /></p>
                      </div>
                      <div className="text-right">
                           <div className="flex items-center gap-1.5 bg-green-50 px-2 py-1 rounded-sm border border-green-100">
                               <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                               <p className="text-[10px] text-green-700 font-bold uppercase tracking-wider">Taxes Calculated</p>
                           </div>
                      </div>
                  </div>
                </div>
                
                <button 
                  onClick={onCheckout}
                  className="w-full bg-masuma-dark text-white py-3.5 sm:py-5 rounded-2xl sm:rounded-3xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-masuma-orange hover:-translate-y-1 transition-all shadow-2xl shadow-masuma-dark/20 active:scale-95 group/btn focus-ring touch-target"
                  aria-label="Proceed to checkout"
                >
                  Proceed to Checkout <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>

                <div className="mt-4 sm:mt-6 hidden xs:flex items-center justify-center gap-4 opacity-30">
                    <ShieldCheck size={16} className="text-masuma-dark" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-masuma-dark">Secure Japanese Precision Logistics</span>
                </div>
              </div>
          )}

        </div>
      </div>
    </>
  );
};

export default CartDrawer;