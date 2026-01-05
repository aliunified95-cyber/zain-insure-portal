
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  LogOut, 
  Menu,
  Bell,
  ClipboardList,
  Inbox,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  FileCheck,
  Clock,
  Shield,
  ShieldCheck,
  Terminal
} from 'lucide-react';
import { AgentDashboard } from './components/dashboard/AgentDashboard';
import { QuickQuoteFlow } from './components/quote/QuickQuoteFlow';
import { EmployeeReferralPortal } from './components/referral/EmployeeReferralPortal';
import { RecentChecksPage } from './components/dashboard/RecentChecksPage';
import { ReferralManagementPage } from './components/dashboard/ReferralManagementPage';
import { RenewalsPage } from './components/renewals/RenewalsPage';
import { ApprovalsPage } from './components/approvals/ApprovalsPage';
import { DeveloperConsole } from './components/developer/DeveloperConsole';
import { QuoteManagementPage } from './components/dashboard/QuoteManagementPage';
import { MyPoolPage } from './components/dashboard/MyPoolPage';
import { LoginPage } from './components/auth/LoginPage';
import { QuoteRequest, Notification, UserRole, User as UserType } from './types';
import { getAgentNotifications } from './services/mockApi';

// Define the available views
type View = 'dashboard' | 'quote' | 'quote-management' | 'my-pool' | 'recent-checks' | 'referrals' | 'referral-portal' | 'renewals' | 'approvals' | 'developer';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);
  const [initialReferralData, setInitialReferralData] = useState<Partial<QuoteRequest> | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('SUPERVISOR'); // Default role
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);
  
  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Load notifications on mount
  useEffect(() => {
    // In a real app, this might poll periodically or use websockets
    const loadNotifications = () => {
        setNotifications(getAgentNotifications());
    };
    loadNotifications();
  }, []);

  const handleLogin = (role: UserRole, user: UserType) => {
    setUserRole(role);
    setIsAuthenticated(true);
    
    // Set user info from the authenticated user object
    setCurrentUser({ id: user.id, name: user.fullName });
    
    // If credit control logs in, default to approvals page
    if (role === 'CREDIT_CONTROL') {
        setCurrentView('approvals');
    } else {
        setCurrentView('dashboard');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentView('dashboard');
    setCurrentUser(null);
  };

  const handleNavigateToQuote = (quoteId?: string, referralData?: Partial<QuoteRequest>) => {
    setActiveQuoteId(quoteId || null);
    setInitialReferralData(referralData || null);
    setCurrentView('quote');
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    const updated = notifications.map(n => 
        n.id === notification.id ? { ...n, isRead: true } : n
    );
    setNotifications(updated);
    setShowNotifications(false);

    if (notification.quoteId) {
        if (notification.type === 'PAYMENT_RECEIVED' || notification.type === 'APPROVAL_UPDATE') {
            handleNavigateToQuote(notification.quoteId);
        } else {
            handleNavigateToQuote(notification.quoteId);
        }
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
            <AgentDashboard 
                onNavigateToQuote={handleNavigateToQuote} 
                userRole={userRole}
                currentUserId={currentUser?.id}
                currentUserName={currentUser?.name}
            />
        );
      case 'recent-checks':
        return <RecentChecksPage onNavigateToQuote={handleNavigateToQuote} userRole={userRole} />;
      case 'quote-management':
        return (
          <QuoteManagementPage 
            onNavigateToQuote={handleNavigateToQuote}
            userRole={userRole}
            currentUserId={currentUser?.id}
            currentUserName={currentUser?.name}
            isManagerView={userRole === 'SUPERVISOR' || userRole === 'DEVELOPER'}
          />
        );
      case 'my-pool':
        return currentUser ? (
          <MyPoolPage
            currentUserId={currentUser.id}
            currentUserName={currentUser.name}
            onNavigateToQuote={handleNavigateToQuote}
          />
        ) : null;
      case 'referrals':
        return <ReferralManagementPage onNavigateToQuote={handleNavigateToQuote} />;
      case 'renewals':
        return <RenewalsPage onNavigateToQuote={handleNavigateToQuote} />;
      case 'approvals':
        return <ApprovalsPage />;
      case 'developer':
        return <DeveloperConsole />;
      case 'quote':
        return (
          <QuickQuoteFlow 
            onComplete={() => setCurrentView('dashboard')} 
            initialData={initialReferralData}
            existingQuoteId={activeQuoteId}
            userRole={userRole}
            currentUserId={currentUser?.id}
            currentUserName={currentUser?.name}
          />
        );
      case 'referral-portal':
        return <EmployeeReferralPortal />;
      default:
        return (
            <AgentDashboard 
                onNavigateToQuote={handleNavigateToQuote} 
                userRole={userRole}
                currentUserId={currentUser?.id}
                currentUserName={currentUser?.name}
            />
        );
    }
  };

  // 1. Auth Gate
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // 2. If in Referral Portal mode (simulating a separate login/view for non-agents)
  if (currentView === 'referral-portal') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="logo.png" alt="Zain Logo" className="w-8 h-8 object-contain" />
              <h1 className="text-xl font-bold text-gray-900">Zain Insure <span className="text-gray-500 text-sm font-normal">Employee Portal</span></h1>
            </div>
            <button 
              onClick={() => setCurrentView('dashboard')}
              className="text-sm text-zain-600 hover:text-zain-800 font-medium"
            >
              Switch to Agent View
            </button>
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {renderContent()}
        </main>
      </div>
    );
  }

  // 3. Agent Layout
  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white border-r border-slate-800 shadow-2xl">
        <div className="h-14 flex items-center px-4 border-b border-slate-800 bg-slate-950/50">
           <img src="logo.png" alt="Zain Logo" className="w-7 h-7 mr-2 object-contain" />
           <span className="text-base font-bold tracking-tight">Zain Insure</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-3">
          <ul className="space-y-1 px-2">
            <li>
              <button 
                onClick={() => setCurrentView('dashboard')}
                className={`flex items-center w-full px-3 py-2 text-sm rounded-lg transition-all duration-200 group ${
                  currentView === 'dashboard' ? 'bg-gradient-to-r from-zain-600 to-zain-700 text-white shadow-lg shadow-zain-600/50' : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <LayoutDashboard className={`w-4 h-4 mr-2 ${
                  currentView === 'dashboard' ? '' : 'group-hover:scale-110 transition-transform'
                }`} />
                Dashboard
              </button>
            </li>
            <li>
              <button 
                onClick={() => handleNavigateToQuote()}
                className={`flex items-center w-full px-3 py-2 text-sm rounded-lg transition-all duration-200 group ${
                  currentView === 'quote' ? 'bg-gradient-to-r from-zain-600 to-zain-700 text-white shadow-lg shadow-zain-600/50' : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <FileText className={`w-4 h-4 mr-2 ${
                  currentView === 'quote' ? '' : 'group-hover:scale-110 transition-transform'
                }`} />
                New Quote
              </button>
            </li>
            <li>
              <button 
                onClick={() => setCurrentView('quote-management')}
                className={`flex items-center w-full px-3 py-2 text-sm rounded-lg transition-all duration-200 group ${
                  currentView === 'quote-management' ? 'bg-gradient-to-r from-zain-600 to-zain-700 text-white shadow-lg shadow-zain-600/50' : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <FileCheck className={`w-4 h-4 mr-2 ${
                  currentView === 'quote-management' ? '' : 'group-hover:scale-110 transition-transform'
                }`} />
                Quote Management
              </button>
            </li>
            <li>
              <button 
                onClick={() => setCurrentView('my-pool')}
                className={`flex items-center w-full px-3 py-2 text-sm rounded-lg transition-all duration-200 group ${
                  currentView === 'my-pool' ? 'bg-gradient-to-r from-zain-600 to-zain-700 text-white shadow-lg shadow-zain-600/50' : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <Inbox className={`w-4 h-4 mr-2 ${
                  currentView === 'my-pool' ? '' : 'group-hover:scale-110 transition-transform'
                }`} />
                My Pool
              </button>
            </li>
            <li>
              <button 
                onClick={() => setCurrentView('recent-checks')}
                className={`flex items-center w-full px-3 py-2 text-sm rounded-lg transition-all duration-200 group ${
                  currentView === 'recent-checks' ? 'bg-gradient-to-r from-zain-600 to-zain-700 text-white shadow-lg shadow-zain-600/50' : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <ClipboardList className={`w-4 h-4 mr-2 ${
                  currentView === 'recent-checks' ? '' : 'group-hover:scale-110 transition-transform'
                }`} />
                Queries
              </button>
            </li>
            
            {/* Conditional Approvals Tab */}
            {(userRole === 'SUPERVISOR' || userRole === 'CREDIT_CONTROL' || userRole === 'DEVELOPER') && (
                <li>
                  <button 
                    onClick={() => setCurrentView('approvals')}
                    className={`flex items-center w-full px-3 py-2 text-sm rounded-lg transition-all duration-200 group ${
                      currentView === 'approvals' ? 'bg-gradient-to-r from-zain-600 to-zain-700 text-white shadow-lg shadow-zain-600/50' : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                    }`}
                  >
                    <ShieldCheck className={`w-4 h-4 mr-2 ${
                      currentView === 'approvals' ? '' : 'group-hover:scale-110 transition-transform'
                    }`} />
                    Approvals
                  </button>
                </li>
            )}

            <li>
              <button 
                onClick={() => setCurrentView('renewals')}
                className={`flex items-center w-full px-3 py-2 text-sm rounded-lg transition-all duration-200 group ${
                  currentView === 'renewals' ? 'bg-gradient-to-r from-zain-600 to-zain-700 text-white shadow-lg shadow-zain-600/50' : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${
                  currentView === 'renewals' ? '' : 'group-hover:scale-110 transition-transform'
                }`} />
                Renewals
              </button>
            </li>
            <li>
              <button 
                onClick={() => setCurrentView('referrals')}
                className={`flex items-center w-full px-3 py-2 text-sm rounded-lg transition-all duration-200 group ${
                  currentView === 'referrals' ? 'bg-gradient-to-r from-zain-600 to-zain-700 text-white shadow-lg shadow-zain-600/50' : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <Inbox className={`w-4 h-4 mr-2 ${
                  currentView === 'referrals' ? '' : 'group-hover:scale-110 transition-transform'
                }`} />
                Referrals
              </button>
            </li>
            
            {(userRole === 'DEVELOPER') && (
              <li className="pt-3 mt-3 border-t border-slate-800">
                <span className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Admin
                </span>
                <button 
                  onClick={() => setCurrentView('developer')}
                  className={`flex items-center w-full px-3 py-2 mt-2 text-sm rounded-lg transition-all duration-200 group ${
                    currentView === 'developer' ? 'bg-gradient-to-r from-zain-600 to-zain-700 text-white shadow-lg shadow-zain-600/50' : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <Terminal className={`w-4 h-4 mr-2 ${
                    currentView === 'developer' ? '' : 'group-hover:scale-110 transition-transform'
                  }`} />
                  Developer Console
                </button>
              </li>
            )}

            <li className={`pt-3 ${userRole !== 'DEVELOPER' ? 'mt-3 border-t border-slate-800' : ''}`}>
              <span className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                External Tools
              </span>
              <button 
                onClick={() => setCurrentView('referral-portal')}
                className="flex items-center w-full px-3 py-2 mt-2 text-sm rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <Users className="w-4 h-4 mr-2" />
                Referral Portal
              </button>
            </li>
          </ul>
        </nav>

        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <img 
              src="https://picsum.photos/40/40" 
              alt="Agent" 
              className="w-8 h-8 rounded-full border border-slate-600"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">
                  {userRole.replace('_', ' ')}
              </p>
              <div className="text-xs text-slate-400 truncate">
                Active Session
              </div>
            </div>
            <button onClick={handleLogout} title="Logout">
                <LogOut className="w-4 h-4 text-slate-400 cursor-pointer hover:text-white" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 h-12 flex items-center justify-between px-4 sm:px-5 lg:px-6 relative shadow-sm">
          <div className="flex items-center md:hidden">
            <button className="text-gray-500 hover:text-gray-700" aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 flex justify-end items-center gap-4">
            
            {/* Notification Bell */}
            <div className="relative">
                <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-1.5 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-zain-500"
                    aria-label="View notifications"
                >
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                    )}
                    <Bell className="w-5 h-5" />
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                    <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 z-50 animate-in fade-in slide-in-from-top-2">
                        <div className="p-3 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xs font-bold text-gray-900">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="text-xs font-medium text-zain-600 bg-zain-50 px-2 py-0.5 rounded-full">{unreadCount} New</span>
                            )}
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {notifications.length > 0 ? (
                                <ul className="divide-y divide-gray-100">
                                    {notifications.map((notification) => (
                                        <li 
                                            key={notification.id} 
                                            onClick={() => handleNotificationClick(notification)}
                                            className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors flex gap-2 ${!notification.isRead ? 'bg-gray-50/50' : ''}`}
                                        >
                                            <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center 
                                                ${notification.type === 'PAYMENT_RECEIVED' ? 'bg-green-100 text-green-600' : 
                                                  notification.type === 'QUOTE_EXPIRED' ? 'bg-red-100 text-red-600' : 
                                                  notification.type === 'APPROVAL_UPDATE' ? 'bg-amber-100 text-amber-600' :
                                                  'bg-blue-100 text-blue-600'}`
                                            }>
                                                {notification.type === 'PAYMENT_RECEIVED' && <CheckCircle className="w-3 h-3" />}
                                                {notification.type === 'QUOTE_EXPIRED' && <AlertCircle className="w-3 h-3" />}
                                                {notification.type === 'DOCS_UPLOADED' && <FileCheck className="w-3 h-3" />}
                                                {notification.type === 'REMINDER' && <Clock className="w-3 h-3" />}
                                                {notification.type === 'APPROVAL_UPDATE' && <Shield className="w-3 h-3" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <p className={`text-sm font-medium truncate ${!notification.isRead ? 'text-gray-900' : 'text-gray-600'}`}>
                                                        {notification.title}
                                                    </p>
                                                    {!notification.isRead && (
                                                        <span className="w-2 h-2 bg-zain-600 rounded-full shrink-0 mt-1.5"></span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
                                                <p className="text-[10px] text-gray-400 mt-1.5">{notification.time}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                    No notifications.
                                </div>
                            )}
                        </div>
                        <div className="p-3 bg-gray-50 border-t border-gray-100 rounded-b-xl text-center">
                            <button className="text-xs font-semibold text-zain-600 hover:text-zain-800">View All Activity</button>
                        </div>
                    </div>
                )}
            </div>

          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
