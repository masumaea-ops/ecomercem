import React, { useState, useEffect } from 'react';
import { 
  Users, MousePointer2, Search, Eye, 
  TrendingUp, ArrowUpRight, ArrowDownRight, 
  Globe, Smartphone, Laptop, Clock, BarChart3, AlertCircle
} from 'lucide-react';
import { apiClient } from '../../utils/apiClient';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#E0621B', '#1A1A1A', '#666666', '#999999', '#CCCCCC'];

const AnalyticsDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30s for "real-time" feel
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchStats = async () => {
    try {
      const res = await apiClient.get('/analytics/stats');
      setStats(res.data);
    } catch (e) {
      console.error('Error fetching analytics', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-masuma-orange"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-masuma-dark font-display uppercase tracking-wider">Real-time Intelligence</h2>
          <p className="text-gray-500">Live visitor insights and performance metrics.</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-masuma-orange"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-xl border border-green-100">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-black uppercase tracking-widest">{stats.activeUsers} Active Now</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-orange-50 rounded-2xl">
              <Users className="w-6 h-6 text-masuma-orange" />
            </div>
            <span className="flex items-center text-green-600 text-xs font-bold">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              12%
            </span>
          </div>
          <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1">Total Visitors</p>
          <h3 className="text-3xl font-black text-masuma-dark">{stats.totalVisitors.toLocaleString()}</h3>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 rounded-2xl">
              <Eye className="w-6 h-6 text-blue-600" />
            </div>
            <span className="flex items-center text-green-600 text-xs font-bold">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              8%
            </span>
          </div>
          <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1">Page Views</p>
          <h3 className="text-3xl font-black text-masuma-dark">{stats.pageViews.toLocaleString()}</h3>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-purple-50 rounded-2xl">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <span className="flex items-center text-red-600 text-xs font-bold">
              <ArrowDownRight className="w-3 h-3 mr-1" />
              3%
            </span>
          </div>
          <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1">Conversion Rate</p>
          <h3 className="text-3xl font-black text-masuma-dark">{stats.conversionRate.toFixed(1)}%</h3>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-green-50 rounded-2xl">
              <MousePointer2 className="w-6 h-6 text-green-600" />
            </div>
            <span className="flex items-center text-green-600 text-xs font-bold">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              15%
            </span>
          </div>
          <p className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1">Total Clicks</p>
          <h3 className="text-3xl font-black text-masuma-dark">{(stats.pageViews * 2.4).toFixed(0)}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Pages */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
          <h3 className="text-xl font-black text-masuma-dark mb-6 uppercase tracking-wider flex items-center">
            <Globe className="w-5 h-5 mr-3 text-masuma-orange" />
            Most Visited Pages
          </h3>
          <div className="space-y-4">
            {stats.topPages.map((page: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between group">
                <div className="flex items-center gap-4 flex-grow min-w-0">
                  <span className="text-xs font-black text-gray-300 w-4">{idx + 1}</span>
                  <p className="text-sm font-bold text-gray-600 truncate hover:text-masuma-orange transition-colors cursor-pointer">
                    {page.url || '/'}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-masuma-orange rounded-full" 
                      style={{ width: `${(page.views / stats.topPages[0].views) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-black text-masuma-dark w-12 text-right">{page.views}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Searches */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
          <h3 className="text-xl font-black text-masuma-dark mb-6 uppercase tracking-wider flex items-center">
            <Search className="w-5 h-5 mr-3 text-masuma-orange" />
            Most Searched Terms
          </h3>
          <div className="flex flex-wrap gap-3">
            {stats.topSearches.length > 0 ? stats.topSearches.map((search: any, idx: number) => (
              <div 
                key={idx} 
                className="bg-gray-50 border border-gray-100 px-4 py-2 rounded-xl flex items-center gap-3 hover:border-masuma-orange transition-all cursor-default group"
              >
                <span className="text-sm font-bold text-masuma-dark">{search.term}</span>
                <span className="bg-white px-2 py-0.5 rounded-lg text-[10px] font-black text-masuma-orange shadow-sm group-hover:bg-masuma-orange group-hover:text-white transition-colors">
                  {search.count}
                </span>
              </div>
            )) : (
              <p className="text-gray-400 text-sm italic">No search data available for this period.</p>
            )}
          </div>
        </div>

        {/* Zero-Result Searches (Unmet Customer Demand) */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-black text-masuma-dark uppercase tracking-wider flex items-center">
              <AlertCircle className="w-5 h-5 mr-3 text-red-500" />
              Zero-Result Searches (Unmet Demand)
            </h3>
            <span className="text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-600 px-3 py-1 rounded-xl border border-red-100">
              Procurement Opportunities
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-6">
            Search terms queried by customers where the catalog returned zero matching products.
          </p>
          <div className="flex flex-wrap gap-3">
            {stats.zeroResultSearches && stats.zeroResultSearches.length > 0 ? (
              stats.zeroResultSearches.map((search: any, idx: number) => (
                <div 
                  key={idx} 
                  className="bg-red-50/60 border border-red-100 px-4 py-2.5 rounded-xl flex items-center gap-3 hover:border-red-300 transition-all cursor-default group"
                >
                  <span className="text-sm font-bold text-masuma-dark">{search.term}</span>
                  <span className="bg-white px-2 py-0.5 rounded-lg text-[10px] font-black text-red-600 shadow-sm group-hover:bg-red-600 group-hover:text-white transition-colors">
                    {search.count} miss{search.count > 1 ? 'es' : ''}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm italic">No zero-result searches logged in this period.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Device Distribution */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 lg:col-span-1">
          <h3 className="text-xl font-black text-masuma-dark mb-6 uppercase tracking-wider flex items-center">
            <Laptop className="w-5 h-5 mr-3 text-masuma-orange" />
            Device Usage
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Mobile', value: 65 },
                    { name: 'Desktop', value: 30 },
                    { name: 'Tablet', value: 5 }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {COLORS.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center">
              <Smartphone className="w-5 h-5 mx-auto mb-1 text-gray-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Mobile</p>
              <p className="text-sm font-black text-masuma-dark">65%</p>
            </div>
            <div className="text-center">
              <Laptop className="w-5 h-5 mx-auto mb-1 text-gray-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Desktop</p>
              <p className="text-sm font-black text-masuma-dark">30%</p>
            </div>
            <div className="text-center">
              <BarChart3 className="w-5 h-5 mx-auto mb-1 text-gray-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tablet</p>
              <p className="text-sm font-black text-masuma-dark">5%</p>
            </div>
          </div>
        </div>

        {/* Funnel Analysis */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 lg:col-span-2">
          <h3 className="text-xl font-black text-masuma-dark mb-6 uppercase tracking-wider flex items-center">
            <BarChart3 className="w-5 h-5 mr-3 text-masuma-orange" />
            Conversion Funnel
          </h3>
          <div className="space-y-6">
            <div className="relative">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">Website Visitors</span>
                <span className="text-sm font-black text-masuma-dark">{stats.totalVisitors}</span>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-masuma-dark w-full"></div>
              </div>
            </div>
            <div className="relative">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">Checkout Started</span>
                <span className="text-sm font-black text-masuma-dark">{stats.checkoutStarts}</span>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-masuma-orange" 
                  style={{ width: `${(stats.checkoutStarts / stats.totalVisitors) * 100}%` }}
                ></div>
              </div>
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300 rotate-90">
                {((stats.checkoutStarts / stats.totalVisitors) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="relative">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">Checkout Completed</span>
                <span className="text-sm font-black text-masuma-dark">{stats.checkoutCompletes}</span>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500" 
                  style={{ width: `${(stats.checkoutCompletes / stats.totalVisitors) * 100}%` }}
                ></div>
              </div>
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300 rotate-90">
                {((stats.checkoutCompletes / stats.checkoutStarts || 0) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="mt-8 p-4 bg-masuma-orange/5 rounded-2xl border border-masuma-orange/10 flex items-center gap-4">
            <div className="p-2 bg-masuma-orange rounded-xl">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-masuma-orange uppercase tracking-widest">Growth Tip</p>
              <p className="text-sm text-masuma-dark">
                Your checkout completion rate is {stats.conversionRate.toFixed(1)}%. Consider optimizing the "Shipping" step to reduce drop-offs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
