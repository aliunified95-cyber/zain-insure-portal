
import React, { useState, useEffect } from 'react';
import { X, Save, RefreshCw, Upload, Car, User, FileText, Check, Smartphone, Send, Loader2, AlertTriangle, Plane, FileCheck, History, Lock, ShieldAlert, CheckCircle, LayoutGrid, Info, ShieldCheck, Ban, List, AlertCircle } from 'lucide-react';
import { QuoteRequest, InsurancePlan, PaymentMethod, InsuranceType, TravelDestination, TravelType, AuditLogEntry, UserRole, QuoteStatus } from '../../types';
import * as api from '../../services/mockApi';
import { QuickQuoteFlow } from '../quote/QuickQuoteFlow';

interface EditQuoteModalProps {
  quote: QuoteRequest;
  onClose: () => void;
  onUpdate: () => void;
  userRole?: UserRole;
  currentUserId?: string;
  currentUserName?: string;
}

export const EditQuoteModal: React.FC<EditQuoteModalProps> = ({ 
  quote, 
  onClose, 
  onUpdate, 
  userRole = 'JUNIOR_AGENT',
  currentUserId = 'agent-1',
  currentUserName = 'Agent'
}) => {
  // New Tab Structure: Info (Customer), Details (Vehicle), Plans, Docs, Audit
  const [activeTab, setActiveTab] = useState<'info' | 'details' | 'plans' | 'docs' | 'audit'>('info');
  const [formData, setFormData] = useState<QuoteRequest>(JSON.parse(JSON.stringify(quote)));
  const [plans, setPlans] = useState<InsurancePlan[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [exceptionSent, setExceptionSent] = useState(false);

  const availableBodyTypes = ['Sedan', 'SUV', 'Coupe', 'Hatchback', 'Pickup', 'Van', 'Sports'];

  const isIssued = quote.status === QuoteStatus.ISSUED;
  const isDraft = quote.status === QuoteStatus.DRAFT;
  const isApprovalGranted = quote.status === QuoteStatus.APPROVAL_GRANTED;
  const isApprovalPending = quote.status === QuoteStatus.PENDING_APPROVAL;
  const isApprovalRejected = quote.status === QuoteStatus.APPROVAL_REJECTED;

  // Check for critical changes that require re-approval
  // Now includes Risk Factors as they affect pricing
  const hasCriticalChanges = 
    formData.vehicle.value !== quote.vehicle.value || 
    formData.vehicle.make !== quote.vehicle.make ||
    formData.vehicle.model !== quote.vehicle.model ||
    formData.riskFactors?.ageUnder24 !== quote.riskFactors?.ageUnder24 ||
    formData.riskFactors?.licenseUnder1Year !== quote.riskFactors?.licenseUnder1Year;

  const showInvalidationWarning = hasCriticalChanges && (isApprovalGranted || isApprovalPending || isApprovalRejected);

  useEffect(() => {
    if (activeTab === 'plans' && !isDraft) {
        loadPlans();
    }
  }, [activeTab]);

  useEffect(() => {
    // Fetch Audit Logs if tab is audit
    if (activeTab === 'audit') {
        const fetchLogs = async () => {
            const logs = await api.getAuditLogs(quote.id);
            setAuditLogs(logs);
        };
        fetchLogs();
    }
  }, [activeTab]);

  // Auto-calculate End Date when Start Date changes
  useEffect(() => {
      if (formData.startDate) {
          const start = new Date(formData.startDate);
          if (!isNaN(start.getTime())) {
            const end = new Date(start);
            end.setFullYear(end.getFullYear() + 1);
            end.setDate(end.getDate() - 1);
            const endDateStr = end.toISOString().split('T')[0];
            if (endDateStr !== formData.vehicle.policyEndDate) {
                setFormData(prev => ({
                    ...prev,
                    vehicle: { ...prev.vehicle, policyEndDate: endDateStr }
                }));
            }
          }
      }
  }, [formData.startDate]);

  const loadPlans = async () => {
    setLoading(true);
    const rf = formData.riskFactors || { ageUnder24: false, licenseUnder1Year: false };
    const vVal = formData.vehicle?.value || 0;
    const tCrit = formData.travelCriteria;
    const results = await api.generateQuotes(vVal, rf, formData.insuranceType, tCrit);
    setPlans(results);
    setLoading(false);
  };

  const handleSave = async () => {
    if (isIssued) return;
    setSaving(true);

    let updatedData = { ...formData };

    if (showInvalidationWarning) {
        updatedData.status = QuoteStatus.DRAFT;
        updatedData.approvalHandledAt = undefined;
    }

    await api.updateQuote(updatedData);
    await api.logAction(quote.id, 'EDIT_SAVE', 'Agent manually updated quote details', userRole === 'SUPERVISOR' ? 'Supervisor' : 'Agent');
    
    onUpdate();
    onClose();
    setSaving(false);
  };

  const handleUpdateStatusAndSave = async (updates: Partial<QuoteRequest>) => {
    setActionLoading(true);
    const updated = { ...formData, ...updates };
    setFormData(updated);
    await api.updateQuote(updated as QuoteRequest);
    
    if (updates.status === QuoteStatus.PENDING_APPROVAL) setExceptionSent(true);
    if (updates.status === QuoteStatus.LINK_SENT || updates.status === QuoteStatus.PAYMENT_PENDING) setLinkSent(true);

    setActionLoading(false);
    setTimeout(() => {
        onUpdate();
    }, 1000);
  };

  const handleSendLink = async () => {
      const selectedPlan = plans.find(p => p.id === formData.selectedPlanId);
      await api.logAction(quote.id, 'LINK_SENT', `Payment link sent for plan ${selectedPlan?.name}`, userRole === 'SUPERVISOR' ? 'Supervisor' : 'Agent');
      
      await handleUpdateStatusAndSave({
          status: QuoteStatus.PAYMENT_PENDING,
          provider: selectedPlan?.provider,
          planName: selectedPlan?.name
      });
      await api.sendQuoteLink(formData.contactNumberForLink || formData.customer.mobile, 'EXISTING');
  };

  const handleRequestException = async () => {
      const selectedPlan = plans.find(p => p.id === formData.selectedPlanId);
      await api.logAction(quote.id, 'EXCEPTION_REQUEST', `Exception requested for plan ${selectedPlan?.name}`, userRole === 'SUPERVISOR' ? 'Supervisor' : 'Agent');

      await handleUpdateStatusAndSave({
          status: QuoteStatus.PENDING_APPROVAL,
          provider: selectedPlan?.provider,
          planName: selectedPlan?.name
      });
  };

  const handleMarkAsCompleted = async () => {
    if (!isIssued) {
      alert('Policy must be issued before marking as completed.');
      return;
    }
    
    const confirmed = confirm('Are you sure you want to mark this quote as completed? This action confirms the policy has been successfully issued and delivered.');
    if (!confirmed) return;
    
    setActionLoading(true);
    const success = await api.markAsCompleted(quote.id, currentUserId, currentUserName);
    if (success) {
      await api.logAction(quote.id, 'MARKED_COMPLETED', 'Quote marked as completed by agent', currentUserName);
      alert('Quote marked as completed successfully!');
      onUpdate();
      onClose();
    } else {
      alert('Failed to mark quote as completed. Please ensure the policy is issued.');
    }
    setActionLoading(false);
  };

  const isSupervisor = userRole === 'SUPERVISOR';

  if (isDraft) {
     return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Continue Draft #{quote.quoteReference || quote.id.slice(0,6)}</h2>
                        <p className="text-sm text-gray-500">Resume your quote creation process.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors" aria-label="Close draft modal" title="Close">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                    <QuickQuoteFlow 
                        onComplete={() => { onUpdate(); onClose(); }} 
                        initialData={quote}
                        existingQuoteId={quote.id}
                        userRole={userRole}
                    />
                </div>
            </div>
        </div>
     )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
          <div>
            <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900">Edit Query #{formData.quoteReference || formData.id.slice(0,6)}</h2>
                {isIssued && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded">ISSUED</span>}
                {isApprovalGranted && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> APPROVED</span>}
                {isApprovalPending && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> APPROVAL PENDING</span>}
            </div>
            <p className="text-sm text-gray-500">Amend details, compare plans, and manage documents.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors" aria-label="Close edit modal" title="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 overflow-x-auto">
          {['info', 'details', 'plans', 'docs'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-3 px-4 text-sm font-medium border-b-2 capitalize transition-colors whitespace-nowrap ${activeTab === tab ? 'border-zain-600 text-zain-700' : 'border-transparent text-gray-500'}`}
              >
                {tab === 'info' ? 'Customer Info' : tab === 'details' ? 'Vehicle/Trip Details' : tab}
              </button>
          ))}
          <button 
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-4 text-sm font-medium border-b-2 capitalize transition-colors flex items-center gap-1 ${activeTab === 'audit' ? 'border-zain-600 text-zain-700' : 'border-transparent text-gray-500'}`}
          >
            <History className="w-3 h-3" /> Audit Log
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
          
          {/* Warning Banners */}
          {showInvalidationWarning && !isIssued && (activeTab === 'info' || activeTab === 'details') && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 animate-in slide-in-from-top-2">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-800 font-bold">Approval Status will be Reset!</p>
                            <p className="text-sm text-red-700 mt-1">
                                Changing vehicle value, model details, or risk factors invalidates the current approval. 
                                Saving changes will revert this quote to <strong>DRAFT</strong> status, requiring a new approval request.
                            </p>
                        </div>
                    </div>
                </div>
           )}

          {activeTab === 'info' && (
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Customer Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Full Name</label>
                            <input 
                                value={formData.customer.fullName} 
                                disabled={!isSupervisor || isIssued} 
                                className={`w-full p-2 border rounded ${(!isSupervisor || isIssued) ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                onChange={e => setFormData({...formData, customer: {...formData.customer, fullName: e.target.value}})}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Mobile Number</label>
                            <input 
                                value={formData.customer.mobile} 
                                disabled={isIssued} 
                                className={`w-full p-2 border rounded ${isIssued ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`} 
                                onChange={e => setFormData({...formData, customer: {...formData.customer, mobile: e.target.value}})} 
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Email</label>
                            <input 
                                value={formData.customer.email} 
                                disabled={isIssued} 
                                className={`w-full p-2 border rounded ${isIssued ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`} 
                                onChange={e => setFormData({...formData, customer: {...formData.customer, email: e.target.value}})} 
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">CPR / ID</label>
                            <input 
                                value={formData.customer.cpr} 
                                disabled={true} 
                                className="w-full p-2 border rounded bg-gray-100 text-gray-500 cursor-not-allowed"
                                placeholder="CPR / ID Number"
                                aria-label="Customer CPR or ID number"
                            />
                        </div>
                    </div>
                </div>
            </div>
          )}

          {activeTab === 'details' && (
              <div className="space-y-6">
                  {formData.insuranceType === 'MOTOR' ? (
                      <>
                      {/* Vehicle Specs */}
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Vehicle Specifications</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="col-span-2">
                                  <label className="text-xs text-gray-500 mb-1 block">Plate Number</label>
                                  <input 
                                     value={formData.vehicle.plateNumber} 
                                     disabled={isIssued}
                                     onChange={e => setFormData({...formData, vehicle: {...formData.vehicle, plateNumber: e.target.value}})}
                                     className={`w-full p-2 border rounded ${isIssued ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`} 
                                  />
                              </div>
                              <div className="col-span-2">
                                  <label className="text-xs text-gray-500 mb-1 block">Chassis Number</label>
                                  <input 
                                     value={formData.vehicle.chassisNumber || ''} 
                                     disabled={isIssued}
                                     onChange={e => setFormData({...formData, vehicle: {...formData.vehicle, chassisNumber: e.target.value}})}
                                     className={`w-full p-2 border rounded ${isIssued ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`} 
                                  />
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500 mb-1 block">Make</label>
                                  <input 
                                     value={formData.vehicle.make} 
                                     disabled={isIssued}
                                     onChange={e => setFormData({...formData, vehicle: {...formData.vehicle, make: e.target.value}})}
                                     className={`w-full p-2 border rounded ${isIssued ? 'bg-gray-100' : ''}`}
                                  />
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500 mb-1 block">Model</label>
                                  <input 
                                     value={formData.vehicle.model} 
                                     disabled={isIssued}
                                     onChange={e => setFormData({...formData, vehicle: {...formData.vehicle, model: e.target.value}})}
                                     className={`w-full p-2 border rounded ${isIssued ? 'bg-gray-100' : ''}`}
                                  />
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500 mb-1 block">Year</label>
                                  <input 
                                     value={formData.vehicle.year} 
                                     disabled={isIssued}
                                     onChange={e => setFormData({...formData, vehicle: {...formData.vehicle, year: e.target.value}})}
                                     className={`w-full p-2 border rounded ${isIssued ? 'bg-gray-100' : ''}`}
                                  />
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500 mb-1 block">Body Type</label>
                                  <select 
                                      value={formData.vehicle.bodyType || 'Sedan'}
                                      disabled={isIssued}
                                      onChange={e => setFormData({...formData, vehicle: {...formData.vehicle, bodyType: e.target.value}})}
                                      aria-label="Select vehicle body type"
                                      className={`w-full p-2 border rounded ${isIssued ? 'bg-gray-100' : ''}`}
                                  >
                                      {availableBodyTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500 mb-1 block">Engine Size</label>
                                  <input 
                                     value={formData.vehicle.engineSize || ''} 
                                     disabled={isIssued}
                                     onChange={e => setFormData({...formData, vehicle: {...formData.vehicle, engineSize: e.target.value}})}
                                     className={`w-full p-2 border rounded ${isIssued ? 'bg-gray-100' : ''}`}
                                     placeholder="e.g. 2.5L"
                                  />
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500 mb-1 block">Value (BHD)</label>
                                  <div className="relative">
                                      <input 
                                         type="number" 
                                         value={formData.vehicle.value} 
                                         disabled={!isSupervisor && !isApprovalPending && !isApprovalRejected && !isApprovalGranted && !isDraft} 
                                         onChange={e => setFormData({...formData, vehicle: {...formData.vehicle, value: Number(e.target.value)}})}
                                         className={`w-full p-2 border rounded ${isIssued ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                         placeholder="Vehicle value in BHD"
                                         aria-label="Vehicle value in BHD"
                                      />
                                      {isIssued && <Lock className="w-4 h-4 text-gray-400 absolute right-2 top-2.5" />}
                                  </div>
                              </div>
                          </div>
                      </div>
                      
                      {/* Policy Dates */}
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Policy Dates & Info</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div>
                                   <label className="text-xs text-gray-500 mb-1 block">Policy Start Date</label>
                                   <input 
                                      type="date" 
                                      value={formData.startDate?.split('T')[0]} 
                                      disabled={isIssued}
                                      onChange={e => setFormData({...formData, startDate: e.target.value})}
                                      className={`w-full p-2 border rounded ${isIssued ? 'bg-gray-100' : ''}`}
                                   />
                               </div>
                               <div>
                                   <label className="text-xs text-gray-500 mb-1 block">Policy End Date</label>
                                   <input 
                                      type="date" 
                                      value={formData.vehicle.policyEndDate} 
                                      disabled 
                                      readOnly
                                      className="w-full p-2 border rounded bg-gray-100 text-gray-500 cursor-not-allowed"
                                   />
                               </div>
                          </div>
                          <div className="flex flex-col md:flex-row gap-6 mt-6">
                               <label className="flex items-center gap-2 cursor-pointer">
                                   <input 
                                      type="checkbox" 
                                      checked={formData.vehicle.isBrandNew || false}
                                      disabled={isIssued}
                                      onChange={e => setFormData({...formData, vehicle: {...formData.vehicle, isBrandNew: e.target.checked}})}
                                      className="w-4 h-4 text-zain-600 rounded" 
                                   />
                                   <span className="text-sm text-gray-700 font-medium">Brand New Vehicle?</span>
                               </label>
                               <label className="flex items-center gap-2 cursor-pointer">
                                   <input 
                                      type="checkbox" 
                                      checked={formData.vehicle.hasExistingInsurance || false}
                                      disabled={isIssued}
                                      onChange={e => setFormData({...formData, vehicle: {...formData.vehicle, hasExistingInsurance: e.target.checked}})}
                                      className="w-4 h-4 text-zain-600 rounded" 
                                   />
                                   <span className="text-sm text-gray-700 font-medium">Has Existing Insurance?</span>
                               </label>
                          </div>
                      </div>

                      {/* Risk Assessment */}
                      <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                           <div className="flex items-center gap-2 mb-3 border-b border-red-200 pb-2">
                               <AlertCircle className="w-4 h-4 text-red-600" />
                               <h4 className="text-sm font-bold text-red-800 uppercase tracking-wide">Risk Assessment</h4>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <div className="flex items-center justify-between bg-white p-3 rounded border border-red-100">
                                   <span className="text-sm font-medium text-gray-700">Driver Age under 24?</span>
                                   <label className="relative inline-flex items-center cursor-pointer">
                                       <input 
                                          type="checkbox" 
                                          checked={formData.riskFactors?.ageUnder24 || false}
                                          disabled={isIssued}
                                          onChange={e => setFormData({
                                              ...formData, 
                                              riskFactors: { ...formData.riskFactors, ageUnder24: e.target.checked }
                                          })}
                                          className="sr-only peer"
                                          aria-label="Driver age under 24"
                                       />
                                       <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                   </label>
                               </div>
                               <div className="flex items-center justify-between bg-white p-3 rounded border border-red-100">
                                   <span className="text-sm font-medium text-gray-700">License held less than 1 year?</span>
                                   <label className="relative inline-flex items-center cursor-pointer">
                                       <input 
                                          type="checkbox" 
                                          checked={formData.riskFactors?.licenseUnder1Year || false}
                                          disabled={isIssued}
                                          onChange={e => setFormData({
                                              ...formData, 
                                              riskFactors: { ...formData.riskFactors, licenseUnder1Year: e.target.checked }
                                          })}
                                          className="sr-only peer"
                                          aria-label="License held less than 1 year" 
                                       />
                                       <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                   </label>
                               </div>
                           </div>
                       </div>
                      </>
                  ) : (
                      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-4">Trip Details</h3>
                          <p className="text-gray-500 italic">Travel details editing not fully implemented in this mock.</p>
                      </div>
                  )}
              </div>
          )}

          {activeTab === 'plans' && (
              <div className="space-y-4">
                  {linkSent ? (
                      <div className="text-center py-12">
                          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><Check className="w-8 h-8" /></div>
                          <h2 className="text-xl font-bold text-gray-900">Payment Link Sent</h2>
                          <p className="text-gray-500 mt-2">The customer has received the updated plan link.</p>
                      </div>
                  ) : exceptionSent ? (
                      <div className="text-center py-12">
                          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4"><ShieldAlert className="w-8 h-8" /></div>
                          <h2 className="text-xl font-bold text-gray-900">Exception Request Sent</h2>
                          <p className="text-gray-500 mt-2">Forwarded for approval.</p>
                      </div>
                  ) : loading ? (
                      <div className="p-12 text-center text-gray-400"><Loader2 className="w-8 h-8 animate-spin mx-auto"/> Loading Plans...</div>
                  ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {plans.map(plan => {
                              const isSelected = formData.selectedPlanId === plan.id;
                              const isApprovedPlan = isApprovalGranted && isSelected;
                              const isBlocked = isApprovalGranted && !isSelected;

                              return (
                                  <div 
                                    key={plan.id} 
                                    className={`relative border-2 rounded-xl p-4 transition-all flex flex-col justify-between
                                        ${isBlocked ? 'opacity-50 border-gray-100 bg-gray-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-300'}
                                        ${isSelected && !isBlocked ? 'border-zain-600 bg-zain-50 shadow-md ring-1 ring-zain-200' : 'border-gray-200'}
                                    `}
                                    onClick={() => !isBlocked && setFormData({...formData, selectedPlanId: plan.id})}
                                  >
                                      {isBlocked && (
                                          <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center rounded-xl">
                                              <div className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold text-gray-500 flex items-center shadow-sm border border-gray-200">
                                                  <Ban className="w-3 h-3 mr-1" /> Not Approved
                                              </div>
                                          </div>
                                      )}

                                      <div className="flex justify-between items-start">
                                          <div>
                                              <p className="text-xs font-bold text-gray-500">{plan.provider}</p>
                                              <h4 className="font-bold text-gray-900">{plan.name}</h4>
                                          </div>
                                          {isSelected && !isBlocked && <CheckCircle className="w-5 h-5 text-zain-600" />}
                                          {isApprovedPlan && <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-lg">APPROVED</div>}
                                      </div>
                                      <div className="mt-4 flex justify-between items-end">
                                          <div className="text-xl font-bold text-zain-600">BHD {(plan.basePremium * 1.1).toFixed(3)}</div>
                                          <div className="text-xs text-gray-500">{plan.coverage}</div>
                                      </div>
                                  </div>
                              );
                          })}
                      </div>
                  )}

                  {!linkSent && !exceptionSent && (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4 flex justify-between items-center">
                         <div>
                            <p className="text-xs text-gray-500">Selected Plan: <strong>{plans.find(p => p.id === formData.selectedPlanId)?.name || 'None'}</strong></p>
                         </div>
                         <div className="flex gap-2">
                             {!isApprovalGranted && (
                                 <button 
                                    onClick={handleRequestException}
                                    disabled={!formData.selectedPlanId || actionLoading || isApprovalPending}
                                    className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                 >
                                    {isApprovalPending ? 'Request Pending' : 'Request Exception'}
                                 </button>
                             )}
                             <button 
                                onClick={handleSendLink}
                                disabled={!formData.selectedPlanId || actionLoading || (isApprovalPending && !isApprovalGranted)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm disabled:opacity-50 flex items-center disabled:cursor-not-allowed"
                             >
                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                                Send Link
                             </button>
                         </div>
                      </div>
                  )}
              </div>
          )}

          {activeTab === 'audit' && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                          <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                          {auditLogs.map(log => {
                              const date = new Date(log.timestamp);
                              return (
                              <tr key={log.id}>
                                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                                      {date.toLocaleDateString()} <span className="text-gray-400">{date.toLocaleTimeString()}</span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.user}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-600">
                                      <span className={`px-2 py-0.5 rounded ${
                                          log.action === 'APPROVAL_GRANTED' ? 'bg-green-100 text-green-700' :
                                          log.action === 'APPROVAL_REJECTED' ? 'bg-red-100 text-red-700' :
                                          log.action === 'VEHICLE_UPDATE' ? 'bg-amber-100 text-amber-700' :
                                          'bg-gray-100 text-gray-700'
                                      }`}>{log.action}</span>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-500">{log.details}</td>
                              </tr>
                          )})}
                      </tbody>
                  </table>
                  {auditLogs.length === 0 && <p className="p-6 text-center text-gray-500">No activity recorded.</p>}
              </div>
          )}
          
          {(activeTab === 'docs') && (
              <div className="text-center py-10 text-gray-500">Document Management (Mock View)</div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-between items-center gap-3">
            <div>
              {isIssued && quote.assignment && quote.assignment.status !== 'COMPLETED' && (
                <button 
                  onClick={handleMarkAsCompleted}
                  disabled={actionLoading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all flex items-center gap-2"
                  title="Mark this quote as completed (only for issued policies)"
                >
                  {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <CheckCircle className="w-4 h-4" />
                  Mark as Completed
                </button>
              )}
              {quote.assignment?.status === 'COMPLETED' && (
                <span className="text-sm font-semibold text-green-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  This quote is marked as completed
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 text-gray-600 font-medium">{isIssued ? 'Close' : 'Cancel'}</button>
              {!isIssued && !isDraft && (
                  <button onClick={handleSave} disabled={saving} className={`px-6 py-2 text-white rounded-lg font-medium flex items-center ${showInvalidationWarning ? 'bg-red-600 hover:bg-red-700' : 'bg-zain-600 hover:bg-zain-700'}`}>
                      {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} 
                      {showInvalidationWarning ? 'Reset to Draft & Save' : 'Save Changes'}
                  </button>
              )}
            </div>
        </div>
      </div>
    </div>
  );
};
