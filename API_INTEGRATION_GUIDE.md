# Customer Portal API Integration Guide

## Overview

This guide shows how to integrate the agent dashboard with a real customer portal API to automatically sync customer-initiated drafts.

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│ Customer Portal │  HTTP   │  Backend API     │  Write  │    Firebase     │
│   (External)    │────────>│  /api/drafts     │────────>│   (Database)    │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                                                    │
                                                                    │ Read
                                                                    ▼
                                                          ┌─────────────────┐
                                                          │  Agent Portal   │
                                                          │   (Dashboard)   │
                                                          └─────────────────┘
```

## API Endpoint Setup

### 1. Create Draft Reception Endpoint

Create a new API endpoint to receive drafts from the customer portal:

**File**: `api/customer-portal/draft.ts` (if using Next.js) or similar

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { QuoteRequest, QuoteSource, QuoteStatus, CustomerType } from '../../types';
import { saveDraft, generateUUID, generateQuoteReference, logAction } from '../../services/mockApi';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate API key/token (implement your auth logic)
    const apiKey = req.headers['x-api-key'];
    if (!isValidApiKey(apiKey)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Extract draft data from customer portal
    const { customer, vehicle, insuranceType, riskFactors, startDate } = req.body;

    // Validate required fields
    if (!customer?.cpr || !customer?.mobile || !vehicle || !insuranceType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create QuoteRequest object
    const quote: QuoteRequest = {
      id: generateUUID(),
      quoteReference: generateQuoteReference(),
      customer: {
        cpr: customer.cpr,
        fullName: customer.fullName,
        mobile: customer.mobile,
        email: customer.email || '',
        type: customer.isExisting ? CustomerType.EXISTING : CustomerType.NEW,
        isEligibleForZain: true, // Validate based on your logic
        isEligibleForInstallments: customer.creditScore >= 700,
        creditScore: customer.creditScore || 0,
        activeLines: customer.subscriberNumbers || []
      },
      vehicle: {
        plateNumber: vehicle.plateNumber,
        chassisNumber: vehicle.chassisNumber,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        value: vehicle.value
      },
      insuranceType,
      riskFactors: riskFactors || { ageUnder24: false, licenseUnder1Year: false },
      status: QuoteStatus.DRAFT,
      startDate: startDate || new Date().toISOString(),
      createdAt: new Date(),
      source: QuoteSource.CUSTOMER_PORTAL, // ✅ Important: Mark as customer portal
      reminderCount: 0
    };

    // Save to database
    await saveDraft(quote);

    // Log the action
    await logAction(
      quote.id,
      'DRAFT_RECEIVED',
      'Draft received from customer portal',
      'Customer Portal System'
    );

    // Return success response
    return res.status(201).json({
      success: true,
      quoteId: quote.id,
      quoteReference: quote.quoteReference,
      message: 'Draft successfully received and saved'
    });

  } catch (error) {
    console.error('Error processing customer portal draft:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// Helper function to validate API key
function isValidApiKey(key: string | undefined): boolean {
  if (!key) return false;
  
  // In production, validate against stored API keys
  const validKeys = process.env.CUSTOMER_PORTAL_API_KEYS?.split(',') || [];
  return validKeys.includes(key);
}
```

### 2. Customer Portal Request Format

The customer portal should send POST requests with this format:

```typescript
// POST /api/customer-portal/draft
// Header: x-api-key: YOUR_API_KEY

{
  "customer": {
    "cpr": "920101789",
    "fullName": "Khalid Al-Mansoori",
    "mobile": "97335551234",
    "email": "khalid.m@email.com",
    "isExisting": false,
    "creditScore": 720,
    "subscriberNumbers": ["97335551234"]
  },
  "vehicle": {
    "plateNumber": "445566",
    "chassisNumber": "CP12345ABCD",
    "make": "Nissan",
    "model": "Patrol",
    "year": "2024",
    "value": 25000
  },
  "insuranceType": "MOTOR",
  "riskFactors": {
    "ageUnder24": false,
    "licenseUnder1Year": false
  },
  "startDate": "2026-02-01T00:00:00.000Z"
}
```

### 3. Environment Variables

Add to your `.env` or `.env.local` file:

```bash
# Customer Portal Integration
CUSTOMER_PORTAL_API_KEYS=key1,key2,key3
CUSTOMER_PORTAL_WEBHOOK_URL=https://customer-portal.example.com/webhooks/status

# WhatsApp Business API (for reminders)
WHATSAPP_BUSINESS_API_KEY=your_whatsapp_api_key
WHATSAPP_BUSINESS_PHONE_ID=your_phone_number_id
WHATSAPP_MESSAGE_TEMPLATE_ID=draft_reminder_template
```

## WhatsApp Integration

### 1. Setup WhatsApp Business API

Replace the mock implementation in `mockApi.ts`:

```typescript
import axios from 'axios';

export const sendWhatsAppReminder = async (quoteId: string): Promise<boolean> => {
  const quote = await getQuoteById(quoteId);
  if (!quote) {
    console.error('Quote not found:', quoteId);
    return false;
  }

  try {
    // WhatsApp Business API endpoint
    const url = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_BUSINESS_PHONE_ID}/messages`;
    
    // Prepare the message
    const message = {
      messaging_product: 'whatsapp',
      to: quote.customer.mobile.replace('+', ''), // Remove + if present
      type: 'template',
      template: {
        name: process.env.WHATSAPP_MESSAGE_TEMPLATE_ID,
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: quote.customer.fullName },
              { type: 'text', text: quote.quoteReference || 'your quote' },
              { 
                type: 'text', 
                text: `${process.env.CUSTOMER_PORTAL_URL}/resume/${quote.id}` 
              }
            ]
          }
        ]
      }
    };

    // Send the request
    const response = await axios.post(url, message, {
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_BUSINESS_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    // Create reminder record
    const reminder: WhatsAppReminder = {
      id: generateUUID(),
      quoteId: quote.id,
      sentAt: new Date().toISOString(),
      status: 'SENT',
      recipientNumber: quote.customer.mobile,
      message: `Reminder sent for quote ${quote.quoteReference}`
    };

    reminders.push(reminder);

    // Update quote
    quote.lastReminderSent = reminder.sentAt;
    quote.reminderCount = (quote.reminderCount || 0) + 1;
    await updateQuote(quote);

    // Log action
    await logAction(
      quote.id,
      'REMINDER_SENT',
      `WhatsApp reminder sent to ${quote.customer.mobile}. Message ID: ${response.data.messages[0].id}`,
      quote.agentName || 'System'
    );

    return true;

  } catch (error) {
    console.error('Failed to send WhatsApp reminder:', error);
    
    // Log failure
    await logAction(
      quote.id,
      'REMINDER_FAILED',
      `Failed to send WhatsApp reminder: ${error.message}`,
      'System'
    );

    return false;
  }
};
```

### 2. Create WhatsApp Message Template

In WhatsApp Business Manager, create a template:

**Template Name**: `draft_reminder_template`

**Category**: Utility

**Language**: English

**Message Content**:
```
Hi {{1}},

You have an incomplete insurance quote ({{2}}) with Zain Takaful. 

Please complete your application at your earliest convenience:
{{3}}

Need help? Contact us at +973 XXXX XXXX

- Zain Takaful Insurance
```

**Variables**:
1. Customer name
2. Quote reference
3. Resume link

## Auto-Reminder Scheduler

### Option 1: Vercel Cron Jobs (Serverless)

**File**: `api/cron/send-reminders.ts`

```typescript
import type { NextApiRequest, NextApiResponse } from 'next';
import { scheduleAutoReminders } from '../../services/mockApi';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify cron secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await scheduleAutoReminders();
    
    return res.status(200).json({ 
      success: true, 
      message: 'Auto-reminders processed successfully' 
    });
  } catch (error) {
    console.error('Error in auto-reminder cron:', error);
    return res.status(500).json({ error: 'Failed to process reminders' });
  }
}
```

**Configure in `vercel.json`**:
```json
{
  "crons": [{
    "path": "/api/cron/send-reminders",
    "schedule": "0 9 * * *"
  }]
}
```

### Option 2: Firebase Cloud Function

```typescript
import * as functions from 'firebase-functions';
import { scheduleAutoReminders } from './mockApi';

export const scheduledReminders = functions.pubsub
  .schedule('0 9 * * *') // Every day at 9 AM
  .timeZone('Asia/Bahrain')
  .onRun(async (context) => {
    console.log('Running scheduled reminders...');
    
    try {
      await scheduleAutoReminders();
      console.log('Reminders sent successfully');
    } catch (error) {
      console.error('Error sending reminders:', error);
      throw error;
    }
  });
```

### Option 3: Node.js Cron Job

**File**: `server/scheduler.ts`

```typescript
import cron from 'node-cron';
import { scheduleAutoReminders } from '../services/mockApi';

// Run every day at 9 AM
cron.schedule('0 9 * * *', async () => {
  console.log('Running scheduled reminders...');
  
  try {
    await scheduleAutoReminders();
    console.log('Reminders sent successfully');
  } catch (error) {
    console.error('Error in scheduled reminders:', error);
  }
});

console.log('Reminder scheduler initialized');
```

## Webhook for Status Updates

Allow customer portal to notify about quote progress:

**File**: `api/customer-portal/webhook.ts`

```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { quoteId, status, event } = req.body;

  try {
    const quote = await getQuoteById(quoteId);
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    // Update status based on event
    switch (event) {
      case 'CUSTOMER_RESUMED':
        await logAction(quoteId, 'CUSTOMER_RESUMED', 'Customer resumed draft from portal');
        break;
      
      case 'QUOTE_COMPLETED':
        quote.status = QuoteStatus.PENDING_APPROVAL;
        await updateQuote(quote);
        await logAction(quoteId, 'QUOTE_COMPLETED', 'Customer completed quote');
        break;
      
      case 'DOCUMENTS_UPLOADED':
        quote.status = QuoteStatus.DOCS_UPLOADED;
        await updateQuote(quote);
        await logAction(quoteId, 'DOCS_UPLOADED', 'Customer uploaded documents');
        break;
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to process webhook' });
  }
}
```

## Security Considerations

### 1. API Key Management
```typescript
// Generate secure API keys
import crypto from 'crypto';

function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Store in database with hashing
const hashedKey = crypto
  .createHash('sha256')
  .update(apiKey)
  .digest('hex');
```

### 2. Rate Limiting
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/customer-portal', limiter);
```

### 3. Input Validation
```typescript
import Joi from 'joi';

const draftSchema = Joi.object({
  customer: Joi.object({
    cpr: Joi.string().length(9).required(),
    fullName: Joi.string().min(3).required(),
    mobile: Joi.string().pattern(/^973\d{8}$/).required(),
    email: Joi.string().email().required()
  }).required(),
  vehicle: Joi.object({
    plateNumber: Joi.string().required(),
    chassisNumber: Joi.string().required(),
    make: Joi.string().required(),
    model: Joi.string().required(),
    year: Joi.string().length(4).required(),
    value: Joi.number().min(1000).required()
  }).required()
});

// Validate request
const { error } = draftSchema.validate(req.body);
if (error) {
  return res.status(400).json({ error: error.details[0].message });
}
```

## Testing

### 1. Test Draft Reception

```bash
curl -X POST http://localhost:3002/api/customer-portal/draft \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "customer": {
      "cpr": "920101789",
      "fullName": "Test Customer",
      "mobile": "97335551234",
      "email": "test@example.com",
      "creditScore": 750
    },
    "vehicle": {
      "plateNumber": "TEST123",
      "chassisNumber": "TESTVIN123",
      "make": "Toyota",
      "model": "Camry",
      "year": "2024",
      "value": 15000
    },
    "insuranceType": "MOTOR"
  }'
```

### 2. Test WhatsApp Reminder

```typescript
// In browser console or test file
await sendWhatsAppReminder('quote-id-here');
```

### 3. Monitor Logs

```bash
# View Firebase logs
firebase functions:log

# View Vercel logs
vercel logs

# View local logs
tail -f logs/reminders.log
```

## Monitoring & Analytics

### 1. Track Key Metrics

```typescript
// Add to your analytics service
analytics.track('customer_portal_draft_received', {
  quoteId: quote.id,
  source: 'CUSTOMER_PORTAL',
  timestamp: new Date()
});

analytics.track('whatsapp_reminder_sent', {
  quoteId: quote.id,
  reminderNumber: quote.reminderCount,
  timestamp: new Date()
});
```

### 2. Dashboard Metrics

Create a metrics dashboard to track:
- Total drafts by source
- Conversion rate by source
- Average time to complete
- Reminder effectiveness
- Drop-off points

## Next Steps

1. ✅ Setup API endpoint for draft reception
2. ✅ Configure WhatsApp Business API
3. ✅ Deploy auto-reminder scheduler
4. ✅ Implement webhook handlers
5. ✅ Add monitoring and analytics
6. ✅ Test end-to-end flow
7. ✅ Document for customer portal team

---

**Need Help?** Contact the development team or refer to the main documentation.
