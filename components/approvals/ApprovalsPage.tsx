
import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Check, X, Clock, Car, Loader2, Eye, User, FileText, AlertCircle, Shield, TrendingUp, CheckCircle, XCircle, Plane, MapPin, Calendar, Users as UsersIcon, Target, StickyNote } from 'lucide-react';
import { getRecentQuotes, processApproval, fetchCreditProfile } from '../../services/mockApi';
import { QuoteStatus, QuoteRequest, AssignmentStatus, AssignmentHistoryEntry } from '../../types';

// Modal for Detailed Approval View
interface ApprovalModalProps {
    request: QuoteRequest;
    onClose: () => void;
    onProcess: (id: string, approved: boolean) => Promise<void>;
}

const ApprovalModal: React.FC<ApprovalModalProps> = ({ request, onClose, onProcess }) => {
    const [profile, setProfile] = useState<any>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const load = async () => {
            const data = await fetchCreditProfile(request.customer.cpr);
            setProfile(data);
            setLoadingProfile(false);
        };
        load();
    }, [request]);

    const handleAction = async (approved: boolean) => {
        setProcessing(true);
        await onProcess(request.id, approved);
        setProcessing(false);
        onClose();
    };
    
    // Check if already processed (view only mode)
    const isProcessed = request.status === QuoteStatus.APPROVAL_GRANTED || request.status === QuoteStatus.APPROVAL_REJECTED;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in">
                <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-zain-50 to-white">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                        <Shield className="w-5 h-5 text-zain-600" /> Exception Request: {request.quoteReference || request.id.slice(0, 8)}
                    </h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors" aria-label="Close modal"><X className="w-4 h-4 text-gray-500" /></button>
                </div>
                
                <div className="p-3 overflow-y-auto space-y-3">
                    {/* Top Section: Request Reason */}
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-3 rounded-xl border-2 border-amber-200 flex gap-2 shadow-md">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-amber-900 text-xs mb-1">Installment Exception Required</h4>
                            <p className="text-amber-800 text-xs leading-relaxed">
                                Agent <strong>{request.agentName || 'Unknown'}</strong> has requested an exception for installment payment despite system ineligibility.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Quote Details */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-900 uppercase border-b pb-1.5">Quote Details</h4>
                            <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Vehicle:</span>
                                    <span className="font-medium text-right">{request.vehicle.make} {request.vehicle.model} ({request.vehicle.year})</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Value:</span>
                                    <span className="font-medium">BHD {request.vehicle.value.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Plan:</span>
                                    <span className="font-medium">{request.planName || 'Comprehensive'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Customer Profile (Simulated API Fetch) */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-gray-900 uppercase border-b pb-1.5">Credit Control Profile</h4>
                            {loadingProfile ? (
                                <div className="flex flex-col items-center justify-center py-3 text-gray-400">
                                    <Loader2 className="w-5 h-5 animate-spin mb-1.5" />
                                    <span className="text-xs">Fetching Credit Bureau...</span>
                                </div>
                            ) : (
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                        <span className="text-gray-500">Credit Score</span>
                                        <span className={`font-bold px-2 py-0.5 rounded ${profile.creditScore > 650 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {profile.creditScore}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Zain Tenure</span>
                                        <span className="font-medium">{profile.zainTenure}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Bill History</span>
                                        <span className={`font-medium ${profile.paymentHistory === 'GOOD' ? 'text-green-600' : 'text-red-600'}`}>
                                            {profile.paymentHistory}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Outstanding</span>
                                        <span className="font-medium">BHD {profile.outstandingBill}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Risk Assessment</span>
                                        <span className={`font-bold ${profile.riskLevel === 'LOW' ? 'text-green-600' : 'text-red-600'}`}>
                                            {profile.riskLevel}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Customer Information */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <h4 className="text-xs font-bold text-gray-900 uppercase border-b pb-1.5 mb-2">Customer Information</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <span className="text-gray-500">Full Name:</span>
                                <p className="font-semibold">{request.customer.fullName}</p>
                            </div>
                            <div>
                                <span className="text-gray-500">CPR:</span>
                                <p className="font-semibold">{request.customer.cpr}</p>
                            </div>
                            <div>
                                <span className="text-gray-500">Mobile:</span>
                                <p className="font-semibold">{request.customer.mobile}</p>
                            </div>
                            <div>
                                <span className="text-gray-500">Email:</span>
                                <p className="font-semibold text-xs">{request.customer.email}</p>
                            </div>
                        </div>
                    </div>

                    {/* Vehicle/Travel Details */}
                    {request.insuranceType === 'MOTOR' && request.vehicle && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <h4 className="text-xs font-bold text-gray-900 uppercase border-b pb-1.5 mb-2 flex items-center gap-1.5">
                                <Car className="w-3.5 h-3.5" /> Vehicle Details
                            </h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="text-gray-500">Make & Model:</span>
                                    <p className="font-semibold">{request.vehicle.make} {request.vehicle.model}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Year:</span>
                                    <p className="font-semibold">{request.vehicle.year}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Plate Number:</span>
                                    <p className="font-semibold">{request.vehicle.plateNumber}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Value:</span>
                                    <p className="font-semibold">BHD {request.vehicle.value.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {request.insuranceType === 'TRAVEL' && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <h4 className="text-xs font-bold text-gray-900 uppercase border-b pb-1.5 mb-2 flex items-center gap-1.5">
                                <Plane className="w-3.5 h-3.5" /> Travel Details
                            </h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="text-gray-500">Destination:</span>
                                    <p className="font-semibold">{request.destination || 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Travel Type:</span>
                                    <p className="font-semibold">{request.travelType || 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Departure:</span>
                                    <p className="font-semibold">{request.departureDate ? new Date(request.departureDate).toLocaleDateString() : 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Return:</span>
                                    <p className="font-semibold">{request.returnDate ? new Date(request.returnDate).toLocaleDateString() : 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500">Travelers:</span>
                                    <p className="font-semibold">{(request.adultsCount || 0) + (request.childrenCount || 0)} ({request.adultsCount || 0} adults, {request.childrenCount || 0} children)</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Agent Notes Section */}
                    {request.assignment?.agentNotes && request.assignment.agentNotes.length > 0 && (
                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                            <h4 className="text-xs font-bold text-gray-900 uppercase border-b border-amber-200 pb-1.5 mb-2 flex items-center gap-1.5">
                                <StickyNote className="w-3.5 h-3.5 text-amber-600" /> Agent Notes
                            </h4>
                            <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                {request.assignment.agentNotes.map((note, idx) => (
                                    <div key={idx} className="bg-white p-2 rounded-lg border border-amber-200 text-xs">
                                        <p className="text-gray-700 mb-1.5">{note.noteText}</p>
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span>By {note.createdByName || 'Agent'}</span>
                                            <span>{new Date(note.createdAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Assignment History */}
                    {request.assignmentHistory && request.assignmentHistory.length > 0 && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                            <h4 className="text-xs font-bold text-gray-900 uppercase border-b pb-1.5 mb-2">Activity History</h4>
                            <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                {request.assignmentHistory.map((entry: AssignmentHistoryEntry) => (
                                    <div key={entry.id} className="flex gap-2 p-2 bg-white rounded text-xs">
                                        <div className="flex-shrink-0">
                                            {entry.action === 'ASSIGNED' && <Target className="w-3.5 h-3.5 text-yellow-600" />}
                                            {entry.action === 'CLAIMED' && <CheckCircle className="w-3.5 h-3.5 text-green-600" />}
                                            {entry.action === 'REJECTED' && <XCircle className="w-3.5 h-3.5 text-red-600" />}
                                            {entry.action === 'COMPLETED' && <CheckCircle className="w-3.5 h-3.5 text-blue-600" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">{entry.action}</p>
                                            <p className="text-gray-600">By {entry.performedBy}</p>
                                            <p className="text-gray-400">{new Date(entry.timestamp).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
                    <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 font-medium hover:text-gray-800" disabled={processing}>Close</button>
                    {!isProcessed && (
                        <>
                            <button 
                                onClick={() => handleAction(false)} 
                                className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 flex items-center"
                                disabled={processing}
                            >
                                <X className="w-3.5 h-3.5 mr-1.5" /> Reject
                            </button>
                            <button 
                                onClick={() => handleAction(true)} 
                                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center"
                                disabled={processing}
                            >
                                {processing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1.5" />} Approve Request
                            </button>
                        </>
                    )}
                    {isProcessed && (
                        <span className={`px-3 py-1.5 text-sm rounded-lg font-bold flex items-center ${request.status === QuoteStatus.APPROVAL_GRANTED ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {request.status === QuoteStatus.APPROVAL_GRANTED ? 'Approved' : 'Rejected'}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export const ApprovalsPage: React.FC = () => {
    const [requests, setRequests] = useState<QuoteRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<QuoteRequest | null>(null);

    const loadData = async () => {
        setLoading(true);
        const quotes = await getRecentQuotes();
        // Filter for any approval related status
        const approvalQuotes = quotes.filter(q => 
            q.status === QuoteStatus.PENDING_APPROVAL || 
            q.status === QuoteStatus.APPROVAL_GRANTED || 
            q.status === QuoteStatus.APPROVAL_REJECTED
        );
        setRequests(approvalQuotes);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleProcess = async (id: string, approved: boolean) => {
        await processApproval(id, approved);
        await loadData(); // Reload list
    };

    // Helper to safely format dates handling both String and Timestamp objects
    const formatDateTime = (dateVal: string | Date | undefined) => {
        if (!dateVal) return 'recently';
        try {
            const d = new Date(dateVal);
            return isNaN(d.getTime()) ? 'Invalid Date' : d.toLocaleDateString();
        } catch {
            return 'Invalid Date';
        }
    };

    const formatTime = (dateVal: string | Date | undefined) => {
        if (!dateVal) return '';
        try {
            const d = new Date(dateVal);
            return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '';
        }
    };

    // --- Analytics Calculations ---
    const totalRequests = requests.length;
    const pendingRequests = requests.filter(r => r.status === QuoteStatus.PENDING_APPROVAL).length;
    const approvedRequests = requests.filter(r => r.status === QuoteStatus.APPROVAL_GRANTED).length;
    const approvalRate = totalRequests > 0 ? Math.round((approvedRequests / (totalRequests - pendingRequests || 1)) * 100) : 0;
    
    // Average response time
    const handledRequests = requests.filter(r => r.approvalHandledAt);
    let avgResponseMinutes = 0;
    if (handledRequests.length > 0) {
        const totalDiff = handledRequests.reduce((acc, curr) => {
            const created = new Date(curr.createdAt).getTime();
            const handled = new Date(curr.approvalHandledAt!).getTime();
            return acc + (handled - created);
        }, 0);
        avgResponseMinutes = Math.round((totalDiff / handledRequests.length) / 60000);
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Approvals Inbox</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Review pending exception requests and history.</p>
                </div>
                <button onClick={loadData} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors" aria-label="Refresh approvals" title="Refresh">
                    <Loader2 className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Card>
                    <CardBody className="p-3 flex items-center gap-2">
                        <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><FileText className="w-4 h-4"/></div>
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase">Total Requests</p>
                            <h4 className="text-lg font-bold text-gray-900">{totalRequests}</h4>
                        </div>
                    </CardBody>
                </Card>
                <Card>
                    <CardBody className="p-3 flex items-center gap-2">
                        <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg"><Clock className="w-4 h-4"/></div>
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase">Pending</p>
                            <h4 className="text-lg font-bold text-gray-900">{pendingRequests}</h4>
                        </div>
                    </CardBody>
                </Card>
                <Card>
                    <CardBody className="p-3 flex items-center gap-2">
                        <div className="p-1.5 bg-green-100 text-green-600 rounded-lg"><TrendingUp className="w-4 h-4"/></div>
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase">Approval Rate</p>
                            <h4 className="text-lg font-bold text-gray-900">{approvalRate}%</h4>
                        </div>
                    </CardBody>
                </Card>
                <Card>
                    <CardBody className="p-3 flex items-center gap-2">
                        <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg"><Clock className="w-4 h-4"/></div>
                        <div>
                            <p className="text-xs text-gray-500 font-bold uppercase">Avg Response</p>
                            <h4 className="text-lg font-bold text-gray-900">{avgResponseMinutes > 0 ? `${avgResponseMinutes} min` : '-'}</h4>
                        </div>
                    </CardBody>
                </Card>
            </div>

            <Card>
                <CardBody className="p-0">
                    {loading ? (
                        <div className="p-8 text-center text-gray-400">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-1.5" />
                            Loading requests...
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <Check className="w-10 h-10 text-green-500 mx-auto mb-3 bg-green-100 p-2 rounded-full" />
                            <h3 className="text-base font-bold text-gray-900">No History</h3>
                            <p className="text-xs mt-0.5">No approval requests found.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {requests.map(req => {
                                const isPending = req.status === QuoteStatus.PENDING_APPROVAL;
                                const isApproved = req.status === QuoteStatus.APPROVAL_GRANTED;
                                
                                return (
                                <div key={req.id} className={`p-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${!isPending ? 'bg-gray-50/50' : ''}`}>
                                    <div className="flex gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 
                                            ${isPending ? 'bg-blue-100 text-blue-600' : isApproved ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}
                                        `}>
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                                                {req.customer.fullName}
                                                <span className="text-xs font-normal text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {req.quoteReference}
                                                </span>
                                            </h4>
                                            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-3">
                                                <span className="flex items-center gap-1"><Car className="w-3 h-3" /> {req.vehicle.make} {req.vehicle.model}</span>
                                                <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {req.planName}</span>
                                                <span className="flex items-center gap-1"><User className="w-3 h-3" /> Agent: {req.agentName || 'Unknown'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                {isPending ? (
                                                    <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-100 font-bold flex items-center">
                                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Pending Action
                                                    </span>
                                                ) : (
                                                    <span className={`text-xs px-2 py-0.5 rounded border font-bold flex items-center
                                                        ${isApproved ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                                                        {isApproved ? <CheckCircle className="w-3 h-3 mr-1"/> : <XCircle className="w-3 h-3 mr-1"/>}
                                                        {isApproved ? 'Approved' : 'Rejected'}
                                                        {req.approvalHandledAt && <span className="ml-1 font-normal opacity-75">- {formatTime(req.approvalHandledAt)}</span>}
                                                    </span>
                                                )}
                                                <span className="text-xs text-gray-400 flex items-center">
                                                    <Clock className="w-3 h-3 mr-1" /> Requested {formatDateTime(req.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedRequest(req)}
                                        className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors flex items-center shadow-sm
                                            ${isPending ? 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-zain-300' : 'bg-transparent border-transparent text-gray-400 hover:text-gray-600'}
                                        `}
                                    >
                                        <Eye className="w-3.5 h-3.5 mr-1.5" /> {isPending ? 'Review' : 'View Details'}
                                    </button>
                                </div>
                            )})}
                        </div>
                    )}
                </CardBody>
            </Card>

            {selectedRequest && (
                <ApprovalModal 
                    request={selectedRequest} 
                    onClose={() => setSelectedRequest(null)} 
                    onProcess={handleProcess} 
                />
            )}
        </div>
    );
};
