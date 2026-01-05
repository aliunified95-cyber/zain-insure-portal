import React from 'react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { CheckCircle, Search } from 'lucide-react';
import { getReferrals } from '../../services/mockApi';

interface ReferralInboxPageProps {
  onNavigateToQuote: (quoteId?: string, referralData?: any) => void;
}

export const ReferralInboxPage: React.FC<ReferralInboxPageProps> = ({ onNavigateToQuote }) => {
  const referrals = getReferrals();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-gray-900">Referral Inbox</h2>
            <p className="text-gray-500 mt-1">Manage leads submitted by employees.</p>
        </div>
        <div className="relative">
             <input type="text" placeholder="Search leads..." className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm" />
             <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
        </div>
      </div>

      <Card>
        <CardHeader className="flex justify-between items-center">
           <h3 className="text-lg font-semibold text-gray-900">Incoming Leads</h3>
           <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">
             {referrals.filter(r => r.status === 'PENDING').length} Pending
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
              {referrals.map((lead) => (
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
    </div>
  );
};