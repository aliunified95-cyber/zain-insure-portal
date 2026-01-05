
import React, { useState } from 'react';
import { User, Lock, Loader2, ArrowRight, Shield, AlertCircle } from 'lucide-react';
import { UserRole, User as UserType } from '../../types';
import { authenticateUser } from '../../services/mockApi';

interface LoginPageProps {
  onLogin: (role: UserRole, user: UserType) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
        const result = await authenticateUser(username, password);
        
        if (result.success && result.user) {
            // For this app session, we take the highest privilege role or the first one
            // Priority: DEVELOPER > SUPERVISOR > CREDIT_CONTROL > JUNIOR_AGENT
            const roles = result.user.roles;
            let activeRole: UserRole = 'JUNIOR_AGENT';
            
            if (roles.includes('DEVELOPER')) activeRole = 'DEVELOPER';
            else if (roles.includes('SUPERVISOR')) activeRole = 'SUPERVISOR';
            else if (roles.includes('CREDIT_CONTROL')) activeRole = 'CREDIT_CONTROL';
            else if (roles.length > 0) activeRole = roles[0];

            onLogin(activeRole, result.user);
        } else {
            setError(result.message || 'Invalid username or password.');
        }
    } catch (e) {
        setError('An unexpected error occurred. Please try again.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Column - Brand / Visuals */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white relative overflow-hidden flex-col justify-between p-12">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-zain-600 opacity-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-purple-900 opacity-30 blur-3xl"></div>
        
        <div className="relative z-10">
          <img src="logo.png" alt="Zain Logo" className="w-16 h-16 mb-6 object-contain" />
          <h1 className="text-4xl font-bold tracking-tight mb-4">Zain Insure Portal</h1>
          <p className="text-slate-400 text-lg max-w-md">
            The unified platform for insurance quotes, policy issuance, and customer relationship management.
          </p>
        </div>

        <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-4 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Secure Environment
                </div>
                <div className="h-4 w-px bg-slate-700"></div>
                <div>Authorized Access Only</div>
            </div>
            <p className="text-xs text-slate-600">© {new Date().getFullYear()} Zain Bahrain. All rights reserved.</p>
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-2xl shadow-2xl border border-gray-200 backdrop-blur-sm">
          <div className="text-center lg:text-left">
            <img src="logo.png" alt="Zain Logo" className="lg:hidden h-12 w-auto mb-6 mx-auto object-contain" />
            <h2 className="text-3xl font-bold text-gray-900">Welcome back</h2>
            <p className="mt-2 text-sm text-gray-500">Please enter your registered credentials.</p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">Username</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zain-500 focus:border-zain-500 sm:text-sm transition-shadow"
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zain-500 focus:border-zain-500 sm:text-sm transition-shadow"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 flex items-center animate-in fade-in">
                 <AlertCircle className="w-4 h-4 mr-2 shrink-0" /> {error}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-zain-600 focus:ring-zain-500 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 cursor-pointer">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-zain-600 hover:text-zain-500">
                  Forgot password?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-zain-600 hover:bg-zain-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zain-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Sign In'}
                {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
              </button>
            </div>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Other options</span>
            </div>
          </div>

          <button
            type="button"
            disabled={true}
            className="w-full flex justify-center items-center py-3 px-4 border border-gray-200 rounded-lg shadow-sm text-sm font-medium text-gray-400 bg-gray-50 cursor-not-allowed"
            title="SSO Login is currently disabled for maintenance"
          >
            <svg className="w-5 h-5 mr-2 opacity-50" viewBox="0 0 24 24" fill="currentColor">
               <path d="M0 3.449L9.75 2.1v9.451H0V3.449zm10.949-1.655L24 0v11.4H10.949V1.794zM0 12.6h9.75v9.451L0 20.699V12.6zm10.949 0H24V24l-13.051-1.65V12.6z"/>
            </svg>
            Windows Credentials (Disabled)
          </button>
        </div>
      </div>
    </div>
  );
};
