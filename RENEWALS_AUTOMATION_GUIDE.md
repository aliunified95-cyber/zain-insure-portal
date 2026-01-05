# Automated Renewals System - Complete Guide

## 🎯 Overview

The automated renewals system handles policy renewals with **zero manual intervention** for reminders. It automatically sends WhatsApp messages at 30 and 15 days before expiry, and assigns unactioned policies to the agent pool after expiry.

## 🔄 Automated Workflow

### Stage 1: Policy Expires in 30 Days
- **Action**: System automatically sends WhatsApp reminder
- **Message**: Friendly reminder with policy details
- **Status Update**: `REMINDER_30_SENT`
- **Agent Action Required**: None

### Stage 2: Policy Expires in 15 Days  
- **Action**: System automatically sends second WhatsApp reminder
- **Message**: Urgent renewal notice
- **Status Update**: `REMINDER_15_SENT`
- **Agent Action Required**: None

### Stage 3: Policy Expired (Day 0)
- **Action**: System auto-assigns to main agent pool
- **Status Update**: `ASSIGNED_TO_POOL`
- **Agent Action Required**: Agents can claim from pool and follow up

## 📋 System Components

### 1. Renewals Service (`services/renewalsService.ts`)
Core business logic for renewal management:
- `getExpiringPolicies()` - Fetch all policies expiring soon
- `processAutomatedRenewalReminders()` - Main automation function
- `getRenewalMetrics()` - Dashboard analytics
- `sendManualRenewalReminder()` - Manual override option

### 2. WhatsApp Service (`services/whatsappService.ts`)
Handles all WhatsApp communication:
- `sendWhatsAppMessage()` - Send text messages
- `sendWhatsAppTemplate()` - Send approved templates
- `sendBulkWhatsAppMessages()` - Bulk sending with rate limiting
- Mock mode enabled for development/testing

### 3. Renewal Scheduler (`services/renewalScheduler.ts`)
Background job scheduler:
- `runDailyRenewalScheduler()` - Main scheduler function
- `setupBrowserScheduler()` - Browser-based testing (demo only)
- Should run daily via cron job in production

### 4. Enhanced RenewalsPage Component
Full-featured UI with:
- Real-time metrics dashboard
- Advanced filtering and search
- Manual reminder override
- Export to CSV
- Direct call/WhatsApp links

## 🚀 Setup & Deployment

### Development Setup
```bash
# 1. Install dependencies (already done)
npm install

# 2. Configure WhatsApp API (optional for testing)
# Edit services/whatsappService.ts:
WHATSAPP_CONFIG.phoneNumberId = 'YOUR_PHONE_NUMBER_ID'
WHATSAPP_CONFIG.accessToken = 'YOUR_ACCESS_TOKEN'
WHATSAPP_CONFIG.businessAccountId = 'YOUR_BUSINESS_ACCOUNT_ID'

# Set MOCK_MODE = false when ready for production
const MOCK_MODE = false;

# 3. Run development server
npm run dev

# 4. Test automated process manually
# Click "Run Auto Process" button in Renewals page
```

### Production Deployment Options

#### Option 1: Firebase Functions (Recommended)
```javascript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import { runDailyRenewalScheduler } from './renewalScheduler';

export const dailyRenewalCheck = functions.pubsub
  .schedule('0 9 * * *') // Daily at 9 AM Bahrain time
  .timeZone('Asia/Bahrain')
  .onRun(async (context) => {
    await runDailyRenewalScheduler();
    return null;
  });
```

Deploy:
```bash
firebase deploy --only functions
```

#### Option 2: Vercel Cron Jobs
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/renewals",
    "schedule": "0 9 * * *"
  }]
}
```

```typescript
// api/cron/renewals.ts
import { runDailyRenewalScheduler } from '../../services/renewalScheduler';

export default async function handler(req, res) {
  const results = await runDailyRenewalScheduler();
  res.json(results);
}
```

#### Option 3: GitHub Actions
```yaml
# .github/workflows/renewals.yml
name: Daily Renewal Check
on:
  schedule:
    - cron: '0 9 * * *'
jobs:
  renewal-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run renewals:check
```

## 📊 Dashboard Metrics

The renewals page displays real-time metrics:

- **Total Expiring**: All policies expiring in next 90 days
- **Urgent (≤15 days)**: Policies requiring immediate attention
- **Reminders Sent**: WhatsApp reminders sent today
- **Renewal Rate**: Success rate (renewed/total * 100)

## 🔍 Filtering & Search

Advanced filtering options:
- **Search**: Customer name, policy number, vehicle, phone
- **Days Filter**: All, ≤7, ≤15, ≤30 days
- **Status Filter**: All, Pending, Reminder Sent, Renewed, etc.
- **Sort**: By expiry date, customer name, days remaining

## 📱 WhatsApp Integration

### Message Template
```
🚗 *Zain Insure - Policy Renewal Reminder*

Hello [Customer]! 👋

Your insurance policy for *[Vehicle]* will expire in *[Days] days* on [Date].

🔔 Don't let your coverage lapse! Renew now and stay protected.

✅ Quick & Easy Renewal
✅ Best Rates for Existing Customers
✅ Instant Policy Issuance

💬 Reply to this message or call us at 17111111 to renew!

_Zain Insure - Your Safety, Our Priority_ 🛡️
```

### WhatsApp Business API Setup

1. **Create Facebook Business Account**
   - Go to business.facebook.com
   - Create business account

2. **Set Up WhatsApp Business API**
   - Go to developers.facebook.com
   - Create app → Business → WhatsApp
   - Get Phone Number ID and Access Token

3. **Configure in Code**
   ```typescript
   // services/whatsappService.ts
   const WHATSAPP_CONFIG = {
     phoneNumberId: 'YOUR_PHONE_NUMBER_ID',
     accessToken: 'YOUR_ACCESS_TOKEN',
     businessAccountId: 'YOUR_BUSINESS_ACCOUNT_ID',
   };
   const MOCK_MODE = false; // Set to false for production
   ```

4. **Test**
   - Use "Send Reminder Now" button on any policy
   - Check WhatsApp Business Manager for delivery status

## 🎮 Manual Controls

Agents can manually:
1. **Send Reminder Now** - Override automation, send immediate reminder
2. **Run Auto Process** - Trigger automated check manually (testing)
3. **Export to CSV** - Download renewal pipeline data
4. **Call/WhatsApp** - Quick action buttons for customer contact

## 📈 Analytics & Reporting

Track renewal performance:
- Conversion rates by reminder type
- Time-to-renewal metrics
- Agent performance on pool assignments
- Revenue forecasting based on pipeline

All metrics are calculated in real-time from Firebase/Firestore data.

## 🔐 Security & Privacy

- Customer phone numbers are encrypted in transit
- WhatsApp API uses OAuth 2.0 authentication
- All actions are audit-logged with timestamps
- GDPR compliant (customer consent required)

## 🐛 Troubleshooting

### Reminders Not Sending
1. Check WhatsApp config in `whatsappService.ts`
2. Verify MOCK_MODE is set correctly
3. Check Firebase Functions logs
4. Verify phone number format (973XXXXXXXX)

### Scheduler Not Running
1. Verify cron job is deployed
2. Check cloud function/serverless logs
3. Test manually with "Run Auto Process" button
4. Ensure Firebase permissions are correct

### Data Not Loading
1. Check Firebase connection in `firebaseConfig.ts`
2. Verify Firestore rules allow read/write
3. Check browser console for errors
4. Ensure quotes collection has ISSUED policies

## 📝 Database Schema

### Quotes Collection
```typescript
{
  id: string,
  status: 'ISSUED' | 'EXPIRING',
  vehicle: {
    policyEndDate: string, // Expiry date
  },
  customer: {
    fullName: string,
    mobile: string,
  },
  reminderCount: number, // 0, 1, or 2
  lastReminderSent: string, // ISO timestamp
  leadDisposition: LeadDisposition,
}
```

### WhatsApp Reminders Collection
```typescript
{
  id: string,
  quoteId: string,
  recipientNumber: string,
  message: string,
  sentAt: string,
  status: 'SENT' | 'DELIVERED' | 'FAILED',
  type: '30_DAYS' | '15_DAYS',
}
```

## 🎯 Best Practices

1. **Run Daily at Consistent Time**: 9 AM Bahrain time recommended
2. **Monitor Logs**: Check scheduler output daily for errors
3. **Track Metrics**: Review dashboard weekly for trends
4. **Test Before Deploying**: Use MOCK_MODE for development
5. **Rate Limiting**: Built-in 100ms delay between bulk messages
6. **Customer Consent**: Ensure customers opt-in to WhatsApp reminders

## 🔮 Future Enhancements

- [ ] SMS fallback for non-WhatsApp users
- [ ] Email reminders as secondary channel
- [ ] AI-powered optimal send times
- [ ] A/B testing for message templates
- [ ] Multi-language support (Arabic)
- [ ] Customer preference management
- [ ] Renewal prediction ML model
- [ ] Integration with payment gateway for direct renewal

## 📞 Support

For issues or questions:
- Check console logs for detailed error messages
- Review Firebase Functions logs in Firebase Console
- Test in MOCK_MODE first before production deployment
- Ensure WhatsApp Business API quota is sufficient

---

**Last Updated**: January 4, 2026
**Version**: 1.0.0
**Status**: ✅ Production Ready
