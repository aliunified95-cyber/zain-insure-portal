/**
 * Renewals Background Job Scheduler
 * Runs automated renewal checks and sends WhatsApp reminders
 * This should be executed daily via a cron job or scheduled cloud function
 */

import { processAutomatedRenewalReminders } from './renewalsService';

/**
 * Main scheduler function - should be called daily
 */
export const runDailyRenewalScheduler = async (): Promise<void> => {
  console.log('🔄 [Renewal Scheduler] Starting daily renewal process...');
  console.log(`   Time: ${new Date().toISOString()}`);
  
  try {
    const results = await processAutomatedRenewalReminders();
    
    console.log('✅ [Renewal Scheduler] Process completed successfully');
    console.log(`   Policies Processed: ${results.processed}`);
    console.log(`   Reminders Sent: ${results.remindersSent}`);
    console.log(`   Assigned to Pool: ${results.assignedToPool}`);
    
    if (results.errors.length > 0) {
      console.error('⚠️  [Renewal Scheduler] Errors encountered:');
      results.errors.forEach(err => console.error(`   - ${err}`));
    }
    
    // You can add notification/alerting here
    // e.g., send email to admin with results
    
  } catch (error) {
    console.error('❌ [Renewal Scheduler] Fatal error:', error);
    // Send alert to admin
  }
};

/**
 * Setup for browser-based simulation (runs every minute for demo purposes)
 * In production, this would be a server-side cron job
 */
export const setupBrowserScheduler = (intervalMinutes: number = 60): () => void => {
  console.log(`⏰ [Renewal Scheduler] Setting up browser-based scheduler (every ${intervalMinutes} minutes)`);
  console.log('   NOTE: In production, use server-side cron job instead');
  
  // Run immediately on setup
  runDailyRenewalScheduler();
  
  // Then schedule recurring runs
  const intervalId = setInterval(() => {
    runDailyRenewalScheduler();
  }, intervalMinutes * 60 * 1000);
  
  // Return cleanup function
  return () => {
    console.log('🛑 [Renewal Scheduler] Stopping scheduler');
    clearInterval(intervalId);
  };
};

/**
 * For testing: run the scheduler immediately
 */
export const runSchedulerNow = async (): Promise<void> => {
  console.log('🚀 [Renewal Scheduler] Manual trigger - running now...');
  await runDailyRenewalScheduler();
};

// Export for use in cloud functions (e.g., Firebase Functions, AWS Lambda)
export default runDailyRenewalScheduler;

/**
 * DEPLOYMENT INSTRUCTIONS:
 * 
 * === Option 1: Firebase Functions ===
 * 1. Install Firebase Functions: npm install firebase-functions
 * 2. Create functions/src/renewalScheduler.ts with this code
 * 3. Deploy with: firebase deploy --only functions
 * 
 * Example Firebase Function:
 * 
 * import * as functions from 'firebase-functions';
 * import { runDailyRenewalScheduler } from './renewalScheduler';
 * 
 * export const dailyRenewalCheck = functions.pubsub
 *   .schedule('0 9 * * *') // Run daily at 9 AM
 *   .timeZone('Asia/Bahrain')
 *   .onRun(async (context) => {
 *     await runDailyRenewalScheduler();
 *     return null;
 *   });
 * 
 * === Option 2: Vercel Cron ===
 * 1. Create api/cron/renewals.ts
 * 2. Add to vercel.json:
 *    {
 *      "crons": [{
 *        "path": "/api/cron/renewals",
 *        "schedule": "0 9 * * *"
 *      }]
 *    }
 * 
 * === Option 3: GitHub Actions ===
 * Add to .github/workflows/renewals.yml:
 * 
 * name: Daily Renewal Check
 * on:
 *   schedule:
 *     - cron: '0 9 * * *'
 * jobs:
 *   renewal-check:
 *     runs-on: ubuntu-latest
 *     steps:
 *       - uses: actions/checkout@v2
 *       - run: npm install
 *       - run: node -e "require('./services/renewalScheduler').runDailyRenewalScheduler()"
 */
