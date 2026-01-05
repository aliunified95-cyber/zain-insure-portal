# Zain Takaful API Integration

This document describes the integration of real Zain Takaful APIs into the insurance portal.

## API Endpoints

All APIs are hosted at: `https://giguatp.prosys.ai/api/v2`

### 1. Eligibility Check API

**Endpoint:** `/takaful-zain-eligibility-check`  
**Method:** POST  
**Purpose:** Check if a Zain subscriber is eligible for Takaful insurance services

**Request:**
```json
{
  "subscriberNumber": "string" // Zain subscription number
}
```

**Response:**
```json
{
  "success": true,
  "isEligible": true,
  "subscriberNumber": "string",
  "plan": "POST" | "PRE", // Postpaid or Prepaid
  "message": "string"
}
```

**Usage in Application:**
- Called when searching for a customer by CPR/Subscriber ID in Step 1
- Located in: `QuickQuoteFlow.tsx` → `handleCustomerSearch()`
- Service function: `zainApi.checkEligibility(subscriberNumber)`

### 2. Motor Data API

**Endpoint:** `/takaful-zain-motor-data`  
**Method:** POST  
**Purpose:** Retrieve vehicle information using plate number

**Request:**
```json
{
  "plateNumber": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "plateNumber": "string",
    "chassisNumber": "string",
    "make": "string",
    "model": "string",
    "year": "string",
    "bodyType": "string",
    "engineSize": "string",
    "registrationMonth": number
  }
}
```

**Usage in Application:**
- Called when searching for a vehicle by plate number in Step 2
- Located in: `QuickQuoteFlow.tsx` → `handleVehicleSearch()`
- Service function: `zainApi.getMotorData(plateNumber)`

### 3. GDT Vehicle Details API

**Endpoint:** `/gdt-get-vehicle-details`  
**Method:** POST  
**Purpose:** Get additional vehicle details including registration dates and policy dates

**Request:**
```json
{
  "plateNumber": "string",
  "chassisNumber": "string" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "plateNumber": "string",
    "registrationMonth": number,
    "policyStartDate": "YYYY-MM-DD", // Defaults to today, user can amend
    "policyEndDate": "YYYY-MM-DD",
    "vehicleValue": number
  }
}
```

**Usage in Application:**
- Called automatically after Motor Data API succeeds
- Located in: `QuickQuoteFlow.tsx` → `handleVehicleSearch()`
- Service function: `zainApi.getGDTVehicleDetails(plateNumber, chassisNumber)`
- Combined call: `zainApi.getCompleteVehicleData(plateNumber)` (calls both Motor Data and GDT in sequence)

### 4. Motor Plans API

**Endpoint:** `/takaful-zain-motor-plans`  
**Method:** POST  
**Purpose:** Retrieve available insurance plans with pricing and benefits

**Request:**
```json
{
  "plateNumber": "string",
  "vehicleValue": number,
  "policyStartDate": "YYYY-MM-DD",
  "policyEndDate": "YYYY-MM-DD",
  "registrationMonth": number,
  "subscriberNumber": "string",
  "make": "string",
  "model": "string",
  "year": "string",
  "chassisNumber": "string",
  "bodyType": "string",
  "engineSize": "string"
}
```

**Response:**
```json
{
  "success": true,
  "plans": [
    {
      "id": "string",
      "name": "Zain Super" | "Zain Economy" | "Third Party",
      "policyPrice": number, // Total price including VAT
      "upfront": number, // Upfront payment including VAT
      "installmentPrice": number, // Monthly installment
      "vatIncluded": true,
      "benefits": [
        {
          "name": "Third Party Property Damage",
          "included": true
        },
        {
          "name": "Loss or Damage of Vehicle",
          "included": true
        }
        // ... more benefits
      ]
    }
  ]
}
```

**Usage in Application:**
- Called when moving from Step 2 to Step 3 to generate quotes
- Located in: `QuickQuoteFlow.tsx` → `generatePlans()`
- Service function: `zainApi.getMotorPlans(request)`

## Plan Display Format

Plans are displayed in card format with the following structure:

```
┌─────────────────────────────┐
│ Plan Name                   │
│                             │
│ Policy Price                │
│ BD XXX.XXX (VAT inc.)      │
│                             │
│ Upfront                     │
│ BD XX.XXX (VAT inc.)       │
│                             │
│ Installment Price           │
│ BD XX.XXX Month            │
│                             │
│ Plan benefits               │
│ ✓ Benefit 1                │
│ ✓ Benefit 2                │
│ ✓ Benefit 3                │
│                             │
│ [Select Plan]              │
└─────────────────────────────┘
```

### Example Plans

1. **Zain Super**
   - Policy Price: BD 242.000 (VAT inc.)
   - Upfront: BD 26.000 (VAT inc.)
   - Installment: BD 18.000/Month
   - Benefits: Comprehensive coverage including VIP

2. **Zain Economy**
   - Policy Price: BD 220.000 (VAT inc.)
   - Upfront: BD 28.000 (VAT inc.)
   - Installment: BD 16.000/Month
   - Benefits: Full coverage without VIP extras

3. **Third Party**
   - Policy Price: BD 64.900 (VAT inc.)
   - Upfront: BD 6.100 (VAT inc.)
   - Installment: BD 4.900/Month
   - Benefits: Basic third party coverage

## Integration Flow

### Complete Quote Flow

1. **Step 1: Customer Eligibility**
   ```
   User enters Zain Subscriber Number
   → Call checkEligibility()
   → If eligible, load customer data
   → Store eligibility info in customer record
   ```

2. **Step 2: Vehicle Details**
   ```
   User enters Plate Number
   → Call getMotorData()
   → Call getGDTVehicleDetails()
   → Populate form with vehicle info
   → Set policy dates (start = today, end = calculated)
   → User can amend dates if needed
   ```

3. **Step 3: Plan Selection**
   ```
   User submits vehicle form
   → Call getMotorPlans() with all collected data
   → Display plans in card format
   → User selects plan and payment method
   → Proceed to payment link
   ```

## Service Layer

All API calls are abstracted in `services/zainTakafulApi.ts`:

### Key Functions

- `checkEligibility(subscriberNumber)` - Check Zain eligibility
- `getMotorData(plateNumber)` - Fetch vehicle data
- `getGDTVehicleDetails(plateNumber, chassisNumber?)` - Get GDT details
- `getMotorPlans(request)` - Get available plans
- `getCompleteVehicleData(plateNumber)` - Combined call for motor + GDT data

### Error Handling

All functions return a standardized response:
```typescript
{
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}
```

If an API call fails, the application:
1. Logs the error to console
2. Shows user-friendly error message
3. Falls back to manual entry when possible
4. For plans, can fall back to mock data if needed

## Data Storage

### Customer Object
```typescript
{
  // ... existing fields
  zainPlan?: 'POST' | 'PRE';
  registrationMonth?: number;
  isEligibleForZain: boolean;
  isEligibleForInstallments: boolean;
}
```

### Quote Object
```typescript
{
  // ... existing fields
  subscriberNumber?: string; // From eligibility check
  vehicle: {
    // ... existing fields
    registrationMonth?: number; // From GDT API
  }
}
```

## Testing

To test the integration:

1. **Eligibility Check:**
   - Enter a valid Zain subscriber number in Step 1
   - Verify eligibility status is returned
   - Check that customer is loaded with eligibility info

2. **Vehicle Data:**
   - Enter a valid plate number in Step 2
   - Verify vehicle details are populated
   - Check that GDT data includes policy dates

3. **Plans Display:**
   - Complete Steps 1 and 2
   - Verify plans are displayed in the correct format
   - Check that all three plan types are available
   - Verify pricing calculations are correct

## Notes

- Policy Start Date defaults to today's date but can be amended by the user
- Policy End Date is automatically calculated (1 year from start date)
- Upfront payment for installments is the VAT amount
- All prices are displayed in Bahraini Dinars (BD) with 3 decimal places
- Installment option requires Postpaid plan ('POST') for natural eligibility
