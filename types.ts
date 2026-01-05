
export enum InsuranceType {
  MOTOR = 'MOTOR',
  TRAVEL = 'TRAVEL',
  HEALTH = 'HEALTH',
  LIFE = 'LIFE',
  CYBER = 'CYBER',
  HOME = 'HOME',
  PERSONAL_ACCIDENT = 'PERSONAL_ACCIDENT'
}

export enum CustomerType {
  NEW = 'NEW',
  EXISTING = 'EXISTING'
}

export enum QuoteStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVAL_GRANTED = 'APPROVAL_GRANTED',
  APPROVAL_REJECTED = 'APPROVAL_REJECTED',
  LINK_SENT = 'LINK_SENT',
  LINK_CLICKED = 'LINK_CLICKED',
  DOCS_UPLOADED = 'DOCS_UPLOADED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  ISSUED = 'ISSUED',
  EXPIRING = 'EXPIRING'
}

export enum RenewalStatus {
  PENDING = 'PENDING',
  REMINDER_30_SENT = 'REMINDER_30_SENT',
  REMINDER_15_SENT = 'REMINDER_15_SENT',
  EXPIRED_UNACTIONED = 'EXPIRED_UNACTIONED',
  ASSIGNED_TO_POOL = 'ASSIGNED_TO_POOL',
  RENEWED = 'RENEWED',
  CUSTOMER_DECLINED = 'CUSTOMER_DECLINED',
}

export enum LeadDisposition {
  NEW = 'NEW',
  CLAIMED = 'CLAIMED',
  NO_ANSWER = 'NO_ANSWER',
  WHATSAPP_CONTACTED = 'WHATSAPP_CONTACTED',
  ALREADY_INSURED = 'ALREADY_INSURED',
  DROPPED_CALL = 'DROPPED_CALL',
  NOT_INTERESTED = 'NOT_INTERESTED',
  DECLINED = 'DECLINED',
  OFFER_REJECTED = 'OFFER_REJECTED',
  THINKING = 'THINKING',
  BETTER_OFFER = 'BETTER_OFFER',
  AWAITING_DECISION = 'AWAITING_DECISION',
  CALL_BACK_LATER = 'CALL_BACK_LATER',
  PROCESSING = 'PROCESSING',
  SUCCESSFUL = 'SUCCESSFUL'
}

export enum PaymentMethod {
  CASH = 'CASH',
  INSTALLMENT = 'INSTALLMENT'
}

export enum TravelType {
  INDIVIDUAL = 'INDIVIDUAL',
  FAMILY = 'FAMILY'
}

export enum TravelDestination {
  WORLDWIDE = 'WORLDWIDE',
  WORLDWIDE_EXCL_US_CA = 'WORLDWIDE_EXCL_US_CA',
  SCHENGEN = 'SCHENGEN'
}

export type UserRole = 'JUNIOR_AGENT' | 'SUPERVISOR' | 'CREDIT_CONTROL' | 'DEVELOPER';

export interface User {
  id: string;
  username: string;
  password?: string; // Optional for display, required for auth/creation
  fullName: string;
  roles: UserRole[];
  avatar?: string;
}

export interface Customer {
  id?: string;
  cpr: string;
  fullName: string;
  mobile: string;
  email: string;
  address?: string;
  type: CustomerType;
  
  // Eligibility & Credit Control Fields
  zainPlan?: 'POST' | 'PRE'; // Postpaid or Prepaid
  registrationMonth?: number;
  existingPolicyEndDate?: string;
  isEligibleForZain: boolean; // Can they use the service at all?
  isEligibleForInstallments: boolean; // Can they pay via installments?
  creditScore: number;
  activeLines: string[]; // List of subscriber numbers associated with this CPR
}

export interface Vehicle {
  plateNumber: string;
  chassisNumber: string;
  make: string;
  model: string;
  year: string;
  value: number;
  // New Fields
  bodyType?: string;
  engineSize?: string; // CC or HP
  isBrandNew?: boolean;
  hasExistingInsurance?: boolean;
  existingPolicyExpiry?: string;
  policyEndDate?: string;
}

export interface TravelerDetails {
  type: 'ADULT' | 'CHILD';
  firstName: string;
  lastName: string;
  gender: 'M' | 'F';
  dob: string;
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
}

export interface TravelCriteria {
  type: TravelType;
  destination: TravelDestination;
  departureDate: string;
  returnDate: string;
  adultsCount: number;
  childrenCount: number;
  individualDob?: string; // If type is individual
}

export interface Beneficiary {
  fullName: string;
  cpr: string;
  relation?: string;
}

export interface RiskFactors {
  ageUnder24: boolean;
  licenseUnder1Year: boolean;
}

export interface InsuranceAddon {
  id: string;
  name: string;
  price: number;
  coverage: string;
}

export interface InsurancePlan {
  id: string;
  provider: 'GIG' | 'SNIC' | 'TISUR';
  providerLogo?: string;
  name: string;
  coverage: string;
  
  // Pricing breakdown
  basePremium: number; // Amount before VAT
  
  features: string[];
  addOns?: InsuranceAddon[]; // Available add-ons
  
  // For Comparison
  excess?: number;
  agencyRepair?: boolean;
  roadsideAssistance?: boolean;
}

export enum QuoteSource {
  AGENT_PORTAL = 'AGENT_PORTAL',
  CUSTOMER_PORTAL = 'CUSTOMER_PORTAL'
}

export interface TrackingEvent {
  status: 'SENT' | 'DELIVERED' | 'OPENED' | 'CLICKED' | 'EXPIRED';
  timestamp: Date;
  details?: string;
}

export interface WhatsAppReminder {
  id: string;
  quoteId: string;
  sentAt: string;
  status: 'SCHEDULED' | 'SENT' | 'FAILED';
  recipientNumber: string;
  message: string;
}

export interface QuoteRequest {
  id: string; // UUID for database
  quoteReference?: string; // Readable ID (e.g. Q-2023-001)
  customer: Customer;
  vehicle: Vehicle;
  
  // Travel Specifics
  travelCriteria?: TravelCriteria;
  travelers?: TravelerDetails[];
  selectedAddons?: string[]; // IDs of selected addons

  beneficiary?: Beneficiary;
  insuranceType: InsuranceType;
  riskFactors: RiskFactors;
  selectedPlanId?: string;
  startDate: string;
  status: QuoteStatus;
  leadDisposition?: LeadDisposition; // New Field for Renewal/Draft tracking
  createdAt: Date;
  agentId?: string; // Agent who created the quote
  agentName?: string;
  provider?: string;
  planName?: string;
  contactNumberForLink?: string;
  leadId?: string;
  subscriberNumber?: string; // Zain subscription number for eligibility check
  paymentMethod?: PaymentMethod;
  trackingHistory?: TrackingEvent[];
  approvalHandledAt?: string; // ISO String
  
  // Discount Code
  discountCode?: string;
  discountPercent?: number;
  
  // Source tracking
  source: QuoteSource; // Where the quote originated from
  lastReminderSent?: string; // ISO timestamp of last WhatsApp reminder
  reminderCount?: number; // Number of reminders sent
  
  // Assignment tracking
  assignment?: QuoteAssignment;
  assignmentHistory?: AssignmentHistoryEntry[];
  
  // Enhanced tracking
  viewCount?: number; // How many times viewed
  lastViewedAt?: string; // Last view timestamp
  lastViewedBy?: string; // Last viewer
}

export interface Lead {
  id: string;
  referrerName: string;
  customerName: string;
  customerPhone: string;
  interest: InsuranceType;
  status: 'PENDING' | 'CONVERTED';
  createdAt: Date;
}

export interface AgentPerformance {
  id: string;
  name: string;
  salesCount: number;
  totalPremium: number;
  conversionRate: number;
  avatar: string;
}

export interface Notification {
  id: string;
  type: 'PAYMENT_RECEIVED' | 'QUOTE_EXPIRED' | 'DOCS_UPLOADED' | 'REMINDER' | 'APPROVAL_UPDATE';
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  quoteId?: string;
}

export interface AuditLogEntry {
  id: string;
  quoteId: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

// Assignment and Pool Management Types
export enum AssignmentStatus {
  ASSIGNED = 'ASSIGNED',
  CLAIMED = 'CLAIMED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED'
}

export enum RejectionReason {
  NO_ANSWER = 'NO_ANSWER',
  CONTACTED_IN_WHATSAPP = 'CONTACTED_IN_WHATSAPP',
  ALREADY_INSURED = 'ALREADY_INSURED',
  DROPPED_THE_CALL = 'DROPPED_THE_CALL',
  NOT_INTERESTED = 'NOT_INTERESTED',
  CUSTOMER_DECLINED_TO_PROCEED = 'CUSTOMER_DECLINED_TO_PROCEED',
  OFFER_REJECTED = 'OFFER_REJECTED',
  WILL_THINK_ABOUT_IT = 'WILL_THINK_ABOUT_IT',
  FIND_BETTER_OFFER = 'FIND_BETTER_OFFER',
  AWAITING_CUSTOMER_DECISION = 'AWAITING_CUSTOMER_DECISION',
  CUSTOMER_WILL_CALL_BACK_LATER = 'CUSTOMER_WILL_CALL_BACK_LATER'
}

export enum UrgencyLevel {
  URGENT = 'URGENT', // >24hrs
  SOON = 'SOON', // 12-24hrs
  NORMAL = 'NORMAL' // <12hrs
}

export interface AgentNote {
  id: string;
  noteText: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  isReminder: boolean;
  reminderDate?: string;
}

export interface QuoteAssignment {
  id: string;
  quoteId: string;
  assignedToAgentId: string;
  assignedToAgentName: string;
  assignedByAgentId: string;
  assignedByAgentName: string;
  assignedAt: string; // ISO timestamp
  claimedAt?: string; // ISO timestamp
  status: AssignmentStatus;
  rejectionReason?: RejectionReason;
  rejectionNote?: string;
  rejectedAt?: string; // ISO timestamp
  completedAt?: string; // ISO timestamp
  agentNotes?: AgentNote[]; // Private notes for assigned agent
  lastContactedAt?: string; // Last time agent contacted customer
  urgencyLevel?: UrgencyLevel;
}

export interface AssignmentHistoryEntry {
  id: string;
  timestamp: string;
  action: 'ASSIGNED' | 'CLAIMED' | 'EDITED' | 'REJECTED' | 'COMPLETED';
  performedBy: string;
  performedByName: string;
  details: string;
}

// Discount Code Types
export enum DiscountCodeType {
  FIFTEEN_PERCENT = '15%',
  TEN_PERCENT = '10%',
  FIVE_PERCENT = '5%'
}

export interface DiscountCode {
  id: string;
  code: string;
  staffId: string;
  staffName: string;
  type: DiscountCodeType;
  isUsed: boolean;
  usedAt?: Date;
  usedBy?: string; // Customer name
  usedByContact?: string; // Customer phone/CPR
  quoteId?: string;
  year: number; // Year when code was assigned
}

export interface StaffCodeAllocation {
  staffId: string;
  staffName: string;
  staffEmail?: string;
  staffPhone?: string;
  department?: string;
  year: number;
  codes: {
    fifteenPercent: DiscountCode[]; // 1 code
    tenPercent: DiscountCode[]; // 3 codes
    fivePercent: DiscountCode[]; // 3 codes
  };
  totalUsed: number;
  totalRemaining: number;
  isPushedToWhatsApp: boolean;
  pushedAt?: Date;
  pushedBy?: string;
}
