/**
 * Renewals Service
 * Handles automated renewal reminders, policy expiration tracking, and pool assignment
 */

import { QuoteRequest, QuoteStatus, LeadDisposition, QuoteSource, WhatsAppReminder } from '../types';
import { db } from './firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, orderBy, Timestamp } from 'firebase/firestore';
import { sendWhatsAppMessage } from './whatsappService';

// ==================== INTERFACES ====================

export interface RenewalPolicy {
  id: string;
  quoteId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  policyNumber: string;
  expiryDate: string;
  vehicleDetails: string;
  premiumAmount: number;
  status: RenewalStatus;
  daysUntilExpiry: number;
  remindersSent: ReminderStatus[];
  lastReminderSent?: string;
  autoAssignedToPool?: boolean;
  autoAssignedAt?: string;
  renewedQuoteId?: string;
  renewedAt?: string;
}

export enum RenewalStatus {
  PENDING = 'PENDING', // Not yet contacted
  REMINDER_30_SENT = 'REMINDER_30_SENT', // 30-day reminder sent
  REMINDER_15_SENT = 'REMINDER_15_SENT', // 15-day reminder sent
  EXPIRED_UNACTIONED = 'EXPIRED_UNACTIONED', // Expired without action
  ASSIGNED_TO_POOL = 'ASSIGNED_TO_POOL', // Auto-assigned to main pool
  RENEWED = 'RENEWED', // Successfully renewed
  CUSTOMER_DECLINED = 'CUSTOMER_DECLINED', // Customer declined renewal
}

export interface ReminderStatus {
  type: '30_DAYS' | '15_DAYS';
  sentAt: string;
  status: 'SENT' | 'DELIVERED' | 'FAILED' | 'READ';
  messageId?: string;
}

export interface RenewalMetrics {
  totalExpiring: number;
  expiring30Days: number;
  expiring15Days: number;
  expiring7Days: number;
  remindersSentToday: number;
  remindersScheduled: number;
  autoAssignedToPool: number;
  renewalRate: number;
  totalValue: number;
}

// ==================== CORE FUNCTIONS ====================

/**
 * Get all policies expiring within a given number of days
 */
export const getExpiringPolicies = async (daysAhead: number = 90): Promise<RenewalPolicy[]> => {
  try {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    const quotesQuery = query(
      collection(db, 'quotes'),
      where('status', '==', QuoteStatus.ISSUED),
      orderBy('vehicle.policyEndDate', 'asc')
    );

    const snapshot = await getDocs(quotesQuery);
    const renewals: RenewalPolicy[] = [];

    snapshot.forEach((docSnapshot) => {
      const quote = docSnapshot.data() as QuoteRequest;
      const expiryDate = new Date(quote.vehicle.policyEndDate || quote.startDate);
      
      // Only include if expiring within the specified days
      if (expiryDate >= today && expiryDate <= futureDate) {
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        renewals.push({
          id: docSnapshot.id,
          quoteId: quote.id,
          customerId: quote.customer.id || quote.customer.cpr,
          customerName: quote.customer.fullName,
          customerPhone: quote.customer.mobile,
          policyNumber: quote.quoteReference || quote.id,
          expiryDate: quote.vehicle.policyEndDate || quote.startDate,
          vehicleDetails: `${quote.vehicle.make} ${quote.vehicle.model} (${quote.vehicle.year})`,
          premiumAmount: 0, // Calculate from selected plan if needed
          status: determineRenewalStatus(quote, daysUntilExpiry),
          daysUntilExpiry,
          remindersSent: extractReminderStatus(quote),
          lastReminderSent: quote.lastReminderSent,
          autoAssignedToPool: quote.status === QuoteStatus.EXPIRING,
          renewedQuoteId: undefined, // Would link to new quote if renewed
        });
      }
    });

    return renewals;
  } catch (error) {
    console.error('[RenewalsService] Error fetching expiring policies:', error);
    return [];
  }
};

/**
 * Determine the current status of a renewal based on quote data
 */
const determineRenewalStatus = (quote: QuoteRequest, daysUntilExpiry: number): RenewalStatus => {
  if (quote.leadDisposition === LeadDisposition.SUCCESSFUL) {
    return RenewalStatus.RENEWED;
  }
  
  if (quote.leadDisposition === LeadDisposition.DECLINED || 
      quote.leadDisposition === LeadDisposition.NOT_INTERESTED) {
    return RenewalStatus.CUSTOMER_DECLINED;
  }

  if (daysUntilExpiry <= 0) {
    return quote.status === QuoteStatus.EXPIRING 
      ? RenewalStatus.ASSIGNED_TO_POOL 
      : RenewalStatus.EXPIRED_UNACTIONED;
  }

  const reminderCount = quote.reminderCount || 0;
  if (reminderCount >= 2) {
    return RenewalStatus.REMINDER_15_SENT;
  } else if (reminderCount >= 1) {
    return RenewalStatus.REMINDER_30_SENT;
  }

  return RenewalStatus.PENDING;
};

/**
 * Extract reminder status from quote data
 */
const extractReminderStatus = (quote: QuoteRequest): ReminderStatus[] => {
  const reminders: ReminderStatus[] = [];
  const count = quote.reminderCount || 0;
  
  if (count >= 1 && quote.lastReminderSent) {
    reminders.push({
      type: '30_DAYS',
      sentAt: quote.lastReminderSent,
      status: 'DELIVERED',
    });
  }
  
  if (count >= 2 && quote.lastReminderSent) {
    reminders.push({
      type: '15_DAYS',
      sentAt: quote.lastReminderSent,
      status: 'DELIVERED',
    });
  }
  
  return reminders;
};

/**
 * AUTOMATED BACKGROUND JOB
 * Check all policies and send automated WhatsApp reminders
 * This should run daily via a cron job or scheduled function
 */
export const processAutomatedRenewalReminders = async (): Promise<{
  processed: number;
  remindersSent: number;
  assignedToPool: number;
  errors: string[];
}> => {
  console.log('[RenewalsService] Starting automated renewal reminder process...');
  
  const results = {
    processed: 0,
    remindersSent: 0,
    assignedToPool: 0,
    errors: [] as string[],
  };

  try {
    // Get all issued policies
    const quotesQuery = query(
      collection(db, 'quotes'),
      where('status', '==', QuoteStatus.ISSUED)
    );

    const snapshot = await getDocs(quotesQuery);
    const today = new Date();

    for (const docSnapshot of snapshot.docs) {
      const quote = docSnapshot.data() as QuoteRequest;
      const expiryDate = new Date(quote.vehicle.policyEndDate || quote.startDate);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      results.processed++;

      // Skip if already renewed or declined
      if (quote.leadDisposition === LeadDisposition.SUCCESSFUL ||
          quote.leadDisposition === LeadDisposition.DECLINED ||
          quote.leadDisposition === LeadDisposition.NOT_INTERESTED) {
        continue;
      }

      // Check if policy is expired and needs to be assigned to pool
      if (daysUntilExpiry <= 0 && quote.status !== QuoteStatus.EXPIRING) {
        await assignExpiredPolicyToPool(docSnapshot.id, quote);
        results.assignedToPool++;
        continue;
      }

      // Send 30-day reminder
      if (daysUntilExpiry <= 30 && daysUntilExpiry > 15 && (!quote.reminderCount || quote.reminderCount === 0)) {
        const sent = await sendRenewalReminder(docSnapshot.id, quote, '30_DAYS');
        if (sent) results.remindersSent++;
        continue;
      }

      // Send 15-day reminder
      if (daysUntilExpiry <= 15 && daysUntilExpiry > 0 && (quote.reminderCount === 1)) {
        const sent = await sendRenewalReminder(docSnapshot.id, quote, '15_DAYS');
        if (sent) results.remindersSent++;
        continue;
      }
    }

    console.log('[RenewalsService] Automated process completed:', results);
    return results;
  } catch (error) {
    console.error('[RenewalsService] Error in automated process:', error);
    results.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return results;
  }
};

/**
 * Send a renewal reminder via WhatsApp
 */
const sendRenewalReminder = async (
  docId: string,
  quote: QuoteRequest,
  reminderType: '30_DAYS' | '15_DAYS'
): Promise<boolean> => {
  try {
    const daysLabel = reminderType === '30_DAYS' ? '30' : '15';
    const message = generateRenewalMessage(quote, daysLabel);

    // Send WhatsApp message
    const result = await sendWhatsAppMessage(quote.customer.mobile, message);

    if (result.success) {
      // Update quote with reminder info
      const quoteRef = doc(db, 'quotes', docId);
      await updateDoc(quoteRef, {
        lastReminderSent: new Date().toISOString(),
        reminderCount: (quote.reminderCount || 0) + 1,
      });

      // Log reminder in separate collection
      const reminderData = {
        id: `rem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        quoteId: quote.id,
        recipientNumber: quote.customer.mobile,
        message,
        sentAt: new Date().toISOString(),
        status: 'SENT' as const,
      };
      await addDoc(collection(db, 'whatsapp_reminders'), reminderData);

      console.log(`[RenewalsService] ${reminderType} reminder sent to ${quote.customer.fullName}`);
      return true;
    } else {
      console.error(`[RenewalsService] Failed to send reminder:`, result.error);
      return false;
    }
  } catch (error) {
    console.error('[RenewalsService] Error sending reminder:', error);
    return false;
  }
};

/**
 * Generate WhatsApp message for renewal reminder
 */
const generateRenewalMessage = (quote: QuoteRequest, daysRemaining: string): string => {
  const customerName = quote.customer.fullName.split(' ')[0]; // First name
  const vehicleInfo = `${quote.vehicle.make} ${quote.vehicle.model}`;
  const expiryDate = new Date(quote.vehicle.policyEndDate || quote.startDate).toLocaleDateString('en-GB');

  return `
🚗 *Zain Insure - Policy Renewal Reminder*

Hello ${customerName}! 👋

Your insurance policy for *${vehicleInfo}* will expire in *${daysRemaining} days* on ${expiryDate}.

🔔 Don't let your coverage lapse! Renew now and stay protected on the road.

✅ Quick & Easy Renewal
✅ Best Rates for Existing Customers
✅ Instant Policy Issuance

💬 Reply to this message or call us at 17111111 to renew your policy today!

_Zain Insure - Your Safety, Our Priority_ 🛡️
`.trim();
};

/**
 * Assign expired unactioned policy to main pool for agents
 */
const assignExpiredPolicyToPool = async (docId: string, quote: QuoteRequest): Promise<void> => {
  try {
    // Create a new quote in the pool based on the expired policy
    const newQuoteData: Partial<QuoteRequest> = {
      id: `RENEWAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      quoteReference: `Q-REN-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      customer: quote.customer,
      vehicle: quote.vehicle,
      insuranceType: quote.insuranceType,
      riskFactors: quote.riskFactors,
      status: QuoteStatus.EXPIRING,
      leadDisposition: LeadDisposition.NEW,
      createdAt: new Date(),
      startDate: new Date().toISOString().split('T')[0],
      source: QuoteSource.AGENT_PORTAL,
      agentId: undefined, // Unassigned
      agentName: undefined,
    };

    // Add to quotes collection for agent pool
    await addDoc(collection(db, 'quotes'), newQuoteData);

    // Update original quote status
    const quoteRef = doc(db, 'quotes', docId);
    await updateDoc(quoteRef, {
      status: QuoteStatus.EXPIRING,
      leadDisposition: LeadDisposition.NEW,
    });

    console.log(`[RenewalsService] Assigned expired policy to pool: ${quote.customer.fullName}`);
  } catch (error) {
    console.error('[RenewalsService] Error assigning to pool:', error);
  }
};

/**
 * Get renewal metrics for dashboard
 */
export const getRenewalMetrics = async (): Promise<RenewalMetrics> => {
  try {
    const policies = await getExpiringPolicies(90);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      totalExpiring: policies.length,
      expiring30Days: policies.filter(p => p.daysUntilExpiry <= 30).length,
      expiring15Days: policies.filter(p => p.daysUntilExpiry <= 15).length,
      expiring7Days: policies.filter(p => p.daysUntilExpiry <= 7).length,
      remindersSentToday: policies.filter(p => {
        if (!p.lastReminderSent) return false;
        const sentDate = new Date(p.lastReminderSent);
        sentDate.setHours(0, 0, 0, 0);
        return sentDate.getTime() === today.getTime();
      }).length,
      remindersScheduled: policies.filter(p => 
        p.status === RenewalStatus.PENDING && 
        (p.daysUntilExpiry <= 30 || p.daysUntilExpiry <= 15)
      ).length,
      autoAssignedToPool: policies.filter(p => p.status === RenewalStatus.ASSIGNED_TO_POOL).length,
      renewalRate: policies.filter(p => p.status === RenewalStatus.RENEWED).length / policies.length * 100 || 0,
      totalValue: policies.reduce((sum, p) => sum + p.premiumAmount, 0),
    };
  } catch (error) {
    console.error('[RenewalsService] Error calculating metrics:', error);
    return {
      totalExpiring: 0,
      expiring30Days: 0,
      expiring15Days: 0,
      expiring7Days: 0,
      remindersSentToday: 0,
      remindersScheduled: 0,
      autoAssignedToPool: 0,
      renewalRate: 0,
      totalValue: 0,
    };
  }
};

/**
 * Manual trigger for testing - send reminder immediately
 */
export const sendManualRenewalReminder = async (quoteId: string): Promise<boolean> => {
  try {
    const quoteRef = doc(db, 'quotes', quoteId);
    const quoteDoc = await getDocs(query(collection(db, 'quotes'), where('id', '==', quoteId)));
    
    if (quoteDoc.empty) {
      console.error('[RenewalsService] Quote not found');
      return false;
    }

    const quote = quoteDoc.docs[0].data() as QuoteRequest;
    return await sendRenewalReminder(quoteDoc.docs[0].id, quote, '30_DAYS');
  } catch (error) {
    console.error('[RenewalsService] Error sending manual reminder:', error);
    return false;
  }
};

/**
 * Get renewal history for a specific customer
 */
export const getCustomerRenewalHistory = async (customerId: string): Promise<RenewalPolicy[]> => {
  try {
    const allRenewals = await getExpiringPolicies(365); // Look back 1 year
    return allRenewals.filter(r => r.customerId === customerId);
  } catch (error) {
    console.error('[RenewalsService] Error fetching customer history:', error);
    return [];
  }
};
