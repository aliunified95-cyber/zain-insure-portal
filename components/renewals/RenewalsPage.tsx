
import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Calendar, RefreshCw, Car, ChevronRight, Check, Phone, MessageSquare, AlertCircle, Search, TrendingUp, Clock, Send, Download, PlayCircle } from 'lucide-react';
import { QuoteRequest, QuoteStatus } from '../../types';
import { 
  getExpiringPolicies as getRenewalPolicies, 
  getRenewalMetrics, 
  RenewalPolicy, 
  RenewalStatus,
  RenewalMetrics,
  sendManualRenewalReminder 
} from '../../services/renewalsService';
import { runSchedulerNow } from '../../services/renewalScheduler';

interface RenewalsPageProps {
  onNavigateToQuote: (quoteId?: string, referralData?: Partial<QuoteRequest>) => void;
}

export const RenewalsPage: React.FC<RenewalsPageProps> = ({ onNavigateToQuote }) => {
  const [renewalPolicies, setRenewalPolicies] = useState<RenewalPolicy[]>([]);
  const [filteredPolicies, setFilteredPolicies] = useState<RenewalPolicy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<RenewalPolicy | null>(null);
  const [applyDepreciation, setApplyDepreciation] = useState(false);
  const [renewalGenerated, setRenewalGenerated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<RenewalMetrics | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | RenewalStatus>('ALL');
  const [daysFilter, setDaysFilter] = useState<'ALL' | '7' | '15' | '30'>('ALL');
  const [sortBy, setSortBy] = useState<'expiry' | 'name' | 'days'>('expiry');

  // Load data
  useEffect(() => {
    loadRenewalData();
  }, []);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [renewalPolicies, searchQuery, statusFilter, daysFilter, sortBy]);

  const loadRenewalData = async () => {
    setLoading(true);
    try {
      const [policies, metricsData] = await Promise.all([
        getRenewalPolicies(90),
        getRenewalMetrics()
      ]);
      setRenewalPolicies(policies);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error loading renewal data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...renewalPolicies];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.customerName.toLowerCase().includes(query) ||
        p.policyNumber.toLowerCase().includes(query) ||
        p.vehicleDetails.toLowerCase().includes(query) ||
        p.customerPhone.includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Days filter
    if (daysFilter !== 'ALL') {
      const days = parseInt(daysFilter);
      filtered = filtered.filter(p => p.daysUntilExpiry <= days);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'expiry':
          return a.daysUntilExpiry - b.daysUntilExpiry;
        case 'name':
          return a.customerName.localeCompare(b.customerName);
        case 'days':
          return a.daysUntilExpiry - b.daysUntilExpiry;
        default:
          return 0;
      }
    });

    setFilteredPolicies(filtered);
  };

  const handleSelectPolicy = (policy: RenewalPolicy) => {
    setSelectedPolicy(policy);
    setApplyDepreciation(false);
    setRenewalGenerated(false);
  };

  const getRenewedValue = () => {
    if (!selectedPolicy) return 0;
    const originalValue = 5000; // Default value, should be fetched from policy
    return applyDepreciation ? Math.round(originalValue * 0.95) : originalValue;
  };

  const handleSendManualReminder = async () => {
    if (!selectedPolicy) return;
    const result = await sendManualRenewalReminder(selectedPolicy.quoteId);
    if (result) {
      alert('✅ Reminder sent successfully!');
      loadRenewalData();
    } else {
      alert('❌ Failed to send reminder');
    }
  };

  const handleRunAutomatedProcess = async () => {
    if (confirm('🤖 Run automated renewal process now?\n\nThis will:\n• Send reminders for policies expiring in 30/15 days\n• Assign expired policies to agent pool')) {
      await runSchedulerNow();
      alert('✅ Automated process completed! Check console for details.');
      loadRenewalData();
    }
  };

  const handleGenerateRenewal = () => {
    setRenewalGenerated(true);
  };

  const handleViewQuoteDetails = () => {
    if (!selectedPolicy) return;

    // Create a new quote based on renewal
    const renewalQuote: Partial<QuoteRequest> = {
      customer: {
        cpr: selectedPolicy.customerId,
        fullName: selectedPolicy.customerName,
        mobile: selectedPolicy.customerPhone,
        email: '',
        type: 'EXISTING' as any,
        isEligibleForZain: true,
        isEligibleForInstallments: false,
        creditScore: 0,
        activeLines: []
      },
      vehicle: {
        plateNumber: '',
        chassisNumber: '',
        make: selectedPolicy.vehicleDetails.split(' ')[0] || '',
        model: selectedPolicy.vehicleDetails.split(' ')[1] || '',
        year: '',
        value: getRenewedValue()
      },
      insuranceType: 'MOTOR' as any,
      riskFactors: { ageUnder24: false, licenseUnder1Year: false },
      startDate: new Date().toISOString().split('T')[0],
      status: QuoteStatus.DRAFT,
      createdAt: new Date(),
      source: 'AGENT_PORTAL' as any
    };

    onNavigateToQuote(undefined, renewalQuote);
  };

  const handleExportToCSV = () => {
    const csv = [
      ['Customer Name', 'Policy Number', 'Vehicle', 'Expiry Date', 'Days Until Expiry', 'Status', 'Phone'],
      ...filteredPolicies.map(p => [
        p.customerName,
        p.policyNumber,
        p.vehicleDetails,
        p.expiryDate,
        p.daysUntilExpiry.toString(),
        p.status,
        p.customerPhone
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `renewals-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusColor = (status: RenewalStatus) => {
    switch(status) {
      case RenewalStatus.RENEWED: return 'text-green-600 bg-green-50 border-green-200';
      case RenewalStatus.CUSTOMER_DECLINED: return 'text-red-600 bg-red-50 border-red-200';
      case RenewalStatus.REMINDER_30_SENT:
      case RenewalStatus.REMINDER_15_SENT: return 'text-blue-600 bg-blue-50 border-blue-200';
      case RenewalStatus.ASSIGNED_TO_POOL: return 'text-purple-600 bg-purple-50 border-purple-200';
      case RenewalStatus.EXPIRED_UNACTIONED: return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getUrgencyColor = (days: number) => {
    if (days <= 7) return 'text-red-600 bg-red-50';
    if (days <= 15) return 'text-orange-600 bg-orange-50';
    if (days <= 30) return 'text-amber-600 bg-amber-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getStatusLabel = (status: RenewalStatus) => {
    return status.replace(/_/g, ' ');
  };

  return (
    <div className="space-y-6">
      
      {/* Metrics Dashboard */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Total Expiring</p>
                  <p className="text-3xl font-bold text-gray-900">{metrics.totalExpiring}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Next 90 days
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Urgent (≤15 days)</p>
                  <p className="text-3xl font-bold text-orange-600">{metrics.expiring15Days}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Require immediate action
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Reminders Sent</p>
                  <p className="text-3xl font-bold text-green-600">{metrics.remindersSentToday}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Send className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Today via WhatsApp
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Renewal Rate</p>
                  <p className="text-3xl font-bold text-zain-600">{metrics.renewalRate.toFixed(1)}%</p>
                </div>
                <div className="w-12 h-12 bg-zain-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-zain-600" />
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Success rate
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
        {/* List of Expiring Policies */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="bg-gray-50 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Renewal Pipeline</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {loading ? 'Loading...' : `${filteredPolicies.length} of ${renewalPolicies.length} policies`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleRunAutomatedProcess}
                    className="px-3 py-2 bg-zain-600 text-white rounded-lg text-sm font-bold hover:bg-zain-700 flex items-center gap-2"
                    title="Run automated renewal check and send reminders"
                  >
                    <PlayCircle className="w-4 h-4" /> Run Auto Process
                  </button>
                  <button
                    onClick={handleExportToCSV}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Export
                  </button>
                  <button
                    onClick={loadRenewalData}
                    className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardBody className="p-4 space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search customer, policy..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <select
                  value={daysFilter}
                  onChange={(e) => setDaysFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="ALL">All Timeframes</option>
                  <option value="7">≤ 7 days</option>
                  <option value="15">≤ 15 days</option>
                  <option value="30">≤ 30 days</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="ALL">All Status</option>
                  <option value={RenewalStatus.PENDING}>Pending</option>
                  <option value={RenewalStatus.REMINDER_30_SENT}>30d Reminder Sent</option>
                  <option value={RenewalStatus.REMINDER_15_SENT}>15d Reminder Sent</option>
                  <option value={RenewalStatus.RENEWED}>Renewed</option>
                  <option value={RenewalStatus.ASSIGNED_TO_POOL}>In Agent Pool</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="expiry">Sort: Expiry Date</option>
                  <option value="name">Sort: Customer Name</option>
                  <option value="days">Sort: Days Remaining</option>
                </select>
              </div>

              {/* Policy List */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="text-center py-8 text-gray-500">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                    Loading renewal data...
                  </div>
                ) : filteredPolicies.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No policies found matching your filters</p>
                  </div>
                ) : (
                  filteredPolicies.map((policy) => (
                    <Card 
                      key={policy.id} 
                      onClick={() => handleSelectPolicy(policy)}
                      className={`cursor-pointer transition-all border-2 ${selectedPolicy?.id === policy.id ? 'border-zain-600 ring-2 ring-zain-100' : 'border-transparent hover:border-gray-300'}`}
                    >
                      <CardBody className="flex justify-between items-center p-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm ${getUrgencyColor(policy.daysUntilExpiry)}`}>
                            {policy.daysUntilExpiry}d
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 flex items-center gap-2">
                              {policy.customerName}
                              <span className={`text-[10px] px-2 py-0.5 rounded border uppercase ${getStatusColor(policy.status)}`}>
                                {getStatusLabel(policy.status)}
                              </span>
                            </h4>
                            <p className="text-sm text-gray-500">{policy.vehicleDetails}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-xs text-gray-400">Policy: {policy.policyNumber}</p>
                              <p className="text-xs text-red-500 font-medium">Expires: {new Date(policy.expiryDate).toLocaleDateString('en-GB')}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          {policy.remindersSent.length > 0 && (
                            <div className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">
                              <MessageSquare className="w-3 h-3 inline mr-1" />
                              {policy.remindersSent.length} reminders
                            </div>
                          )}
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </CardBody>
                    </Card>
                  ))
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Action Panel */}
        <div className="lg:col-span-1">
          {selectedPolicy ? (
              <Card className="sticky top-6">
                  <CardHeader className="bg-gray-50 border-b border-gray-100">
                      <h3 className="font-bold text-gray-900 flex items-center">
                          <RefreshCw className="w-5 h-5 mr-2 text-zain-600" /> Policy Details
                      </h3>
                  </CardHeader>
                  <CardBody className="space-y-4">
                      
                      {/* Customer Info */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Customer</label>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-zain-100 rounded-full flex items-center justify-center text-zain-600 font-bold">
                              {selectedPolicy.customerName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{selectedPolicy.customerName}</p>
                              <p className="text-xs text-gray-500">{selectedPolicy.customerPhone}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Policy Status */}
                      <div className={`p-3 rounded-lg border ${getStatusColor(selectedPolicy.status)}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase">Status</span>
                          <Clock className="w-4 h-4" />
                        </div>
                        <p className="font-bold">{getStatusLabel(selectedPolicy.status)}</p>
                        <p className="text-xs mt-1 opacity-80">
                          {selectedPolicy.daysUntilExpiry > 0 
                            ? `Expires in ${selectedPolicy.daysUntilExpiry} days`
                            : `Expired ${Math.abs(selectedPolicy.daysUntilExpiry)} days ago`
                          }
                        </p>
                      </div>

                      {/* Reminders Sent */}
                      {selectedPolicy.remindersSent.length > 0 && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-bold text-blue-900">WhatsApp Reminders</span>
                          </div>
                          <div className="space-y-1">
                            {selectedPolicy.remindersSent.map((reminder, idx) => (
                              <div key={idx} className="text-xs text-blue-800 flex items-center justify-between">
                                <span>📱 {reminder.type === '30_DAYS' ? '30-day' : '15-day'} reminder</span>
                                <span className="text-blue-600">✓ {reminder.status}</span>
                              </div>
                            ))}
                            {selectedPolicy.lastReminderSent && (
                              <p className="text-[10px] text-blue-600 mt-2">
                                Last sent: {new Date(selectedPolicy.lastReminderSent).toLocaleDateString('en-GB')}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Manual Reminder Button */}
                      {selectedPolicy.status !== RenewalStatus.RENEWED && (
                        <button
                          onClick={handleSendManualReminder}
                          className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-2"
                        >
                          <Send className="w-4 h-4" /> Send Reminder Now
                        </button>
                      )}

                      {/* Vehicle Info */}
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Vehicle</label>
                          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="font-bold text-gray-900">{selectedPolicy.vehicleDetails}</p>
                              <p className="text-xs text-gray-500 mt-1">Policy: {selectedPolicy.policyNumber}</p>
                              <p className="text-xs text-red-600 font-medium mt-1">
                                Expires: {new Date(selectedPolicy.expiryDate).toLocaleDateString('en-GB')}
                              </p>
                          </div>
                      </div>

                      {/* Depreciation Option */}
                      <div className="flex items-start gap-3 p-3 border border-zain-200 bg-zain-50 rounded-lg">
                          <input 
                              type="checkbox" 
                              id="depreciation"
                              checked={applyDepreciation}
                              onChange={(e) => setApplyDepreciation(e.target.checked)}
                              className="mt-1 w-4 h-4 text-zain-600 rounded focus:ring-zain-500"
                          />
                          <label htmlFor="depreciation" className="text-sm text-zain-900 cursor-pointer">
                              <span className="font-bold block">Apply 5% Depreciation</span>
                              <span className="text-xs opacity-80">Decrease insured value to match current market rate.</span>
                          </label>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-4 border-t border-gray-100 space-y-3">
                          <div className="flex justify-between items-center mb-4">
                              <span className="text-sm font-medium text-gray-600">Renewed Value</span>
                              <span className="text-xl font-bold text-gray-900">BHD {getRenewedValue().toLocaleString()}</span>
                          </div>
                          
                          {!renewalGenerated ? (
                              <button 
                                  onClick={handleGenerateRenewal}
                                  className="w-full py-3 bg-zain-600 text-white rounded-lg font-bold hover:bg-zain-700 transition-colors flex items-center justify-center gap-2"
                              >
                                  <RefreshCw className="w-4 h-4" /> Calculate Renewal
                              </button>
                          ) : (
                              <div className="text-center animate-in fade-in zoom-in-95">
                                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                      <Check className="w-6 h-6" />
                                  </div>
                                  <h4 className="font-bold text-gray-900 mb-1">Quote Generated!</h4>
                                  <p className="text-xs text-gray-500 mb-4">Renewal quote created successfully.</p>
                                  <button 
                                      onClick={handleViewQuoteDetails}
                                      className="text-sm text-zain-600 font-bold hover:underline"
                                  >
                                      View Quote Details →
                                  </button>
                              </div>
                          )}

                          {/* Quick Actions */}
                          <div className="grid grid-cols-2 gap-2 pt-2">
                            <button 
                              onClick={() => window.open(`tel:${selectedPolicy.customerPhone}`)}
                              className="py-2 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100 flex items-center justify-center gap-1 border border-green-200"
                            >
                              <Phone className="w-3 h-3" /> Call
                            </button>
                            <button 
                              onClick={() => window.open(`https://wa.me/${selectedPolicy.customerPhone.replace(/\D/g, '')}`)}
                              className="py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 flex items-center justify-center gap-1 border border-emerald-200"
                            >
                              <MessageSquare className="w-3 h-3" /> WhatsApp
                            </button>
                          </div>
                      </div>

                      {/* Automation Info */}
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                          <div className="text-xs text-amber-900">
                            <p className="font-bold mb-1">Automated Process</p>
                            <p>• Reminders sent at 30 & 15 days before expiry</p>
                            <p>• If unactioned, auto-assigned to agent pool after expiry</p>
                          </div>
                        </div>
                      </div>
                  </CardBody>
              </Card>
          ) : (
              <div className="h-64 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400">
                  <Car className="w-10 h-10 mb-2 opacity-50" />
                  <p className="text-sm">Select a policy to view details</p>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};
