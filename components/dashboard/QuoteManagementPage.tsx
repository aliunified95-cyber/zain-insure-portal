
import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { 
  Search,
  Edit,
  MessageCircle,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  AlertCircle,
  Download,
  Layers,
  Users,
  Filter,
  UserPlus
} from 'lucide-react';
import { getAllQuotes, sendWhatsAppReminder, getUsers, assignQuotesToAgent } from '../../services/mockApi';
import { QuoteRequest, QuoteStatus, QuoteSource, UserRole, User, QuoteAssignment, AssignmentStatus, AssignmentHistoryEntry } from '../../types';
import { EditQuoteModal } from './EditQuoteModal';
import { useQuoteStore } from '../../stores/useQuoteStore';

interface QuoteManagementPageProps {
  onNavigateToQuote?: (quoteId: string) => void;
  userRole?: UserRole;
  currentUserId?: string;
  currentUserName?: string;
  isManagerView?: boolean;
}

export const QuoteManagementPage: React.FC<QuoteManagementPageProps> = ({ 
  onNavigateToQuote,
  userRole = 'JUNIOR_AGENT',
  currentUserId,
  currentUserName = 'Agent',
  isManagerView = true
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'agent' | 'customer'>('all');
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<QuoteRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  
  // Assignment functionality
  const [selectedQuotesForAssignment, setSelectedQuotesForAssignment] = useState<Set<string>>(new Set());
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<User[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [selectAll, setSelectAll] = useState(false);
  
  const { assignQuote } = useQuoteStore();

  // Load quotes on mount
  useEffect(() => {
    loadQuotes();
    loadAgents();
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
  
  const loadAgents = async () => {
    try {
      const users = await getUsers();
      // Filter only agents (JUNIOR_AGENT and SUPERVISOR roles)
      const agents = users.filter(u => 
        u.roles.includes('JUNIOR_AGENT') || u.roles.includes('SUPERVISOR')
      );
      setAvailableAgents(agents);
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
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
    if (currentUserId && !isManagerView) {
      filtered = filtered.filter(q => q.agentId === currentUserId);
    }

    setFilteredQuotes(filtered);
  }, [quotes, activeTab, statusFilter, searchTerm, currentUserId, isManagerView]);

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
  
  const toggleQuoteSelection = (quoteId: string) => {
    const newSelection = new Set(selectedQuotesForAssignment);
    if (newSelection.has(quoteId)) {
      newSelection.delete(quoteId);
    } else {
      newSelection.add(quoteId);
    }
    setSelectedQuotesForAssignment(newSelection);
    setSelectAll(false);
  };
  
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedQuotesForAssignment(new Set());
      setSelectAll(false);
    } else {
      const allQuoteIds = new Set(filteredQuotes.map(q => q.id));
      setSelectedQuotesForAssignment(allQuoteIds);
      setSelectAll(true);
    }
  };
  
  const handleAssignClick = () => {
    if (selectedQuotesForAssignment.size === 0) {
      alert('Please select at least one quote to assign.');
      return;
    }
    setShowAssignModal(true);
  };
  
  const handleConfirmAssignment = async () => {
    if (!selectedAgentId) {
      alert('Please select an agent.');
      return;
    }
    
    const selectedAgent = availableAgents.find(a => a.id === selectedAgentId);
    if (!selectedAgent || !currentUserId) return;
    
    const quoteIds: string[] = Array.from(selectedQuotesForAssignment);
    
    // Create assignment object for all quotes
    const assignment: QuoteAssignment = {
      id: `assign-${Date.now()}`,
      quoteId: quoteIds[0] || '', // Will be set per quote in API
      assignedToAgentId: selectedAgent.id,
      assignedToAgentName: selectedAgent.fullName,
      assignedByAgentId: currentUserId,
      assignedByAgentName: currentUserName,
      assignedAt: new Date().toISOString(),
      status: AssignmentStatus.ASSIGNED
    };
    
    // Assign through API
    const success = await assignQuotesToAgent(quoteIds, assignment);
    
    if (success) {
      alert(`${selectedQuotesForAssignment.size} quote(s) assigned to ${selectedAgent.fullName}`);
      // Clear selection and close modal
      setSelectedQuotesForAssignment(new Set());
      setSelectAll(false);
      setShowAssignModal(false);
      setSelectedAgentId('');
      await loadQuotes();
    } else {
      alert('Failed to assign quotes. Please try again.');
    }
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

  // Calculate stats for tabs
  const agentPortalCount = quotes.filter(q => q.source === QuoteSource.AGENT_PORTAL).length;
  const customerPortalCount = quotes.filter(q => q.source === QuoteSource.CUSTOMER_PORTAL).length;
  const draftCount = filteredQuotes.filter(q => q.status === QuoteStatus.DRAFT).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Quote Management</h1>
          <p className="text-sm text-gray-500 mt-2">Manage quotes and drafts from both agent and customer portals</p>
        </div>
        <div className="flex gap-2">
          {isManagerView && selectedQuotesForAssignment.size > 0 && (
            <button
              onClick={handleAssignClick}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              Assign ({selectedQuotesForAssignment.size})
            </button>
          )}
          <button
            onClick={loadQuotes}
            className="flex items-center gap-2 px-4 py-2 bg-zain-600 text-white rounded-lg hover:bg-zain-700 transition-all shadow-sm"
          >
            <Filter className="w-4 h-4" />
            Refresh
          </button>
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
              aria-label="Filter by status"
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isManagerView && filteredQuotes.length > 0 && (
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={toggleSelectAll}
                  className="w-5 h-5 text-zain-600 border-gray-300 rounded focus:ring-zain-500 cursor-pointer"
                  aria-label="Select all quotes"
                  title="Select all quotes"
                />
              )}
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {activeTab === 'all' ? 'All Requests & Drafts' : 
                   activeTab === 'agent' ? 'Agent Portal Drafts' : 
                   'Customer Portal Drafts'}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Showing {filteredQuotes.length} {filteredQuotes.length === 1 ? 'quote' : 'quotes'}
                  {selectedQuotesForAssignment.size > 0 && (
                    <span className="ml-2 text-zain-600 font-semibold">
                      ({selectedQuotesForAssignment.size} selected)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
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
                  <div className="flex items-center gap-3">
                    {/* Checkbox for team leaders */}
                    {isManagerView && (
                      <input
                        type="checkbox"
                        checked={selectedQuotesForAssignment.has(quote.id)}
                        onChange={() => toggleQuoteSelection(quote.id)}
                        className="w-5 h-5 text-zain-600 border-gray-300 rounded focus:ring-zain-500 cursor-pointer"
                        aria-label={`Select quote for ${quote.customer.fullName}`}
                        title={`Select quote for assignment`}
                      />
                    )}
                    
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
                        {quote.assignment ? (
                          <span className="text-xs px-3 py-1 rounded-full font-semibold bg-orange-100 text-orange-700 border border-orange-300">
                            ✓ Assigned to {quote.assignment.assignedToAgentName}
                            <span className="ml-2 text-orange-600">
                              ({new Date(quote.assignment.assignedAt).toLocaleString('en-US', {
                                month: 'numeric',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true
                              })})
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs px-3 py-1 rounded-full font-semibold bg-gray-100 text-gray-600 border border-gray-300">
                            ✗ Not Assigned
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
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
                        <div>
                          <p className="text-gray-500 text-xs">Reminders Sent</p>
                          <p className="font-semibold text-purple-700">
                            {quote.reminderCount || 0}
                          </p>
                        </div>
                      </div>
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

      {/* Edit Quote Modal */}
      {selectedQuote && (
        <EditQuoteModal
          quote={selectedQuote}
          onClose={() => {
            setSelectedQuote(null);
            loadQuotes(); // Reload quotes after edit
          }}
          onUpdate={loadQuotes}
          userRole={userRole}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
        />
      )}
      
      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="border-b pb-4">
              <h3 className="text-xl font-bold text-gray-900">Assign Quotes to Agent</h3>
            </CardHeader>
            <CardBody className="p-6">
              <p className="text-gray-700 mb-4">
                You are about to assign <strong>{selectedQuotesForAssignment.size}</strong> quote(s) to an agent.
              </p>
              
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Agent *
                </label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-zain-500 focus:border-zain-500"
                  aria-label="Select agent for assignment"
                >
                  <option value="">-- Select an Agent --</option>
                  {availableAgents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.fullName} ({agent.roles.join(', ')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> The assignment date and time will be recorded for tracking purposes. 
                  The agent will be able to claim, edit, view, or reject these quotes in their "My Pool" section.
                </p>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedAgentId('');
                  }}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAssignment}
                  disabled={!selectedAgentId}
                  className="px-4 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Assignment
                </button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
};
