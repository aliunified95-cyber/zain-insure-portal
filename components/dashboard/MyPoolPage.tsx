
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { 
  Search,
  Edit,
  Eye,
  XCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Target,
  TrendingUp,
  Users,
  Timer,
  User,
  Car,
  Plane,
  Filter,
  Download,
  StickyNote,
  Zap,
  BarChart3,
  List,
  LayoutGrid,
  ArrowUpDown,
  Bell,
  Award
} from 'lucide-react';
import { getAllQuotes, claimQuote as claimQuoteAPI, rejectQuote as rejectQuoteAPI, assignQuotesToAgent, getUsers } from '../../services/mockApi';
import { QuoteRequest, AssignmentStatus, RejectionReason, AssignmentHistoryEntry, QuoteAssignment, User as UserType, UserRole, UrgencyLevel, AgentNote } from '../../types';
import { useQuoteStore } from '../../stores/useQuoteStore';
import { EditQuoteModal } from './EditQuoteModal';

interface MyPoolPageProps {
  currentUserId: string;
  currentUserName: string;
  userRole: UserRole;
  onNavigateToQuote?: (quoteId: string) => void;
}

export const MyPoolPage: React.FC<MyPoolPageProps> = ({ 
  currentUserId,
  currentUserName,
  userRole,
  onNavigateToQuote
}) => {
  // Get updateQuote from store
  const updateQuote = useQuoteStore(state => state.updateQuote);
  
  const [activeTab, setActiveTab] = useState<'main-pool' | 'my-assignments'>('main-pool');
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<QuoteRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'ALL'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Enhanced features
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [sortBy, setSortBy] = useState<'assignedDate' | 'urgency' | 'value' | 'type'>('assignedDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedForBulkAction, setSelectedForBulkAction] = useState<Set<string>>(new Set());
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  const [isReminderNote, setIsReminderNote] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  
  // Modal states
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState<RejectionReason>(RejectionReason.NO_ANSWER);
  const [rejectionNote, setRejectionNote] = useState('');
  
  // Assignment functionality for Main Pool
  const [selectedQuotesForAssignment, setSelectedQuotesForAssignment] = useState<Set<string>>(new Set());
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<UserType[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [selectAll, setSelectAll] = useState(false);

  const { claimQuote, rejectQuote } = useQuoteStore();

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
      const agents = users.filter(u => 
        u.roles.includes('JUNIOR_AGENT') || u.roles.includes('SUPERVISOR')
      );
      setAvailableAgents(agents);
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  // Filter quotes based on tab, status filter and search
  useEffect(() => {
    let filtered = [...quotes];

    // Tab filtering
    if (activeTab === 'main-pool') {
      // Show unassigned quotes for Main Pool
      filtered = filtered.filter(q => !q.assignment);
    } else {
      // Show quotes assigned to current user for My Assignments
      filtered = filtered.filter(q => 
        q.assignment && q.assignment.assignedToAgentId === currentUserId
      );
    }

    // Status filtering (only for My Assignments)
    if (activeTab === 'my-assignments' && statusFilter === 'PENDING') {
      filtered = filtered.filter(q => 
        q.assignment?.status === AssignmentStatus.ASSIGNED || 
        q.assignment?.status === AssignmentStatus.CLAIMED
      );
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

    // Date filtering
    if (searchDate) {
      filtered = filtered.filter(q => {
        if (activeTab === 'main-pool') {
          // For main pool, filter by creation date
          const createdDate = new Date(q.createdAt).toISOString().split('T')[0];
          return createdDate === searchDate;
        } else {
          // For my assignments, filter by assignment date
          const assignedDate = q.assignment?.assignedAt ? 
            new Date(q.assignment.assignedAt).toISOString().split('T')[0] : '';
          return assignedDate === searchDate;
        }
      });
    }

    // Apply sorting
    filtered = applySorting(filtered);

    setFilteredQuotes(filtered);
  }, [quotes, activeTab, statusFilter, searchTerm, searchDate, currentUserId, sortBy, sortOrder]);

  // Calculate urgency level based on assignment time
  const calculateUrgency = (assignedAt: string): UrgencyLevel => {
    const now = new Date().getTime();
    const assigned = new Date(assignedAt).getTime();
    const hoursSince = (now - assigned) / (1000 * 60 * 60);
    
    if (hoursSince > 24) return UrgencyLevel.URGENT;
    if (hoursSince > 12) return UrgencyLevel.SOON;
    return UrgencyLevel.NORMAL;
  };

  // Sorting function
  const applySorting = (quotesToSort: QuoteRequest[]) => {
    const sorted = [...quotesToSort].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'assignedDate':
          const dateA = a.assignment?.assignedAt ? new Date(a.assignment.assignedAt).getTime() : 0;
          const dateB = b.assignment?.assignedAt ? new Date(b.assignment.assignedAt).getTime() : 0;
          comparison = dateB - dateA;
          break;
        case 'urgency':
          const urgencyA = a.assignment ? calculateUrgency(a.assignment.assignedAt) : UrgencyLevel.NORMAL;
          const urgencyB = b.assignment ? calculateUrgency(b.assignment.assignedAt) : UrgencyLevel.NORMAL;
          const urgencyMap = { [UrgencyLevel.URGENT]: 3, [UrgencyLevel.SOON]: 2, [UrgencyLevel.NORMAL]: 1 };
          comparison = urgencyMap[urgencyB] - urgencyMap[urgencyA];
          break;
        case 'value':
          const valueA = a.vehicle?.value || 0;
          const valueB = b.vehicle?.value || 0;
          comparison = valueB - valueA;
          break;
        case 'type':
          comparison = a.insuranceType.localeCompare(b.insuranceType);
          break;
      }
      
      return sortOrder === 'asc' ? -comparison : comparison;
    });
    return sorted;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only trigger if not typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch(e.key.toLowerCase()) {
        case 'c':
          if (selectedQuote && selectedQuote.assignment?.status === AssignmentStatus.ASSIGNED) {
            handleClaim(selectedQuote);
          }
          break;
        case 'v':
          if (selectedQuote) {
            handleView(selectedQuote);
          }
          break;
        case 'e':
          if (selectedQuote && selectedQuote.assignment?.status === AssignmentStatus.CLAIMED) {
            handleEdit(selectedQuote);
          }
          break;
        case 'n':
          if (selectedQuote) {
            setShowNoteModal(true);
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedQuote]);

  // Calculate statistics based on active tab
  const myAssignedQuotes = quotes.filter(q => 
    q.assignment && q.assignment.assignedToAgentId === currentUserId
  );
  
  const unassignedQuotes = quotes.filter(q => !q.assignment);
  
  const pendingQuotes = myAssignedQuotes.filter(q => 
    q.assignment?.status === AssignmentStatus.ASSIGNED || 
    q.assignment?.status === AssignmentStatus.CLAIMED
  );

  const claimedQuotes = myAssignedQuotes.filter(q => 
    q.assignment?.status === AssignmentStatus.CLAIMED
  );

  const assignedQuotes = myAssignedQuotes.filter(q => 
    q.assignment?.status === AssignmentStatus.ASSIGNED
  );

  // Calculate urgent quotes (>24hrs unactioned)
  const urgentQuotes = myAssignedQuotes.filter(q => 
    q.assignment?.assignedAt && calculateUrgency(q.assignment.assignedAt) === UrgencyLevel.URGENT &&
    q.assignment?.status === AssignmentStatus.ASSIGNED
  );

  // Calculate high value quotes (>5000 BHD)
  const highValueQuotes = myAssignedQuotes.filter(q => 
    q.vehicle && q.vehicle.value > 5000
  );

  // Calculate total potential premium
  const totalPremiumValue = myAssignedQuotes.reduce((sum, q) => {
    return sum + (q.vehicle?.value ? q.vehicle.value * 0.03 : 0); // Estimated 3% premium
  }, 0);

  // Calculate average time to claim (in minutes)
  const calculateAvgTimeToClaim = () => {
    const claimedWithTime = myAssignedQuotes.filter(q => 
      q.assignment?.claimedAt && q.assignment?.assignedAt
    );

    if (claimedWithTime.length === 0) return 0;

    const totalMinutes = claimedWithTime.reduce((sum, q) => {
      const assignedTime = new Date(q.assignment!.assignedAt).getTime();
      const claimedTime = new Date(q.assignment!.claimedAt!).getTime();
      const minutes = (claimedTime - assignedTime) / (1000 * 60);
      return sum + minutes;
    }, 0);

    return (totalMinutes / claimedWithTime.length).toFixed(1);
  };

  // Calculate claimed percentage
  const claimedPercentage = myAssignedQuotes.length > 0 
    ? ((claimedQuotes.length / myAssignedQuotes.length) * 100).toFixed(0)
    : 0;

  const handleClaim = (quote: QuoteRequest) => {
    setSelectedQuote(quote);
    setShowClaimModal(true);
  };

  const confirmClaim = async () => {
    if (selectedQuote) {
      const success = await claimQuoteAPI(selectedQuote.id, currentUserId, currentUserName);
      if (success) {
        setShowClaimModal(false);
        await loadQuotes();
        
        // Reload the updated quote and open edit modal
        const updatedQuotes = await getAllQuotes();
        const claimedQuote = updatedQuotes.find(q => q.id === selectedQuote.id);
        if (claimedQuote) {
          setSelectedQuote(claimedQuote);
          setShowEditModal(true);
        } else {
          setSelectedQuote(null);
        }
      } else {
        alert('Failed to claim quote. Please try again.');
      }
    }
  };

  // Bulk claim functionality
  const handleBulkClaim = async () => {
    if (selectedForBulkAction.size === 0) {
      alert('Please select quotes to claim');
      return;
    }
    
    const confirmed = confirm(`Claim ${selectedForBulkAction.size} selected quote(s)?`);
    if (!confirmed) return;
    
    let successCount = 0;
    for (const quoteId of Array.from(selectedForBulkAction) as string[]) {
      const success = await claimQuoteAPI(quoteId, currentUserId, currentUserName);
      if (success) successCount++;
    }
    
    alert(`Successfully claimed ${successCount} of ${selectedForBulkAction.size} quotes`);
    setSelectedForBulkAction(new Set());
    await loadQuotes();
  };

  // Claim next (oldest pending)
  const handleClaimNext = async () => {
    const oldestPending = pendingQuotes
      .filter(q => q.assignment?.status === AssignmentStatus.ASSIGNED)
      .sort((a, b) => {
        const dateA = new Date(a.assignment!.assignedAt).getTime();
        const dateB = new Date(b.assignment!.assignedAt).getTime();
        return dateA - dateB;
      })[0];
    
    if (oldestPending) {
      const success = await claimQuoteAPI(oldestPending.id, currentUserId, currentUserName);
      if (success) {
        alert(`Claimed quote for ${oldestPending.customer.fullName}`);
        await loadQuotes();
      }
    } else {
      alert('No pending quotes to claim');
    }
  };

  // Export to CSV
  const handleExport = () => {
    const csvData = filteredQuotes.map(q => ({
      'Quote Ref': q.quoteReference || q.id.slice(0, 8),
      'Customer Name': q.customer.fullName,
      'Mobile': q.customer.mobile,
      'Insurance Type': q.insuranceType,
      'Status': q.status,
      'Assignment Status': q.assignment?.status || 'Unassigned',
      'Assigned Date': q.assignment?.assignedAt ? new Date(q.assignment.assignedAt).toLocaleString() : 'N/A',
      'Claimed Date': q.assignment?.claimedAt ? new Date(q.assignment.claimedAt).toLocaleString() : 'N/A',
    }));
    
    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-pool-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Save note
  const handleSaveNote = async () => {
    if (!selectedQuote || !currentNote.trim()) return;
    
    const newNote: AgentNote = {
      id: Date.now().toString(),
      noteText: currentNote,
      createdAt: new Date().toISOString(),
      createdBy: currentUserId,
      createdByName: currentUserName,
      isReminder: isReminderNote,
      reminderDate: isReminderNote ? reminderDate : undefined
    };

    const updatedQuote = {
      ...selectedQuote,
      assignment: {
        ...selectedQuote.assignment!,
        agentNotes: [...(selectedQuote.assignment?.agentNotes || []), newNote]
      }
    };

    await updateQuote(updatedQuote);
    await loadQuotes();
    
    // Reload the updated quote to show new note
    const refreshedQuotes = await getAllQuotes();
    const refreshedQuote = refreshedQuotes.find(q => q.id === selectedQuote.id);
    
    // Close note modal but keep view modal open with refreshed data
    setShowNoteModal(false);
    if (refreshedQuote) {
      setSelectedQuote(refreshedQuote);
      setShowViewModal(true);
    }
    setCurrentNote('');
    setIsReminderNote(false);
    setReminderDate('');
  };

  // Toggle bulk selection
  const toggleBulkSelection = (quoteId: string) => {
    const newSelection = new Set(selectedForBulkAction);
    if (newSelection.has(quoteId)) {
      newSelection.delete(quoteId);
    } else {
      newSelection.add(quoteId);
    }
    setSelectedForBulkAction(newSelection);
  };
  
  // Assignment handlers for Main Pool
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
    if (!selectedAgent) return;
    
    const quoteIds: string[] = Array.from(selectedQuotesForAssignment);
    
    const assignment: QuoteAssignment = {
      id: `assign-${Date.now()}`,
      quoteId: quoteIds[0] || '',
      assignedToAgentId: selectedAgent.id,
      assignedToAgentName: selectedAgent.fullName,
      assignedByAgentId: currentUserId,
      assignedByAgentName: currentUserName,
      assignedAt: new Date().toISOString(),
      status: AssignmentStatus.ASSIGNED
    };
    
    const success = await assignQuotesToAgent(quoteIds, assignment);
    
    if (success) {
      alert(`${selectedQuotesForAssignment.size} quote(s) assigned to ${selectedAgent.fullName}`);
      setSelectedQuotesForAssignment(new Set());
      setSelectAll(false);
      setShowAssignModal(false);
      setSelectedAgentId('');
      await loadQuotes();
    } else {
      alert('Failed to assign quotes. Please try again.');
    }
  };

  const handleEdit = (quote: QuoteRequest) => {
    if (quote.assignment?.status === AssignmentStatus.CLAIMED || quote.assignment?.status === AssignmentStatus.COMPLETED) {
      setSelectedQuote(quote);
      setShowEditModal(true);
    } else {
      alert('You must claim this quote before editing.');
    }
  };

  const handleView = (quote: QuoteRequest) => {
    setSelectedQuote(quote);
    setShowViewModal(true);
  };

  const handleReject = (quote: QuoteRequest) => {
    setSelectedQuote(quote);
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (selectedQuote) {
      const success = await rejectQuoteAPI(selectedQuote.id, currentUserId, currentUserName, rejectionReason, rejectionNote);
      if (success) {
        setShowRejectModal(false);
        setSelectedQuote(null);
        setRejectionReason(RejectionReason.NO_ANSWER);
        setRejectionNote('');
        await loadQuotes();
      } else {
        alert('Failed to reject quote. Please try again.');
      }
    }
  };

  const getStatusBadge = (status: AssignmentStatus) => {
    const config: Record<AssignmentStatus, { color: string; label: string; icon: any }> = {
      [AssignmentStatus.ASSIGNED]: { color: 'bg-yellow-100 text-yellow-700', label: 'Assigned', icon: AlertCircle },
      [AssignmentStatus.CLAIMED]: { color: 'bg-blue-100 text-blue-700', label: 'Claimed', icon: CheckCircle },
      [AssignmentStatus.REJECTED]: { color: 'bg-red-100 text-red-700', label: 'Rejected', icon: XCircle },
      [AssignmentStatus.COMPLETED]: { color: 'bg-green-100 text-green-700', label: 'Completed', icon: CheckCircle }
    };

    const { color, label, icon: Icon } = config[status];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${color}`}>
        <Icon className="w-3 h-3" />
        {label}
      </span>
    );
  };

  const getQuoteStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      'DRAFT': { color: 'bg-gray-100 text-gray-700', label: 'Draft' },
      'PENDING_APPROVAL': { color: 'bg-amber-100 text-amber-700', label: 'Pending Approval' },
      'APPROVAL_GRANTED': { color: 'bg-green-100 text-green-700', label: 'Approved' },
      'APPROVAL_REJECTED': { color: 'bg-red-100 text-red-700', label: 'Rejected' },
      'LINK_SENT': { color: 'bg-purple-100 text-purple-700', label: '🔗 Link Sent' },
      'LINK_CLICKED': { color: 'bg-indigo-100 text-indigo-700', label: '👆 Link Clicked' },
      'DOCS_UPLOADED': { color: 'bg-blue-100 text-blue-700', label: '📄 Docs Uploaded' },
      'PAYMENT_PENDING': { color: 'bg-orange-100 text-orange-700', label: '💳 Payment Pending' },
      'ISSUED': { color: 'bg-green-100 text-green-700', label: '✅ Issued' },
      'EXPIRING': { color: 'bg-red-100 text-red-700', label: '⚠️ Expiring' }
    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-700', label: status };
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getUrgencyBadge = (assignedAt: string) => {
    const urgency = calculateUrgency(assignedAt);
    const config = {
      [UrgencyLevel.URGENT]: { color: 'bg-red-100 text-red-700 border-red-300', label: '🔴 URGENT', icon: AlertCircle },
      [UrgencyLevel.SOON]: { color: 'bg-amber-100 text-amber-700 border-amber-300', label: '🟡 SOON', icon: Clock },
      [UrgencyLevel.NORMAL]: { color: 'bg-green-100 text-green-700 border-green-300', label: '🟢 NORMAL', icon: CheckCircle }
    };
    
    const { color, label, icon: Icon } = config[urgency];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border ${color}`}>
        <Icon className="w-3 h-3" />
        {label}
      </span>
    );
  };

  const formatTimeSince = (timestamp: string) => {
    const now = new Date().getTime();
    const then = new Date(timestamp).getTime();
    const diff = now - then;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">My Pool</h1>
            {urgentQuotes.length > 0 && activeTab === 'my-assignments' && (
              <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold animate-pulse">
                <Bell className="w-4 h-4" />
                {urgentQuotes.length} URGENT
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            {activeTab === 'main-pool' 
              ? 'Assign unassigned quotes to agents' 
              : 'Manage your assigned quotes and track your performance'}
          </p>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            <kbd className="px-2 py-1 bg-gray-100 rounded">C</kbd> Claim
            <kbd className="px-2 py-1 bg-gray-100 rounded">V</kbd> View
            <kbd className="px-2 py-1 bg-gray-100 rounded">E</kbd> Edit
            <kbd className="px-2 py-1 bg-gray-100 rounded">N</kbd> Note
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {activeTab === 'my-assignments' && (
            <>
              {selectedForBulkAction.size > 0 && (
                <button
                  onClick={handleBulkClaim}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  Bulk Claim ({selectedForBulkAction.size})
                </button>
              )}
              <button
                onClick={handleClaimNext}
                className="flex items-center gap-2 px-4 py-2 bg-zain-600 text-white rounded-lg hover:bg-zain-700 transition-all shadow-sm"
              >
                <Zap className="w-4 h-4" />
                Claim Next
              </button>
            </>
          )}
          {activeTab === 'main-pool' && selectedQuotesForAssignment.size > 0 && (
            <button
              onClick={handleAssignClick}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-sm"
            >
              <Users className="w-4 h-4" />
              Assign ({selectedQuotesForAssignment.size})
            </button>
          )}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={loadQuotes}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all shadow-sm"
          >
            <Clock className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${showFilters ? 'bg-zain-100 text-zain-700' : 'bg-gray-100 text-gray-700'}`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border rounded-lg text-sm"
            title="Sort by"
          >
            <option value="assignedDate">📅 Assignment Date</option>
            <option value="urgency">⚠️ Urgency</option>
            <option value="value">💰 Value</option>
            <option value="type">📋 Type</option>
          </select>
          
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            title="Toggle sort order"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-zain-100 text-zain-700' : 'bg-gray-100 text-gray-700'}`}
            title="List view"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`p-2 rounded-lg ${viewMode === 'kanban' ? 'bg-zain-100 text-zain-700' : 'bg-gray-100 text-gray-700'}`}
            title="Kanban view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-white p-1.5 rounded-xl border-2 border-gray-200 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('main-pool')}
          className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'main-pool' 
            ? 'bg-gradient-to-r from-zain-600 to-zain-700 text-white shadow-md' 
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          Main Pool ({unassignedQuotes.length})
        </button>
        <button
          onClick={() => setActiveTab('my-assignments')}
          className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'my-assignments' 
            ? 'bg-gradient-to-r from-zain-600 to-zain-700 text-white shadow-md' 
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          My Assignments ({myAssignedQuotes.length})
        </button>
      </div>

      {/* Enhanced Statistics Cards - Show for My Assignments tab */}
      {activeTab === 'my-assignments' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Urgent Quotes */}
          <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-white">
            <CardBody className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-semibold flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Urgent
                  </p>
                  <h3 className="text-2xl font-bold text-red-700 mt-1">{urgentQuotes.length}</h3>
                  <p className="text-xs text-gray-500 mt-1">&gt;24h pending</p>
                </div>
                <div className="p-2 bg-red-100 rounded-lg">
                  <Bell className={`w-5 h-5 text-red-600 ${urgentQuotes.length > 0 ? 'animate-bounce' : ''}`} />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Assigned Pending */}
          <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-white">
            <CardBody className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-semibold">Assigned Pending</p>
                  <h3 className="text-2xl font-bold text-yellow-700 mt-1">{pendingQuotes.length}</h3>
                  <p className="text-xs text-gray-500 mt-1">{assignedQuotes.length} unclaimed</p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Target className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* High Value Quotes */}
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardBody className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-semibold flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    High Value
                  </p>
                  <h3 className="text-2xl font-bold text-blue-700 mt-1">{highValueQuotes.length}</h3>
                  <p className="text-xs text-gray-500 mt-1">&gt;5000 BHD est.</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Total Premium Value */}
          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardBody className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-semibold">Total Value</p>
                  <h3 className="text-xl font-bold text-green-700 mt-1">{totalPremiumValue.toLocaleString()}</h3>
                  <p className="text-xs text-gray-500 mt-1">BHD estimated</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Average Claim Time */}
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
            <CardBody className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-semibold">Avg Claim Time</p>
                  <h3 className="text-2xl font-bold text-purple-700 mt-1">{calculateAvgTimeToClaim()}<span className="text-base">m</span></h3>
                  <p className="text-xs text-gray-500 mt-1">minutes average</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Timer className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Statistics Cards - Show for Main Pool tab */}
      {activeTab === 'main-pool' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Total Unassigned */}
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardBody className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-semibold">Unassigned Quotes</p>
                  <h3 className="text-2xl font-bold text-blue-700 mt-1">{unassignedQuotes.length}</h3>
                  <p className="text-xs text-gray-500 mt-1">awaiting assignment</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Motor vs Travel */}
          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-semibold">Motor Insurance</p>
                  <h3 className="text-3xl font-bold text-green-700 mt-1">{unassignedQuotes.filter(q => q.insuranceType === 'MOTOR').length}</h3>
                  <p className="text-xs text-gray-500 mt-1">motor quotes</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Car className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-white">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-semibold">Travel Insurance</p>
                  <h3 className="text-3xl font-bold text-teal-700 mt-1">{unassignedQuotes.filter(q => q.insuranceType === 'TRAVEL').length}</h3>
                  <p className="text-xs text-gray-500 mt-1">travel quotes</p>
                </div>
                <div className="p-3 bg-teal-100 rounded-lg">
                  <Plane className="w-6 h-6 text-teal-600" />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Selected for Assignment */}
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-semibold">Selected</p>
                  <h3 className="text-3xl font-bold text-purple-700 mt-1">{selectedQuotesForAssignment.size}</h3>
                  <p className="text-xs text-gray-500 mt-1">for assignment</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Users className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Enhanced Filters with Quick Filter Chips */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, mobile, or CPR..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-zain-500 focus:border-zain-500"
              />
            </div>
            
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="px-4 py-2 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-zain-500 focus:border-zain-500"
              aria-label="Filter by date"
              title={activeTab === 'main-pool' ? 'Filter by creation date' : 'Filter by assignment date'}
            />
          </div>

          {activeTab === 'my-assignments' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'PENDING' | 'ALL')}
              className="px-4 py-2 text-sm font-semibold bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-zain-500 focus:border-zain-500"
              aria-label="Filter by status"
            >
              <option value="PENDING">Pending Only</option>
              <option value="ALL">All Status</option>
            </select>
          )}
        </div>

        {/* Enhanced Filter Panel */}
        {showFilters && activeTab === 'my-assignments' && (
          <Card className="border-2 border-zain-200 bg-zain-50">
            <CardBody className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-zain-600" />
                <h4 className="font-semibold text-gray-900">Quick Filters</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    // Filter for urgent quotes (>24h pending)
                    const now = Date.now();
                    const urgentFilter = filteredQuotes.filter(q => {
                      if (!q.assignment?.assignedAt) return false;
                      const hoursSinceAssignment = (now - new Date(q.assignment.assignedAt).getTime()) / (1000 * 60 * 60);
                      return hoursSinceAssignment > 24 && q.assignment.status !== AssignmentStatus.COMPLETED;
                    });
                    // This is a visual indicator - actual filtering happens in useMemo
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-all flex items-center gap-1"
                >
                  <Zap className="w-3 h-3" />
                  Urgent ({urgentQuotes.length})
                </button>
                <button
                  className="px-3 py-1.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-all flex items-center gap-1"
                >
                  <Award className="w-3 h-3" />
                  High Value ({highValueQuotes.length})
                </button>
                <button
                  className="px-3 py-1.5 text-xs font-semibold bg-yellow-100 text-yellow-700 rounded-full hover:bg-yellow-200 transition-all flex items-center gap-1"
                >
                  <AlertCircle className="w-3 h-3" />
                  Not Contacted ({myAssignedQuotes.filter(q => !q.assignment?.lastContactedAt).length})
                </button>
                <button
                  className="px-3 py-1.5 text-xs font-semibold bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-all flex items-center gap-1"
                >
                  <StickyNote className="w-3 h-3" />
                  Has Notes ({myAssignedQuotes.filter(q => q.assignment?.agentNotes && q.assignment.agentNotes.length > 0).length})
                </button>
                <button
                  className="px-3 py-1.5 text-xs font-semibold bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-all"
                >
                  Motor Only ({myAssignedQuotes.filter(q => q.insuranceType === 'MOTOR').length})
                </button>
                <button
                  className="px-3 py-1.5 text-xs font-semibold bg-teal-100 text-teal-700 rounded-full hover:bg-teal-200 transition-all"
                >
                  Travel Only ({myAssignedQuotes.filter(q => q.insuranceType === 'TRAVEL').length})
                </button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* Kanban View (My Assignments Only) */}
      {viewMode === 'kanban' && activeTab === 'my-assignments' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Pending Column */}
          <Card className="border-2 border-yellow-200">
            <CardHeader className="bg-yellow-50 border-b border-yellow-200 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <h3 className="font-bold text-gray-900">Pending</h3>
                </div>
                <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs font-bold rounded-full">
                  {filteredQuotes.filter(q => q.assignment?.status === AssignmentStatus.ASSIGNED).length}
                </span>
              </div>
            </CardHeader>
            <CardBody className="p-3 space-y-3 max-h-[600px] overflow-y-auto">
              {filteredQuotes
                .filter(q => q.assignment?.status === AssignmentStatus.ASSIGNED)
                .map(quote => (
                  <Card key={quote.id} className="border hover:shadow-md transition-all cursor-pointer">
                    <CardBody className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-sm text-gray-900">{quote.customer.fullName}</h4>
                        {getUrgencyBadge(quote.assignment?.assignedAt || '')}
                      </div>
                      <div className="space-y-1 text-xs text-gray-600 mb-3">
                        <p>📱 {quote.customer.mobile}</p>
                        <p>🚗 {quote.insuranceType}</p>
                        <p className="text-gray-500">{formatTimeSince(quote.assignment?.assignedAt || '')}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleClaim(quote)}
                          className="flex-1 px-2 py-1.5 text-xs font-semibold bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Claim
                        </button>
                        <button
                          onClick={() => handleView(quote)}
                          className="px-2 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700"
                          title="View quote details"
                          aria-label="View quote details"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              {filteredQuotes.filter(q => q.assignment?.status === AssignmentStatus.ASSIGNED).length === 0 && (
                <p className="text-center text-gray-400 text-sm py-8">No pending quotes</p>
              )}
            </CardBody>
          </Card>

          {/* Working Column */}
          <Card className="border-2 border-blue-200">
            <CardHeader className="bg-blue-50 border-b border-blue-200 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <h3 className="font-bold text-gray-900">Working</h3>
                </div>
                <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs font-bold rounded-full">
                  {filteredQuotes.filter(q => q.assignment?.status === AssignmentStatus.CLAIMED).length}
                </span>
              </div>
            </CardHeader>
            <CardBody className="p-3 space-y-3 max-h-[600px] overflow-y-auto">
              {filteredQuotes
                .filter(q => q.assignment?.status === AssignmentStatus.CLAIMED)
                .map(quote => (
                  <Card key={quote.id} className="border hover:shadow-md transition-all cursor-pointer">
                    <CardBody className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-sm text-gray-900">{quote.customer.fullName}</h4>
                        {getQuoteStatusBadge(quote.status)}
                      </div>
                      <div className="space-y-1 text-xs text-gray-600 mb-3">
                        <p>📱 {quote.customer.mobile}</p>
                        <p>🚗 {quote.insuranceType}</p>
                        <p className="text-gray-500">Claimed {formatTimeSince(quote.assignment?.claimedAt || '')}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(quote)}
                          className="flex-1 px-2 py-1.5 text-xs font-semibold bg-zain-600 text-white rounded hover:bg-zain-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleView(quote)}
                          className="px-2 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700"
                          title="View quote details"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedQuote(quote);
                            setShowNoteModal(true);
                          }}
                          className="px-2 py-1.5 text-xs font-semibold bg-purple-600 text-white rounded hover:bg-purple-700"
                          title="Add note"
                        >
                          <StickyNote className="w-3 h-3" />
                        </button>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              {filteredQuotes.filter(q => q.assignment?.status === AssignmentStatus.CLAIMED).length === 0 && (
                <p className="text-center text-gray-400 text-sm py-8">No active work</p>
              )}
            </CardBody>
          </Card>

          {/* Completed Column */}
          <Card className="border-2 border-green-200">
            <CardHeader className="bg-green-50 border-b border-green-200 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <h3 className="font-bold text-gray-900">Completed</h3>
                </div>
                <span className="px-2 py-1 bg-green-200 text-green-800 text-xs font-bold rounded-full">
                  {filteredQuotes.filter(q => q.assignment?.status === AssignmentStatus.COMPLETED).length}
                </span>
              </div>
            </CardHeader>
            <CardBody className="p-3 space-y-3 max-h-[600px] overflow-y-auto">
              {filteredQuotes
                .filter(q => q.assignment?.status === AssignmentStatus.COMPLETED)
                .map(quote => (
                  <Card key={quote.id} className="border hover:shadow-md transition-all cursor-pointer bg-green-50">
                    <CardBody className="p-3">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-sm text-gray-900">{quote.customer.fullName}</h4>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="space-y-1 text-xs text-gray-600 mb-3">
                        <p>📱 {quote.customer.mobile}</p>
                        <p>🚗 {quote.insuranceType}</p>
                        <p className="text-gray-500">Done {formatTimeSince(quote.assignment?.completedAt || '')}</p>
                      </div>
                      <button
                        onClick={() => handleView(quote)}
                        className="w-full px-2 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        View Details
                      </button>
                    </CardBody>
                  </Card>
                ))}
              {filteredQuotes.filter(q => q.assignment?.status === AssignmentStatus.COMPLETED).length === 0 && (
                <p className="text-center text-gray-400 text-sm py-8">No completed yet</p>
              )}
            </CardBody>
          </Card>
        </div>
      ) : (
        /* List View (Default) */
        <Card className="border-2">
        <CardHeader className="border-b pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {activeTab === 'main-pool' && filteredQuotes.length > 0 && (
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
                  {activeTab === 'main-pool' ? 'Main Pool - Unassigned Quotes' : 'My Assigned Quotes'}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Showing {filteredQuotes.length} {filteredQuotes.length === 1 ? 'quote' : 'quotes'}
                  {activeTab === 'main-pool' && selectedQuotesForAssignment.size > 0 && (
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
              <p>
                {activeTab === 'main-pool' 
                  ? 'No unassigned quotes found.' 
                  : 'No quotes found in your pool.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredQuotes.map((quote) => (
                <div key={quote.id} className="p-3 hover:bg-gray-50 transition-all">
                  <div className="flex items-center gap-3">
                    {activeTab === 'main-pool' && (
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
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h4 className="font-bold text-gray-900">{quote.customer.fullName}</h4>
                        {activeTab === 'my-assignments' && quote.assignment && getStatusBadge(quote.assignment.status)}
                        {getQuoteStatusBadge(quote.status)}
                        {activeTab === 'my-assignments' && quote.assignment?.assignedAt && (
                          <span className="text-xs text-gray-500">
                            Assigned {formatTimeSince(quote.assignment.assignedAt)}
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
                        {activeTab === 'my-assignments' && (
                          <>
                            <div>
                              <p className="text-gray-500 text-xs">Assigned By</p>
                              <p className="font-semibold text-gray-700">{quote.assignment?.assignedByAgentName}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">
                                {quote.assignment?.status === AssignmentStatus.CLAIMED ? 'Claimed At' : 'Assigned Date'}
                              </p>
                              <p className="font-semibold text-gray-700">
                                {new Date(
                                  quote.assignment?.status === AssignmentStatus.CLAIMED && quote.assignment?.claimedAt
                                    ? quote.assignment.claimedAt
                                    : quote.assignment?.assignedAt || ''
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </>
                        )}
                        {activeTab === 'main-pool' && (
                          <>
                            <div>
                              <p className="text-gray-500 text-xs">Source</p>
                              <p className="font-semibold text-gray-700">{quote.source}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">Created</p>
                              <p className="font-semibold text-gray-700">{new Date(quote.createdAt).toLocaleDateString()}</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      {activeTab === 'my-assignments' ? (
                        <>
                          {quote.assignment?.status === AssignmentStatus.ASSIGNED && (
                            <button
                              onClick={() => handleClaim(quote)}
                              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                              title="Claim this quote"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Claim
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleView(quote)}
                            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                            title="View request details"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>

                          {quote.assignment?.status === AssignmentStatus.CLAIMED && (
                            <button
                              onClick={() => handleEdit(quote)}
                              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-zain-600 text-white rounded-lg hover:bg-zain-700 transition-all"
                              title="Edit draft"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                          )}

                          {(quote.assignment?.status === AssignmentStatus.ASSIGNED || 
                            quote.assignment?.status === AssignmentStatus.CLAIMED) && (
                            <button
                              onClick={() => handleReject(quote)}
                              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                              title="Reject quote"
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => handleView(quote)}
                          className="flex items-center gap-2 px-3 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                          title="View request details"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
      )}

      {/* Notes Modal */}
      {showNoteModal && selectedQuote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="border-b pb-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <StickyNote className="w-5 h-5" />
                  Add Note
                </h3>
                <button
                  onClick={() => {
                    setShowNoteModal(false);
                    setSelectedQuote(null);
                    setCurrentNote('');
                    setIsReminderNote(false);
                    setReminderDate('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardBody className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Note for: {selectedQuote.customer.fullName}
                  </label>
                  <textarea
                    value={currentNote}
                    onChange={(e) => setCurrentNote(e.target.value)}
                    placeholder="Add your private note about this quote..."
                    className="w-full px-4 py-3 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-zain-500 focus:border-zain-500"
                    rows={4}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isReminderNote}
                    onChange={(e) => setIsReminderNote(e.target.checked)}
                    className="w-4 h-4 text-zain-600 border-gray-300 rounded focus:ring-zain-500"
                    id="isReminder"
                  />
                  <label htmlFor="isReminder" className="text-sm font-semibold text-gray-700">
                    Set as reminder
                  </label>
                </div>

                {isReminderNote && (
                  <div>
                    <label htmlFor="reminderDateTime" className="block text-sm font-semibold text-gray-700 mb-2">
                      Reminder Date & Time
                    </label>
                    <input
                      id="reminderDateTime"
                      type="datetime-local"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      className="w-full px-4 py-2 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-zain-500 focus:border-zain-500"
                      aria-label="Reminder date and time"
                    />
                  </div>
                )}

                {/* Show existing notes */}
                {selectedQuote.assignment?.agentNotes && selectedQuote.assignment.agentNotes.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Previous Notes:</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedQuote.assignment.agentNotes.map((note, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded-lg text-sm">
                          <p className="text-gray-700">{note.noteText}</p>
                          {note.isReminder && note.reminderDate && (
                            <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                              <Bell className="w-3 h-3" />
                              Reminder: {new Date(note.reminderDate).toLocaleString()}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(note.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowNoteModal(false);
                    setSelectedQuote(null);
                    setCurrentNote('');
                    setIsReminderNote(false);
                    setReminderDate('');
                  }}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNote}
                  disabled={!currentNote.trim()}
                  className="px-4 py-2 text-sm font-semibold bg-zain-600 text-white rounded-lg hover:bg-zain-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Note
                </button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Claim Modal */}
      {showClaimModal && selectedQuote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Claim Quote</h3>
            </CardHeader>
            <CardBody className="p-4">
              <p className="text-gray-700 mb-4">
                Are you sure you want to claim this quote for <strong>{selectedQuote.customer.fullName}</strong>?
              </p>
              <p className="text-sm text-gray-500 mb-4">
                The claim time will be recorded for SLA and KPI tracking.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowClaimModal(false);
                    setSelectedQuote(null);
                  }}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmClaim}
                  className="px-4 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                >
                  Confirm Claim
                </button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedQuote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Reject Quote</h3>
            </CardHeader>
            <CardBody className="p-4">
              <p className="text-gray-700 mb-4">
                Rejecting quote for <strong>{selectedQuote.customer.fullName}</strong>
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Rejection Reason *
                  </label>
                  <select
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value as RejectionReason)}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    aria-label="Select rejection reason"
                  >
                    <option value={RejectionReason.NO_ANSWER}>No Answer</option>
                    <option value={RejectionReason.CONTACTED_IN_WHATSAPP}>Contacted in WhatsApp</option>
                    <option value={RejectionReason.ALREADY_INSURED}>Already Insured</option>
                    <option value={RejectionReason.DROPPED_THE_CALL}>Dropped the call</option>
                    <option value={RejectionReason.NOT_INTERESTED}>Not Interested</option>
                    <option value={RejectionReason.CUSTOMER_DECLINED_TO_PROCEED}>Customer Declined to Proceed</option>
                    <option value={RejectionReason.OFFER_REJECTED}>Offer Rejected</option>
                    <option value={RejectionReason.WILL_THINK_ABOUT_IT}>Will Think About It</option>
                    <option value={RejectionReason.FIND_BETTER_OFFER}>Find better offer</option>
                    <option value={RejectionReason.AWAITING_CUSTOMER_DECISION}>Awaiting Customer Decision</option>
                    <option value={RejectionReason.CUSTOMER_WILL_CALL_BACK_LATER}>Customer Will Call Back Later</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={rejectionNote}
                    onChange={(e) => setRejectionNote(e.target.value)}
                    rows={3}
                    placeholder="Add any additional details..."
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedQuote(null);
                    setRejectionReason(RejectionReason.NO_ANSWER);
                    setRejectionNote('');
                  }}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReject}
                  className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                >
                  Confirm Rejection
                </button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedQuote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <Card className="w-full max-w-4xl my-8">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Quote #{selectedQuote.quoteReference || selectedQuote.id.slice(0, 8)}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getQuoteStatusBadge(selectedQuote.status)}
                    {selectedQuote.assignment && getStatusBadge(selectedQuote.assignment.status)}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedQuote(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  title="Close modal"
                  aria-label="Close modal"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </CardHeader>
            <CardBody className="p-6 max-h-[75vh] overflow-y-auto">
              {/* Quote Overview */}
              <div className="mb-6 p-4 bg-gradient-to-r from-zain-50 to-blue-50 rounded-lg border border-zain-200">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Insurance Type</p>
                    <p className="font-bold text-gray-900">{selectedQuote.insuranceType}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Source</p>
                    <p className="font-bold text-gray-900">{selectedQuote.source}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Created</p>
                    <p className="font-bold text-gray-900">{new Date(selectedQuote.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Customer Details */}
              <div className="mb-6">
                <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-5 h-5 text-zain-600" />
                  Customer Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm bg-white p-4 rounded-lg border">
                  <div>
                    <p className="text-gray-500 text-xs">Full Name</p>
                    <p className="font-semibold text-gray-900">{selectedQuote.customer.fullName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Mobile</p>
                    <p className="font-semibold text-gray-900">{selectedQuote.customer.mobile}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">CPR</p>
                    <p className="font-semibold text-gray-900">{selectedQuote.customer.cpr}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Email</p>
                    <p className="font-semibold text-gray-900">{selectedQuote.customer.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Customer Type</p>
                    <p className="font-semibold text-gray-900">{selectedQuote.customer.type}</p>
                  </div>
                  {selectedQuote.subscriberNumber && (
                    <div>
                      <p className="text-gray-500 text-xs">Zain Subscriber #</p>
                      <p className="font-semibold text-gray-900">{selectedQuote.subscriberNumber}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle/Travel Details */}
              {selectedQuote.insuranceType === 'MOTOR' && selectedQuote.vehicle && (
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Car className="w-5 h-5 text-zain-600" />
                    Vehicle Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm bg-white p-4 rounded-lg border">
                    <div>
                      <p className="text-gray-500 text-xs">Plate Number</p>
                      <p className="font-semibold text-gray-900">{selectedQuote.vehicle.plateNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Chassis Number</p>
                      <p className="font-semibold text-gray-900">{selectedQuote.vehicle.chassisNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Make & Model</p>
                      <p className="font-semibold text-gray-900">{selectedQuote.vehicle.make} {selectedQuote.vehicle.model}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Year</p>
                      <p className="font-semibold text-gray-900">{selectedQuote.vehicle.year}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Vehicle Value</p>
                      <p className="font-semibold text-gray-900">BHD {selectedQuote.vehicle.value.toLocaleString()}</p>
                    </div>
                    {selectedQuote.vehicle.bodyType && (
                      <div>
                        <p className="text-gray-500 text-xs">Body Type</p>
                        <p className="font-semibold text-gray-900">{selectedQuote.vehicle.bodyType}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedQuote.insuranceType === 'TRAVEL' && selectedQuote.travelCriteria && (
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Plane className="w-5 h-5 text-zain-600" />
                    Travel Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm bg-white p-4 rounded-lg border">
                    <div>
                      <p className="text-gray-500 text-xs">Travel Type</p>
                      <p className="font-semibold text-gray-900">{selectedQuote.travelCriteria.type}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Destination</p>
                      <p className="font-semibold text-gray-900">{selectedQuote.travelCriteria.destination}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Departure Date</p>
                      <p className="font-semibold text-gray-900">{new Date(selectedQuote.travelCriteria.departureDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Return Date</p>
                      <p className="font-semibold text-gray-900">{new Date(selectedQuote.travelCriteria.returnDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Adults</p>
                      <p className="font-semibold text-gray-900">{selectedQuote.travelCriteria.adultsCount}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Children</p>
                      <p className="font-semibold text-gray-900">{selectedQuote.travelCriteria.childrenCount}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Risk Factors - Only for Motor Insurance */}
              {selectedQuote.insuranceType === 'MOTOR' && selectedQuote.riskFactors && (
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    Risk Factors
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className={`p-3 rounded-lg border ${selectedQuote.riskFactors.ageUnder24 ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-gray-200'}`}>
                      <p className="font-semibold">{selectedQuote.riskFactors.ageUnder24 ? '⚠️ Age Under 24' : '✓ Age 24 or Above'}</p>
                    </div>
                    <div className={`p-3 rounded-lg border ${selectedQuote.riskFactors.licenseUnder1Year ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-gray-200'}`}>
                      <p className="font-semibold">{selectedQuote.riskFactors.licenseUnder1Year ? '⚠️ License Under 1 Year' : '✓ License 1+ Year'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Selected Plan */}
              {selectedQuote.selectedPlanId && (
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Selected Plan
                  </h4>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">Provider</p>
                        <p className="font-bold text-gray-900">{selectedQuote.provider || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Plan Name</p>
                        <p className="font-bold text-gray-900">{selectedQuote.planName || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Assignment Details */}
              {selectedQuote.assignment && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-lg font-bold text-gray-900 mb-3">Assignment Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 text-xs">Assigned By</p>
                      <p className="font-semibold text-gray-900">{selectedQuote.assignment.assignedByAgentName}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Assigned To</p>
                      <p className="font-semibold text-gray-900">{selectedQuote.assignment.assignedToAgentName}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Assigned Date</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(selectedQuote.assignment.assignedAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Status</p>
                      {getStatusBadge(selectedQuote.assignment.status)}
                    </div>
                    {selectedQuote.assignment.claimedAt && (
                      <div>
                        <p className="text-gray-500 text-xs">Claimed Date</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(selectedQuote.assignment.claimedAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {selectedQuote.assignment.rejectionReason && (
                      <>
                        <div className="col-span-2">
                          <p className="text-gray-500 text-xs">Rejection Reason</p>
                          <p className="font-semibold text-red-700">{selectedQuote.assignment.rejectionReason}</p>
                        </div>
                        {selectedQuote.assignment.rejectionNote && (
                          <div className="col-span-2">
                            <p className="text-gray-500 text-xs">Rejection Note</p>
                            <p className="font-semibold text-gray-900">{selectedQuote.assignment.rejectionNote}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Agent Notes Section */}
              {selectedQuote.assignment && (
                <div className="mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <StickyNote className="w-5 h-5 text-amber-600" />
                      Notes
                    </h4>
                    <button
                      onClick={() => {
                        setShowViewModal(false);
                        setShowNoteModal(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all"
                    >
                      <StickyNote className="w-3 h-3" />
                      Add Note
                    </button>
                  </div>
                  {selectedQuote.assignment.agentNotes && selectedQuote.assignment.agentNotes.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {selectedQuote.assignment.agentNotes.map((note, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-lg border border-amber-200">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-sm text-gray-700 flex-1">{note.noteText}</p>
                            {note.isReminder && (
                              <span className="flex-shrink-0 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full flex items-center gap-1">
                                <Bell className="w-3 h-3" />
                                Reminder
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>By {note.createdBy || 'Agent'}</span>
                            <span>{new Date(note.createdAt).toLocaleString()}</span>
                          </div>
                          {note.isReminder && note.reminderDate && (
                            <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Reminder: {new Date(note.reminderDate).toLocaleString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No notes yet. Click &quot;Add Note&quot; to add one.</p>
                  )}
                </div>
              )}

              {/* History Log */}
              {selectedQuote.assignmentHistory && selectedQuote.assignmentHistory.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-3">Activity History</h4>
                  <div className="space-y-3">
                    {selectedQuote.assignmentHistory.map((entry: AssignmentHistoryEntry) => (
                      <div key={entry.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0 mt-1">
                          {entry.action === 'ASSIGNED' && <Target className="w-5 h-5 text-yellow-600" />}
                          {entry.action === 'CLAIMED' && <CheckCircle className="w-5 h-5 text-green-600" />}
                          {entry.action === 'REJECTED' && <XCircle className="w-5 h-5 text-red-600" />}
                          {entry.action === 'EDITED' && <Edit className="w-5 h-5 text-blue-600" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-gray-900">{entry.action}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(entry.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <p className="text-sm text-gray-600">{entry.details}</p>
                          <p className="text-xs text-gray-500 mt-1">by {entry.performedByName}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setSelectedQuote(null);
                  }}
                  className="px-4 py-2 text-sm font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
                >
                  Close
                </button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">Assign Quotes to Agent</h3>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedAgentId('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                  title="Close modal"
                  aria-label="Close modal"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </CardHeader>
            <CardBody className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-4">
                  Assigning <strong>{selectedQuotesForAssignment.size}</strong> quote(s) to an agent.
                </p>
                
                <label htmlFor="agentSelect" className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Agent
                </label>
                <select
                  id="agentSelect"
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-zain-500 focus:border-zain-500"
                  aria-label="Select agent for assignment"
                >
                  <option value="">Choose an agent...</option>
                  {availableAgents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.fullName} ({agent.roles.join(', ')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end mt-6">
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
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                    selectedAgentId
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Confirm Assignment
                </button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedQuote && (
        <EditQuoteModal 
          quote={selectedQuote}
          onClose={() => {
            setShowEditModal(false);
            setSelectedQuote(null);
          }}
          onUpdate={async () => {
            await loadQuotes();
          }}
          userRole={userRole}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
        />
      )}
    </div>
  );
};
