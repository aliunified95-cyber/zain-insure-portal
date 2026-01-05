import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { 
  CheckCircle, Search, Users, TrendingUp, Award, 
  Calendar, Tag, BarChart3, Ticket, Gift, ChevronDown, 
  ChevronRight, Send, Loader2, AlertCircle, Phone
} from 'lucide-react';
import { getReferrals, getStaffCodeAllocations, getRecentCodeUsage, getCodeStats, pushCodesToWhatsApp, getUnpushedStaff } from '../../services/mockApi';
import { DiscountCodeType, StaffCodeAllocation } from '../../types';

interface ReferralManagementPageProps {
  onNavigateToQuote: (quoteId?: string, referralData?: any) => void;
}

export const ReferralManagementPage: React.FC<ReferralManagementPageProps> = ({ onNavigateToQuote }) => {
  const [activeTab, setActiveTab] = useState<'referrals' | 'staff-codes' | 'recent-usage' | 'stats'>('referrals');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedStaff, setExpandedStaff] = useState<Set<string>>(new Set());
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set());
  const [isPushing, setIsPushing] = useState(false);
  const [pushMessage, setPushMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const referrals = getReferrals();
  const staffAllocations = getStaffCodeAllocations();
  const recentUsage = getRecentCodeUsage();
  const stats = getCodeStats();
  const unpushedStaff = getUnpushedStaff();

  const tabs = [
    { id: 'referrals' as const, label: 'Referral Requests', icon: Users },
    { id: 'staff-codes' as const, label: 'Staff Codes', icon: Ticket },
    { id: 'recent-usage' as const, label: 'Recent Usage', icon: TrendingUp },
    { id: 'stats' as const, label: 'Statistics', icon: BarChart3 }
  ];

  const filteredStaffAllocations = staffAllocations.filter(staff =>
    staff.staffName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.staffEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReferrals = referrals.filter(ref =>
    ref.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ref.referrerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleStaffExpanded = (staffId: string) => {
    const newExpanded = new Set(expandedStaff);
    if (newExpanded.has(staffId)) {
      newExpanded.delete(staffId);
    } else {
      newExpanded.add(staffId);
    }
    setExpandedStaff(newExpanded);
  };

  const toggleStaffSelected = (staffId: string) => {
    const newSelected = new Set(selectedStaff);
    if (newSelected.has(staffId)) {
      newSelected.delete(staffId);
    } else {
      newSelected.add(staffId);
    }
    setSelectedStaff(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedStaff.size === filteredStaffAllocations.length) {
      setSelectedStaff(new Set());
    } else {
      setSelectedStaff(new Set(filteredStaffAllocations.map(s => s.staffId)));
    }
  };

  const handlePushToWhatsApp = async () => {
    if (selectedStaff.size === 0) return;
    
    setIsPushing(true);
    setPushMessage(null);
    
    try {
      const result = await pushCodesToWhatsApp(Array.from(selectedStaff), 'Admin');
      setPushMessage({
        type: 'success',
        text: `Successfully pushed codes to ${result.pushed} staff member(s)`
      });
      setSelectedStaff(new Set());
      
      // Clear message after 5 seconds
      setTimeout(() => setPushMessage(null), 5000);
    } catch (error) {
      setPushMessage({
        type: 'error',
        text: 'Failed to push codes. Please try again.'
      });
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Referral Management</h2>
          <p className="text-gray-500 mt-1">Manage referrals and staff discount codes.</p>
        </div>
      </div>

      {/* Hero Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Codes</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalCodes}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Gift className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Codes Used</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.usedCodes}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Remaining Codes</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.remainingCodes}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Tag className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Usage Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.usageRate}%</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-zain-600 text-zain-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Search Bar */}
      {(activeTab === 'referrals' || activeTab === 'staff-codes') && (
        <div className="relative">
          <input 
            type="text" 
            placeholder={activeTab === 'referrals' ? 'Search leads...' : 'Search staff...'}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'referrals' && (
        <Card>
          <CardHeader className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Incoming Leads</h3>
            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">
              {filteredReferrals.filter(r => r.status === 'PENDING').length} Pending
            </span>
          </CardHeader>
          <CardBody className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interest</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReferrals.map((lead) => (
                  <tr key={lead.id} className={lead.status === 'CONVERTED' ? 'opacity-50 bg-gray-50' : 'hover:bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lead.createdAt.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-medium">{lead.referrerName}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{lead.customerName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.customerPhone}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${lead.interest === 'MOTOR' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                        {lead.interest}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {lead.status === 'PENDING' ? (
                        <button 
                          onClick={() => onNavigateToQuote(undefined, {
                            leadId: lead.id,
                            customer: { 
                              fullName: lead.customerName, 
                              mobile: lead.customerPhone,
                              cpr: '', email: '', type: 'NEW', isEligibleForInstallments: false, creditScore: 0
                            },
                            insuranceType: lead.interest
                          })}
                          className="text-white bg-zain-600 hover:bg-zain-700 px-3 py-1 rounded text-xs font-bold transition-colors"
                        >
                          Convert
                        </button>
                      ) : (
                        <span className="text-green-600 flex items-center gap-1 text-xs font-bold">
                          <CheckCircle className="w-4 h-4" /> Converted
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {activeTab === 'staff-codes' && (
        <div className="space-y-4">
          {/* Action Bar */}
          <Card>
            <CardBody className="p-4">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={toggleSelectAll}
                    className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    {selectedStaff.size === filteredStaffAllocations.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <span className="text-sm text-gray-600">
                    {selectedStaff.size} selected
                  </span>
                </div>

                {unpushedStaff.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    {unpushedStaff.length} staff member(s) haven't received codes yet
                  </div>
                )}

                <button
                  onClick={handlePushToWhatsApp}
                  disabled={selectedStaff.size === 0 || isPushing}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
                >
                  {isPushing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Pushing...
                    </>
                  ) : (
                    <>
                      <Phone className="w-4 h-4" />
                      Push to WhatsApp
                    </>
                  )}
                </button>
              </div>

              {pushMessage && (
                <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 text-sm ${
                  pushMessage.type === 'success' 
                    ? 'bg-green-50 text-green-800 border border-green-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {pushMessage.type === 'success' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  {pushMessage.text}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Staff List */}
          {filteredStaffAllocations.length === 0 ? (
            <Card>
              <CardBody className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No staff members found matching your search.</p>
              </CardBody>
            </Card>
          ) : (
            filteredStaffAllocations.map((staff) => {
              const isExpanded = expandedStaff.has(staff.staffId);
              const isSelected = selectedStaff.has(staff.staffId);

              return (
                <Card key={staff.staffId}>
                  <CardHeader 
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleStaffExpanded(staff.staffId)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleStaffSelected(staff.staffId);
                          }}
                          aria-label={`Select ${staff.staffName}`}
                          className="w-4 h-4 text-zain-600 border-gray-300 rounded focus:ring-zain-500"
                        />
                        
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}

                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-gray-900">{staff.staffName}</h3>
                            {staff.department && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                {staff.department}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                            {staff.staffEmail && <span>{staff.staffEmail}</span>}
                            {staff.staffPhone && <span>📱 {staff.staffPhone}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {/* Push Status */}
                        <div className="text-right">
                          {staff.isPushedToWhatsApp ? (
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              <div className="text-left">
                                <p className="text-xs font-medium">Codes Pushed</p>
                                <p className="text-xs text-gray-500">
                                  {staff.pushedAt?.toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-amber-600">
                              <AlertCircle className="w-4 h-4" />
                              <div className="text-left">
                                <p className="text-xs font-medium">Not Pushed</p>
                                <p className="text-xs text-gray-500">New staff</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Usage Stats */}
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Usage</p>
                          <p className="text-xl font-bold text-gray-900">
                            {staff.totalUsed} / 7
                          </p>
                          <div className="w-20 bg-gray-200 rounded-full h-1.5 mt-1">
                            <div 
                              className="bg-zain-600 h-1.5 rounded-full transition-all duration-300" 
                              style={{ width: `${(staff.totalUsed / 7) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardBody>
                      <div className="space-y-4 pl-12">
                        {/* 15% Codes */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Award className="w-4 h-4 text-yellow-600" />
                            <h4 className="font-medium text-gray-900">15% Discount (1 code)</h4>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {staff.codes.fifteenPercent.map((code) => (
                              <div 
                                key={code.id}
                                className={`p-3 rounded-lg border ${
                                  code.isUsed 
                                    ? 'bg-gray-50 border-gray-200' 
                                    : 'bg-yellow-50 border-yellow-200'
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="font-mono font-bold text-sm">{code.code}</p>
                                    {code.isUsed && code.usedBy && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        Used by {code.usedBy} on {code.usedAt?.toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>
                                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                                    code.isUsed ? 'bg-gray-200 text-gray-600' : 'bg-yellow-200 text-yellow-800'
                                  }`}>
                                    {code.isUsed ? 'Used' : 'Available'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 10% Codes */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Award className="w-4 h-4 text-blue-600" />
                            <h4 className="font-medium text-gray-900">10% Discount (3 codes)</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {staff.codes.tenPercent.map((code) => (
                              <div 
                                key={code.id}
                                className={`p-3 rounded-lg border ${
                                  code.isUsed 
                                    ? 'bg-gray-50 border-gray-200' 
                                    : 'bg-blue-50 border-blue-200'
                                }`}
                              >
                                <div className="flex flex-col">
                                  <p className="font-mono font-bold text-sm">{code.code}</p>
                                  {code.isUsed && code.usedBy && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Used by {code.usedBy}
                                    </p>
                                  )}
                                  <span className={`text-xs font-bold px-2 py-1 rounded mt-2 text-center ${
                                    code.isUsed ? 'bg-gray-200 text-gray-600' : 'bg-blue-200 text-blue-800'
                                  }`}>
                                    {code.isUsed ? 'Used' : 'Available'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 5% Codes */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Award className="w-4 h-4 text-green-600" />
                            <h4 className="font-medium text-gray-900">5% Discount (3 codes)</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {staff.codes.fivePercent.map((code) => (
                              <div 
                                key={code.id}
                                className={`p-3 rounded-lg border ${
                                  code.isUsed 
                                    ? 'bg-gray-50 border-gray-200' 
                                    : 'bg-green-50 border-green-200'
                                }`}
                              >
                                <div className="flex flex-col">
                                  <p className="font-mono font-bold text-sm">{code.code}</p>
                                  {code.isUsed && code.usedBy && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Used by {code.usedBy}
                                    </p>
                                  )}
                                  <span className={`text-xs font-bold px-2 py-1 rounded mt-2 text-center ${
                                    code.isUsed ? 'bg-gray-200 text-gray-600' : 'bg-green-200 text-green-800'
                                  }`}>
                                    {code.isUsed ? 'Used' : 'Available'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardBody>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'recent-usage' && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">Recent Code Usage</h3>
          </CardHeader>
          <CardBody className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quote</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentUsage.map((usage) => (
                  <tr key={usage.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {usage.usedAt?.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-gray-900">
                      {usage.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        usage.type === DiscountCodeType.FIFTEEN_PERCENT 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : usage.type === DiscountCodeType.TEN_PERCENT
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {usage.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{usage.staffName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{usage.usedBy}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{usage.usedByContact}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {usage.quoteId && (
                        <button 
                          onClick={() => onNavigateToQuote(usage.quoteId)}
                          className="text-zain-600 hover:text-zain-800 font-medium"
                        >
                          View Quote
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Usage by Discount Type</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">15% Discount</span>
                    <span className="text-sm font-bold text-gray-900">
                      {stats.usedByType.fifteenPercent} / {stats.totalByType.fifteenPercent}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${(stats.usedByType.fifteenPercent / stats.totalByType.fifteenPercent) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">10% Discount</span>
                    <span className="text-sm font-bold text-gray-900">
                      {stats.usedByType.tenPercent} / {stats.totalByType.tenPercent}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${(stats.usedByType.tenPercent / stats.totalByType.tenPercent) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">5% Discount</span>
                    <span className="text-sm font-bold text-gray-900">
                      {stats.usedByType.fivePercent} / {stats.totalByType.fivePercent}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${(stats.usedByType.fivePercent / stats.totalByType.fivePercent) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {stats.topPerformers.map((performer, index) => (
                  <div key={performer.staffId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-200 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-medium text-gray-900">{performer.staffName}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{performer.codesUsed} codes used</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Year Reset</h3>
            </CardHeader>
            <CardBody>
              <div className="text-center py-6">
                <Calendar className="w-12 h-12 text-zain-600 mx-auto mb-4" />
                <p className="text-sm text-gray-600 mb-2">Next code reset on</p>
                <p className="text-2xl font-bold text-gray-900">January 1, {new Date().getFullYear() + 1}</p>
                <p className="text-sm text-gray-500 mt-4">
                  All staff members will receive a fresh allocation of 7 discount codes
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">Overall Performance</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Staff Members</span>
                  <span className="text-lg font-bold text-gray-900">{staffAllocations.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Average Usage per Staff</span>
                  <span className="text-lg font-bold text-gray-900">
                    {(stats.usedCodes / staffAllocations.length).toFixed(1)} / 7
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Most Popular Discount</span>
                  <span className="text-lg font-bold text-zain-600">
                    {stats.usedByType.tenPercent > stats.usedByType.fivePercent && 
                     stats.usedByType.tenPercent > stats.usedByType.fifteenPercent ? '10%' :
                     stats.usedByType.fifteenPercent > stats.usedByType.fivePercent ? '15%' : '5%'}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
};
