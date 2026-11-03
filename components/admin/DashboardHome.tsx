
import React, { useEffect, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { ShoppingCart, Users, TrendingUp, AlertTriangle, Loader2, Activity, Clock, Plane, DollarSign } from 'lucide-react';
import { apiClient, formatCurrency } from '../../utils/apiClient';
import { DashboardStats } from '../../types';

const COLORS = ['#E0621B', '#1A1A1A', '#F59E0B', '#10B981', '#6366F1', '#EC4899'];

interface DashboardHomeProps {
    onNavigate: (module: string) => void;
}

const DashboardHome: React.FC<DashboardHomeProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<any>(null);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sourcingCount, setSourcingCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, logsRes, quotesRes] = await Promise.all([
            apiClient.get('/admin/stats'),
            apiClient.get('/audit-logs'),
            apiClient.get('/quotes')
        ]);

        setStats(statsRes.data);
        setActivityLog(logsRes.data.slice(0, 6));
        
        const quotes = Array.isArray(quotesRes.data) ? quotesRes.data : [];
        const sourcing = quotes.filter((q: any) => q.type === 'SOURCING' && q.status === 'DRAFT').length;
        setSourcingCount(sourcing);

      } catch (err) {
        console.error("Dashboard refresh error", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Faster polling for dashboard
    return () => clearInterval(interval);
  }, []);

  if (isLoading && !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3 text-masuma-dark">
          <Loader2 size={40} className="animate-spin text-masuma-orange" />
          <p className="text-sm font-bold uppercase tracking-widest">Compiling System Data...</p>
        </div>
      </div>
    );
  }

  const lineData = stats?.monthlyRevenue?.length ? stats.monthlyRevenue : [{ name: 'No Data', value: 0 }];
  const pieData = stats?.categorySales?.length ? stats.categorySales : [{ name: 'No Data', value: 1 }];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-masuma-dark font-display uppercase">Executive Overview</h2>
        <div className="flex items-center gap-4">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest bg-white px-3 py-1 border rounded shadow-sm">
                System Status: <span className="text-green-600">Syncing Live</span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Revenue', value: formatCurrency(stats?.totalSales || 0), icon: TrendingUp, color: 'bg-green-600', subLabel: 'All Time Earnings', link: 'sales_history' },
          { label: 'Revenue Today', value: formatCurrency(stats?.todayRevenue || 0), icon: DollarSign, color: 'bg-emerald-500', subLabel: 'Cash Realized', link: 'sales_history' },
          { label: 'Activity Today', value: stats?.todaysOrders || 0, icon: ShoppingCart, color: 'bg-blue-600', subLabel: 'Sales + Invoices', link: 'orders' },
          { label: 'Low Stock', value: stats?.lowStockItems || 0, icon: AlertTriangle, color: 'bg-red-500', subLabel: 'Restock Required', link: 'inventory' },
          { label: 'Pending Users', value: stats?.pendingUsers || 0, icon: Users, color: 'bg-orange-600', subLabel: 'New Registrations', link: 'users' },
        ].map((stat, i) => (
          <div 
            key={i} 
            onClick={() => onNavigate(stat.link)}
            className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 transition hover:shadow-md cursor-pointer hover:border-masuma-orange group"
          >
            <div className="flex justify-between items-start mb-3">
              <div className={`p-2 rounded-lg text-white shadow-sm transition-transform group-hover:scale-110 ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                {stat.subLabel}
              </span>
            </div>
            <div>
              <div className="text-xl font-bold text-masuma-dark tracking-tight truncate">{stat.value}</div>
              <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wide mt-1">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-masuma-dark uppercase tracking-wide">Revenue Trend (6 Months)</h3>
            <span className="text-[10px] text-gray-400 font-bold uppercase">Base Currency: KES</span>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9CA3AF'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9CA3AF'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '4px', border: 'none', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', fontSize: '12px' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Line type="monotone" dataKey="value" stroke="#E0621B" strokeWidth={3} dot={{r: 4, fill: '#E0621B', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
           <h3 className="text-lg font-bold text-masuma-dark mb-6 uppercase tracking-wide">Inventory Breakdown</h3>
           <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '4px', border: 'none', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', fontSize: '11px' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-masuma-dark uppercase tracking-wide flex items-center gap-2">
                  <Activity size={20} className="text-masuma-orange" /> Real-time Audit Trail
              </h3>
              <button onClick={() => onNavigate('audit')} className="text-[10px] font-bold uppercase text-masuma-orange hover:underline">View All Logs</button>
          </div>
          <div className="divide-y divide-gray-50">
              {activityLog.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">Waiting for system events...</div>
              ) : (
                  activityLog.map((log, i) => (
                      <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                          <div className="flex items-center gap-4">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shadow-inner ${
                                  log.type === 'error' ? 'bg-red-100 text-red-600' : 
                                  log.type === 'warning' ? 'bg-orange-100 text-orange-600' : 'bg-masuma-dark text-white'
                              }`}>
                                  {log.user.charAt(0)}
                              </div>
                              <div>
                                  <p className="text-xs font-bold text-gray-800">{log.action.replace(/_/g, ' ')}</p>
                                  <p className="text-[10px] text-gray-500">{log.detail}</p>
                              </div>
                          </div>
                          <div className="text-right">
                              <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                  <Clock size={10} /> {log.time}
                              </div>
                              <div className="text-[9px] font-bold text-gray-300 uppercase tracking-widest mt-0.5">{log.user}</div>
                          </div>
                      </div>
                  ))
              )}
          </div>
      </div>
    </div>
  );
};

export default DashboardHome;
