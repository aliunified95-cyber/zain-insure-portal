# Customer Portal Integration

## Overview

This document describes the integration of customer portal data into the agent dashboard, allowing agents to view and manage drafts from both the agent portal and customer portal in one unified interface.

## Key Features

### 1. **Multi-Source Quote Management**
- Quotes can originate from two sources:
  - **Agent Portal**: Quotes created by agents through the internal system
  - **Customer Portal**: Drafts created by customers directly through the customer-facing portal

### 2. **Three-Tab Dashboard View**
The PolicyCRM component now features three tabs:

#### Tab 1: All Requests
- Shows all quotes and drafts from both sources
- Provides a comprehensive view of all customer interactions
- Useful for managers to see the complete pipeline

#### Tab 2: Agent Portal
- Filters to show only quotes created by agents
- Helps track internal team performance
- Shows quotes with full agent attribution

#### Tab 3: Customer Portal
- Displays only customer-initiated drafts
- Identifies self-service attempts
- Allows agents to follow up on incomplete customer submissions

### 3. **Advanced Filtering**
Agents can filter quotes by:
- **Status**: Draft, Pending Approval, Approved, Rejected, Link Sent, Issued
- **Search**: By customer name, mobile number, CPR, or quote reference
- **Source**: Automatically filtered by active tab

### 4. **WhatsApp Reminder System**
- **Manual Reminders**: Agents can send WhatsApp reminders to customers with draft quotes
- **Reminder Tracking**: System tracks how many reminders have been sent and when
- **Auto-Reminder Schedule** (future enhancement):
  - First reminder: 3 days after draft creation
  - Second reminder: 7 days after draft creation
  - Final reminder: 14 days after draft creation

### 5. **Amendment Capabilities**
- Agents can amend/edit drafts from any source
- Full access to EditQuoteModal for modifications
- All changes are logged in audit trail
- Status updates persist correctly

## Technical Implementation

### Type Extensions

```typescript
// New enum for tracking quote source
export enum QuoteSource {
  AGENT_PORTAL = 'AGENT_PORTAL',
  CUSTOMER_PORTAL = 'CUSTOMER_PORTAL'
}

// WhatsApp reminder tracking
export interface WhatsAppReminder {
  id: string;
  quoteId: string;
  sentAt: string;
  status: 'SCHEDULED' | 'SENT' | 'FAILED';
  recipientNumber: string;
  message: string;
}

// QuoteRequest extended fields
interface QuoteRequest {
  // ... existing fields
  source: QuoteSource; // NEW: Tracks origin
  lastReminderSent?: string; // NEW: ISO timestamp
  reminderCount?: number; // NEW: Count of reminders sent
}
```

### API Functions

#### `getAllQuotes()`
Fetches all quotes from Firebase and in-memory storage, merging and deduplicating results.

```typescript
const quotes = await getAllQuotes();
// Returns all quotes sorted by creation date
```

#### `sendWhatsAppReminder(quoteId: string)`
Sends a WhatsApp reminder to the customer and updates the quote with reminder metadata.

```typescript
await sendWhatsAppReminder(quote.id);
// Sends message and increments reminderCount
```

#### `scheduleAutoReminders()`
Background function to automatically send reminders based on draft age.

```typescript
// Would be called by a cron job or scheduler
await scheduleAutoReminders();
```

### Component Structure

#### PolicyCRM Component
- **Location**: `components/dashboard/PolicyCRM.tsx`
- **Props**:
  - `timeFilter`: Period filter (WEEK/MONTH/QUARTER)
  - `partnerFilter`: Insurance partner filter
  - `agentId`: Optional agent ID for filtering
  - `isManagerView`: Boolean for manager vs agent view
  - `onNavigateToQuote`: Callback for navigation

- **State Management**:
  - `activeTab`: Current tab selection (all/agent/customer)
  - `quotes`: All loaded quotes
  - `filteredQuotes`: Filtered based on tab/search/status
  - `statusFilter`: Current status filter
  - `searchTerm`: Search input value
  - `selectedQuote`: Quote opened in EditQuoteModal

#### Key Functions

```typescript
// Load all quotes
const loadQuotes = async () => {
  const allQuotes = await getAllQuotes();
  setQuotes(allQuotes);
};

// Send reminder
const handleSendReminder = async (quote: QuoteRequest) => {
  await sendWhatsAppReminder(quote.id);
  await loadQuotes(); // Reload to show updated count
};

// Filter quotes
useEffect(() => {
  // Apply tab, status, and search filters
  let filtered = quotes;
  if (activeTab === 'agent') {
    filtered = filtered.filter(q => q.source === QuoteSource.AGENT_PORTAL);
  } else if (activeTab === 'customer') {
    filtered = filtered.filter(q => q.source === QuoteSource.CUSTOMER_PORTAL);
  }
  // ... additional filtering
  setFilteredQuotes(filtered);
}, [quotes, activeTab, statusFilter, searchTerm]);
```

## UI/UX Features

### Visual Indicators
- **Source Badges**: Color-coded badges show quote source
  - Blue badge: Agent Portal
  - Green badge: Customer Portal
- **Status Badges**: Color-coded status indicators with icons
- **Reminder Count**: Purple badge showing number of reminders sent

### Stats Cards
Four summary cards display:
1. Total Quotes
2. Draft Count
3. Agent Portal Count
4. Customer Portal Count

### Interactive Elements
- **Search Bar**: Real-time search across multiple fields
- **Status Dropdown**: Quick filter by quote status
- **Remind Button**: One-click WhatsApp reminders for drafts
- **Amend/View Button**: Opens EditQuoteModal

## Sample Data

The system includes sample customer portal drafts for demonstration:

```typescript
{
  id: 'customer-portal-1',
  quoteReference: 'Q-2026-CP001',
  customer: {
    fullName: 'Khalid Al-Mansoori',
    mobile: '97335551234',
    // ... customer details
  },
  source: QuoteSource.CUSTOMER_PORTAL,
  status: QuoteStatus.DRAFT,
  reminderCount: 1,
  // ... additional fields
}
```

## Usage Guide

### For Agents

1. **View All Requests**
   - Navigate to Dashboard
   - Scroll to "Quote Management" section
   - Default view shows all requests

2. **Filter by Source**
   - Click "Agent Portal" tab to see only internal quotes
   - Click "Customer Portal" tab to see only customer drafts

3. **Send Reminders**
   - Find a draft quote
   - Click "Remind" button
   - WhatsApp reminder sent automatically
   - Reminder count increments

4. **Amend Drafts**
   - Click "Amend" button on any draft
   - EditQuoteModal opens
   - Make changes and save
   - Changes are audited

5. **Filter by Status**
   - Use status dropdown to filter
   - Options: All, Draft, Pending, Approved, etc.

6. **Search Quotes**
   - Type in search bar
   - Searches: name, mobile, CPR, quote reference
   - Results update in real-time

### For Managers

- Same features as agents
- Can view all team members' quotes
- No agent filtering applied
- Full visibility across both portals

## Integration Points

### Customer Portal (External)
To integrate with an actual customer portal:

1. **API Endpoint**: Create endpoint to receive customer drafts
2. **Data Mapping**: Map customer portal fields to QuoteRequest structure
3. **Source Attribution**: Set `source: QuoteSource.CUSTOMER_PORTAL`
4. **Notification**: Optionally notify agents of new customer drafts

### WhatsApp Integration
Current implementation is mocked. For production:

1. **WhatsApp Business API**: Integrate with official API
2. **Template Messages**: Create approved message templates
3. **Status Webhooks**: Track delivery status
4. **Rate Limiting**: Implement proper rate limiting

## Future Enhancements

1. **Auto-Reminder Scheduler**
   - Implement cron job or cloud function
   - Call `scheduleAutoReminders()` daily
   - Track reminder history

2. **Customer Portal Deep Link**
   - Include resumption link in reminders
   - Allow customers to continue where they left off

3. **Analytics Dashboard**
   - Conversion rate: Customer Portal vs Agent Portal
   - Average time to complete
   - Reminder effectiveness metrics

4. **Push Notifications**
   - Real-time alerts for new customer drafts
   - Agent assignment suggestions

5. **Bulk Actions**
   - Send reminders to multiple drafts
   - Bulk status updates
   - Export functionality

## Testing

To test the integration:

1. Start the development server: `npm run dev`
2. Login with credentials (developer/123)
3. Navigate to Dashboard
4. Scroll to "Quote Management" section
5. Test tab switching
6. Try sending reminders
7. Test search and filters
8. Open and amend drafts

## Configuration

No additional configuration needed. The feature works out of the box with:
- Firebase for data persistence
- In-memory fallback for development
- Mock WhatsApp service

## Troubleshooting

### Quotes not loading
- Check Firebase connection status (indicator on dashboard)
- Verify `firebaseConfig.ts` is properly configured
- Check browser console for errors

### Reminders not sending
- Check `sendWhatsAppReminder` function logs
- Verify quote has valid mobile number
- In production, check WhatsApp API credentials

### Filters not working
- Clear search term and try again
- Refresh page to reload quotes
- Check browser console for filter errors

## Support

For issues or questions:
1. Check console logs for errors
2. Verify data structure matches types
3. Review audit logs for data changes
4. Contact development team

---

**Last Updated**: January 4, 2026
**Version**: 1.0.0
