# Plan Card Visual Reference

This document shows the visual layout of the insurance plan cards after API integration.

## Layout Structure

```
┌────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  │  Zain Super        │  │  Zain Economy      │  │  Third Party       │
│  │                    │  │                    │  │                    │
│  │  Policy Price      │  │  Policy Price      │  │  Policy Price      │
│  │  BD 242.000        │  │  BD 220.000        │  │  BD 64.900         │
│  │  (VAT inc.)        │  │  (VAT inc.)        │  │  (VAT inc.)        │
│  │                    │  │                    │  │                    │
│  │  Upfront           │  │  Upfront           │  │  Upfront           │
│  │  BD 26.000         │  │  BD 28.000         │  │  BD 6.100          │
│  │  (VAT inc.)        │  │  (VAT inc.)        │  │  (VAT inc.)        │
│  │                    │  │                    │  │                    │
│  │  Installment Price │  │  Installment Price │  │  Installment Price │
│  │  BD 18.000 Month   │  │  BD 16.000 Month   │  │  BD 4.900 Month    │
│  │                    │  │                    │  │                    │
│  │ ──────────────────│  │ ──────────────────│  │ ──────────────────│
│  │                    │  │                    │  │                    │
│  │  Plan benefits     │  │  Plan benefits     │  │  Plan benefits     │
│  │  ✓ Third Party     │  │  ✓ Third Party     │  │  ✓ Third Party     │
│  │    Property Damage │  │    Property Damage │  │    Property Damage │
│  │  ✓ Loss/Damage of  │  │  ✓ Loss/Damage of  │  │  ✓ Third Party     │
│  │    Vehicle         │  │    Vehicle         │  │    Bodily Injury   │
│  │  ✓ Road Assist     │  │  ✓ Road Assist     │  │                    │
│  │  ✓ Agency Repair   │  │  ✓ Agency Repair   │  │                    │
│  │  ✓ Emergency       │  │  ✓ Emergency       │  │                    │
│  │    Treatment       │  │    Treatment       │  │                    │
│  │  ✓ Windows Cover   │  │  ✓ Windows Cover   │  │                    │
│  │  ✓ Car Replacement │  │  ✓ Third Party     │  │                    │
│  │  ✓ Natural Perils  │  │    Bodily Injury   │  │                    │
│  │  ✓ VIP             │  │                    │  │                    │
│  │  ✓ Third Party     │  │                    │  │                    │
│  │    Bodily Injury   │  │                    │  │                    │
│  │                    │  │                    │  │                    │
│  │  [Select Plan]     │  │  [Select Plan]     │  │  [Select Plan]     │
│  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘
│                                                              │
└────────────────────────────────────────────────────────────┘
```

## Plan Details

### Zain Super - Comprehensive Coverage
```
┌─────────────────────────────────┐
│ ✓ Selected (Checkmark in corner)│
│                                  │
│ Zain Super                       │
│                                  │
│ Policy Price                     │
│ BD  242.000   (VAT inc.)        │
│                                  │
│ Upfront                          │
│ BD  26.000   (VAT inc.)         │
│                                  │
│ Installment Price                │
│ BD  18.000  Month               │
│                                  │
│ ─────────────────────────        │
│                                  │
│ Plan benefits                    │
│ ✓ Third Party Property Damage   │
│ ✓ Loss or Damage of Vehicle     │
│ ✓ Road Assist Cover              │
│ ✓ Agency Repair                  │
│ ✓ Emergency Treatment Cover      │
│ ✓ Windows Cover                  │
│ ✓ Car Replacement Cover          │
│ ✓ Natural Perils                 │
│ ✓ VIP                            │
│ ✓ Third Party Bodily Injury      │
│                                  │
│ [    Selected    ]               │
│   (Blue button)                  │
└─────────────────────────────────┘
```

### Zain Economy - Full Coverage
```
┌─────────────────────────────────┐
│                                  │
│ Zain Economy                     │
│                                  │
│ Policy Price                     │
│ BD  220.000   (VAT inc.)        │
│                                  │
│ Upfront                          │
│ BD  28.000   (VAT inc.)         │
│                                  │
│ Installment Price                │
│ BD  16.000  Month               │
│                                  │
│ ─────────────────────────        │
│                                  │
│ Plan benefits                    │
│ ✓ Third Party Property Damage   │
│ ✓ Loss or Damage of Vehicle     │
│ ✓ Road Assist Cover              │
│ ✓ Agency Repair                  │
│ ✓ Emergency Treatment Cover      │
│ ✓ Windows Cover                  │
│ ✓ Third Party Bodily Injury      │
│                                  │
│ [   Select Plan   ]              │
│   (White button)                 │
└─────────────────────────────────┘
```

### Third Party - Basic Coverage
```
┌─────────────────────────────────┐
│                                  │
│ Third Party                      │
│                                  │
│ Policy Price                     │
│ BD  64.900   (VAT inc.)         │
│                                  │
│ Upfront                          │
│ BD  6.100   (VAT inc.)          │
│                                  │
│ Installment Price                │
│ BD  4.900  Month                │
│                                  │
│ ─────────────────────────        │
│                                  │
│ Plan benefits                    │
│ ✓ Third Party Property Damage   │
│ ✓ Third Party Bodily Injury      │
│                                  │
│                                  │
│                                  │
│                                  │
│                                  │
│ [   Select Plan   ]              │
│   (White button)                 │
└─────────────────────────────────┘
```

## Responsive Behavior

### Desktop (3 columns)
```
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  Zain Super    │  │  Zain Economy  │  │  Third Party   │
└────────────────┘  └────────────────┘  └────────────────┘
```

### Tablet (2 columns)
```
┌────────────────┐  ┌────────────────┐
│  Zain Super    │  │  Zain Economy  │
└────────────────┘  └────────────────┘

┌────────────────┐
│  Third Party   │
└────────────────┘
```

### Mobile (1 column)
```
┌────────────────┐
│  Zain Super    │
└────────────────┘

┌────────────────┐
│  Zain Economy  │
└────────────────┘

┌────────────────┐
│  Third Party   │
└────────────────┘
```

## Color Scheme

### Selected Plan
- Border: Zain Blue (#6600CC or theme's zain-600)
- Background: Light blue tint (zain-50)
- Ring: Zain Blue with opacity (ring-zain-200)
- Button: Solid Zain Blue background

### Unselected Plans
- Border: Light gray (#E5E7EB or gray-200)
- Background: White
- Hover: Border changes to lighter Zain Blue
- Button: White background with gray border

### Pricing Display
- Main Amount: Extra bold, large (3xl for policy, 2xl for others)
- Currency: Bold, medium size (sm or base)
- Label: Uppercase, small, gray text
- VAT note: Very small, gray

### Benefits List
- Checkmark: Green (#10B981)
- Text: Dark gray (#374151)
- Font size: Small (text-sm)
- Line spacing: Comfortable (space-y-1.5)

## Interactive States

### Hover
- Card slightly elevates (shadow increases)
- Border color intensifies
- Cursor becomes pointer

### Click
- Updates selection state immediately
- Checkmark appears in top-right corner
- Button text changes from "Select Plan" to "Selected"
- Card border and background update

### Loading
- Skeleton placeholders during API fetch
- 3 gray rectangular placeholders
- Pulsing animation

### Error State
- Red border around problematic cards
- Error message shown below cards
- Option to retry or use fallback

## Discount Display

When discount code applied:
```
┌─────────────────────────────────┐
│ [-15%]     Zain Super      [✓]  │
│   (green badge)                  │
│                                  │
│ Policy Price                     │
│ BD  205.700   (VAT inc.)        │
│ BD  242.000  (crossed out)      │
│                                  │
│ ... rest of card ...             │
└─────────────────────────────────┘
```

## Payment Method Toggle

Above the plan cards:
```
┌───────────────────────────────────────────────────────┐
│ Choose Payment Method to view pricing:                │
│                                                        │
│  ┌──────────────────┐    ┌───────────────────┐      │
│  │ 💵 Pay Full      │    │ 💳 Pay Monthly    │      │
│  │    Amount        │    │    (12 Months)    │      │
│  │ ✓ Selected       │    │                   │      │
│  └──────────────────┘    └───────────────────┘      │
└───────────────────────────────────────────────────────┘
```

## Notes

1. **All prices in Bahraini Dinars (BD)**
   - Format: BD XXX.XXX (3 decimal places)
   - Always show VAT inclusion note

2. **Upfront Payment**
   - For installments, upfront = VAT amount
   - For cash payment, upfront = full amount

3. **Installment Calculation**
   - Monthly = (Base Premium / 12)
   - VAT paid upfront
   - 12 equal monthly payments

4. **Benefit Checkmarks**
   - Always green color
   - Always show checkmark icon
   - List benefits in order of importance

5. **Plan Ordering**
   - Best plan (Zain Super) shown first
   - Mid-tier (Zain Economy) in middle
   - Basic (Third Party) shown last
