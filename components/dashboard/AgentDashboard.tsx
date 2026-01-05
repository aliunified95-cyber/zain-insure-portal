
import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  FunnelChart, Funnel, LabelList, PieChart, Pie, Cell
} from 'recharts';
import { 
  Clock, DollarSign, TrendingUp, FileCheck, ChevronRight, Activity, 
  Filter, BarChart2, Database, Layers, TrendingDown, Calendar, 
  ArrowUpRight, ArrowDownRight, Target, Award, Zap, Eye, EyeOff
} from 'lucide-react';
import { 
  getDashboardStats, getSalesChartData, getRecentActivity, getPendingActions, 
  getSalesFunnelData, testFirebaseConnection
} from '../../services/mockApi';
import { UserRole } from '../../types';

interface AgentDashboardProps {
  onNavigateToQuote: (quoteId?: string, referralData?: any) => void;
  userRole?: UserRole;
  currentUserId?: string; // Agent ID for filtering
  currentUserName?: string; // Agent name for display
}

type Period = 'MTD' | 'THIS_MONTH' | 'LAST_MONTH' | 'YTD';

const ComparisonMetricCard = ({ title, value, previousValue, prefix = '', suffix = '', icon: Icon }: any) => {
    const growth = previousValue > 0 ? ((value - previousValue) / previousValue) * 100 : 0;
    const isPositive = growth >= 0;

    return (
        <Card className="hover:shadow-2xl transition-all duration-300 border-2 hover:border-zain-300 group">
          <CardBody className="p-4">
            <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl shadow-lg transition-transform group-hover:scale-110 ${isPositive ? 'bg-gradient-to-br from-zain-50 to-zain-100 text-zain-600' : 'bg-gradient-to-br from-red-50 to-red-100 text-red-600'}`}>
                    <Icon className="w-6 h-6" />
                </div>
                <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full shadow-md ${isPositive ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800' : 'bg-gradient-to-r from-red-100 to-red-200 text-red-800'}`}>
                    {isPositive ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                    {Math.abs(growth).toFixed(1)}%
                </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-1">{title}</p>
              <h3 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">{prefix}{value.toLocaleString()}{suffix}</h3>
              <p className="text-xs text-gray-500 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  vs {prefix}{previousValue.toLocaleString()}{suffix} <span className="hidden sm:inline ml-1">prev. period</span>
              </p>
            </div>
          </CardBody>
        </Card>
    );
};

const QuickStatBadge = ({ icon: Icon, label, value, color = 'zain' }: any) => {
    const colorMap: any = {
        zain: 'bg-gradient-to-br from-zain-50 to-zain-100 text-zain-700 border-zain-300',
        green: 'bg-gradient-to-br from-green-50 to-green-100 text-green-700 border-green-300',
        blue: 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 border-blue-300',
        amber: 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-700 border-amber-300'
    };

    return (
        <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 ${colorMap[color]} shadow-md hover:shadow-lg transition-all hover:scale-[1.02]`}>
            <Icon className="w-6 h-6" />
            <div>
                <p className="text-xs font-semibold opacity-80">{label}</p>
                <p className="text-xl font-bold">{value}</p>
            </div>
        </div>
    );
};

export const AgentDashboard: React.FC<AgentDashboardProps> = ({ 
    onNavigateToQuote, 
    userRole = 'JUNIOR_AGENT',
    currentUserId = '2',
    currentUserName = 'Ahmed Al-Salem'
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('MTD');
  const [partnerFilter, setPartnerFilter] = useState<string>('ALL');
  const [showManagerView, setShowManagerView] = useState(false); // Toggle for agents to see team view
  
  // Database Status State
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [dbMessage, setDbMessage] = useState('');

  // Check DB on mount
  useEffect(() => {
    const checkDb = async () => {
        const result = await testFirebaseConnection();
        setDbStatus(result.success ? 'connected' : 'error');
        setDbMessage(result.message);
    };
    checkDb();
  }, []);

  // Determine if user is a manager (SUPERVISOR or higher)
  const isManager = userRole === 'SUPERVISOR' || userRole === 'DEVELOPER' || userRole === 'CREDIT_CONTROL';
  
  // Agent can optionally view team stats, but defaults to their own
  const viewAsManager = isManager || showManagerView;

  // Fetch stats based on selected period
  const statsResponse = getDashboardStats(selectedPeriod, viewAsManager ? undefined : currentUserId);
  const chartData = getSalesChartData(selectedPeriod);
  const activities = getRecentActivity(viewAsManager ? undefined : currentUserId);
  const pendingActions = getPendingActions(viewAsManager ? undefined : currentUserId);
  const funnelData = getSalesFunnelData();

  // Apply Partner Filter (Simple Simulation)
  const multiplier = partnerFilter === 'ALL' ? 1 : 0.4;
  const current = {
      totalPremium: Math.round(statsResponse.current.totalPremium * multiplier),
      policiesIssued: Math.round(statsResponse.current.policiesIssued * multiplier),
      expiringPolicies: Math.round(statsResponse.current.expiringPolicies * multiplier),
      avgPremium: statsResponse.current.policiesIssued > 0 ? Math.round(statsResponse.current.totalPremium / statsResponse.current.policiesIssued) : 0
  };
  const previous = {
      totalPremium: Math.round(statsResponse.previous.totalPremium * multiplier),
      policiesIssued: Math.round(statsResponse.previous.policiesIssued * multiplier),
      expiringPolicies: Math.round(statsResponse.previous.expiringPolicies * multiplier),
      avgPremium: statsResponse.previous.policiesIssued > 0 ? Math.round(statsResponse.previous.totalPremium / statsResponse.previous.policiesIssued) : 0
  };

  const periodLabels = {
      'MTD': 'Month to Date',
      'THIS_MONTH': 'This Month',
      'LAST_MONTH': 'Last Month',
      'YTD': 'Year to Date'
  };

  const comparisonLabels = {
      'MTD': 'vs Same Days Last Month',
      'THIS_MONTH': 'vs Last Month',
      'LAST_MONTH': 'vs Month Before',
      'YTD': 'vs Last Year'
  };

  // Portfolio mix data for pie chart
  const portfolioData = [
      { name: 'Motor', value: 65, color: '#7c3aed' },
      { name: 'Travel', value: 20, color: '#3b82f6' },
      { name: 'Health', value: 10, color: '#10b981' },
      { name: 'Others', value: 5, color: '#f59e0b' }
  ];

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section with Enhanced Role Badge */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
           <div className="flex items-center gap-3 mb-2">
               <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
               {viewAsManager ? (
                   <span className="text-xs bg-gradient-to-r from-zain-600 to-purple-600 text-white px-3 py-1.5 rounded-full font-bold uppercase tracking-wide shadow-md">
                       Manager View
                   </span>
               ) : (
                   <span className="text-xs bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-3 py-1.5 rounded-full font-bold uppercase tracking-wide shadow-md">
                       My Performance
                   </span>
               )}
           </div>
           <div className="flex items-center gap-3 mt-2">
               <p className="text-sm text-gray-500">
                   Overview for <strong>{periodLabels[selectedPeriod]}</strong>
                   {!viewAsManager && <span className="ml-2 text-gray-400">• {currentUserName}</span>}
               </p>
               
               {/* Database Status Indicator */}
               <div 
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border cursor-help uppercase tracking-wider ${
                      dbStatus === 'checking' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                      dbStatus === 'connected' ? 'bg-green-50 text-green-700 border-green-200' :
                      'bg-red-50 text-red-700 border-red-200'
                  }`}
                  title={`Firestore Status: ${dbMessage}`}
               >
                  <Database className="w-3 h-3" />
                  {dbStatus === 'checking' ? 'Conn...' : dbStatus === 'connected' ? 'Live' : 'Offline'}
               </div>
           </div>
        </div>
        
        {/* Advanced Filters */}
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
             {/* Period Selector */}
             <div className="flex bg-white p-1.5 rounded-xl border-2 border-gray-200 shadow-sm">
                {(Object.keys(periodLabels) as Period[]).map((period) => (
                    <button
                        key={period}
                        onClick={() => setSelectedPeriod(period)}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                            selectedPeriod === period 
                            ? 'bg-gradient-to-r from-zain-600 to-zain-700 text-white shadow-md' 
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        {period === 'THIS_MONTH' ? 'Month' : period === 'LAST_MONTH' ? 'Last Month' : period}
                    </button>
                ))}
             </div>

             {/* Partner Selector */}
             <div className="relative bg-white rounded-xl border-2 border-gray-200 shadow-sm">
                 <select 
                    value={partnerFilter} 
                    onChange={(e) => setPartnerFilter(e.target.value)} 
                    className="h-full pl-4 pr-8 py-2 text-xs font-bold bg-transparent border-none text-gray-700 focus:ring-0 cursor-pointer hover:bg-gray-50 rounded-xl"
                    aria-label="Select partner filter"
                 >
                    <option value="ALL">All Partners</option>
                    <option value="GIG">GIG</option>
                    <option value="SNIC">SNIC</option>
                 </select>
             </div>

             {/* View Toggle for Agents */}
             {!isManager && (
                 <button
                     onClick={() => setShowManagerView(!showManagerView)}
                     className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
                     title="Toggle between your stats and team stats"
                 >
                     {showManagerView ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                     {showManagerView ? 'Team View' : 'My View'}
                 </button>
             )}
        </div>
      </div>

      {/* Quick Stats Badges */}
      {!viewAsManager && (
          <div className="flex flex-wrap gap-3">
              <QuickStatBadge icon={Target} label="Daily Target" value="BHD 1,200" color="zain" />
              <QuickStatBadge icon={Award} label="Rank" value="#2 This Month" color="amber" />
              <QuickStatBadge icon={Zap} label="Conversion" value="32%" color="green" />
          </div>
      )}

      {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ComparisonMetricCard 
            title="Total Premium" 
            value={current.totalPremium} 
            previousValue={previous.totalPremium} 
            prefix="BHD "
            icon={DollarSign}
        />
        <ComparisonMetricCard 
            title="Policies Sales" 
            value={current.policiesIssued} 
            previousValue={previous.policiesIssued} 
            icon={FileCheck}
        />
        <ComparisonMetricCard 
            title="Avg. Premium" 
            value={current.avgPremium} 
            previousValue={previous.avgPremium} 
            prefix="BHD "
            suffix="/policy"
            icon={Layers}
        />
        <ComparisonMetricCard 
            title="Expiring Soon" 
            value={current.expiringPolicies} 
            previousValue={previous.expiringPolicies} 
            icon={Clock}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Comparison Chart */}
        <Card className="lg:col-span-2 min-h-[400px] border-2 hover:shadow-lg transition-all">
          <CardHeader className="flex justify-between items-center border-b pb-4">
              <div>
                  <h3 className="text-xl font-bold text-gray-900">Performance Trend</h3>
                  <p className="text-xs text-gray-500 mt-1">Comparing Current vs Previous Period</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-zain-500 to-purple-500"></div>
                      <span className="text-gray-600 font-semibold">Current</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                      <span className="text-gray-400 font-semibold">Previous</span>
                  </div>
              </div>
          </CardHeader>
          <CardBody className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 11, fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 11, fontWeight: 600}} />
                <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 600 }}
                    itemStyle={{ fontSize: '13px', fontWeight: 700 }}
                />
                <Area 
                    type="monotone" 
                    dataKey="current" 
                    name="Current Period"
                    stroke="#7c3aed" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorCurrent)" 
                />
                <Area 
                    type="monotone" 
                    dataKey="previous" 
                    name="Previous Period"
                    stroke="#d1d5db" 
                    strokeWidth={2} 
                    strokeDasharray="5 5"
                    fill="transparent" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        {/* Sales Funnel Chart */}
        <Card className="min-h-[400px] border-2 hover:shadow-lg transition-all">
          <CardHeader className="border-b pb-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <BarChart2 className="w-6 h-6 mr-2 text-zain-600" /> Conversion Funnel
            </h3>
            <p className="text-xs text-gray-500 mt-1">Lead to Policy Journey</p>
          </CardHeader>
          <CardBody className="h-[340px]">
             <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                    <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 600 }}
                    />
                    <Funnel
                        dataKey="value"
                        data={funnelData}
                        isAnimationActive
                    >
                        <LabelList position="right" fill="#374151" stroke="none" dataKey="name" style={{ fontWeight: 600 }} />
                    </Funnel>
                </FunnelChart>
             </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Pending Actions */}
         <Card className="border-2 hover:shadow-lg transition-all">
            <CardHeader className="border-b pb-4">
                <h3 className="text-xl font-bold text-gray-900">Pending Actions</h3>
                <p className="text-xs text-gray-500 mt-1">Items requiring your attention</p>
            </CardHeader>
            <CardBody className="pt-0">
                {pendingActions.length > 0 ? (
                    <div className="space-y-3 mt-4">
                        {pendingActions.map((action) => (
                            <div key={action.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-zain-50 hover:to-purple-50 cursor-pointer transition-all border border-gray-200 hover:border-zain-300 hover:shadow-md">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">{action.customer}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{action.action} • {action.time}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-12 text-center">
                        <FileCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm font-medium">No pending actions</p>
                        <p className="text-gray-300 text-xs mt-1">You're all caught up!</p>
                    </div>
                )}
            </CardBody>
         </Card>

         {/* Activity Feed */}
         <Card className="border-2 hover:shadow-lg transition-all">
            <CardHeader className="border-b pb-4">
                <h3 className="text-xl font-bold text-gray-900">Live Feed</h3>
                <p className="text-xs text-gray-500 mt-1">Recent activity across the platform</p>
            </CardHeader>
            <CardBody className="pt-0">
                <div className="relative pl-6 border-l-2 border-gray-200 space-y-6 mt-4">
                    {activities.map((item, index) => (
                        <div key={item.id} className="relative">
                            <div className={`absolute -left-[29px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-md ${
                                index === 0 ? 'bg-gradient-to-r from-zain-500 to-purple-500' : 'bg-zain-400'
                            }`}></div>
                            <p className="text-sm text-gray-800 font-semibold">{item.message}</p>
                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {item.time}
                            </p>
                        </div>
                    ))}
                </div>
            </CardBody>
         </Card>
      </div>
    </div>
  );
};
