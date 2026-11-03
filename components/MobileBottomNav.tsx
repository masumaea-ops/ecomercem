import React from 'react';
import { Home, Search, ShoppingCart, Bot, User } from 'lucide-react';
import { ViewState } from '../types';

interface MobileBottomNavProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  cartCount: number;
  toggleCart: () => void;
  toggleAi: () => void;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ 
  currentView, 
  setView, 
  cartCount, 
  toggleCart, 
  toggleAi 
}) => {
  const handleNav = (view: ViewState) => {
    setView(view);
  };

  return (
    <nav aria-label="Mobile Navigation" className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100/80 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] z-[100] pb-safe">
      <div className="flex justify-around items-center h-16 px-1">
        <button 
          onClick={() => handleNav('HOME')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all touch-target focus-ring active:scale-95 ${currentView === 'HOME' ? 'text-masuma-orange font-bold' : 'text-gray-400 hover:text-gray-700'}`}
          aria-label="Home"
          aria-current={currentView === 'HOME' ? 'page' : undefined}
        >
          <Home size={20} strokeWidth={currentView === 'HOME' ? 2.5 : 2} />
          <span className="text-[10px] uppercase tracking-tight font-display">Home</span>
          {currentView === 'HOME' && <span className="w-1.5 h-1.5 bg-masuma-orange rounded-full -mt-0.5"></span>}
        </button>
        
        <button 
          onClick={() => handleNav('CATALOG')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all touch-target focus-ring active:scale-95 ${currentView === 'CATALOG' ? 'text-masuma-orange font-bold' : 'text-gray-400 hover:text-gray-700'}`}
          aria-label="Catalog"
          aria-current={currentView === 'CATALOG' ? 'page' : undefined}
        >
          <Search size={20} strokeWidth={currentView === 'CATALOG' ? 2.5 : 2} />
          <span className="text-[10px] uppercase tracking-tight font-display">Catalog</span>
          {currentView === 'CATALOG' && <span className="w-1.5 h-1.5 bg-masuma-orange rounded-full -mt-0.5"></span>}
        </button>

        <button 
          onClick={toggleAi}
          className="flex flex-col items-center justify-center w-full h-full -mt-7 touch-target focus-ring group"
          aria-label="Ask AI Expert"
        >
          <div className="bg-masuma-dark group-hover:bg-masuma-orange text-white p-3.5 rounded-2xl shadow-xl border-4 border-white active:scale-90 transition-all duration-300">
            <Bot size={22} className="group-hover:rotate-12 transition-transform" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest mt-1 text-masuma-dark font-display">AI Expert</span>
        </button>

        <button 
          onClick={toggleCart}
          className="flex flex-col items-center justify-center w-full h-full space-y-1 text-gray-400 hover:text-gray-700 relative touch-target focus-ring active:scale-95"
          aria-label={`Shopping cart with ${cartCount} items`}
        >
          <div className="relative">
            <ShoppingCart size={20} strokeWidth={cartCount > 0 ? 2.5 : 2} className={cartCount > 0 ? 'text-masuma-dark' : ''} />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2.5 bg-masuma-orange text-white text-[9px] font-black rounded-full h-4.5 w-4.5 min-w-[18px] px-1 flex items-center justify-center shadow-md animate-scale-up">
                {cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] uppercase tracking-tight font-display">Cart</span>
        </button>

        <button 
          onClick={() => handleNav('LOGIN')}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all touch-target focus-ring active:scale-95 ${currentView === 'LOGIN' ? 'text-masuma-orange font-bold' : 'text-gray-400 hover:text-gray-700'}`}
          aria-label="My Account"
          aria-current={currentView === 'LOGIN' ? 'page' : undefined}
        >
          <User size={20} strokeWidth={currentView === 'LOGIN' ? 2.5 : 2} />
          <span className="text-[10px] uppercase tracking-tight font-display">Account</span>
          {currentView === 'LOGIN' && <span className="w-1.5 h-1.5 bg-masuma-orange rounded-full -mt-0.5"></span>}
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
