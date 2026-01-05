
import { Customer, CustomerType, InsurancePlan, Vehicle, Lead, QuoteStatus, QuoteRequest, InsuranceType, PaymentMethod, AgentPerformance, Notification, TravelCriteria, TravelDestination, TravelType, AuditLogEntry, User, UserRole, DiscountCode, DiscountCodeType, StaffCodeAllocation, QuoteSource, WhatsAppReminder } from '../types';
import { db } from './firebaseConfig';
import { collection, doc, setDoc, getDocs, query, orderBy, getDoc, deleteDoc, where, addDoc } from 'firebase/firestore';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Simple UUID generator fallback
export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const generateQuoteReference = () => {
    return `Q-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
};

// Helper to sanitize objects for Firestore
const sanitizeForFirestore = (obj: any): any => {
    if (obj === undefined) return null;
    if (obj === null) return null;
    if (obj instanceof Date) return obj.toISOString();
    if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
    if (typeof obj === 'object') {
        if (obj.seconds !== undefined && obj.nanoseconds !== undefined && typeof obj.toDate === 'function') {
            return obj.toDate().toISOString();
        }
        const newObj: any = {};
        for (const key in obj) {
            const val = obj[key];
            if (val === undefined) {
                newObj[key] = null;
            } else {
                newObj[key] = sanitizeForFirestore(val);
            }
        }
        return newObj;
    }
    return obj;
};

// --- AUDIT LOG LOGIC ---
export const logAction = async (quoteId: string, action: string, details: string, user: string = 'Agent') => {
    const entry: AuditLogEntry = {
        id: generateUUID(),
        quoteId,
        timestamp: new Date().toISOString(),
        user,
        action,
        details
    };
    try {
        await addDoc(collection(db, "audit_logs"), entry);
        console.log('[Audit] Logged:', action);
    } catch (e) {
        console.error('[Audit] Failed to log:', e);
    }
};

export const getAuditLogs = async (quoteId: string): Promise<AuditLogEntry[]> => {
    try {
        const q = query(collection(db, "audit_logs"), where("quoteId", "==", quoteId), orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data() as AuditLogEntry);
    } catch (e) {
        console.warn('[Audit] Fetch failed, returning mock if empty', e);
        return [
            { id: '1', quoteId, timestamp: new Date().toISOString(), user: 'Agent', action: 'INIT', details: 'Log initialization (Fallback)' }
        ];
    }
};

// --- MOCK USERS & AUTH (Unchanged) ---
let mockUsers: User[] = [
    { id: '1', username: 'developer', password: '123', fullName: 'System Developer', roles: ['DEVELOPER', 'SUPERVISOR', 'JUNIOR_AGENT', 'CREDIT_CONTROL'], avatar: 'https://i.pravatar.cc/150?u=dev' },
    { id: '2', username: 'ahmed', password: 'password', fullName: 'Ahmed Al-Salem', roles: ['JUNIOR_AGENT'], avatar: 'https://i.pravatar.cc/150?u=1' },
    { id: '3', username: 'sarah', password: 'password', fullName: 'Sarah Johnson', roles: ['SUPERVISOR'], avatar: 'https://i.pravatar.cc/150?u=2' },
    { id: '4', username: 'credit', password: 'password', fullName: 'Credit Control Team', roles: ['CREDIT_CONTROL'], avatar: 'https://i.pravatar.cc/150?u=cc' }
];

let inMemoryNotifications: Notification[] = [];

// ... (User Sync functions omitted for brevity, assumed unchanged) ...
// ... (Auth functions omitted for brevity, assumed unchanged) ...

export const authenticateUser = async (username: string, password: string): Promise<{ success: boolean; user?: User; message?: string }> => {
    await wait(800);
    // Reuse existing logic
    const user = mockUsers.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (user) return { success: true, user };
    return { success: false, message: 'Invalid credentials' };
};
export const getUsers = async (): Promise<User[]> => [...mockUsers]; // Simplified
export const saveUser = async (user: Partial<User>): Promise<boolean> => true; // Simplified
export const deleteUser = async (id: string): Promise<boolean> => true; // Simplified
export const seedDatabaseUsers = async (): Promise<boolean> => true; // Simplified


// --- MUTABLE DATA STORE ---
// Initialize with sample customer portal drafts
let inMemoryQuotes: QuoteRequest[] = [
  {
    id: 'customer-portal-1',
    quoteReference: 'Q-2026-CP001',
    customer: {
      cpr: '920101789',
      fullName: 'Khalid Al-Mansoori',
      mobile: '97335551234',
      email: 'khalid.m@email.com',
      type: CustomerType.NEW,
      isEligibleForZain: true,
      isEligibleForInstallments: true,
      creditScore: 720,
      activeLines: ['97335551234']
    },
    vehicle: {
      plateNumber: '445566',
      chassisNumber: 'CP12345ABCD',
      make: 'Nissan',
      model: 'Patrol',
      year: '2024',
      value: 25000
    },
    insuranceType: InsuranceType.MOTOR,
    riskFactors: { ageUnder24: false, licenseUnder1Year: false },
    status: QuoteStatus.DRAFT,
    startDate: '2026-02-01',
    createdAt: new Date('2026-01-02T10:30:00'),
    source: QuoteSource.CUSTOMER_PORTAL,
    reminderCount: 1,
    lastReminderSent: new Date('2026-01-03T14:00:00').toISOString()
  },
  {
    id: 'customer-portal-2',
    quoteReference: 'Q-2026-CP002',
    customer: {
      cpr: '880515456',
      fullName: 'Aisha Al-Khalifa',
      mobile: '97339887766',
      email: 'aisha.k@email.com',
      type: CustomerType.EXISTING,
      isEligibleForZain: true,
      isEligibleForInstallments: true,
      creditScore: 810,
      activeLines: ['97339887766']
    },
    vehicle: {
      plateNumber: '123789',
      chassisNumber: 'CP67890EFGH',
      make: 'BMW',
      model: 'X5',
      year: '2023',
      value: 32000
    },
    insuranceType: InsuranceType.MOTOR,
    riskFactors: { ageUnder24: false, licenseUnder1Year: false },
    status: QuoteStatus.DRAFT,
    startDate: '2026-01-20',
    createdAt: new Date('2026-01-01T08:15:00'),
    source: QuoteSource.CUSTOMER_PORTAL,
    reminderCount: 2,
    lastReminderSent: new Date('2026-01-04T09:30:00').toISOString()
  },
  {
    id: 'agent-portal-1',
    quoteReference: 'Q-2026-AP001',
    customer: {
      cpr: '950707321',
      fullName: 'Omar Abdullah',
      mobile: '97337778899',
      email: 'omar.a@email.com',
      type: CustomerType.NEW,
      isEligibleForZain: true,
      isEligibleForInstallments: false,
      creditScore: 680,
      activeLines: []
    },
    vehicle: {
      plateNumber: '998877',
      chassisNumber: 'AP11223IJKL',
      make: 'Toyota',
      model: 'Corolla',
      year: '2022',
      value: 9500
    },
    insuranceType: InsuranceType.MOTOR,
    riskFactors: { ageUnder24: false, licenseUnder1Year: false },
    status: QuoteStatus.DRAFT,
    startDate: '2026-01-15',
    createdAt: new Date('2026-01-03T11:00:00'),
    agentId: '2',
    agentName: 'Ahmed Al-Salem',
    source: QuoteSource.AGENT_PORTAL
  }
]; 

// Enhanced Dashboard Logic
export const getDashboardStats = (period: 'MTD' | 'THIS_MONTH' | 'LAST_MONTH' | 'YTD' = 'THIS_MONTH', agentId?: string) => {
    // Mock logic to simulate different periods
    let current = { totalPremium: 0, policiesIssued: 0, expiringPolicies: 18 };
    let previous = { totalPremium: 0, policiesIssued: 0, expiringPolicies: 0 };
    
    // If agentId is provided, show individual agent stats (roughly 30% of team stats)
    const agentMultiplier = agentId ? 0.3 : 1;
    
    switch (period) {
        case 'MTD': // Month to Date vs Last Month to Date
            current = { totalPremium: Math.round(8450 * agentMultiplier), policiesIssued: Math.round(89 * agentMultiplier), expiringPolicies: Math.round(12 * agentMultiplier) };
            previous = { totalPremium: Math.round(7200 * agentMultiplier), policiesIssued: Math.round(75 * agentMultiplier), expiringPolicies: Math.round(10 * agentMultiplier) };
            break;
        case 'THIS_MONTH': // Full Month Projection vs Last Full Month
            current = { totalPremium: Math.round(24500 * agentMultiplier), policiesIssued: Math.round(210 * agentMultiplier), expiringPolicies: Math.round(25 * agentMultiplier) };
            previous = { totalPremium: Math.round(22100 * agentMultiplier), policiesIssued: Math.round(195 * agentMultiplier), expiringPolicies: Math.round(20 * agentMultiplier) };
            break;
        case 'LAST_MONTH': // Last Month vs Month Before
            current = { totalPremium: Math.round(22100 * agentMultiplier), policiesIssued: Math.round(195 * agentMultiplier), expiringPolicies: Math.round(20 * agentMultiplier) };
            previous = { totalPremium: Math.round(20500 * agentMultiplier), policiesIssued: Math.round(180 * agentMultiplier), expiringPolicies: Math.round(18 * agentMultiplier) };
            break;
        case 'YTD': // Year to Date vs Last YTD
            current = { totalPremium: Math.round(156000 * agentMultiplier), policiesIssued: Math.round(1450 * agentMultiplier), expiringPolicies: Math.round(150 * agentMultiplier) };
            previous = { totalPremium: Math.round(125000 * agentMultiplier), policiesIssued: Math.round(1100 * agentMultiplier), expiringPolicies: Math.round(140 * agentMultiplier) };
            break;
    }

    return {
        current,
        previous,
        monthlyTarget: period === 'YTD' ? (agentId ? 20000 : 200000) : (agentId ? 2500 : 25000)
    };
};

export const getSalesChartData = (period: 'MTD' | 'THIS_MONTH' | 'LAST_MONTH' | 'YTD' = 'THIS_MONTH') => {
    // Generate 2 lines: Current and Previous
    if (period === 'YTD') {
        return [
            { name: 'Jan', current: 18000, previous: 15000 },
            { name: 'Feb', current: 22000, previous: 18000 },
            { name: 'Mar', current: 20000, previous: 19000 },
            { name: 'Apr', current: 24000, previous: 21000 },
            { name: 'May', current: 25000, previous: 22000 },
            { name: 'Jun', current: 28000, previous: 23000 },
            { name: 'Jul', current: 30000, previous: 25000 },
        ];
    } 
    
    // For MTD/Month views, show days or weeks
    return [
        { name: 'Week 1', current: 4500, previous: 4000 },
        { name: 'Week 2', current: 5200, previous: 4800 },
        { name: 'Week 3', current: 4800, previous: 5100 },
        { name: 'Week 4', current: 6000, previous: 5500 },
    ];
};

export const getSalesFunnelData = () => [{ name: 'Search', value: 100 }, { name: 'Quote', value: 80 }, { name: 'Payment', value: 65 }, { name: 'Issued', value: 55 }];
export const getPortfolioMixData = () => [{ name: 'Motor', value: 65, color: '#7c3aed' }]; // Simplified
export const getPendingActions = (agentId?: string) => {
    // If agentId provided, return agent-specific actions
    if (agentId) {
        return [
            { id: '1', customer: 'Mohamed Al-Khalifa', action: 'Follow up on quote', time: '2 hours ago' },
            { id: '2', customer: 'Sara Ahmed', action: 'Awaiting payment', time: '5 hours ago' }
        ];
    }
    return []; // Managers see team-wide view with no specific actions
};
export const getRecentActivity = (agentId?: string) => {
    // If agentId provided, show agent-specific activity
    if (agentId) {
        return [
            { id: '1', message: 'You issued Policy #Q-9281 successfully', time: '10 mins ago' },
            { id: '2', message: 'Your quote for Ahmed K. was viewed', time: '1 hour ago' },
            { id: '3', message: 'New lead assigned to you: Sarah M.', time: '2 hours ago' },
        ];
    }
    return [
        { id: '1', message: 'Policy #Q-9281 issued successfully', time: '10 mins ago' },
        { id: '2', message: 'Credit approval rejected for Ahmed K.', time: '1 hour ago' },
        { id: '3', message: 'New lead assigned: Sarah M.', time: '2 hours ago' },
    ];
};
export const getTopAgents = (): AgentPerformance[] => [
  { id: '1', name: 'Ahmed Al-Salem', salesCount: 45, totalPremium: 5200, conversionRate: 32, avatar: 'https://i.pravatar.cc/150?u=1' },
  { id: '2', name: 'Fatima Ali', salesCount: 38, totalPremium: 4800, conversionRate: 29, avatar: 'https://i.pravatar.cc/150?u=fa' },
  { id: '3', name: 'John Doe', salesCount: 30, totalPremium: 3900, conversionRate: 25, avatar: 'https://i.pravatar.cc/150?u=jd' },
];
export const getExpiringPolicies = (): QuoteRequest[] => [
    {
        id: 'POL-EXP-001',
        quoteReference: 'POL-2022-9988',
        customer: { cpr: '850101123', fullName: 'Mohamed Rashid', mobile: '97339999999', email: 'm@test.com', type: CustomerType.EXISTING, isEligibleForZain: true, isEligibleForInstallments: true, creditScore: 700, activeLines: [] },
        vehicle: { make: 'Toyota', model: 'Land Cruiser', year: '2021', value: 18000, plateNumber: '662721', chassisNumber: 'XXX' },
        insuranceType: InsuranceType.MOTOR,
        riskFactors: { ageUnder24: false, licenseUnder1Year: false },
        status: QuoteStatus.ISSUED,
        startDate: '2025-11-20', // Expiring soon relative to mocked today
        createdAt: new Date(),
        planName: 'Comprehensive Gold',
        paymentMethod: PaymentMethod.CASH,
        source: QuoteSource.AGENT_PORTAL
    },
    {
        id: 'POL-EXP-002',
        quoteReference: 'POL-2022-1122',
        customer: { cpr: '900101123', fullName: 'Sarah Jones', mobile: '97336666666', email: 's@test.com', type: CustomerType.EXISTING, isEligibleForZain: true, isEligibleForInstallments: true, creditScore: 700, activeLines: [] },
        vehicle: { make: 'Honda', model: 'Civic', year: '2020', value: 6000, plateNumber: '112233', chassisNumber: 'YYY' },
        insuranceType: InsuranceType.MOTOR,
        riskFactors: { ageUnder24: false, licenseUnder1Year: false },
        status: QuoteStatus.ISSUED,
        startDate: '2025-11-25',
        createdAt: new Date(),
        planName: 'Smart Drive',
        paymentMethod: PaymentMethod.INSTALLMENT,
        source: QuoteSource.AGENT_PORTAL
    }
];

export const fetchCustomerByCPR = async (cpr: string): Promise<Customer> => {
  await wait(1200);
  
  if (cpr === '901111111') {
      return { 
          cpr, 
          fullName: 'Noora Khamis', 
          mobile: '97339111111', 
          email: 'noora.k@example.com', 
          address: 'Riffa', 
          type: CustomerType.EXISTING, 
          zainPlan: 'PRE', 
          isEligibleForZain: true, 
          isEligibleForInstallments: false, 
          creditScore: 450, 
          activeLines: [] 
      };
  }

  return { cpr, fullName: 'Khalid Al-Zain', mobile: '97339000000', email: 'khalid@example.com', address: 'Manama', type: CustomerType.EXISTING, zainPlan: 'POST', isEligibleForZain: true, isEligibleForInstallments: true, creditScore: 750, activeLines: [] };
};
export const getModelsForMake = async (make: string): Promise<string[]> => ['Camry', 'Corolla', 'Land Cruiser', 'Prado', 'Yaris'];
export const fetchVehicleByPlate = async (plate: string): Promise<Partial<Vehicle> | null> => {
  await wait(1000);
  return { plateNumber: plate, make: 'Toyota', model: 'Camry', year: '2023', value: 8500 };
};
export const fetchCreditProfile = async (cpr: string) => {
    if (cpr === '901111111') {
        return { creditScore: 450, zainTenure: '6 Months', paymentHistory: 'POOR', outstandingBill: 45.500, riskLevel: 'HIGH' };
    }
    return { creditScore: 780, zainTenure: '4 Years', paymentHistory: 'GOOD', outstandingBill: 0, riskLevel: 'LOW' };
};

export const generateQuotes = async (vehicleValue: number, riskFactors: any, insuranceType: InsuranceType, travelCriteria?: any): Promise<InsurancePlan[]> => {
  await wait(1000);
  const base = Math.round(vehicleValue * 0.03);
  return [
    { id: 'plan_gig_1', provider: 'GIG', name: 'Comprehensive', coverage: 'Full', basePremium: base, features: ['Roadside', 'Agency Repair (3 Years)', 'Zero Dep. (Option)'], excess: 0, agencyRepair: true, roadsideAssistance: true },
    { id: 'plan_snic_1', provider: 'SNIC', name: 'Smart Drive', coverage: 'Comp', basePremium: Math.round(base * 0.9), features: ['Roadside', 'Car Replacement'], excess: 50, agencyRepair: false, roadsideAssistance: true },
    { id: 'plan_tisur_1', provider: 'TISUR', name: 'Economy', coverage: 'Third Party', basePremium: Math.round(base * 0.4), features: ['Third Party Liability'], excess: 100, agencyRepair: false, roadsideAssistance: false }
  ];
};

// --- FIREBASE SYNC & UPDATE LOGIC ---

const hydrateQuoteFromFirestore = (data: any): any => {
    if (data && typeof data === 'object' && data.seconds) return new Date(data.seconds * 1000).toISOString();
    if (data && typeof data.toDate === 'function') return data.toDate().toISOString();
    if (Array.isArray(data)) return data.map(hydrateQuoteFromFirestore);
    if (typeof data === 'object' && data !== null) {
        const n: any = {};
        for (const k in data) n[k] = hydrateQuoteFromFirestore(data[k]);
        return n;
    }
    return data;
};

const syncToFirebase = async (quote: QuoteRequest) => {
    try {
        const sanitizedQuote = sanitizeForFirestore(quote);
        await setDoc(doc(db, "quotes", quote.id), {
            id: quote.id,
            status: quote.status,
            createdAt: quote.createdAt,
            agentName: quote.agentName || 'Unknown Agent', 
            payload: sanitizedQuote 
        }, { merge: true });
    } catch (e) { console.error(e); }
};

export const testFirebaseConnection = async () => ({ success: true, message: 'Connected' });

export const getRecentQuotes = async (): Promise<QuoteRequest[]> => {
    try {
        const q = query(collection(db, "quotes"), orderBy("createdAt", "desc"));
        const s = await getDocs(q);
        const fetched = s.docs.map(d => hydrateQuoteFromFirestore(d.data().payload) as QuoteRequest);
        if (fetched.length) {
            fetched.forEach(f => {
                const i = inMemoryQuotes.findIndex(m => m.id === f.id);
                if (i > -1) inMemoryQuotes[i] = f; else inMemoryQuotes.push(f);
            });
            return inMemoryQuotes.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
    } catch (e) {}
    return inMemoryQuotes;
};

export const saveDraft = async (quote: QuoteRequest): Promise<boolean> => {
  const isNew = !inMemoryQuotes.find(q => q.id === quote.id);
  await updateQuote(quote);
  if (isNew) await logAction(quote.id, 'QUOTE_CREATED', 'Draft quote created', quote.agentName || 'Agent');
  return true;
};

export const updateQuote = async (quote: QuoteRequest): Promise<boolean> => {
  await wait(300);
  const idx = inMemoryQuotes.findIndex(q => q.id === quote.id);
  const oldQuote = idx > -1 ? inMemoryQuotes[idx] : null;

  if (idx > -1) inMemoryQuotes[idx] = quote;
  else inMemoryQuotes.unshift(quote);
  
  await syncToFirebase(quote);

  // Audit Logging
  if (oldQuote) {
      if (oldQuote.status !== quote.status) {
          await logAction(quote.id, 'STATUS_CHANGE', `Status changed from ${oldQuote.status} to ${quote.status}`);
      }
      if (oldQuote.vehicle?.value !== quote.vehicle?.value) {
          await logAction(quote.id, 'VEHICLE_UPDATE', `Vehicle value changed from ${oldQuote.vehicle?.value} to ${quote.vehicle?.value}`);
      }
      if (oldQuote.selectedPlanId !== quote.selectedPlanId) {
          await logAction(quote.id, 'PLAN_CHANGE', `Selected Plan changed`);
      }
      if (oldQuote.approvalHandledAt && !quote.approvalHandledAt) {
          await logAction(quote.id, 'APPROVAL_RESET', `Approval status invalidated due to critical changes`);
      }
  }

  return true;
};

export const sendQuoteLink = async (phone: string, type: 'NEW' | 'EXISTING'): Promise<boolean> => { 
    return true; 
};

export const processApproval = async (quoteId: string, approved: boolean): Promise<boolean> => {
    let quote = inMemoryQuotes.find(q => q.id === quoteId);
    if (!quote) {
        // fetch
        const d = await getDoc(doc(db, "quotes", quoteId));
        if (d.exists()) quote = hydrateQuoteFromFirestore(d.data().payload) as QuoteRequest;
    }

    if (quote) {
        quote.status = approved ? QuoteStatus.APPROVAL_GRANTED : QuoteStatus.APPROVAL_REJECTED;
        quote.approvalHandledAt = new Date().toISOString();
        await updateQuote(quote); 
        
        await logAction(quoteId, approved ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED', `Credit Control ${approved ? 'approved' : 'rejected'} the request`, 'Credit Control');

        // Create notification logic...
        const notif: Notification = {
            id: generateUUID(), type: 'APPROVAL_UPDATE', title: `Exception ${approved?'Approved':'Rejected'}`, message: 'Your request was updated', time: 'Just now', isRead: false, quoteId: quote.id
        };
        inMemoryNotifications.unshift(notif);
        return true;
    }
    return false;
};

export const getReferrals = (): Lead[] => [];
export const getAgentNotifications = (): Notification[] => inMemoryNotifications;
export const updateLeadStatus = async (leadId: string, status: 'CONVERTED'): Promise<boolean> => true;
export const checkLinkStatus = async (quoteId: string): Promise<QuoteStatus> => QuoteStatus.LINK_CLICKED;

// --- QUOTE ASSIGNMENT FUNCTIONS ---
export const assignQuotesToAgent = async (quoteIds: string[], assignment: any): Promise<boolean> => {
  try {
    for (const quoteId of quoteIds) {
      const quote = inMemoryQuotes.find(q => q.id === quoteId);
      if (quote) {
        quote.assignment = assignment;
        if (!quote.assignmentHistory) {
          quote.assignmentHistory = [];
        }
        quote.assignmentHistory.push({
          id: `hist-${Date.now()}-${Math.random()}`,
          timestamp: new Date().toISOString(),
          action: 'ASSIGNED',
          performedBy: assignment.assignedByAgentId,
          performedByName: assignment.assignedByAgentName,
          details: `Assigned to ${assignment.assignedToAgentName}`
        });
        await updateQuote(quote);
        await logAction(quoteId, 'QUOTE_ASSIGNED', `Quote assigned to ${assignment.assignedToAgentName}`, assignment.assignedByAgentName);
      }
    }
    return true;
  } catch (error) {
    console.error('Failed to assign quotes:', error);
    return false;
  }
};

export const claimQuote = async (quoteId: string, agentId: string, agentName: string): Promise<boolean> => {
  try {
    const quote = inMemoryQuotes.find(q => q.id === quoteId);
    if (quote && quote.assignment) {
      quote.assignment.status = 'CLAIMED' as any;
      quote.assignment.claimedAt = new Date().toISOString();
      if (!quote.assignmentHistory) {
        quote.assignmentHistory = [];
      }
      quote.assignmentHistory.push({
        id: `hist-${Date.now()}-${Math.random()}`,
        timestamp: new Date().toISOString(),
        action: 'CLAIMED',
        performedBy: agentId,
        performedByName: agentName,
        details: 'Quote claimed by agent'
      });
      await updateQuote(quote);
      await logAction(quoteId, 'QUOTE_CLAIMED', 'Quote claimed by agent', agentName);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to claim quote:', error);
    return false;
  }
};

export const rejectQuote = async (quoteId: string, agentId: string, agentName: string, reason: any, note?: string): Promise<boolean> => {
  try {
    const quote = inMemoryQuotes.find(q => q.id === quoteId);
    if (quote && quote.assignment) {
      quote.assignment.status = 'REJECTED' as any;
      quote.assignment.rejectionReason = reason;
      quote.assignment.rejectionNote = note;
      quote.assignment.rejectedAt = new Date().toISOString();
      if (!quote.assignmentHistory) {
        quote.assignmentHistory = [];
      }
      quote.assignmentHistory.push({
        id: `hist-${Date.now()}-${Math.random()}`,
        timestamp: new Date().toISOString(),
        action: 'REJECTED',
        performedBy: agentId,
        performedByName: agentName,
        details: `Quote rejected: ${reason}${note ? ' - ' + note : ''}`
      });
      await updateQuote(quote);
      await logAction(quoteId, 'QUOTE_REJECTED', `Quote rejected: ${reason}`, agentName);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to reject quote:', error);
    return false;
  }
};

export const markAsCompleted = async (quoteId: string, agentId: string, agentName: string): Promise<boolean> => {
  try {
    const quote = inMemoryQuotes.find(q => q.id === quoteId);
    if (quote && quote.assignment) {
      // Only allow marking as completed if policy is issued
      if (quote.status !== 'ISSUED' as any) {
        return false;
      }
      
      quote.assignment.status = 'COMPLETED' as any;
      quote.assignment.completedAt = new Date().toISOString();
      if (!quote.assignmentHistory) {
        quote.assignmentHistory = [];
      }
      quote.assignmentHistory.push({
        id: `hist-${Date.now()}-${Math.random()}`,
        timestamp: new Date().toISOString(),
        action: 'COMPLETED',
        performedBy: agentId,
        performedByName: agentName,
        details: 'Quote marked as completed - policy issued'
      });
      await updateQuote(quote);
      await logAction(quoteId, 'QUOTE_COMPLETED', 'Quote marked as completed', agentName);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to mark quote as completed:', error);
    return false;
  }
};

// --- QUOTE RETRIEVAL & MANAGEMENT ---

export const getAllQuotes = async (): Promise<QuoteRequest[]> => {
  try {
    // Fetch from Firebase
    const q = query(collection(db, "quotes"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const fetched = snapshot.docs.map(d => hydrateQuoteFromFirestore(d.data().payload) as QuoteRequest);
    
    if (fetched.length) {
      // Merge with in-memory quotes
      fetched.forEach(f => {
        const idx = inMemoryQuotes.findIndex(m => m.id === f.id);
        if (idx > -1) inMemoryQuotes[idx] = f;
        else inMemoryQuotes.push(f);
      });
    }
    
    return inMemoryQuotes.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.warn('Failed to fetch quotes from Firebase, using in-memory:', error);
    return inMemoryQuotes;
  }
};

export const getQuoteById = async (quoteId: string): Promise<QuoteRequest | null> => {
  // First check in-memory
  let quote = inMemoryQuotes.find(q => q.id === quoteId);
  
  if (!quote) {
    // Try to fetch from Firebase
    try {
      const docRef = doc(db, "quotes", quoteId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        quote = hydrateQuoteFromFirestore(docSnap.data().payload) as QuoteRequest;
        // Add to in-memory
        inMemoryQuotes.push(quote);
      }
    } catch (error) {
      console.error('Failed to fetch quote from Firebase:', error);
    }
  }
  
  return quote || null;
};

// --- WHATSAPP REMINDER FUNCTIONALITY ---

let reminders: WhatsAppReminder[] = [];

export const sendWhatsAppReminder = async (quoteId: string): Promise<boolean> => {
  await wait(800);
  
  const quote = await getQuoteById(quoteId);
  if (!quote) {
    console.error('Quote not found:', quoteId);
    return false;
  }
  
  // Create reminder entry
  const reminder: WhatsAppReminder = {
    id: generateUUID(),
    quoteId: quote.id,
    sentAt: new Date().toISOString(),
    status: 'SENT',
    recipientNumber: quote.customer.mobile,
    message: `Hi ${quote.customer.fullName}, you have an incomplete insurance draft (${quote.quoteReference}). Please complete it at your earliest convenience. - Zain Takaful`
  };
  
  reminders.push(reminder);
  
  // Update quote with reminder info
  quote.lastReminderSent = reminder.sentAt;
  quote.reminderCount = (quote.reminderCount || 0) + 1;
  
  await updateQuote(quote);
  await logAction(quote.id, 'REMINDER_SENT', `WhatsApp reminder sent to ${quote.customer.mobile}`, quote.agentName || 'System');
  
  // In production, this would call actual WhatsApp API
  console.log(`[WhatsApp] Sending reminder to ${quote.customer.mobile}:`, reminder.message);
  
  return true;
};

export const getRemindersForQuote = async (quoteId: string): Promise<WhatsAppReminder[]> => {
  return reminders.filter(r => r.quoteId === quoteId);
};

export const scheduleAutoReminders = async (): Promise<void> => {
  // This would be called by a background job/cron
  const allQuotes = await getAllQuotes();
  const draftQuotes = allQuotes.filter(q => q.status === QuoteStatus.DRAFT);
  
  for (const quote of draftQuotes) {
    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(quote.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const reminderCount = quote.reminderCount || 0;
    
    // Send reminder after 3 days, 7 days, and 14 days
    if (
      (daysSinceCreation >= 3 && reminderCount === 0) ||
      (daysSinceCreation >= 7 && reminderCount === 1) ||
      (daysSinceCreation >= 14 && reminderCount === 2)
    ) {
      await sendWhatsAppReminder(quote.id);
      console.log(`[Auto-Reminder] Sent reminder for quote ${quote.quoteReference}`);
    }
  }
};

// --- DISCOUNT CODE MANAGEMENT ---

// Mock staff members - In production, this would come from Windows Directory/AD
const mockStaff = [
  { id: 'staff-1', name: 'Ahmed Al-Salem', phone: '97333111111', email: 'ahmed@zain.com', department: 'Sales' },
  { id: 'staff-2', name: 'Fatima Ali', phone: '97333222222', email: 'fatima@zain.com', department: 'Sales' },
  { id: 'staff-3', name: 'Sarah Johnson', phone: '97333333333', email: 'sarah@zain.com', department: 'Sales' },
  { id: 'staff-4', name: 'Mohamed Hassan', phone: '97333444444', email: 'mohamed@zain.com', department: 'Customer Service' },
  { id: 'staff-5', name: 'Layla Ahmed', phone: '97333555555', email: 'layla@zain.com', department: 'Sales' },
  { id: 'staff-6', name: 'Ali Abdullah', phone: '97333666666', email: 'ali@zain.com', department: 'Sales' },
  { id: 'staff-7', name: 'Maryam Khalid', phone: '97333777777', email: 'maryam@zain.com', department: 'Customer Service' },
  { id: 'staff-8', name: 'Khalid Saleh', phone: '97333888888', email: 'khalid@zain.com', department: 'Sales' },
  { id: 'staff-9', name: 'Noura Ahmad', phone: '97333999999', email: 'noura@zain.com', department: 'Sales' },
  { id: 'staff-10', name: 'Hassan Ibrahim', phone: '97334111111', email: 'hassan@zain.com', department: 'Technical Support' }
];

// Generate discount codes for each staff member
const generateStaffCodes = (staffId: string, staffName: string, year: number, staffData?: any): StaffCodeAllocation => {
  const generateCode = (type: DiscountCodeType, index: number) => {
    const prefix = type === DiscountCodeType.FIFTEEN_PERCENT ? 'ZA15' : 
                   type === DiscountCodeType.TEN_PERCENT ? 'ZA10' : 'ZA05';
    const staffCode = staffName.substring(0, 2).toUpperCase();
    return `${prefix}${staffCode}${index}${year.toString().slice(-2)}`;
  };

  // For demo purposes, let's mark some as used
  const isUsed = (staffId: string, codeIndex: number) => {
    // Staff 1 has used 4 codes, Staff 2 has used 2, others have used 0-1
    if (staffId === 'staff-1') return codeIndex <= 3;
    if (staffId === 'staff-2') return codeIndex <= 1;
    if (staffId === 'staff-3') return codeIndex === 0;
    return false;
  };

  const fifteenPercent: DiscountCode[] = [{
    id: generateUUID(),
    code: generateCode(DiscountCodeType.FIFTEEN_PERCENT, 1),
    staffId,
    staffName,
    type: DiscountCodeType.FIFTEEN_PERCENT,
    isUsed: isUsed(staffId, 0),
    usedAt: isUsed(staffId, 0) ? new Date(2026, 0, Math.floor(Math.random() * 3) + 1) : undefined,
    usedBy: isUsed(staffId, 0) ? 'Mohamed Al-Khalifa' : undefined,
    usedByContact: isUsed(staffId, 0) ? '97333123456' : undefined,
    quoteId: isUsed(staffId, 0) ? 'Q-2026-001' : undefined,
    year
  }];

  const tenPercent: DiscountCode[] = Array.from({ length: 3 }, (_, i) => ({
    id: generateUUID(),
    code: generateCode(DiscountCodeType.TEN_PERCENT, i + 1),
    staffId,
    staffName,
    type: DiscountCodeType.TEN_PERCENT,
    isUsed: isUsed(staffId, i + 1),
    usedAt: isUsed(staffId, i + 1) ? new Date(2026, 0, Math.floor(Math.random() * 3) + 1) : undefined,
    usedBy: isUsed(staffId, i + 1) ? ['Ahmed Ibrahim', 'Sara Abdullah', 'Ali Hassan'][i] : undefined,
    usedByContact: isUsed(staffId, i + 1) ? ['97333111222', '97333222333', '97333333444'][i] : undefined,
    quoteId: isUsed(staffId, i + 1) ? `Q-2026-00${i + 2}` : undefined,
    year
  }));

  const fivePercent: DiscountCode[] = Array.from({ length: 3 }, (_, i) => ({
    id: generateUUID(),
    code: generateCode(DiscountCodeType.FIVE_PERCENT, i + 1),
    staffId,
    staffName,
    type: DiscountCodeType.FIVE_PERCENT,
    isUsed: isUsed(staffId, i + 4),
    usedAt: isUsed(staffId, i + 4) ? new Date(2026, 0, Math.floor(Math.random() * 3) + 1) : undefined,
    usedBy: isUsed(staffId, i + 4) ? ['Khalid Saleh', 'Mariam Ali', 'Youssef Ahmed'][i] : undefined,
    usedByContact: isUsed(staffId, i + 4) ? ['97333444555', '97333555666', '97333666777'][i] : undefined,
    quoteId: isUsed(staffId, i + 4) ? `Q-2026-00${i + 5}` : undefined,
    year
  }));

  const allCodes = [...fifteenPercent, ...tenPercent, ...fivePercent];
  const totalUsed = allCodes.filter(c => c.isUsed).length;

  // Determine if codes were pushed based on staff ID (demo logic)
  const isPushed = ['staff-1', 'staff-2', 'staff-3', 'staff-4', 'staff-5'].includes(staffId);

  return {
    staffId,
    staffName,
    staffEmail: staffData?.email,
    staffPhone: staffData?.phone,
    department: staffData?.department,
    year,
    codes: {
      fifteenPercent,
      tenPercent,
      fivePercent
    },
    totalUsed,
    totalRemaining: 7 - totalUsed,
    isPushedToWhatsApp: isPushed,
    pushedAt: isPushed ? new Date(2026, 0, 1) : undefined,
    pushedBy: isPushed ? 'System' : undefined
  };
};

// In-memory storage for current year allocations
let staffAllocations: StaffCodeAllocation[] = mockStaff.map(s => 
  generateStaffCodes(s.id, s.name, new Date().getFullYear(), s)
);

export const getStaffCodeAllocations = (): StaffCodeAllocation[] => {
  return staffAllocations;
};

export const getRecentCodeUsage = (): DiscountCode[] => {
  const allCodes: DiscountCode[] = [];
  staffAllocations.forEach(allocation => {
    allCodes.push(...allocation.codes.fifteenPercent);
    allCodes.push(...allocation.codes.tenPercent);
    allCodes.push(...allocation.codes.fivePercent);
  });
  
  return allCodes
    .filter(c => c.isUsed)
    .sort((a, b) => (b.usedAt?.getTime() || 0) - (a.usedAt?.getTime() || 0))
    .slice(0, 20);
};

export const getCodeStats = () => {
  const allCodes: DiscountCode[] = [];
  staffAllocations.forEach(allocation => {
    allCodes.push(...allocation.codes.fifteenPercent);
    allCodes.push(...allocation.codes.tenPercent);
    allCodes.push(...allocation.codes.fivePercent);
  });

  const totalCodes = allCodes.length;
  const usedCodes = allCodes.filter(c => c.isUsed).length;
  const remainingCodes = totalCodes - usedCodes;
  const usageRate = Math.round((usedCodes / totalCodes) * 100);

  const usedByType = {
    fifteenPercent: allCodes.filter(c => c.type === DiscountCodeType.FIFTEEN_PERCENT && c.isUsed).length,
    tenPercent: allCodes.filter(c => c.type === DiscountCodeType.TEN_PERCENT && c.isUsed).length,
    fivePercent: allCodes.filter(c => c.type === DiscountCodeType.FIVE_PERCENT && c.isUsed).length
  };

  const totalByType = {
    fifteenPercent: allCodes.filter(c => c.type === DiscountCodeType.FIFTEEN_PERCENT).length,
    tenPercent: allCodes.filter(c => c.type === DiscountCodeType.TEN_PERCENT).length,
    fivePercent: allCodes.filter(c => c.type === DiscountCodeType.FIVE_PERCENT).length
  };

  const topPerformers = staffAllocations
    .map(s => ({
      staffId: s.staffId,
      staffName: s.staffName,
      codesUsed: s.totalUsed
    }))
    .sort((a, b) => b.codesUsed - a.codesUsed)
    .slice(0, 5);

  return {
    totalCodes,
    usedCodes,
    remainingCodes,
    usageRate,
    usedByType,
    totalByType,
    topPerformers
  };
};

export const validateDiscountCode = async (code: string): Promise<{
  isValid: boolean;
  discountPercent: number;
  staffName?: string;
  error?: string;
}> => {
  await wait(300); // Simulate API call

  const allCodes: DiscountCode[] = [];
  staffAllocations.forEach(allocation => {
    allCodes.push(...allocation.codes.fifteenPercent);
    allCodes.push(...allocation.codes.tenPercent);
    allCodes.push(...allocation.codes.fivePercent);
  });

  const foundCode = allCodes.find(c => c.code === code.toUpperCase());

  if (!foundCode) {
    return {
      isValid: false,
      discountPercent: 0,
      error: 'Invalid discount code'
    };
  }

  if (foundCode.isUsed) {
    return {
      isValid: false,
      discountPercent: 0,
      error: 'This code has already been used'
    };
  }

  // Parse discount percentage from type
  const discountPercent = foundCode.type === DiscountCodeType.FIFTEEN_PERCENT ? 15 :
                         foundCode.type === DiscountCodeType.TEN_PERCENT ? 10 : 5;

  return {
    isValid: true,
    discountPercent,
    staffName: foundCode.staffName
  };
};

export const markCodeAsUsed = async (
  code: string, 
  customerName: string, 
  customerContact: string, 
  quoteId: string
): Promise<boolean> => {
  const allocationIndex = staffAllocations.findIndex(allocation => {
    const allCodes = [
      ...allocation.codes.fifteenPercent,
      ...allocation.codes.tenPercent,
      ...allocation.codes.fivePercent
    ];
    return allCodes.some(c => c.code === code.toUpperCase());
  });

  if (allocationIndex === -1) return false;

  const allocation = staffAllocations[allocationIndex];
  const codeArrays = [
    allocation.codes.fifteenPercent,
    allocation.codes.tenPercent,
    allocation.codes.fivePercent
  ];

  for (const codeArray of codeArrays) {
    const codeIndex = codeArray.findIndex(c => c.code === code.toUpperCase());
    if (codeIndex !== -1) {
      codeArray[codeIndex].isUsed = true;
      codeArray[codeIndex].usedAt = new Date();
      codeArray[codeIndex].usedBy = customerName;
      codeArray[codeIndex].usedByContact = customerContact;
      codeArray[codeIndex].quoteId = quoteId;
      
      // Update total used count
      allocation.totalUsed++;
      allocation.totalRemaining--;
      
      return true;
    }
  }

  return false;
};

// Push discount codes to staff via WhatsApp Business API
export const pushCodesToWhatsApp = async (
  staffIds: string[],
  pushedBy: string = 'System'
): Promise<{ success: boolean; pushed: number; failed: number }> => {
  await wait(1500); // Simulate API call
  
  let pushed = 0;
  let failed = 0;

  for (const staffId of staffIds) {
    const allocationIndex = staffAllocations.findIndex(a => a.staffId === staffId);
    if (allocationIndex !== -1) {
      const allocation = staffAllocations[allocationIndex];
      
      // In production, this would call WhatsApp Business API
      // For now, just mark as pushed if not already pushed
      if (!allocation.isPushedToWhatsApp) {
        allocation.isPushedToWhatsApp = true;
        allocation.pushedAt = new Date();
        allocation.pushedBy = pushedBy;
        pushed++;
      } else {
        // Already pushed, count as success but don't increment
        pushed++;
      }
    } else {
      failed++;
    }
  }

  return { success: true, pushed, failed };
};

// Get unpushed staff (new staff from Windows Directory)
export const getUnpushedStaff = (): StaffCodeAllocation[] => {
  return staffAllocations.filter(a => !a.isPushedToWhatsApp);
};
