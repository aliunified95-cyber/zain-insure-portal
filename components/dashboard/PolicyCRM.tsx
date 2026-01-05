
import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { 
  Users, 
  Filter, 
  BarChart2, 
  Award,
  Calendar,
  Layers,
  Briefcase,
  TrendingUp,
  Target,
  Search,
  Edit,
  MessageCircle,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  AlertCircle,
  Download
} from 'lucide-react';
import { getTopAgents, getAllQuotes, sendWhatsAppReminder } from '../../services/mockApi';
import { QuoteRequest, QuoteStatus, QuoteSource } from '../../types';
import { EditQuoteModal } from './EditQuoteModal';

interface PolicyCRMProps {
  timeFilter: 'WEEK' | 'MONTH' | 'QUARTER';
  partnerFilter: string;
  agentId?: string; // If provided, show only this agent's performance
  isManagerView?: boolean;
  onNavigateToQuote?: (quoteId: string) => void;
}

export const PolicyCRM: React.FC<PolicyCRMProps> = ({ 
    timeFilter, 
    partnerFilter, 
    agentId,
    isManagerView = true,
    onNavigateToQuote
}) => {
  const topAgents = getTopAgents();
  const [activeTab, setActiveTab] = useState<'all' | 'agent' | 'customer'>('all');
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<QuoteRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  // Load quotes on mount
  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    setLoading(true);
    try {
      const allQuotes = await getAllQuotes();
      setQuotes(allQuotes);
    } catch (error) {
      console.error('Failed to load quotes:', error);
    }
    setLoading(false);
  };

  // Filter quotes based on active tab, status filter, and search
  useEffect(() => {
    let filtered = [...quotes];

    // Tab filtering
    if (activeTab === 'agent') {
      filtered = filtered.filter(q => q.source === QuoteSource.AGENT_PORTAL);
    } else if (activeTab === 'customer') {
      filtered = filtered.filter(q => q.source === QuoteSource.CUSTOMER_PORTAL);
    }

    // Status filtering
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(q => q.status === statusFilter);
    }

    // Search filtering
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(q => 
        q.customer.fullName.toLowerCase().includes(term) ||
        q.customer.mobile.includes(term) ||
        q.quoteReference?.toLowerCase().includes(term) ||
        q.customer.cpr.includes(term)
      );
    }

    // Agent filtering if needed
    if (agentId && !isManagerView) {
      filtered = filtered.filter(q => q.agentId === agentId);
    }

    setFilteredQuotes(filtered);
  }, [quotes, activeTab, statusFilter, searchTerm, agentId, isManagerView]);

  const handleSendReminder = async (quote: QuoteRequest) => {
    setSendingReminder(quote.id);
    try {
      await sendWhatsAppReminder(quote.id);
      alert(`WhatsApp reminder sent to ${quote.customer.fullName}`);
      await loadQuotes(); // Reload to update reminder count
    } catch (error) {
      alert('Failed to send reminder');
    }
    setSendingReminder(null);
  };

  const getStatusBadge = (status: QuoteStatus) => {
    const statusConfig: Record<QuoteStatus, { color: string; label: string; icon: any }> = {
      [QuoteStatus.DRAFT]: { color: 'bg-gray-100 text-gray-700', label: 'Draft', icon: Clock },
      [QuoteStatus.PENDING_APPROVAL]: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending', icon: AlertCircle },
      [QuoteStatus.APPROVAL_GRANTED]: { color: 'bg-green-100 text-green-700', label: 'Approved', icon: CheckCircle },
      [QuoteStatus.APPROVAL_REJECTED]: { color: 'bg-red-100 text-red-700', label: 'Rejected', icon: XCircle },
      [QuoteStatus.LINK_SENT]: { color: 'bg-blue-100 text-blue-700', label: 'Link Sent', icon: Send },
      [QuoteStatus.LINK_CLICKED]: { color: 'bg-indigo-100 text-indigo-700', label: 'Link Clicked', icon: CheckCircle },
      [QuoteStatus.DOCS_UPLOADED]: { color: 'bg-purple-100 text-purple-700', label: 'Docs Uploaded', icon: CheckCircle },
      [QuoteStatus.PAYMENT_PENDING]: { color: 'bg-orange-100 text-orange-700', label: 'Payment Pending', icon: Clock },
      [QuoteStatus.ISSUED]: { color: 'bg-green-100 text-green-700', label: 'Issued', icon: CheckCircle },
      [QuoteStatus.EXPIRING]: { color: 'bg-amber-100 text-amber-700', label: 'Expiring', icon: AlertCircle }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };
  
  // Apply filtering multipliers to simulate data changes
  const getTimeMultiplier = () => {
    switch(timeFilter) {
      case 'WEEK': return 0.25;
      case 'QUARTER': return 3;
      default: return 1;
    }
  };
  
  const getPartnerMultiplier = () => {
    return partnerFilter === 'ALL' ? 1 : 0.4; // Simulate partner share
  };

  const multiplier = getTimeMultiplier() * getPartnerMultiplier();

  // Filter Agents based on some mock logic
  const filteredAgents = topAgents.map(agent => ({
    ...agent,
    salesCount: Math.round(agent.salesCount * multiplier),
    totalPremium: Math.round(agent.totalPremium * multiplier)
  })).sort((a, b) => b.totalPremium - a.totalPremium);

  // If agentId is provided, find this specific agent
  const currentAgent = agentId ? filteredAgents.find(a => a.id === agentId) : null;

  const pipelineCount = Math.round(18 * multiplier);
  const pipelineLabel = timeFilter === 'WEEK' ? '7 Days' : timeFilter === 'QUARTER' ? '90 Days' : '30 Days';

  // Calculate stats for tabs
  const agentPortalCount = quotes.filter(q => q.source === QuoteSource.AGENT_PORTAL).length;
  const customerPortalCount = quotes.filter(q => q.source === QuoteSource.CUSTOMER_PORTAL).length;
  const draftCount = filteredQuotes.filter(q => q.status === QuoteStatus.DRAFT).length;

  return (
    <div className="space-y-6 mt-8">
      <div className="flex items-center justify-between">
         <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Briefcase className="w-7 h-7 mr-2 text-zain-600" /> 
            {agentId && !isManagerView ? 'My Performance' : 'Quote Management'}
         </h2>
         
         <div className="flex gap-2">
            <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg border border-gray-200 font-semibold">
               Viewing: {timeFilter === 'WEEK' ? 'This Week' : timeFilter === 'MONTH' ? 'This Month' : 'This Quarter'}
            </span>
            <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg border border-gray-200 font-semibold">
               Partner: {partnerFilter}
            </span>
         </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex bg-white p-1.5 rounded-xl border-2 border-gray-200 shadow-sm">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                activeTab === 'all' 
                ? 'bg-gradient-to-r from-zain-600 to-zain-700 text-white shadow-md' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              All Requests ({quotes.length})
            </button>
            <button
              onClick={() => setActiveTab('agent')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                activeTab === 'agent' 
                ? 'bg-gradient-to-r from-zain-600 to-zain-700 text-white shadow-md' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              Agent Portal ({agentPortalCount})
            </button>
            <button
              onClick={() => setActiveTab('customer')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                activeTab === 'customer' 
                ? 'bg-gradient-to-r from-zain-600 to-zain-700 text-white shadow-md' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              Customer Portal ({customerPortalCount})
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, mobile, or CPR..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-zain-500 focus:border-zain-500"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 text-sm font-semibold bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-zain-500 focus:border-zain-500"
            >
              <option value="ALL">All Status</option>
              <option value={QuoteStatus.DRAFT}>Draft</option>
              <option value={QuoteStatus.PENDING_APPROVAL}>Pending Approval</option>
              <option value={QuoteStatus.APPROVAL_GRANTED}>Approved</option>
              <option value={QuoteStatus.APPROVAL_REJECTED}>Rejected</option>
              <option value={QuoteStatus.LINK_SENT}>Link Sent</option>
              <option value={QuoteStatus.ISSUED}>Issued</option>
            </select>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-2">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Total Quotes</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-1">{filteredQuotes.length}</h3>
                </div>
                <div className="p-3 bg-zain-50 rounded-lg">
                  <Layers className="w-6 h-6 text-zain-600" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="border-2">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Drafts</p>
                  <h3 className="text-2xl font-bold text-amber-600 mt-1">{draftCount}</h3>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="border-2">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Agent Portal</p>
                  <h3 className="text-2xl font-bold text-blue-600 mt-1">{agentPortalCount}</h3>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="border-2">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-semibold">Customer Portal</p>
                  <h3 className="text-2xl font-bold text-green-600 mt-1">{customerPortalCount}</h3>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <Download className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Quotes Table */}
      <Card className="border-2">
        <CardHeader className="border-b pb-4">
          <h3 className="text-lg font-bold text-gray-900">
            {activeTab === 'all' ? 'All Requests & Drafts' : 
             activeTab === 'agent' ? 'Agent Portal Drafts' : 
             'Customer Portal Drafts'}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Showing {filteredQuotes.length} {filteredQuotes.length === 1 ? 'quote' : 'quotes'}
          </p>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zain-600 mx-auto"></div>
              <p className="mt-4">Loading quotes...</p>
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No quotes found matching your filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredQuotes.map((quote) => (
                <div key={quote.id} className="p-4 hover:bg-gray-50 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-bold text-gray-900">{quote.customer.fullName}</h4>
                        {getStatusBadge(quote.status)}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          quote.source === QuoteSource.AGENT_PORTAL 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-green-100 text-green-700'
                        }`}>
                          {quote.source === QuoteSource.AGENT_PORTAL ? 'Agent' : 'Customer'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 text-xs">Quote Ref</p>
                          <p className="font-semibold text-gray-700">{quote.quoteReference || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Mobile</p>
                          <p className="font-semibold text-gray-700">{quote.customer.mobile}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Type</p>
                          <p className="font-semibold text-gray-700">{quote.insuranceType}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Created</p>
                          <p className="font-semibold text-gray-700">
                            {new Date(quote.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {quote.reminderCount && quote.reminderCount > 0 && (
                        <div className="mt-2">
                          <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                            <MessageCircle className="w-3 h-3 inline mr-1" />
                            {quote.reminderCount} reminder{quote.reminderCount > 1 ? 's' : ''} sent
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      {quote.status === QuoteStatus.DRAFT && (
                        <button
                          onClick={() => handleSendReminder(quote)}
                          disabled={sendingReminder === quote.id}
                          className="flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50"
                          title="Send WhatsApp Reminder"
                        >
                          {sendingReminder === quote.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <MessageCircle className="w-4 h-4" />
                          )}
                          Remind
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedQuote(quote)}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-zain-600 text-white rounded-lg hover:bg-zain-700 transition-all"
                      >
                        <Edit className="w-4 h-4" />
                        {quote.status === QuoteStatus.DRAFT ? 'Amend' : 'View'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Agent-Specific View */}
      {agentId && !isManagerView && currentAgent ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-2 hover:shadow-lg transition-all">
                  <CardBody>
                      <div className="flex items-center justify-between mb-3">
                          <div className="p-2.5 rounded-xl bg-zain-50 text-zain-600">
                              <Target className="w-6 h-6" />
                          </div>
                          <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                              On Track
                          </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-600 mb-1">Total Sales</p>
                      <h3 className="text-3xl font-bold text-gray-900">{currentAgent.salesCount}</h3>
                      <p className="text-xs text-gray-400 mt-2">Policies sold this period</p>
                  </CardBody>
              </Card>

              <Card className="border-2 hover:shadow-lg transition-all">
                  <CardBody>
                      <div className="flex items-center justify-between mb-3">
                          <div className="p-2.5 rounded-xl bg-green-50 text-green-600">
                              <TrendingUp className="w-6 h-6" />
                          </div>
                          <span className="text-xs font-bold text-zain-600 bg-zain-50 px-2 py-1 rounded-full">
                              {currentAgent.conversionRate}%
                          </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-600 mb-1">Total Revenue</p>
                      <h3 className="text-3xl font-bold text-gray-900">BHD {currentAgent.totalPremium.toLocaleString()}</h3>
                      <p className="text-xs text-gray-400 mt-2">Premium generated</p>
                  </CardBody>
              </Card>

              <Card className="bg-gradient-to-br from-zain-600 to-purple-700 text-white border-2 hover:shadow-lg transition-all">
                  <CardBody>
                      <div className="flex items-center justify-between mb-3">
                          <div className="p-2.5 rounded-xl bg-white/20">
                              <Award className="w-6 h-6" />
                          </div>
                          <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full">
                              Rank
                          </span>
                      </div>
                      <p className="text-sm font-semibold text-white/80 mb-1">Team Ranking</p>
                      <h3 className="text-3xl font-bold">
                          #{filteredAgents.findIndex(a => a.id === agentId) + 1} of {filteredAgents.length}
                      </h3>
                      <p className="text-xs text-white/70 mt-2">In your team this period</p>
                  </CardBody>
              </Card>
          </div>
      ) : null}

      {/* Manager View - Team Performance */}
      {isManagerView ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* Top Agents */}
             <Card className="border-2 hover:shadow-lg transition-all">
                <CardHeader className="border-b pb-4">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center">
                        <Award className="w-6 h-6 mr-2 text-amber-500" /> Top Performing Agents
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Ranked by total premium generated</p>
                </CardHeader>
                <CardBody className="p-0">
                    <div className="divide-y divide-gray-100">
                        {filteredAgents.slice(0, 5).map((agent, index) => (
                            <div key={agent.id} className="p-4 flex items-center justify-between hover:bg-gradient-to-r hover:from-zain-50 hover:to-purple-50 transition-all cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <img src={agent.avatar} alt={agent.name} className="w-12 h-12 rounded-full ring-2 ring-gray-100" />
                                        {index === 0 && (
                                            <div className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-400 to-amber-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ring-2 ring-white shadow-md">1</div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">{agent.name}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{agent.salesCount} Policies Sold</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-zain-600 text-lg">BHD {agent.totalPremium.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{agent.conversionRate}% Conv. Rate</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardBody>
             </Card>

             {/* Renewal Pipeline */}
             <Card className="bg-gradient-to-br from-zain-600 to-purple-700 text-white border-2 hover:shadow-lg transition-all">
                <CardBody>
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-white/80 text-sm font-semibold mb-2">Renewal Pipeline ({pipelineLabel})</p>
                            <h3 className="text-5xl font-bold">{pipelineCount}</h3>
                            <p className="text-white/70 text-sm mt-1">Policies expiring</p>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl shadow-lg">
                            <Calendar className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="w-full bg-white/20 rounded-full h-2">
                            <div className="bg-white h-2 rounded-full shadow-md w-[45%]"></div>
                        </div>
                        <div className="flex justify-between text-xs text-white/80">
                            <span>{Math.round(pipelineCount * 0.4)} contacted</span>
                            <span>{Math.round(pipelineCount * 0.6)} remaining</span>
                        </div>
                    </div>
                    <div className="mt-6 p-3 bg-white/10 rounded-lg">
                        <p className="text-xs text-white/90 font-medium">💡 {Math.round(pipelineCount * 0.15)} policies at high risk of churn</p>
                    </div>
                </CardBody>
             </Card>
          </div>
      ) : null}

      {/* Edit Quote Modal */}
      {selectedQuote && (
        <EditQuoteModal
          quote={selectedQuote}
          onClose={() => {
            setSelectedQuote(null);
            loadQuotes(); // Reload quotes after edit
          }}
          onUpdate={loadQuotes}
        />
      )}
    </div>
  );
};
