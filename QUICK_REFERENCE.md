# Quick Reference - Zain Takaful API Integration

## 🚀 Quick Start

### 1. Import the Service
```typescript
import * as zainApi from '../../services/zainTakafulApi';
```

### 2. Check Eligibility
```typescript
const result = await zainApi.checkEligibility(subscriberNumber);
if (result.success && result.isEligible) {
  // Proceed with quote
  console.log('Plan type:', result.plan); // 'POST' or 'PRE'
}
```

### 3. Get Vehicle Data
```typescript
const vehicleData = await zainApi.getCompleteVehicleData(plateNumber);
if (vehicleData.success) {
  // Use vehicleData.motorData and vehicleData.gdtData
}
```

### 4. Get Plans
```typescript
const plans = await zainApi.getMotorPlans({
  plateNumber: 'ABC123',
  vehicleValue: 15000,
  policyStartDate: '2026-01-03',
  policyEndDate: '2027-01-02',
  // ... other fields
});
```

## 📋 API Endpoints Cheat Sheet

| API | Endpoint | Method | Purpose |
|-----|----------|--------|---------|
| Eligibility | `/takaful-zain-eligibility-check` | POST | Check subscriber eligibility |
| Motor Data | `/takaful-zain-motor-data` | POST | Get vehicle information |
| GDT Details | `/gdt-get-vehicle-details` | POST | Get policy dates & registration |
| Motor Plans | `/takaful-zain-motor-plans` | POST | Get available plans |

Base URL: `https://giguatp.prosys.ai/api/v2`

## 🔑 Key Data Structures

### Eligibility Response
```typescript
{
  success: boolean;
  isEligible: boolean;
  plan?: 'POST' | 'PRE';
  subscriberNumber?: string;
}
```

### Motor Data Response
```typescript
{
  success: boolean;
  data?: {
    plateNumber: string;
    make: string;
    model: string;
    year: string;
    chassisNumber?: string;
    bodyType?: string;
    engineSize?: string;
  }
}
```

### Motor Plan
```typescript
{
  id: string;
  name: string; // 'Zain Super', 'Zain Economy', 'Third Party'
  policyPrice: number; // Total with VAT
  upfront: number; // Upfront payment
  installmentPrice: number; // Monthly
  benefits: Array<{
    name: string;
    included: boolean;
  }>
}
```

## 🎯 Common Use Cases

### Use Case 1: New Quote Flow
```typescript
// Step 1: Check eligibility
const eligibility = await zainApi.checkEligibility(subscriberNumber);

// Step 2: Get vehicle data
const vehicle = await zainApi.getCompleteVehicleData(plateNumber);

// Step 3: Get plans
const plans = await zainApi.getMotorPlans({
  plateNumber: vehicle.motorData.plateNumber,
  vehicleValue: vehicle.gdtData.vehicleValue,
  policyStartDate: vehicle.gdtData.policyStartDate,
  policyEndDate: vehicle.gdtData.policyEndDate,
  subscriberNumber: subscriberNumber,
  make: vehicle.motorData.make,
  model: vehicle.motorData.model,
  year: vehicle.motorData.year,
});
```

### Use Case 2: Error Handling
```typescript
const result = await zainApi.checkEligibility(subscriberNumber);

if (!result.success) {
  // Show error to user
  alert(result.error || 'Failed to check eligibility');
  return;
}

if (!result.isEligible) {
  // User is not eligible
  alert('Subscriber is not eligible for Zain Takaful');
  return;
}

// Proceed with eligible user
```

### Use Case 3: Fallback to Mock Data
```typescript
try {
  const plans = await zainApi.getMotorPlans(request);
  
  if (plans.success && plans.plans) {
    return plans.plans;
  } else {
    // Fallback to mock
    return await api.generateQuotes(vehicleValue, riskFactors, insuranceType);
  }
} catch (error) {
  // On error, use mock data
  console.error('Plan API failed, using mock:', error);
  return await api.generateQuotes(vehicleValue, riskFactors, insuranceType);
}
```

## 🛠️ Helper Functions

### Format Plan Benefits
```typescript
const benefits = plan.benefits
  .filter(b => b.included)
  .map(b => b.name);
```

### Calculate Pricing
```typescript
const policyPrice = plan.policyPrice; // Includes VAT
const upfront = plan.upfront; // For installments
const monthly = plan.installmentPrice; // Monthly payment
```

### Check Installment Eligibility
```typescript
const canUseInstallments = customer.zainPlan === 'POST';
// Only Postpaid customers can use installments
```

## 📊 Response Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process data |
| 400 | Bad Request | Check request payload |
| 404 | Not Found | Check endpoint URL |
| 500 | Server Error | Retry or fallback |

## 🎨 UI Display Formats

### Price Display
```typescript
// Always 3 decimal places
const formatted = `BD ${price.toFixed(3)}`;
// Example: "BD 242.000"
```

### Plan Card Layout
```jsx
<div className="plan-card">
  <h3>{plan.name}</h3>
  
  <div className="price-section">
    <label>Policy Price</label>
    <span>BD {plan.policyPrice.toFixed(3)}</span>
    <small>(VAT inc.)</small>
  </div>
  
  <div className="price-section">
    <label>Upfront</label>
    <span>BD {plan.upfront.toFixed(3)}</span>
    <small>(VAT inc.)</small>
  </div>
  
  <div className="price-section">
    <label>Installment Price</label>
    <span>BD {plan.installmentPrice.toFixed(3)} Month</span>
  </div>
  
  <ul className="benefits">
    {plan.benefits.map(benefit => (
      <li key={benefit.name}>
        ✓ {benefit.name}
      </li>
    ))}
  </ul>
  
  <button>Select Plan</button>
</div>
```

## 🔍 Debugging Tips

### Enable Debug Logging
```typescript
// In zainTakafulApi.ts
console.log('API Request:', endpoint, payload);
console.log('API Response:', response);
```

### Check Network Tab
1. Open Browser DevTools (F12)
2. Go to Network tab
3. Filter by "Fetch/XHR"
4. Look for API calls to `giguatp.prosys.ai`
5. Check request/response data

### Common Issues

**Issue:** "CORS error"
- **Fix:** Ensure API server allows your domain

**Issue:** "Invalid plate number"
- **Fix:** Check plate format, ensure no extra spaces

**Issue:** "No plans returned"
- **Fix:** Verify all required fields in request payload

**Issue:** "Eligibility always fails"
- **Fix:** Check subscriber number format (no spaces/dashes)

## 📝 Testing Commands

### Manual API Testing (using curl)

```bash
# Check Eligibility
curl -X POST https://giguatp.prosys.ai/api/v2/takaful-zain-eligibility-check \
  -H "Content-Type: application/json" \
  -d '{"subscriberNumber":"39123456"}'

# Get Motor Data
curl -X POST https://giguatp.prosys.ai/api/v2/takaful-zain-motor-data \
  -H "Content-Type: application/json" \
  -d '{"plateNumber":"123456"}'

# Get GDT Details
curl -X POST https://giguatp.prosys.ai/api/v2/gdt-get-vehicle-details \
  -H "Content-Type: application/json" \
  -d '{"plateNumber":"123456","chassisNumber":"ABC123"}'

# Get Motor Plans
curl -X POST https://giguatp.prosys.ai/api/v2/takaful-zain-motor-plans \
  -H "Content-Type: application/json" \
  -d '{
    "plateNumber":"123456",
    "vehicleValue":15000,
    "policyStartDate":"2026-01-03",
    "policyEndDate":"2027-01-02"
  }'
```

## 🔗 Related Files

| File | Purpose |
|------|---------|
| `services/zainTakafulApi.ts` | Core API service |
| `components/quote/QuickQuoteFlow.tsx` | Main integration point |
| `types.ts` | TypeScript type definitions |
| `API_INTEGRATION.md` | Detailed documentation |
| `IMPLEMENTATION_SUMMARY.md` | Complete implementation guide |

## 📞 Support

- **API Issues:** Check with GIG API team
- **Frontend Issues:** Check browser console and network tab
- **Data Issues:** Verify request payload matches API spec

## ✅ Pre-Launch Checklist

- [ ] Test eligibility with valid subscriber numbers
- [ ] Test vehicle search with multiple plate numbers
- [ ] Verify all three plans display correctly
- [ ] Check pricing calculations (policy, upfront, installment)
- [ ] Test error scenarios (invalid inputs)
- [ ] Verify fallback to mock data works
- [ ] Test on different screen sizes
- [ ] Check accessibility (keyboard navigation)
- [ ] Test with slow network connection
- [ ] Verify data persistence (save draft)

## 🎓 Learn More

- Full API Documentation: `API_INTEGRATION.md`
- Implementation Details: `IMPLEMENTATION_SUMMARY.md`
- Visual Reference: `PLAN_CARDS_VISUAL.md`
