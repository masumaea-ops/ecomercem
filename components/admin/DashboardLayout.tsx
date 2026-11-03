import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, ShoppingCart, Package, History, 
  Smartphone, Users, FileText, Truck, GraduationCap, Car,
  BarChart3, Briefcase, Settings, LogOut, Menu, X, Bell, Edit, FileBarChart, Shield, Globe, Building, Tag, DollarSign, Mail, Ticket, RefreshCcw, ShieldAlert, Ship, FileSpreadsheet, Database
} from 'lucide-react';
import NotificationsPopover from './NotificationsPopover';
import SEO from '../SEO';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeModule: string;
  onNavigate: (module: string) => void;
  onLogout: () => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, activeModule, onNavigate, onLogout }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [user, setUser] = useState<any>({ name: 'User', role: 'CASHIER', branch: { name: 'Loading...' } });

  useEffect(() => {
      const storedUser = localStorage.getItem('masuma_user');
      if (storedUser) {
          setUser(JSON.parse(storedUser));
      }
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER'] },
    { id: 'finance', label: 'Finance & Profit', icon: DollarSign, roles: ['ADMIN', 'MANAGER'] },
    { id: 'pos', label: 'Point of Sale', icon: ShoppingCart, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { id: 'products', label: 'Product Manager', icon: Package, roles: ['ADMIN', 'MANAGER'] },
    { id: 'promos', label: 'Promo Codes', icon: Ticket, roles: ['ADMIN', 'MANAGER'] },
    { id: 'categories', label: 'Categories', icon: Tag, roles: ['ADMIN', 'MANAGER'] },
    { id: 'inventory', label: 'Inventory', icon: Package, roles: ['ADMIN', 'MANAGER'] },
    { id: 'branches', label: 'Branches', icon: Building, roles: ['ADMIN'] },
    { id: 'orders', label: 'Orders', icon: FileText, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { id: 'shipping', label: 'Logistics', icon: Truck, roles: ['ADMIN', 'MANAGER'] },
    { id: 'quotes', label: 'Quotations', icon: FileText, roles: ['ADMIN', 'MANAGER'] },
    { id: 'b2b', label: 'B2B Portal', icon: Briefcase, roles: ['ADMIN', 'MANAGER', 'B2B_USER'] },
    { id: 'sales_history', label: 'Sales History', icon: History, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { id: 'mpesa', label: 'M-Pesa Logs', icon: Smartphone, roles: ['ADMIN', 'MANAGER'] },
    { id: 'customers', label: 'Customers (CRM)', icon: Users, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { id: 'subscribers', label: 'Newsletter', icon: Mail, roles: ['ADMIN', 'MANAGER'] },
    { id: 'reports', label: 'Reports', icon: FileBarChart, roles: ['ADMIN', 'MANAGER'] },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['ADMIN'] },
    { id: 'returns_admin', label: 'Returns & Claims', icon: RefreshCcw, roles: ['ADMIN', 'MANAGER'] },
    { id: 'marketplace_admin', label: 'Marketplace Mgr', icon: Car, roles: ['ADMIN', 'MANAGER'] },
    { id: 'fraud_admin', label: 'Fraud & Safety', icon: ShieldAlert, roles: ['ADMIN', 'MANAGER'] },
    { id: 'import_admin', label: 'Import Requests', icon: Ship, roles: ['ADMIN', 'MANAGER'] },
    { id: 'crsp_admin', label: 'CRSP Data (Excel)', icon: FileSpreadsheet, roles: ['ADMIN'] },
    { id: 'import_settings', label: 'Import Rules', icon: Settings, roles: ['ADMIN'] },
    { id: 'users', label: 'User Management', icon: Users, roles: ['ADMIN'] },
    { id: 'audit', label: 'Audit Logs', icon: Shield, roles: ['ADMIN'] },
    { id: 'blog', label: 'Blog Studio', icon: Edit, roles: ['ADMIN', 'MANAGER'] },
    { id: 'cms', label: 'CMS Editor', icon: Globe, roles: ['ADMIN'] },
    { id: 'backup', label: 'Database Backup', icon: Database, roles: ['ADMIN'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['ADMIN'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <SEO 
        title="Admin Dashboard" 
        description="Masuma ERP Management Console." 
        noindex={true}
      />
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-masuma-dark text-white transition-all duration-300 flex flex-col flex-shrink-0`}>
        <div className="h-16 flex items-center justify-center border-b border-gray-800">
          {isSidebarOpen ? (
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-masuma-orange rounded-sm flex items-center justify-center shrink-0">
                    <span className="font-display font-bold text-xl text-black">M</span>
                </div>
                <div className="flex flex-col">
                    <span className="font-display font-bold text-xl tracking-wider text-white">MASUMA</span>
                    <span className="text-[8px] text-gray-400 tracking-widest uppercase">E.A. LIMITED</span>
                </div>
             </div>
          ) : (
             <div className="w-10 h-10 bg-masuma-orange rounded-sm flex items-center justify-center">
                <span className="font-display font-bold text-2xl text-black">M</span>
             </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-1 scrollbar-hide">
          {filteredMenu.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center px-4 py-3 transition-colors ${
                activeModule === item.id 
                  ? 'bg-masuma-orange text-white border-r-4 border-white' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              }`}
              title={!isSidebarOpen ? item.label : ''}
            >
              <item.icon size={20} className="flex-shrink-0" />
              {isSidebarOpen && (
                <span className="ml-3 text-sm font-medium tracking-wide">{item.label}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-gray-800 space-y-1">
          <button 
            onClick={() => onNavigate('return_to_store')} 
            className="w-full flex items-center px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-masuma-orange hover:bg-white/5 hover:text-white transition-all rounded-xl"
            title="Return to Shop Storefront"
          >
            <Globe size={18} className="shrink-0" />
            {isSidebarOpen && <span className="ml-3">Return to Shop</span>}
          </button>
          
          <button 
            onClick={() => onNavigate('return_to_calculator')} 
            className="w-full flex items-center px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-yellow-500 hover:bg-white/5 hover:text-white transition-all rounded-xl"
            title="Return to Import Duty Calculator"
          >
            <Car size={18} className="shrink-0" />
            {isSidebarOpen && <span className="ml-3">Duty Calculator</span>}
          </button>

          <button 
            onClick={onLogout} 
            className="w-full flex items-center px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all rounded-xl mt-2 border border-gray-850"
          >
            <LogOut size={18} className="shrink-0" />
            {isSidebarOpen && <span className="ml-3">Logout</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white shadow-sm border-b border-gray-200 flex items-center justify-between px-6 relative z-40">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-gray-500 hover:text-masuma-orange">
            <Menu size={24} />
          </button>
          <div className="flex items-center space-x-6">
            <div className="relative">
               <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="relative cursor-pointer focus:outline-none">
                   <Bell size={20} className="text-gray-500 hover:text-masuma-orange transition" />
                   <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
               </button>
               <NotificationsPopover isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} onNavigate={onNavigate} />
            </div>
            <button onClick={() => onNavigate('profile')} className="w-8 h-8 bg-masuma-orange rounded-full flex items-center justify-center text-white font-bold text-xs uppercase shadow-md">
              {user.name ? user.name.charAt(0) : 'U'}
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;