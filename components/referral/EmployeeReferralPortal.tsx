
import React, { useState } from 'react';
import { Card, CardBody } from '../ui/Card';
import { Send, CheckCircle } from 'lucide-react';
import { InsuranceType } from '../../types';

export const EmployeeReferralPortal: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    interest: InsuranceType.MOTOR
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would post to API
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', phone: '', interest: InsuranceType.MOTOR });
    }, 3000);
  };

  return (
    <div className="max-w-md mx-auto mt-10 px-4">
      <Card className="shadow-2xl">
        <CardBody className="p-8">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-zain-500 to-zain-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Send className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Refer a Friend</h2>
                <p className="text-gray-600">Submit a lead and let our agents handle the rest.</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Customer Name</label>
                  <input 
                    required
                    type="text" 
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-zain-500 focus:border-zain-500 transition-all"
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mobile Number (973)</label>
                  <input 
                    required
                    type="tel" 
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-zain-500 focus:border-zain-500 transition-all"
                    placeholder="3XXXXXXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Interested In</label>
                  <select 
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-zain-500 focus:border-zain-500 bg-white transition-all"
                    value={formData.interest}
                    onChange={(e) => setFormData({...formData, interest: e.target.value as InsuranceType})}
                    aria-label="Select insurance type"
                  >
                    <option value={InsuranceType.MOTOR}>Motor Insurance</option>
                    <option value={InsuranceType.TRAVEL}>Travel Insurance</option>
                    <option value={InsuranceType.HEALTH} disabled>Health (Coming Soon)</option>
                    <option value={InsuranceType.LIFE} disabled>Life (Coming Soon)</option>
                    <option value={InsuranceType.HOME} disabled>Home (Coming Soon)</option>
                    <option value={InsuranceType.CYBER} disabled>Cyber (Coming Soon)</option>
                    <option value={InsuranceType.PERSONAL_ACCIDENT} disabled>Personal Accident (Coming Soon)</option>
                  </select>
                </div>

                <button 
                  type="submit"
                  className="w-full mt-8 bg-gradient-to-r from-zain-600 to-zain-700 text-white py-3.5 rounded-lg font-bold hover:from-zain-700 hover:to-zain-800 transition-all flex justify-center items-center shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                >
                  <Send className="w-5 h-5 mr-2" /> Submit Lead
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg animate-in zoom-in">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Lead Submitted!</h3>
              <p className="text-gray-600 text-base">Thank you. An agent will contact them shortly.</p>
              <button 
                onClick={() => setSubmitted(false)}
                className="mt-8 text-zain-600 font-semibold hover:text-zain-800 px-6 py-2 border-2 border-zain-600 rounded-lg hover:bg-zain-50 transition-all"
              >
                Submit another
              </button>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
