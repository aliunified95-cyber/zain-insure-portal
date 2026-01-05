
import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Send, Download, Search, Edit, Filter, Car, User, RefreshCw, ExternalLink, Clock, X, Smartphone, MousePointer, Eye, CheckCircle, ArrowRight, Play, Loader2, UserCircle, MessageSquare } from 'lucide-react';
import { getRecentQuotes, checkLinkStatus, updateQuote } from '../../services/mockApi';
import { QuoteStatus, QuoteRequest, InsuranceType, TrackingEvent, UserRole, LeadDisposition } from '../../types';
import { EditQuoteModal } from './EditQuoteModal';

interface RecentChecksPageProps {
  onNavigateToQuote: (quoteId?: string, referralData?: any) => void;
  userRole?: UserRole;
}

const LinkTrackingModal: React.FC<{ quote: QuoteRequest, onClose: () => void }> = ({ quote, onClose }) => {
  const events = quote.trackingHistory || [];
  
  const getIcon = (status: string) => {
      switch(status) {
          case 'SENT': return <Send className="w-4 h-4 text-blue-500" />;
          case 'DELIVERED': return <Smartphone className="w-4 h-4 text-gray-500" />;
          case 'OPENED': return <Eye className="w-4 h-4 text-amber-500" />;
          case 'CLICKED': return <MousePointer className="w-4 h-4 text-purple-500" />;
          case 'EXPIRED': return <X className="w-4 h-4 text-red-500" />;
          default: return <Clock className="w-4 h-4 text-gray-400" />;
      }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-900">Link Activity Timeline</h3>
                <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full"><X className="w-5 h-5 text-gray-500"/></button>
            </div>
            <div className="p-6">
                <div className="flex items-center gap-3 mb-6 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="text-sm">
                        <p className="text-gray-500 text-xs">Tracking ID</p>
                        <p className="font-mono font-medium text-blue-700">{quote.quoteReference || quote.id.slice(0, 8)}</p>
                    </div>
                    <div className="h-8 w-px bg-blue-200"></div>
                    <div className="text-sm">
                        <p className="text-gray-500 text-xs">Current Status</p>
                        <p className="font-bold text-gray-900">{quote.status.replace('_', ' ')}</p>
                    </div>
                </div>

                <div className="relative border-l-2 border-gray-100 ml-3 space-y-8">
                    {events.length === 0 ? (
                        <p className="text-sm text-gray-500 pl-6 italic">No tracking data available yet.</p>
                    ) : (
                        events.map((event, idx) => (
                            <div key={idx} className="relative pl-8">
                                <div className="absolute -left-[9px] top-0 bg-white border border-gray-200 p-1 rounded-full">
                                    {getIcon(event.status)}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-gray-900">{event.status}</span>
                                    <span className="text-xs text-gray-500">{event.details}</span>
                                    <span className="text-xs text-gray-400 mt-1">{new Date(event.timestamp).toLocaleString()}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

const DispositionModal: React.FC<{ quote: QuoteRequest, onClose: () => void, onUpdate: () => void }> = ({ quote, onClose, onUpdate }) => {
    const [selected, setSelected] = useState<LeadDisposition>(quote.leadDisposition || LeadDisposition.NEW);
    const [saving, setSaving] = useState(false);

    const dispositionOptions: { value: LeadDisposition, label: string }[] = [
        { value: LeadDisposition.NO_ANSWER, label: 'No Answer' },
        { value: LeadDisposition.WHATSAPP_CONTACTED, label: 'Contacted in WhatsApp' },
        { value: LeadDisposition.ALREADY_INSURED, label: 'Already Insured' },
        { value: LeadDisposition.DROPPED_CALL, label: 'Dropped the call' },
        { value: LeadDisposition.NOT_INTERESTED, label: 'Not Interested' },
        { value: LeadDisposition.DECLINED, label: 'Customer Declined to Proceed' },
        { value: LeadDisposition.OFFER_REJECTED, label: 'Offer Rejected' },
        { value: LeadDisposition.THINKING, label: 'Will Think About It' },
        { value: LeadDisposition.BETTER_OFFER, label: 'Find better offer' },
        { value: LeadDisposition.AWAITING_DECISION, label: 'Awaiting Customer Decision' },
        { value: LeadDisposition.CALL_BACK_LATER, label: 'Customer Will Call Back Later' },
        { value: LeadDisposition.PROCESSING, label: 'Processing Pending' },
        { value: LeadDisposition.SUCCESSFUL, label: 'Successful' },
    ];

    const handleSave = async () => {
        setSaving(true);
        const updated = { ...quote, leadDisposition: selected };
        await updateQuote(updated);
        setSaving(false);
        onUpdate();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-900">Update Lead Status</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full"><X className="w-5 h-5 text-gray-500"/></button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-500">
                        Update the interaction status for customer <strong>{quote.customer.fullName}</strong>.
                    </p>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Disposition Reason</label>
                        <select 
                            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-zain-500"
                            value={selected}
                            onChange={(e) => setSelected(e.target.value as LeadDisposition)}
                        >
                            <option value={LeadDisposition.NEW}>New / Uncontacted</option>
                            {dispositionOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <button onClick={onClose} className="px-4 py-2 text-gray-600 font-medium">Cancel</button>
                        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-zain-600 text-white rounded-lg font-medium flex items-center">
                            {saving && <Loader2 className="w-3 h-3 animate-spin mr-2"/>} Save Update
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const RecentChecksPage: React.FC<RecentChecksPageProps> = ({ onNavigateToQuote, userRole = 'JUNIOR_AGENT' }) => {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingQuote, setEditingQuote] = useState<QuoteRequest | null>(null);
  const [checkingStatus, setCheckingStatus] = useState<string | null>(null);
  const [trackingQuote, setTrackingQuote] = useState<QuoteRequest | null>(null);
  const [dispositionQuote, setDispositionQuote] = useState<QuoteRequest | null>(null);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [agentFilter, setAgentFilter] = useState<string>('ALL');
  
  // View Toggle State: 'AUTO', 'VEHICLE', 'PERSON'
  const [subjectView, setSubjectView] = useState<'AUTO' | 'VEHICLE' | 'PERSON'>('AUTO');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const data = await getRecentQuotes();
    setQuotes(data);
    setLoading(false);
  };

  const getStatusColor = (status: QuoteStatus) => {
    switch(status) {
      case QuoteStatus.ISSUED: return 'bg-green-100 text-green-700';
      case QuoteStatus.LINK_SENT: return 'bg-blue-100 text-blue-700';
      case QuoteStatus.LINK_CLICKED: return 'bg-purple-100 text-purple-700';
      case QuoteStatus.PAYMENT_PENDING: return 'bg-yellow-100 text-yellow-700';
      case QuoteStatus.DRAFT: return 'bg-gray-100 text-gray-600 border border-gray-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateInput: Date | string) => {
    try {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return date.toLocaleDateString();
    } catch {
        return 'Invalid Date';
    }
  };

  const handleEditClick = (quote: QuoteRequest) => {
      // Open modal for all types, as logic for draft vs others is now handled inside EditQuoteModal
      setEditingQuote(quote);
  };

  const handleUpdateSuccess = async () => {
    const data = await getRecentQuotes();
    setQuotes(data);
  };

  const handleCheckStatus = async (quoteId: string) => {
    setCheckingStatus(quoteId);
    const newStatus = await checkLinkStatus(quoteId);
    
    // Simulate updating history
    const updatedQuotes = quotes.map(q => {
        if (q.id === quoteId) {
            const updatedHistory = [...(q.trackingHistory || [])];
            // If status changed to clicked, add event if not exists
            if (newStatus === QuoteStatus.LINK_CLICKED && q.status !== QuoteStatus.LINK_CLICKED) {
                updatedHistory.push({
                    status: 'CLICKED',
                    timestamp: new Date(),
                    details: 'User clicked link from recent check'
                });
            }
            return { ...q, status: newStatus, trackingHistory: updatedHistory };
        }
        return q;
    });
    
    setQuotes(updatedQuotes);
    setCheckingStatus(null);
  };

  // Extract unique agents for filter
  const uniqueAgents = Array.from(new Set(quotes.map(q => q.agentName || 'Unknown Agent'))).sort();

  // Filter Logic
  const filteredQuotes = quotes.filter(quote => {
    const matchesSearch = 
      quote.customer.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (quote.quoteReference || quote.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.customer.cpr.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'ALL' || quote.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || quote.insuranceType === typeFilter;
    const matchesAgent = agentFilter === 'ALL' || (quote.agentName || 'Unknown Agent') === agentFilter;

    return matchesSearch && matchesStatus && matchesType && matchesAgent;
  });

  const renderSubjectCell = (quote: QuoteRequest) => {
    // Determine what to show based on Toggle state and Insurance Type
    let showVehicle = false;

    if (subjectView === 'VEHICLE') {
        showVehicle = true;
    } else if (subjectView === 'PERSON') {
        showVehicle = false;
    } else {
        // AUTO mode
        showVehicle = quote.insuranceType === InsuranceType.MOTOR;
    }

    if (showVehicle) {
        if (!quote.vehicle || (!quote.vehicle.make && !quote.vehicle.plateNumber)) {
            return <span className="text-gray-400 italic text-xs">N/A</span>;
        }
        return (
            <>
                <div className="text-sm text-gray-900 font-medium flex items-center gap-1">
                     <Car className="w-3 h-3 text-gray-400" /> {quote.vehicle.make} {quote.vehicle.model}
                </div>
                <div className="text-xs text-gray-500">{quote.vehicle.plateNumber}</div>
            </>
        );
    } else {
        // Show Person (Beneficiary or Customer fallback)
        const personName = quote.beneficiary?.fullName || quote.customer.fullName;
        const personId = quote.beneficiary?.cpr || quote.customer.cpr;
        
        return (
            <>
                <div className="text-sm text-gray-900 font-medium flex items-center gap-1">
                    <User className="w-3 h-3 text-gray-400" /> {personName}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="opacity-75">ID:</span> {personId}
                </div>
            </>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-900">Queries</h2>
           <p className="text-sm text-gray-500 mt-1">Manage all insurance quotes and applications.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
             {/* Search */}
             <div className="relative flex-1 sm:w-64">
                 <input 
                    type="text" 
                    placeholder="Search queries..." 
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-zain-500" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                 />
                 <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
             </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center animate-in slide-in-from-top-2">
         <div className="flex items-center text-gray-500 text-sm font-medium">
            <Filter className="w-4 h-4 mr-2" /> Filters:
         </div>
         
         <select 
            className="text-sm border-gray-300 border rounded-md py-1.5 pl-3 pr-8 focus:ring-zain-500 focus:border-zain-500"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
         >
            <option value="ALL">All Types</option>
            <option value={InsuranceType.MOTOR}>Motor</option>
            <option value={InsuranceType.TRAVEL}>Travel</option>
            {/* ... other types */}
         </select>

         <select 
            className="text-sm border-gray-300 border rounded-md py-1.5 pl-3 pr-8 focus:ring-zain-500 focus:border-zain-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
         >
            <option value="ALL">All Statuses</option>
            <option value={QuoteStatus.DRAFT}>Draft</option>
            <option value={QuoteStatus.LINK_SENT}>Link Sent</option>
            <option value={QuoteStatus.LINK_CLICKED}>Link Clicked</option>
            <option value={QuoteStatus.ISSUED}>Issued</option>
            <option value={QuoteStatus.PAYMENT_PENDING}>Payment Pending</option>
         </select>
         
         <select 
            className="text-sm border-gray-300 border rounded-md py-1.5 pl-3 pr-8 focus:ring-zain-500 focus:border-zain-500"
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
         >
            <option value="ALL">All Agents</option>
            {uniqueAgents.map(agent => (
                <option key={agent} value={agent}>{agent}</option>
            ))}
         </select>

         {(typeFilter !== 'ALL' || statusFilter !== 'ALL' || agentFilter !== 'ALL' || searchTerm) && (
            <button 
                onClick={() => { setTypeFilter('ALL'); setStatusFilter('ALL'); setAgentFilter('ALL'); setSearchTerm(''); }}
                className="text-sm text-red-600 hover:text-red-800 ml-auto"
            >
                Clear Filters
            </button>
         )}
      </div>

      <Card>
        <CardBody className="p-0 overflow-x-auto">
          {loading ? (
             <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                 <Loader2 className="w-8 h-8 animate-spin mb-2" />
                 <p>Loading records...</p>
             </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference No.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                          <span>Details</span>
                          <div className="flex bg-gray-200 rounded p-0.5">
                              <button 
                                  onClick={() => setSubjectView('VEHICLE')}
                                  className={`p-1 rounded text-[10px] font-bold leading-none ${subjectView === 'VEHICLE' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-700'}`}
                                  title="Show Vehicle"
                              >
                                  <Car className="w-3 h-3" />
                              </button>
                              <button 
                                  onClick={() => setSubjectView('AUTO')}
                                  className={`p-1 rounded text-[10px] font-bold leading-none ${subjectView === 'AUTO' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-700'}`}
                                  title="Auto Detect"
                              >
                                  A
                              </button>
                              <button 
                                  onClick={() => setSubjectView('PERSON')}
                                  className={`p-1 rounded text-[10px] font-bold leading-none ${subjectView === 'PERSON' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-gray-700'}`}
                                  title="Show Person/Beneficiary"
                              >
                                  <User className="w-3 h-3" />
                              </button>
                          </div>
                      </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredQuotes.length > 0 ? (
                    filteredQuotes.map((quote) => (
                      <tr key={quote.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(quote.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 flex items-center gap-2">
                           <UserCircle className="w-4 h-4 text-gray-400" /> {quote.agentName || 'Unknown Agent'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                           <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                               {quote.insuranceType}
                           </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{quote.customer.fullName}</div>
                          <div className="text-xs text-gray-500">{quote.customer.cpr}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                          {quote.quoteReference || quote.id.slice(0, 8) + '...'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                           {renderSubjectCell(quote)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {quote.planName || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col items-start">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(quote.status)}`}>
                                {quote.status.replace('_', ' ')}
                              </span>
                              {(quote.status === QuoteStatus.LINK_SENT || quote.status === QuoteStatus.LINK_CLICKED) && (
                                  <button 
                                      onClick={() => setTrackingQuote(quote)}
                                      className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline mt-1 font-medium flex items-center"
                                  >
                                      <Clock className="w-3 h-3 mr-0.5" /> View Timeline
                                  </button>
                              )}
                              {quote.leadDisposition && quote.status === QuoteStatus.DRAFT && (
                                  <span className="text-[10px] text-gray-500 mt-1 italic">
                                      {quote.leadDisposition.replace(/_/g, ' ')}
                                  </span>
                              )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {quote.status === QuoteStatus.ISSUED && (
                               <button className="text-zain-600 hover:text-zain-800" title="Download Policy">
                                 <Download className="w-4 h-4" />
                               </button>
                             )}
                             {(quote.status === QuoteStatus.LINK_SENT || quote.status === QuoteStatus.LINK_CLICKED) && (
                               <>
                               <button className="text-blue-600 hover:text-blue-800" title="Resend Link">
                                 <Send className="w-4 h-4" />
                               </button>
                               <button 
                                  onClick={() => handleCheckStatus(quote.id)}
                                  className="text-gray-500 hover:text-gray-700 ml-2"
                                  title="Check Link Status"
                                  disabled={checkingStatus === quote.id}
                               >
                                  <RefreshCw className={`w-4 h-4 ${checkingStatus === quote.id ? 'animate-spin' : ''}`} />
                               </button>
                               </>
                             )}
                             
                             {quote.status === QuoteStatus.DRAFT && (
                                 <button 
                                    onClick={() => setDispositionQuote(quote)}
                                    className="text-amber-600 hover:text-amber-800"
                                    title="Update Lead Status"
                                 >
                                     <MessageSquare className="w-4 h-4" />
                                 </button>
                             )}

                             <button 
                              onClick={() => handleEditClick(quote)}
                              className={`${quote.status === QuoteStatus.DRAFT ? 'text-zain-600 hover:text-zain-800' : 'text-gray-500 hover:text-gray-700'} ml-1`}
                              title={quote.status === QuoteStatus.DRAFT ? "Continue Quote" : "Edit Quote"}
                             >
                               {quote.status === QuoteStatus.DRAFT ? <ArrowRight className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                             </button>
                          </div>
                        </td>
                      </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                            No queries found matching your filters.
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>

      {/* Edit Modal */}
      {editingQuote && (
        <EditQuoteModal 
          quote={editingQuote} 
          onClose={() => setEditingQuote(null)} 
          onUpdate={handleUpdateSuccess} 
          userRole={userRole}
        />
      )}

      {/* Tracking Modal */}
      {trackingQuote && (
          <LinkTrackingModal 
            quote={trackingQuote}
            onClose={() => setTrackingQuote(null)}
          />
      )}

      {/* Disposition Modal */}
      {dispositionQuote && (
          <DispositionModal 
            quote={dispositionQuote}
            onClose={() => setDispositionQuote(null)}
            onUpdate={fetchData}
          />
      )}
    </div>
  );
};
