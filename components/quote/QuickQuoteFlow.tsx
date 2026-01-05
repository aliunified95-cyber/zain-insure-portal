
import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardBody } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { useQuoteStore } from '../../stores/useQuoteStore';
import { 
  Search, Car, Check, ChevronRight, Loader2, Send, CheckCircle, Table, LayoutGrid, 
  AlertTriangle, Lock, Info, ShieldAlert, XCircle, CreditCard, Banknote,
  Plane, Heart, Activity, Home, Monitor, Umbrella, ArrowLeft, Save, AlertCircle, Smartphone
} from 'lucide-react';
import { 
  CustomerType, InsuranceType, QuoteRequest, QuoteStatus, InsurancePlan, TravelType, TravelDestination, UserRole, PaymentMethod
} from '../../types';
import * as api from '../../services/mockApi';
import * as zainApi from '../../services/zainTakafulApi';

// --- ZOD SCHEMAS ---

const motorSchema = z.object({
  plateNumber: z.string().min(1, 'Plate number is required'),
  chassisNumber: z.string().optional(),
  vehicleType: z.string().optional(),
  make: z.string().min(2, 'Make is required'),
  model: z.string().min(2, 'Model is required'),
  year: z.string().regex(/^\d{4}$/, 'Invalid year'),
  value: z.number().min(100, 'Minimum value is 100').max(100000, 'Value too high'),
  ccHp: z.string().optional(),
  registrationMonth: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  // New Fields
  bodyType: z.string().min(1, 'Body type is required'),
  engineSize: z.string().optional(),
  isBrandNew: z.boolean().optional(),
  hasExistingInsurance: z.boolean().optional(),
  existingPolicyExpiry: z.string().optional(),
  policyEndDate: z.string().optional(),
  // Risk Factors
  ageUnder24: z.boolean().optional(),
  licenseUnder1Year: z.boolean().optional(),
});

const travelSchema = z.object({
  destination: z.nativeEnum(TravelDestination),
  type: z.nativeEnum(TravelType),
  departureDate: z.string().min(1, 'Departure date is required'),
  returnDate: z.string().min(1, 'Return date is required'),
  adultsCount: z.number().min(1),
  childrenCount: z.number().min(0),
  individualDob: z.string().optional()
});

type MotorFormInputs = z.infer<typeof motorSchema>;
type TravelFormInputs = z.infer<typeof travelSchema>;

interface QuickQuoteFlowProps {
  onComplete: () => void;
  initialData?: Partial<QuoteRequest> | null;
  existingQuoteId?: string | null;
  userRole?: UserRole;
  currentUserId?: string;
  currentUserName?: string;
}

export const QuickQuoteFlow: React.FC<QuickQuoteFlowProps> = ({ onComplete, initialData, existingQuoteId, userRole = 'JUNIOR_AGENT', currentUserId, currentUserName }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [searchCpr, setSearchCpr] = useState('');
  const [searchPlate, setSearchPlate] = useState('');
  const [subscriberNumber, setSubscriberNumber] = useState('');
  const [tempFullName, setTempFullName] = useState('');
  const [tempPhoneNumber, setTempPhoneNumber] = useState('');
  const [tempEmail, setTempEmail] = useState('');
  const [tempVehicleNumber, setTempVehicleNumber] = useState('');
  const [showSubscriberInput, setShowSubscriberInput] = useState(false);
  const [eligibilityResult, setEligibilityResult] = useState<zainApi.EligibilityCheckResponse | null>(null);
  const [vehicleDataResult, setVehicleDataResult] = useState<any>(null);
  const [showDraftPopup, setShowDraftPopup] = useState(false);
  const [draftMessage, setDraftMessage] = useState('');
  
  const { currentQuote, updateQuote, resetQuote } = useQuoteStore();
  const isIssued = currentQuote.status === QuoteStatus.ISSUED;

  // Use a ref to track the current quote for cleanup/auto-save without triggering re-renders
  const quoteRef = useRef(currentQuote);
  useEffect(() => { quoteRef.current = currentQuote; }, [currentQuote]);

  // Step 2 Local State
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const availableMakes = ['Toyota', 'Nissan', 'Honda', 'BMW', 'Hyundai', 'Ford', 'Chevrolet', 'Mercedes', 'Lexus', 'MERCEDES'];
  const availableBodyTypes = ['Sedan', 'SUV', 'Coupe', 'Hatchback', 'Pickup', 'Van', 'Sports', 'JEEP'];
  const availableVehicleTypes = ['Private', 'Commercial', 'Taxi', 'Rental', 'Government'];
  const availableMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const currentYear = new Date().getFullYear();
  const yearList = Array.from({length: 26}, (_, i) => (currentYear + 1 - i).toString());

  // Step 3 Local State
  const [plans, setPlans] = useState<InsurancePlan[]>([]);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [quoteSent, setQuoteSent] = useState(false);
  const [policyIssued, setPolicyIssued] = useState(false);
  const [paymentListenerActive, setPaymentListenerActive] = useState(false);
  const [requestingException, setRequestingException] = useState(false);
  const [exceptionSent, setExceptionSent] = useState(false);
  
  // Travel Insurance Step 3 State
  const [travelPlans, setTravelPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  // Discount Code State
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [discountError, setDiscountError] = useState<string>('');
  const [discountSuccess, setDiscountSuccess] = useState<string>('');

  // --- FORMS ---

  const { 
    register: registerMotor, 
    handleSubmit: handleMotorSubmit, 
    setValue: setMotorValue, 
    watch: watchMotor,
    formState: { errors: motorErrors },
    reset: resetMotorForm,
    getValues: getMotorValues
  } = useForm<MotorFormInputs>({
    resolver: zodResolver(motorSchema),
    defaultValues: {
      plateNumber: '',
      chassisNumber: '',
      vehicleType: 'Private',
      make: '',
      model: '',
      year: new Date().getFullYear().toString(),
      value: 0,
      ccHp: '',
      registrationMonth: '',
      startDate: new Date().toISOString().split('T')[0],
      bodyType: 'Sedan',
      engineSize: '',
      isBrandNew: false,
      hasExistingInsurance: false,
      existingPolicyExpiry: '',
      policyEndDate: '',
      ageUnder24: false,
      licenseUnder1Year: false
    }
  });

  const selectedMake = watchMotor('make');
  const hasExistingInsurance = watchMotor('hasExistingInsurance');
  const startDate = watchMotor('startDate');

  const {
    register: registerTravel,
    handleSubmit: handleTravelSubmit,
    watch: watchTravel,
    setValue: setTravelValue,
    formState: { errors: travelErrors },
    reset: resetTravelForm
  } = useForm<TravelFormInputs>({
    resolver: zodResolver(travelSchema),
    defaultValues: {
      destination: TravelDestination.WORLDWIDE,
      type: TravelType.INDIVIDUAL,
      departureDate: new Date().toISOString().split('T')[0],
      returnDate: new Date(Date.now() + 604800000).toISOString().split('T')[0],
      adultsCount: 1,
      childrenCount: 0,
      individualDob: ''
    }
  });

  // --- INITIALIZATION & DATA HYDRATION ---

  useEffect(() => {
    // Initialization Logic: Hydrate from No-SQL object
    if (initialData) {
        updateQuote(initialData);

        // Pre-fill search inputs
        if (initialData.customer?.cpr) setSearchCpr(initialData.customer.cpr);
        if (initialData.vehicle?.plateNumber) setSearchPlate(initialData.vehicle.plateNumber);

        // Determine Start Step
        if ((initialData.selectedPlanId || initialData.status !== QuoteStatus.DRAFT) && !quoteSent) {
            setStep(3);
            const vVal = initialData.vehicle?.value || 0;
            const tCrit = initialData.travelCriteria;
            api.generateQuotes(vVal, initialData.riskFactors || { ageUnder24: false, licenseUnder1Year: false }, initialData.insuranceType, tCrit)
                .then(p => setPlans(p));
                
            if (initialData.status === QuoteStatus.LINK_SENT || initialData.status === QuoteStatus.PAYMENT_PENDING) setQuoteSent(true);
            if (initialData.status === QuoteStatus.PENDING_APPROVAL) setExceptionSent(true);
        } else if (initialData.vehicle?.plateNumber && initialData.vehicle?.value && step < 2) {
             // Only auto-jump to step 2 if we haven't manually navigated yet
             setStep(2);
        }
    } else {
        resetQuote();
        resetMotorForm();
        setSearchCpr('');
        setSearchPlate('');
    }
  }, [initialData, resetQuote]);

  // Effect to sync store data to Form whenever Step changes to 2
  // This ensures that if we go Back from 3 to 2, the form is populated
  useEffect(() => {
      if (step === 2 && currentQuote.insuranceType === InsuranceType.MOTOR) {
          const v = currentQuote.vehicle;
          const rf = currentQuote.riskFactors;
          resetMotorForm({
              plateNumber: v?.plateNumber || '',
              chassisNumber: v?.chassisNumber || '',
              make: v?.make || '',
              model: v?.model || '',
              year: v?.year || new Date().getFullYear().toString(),
              value: v?.value || 0,
              startDate: currentQuote.startDate || new Date().toISOString().split('T')[0],
              bodyType: v?.bodyType || 'Sedan',
              engineSize: v?.engineSize || '',
              isBrandNew: v?.isBrandNew || false,
              hasExistingInsurance: v?.hasExistingInsurance || false,
              existingPolicyExpiry: v?.existingPolicyExpiry || '',
              policyEndDate: v?.policyEndDate || '',
              ageUnder24: rf?.ageUnder24 || false,
              licenseUnder1Year: rf?.licenseUnder1Year || false,
          });
      }
  }, [step, currentQuote, resetMotorForm]);

  // Load travel plans when in Step 3 for Travel Insurance
  useEffect(() => {
    if (currentQuote.insuranceType !== InsuranceType.TRAVEL || step !== 3) return;
    if (travelPlans.length > 0) return; // Already loaded
    
    const loadTravelPlans = async () => {
      setLoadingPlans(true);
      try {
        // Prepare travel data for API call
        const travelData = {
          destination: currentQuote.destination,
          departureDate: currentQuote.departureDate,
          returnDate: currentQuote.returnDate,
          travelType: currentQuote.travelType,
          adultsCount: currentQuote.adultsCount || 1,
          childrenCount: currentQuote.childrenCount || 0,
          individualDob: currentQuote.individualDob
        };
        
        console.log('[Travel Plans] Fetching plans with data:', travelData);
        const response = await zainApi.getTravelPlans(travelData);
        console.log('[Travel Plans] Received plans:', response);
        
        // Extract plans array from response object
        const plansArray = response?.plans || response || [];
        setTravelPlans(Array.isArray(plansArray) ? plansArray : []);
      } catch (error) {
        console.error('[Travel Plans] Error loading plans:', error);
        // Set mock data for development
        setTravelPlans([
          {
            id: 'vip',
            name: 'VIP',
            policyAmount: 25360,
            benefits: [
              'Medical Transport or Repatriation up to USD 250,000',
              'Medical Expenses Abroad up to USD 150,000',
              'Emergency medical evacuation and repatriation up to USD 250,000',
              'Indemnity Due to Possessing the Checked-In Luggage (Accidental Damage or Delay) up to USD 150',
              'Personal Liability up to USD 100,000',
              'Compensation for Baggage Delay up to USD 500',
              'Compensation for the delay in Advance of Intercept flight is USD 1,500',
              'Cancellation Expenses up to USD 500',
              'Compensation for the delay or Advance of Intercept flight up to USD 200'
            ],
            addons: [
              { id: 'winter-sports', name: 'Winter Sports Up to USD 200', price: 47.410 },
              { id: 'hazardous-sports', name: 'Hazardous Sports Up to USD 200', price: 47.410 },
              { id: 'business-cover', name: 'Business Cover', price: 30.800 }
            ]
          },
          {
            id: 'roamer',
            name: 'Roamer',
            policyAmount: 20360,
            benefits: [
              'Medical Transport or Repatriation up to USD 30,000',
              'Medical Expenses Abroad up to USD 30,000',
              'Transport or Repatriation of the Deceased Insured up to USD 25,000',
              'Indemnity Due to Possessing the Checked-In Luggage (Accidental Damage or Delay) up to USD 100',
              'Compensation for Baggage Delay',
              'Reimbursement due to the delay or Advance of Intercept flight'
            ],
            addons: [
              { id: 'winter-sports', name: 'Winter Sports Up to USD 200', price: 60.720 },
              { id: 'hazardous-sports', name: 'Hazardous Sports Up to USD 200', price: 60.720 },
              { id: 'business-cover', name: 'Business Cover', price: 28.480 }
            ]
          }
        ]);
      } finally {
        setLoadingPlans(false);
      }
    };
    
    loadTravelPlans();
  }, [step, currentQuote.insuranceType, currentQuote.destination, currentQuote.departureDate, currentQuote.returnDate, travelPlans.length]);

  // --- PERSISTENCE ---

  const persistDraft = async (data: Partial<QuoteRequest>) => {
      const updated = { ...currentQuote, ...data };
      
      // Ensure ID exists
      if (!updated.id) updated.id = api.generateUUID();
      if (!updated.quoteReference) updated.quoteReference = api.generateQuoteReference();
      if (!updated.createdAt) updated.createdAt = new Date();
      
      // Set agent information if not already set
      if (!updated.agentId && currentUserId) updated.agentId = currentUserId;
      if (!updated.agentName && currentUserName) updated.agentName = currentUserName;
      
      // Set source as AGENT_PORTAL for quotes created through this interface
      if (!updated.source) updated.source = 'AGENT_PORTAL' as any;
      
      // Removed the forced overwrite to DRAFT here so status changes (like PENDING_APPROVAL) persist.
      // If status is undefined, defaults can be handled by initial state or logic elsewhere if needed, 
      // but usually 'updated' will have the spread 'currentQuote' status.
      if (!updated.status) updated.status = QuoteStatus.DRAFT; 

      // Update Local Store
      updateQuote(updated);
      
      // Update API
      await api.saveDraft(updated as QuoteRequest);
      return updated;
  };

  // --- HANDLERS ---

  const handleCustomerSearch = async () => {
    if (!searchCpr) return;
    setLoading(true);
    setShowSubscriberInput(false);
    
    // Immediately capture and persist the CPR to draft
    const customerWithCpr = {
      cpr: searchCpr,
      fullName: tempFullName || '',
      mobile: tempPhoneNumber || '',
      email: tempEmail || '',
      type: CustomerType.NEW,
      isEligibleForZain: false,
      isEligibleForInstallments: false,
      creditScore: 0,
      activeLines: []
    };
    
    // Update quote store with CPR immediately
    updateQuote({ customer: customerWithCpr });
    
    // Persist to draft immediately
    await persistDraft({ customer: customerWithCpr });
    
    // BYPASS CRM - Not integrated yet, all customers are new
    // Always show subscriber number input for eligibility check
    setShowSubscriberInput(true);
    setLoading(false);
    
    /* TODO: Enable when Zain CRM is integrated
    try {
      // Try to fetch customer from CRM
      const result = await api.fetchCustomerByCPR(searchCpr);
      
      if (!result || !result.cpr) {
        // No customer found in CRM - show subscriber number input
        setShowSubscriberInput(true);
        setLoading(false);
        return;
      }
      
      // Customer found in CRM - now check eligibility
      const eligibility = await zainApi.checkEligibility(searchCpr);
      setEligibilityResult(eligibility);
      
      if (eligibility.success && eligibility.isEligible) {
        // Update customer with eligibility info
        updateQuote({
          customer: {
            ...result,
            zainPlan: eligibility.plan,
            isEligibleForZain: true,
            isEligibleForInstallments: eligibility.plan === 'POST'
          },
          contactNumberForLink: result.mobile,
          subscriberNumber: searchCpr
        });
      } else {
        alert(eligibility.error || 'Customer is not eligible for Zain Takaful service');
      }
    } catch (error: any) {
      console.error('Customer search error:', error);
      // If fetch fails, show subscriber input as fallback
      setShowSubscriberInput(true);
    }
    */
  };

  const handleSubscriberEligibilityCheck = async () => {
    // For Travel insurance, vehicle number is not required
    const isVehicleRequired = currentQuote.insuranceType !== InsuranceType.TRAVEL;
    
    if (!subscriberNumber || !tempFullName || !tempPhoneNumber || !tempEmail || (isVehicleRequired && !tempVehicleNumber)) {
      alert('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    
    try {
      let eligibility: any;
      
      // Use different API based on insurance type
      if (currentQuote.insuranceType === InsuranceType.TRAVEL) {
        // For Travel insurance, use Travel-specific eligibility check
        console.log('[UI] Checking Travel eligibility for:', subscriberNumber, tempEmail);
        const travelEligibility = await zainApi.checkTravelEligibility(subscriberNumber, tempEmail);
        
        // Transform Travel API response to match expected format
        eligibility = {
          success: travelEligibility.success || false,
          isEligible: travelEligibility.isEligible || travelEligibility.success || false,
          name: tempFullName,
          mobile: tempPhoneNumber,
          email: tempEmail,
          plan: 'POST', // Default for Travel
          isEligibleForInstallment: true,
          message: travelEligibility.message
        };
        
        // Check for existing draft
        if (travelEligibility.success) {
          const draftApp = await zainApi.getDraftTravelApplicationByEmail(tempEmail);
          if (draftApp) {
            setEligibilityResult(eligibility); // Set eligibility BEFORE showing popup
            setDraftMessage(`You have an existing draft travel application (ID: ${draftApp.id}). Would you like to continue with it?`);
            setShowDraftPopup(true);
            setLoading(false);
            return;
          }
        }
      } else {
        // For Motor insurance, use Motor-specific eligibility check
        console.log('[UI] Checking Motor eligibility for:', subscriberNumber);
        eligibility = await zainApi.checkEligibility(subscriberNumber, {
          fullName: tempFullName,
          phoneNumber: tempPhoneNumber,
          email: tempEmail,
          vehicleNumber: tempVehicleNumber,
        });
        
        // Check if there's a draft application message
        if (eligibility.message && 
            (eligibility.message.toLowerCase().includes('draft') || 
             eligibility.message.toLowerCase().includes('already have'))) {
          console.log('[UI] Draft application detected, showing popup');
          setEligibilityResult(eligibility); // Set eligibility BEFORE showing popup
          setDraftMessage(eligibility.message);
          setShowDraftPopup(true);
          setLoading(false);
          return;
        }
      }
      
      console.log('[UI] Eligibility response:', eligibility);
      setEligibilityResult(eligibility);
      
      if (eligibility.success && eligibility.isEligible) {
        // Create new customer with eligibility info and the data we collected
        const newCustomer: Customer = {
          cpr: searchCpr,
          fullName: eligibility.name || tempFullName,
          mobile: eligibility.mobile || tempPhoneNumber,
          email: eligibility.email || tempEmail,
          type: CustomerType.NEW,
          zainPlan: eligibility.plan,
          isEligibleForZain: true,
          isEligibleForInstallments: eligibility.isEligibleForInstallment !== undefined 
            ? eligibility.isEligibleForInstallment 
            : eligibility.plan === 'POST',
          creditScore: 700,
          activeLines: [subscriberNumber]
        };
        
        const draftData: any = {
          customer: newCustomer,
          subscriberNumber: subscriberNumber,
          contactNumberForLink: eligibility.mobile || tempPhoneNumber
        };
        
        // Only add vehicle data for non-Travel insurance
        if (currentQuote.insuranceType !== InsuranceType.TRAVEL) {
          const vehicleData = {
            plateNumber: tempVehicleNumber,
            chassisNumber: '',
            make: '',
            model: '',
            year: new Date().getFullYear().toString(),
            value: 0
          };
          draftData.vehicle = vehicleData;
          setSearchPlate(tempVehicleNumber);
        }
        
        updateQuote(draftData);
        
        // Immediately persist all data to draft
        await persistDraft(draftData);
        
        setShowSubscriberInput(false);
        
        // For Travel insurance, automatically move to step 2
        if (currentQuote.insuranceType === InsuranceType.TRAVEL) {
          setStep(2);
        }
      } else {
        alert(eligibility.error || eligibility.message || 'Subscriber is not eligible for Zain Takaful service');
      }
    } catch (error: any) {
      console.error('Eligibility check error:', error);
      alert('Failed to check eligibility: ' + error.message);
    }
    
    setLoading(false);
  };

  const handleContinueDraft = async () => {
    console.log('Continue with existing draft application');
    setShowDraftPopup(false);
    setLoading(true);
    
    try {
      // Set customer data and move to step 2
      if (eligibilityResult) {
        const newCustomer: Customer = {
          cpr: searchCpr,
          fullName: eligibilityResult.name || tempFullName,
          mobile: eligibilityResult.mobile || tempPhoneNumber,
          email: eligibilityResult.email || tempEmail,
          type: CustomerType.NEW,
          zainPlan: eligibilityResult.plan,
          isEligibleForZain: true,
          isEligibleForInstallments: eligibilityResult.isEligibleForInstallment !== undefined 
            ? eligibilityResult.isEligibleForInstallment 
            : eligibilityResult.plan === 'POST',
          creditScore: 700,
          activeLines: [subscriberNumber]
        };
        
        const draftData: any = {
          customer: newCustomer,
          subscriberNumber: subscriberNumber,
          contactNumberForLink: eligibilityResult.mobile || tempPhoneNumber
        };
        
        // Only add vehicle data for non-Travel insurance
        if (currentQuote.insuranceType !== InsuranceType.TRAVEL) {
          const vehicleData = {
            plateNumber: tempVehicleNumber,
            chassisNumber: '',
            make: '',
            model: '',
            year: new Date().getFullYear().toString(),
            value: 0
          };
          draftData.vehicle = vehicleData;
          setSearchPlate(tempVehicleNumber);
          setVehicleDataResult(null); // Clear vehicle data to trigger auto-fetch
        }
        
        updateQuote(draftData);
        setShowSubscriberInput(false);
        
        // Move to step 2 and persist with all data
        await persistDraft(draftData);
        setStep(2);
      }
    } catch (error) {
      console.error('Error continuing draft:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewApplication = async () => {
    console.log('Start new application - abandon draft and proceed');
    setShowDraftPopup(false);
    setLoading(true);
    
    try {
      // TODO: Call API to abandon/delete the draft if needed
      // For now, just proceed with new application
      
      if (eligibilityResult) {
        const newCustomer: Customer = {
          cpr: searchCpr,
          fullName: eligibilityResult.name || tempFullName,
          mobile: eligibilityResult.mobile || tempPhoneNumber,
          email: eligibilityResult.email || tempEmail,
          type: CustomerType.NEW,
          zainPlan: eligibilityResult.plan,
          isEligibleForZain: true,
          isEligibleForInstallments: eligibilityResult.isEligibleForInstallment !== undefined 
            ? eligibilityResult.isEligibleForInstallment 
            : eligibilityResult.plan === 'POST',
          creditScore: 700,
          activeLines: [subscriberNumber]
        };
        
        const draftData: any = {
          customer: newCustomer,
          subscriberNumber: subscriberNumber,
          contactNumberForLink: eligibilityResult.mobile || tempPhoneNumber
        };
        
        // Only add vehicle data for non-Travel insurance
        if (currentQuote.insuranceType !== InsuranceType.TRAVEL) {
          const vehicleData = {
            plateNumber: tempVehicleNumber,
            chassisNumber: '',
            make: '',
            model: '',
            year: new Date().getFullYear().toString(),
            value: 0
          };
          draftData.vehicle = vehicleData;
          setSearchPlate(tempVehicleNumber);
          setVehicleDataResult(null); // Clear vehicle data to trigger auto-fetch
        }
        
        updateQuote(draftData);
        setShowSubscriberInput(false);
        
        // Move to step 2 and persist with all data
        await persistDraft(draftData);
        setStep(2);
      }
    } catch (error) {
      console.error('Error starting new application:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualCustomerUpdate = async (field: string, value: string) => {
      const updatedCustomer = { ...currentQuote.customer!, [field]: value };
      const updates: any = { customer: updatedCustomer };
      if (field === 'mobile') updates.contactNumberForLink = value;
      updateQuote(updates);
      
      // Immediately persist the update to draft
      await persistDraft(updates);
  };

  // Helper to update temporary data and persist partial draft
  const updateTempDataToDraft = async () => {
    if (!searchCpr && !tempFullName && !tempPhoneNumber && !tempEmail && !tempVehicleNumber) {
      return; // Nothing to save yet
    }
    
    // Create a partial customer object with whatever data we have
    const partialCustomer = {
      cpr: searchCpr || '',
      fullName: tempFullName || '',
      mobile: tempPhoneNumber || '',
      email: tempEmail || '',
      type: CustomerType.NEW,
      isEligibleForZain: false,
      isEligibleForInstallments: false,
      creditScore: 0,
      activeLines: subscriberNumber ? [subscriberNumber] : []
    };
    
    // Create vehicle object if we have plate number
    const partialVehicle = tempVehicleNumber ? {
      plateNumber: tempVehicleNumber,
      chassisNumber: '',
      make: '',
      model: '',
      year: new Date().getFullYear().toString(),
      value: 0
    } : undefined;
    
    const updates: any = { 
      customer: partialCustomer,
      subscriberNumber: subscriberNumber || undefined
    };
    
    if (partialVehicle) {
      updates.vehicle = partialVehicle;
    }
    
    updateQuote(updates);
    await persistDraft(updates);
  };

  const handleStep1Next = async () => {
      setLoading(true);
      // Persist Customer Info before moving
      await persistDraft({});
      setStep(2);
      setLoading(false);
  };

  const handleVehicleSearch = async () => {
    if (!searchPlate) return;
    setLoading(true);
    
    try {
      // Use the combined API call to get both motor data and GDT details
      const result = await zainApi.getCompleteVehicleData(searchPlate);
      setVehicleDataResult(result);
      
      if (result.success && result.motorData) {
        const motorData = result.motorData;
        const gdtData = result.gdtData;
        
        // Populate form with motor data
        setMotorValue('make', motorData.make || '');
        setMotorValue('model', motorData.model || '');
        setMotorValue('year', motorData.year || '');
        setMotorValue('chassisNumber', motorData.chassisNumber || '');
        setMotorValue('plateNumber', searchPlate);
        setMotorValue('bodyType', motorData.bodyType || 'Sedan');
        setMotorValue('engineSize', motorData.engineSize || '');
        
        // If GDT data is available, use it
        if (gdtData) {
          setMotorValue('value', gdtData.vehicleValue || 0);
          
          // Set policy dates (start date defaults to today, can be amended)
          const startDate = gdtData.policyStartDate || new Date().toISOString().split('T')[0];
          setMotorValue('startDate', startDate);
          
          if (gdtData.policyEndDate) {
            setMotorValue('policyEndDate', gdtData.policyEndDate);
          }
          
          // Update customer registration month if available
          if (gdtData.registrationMonth && currentQuote.customer) {
            updateQuote({
              customer: {
                ...currentQuote.customer,
                registrationMonth: gdtData.registrationMonth
              }
            });
          }
        } else if (result.error) {
          console.warn('GDT data not available:', result.error);
          // Still allow user to continue with manual entry
        }
      } else {
        alert(result.error || 'Failed to fetch vehicle data');
      }
    } catch (error: any) {
      console.error('Vehicle search error:', error);
      alert('Failed to fetch vehicle data: ' + error.message);
    }
    
    setLoading(false);
  };

  const onMotorFormSubmit = async (data: MotorFormInputs) => {
      setLoading(true);
      
      // 1. Construct Update Object
      const updates = {
          vehicle: {
              plateNumber: data.plateNumber,
              chassisNumber: data.chassisNumber || '',
              make: data.make,
              model: data.model,
              year: data.year,
              value: data.value,
              bodyType: data.bodyType,
              engineSize: data.engineSize,
              isBrandNew: data.isBrandNew,
              hasExistingInsurance: data.hasExistingInsurance,
              existingPolicyExpiry: data.existingPolicyExpiry,
              policyEndDate: data.policyEndDate
          },
          startDate: data.startDate,
          insuranceType: InsuranceType.MOTOR,
          riskFactors: {
              ageUnder24: !!data.ageUnder24,
              licenseUnder1Year: !!data.licenseUnder1Year
          }
      };

      // 2. Persist to API (Draft)
      await persistDraft(updates);

      // 3. Generate Plans & Move to Step 3
      await generatePlans(data.value, undefined);
      setStep(3);
      setLoading(false);
  };

  const onTravelFormSubmit = async (data: TravelFormInputs) => {
      const criteria = {
        type: data.type,
        destination: data.destination,
        departureDate: data.departureDate,
        returnDate: data.returnDate,
        adultsCount: data.adultsCount,
        childrenCount: data.childrenCount,
        individualDob: data.individualDob
      };
      
      await persistDraft({
          travelCriteria: criteria,
          startDate: data.departureDate,
          insuranceType: InsuranceType.TRAVEL
      });
      await generatePlans(0, criteria);
      setStep(3);
  };

  const generatePlans = async (vehicleVal: number, travelCrit?: any) => {
      const rf = currentQuote.riskFactors || { ageUnder24: false, licenseUnder1Year: false };
      const vVal = vehicleVal || currentQuote.vehicle?.value || 0;
      const tCrit = travelCrit || currentQuote.travelCriteria;
      
      // If Motor insurance, use the real Zain Takaful API
      if (currentQuote.insuranceType === InsuranceType.MOTOR && currentQuote.vehicle) {
        const motorValues = getMotorValues();
        const plansRequest: zainApi.MotorPlansRequest = {
          plateNumber: currentQuote.vehicle.plateNumber,
          vehicleValue: vVal,
          policyStartDate: motorValues.startDate,
          policyEndDate: motorValues.policyEndDate || '',
          registrationMonth: currentQuote.customer?.registrationMonth,
          subscriberNumber: currentQuote.subscriberNumber,
          make: currentQuote.vehicle.make,
          model: currentQuote.vehicle.model,
          year: currentQuote.vehicle.year,
          chassisNumber: currentQuote.vehicle.chassisNumber,
          bodyType: currentQuote.vehicle.bodyType,
          engineSize: currentQuote.vehicle.engineSize,
        };
        
        const plansResult = await zainApi.getMotorPlans(plansRequest);
        
        if (plansResult.success && plansResult.plans) {
          // Convert Zain API plans to InsurancePlan format
          const convertedPlans: InsurancePlan[] = plansResult.plans.map(plan => ({
            id: plan.id,
            provider: 'GIG' as const,
            providerLogo: undefined,
            name: plan.name,
            coverage: plan.benefits.filter(b => b.included).map(b => b.name).join(', '),
            basePremium: plan.policyPrice / 1.1, // Remove VAT to get base
            features: plan.benefits.filter(b => b.included).map(b => b.name),
            addOns: [],
          }));
          setPlans(convertedPlans);
        } else {
          console.error('Failed to fetch motor plans:', plansResult.error);
          // Fallback to mock API if real API fails
          const results = await api.generateQuotes(vVal, rf, currentQuote.insuranceType, tCrit);
          setPlans(results);
        }
      } else {
        // For non-motor insurance, use existing mock API
        const results = await api.generateQuotes(vVal, rf, currentQuote.insuranceType, tCrit);
        setPlans(results);
      }
  };

  const handleRequestException = async () => {
    if (!currentQuote.selectedPlanId) return;
    setRequestingException(true);
    const selectedPlan = plans.find(p => p.id === currentQuote.selectedPlanId);
    
    // Save as Pending Approval
    const updated = {
        status: QuoteStatus.PENDING_APPROVAL,
        provider: selectedPlan?.provider,
        planName: selectedPlan?.name,
    };
    await persistDraft(updated); // Also updates status in DB

    setTimeout(() => {
        setRequestingException(false);
        setExceptionSent(true);
    }, 1200);
  };

  const handleSendLink = async () => {
      if (!currentQuote.selectedPlanId) return;
      setLoading(true);
      
      const selectedPlan = plans.find(p => p.id === currentQuote.selectedPlanId);
      
      const updated = { 
          status: QuoteStatus.PAYMENT_PENDING,
          provider: selectedPlan?.provider,
          planName: selectedPlan?.name,
      };

      await persistDraft(updated); // Save status
      await api.sendQuoteLink(currentQuote.contactNumberForLink || '', 'NEW');
      
      setQuoteSent(true);
      setPaymentListenerActive(true);
      setLoading(false);
  };

  const handleSaveAndExit = async () => {
      // Just save current state and close
      setLoading(true);
      await persistDraft({ status: QuoteStatus.DRAFT });
      setLoading(false);
      onComplete(); // Close modal/view
  };

  const handleApplyDiscountCode = async () => {
      setDiscountError('');
      setDiscountSuccess('');
      
      if (!discountCode.trim()) {
          setDiscountError('Please enter a discount code');
          return;
      }
      
      // Validate with API
      const result = await api.validateDiscountCode(discountCode.trim());
      
      if (result.isValid) {
          setAppliedDiscount(result.discountPercent);
          setDiscountSuccess(`${result.discountPercent}% discount applied! (${result.staffName})`);
          updateQuote({ discountCode: discountCode.trim(), discountPercent: result.discountPercent });
      } else {
          setDiscountError(result.error || 'Invalid or already used discount code');
          setAppliedDiscount(0);
      }
  };

  const handleRemoveDiscount = () => {
      setDiscountCode('');
      setAppliedDiscount(0);
      setDiscountError('');
      setDiscountSuccess('');
      updateQuote({ discountCode: undefined, discountPercent: 0 });
  };

  // --- OTHER EFFECTS ---
  useEffect(() => {
    const loadModels = async () => {
        if (selectedMake) {
            setIsLoadingModels(true);
            const models = await api.getModelsForMake(selectedMake);
            setAvailableModels(models);
            setIsLoadingModels(false);
        } else {
            setAvailableModels([]);
        }
    };
    loadModels();
  }, [selectedMake]);

  useEffect(() => {
    if (startDate) {
        const start = new Date(startDate);
        const end = new Date(start);
        end.setFullYear(end.getFullYear() + 1);
        end.setDate(end.getDate() - 1);
        setMotorValue('policyEndDate', end.toISOString().split('T')[0]);
    }
  }, [startDate, setMotorValue]);

  // Auto-fetch vehicle data when entering step 2 with a plate number
  useEffect(() => {
    const autoFetchVehicleData = async () => {
      // Only fetch if we're in step 2, have a plate number, it's motor insurance, and we don't have data yet
      if (step === 2 && searchPlate && currentQuote.insuranceType === InsuranceType.MOTOR && !vehicleDataResult) {
        console.log('[AUTO-FETCH] Starting auto-fetch for plate:', searchPlate);
        setLoading(true);
        
        try {
          // Get eligibility status from customer data
          const isEligible = currentQuote.customer?.isEligibleForZain || true;
          
          // Use the motor data API with required fields
          const motorResult = await zainApi.getMotorData(searchPlate, {
            collaboration: 'zain',
            eligible: isEligible,
            product: 'motor',
          });
          
          console.log('[AUTO-FETCH] Motor result:', motorResult);
          
          if (motorResult.success && motorResult.data) {
            setVehicleDataResult({ 
              success: true, 
              motorData: motorResult.data 
            });
            
            // Populate form with motor data
            const motorData = motorResult.data;
            console.log('[AUTO-FETCH] Populating form with motorData:', JSON.stringify(motorData, null, 2));
            
            // Mark as not brand new since we have historical data
            console.log('[AUTO-FETCH] Setting isBrandNew to false');
            setMotorValue('isBrandNew', false);
            
            if (motorData.chassisNumber) {
              console.log('[AUTO-FETCH] Setting chassisNumber:', motorData.chassisNumber);
              setMotorValue('chassisNumber', motorData.chassisNumber, { shouldValidate: true, shouldDirty: true });
            } else {
              console.log('[AUTO-FETCH] No chassisNumber found in response');
            }
            
            if (motorData.make) {
              console.log('[AUTO-FETCH] Setting make:', motorData.make);
              setMotorValue('make', motorData.make, { shouldValidate: true, shouldDirty: true });
            } else {
              console.log('[AUTO-FETCH] No make found in response');
            }
            
            if (motorData.model) {
              console.log('[AUTO-FETCH] Setting model:', motorData.model);
              setMotorValue('model', motorData.model, { shouldValidate: true, shouldDirty: true });
            } else {
              console.log('[AUTO-FETCH] No model found in response');
            }
            
            if (motorData.year) {
              console.log('[AUTO-FETCH] Setting year:', motorData.year);
              setMotorValue('year', motorData.year.toString(), { shouldValidate: true, shouldDirty: true });
            } else {
              console.log('[AUTO-FETCH] No year found in response');
            }
            
            if (motorData.bodyType) {
              console.log('[AUTO-FETCH] Setting bodyType:', motorData.bodyType);
              setMotorValue('bodyType', motorData.bodyType, { shouldValidate: true, shouldDirty: true });
            } else {
              console.log('[AUTO-FETCH] No bodyType found in response');
            }
            
            if (motorData.engineSize) {
              console.log('[AUTO-FETCH] Setting engineSize/ccHp:', motorData.engineSize);
              setMotorValue('engineSize', motorData.engineSize, { shouldValidate: true, shouldDirty: true });
              setMotorValue('ccHp', motorData.engineSize, { shouldValidate: true, shouldDirty: true });
            } else {
              console.log('[AUTO-FETCH] No engineSize found in response');
            }
            
            if (motorData.plateNumber) {
              console.log('[AUTO-FETCH] Setting plateNumber:', motorData.plateNumber);
              setMotorValue('plateNumber', motorData.plateNumber, { shouldValidate: true, shouldDirty: true });
            } else {
              console.log('[AUTO-FETCH] No plateNumber found in response');
            }
            
            if (motorData.registrationMonth) {
              console.log('[AUTO-FETCH] Setting registrationMonth:', motorData.registrationMonth);
              // Convert month number to month name if it's a number
              const monthValue = typeof motorData.registrationMonth === 'number' 
                ? availableMonths[motorData.registrationMonth - 1] 
                : motorData.registrationMonth;
              setMotorValue('registrationMonth', monthValue);
            }
            
            // Try to get GDT data as well
            if (motorData.chassisNumber) {
              console.log('[AUTO-FETCH] Fetching GDT data with chassis:', motorData.chassisNumber);
              const gdtResult = await zainApi.getGDTVehicleDetails(searchPlate, motorData.chassisNumber);
              console.log('[AUTO-FETCH] GDT result:', gdtResult);
              
              if (gdtResult.success && gdtResult.data) {
                setVehicleDataResult({ 
                  success: true, 
                  motorData: motorResult.data,
                  gdtData: gdtResult.data 
                });
                
                if (gdtResult.data.policyStartDate) {
                  console.log('[AUTO-FETCH] Setting startDate:', gdtResult.data.policyStartDate);
                  setMotorValue('startDate', gdtResult.data.policyStartDate);
                }
                if (gdtResult.data.policyEndDate) {
                  console.log('[AUTO-FETCH] Setting policyEndDate:', gdtResult.data.policyEndDate);
                  setMotorValue('policyEndDate', gdtResult.data.policyEndDate);
                }
                if (gdtResult.data.vehicleValue) {
                  console.log('[AUTO-FETCH] Setting value:', gdtResult.data.vehicleValue);
                  setMotorValue('value', gdtResult.data.vehicleValue);
                }
              }
            }
          } else {
            console.error('[AUTO-FETCH] Failed to fetch vehicle data:', motorResult.error);
          }
        } catch (error) {
          console.error('[AUTO-FETCH] Error:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    autoFetchVehicleData();
  }, [step, searchPlate, currentQuote.insuranceType, vehicleDataResult]);

  // --- RENDER HELPERS ---
  const renderStepIndicator = () => (
    <div className="mb-8 flex justify-center items-center">
        <StepIndicator num={1} title="Customer" current={step} />
        <StepIndicator num={2} title="Details" current={step} />
        <StepIndicator num={3} title="Quote" current={step} />
    </div>
  );

  const StepIndicator = ({ num, title, current }: { num: number, title: string, current: number }) => (
    <div className={`flex items-center shrink-0 ${current >= num ? 'text-zain-600' : 'text-gray-400'}`}>
      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 font-bold mr-2 
        ${current === num ? 'border-zain-600 bg-zain-600 text-white' : 
          current > num ? 'border-zain-600 bg-zain-600 text-white' : 'border-gray-300'}`}>
        {current > num ? <Check className="w-5 h-5" /> : num}
      </div>
      <span className="font-medium mr-4">{title}</span>
      {num < 3 && <div className="w-8 h-0.5 bg-gray-200 mr-4 hidden sm:block" />}
    </div>
  );

  const renderLockedBanner = () => (
      isIssued && (
          <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                  <div className="flex-shrink-0">
                      <Lock className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                      <p className="text-sm text-yellow-700 font-bold">Policy Issued</p>
                      <p className="text-sm text-yellow-700 mt-1">This policy has been issued. Editing functionality is disabled.</p>
                  </div>
              </div>
          </div>
      )
  );

  // --- COMPARISON VIEW COMPONENT ---
  const renderComparisonView = () => {
    if (plans.length === 0) return null;
    
    // Define all possible features/benefits
    const allFeatures = [
      { id: 'thirdPartyBodyInjury', label: 'Third Party Bodily Injury', icon: '🚑' },
      { id: 'thirdPartyPropertyDamage', label: 'Third Party Property Damage', icon: '🏢' },
      { id: 'lossOrDamage', label: 'Loss or Damage of Vehicle', icon: '🚗' },
      { id: 'roadAssist', label: 'Road Assist Cover', icon: '🔧' },
      { id: 'agencyRepair', label: 'Agency Repair', icon: '🏭' },
      { id: 'emergencyTreatment', label: 'Emergency Treatment Cover', icon: '⚕️' },
      { id: 'windowsCover', label: 'Windows Cover', icon: '🪟' },
      { id: 'carReplacement', label: 'Car Replacement Cover', icon: '🔄' },
      { id: 'naturalPerils', label: 'Natural Perils', icon: '🌪️' },
      { id: 'vip', label: 'VIP', icon: '⭐' },
      { id: 'personalAccident', label: 'Personal Accident Cover', icon: '👤' },
      { id: 'geographicExtension', label: 'Geographic Extension (GCC)', icon: '🗺️' },
      { id: 'offRoadCover', label: 'Off-Road Cover', icon: '🏔️' },
    ];
    
    // Map plan names to their features
    const getPlanFeatures = (planName: string) => {
      const name = planName.toLowerCase();
      if (name.includes('super') || name.includes('comprehensive plus')) {
        return {
          thirdPartyBodyInjury: true,
          thirdPartyPropertyDamage: true,
          lossOrDamage: true,
          roadAssist: true,
          agencyRepair: true,
          emergencyTreatment: true,
          windowsCover: true,
          carReplacement: true,
          naturalPerils: true,
          vip: true,
          personalAccident: true,
          geographicExtension: true,
          offRoadCover: true,
        };
      } else if (name.includes('economy') || name.includes('comprehensive')) {
        return {
          thirdPartyBodyInjury: true,
          thirdPartyPropertyDamage: true,
          lossOrDamage: true,
          roadAssist: true,
          agencyRepair: false,
          emergencyTreatment: true,
          windowsCover: true,
          carReplacement: false,
          naturalPerils: true,
          vip: false,
          personalAccident: false,
          geographicExtension: true,
          offRoadCover: false,
        };
      } else if (name.includes('third party') || name.includes('tpl')) {
        return {
          thirdPartyBodyInjury: true,
          thirdPartyPropertyDamage: true,
          lossOrDamage: false,
          roadAssist: false,
          agencyRepair: false,
          emergencyTreatment: false,
          windowsCover: false,
          carReplacement: false,
          naturalPerils: false,
          vip: false,
          personalAccident: false,
          geographicExtension: false,
          offRoadCover: false,
        };
      }
      return {};
    };
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 animate-in fade-in p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full my-8 animate-in zoom-in-95">
            {/* Header */}
            <div className="bg-gradient-to-r from-zain-600 to-zain-700 text-white p-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold mb-1">Compare Insurance Plans</h2>
                  <p className="text-zain-100 text-sm">Choose which is the best for you!</p>
                </div>
                <button
                  onClick={() => setIsCompareMode(false)}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                  aria-label="Close comparison mode"
                  title="Close comparison mode"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            {/* Comparison Table */}
            <div className="overflow-x-auto p-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left pb-4 pr-4 min-w-[200px]">
                      <span className="text-gray-400 text-sm font-normal">Features</span>
                    </th>
                    {plans.map((plan) => {
                      const discountMultiplier = appliedDiscount > 0 ? (1 - appliedDiscount / 100) : 1;
                      const discountedPremium = plan.basePremium * discountMultiplier;
                      const vat = discountedPremium * 0.1;
                      const total = discountedPremium + vat;
                      
                      return (
                        <th key={plan.id} className="pb-4 px-4 min-w-[180px]">
                          <div className={`rounded-xl p-4 ${currentQuote.selectedPlanId === plan.id ? 'bg-zain-50 border-2 border-zain-600' : 'bg-gray-50'}`}>
                            <div className="font-bold text-lg text-gray-900 mb-1">{plan.name}</div>
                            <div className="text-2xl font-bold text-zain-600 mb-2">BD {total.toFixed(3)}</div>
                            <button
                              onClick={() => { updateQuote({ selectedPlanId: plan.id }); setIsCompareMode(false); }}
                              className={`w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                                currentQuote.selectedPlanId === plan.id 
                                  ? 'bg-zain-600 text-white' 
                                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {currentQuote.selectedPlanId === plan.id ? '✓ Selected' : 'Select Plan'}
                            </button>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {allFeatures.map((feature, idx) => (
                    <tr key={feature.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{feature.icon}</span>
                          <span className="text-sm font-medium text-gray-700">{feature.label}</span>
                        </div>
                      </td>
                      {plans.map((plan) => {
                        const planFeatures = getPlanFeatures(plan.name);
                        const isIncluded = planFeatures[feature.id as keyof typeof planFeatures];
                        
                        return (
                          <td key={plan.id} className="py-4 px-4 text-center">
                            {isIncluded ? (
                              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
                                <Check className="w-5 h-5 text-green-600" />
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100">
                                <XCircle className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Footer */}
            <div className="bg-gray-50 p-6 rounded-b-2xl border-t border-gray-200">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  All prices include 10% VAT
                </p>
                <button
                  onClick={() => setIsCompareMode(false)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors"
                >
                  Close Comparison
                </button>
              </div>
            </div>
          </div>
        </div>
    );
  };

  // ... Step 1 Logic ...
  if (step === 1) {
    const isNewCustomer = currentQuote.customer?.type === CustomerType.NEW;
    return (
        <div className="max-w-4xl mx-auto pb-20">
            {renderStepIndicator()}
            {renderLockedBanner()}
            <Card>
                <CardBody className="space-y-6">
                    <h2 className="text-xl font-bold text-gray-900">Step 1: Customer & Insurance Type</h2>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-3">Select Insurance Type</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                          {[
                              { id: InsuranceType.MOTOR, label: 'Motor', icon: Car, disabled: false },
                              { id: InsuranceType.TRAVEL, label: 'Travel', icon: Plane, disabled: false },
                              { id: InsuranceType.HEALTH, label: 'Health', icon: Activity, disabled: true },
                              { id: InsuranceType.LIFE, label: 'Life', icon: Heart, disabled: true },
                              { id: InsuranceType.HOME, label: 'Home', icon: Home, disabled: true },
                              { id: InsuranceType.CYBER, label: 'Cyber', icon: Monitor, disabled: true },
                              { id: InsuranceType.PERSONAL_ACCIDENT, label: 'P. Accident', icon: Umbrella, disabled: true },
                          ].map((type) => (
                              <button
                                  key={type.id}
                                  disabled={type.disabled || isIssued}
                                  onClick={() => updateQuote({ insuranceType: type.id })}
                                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all h-24
                                  ${currentQuote.insuranceType === type.id
                                      ? 'border-zain-600 bg-zain-50 text-zain-700'
                                      : (type.disabled || isIssued)
                                      ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60'
                                      : 'border-gray-200 hover:border-zain-200 hover:bg-white text-gray-600'
                                  }
                                  `}
                              >
                                  <type.icon className={`w-6 h-6 mb-2 ${currentQuote.insuranceType === type.id ? 'text-zain-600' : 'text-gray-400'}`} />
                                  <span className="text-xs font-bold text-center leading-tight">{type.label}</span>
                              </button>
                          ))}
                      </div>
                    </div>
                    <div className="flex gap-4 border-t border-gray-100 pt-6">
                      <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Search by CPR / Subscriber ID</label>
                          <div className="relative">
                              <input 
                                  type="text" value={searchCpr} onChange={(e) => setSearchCpr(e.target.value)}
                                  disabled={isIssued}
                                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zain-500"
                                  placeholder="e.g. 850101123"
                              />
                              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                          </div>
                      </div>
                      <button 
                          onClick={handleCustomerSearch} 
                          disabled={loading || !searchCpr || isIssued} 
                          className="mt-6 px-6 py-2 bg-zain-600 text-white rounded-lg hover:bg-zain-700 font-medium h-10 disabled:opacity-50"
                      >
                          {loading ? <Loader2 className="animate-spin" /> : 'Search'}
                      </button>
                    </div>
                    {loading ? (
                        <div className="space-y-4 animate-pulse pt-4">
                            <Skeleton className="h-8 w-1/3" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                    ) : showSubscriberInput ? (
                        <div className="p-6 rounded-lg border border-amber-200 bg-amber-50 animate-in fade-in">
                            <div className="flex items-start gap-3 mb-4">
                                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                                <div>
                                    <h3 className="font-semibold text-lg text-gray-900">New Customer</h3>
                                    <p className="text-sm text-gray-600 mt-1">CPR: <span className="font-mono font-semibold">{searchCpr}</span> - Please enter the Zain Subscriber details to check eligibility.</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                                        <input 
                                            type="text" 
                                            value={tempFullName} 
                                            onChange={(e) => setTempFullName(e.target.value)}
                                            onBlur={updateTempDataToDraft}
                                            disabled={isIssued}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zain-500"
                                            placeholder="e.g. Ahmed Al-Khalifa"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                                        <input 
                                            type="tel" 
                                            value={tempPhoneNumber} 
                                            onChange={(e) => setTempPhoneNumber(e.target.value)}
                                            onBlur={updateTempDataToDraft}
                                            disabled={isIssued}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zain-500"
                                            placeholder="e.g. 39123456"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                                        <input 
                                            type="email" 
                                            value={tempEmail} 
                                            onChange={(e) => setTempEmail(e.target.value)}
                                            onBlur={updateTempDataToDraft}
                                            disabled={isIssued}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zain-500"
                                            placeholder="e.g. ahmed@example.com"
                                        />
                                    </div>
                                    {currentQuote.insuranceType !== InsuranceType.TRAVEL && (
                                      <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number/Plate <span className="text-red-500">*</span></label>
                                          <input 
                                              type="text" 
                                              value={tempVehicleNumber} 
                                              onChange={(e) => setTempVehicleNumber(e.target.value)}
                                              onBlur={updateTempDataToDraft}
                                              disabled={isIssued}
                                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zain-500"
                                              placeholder="e.g. 123456"
                                          />
                                      </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Zain Subscriber Number <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            value={subscriberNumber} 
                                            onChange={(e) => setSubscriberNumber(e.target.value)}
                                            onBlur={updateTempDataToDraft}
                                            disabled={isIssued}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zain-500"
                                            placeholder="e.g. 39123456"
                                        />
                                        <Smartphone className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4 items-center mt-4">
                                <button 
                                    onClick={handleSubscriberEligibilityCheck} 
                                    disabled={loading || !subscriberNumber || !tempFullName || !tempPhoneNumber || !tempEmail || (currentQuote.insuranceType !== InsuranceType.TRAVEL && !tempVehicleNumber) || isIssued} 
                                    className="px-6 py-2 bg-zain-600 text-white rounded-lg hover:bg-zain-700 font-medium h-10 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <><Check className="w-4 h-4" /> Check Eligibility</>}
                                </button>
                                <button 
                                    onClick={() => { setShowSubscriberInput(false); setSearchCpr(''); setTempFullName(''); setTempPhoneNumber(''); setTempEmail(''); setTempVehicleNumber(''); setSubscriberNumber(''); }}
                                    className="text-sm text-gray-600 hover:text-gray-800 underline"
                                >
                                    Search with different CPR
                                </button>
                            </div>
                        </div>
                    ) : currentQuote.customer?.cpr ? (
                        <div className={`p-6 rounded-lg border animate-in fade-in ${isNewCustomer ? 'bg-blue-50 border-blue-100' : 'bg-green-50 border-green-100'}`}>
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-semibold text-lg text-gray-900">Customer Details</h3>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${isNewCustomer ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                    {isNewCustomer ? 'NEW CUSTOMER' : 'EXISTING CUSTOMER'}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Full Name</label>
                                    {isNewCustomer ? (
                                        <input 
                                            type="text" 
                                            value={currentQuote.customer.fullName}
                                            onChange={(e) => handleManualCustomerUpdate('fullName', e.target.value)}
                                            placeholder="Enter Full Name"
                                            className="w-full p-2 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-zain-500"
                                        />
                                    ) : (
                                        <div className="font-medium text-lg">{currentQuote.customer.fullName}</div>
                                    )}
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Mobile Number</label>
                                    {isNewCustomer ? (
                                        <input 
                                            type="text" 
                                            value={currentQuote.customer.mobile}
                                            onChange={(e) => handleManualCustomerUpdate('mobile', e.target.value)}
                                            placeholder="973XXXXXXX"
                                            className="w-full p-2 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-zain-500"
                                        />
                                    ) : (
                                        <div className="font-medium text-lg">{currentQuote.customer.mobile}</div>
                                    )}
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 mb-1 block">Email Address</label>
                                    {isNewCustomer ? (
                                        <input 
                                            type="email" 
                                            value={currentQuote.customer.email}
                                            onChange={(e) => handleManualCustomerUpdate('email', e.target.value)}
                                            placeholder="email@example.com"
                                            className="w-full p-2 border border-gray-300 rounded bg-white focus:ring-2 focus:ring-zain-500"
                                        />
                                    ) : (
                                        <div className="font-medium text-gray-700">{currentQuote.customer.email || '-'}</div>
                                    )}
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button 
                                    onClick={handleStep1Next} 
                                    disabled={loading || (isNewCustomer && (!currentQuote.customer.fullName || !currentQuote.customer.mobile))}
                                    className="flex items-center px-6 py-2 bg-zain-600 text-white rounded-lg hover:bg-zain-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : <>Next Step <ChevronRight className="w-4 h-4 ml-2" /></>}
                                </button>
                            </div>
                        </div>
                    ) : null}
                </CardBody>
            </Card>
            
            {/* Draft Application Popup - Step 1 */}
            {showDraftPopup && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-in fade-in">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-in zoom-in-95">
                  <div className="p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="flex-shrink-0">
                        <AlertCircle className="w-6 h-6 text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Draft Application Found</h3>
                        <p className="text-sm text-gray-600">{draftMessage}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-3 mt-6">
                      <button
                        onClick={handleContinueDraft}
                        disabled={loading}
                        className="w-full px-4 py-3 bg-zain-600 text-white rounded-lg hover:bg-zain-700 font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Check className="w-5 h-5" />}
                        Continue with Draft
                      </button>
                      <button
                        onClick={handleStartNewApplication}
                        disabled={loading}
                        className="w-full px-4 py-3 bg-white text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        Start New Application
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
        </div>
    );
  }

  if (step === 2) {
      const isMotor = currentQuote.insuranceType === InsuranceType.MOTOR;
      const isTravel = currentQuote.insuranceType === InsuranceType.TRAVEL;
      
      if (isTravel) {
        // Travel Insurance - Step 2: Travel Details
        return (
          <div className="max-w-4xl mx-auto pb-20">
            {renderStepIndicator()}
            {renderLockedBanner()}
            <Card>
              <CardBody className="space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Travel Details</h2>
                  <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">Travel Insurance</span>
                </div>
                
                {/* Individual/Family Toggle */}
                <div>
                  <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => updateQuote({ travelType: TravelType.INDIVIDUAL })}
                      disabled={isIssued}
                      className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
                        currentQuote.travelType === TravelType.INDIVIDUAL
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {currentQuote.travelType === TravelType.INDIVIDUAL && <Check className="w-4 h-4 inline mr-2" />}
                      Individual
                    </button>
                    <button
                      type="button"
                      onClick={() => updateQuote({ travelType: TravelType.FAMILY })}
                      disabled={isIssued}
                      className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
                        currentQuote.travelType === TravelType.FAMILY
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {currentQuote.travelType === TravelType.FAMILY && <Check className="w-4 h-4 inline mr-2" />}
                      Family
                    </button>
                  </div>
                </div>
                
                {/* Traveling From */}
                <div>
                  <h4 className="text-base font-semibold text-gray-900 mb-2">Traveling</h4>
                  <p className="text-gray-700">From Bahrain</p>
                </div>
                
                {/* Travel Destination */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Travel Destination</label>
                  <select
                    value={currentQuote.destination || ''}
                    onChange={(e) => updateQuote({ destination: e.target.value as TravelDestination })}
                    disabled={isIssued}
                    aria-label="Travel Destination"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zain-500 focus:border-zain-500"
                  >
                    <option value="">Select destination</option>
                    <option value={TravelDestination.WORLDWIDE}>Worldwide</option>
                    <option value={TravelDestination.WORLDWIDE_EXCLUDING_USA_CANADA}>Worldwide excluding USA and Canada</option>
                    <option value={TravelDestination.SCHENGEN}>Schengen</option>
                  </select>
                </div>
                
                {/* Departure and Return Dates */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Departure Date - Return Date</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="date"
                      value={currentQuote.departureDate || ''}
                      onChange={(e) => updateQuote({ departureDate: e.target.value })}
                      disabled={isIssued}
                      min={new Date().toISOString().split('T')[0]}
                      aria-label="Departure Date"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zain-500 focus:border-zain-500"
                      placeholder="Departure Date"
                    />
                    <input
                      type="date"
                      value={currentQuote.returnDate || ''}
                      onChange={(e) => updateQuote({ returnDate: e.target.value })}
                      disabled={isIssued}
                      min={currentQuote.departureDate || new Date().toISOString().split('T')[0]}
                      aria-label="Return Date"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zain-500 focus:border-zain-500"
                      placeholder="Return Date"
                    />
                  </div>
                </div>
                
                {/* Travelers */}
                <div>
                  <h4 className="text-base font-semibold text-gray-900 mb-3">Travelers</h4>
                  
                  {currentQuote.travelType === TravelType.INDIVIDUAL ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                      <input
                        type="date"
                        value={currentQuote.individualDob || ''}
                        onChange={(e) => updateQuote({ individualDob: e.target.value })}
                        disabled={isIssued}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zain-500 focus:border-zain-500"
                        placeholder="Date of Birth"
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Number of Adults</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={currentQuote.adultsCount || 1}
                            onChange={(e) => updateQuote({ adultsCount: parseInt(e.target.value) })}
                            disabled={isIssued}
                            aria-label="Number of Adults"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zain-500 focus:border-zain-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Number of Children</label>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={currentQuote.childrenCount || 0}
                            onChange={(e) => updateQuote({ childrenCount: parseInt(e.target.value) })}
                            disabled={isIssued}
                            aria-label="Number of Children"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zain-500 focus:border-zain-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Navigation Buttons */}
                <div className="flex flex-col gap-3 pt-4">
                  <button
                    onClick={async () => {
                      // Validate required fields
                      if (!currentQuote.destination || !currentQuote.departureDate || !currentQuote.returnDate) {
                        alert('Please fill in all travel details');
                        return;
                      }
                      
                      if (currentQuote.travelType === TravelType.INDIVIDUAL && !currentQuote.individualDob) {
                        alert('Please enter traveler date of birth');
                        return;
                      }
                      
                      setLoading(true);
                      try {
                        // Save travel details
                        await persistDraft({
                          destination: currentQuote.destination,
                          departureDate: currentQuote.departureDate,
                          returnDate: currentQuote.returnDate,
                          travelType: currentQuote.travelType,
                          individualDob: currentQuote.individualDob,
                          adultsCount: currentQuote.adultsCount,
                          childrenCount: currentQuote.childrenCount
                        });
                        
                        // Move to step 3 (Plan Selection)
                        setStep(3);
                      } catch (error) {
                        console.error('Error saving travel details:', error);
                        alert('Failed to save travel details');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading || isIssued}
                    className="w-full px-6 py-4 bg-gradient-to-r from-zain-600 to-zain-700 text-white rounded-xl hover:from-zain-700 hover:to-zain-800 font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Next'}
                  </button>
                  <button
                    onClick={() => setStep(1)}
                    disabled={loading}
                    className="w-full px-6 py-3 bg-white text-gray-700 border-2 border-gray-300 rounded-xl hover:bg-gray-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Back
                  </button>
                </div>
              </CardBody>
            </Card>
          </div>
        );
      }
      
      // Motor Insurance - Step 2: Vehicle Details
      return (
          <div className="max-w-4xl mx-auto pb-20">
              {renderStepIndicator()}
              {renderLockedBanner()}
              <Card>
                  <CardBody className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-900">
                            Step 2: Vehicle & Policy Details
                        </h2>
                        <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">{currentQuote.insuranceType}</span>
                      </div>
                      
                      {isMotor && (
                        <>
                          <div className="bg-gradient-to-r from-zain-600 to-zain-700 text-white p-4 rounded-lg mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Car className="w-6 h-6" />
                              <div>
                                <div className="text-xs opacity-80">Vehicle Plate Number</div>
                                <div className="text-xl font-bold">{searchPlate || 'Not Set'}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {vehicleDataResult?.success && (
                                <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">
                                  ✓ Data Loaded
                                </div>
                              )}
                              {/* Debug: Show current form values */}
                              {vehicleDataResult?.motorData && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentValues = getMotorValues();
                                    console.log('[DEBUG] Current form values:', currentValues);
                                    console.log('[DEBUG] Stored motor data:', vehicleDataResult.motorData);
                                  }}
                                  className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs font-medium"
                                >
                                  Debug Form
                                </button>
                              )}
                            </div>
                          </div>
                          
                          {loading && !vehicleDataResult ? (
                            <div className="text-center py-8">
                              <Loader2 className="w-8 h-8 animate-spin mx-auto text-zain-600 mb-2" />
                              <p className="text-sm text-gray-600">Fetching vehicle information...</p>
                            </div>
                          ) : null}
                          
                          <form onSubmit={handleMotorSubmit(onMotorFormSubmit)}>
                               {/* Vehicle Specifications */}
                               <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4 space-y-4">
                                   <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">Vehicle Specifications</h4>
                                   
                                   {/* Vehicle Type */}
                                   <div>
                                       <label className="text-xs text-gray-500 mb-1 block">Vehicle Type</label>
                                       <select {...registerMotor('vehicleType')} disabled={isIssued} className="w-full p-2 border border-gray-300 rounded">
                                           {availableVehicleTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                       </select>
                                   </div>
                                   
                                   {/* Chassis Number */}
                                   <div>
                                       <label className="text-xs text-gray-500 mb-1 block">Chassis Number</label>
                                       <input 
                                           type="text" 
                                           {...registerMotor('chassisNumber')} 
                                           disabled={isIssued} 
                                           className="w-full p-2 border border-gray-300 rounded"
                                           placeholder="e.g. W1N4M4HB9MW104744"
                                       />
                                   </div>
                                   
                                   {/* Model Year */}
                                   <div>
                                       <label className="text-xs text-gray-500 mb-1 block">Model Year</label>
                                       <select {...registerMotor('year')} disabled={isIssued} className="w-full p-2 border border-gray-300 rounded">
                                           {yearList.map(y => <option key={y} value={y}>{y}</option>)}
                                       </select>
                                   </div>
                                   
                                   {/* Make and Model in one row */}
                                   <div className="grid grid-cols-2 gap-4">
                                       <div>
                                           <label className="text-xs text-gray-500 mb-1 block">Make</label>
                                           <select {...registerMotor('make')} disabled={isIssued} className={`w-full p-2 border rounded ${motorErrors.make ? 'border-red-500' : 'border-gray-300'}`}>
                                               <option value="">Select Make</option>
                                               {availableMakes.map(m => <option key={m} value={m}>{m}</option>)}
                                           </select>
                                           {motorErrors.make && <span className="text-xs text-red-500">{motorErrors.make.message}</span>}
                                       </div>
                                       <div>
                                           <label className="text-xs text-gray-500 mb-1 block">Model</label>
                                           <select {...registerMotor('model')} disabled={!selectedMake || isLoadingModels || isIssued} className="w-full p-2 border border-gray-300 rounded">
                                               <option value="">Select Model</option>
                                               {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                                           </select>
                                           {motorErrors.model && <span className="text-xs text-red-500">{motorErrors.model.message}</span>}
                                       </div>
                                   </div>
                                   
                                   {/* Body Type */}
                                   <div>
                                       <label className="text-xs text-gray-500 mb-1 block">Body Type</label>
                                       <select {...registerMotor('bodyType')} disabled={isIssued} className="w-full p-2 border border-gray-300 rounded">
                                           {availableBodyTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                       </select>
                                   </div>
                                   
                                   {/* CC/HP */}
                                   <div>
                                       <label className="text-xs text-gray-500 mb-1 block">CC/HP</label>
                                       <input 
                                           type="text" 
                                           {...registerMotor('ccHp')} 
                                           placeholder="e.g. 2500" 
                                           disabled={isIssued} 
                                           className="w-full p-2 border border-gray-300 rounded" 
                                       />
                                       <div className="mt-1 flex items-start gap-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                                           <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                           <span>CC/HP is mentioned in Car Ownership Card</span>
                                       </div>
                                   </div>
                               </div>

                               {/* Registration Month Section */}
                               <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4 space-y-4">
                                   <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">Registration Month</h4>
                                   <div>
                                       <label className="text-xs text-gray-500 mb-1 block">Registration Month</label>
                                       <select {...registerMotor('registrationMonth')} disabled={isIssued} className="w-full p-2 border border-gray-300 rounded">
                                           <option value="">Select Month</option>
                                           {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                                       </select>
                                   </div>
                               </div>

                               {/* Policy Details & Additional Info */}
                               <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4 space-y-4">
                                   <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b border-gray-200 pb-2">Policy Details</h4>
                                   <div>
                                       <label className="text-xs text-gray-500 mb-1 block">Policy Start Date</label>
                                       <input type="date" {...registerMotor('startDate')} disabled={isIssued} className="w-full p-2 border border-gray-300 rounded" />
                                       {motorErrors.startDate && <span className="text-xs text-red-500">{motorErrors.startDate.message}</span>}
                                   </div>
                                   <div>
                                       <label className="text-xs text-gray-500 mb-1 block">Policy End Date</label>
                                       <input type="date" {...registerMotor('policyEndDate')} disabled readOnly className="w-full p-2 border border-gray-200 bg-gray-100 rounded text-gray-500" />
                                   </div>

                                   <div className="flex flex-col md:flex-row gap-6 mt-4 pt-2">
                                       <label className="flex items-center gap-2 cursor-pointer">
                                           <input type="checkbox" {...registerMotor('isBrandNew')} disabled={isIssued} className="w-4 h-4 text-zain-600 rounded" />
                                           <span className="text-sm text-gray-700 font-medium">Brand New Vehicle?</span>
                                       </label>
                                       
                                       <div className="flex flex-col gap-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" {...registerMotor('hasExistingInsurance')} disabled={isIssued} className="w-4 h-4 text-zain-600 rounded" />
                                                <span className="text-sm text-gray-700 font-medium">Current Insurance exists?</span>
                                            </label>
                                            
                                            {hasExistingInsurance && (
                                                <div className="animate-in slide-in-from-top-2 ml-6">
                                                    <label className="text-xs text-gray-500 mb-1 block">Current Policy Expiry</label>
                                                    <input type="date" {...registerMotor('existingPolicyExpiry')} disabled={isIssued} className="p-2 text-sm border border-gray-300 rounded w-48" />
                                                </div>
                                            )}
                                       </div>
                                   </div>
                               </div>

                               {/* Risk Assessment */}
                               <div className="bg-red-50 p-4 rounded-lg border border-red-100 mt-4">
                                   <div className="flex items-center gap-2 mb-3 border-b border-red-200 pb-2">
                                       <AlertCircle className="w-4 h-4 text-red-600" />
                                       <h4 className="text-sm font-bold text-red-800 uppercase tracking-wide">Risk Assessment</h4>
                                   </div>
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                       <div className="flex items-center justify-between bg-white p-3 rounded border border-red-100">
                                           <span className="text-sm font-medium text-gray-700">Driver Age under 24?</span>
                                           <label className="relative inline-flex items-center cursor-pointer">
                                               <input type="checkbox" {...registerMotor('ageUnder24')} disabled={isIssued} className="sr-only peer" />
                                               <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                           </label>
                                       </div>
                                       <div className="flex items-center justify-between bg-white p-3 rounded border border-red-100">
                                           <span className="text-sm font-medium text-gray-700">License held less than 1 year?</span>
                                           <label className="relative inline-flex items-center cursor-pointer">
                                               <input type="checkbox" {...registerMotor('licenseUnder1Year')} disabled={isIssued} className="sr-only peer" />
                                               <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                           </label>
                                       </div>
                                   </div>
                               </div>

                              <div className="mt-8 flex justify-between">
                                  <button type="button" onClick={() => setStep(1)} className="text-gray-500 hover:text-gray-700 flex items-center">
                                      <ArrowLeft className="w-4 h-4 mr-1" /> Back to Customer
                                  </button>
                                  <button type="submit" disabled={isIssued || loading} className="px-6 py-2 bg-zain-600 text-white rounded-lg hover:bg-zain-700 shadow-md flex items-center">
                                      {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Get Quotes'}
                                  </button>
                              </div>
                          </form>
                        </>
                      )}
                      {isTravel && (
                        <form onSubmit={handleTravelSubmit(onTravelFormSubmit)}>
                             {/* ... Travel Fields ... */}
                             <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                                <p className="text-sm text-gray-500 text-center">Travel form (simplified view)</p>
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700">Destination</label>
                                    <select {...registerTravel('destination')} className="w-full p-2 border rounded">
                                        <option value={TravelDestination.WORLDWIDE}>Worldwide</option>
                                    </select>
                                </div>
                             </div>
                             <div className="mt-8 flex justify-between">
                                  <button type="button" onClick={() => setStep(1)} className="text-gray-500">Back</button>
                                  <button type="submit" disabled={isIssued} className="px-6 py-2 bg-zain-600 text-white rounded-lg">Get Quotes</button>
                             </div>
                        </form>
                      )}
                  </CardBody>
              </Card>
          </div>
      );
  }

  // --- STEP 3 RENDER ---
  
  // For Travel Insurance, show Travel-specific plan selection
  if (currentQuote.insuranceType === InsuranceType.TRAVEL) {
    return (
      <div className="max-w-6xl mx-auto pb-20">
        {renderStepIndicator()}
        {renderLockedBanner()}
        <Card>
          <CardBody className="space-y-6">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Select Your Plan</h2>
                <button onClick={() => setStep(2)} className="text-xs text-gray-500 hover:text-zain-600 flex items-center mt-1">
                  <ArrowLeft className="w-3 h-3 mr-1" /> Back to Travel Details
                </button>
              </div>
            </div>
            
            {loadingPlans ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-zain-600 mb-2" />
                <p className="text-sm text-gray-600">Loading travel plans...</p>
              </div>
            ) : travelPlans.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600">No plans available for your travel details</p>
                <button onClick={() => setStep(2)} className="mt-4 text-zain-600 font-medium">Modify Travel Details</button>
              </div>
            ) : (
              <div className="space-y-6">
                {travelPlans.map((plan) => (
                  <div key={plan.id} className="bg-gradient-to-br from-zain-600 to-zain-700 rounded-2xl p-6 text-white">
                    {/* Plan Header */}
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                          <Plane className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold">{plan.name}</h3>
                          <p className="text-sm text-white/80">Policy Amount</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">BHD {plan.policyAmount.toFixed(3)}</p>
                        <p className="text-xs text-white/80">per VAT</p>
                      </div>
                    </div>
                    
                    {/* Plan Benefits */}
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4">
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Info className="w-4 h-4" /> Plan Benefits
                      </h4>
                      <ul className="space-y-2">
                        {plan.benefits.map((benefit: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-300" />
                            <span className="text-white/90">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {/* Add-ons (Optional) */}
                    {plan.addons && plan.addons.length > 0 && (
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-4">
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Info className="w-4 h-4" /> Select add-ons (Optional)
                        </h4>
                        <div className="space-y-2">
                          {plan.addons.map((addon: any) => (
                            <label key={addon.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 cursor-pointer">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={selectedAddons.includes(addon.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedAddons([...selectedAddons, addon.id]);
                                    } else {
                                      setSelectedAddons(selectedAddons.filter(id => id !== addon.id));
                                    }
                                  }}
                                  disabled={isIssued}
                                  className="w-4 h-4 rounded border-white/30"
                                />
                                <span className="text-sm text-white/90">{addon.name}</span>
                              </div>
                              <span className="text-sm font-semibold">BHD {addon.price.toFixed(3)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Select Plan Button */}
                    <button
                      onClick={() => {
                        setSelectedPlan(plan);
                        updateQuote({ 
                          selectedPlan: plan,
                          selectedPlanId: plan.id,
                          travelAddons: selectedAddons
                        });
                        // Move to next step or complete
                        alert(`Plan ${plan.name} selected! Implementation: Call updateTravelApplication API and proceed to payment.`);
                      }}
                      disabled={isIssued}
                      className="w-full py-4 bg-white text-zain-700 rounded-xl font-bold text-lg hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Select Plan
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }
  
  // Motor Insurance - Step 3: Plan Selection
  const approvalStatus = currentQuote.status;
  const isPendingApproval = approvalStatus === QuoteStatus.PENDING_APPROVAL;
  const isExceptionGranted = approvalStatus === QuoteStatus.APPROVAL_GRANTED;
  const isExceptionRejected = approvalStatus === QuoteStatus.APPROVAL_REJECTED;

  // Eligibility Logic
  const isNaturallyEligible = currentQuote.customer?.isEligibleForInstallments;
  const isEligibleForInstallment = isNaturallyEligible || isExceptionGranted;
  
  const paymentMethod = currentQuote.paymentMethod || PaymentMethod.CASH;
  const isInstallmentSelected = paymentMethod === PaymentMethod.INSTALLMENT;

  return (
      <div className="max-w-6xl mx-auto pb-20">
          {renderStepIndicator()}
          {renderLockedBanner()}
          <Card>
              <CardBody className="space-y-6">
                  {policyIssued ? (
                       <div className="text-center py-12 animate-in zoom-in-95">
                           <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                               <CheckCircle className="w-8 h-8" />
                           </div>
                           <h2 className="text-2xl font-bold text-gray-900 mb-2">Policy Issued!</h2>
                           <button onClick={onComplete} className="mt-4 text-zain-600 font-medium">Return to Dashboard</button>
                       </div>
                  ) : quoteSent ? (
                      <div className="text-center py-12">
                          <div className="flex flex-col items-center">
                               {paymentListenerActive ? (
                                   <div className="mb-4 relative">
                                       <div className="w-16 h-16 rounded-full border-4 border-zain-200 border-t-zain-600 animate-spin"></div>
                                       <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-zain-700">WAITING</div>
                                   </div>
                               ) : (
                                   <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4"><Check className="w-8 h-8" /></div>
                               )}
                               <h2 className="text-xl font-bold text-gray-900">Payment Link Sent</h2>
                          </div>
                      </div>
                  ) : exceptionSent ? (
                      <div className="text-center py-12 animate-in fade-in">
                          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                              <ShieldAlert className="w-8 h-8" />
                          </div>
                          <h2 className="text-xl font-bold text-gray-900">Exception Request Sent</h2>
                          <p className="text-gray-500 mt-2">The approval request has been forwarded to the supervisor/credit control inbox.</p>
                          <button onClick={onComplete} className="mt-6 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors">Return to Dashboard</button>
                      </div>
                  ) : (
                      <>
                          <div className="flex justify-between items-center mb-2">
                              <div>
                                  <h2 className="text-xl font-bold text-gray-900">Select Plan</h2>
                                  <button onClick={() => setStep(2)} className="text-xs text-gray-500 hover:text-zain-600 flex items-center mt-1">
                                      <ArrowLeft className="w-3 h-3 mr-1" /> Back to Details
                                  </button>
                              </div>
                              <div className="flex gap-2">
                                  <button 
                                      onClick={() => setIsCompareMode(!isCompareMode)}
                                      className={`flex items-center px-3 py-1.5 rounded text-sm font-medium border transition-colors ${isCompareMode ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-600 border-gray-300'}`}
                                  >
                                      {isCompareMode ? <LayoutGrid className="w-4 h-4 mr-2" /> : <Table className="w-4 h-4 mr-2" />}
                                      {isCompareMode ? 'Cards View' : 'Compare Plans'}
                                  </button>
                              </div>
                          </div>

                          {/* Payment Eligibility Banner / Selector */}
                          <div className="space-y-3 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                            <h4 className="text-sm font-bold text-gray-700">Choose Payment Method to view pricing:</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Cash / Full Payment Option */}
                                <div 
                                    onClick={() => !isIssued && updateQuote({ paymentMethod: PaymentMethod.CASH })}
                                    className={`cursor-pointer border-2 rounded-xl p-4 flex items-center gap-3 transition-all ${paymentMethod === PaymentMethod.CASH ? 'border-zain-600 bg-white ring-2 ring-zain-100' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                                >
                                    <div className={`p-2 rounded-full ${paymentMethod === PaymentMethod.CASH ? 'bg-zain-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                        <Banknote className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">Pay Full Amount</p>
                                        <p className="text-xs text-gray-500">Credit/Debit Card</p>
                                    </div>
                                    {paymentMethod === PaymentMethod.CASH && <CheckCircle className="ml-auto w-5 h-5 text-zain-600" />}
                                </div>

                                {/* Installment Option */}
                                <div 
                                    onClick={() => {
                                        if (!isIssued) {
                                            updateQuote({ paymentMethod: PaymentMethod.INSTALLMENT });
                                        }
                                    }}
                                    className={`relative border-2 rounded-xl p-4 flex flex-col justify-center transition-all min-h-[88px]
                                        ${paymentMethod === PaymentMethod.INSTALLMENT ? 'border-zain-600 bg-white ring-2 ring-zain-100' : 'border-gray-200 bg-white'}
                                        ${(!isEligibleForInstallment) ? 'border-red-200 bg-red-50' : 'cursor-pointer hover:border-gray-300'}
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${paymentMethod === PaymentMethod.INSTALLMENT ? 'bg-zain-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                            <CreditCard className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <p className={`font-bold flex items-center gap-2 ${!isEligibleForInstallment ? 'text-gray-400' : 'text-gray-900'}`}>
                                                Pay Monthly 
                                                {isExceptionGranted && <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full uppercase">Exception Granted</span>}
                                                {(!isEligibleForInstallment && !isPendingApproval && !isExceptionRejected) && <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full uppercase">Not Eligible</span>}
                                            </p>
                                            <p className="text-xs text-gray-500">Add to Zain Bill (12 Months)</p>
                                        </div>
                                        {paymentMethod === PaymentMethod.INSTALLMENT && <CheckCircle className="ml-auto w-5 h-5 text-zain-600" />}
                                    </div>

                                    {/* Warnings if Ineligible */}
                                    {(!isNaturallyEligible && !isExceptionGranted) && (
                                        <div className="mt-3 pt-3 border-t border-red-100 w-full">
                                            {isPendingApproval ? (
                                                <div className="flex items-center text-amber-600 text-xs font-bold gap-2">
                                                    <Loader2 className="w-4 h-4 animate-spin" /> Approval Pending...
                                                </div>
                                            ) : isExceptionRejected ? (
                                                <div className="flex items-center text-red-600 text-xs font-bold gap-2">
                                                    <XCircle className="w-4 h-4" /> Request Rejected
                                                </div>
                                            ) : (
                                                <div className="w-full">
                                                    <div className="flex items-center gap-2 text-xs text-red-500 font-medium mb-1">
                                                        <ShieldAlert className="w-3 h-3" />
                                                        <span>Credit Check Failed</span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-500">
                                                        You can view prices, but must request an exception to proceed. Select a plan below to enable request.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                          </div>

                          {loading ? (
                               <div className="grid grid-cols-3 gap-4">
                                   <Skeleton className="h-64 rounded-xl" />
                                   <Skeleton className="h-64 rounded-xl" />
                                   <Skeleton className="h-64 rounded-xl" />
                               </div>
                          ) : (
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {plans.map((plan) => {
                                      const discountMultiplier = appliedDiscount > 0 ? (1 - appliedDiscount / 100) : 1;
                                      const discountedPremium = plan.basePremium * discountMultiplier;
                                      const vat = discountedPremium * 0.1;
                                      const total = discountedPremium + vat;
                                      const monthly = discountedPremium / 12;
                                      const upfront = vat; // Upfront is VAT for installment
                                      const originalTotal = plan.basePremium + (plan.basePremium * 0.1);
                                      
                                      return (
                                      <div 
                                          key={plan.id}
                                          onClick={() => {
                                              if (!isIssued) {
                                                  updateQuote({ selectedPlanId: plan.id });
                                              }
                                          }}
                                          className={`relative border-2 rounded-xl p-5 transition-all flex flex-col h-full
                                              ${currentQuote.selectedPlanId === plan.id 
                                                  ? 'border-zain-600 bg-zain-50 shadow-md ring-2 ring-zain-200' 
                                                  : 'border-gray-200 hover:border-zain-300 hover:shadow'}
                                              ${isIssued ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'} 
                                          `}
                                      >
                                          {currentQuote.selectedPlanId === plan.id && <div className="absolute top-3 right-3 text-zain-600"><CheckCircle className="w-6 h-6" /></div>}
                                          {appliedDiscount > 0 && (
                                              <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                                                  -{appliedDiscount}%
                                              </div>
                                          )}
                                          
                                          {/* Plan Name */}
                                          <h3 className="text-xl font-bold text-gray-900 mb-4">{plan.name}</h3>
                                          
                                          {/* Policy Price Section */}
                                          <div className="mb-3">
                                              <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Policy Price</div>
                                              <div className="flex items-baseline">
                                                  <span className="text-sm text-gray-600 font-bold mr-2">BD</span>
                                                  <span className="text-3xl font-extrabold text-gray-900">{total.toFixed(3)}</span>
                                              </div>
                                              <div className="text-xs text-gray-500 mt-1">(VAT inc.)</div>
                                              {appliedDiscount > 0 && (
                                                  <div className="text-xs text-gray-400 line-through mt-1">
                                                      BD {originalTotal.toFixed(3)}
                                                  </div>
                                              )}
                                          </div>

                                          {/* Upfront Section */}
                                          <div className="mb-3">
                                              <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Upfront</div>
                                              <div className="flex items-baseline">
                                                  <span className="text-sm text-gray-600 font-bold mr-2">BD</span>
                                                  <span className="text-2xl font-bold text-gray-900">{upfront.toFixed(3)}</span>
                                              </div>
                                              <div className="text-xs text-gray-500 mt-1">(VAT inc.)</div>
                                          </div>

                                          {/* Installment Price Section */}
                                          <div className="mb-4 pb-4 border-b border-gray-200">
                                              <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Installment Price</div>
                                              <div className="flex items-baseline">
                                                  <span className="text-sm text-gray-600 font-bold mr-2">BD</span>
                                                  <span className="text-2xl font-bold text-gray-900">{monthly.toFixed(3)}</span>
                                                  <span className="text-xs text-gray-500 ml-2">Month</span>
                                              </div>
                                          </div>

                                          {/* Plan Benefits */}
                                          <div className="mb-4 flex-1">
                                              <div className="text-xs font-semibold text-gray-700 uppercase mb-2">Plan benefits</div>
                                              <ul className="text-sm space-y-1.5">
                                                  {plan.features.map((feature, idx) => (
                                                      <li key={idx} className="flex items-start text-gray-700">
                                                          <Check className="w-4 h-4 mr-2 text-green-600 shrink-0 mt-0.5" /> 
                                                          <span>{feature}</span>
                                                      </li>
                                                  ))}
                                              </ul>
                                          </div>

                                          {/* Select Plan Button */}
                                          <button
                                              onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (!isIssued) {
                                                      updateQuote({ selectedPlanId: plan.id });
                                                  }
                                              }}
                                              disabled={isIssued}
                                              className={`w-full py-2.5 rounded-lg font-bold text-sm transition-all
                                                  ${currentQuote.selectedPlanId === plan.id 
                                                      ? 'bg-zain-600 text-white shadow-md' 
                                                      : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-zain-400'}
                                                  ${isIssued ? 'opacity-50 cursor-not-allowed' : ''}
                                              `}
                                          >
                                              {currentQuote.selectedPlanId === plan.id ? 'Selected' : 'Select Plan'}
                                          </button>
                                      </div>
                                  )})}
                              </div>
                          )}

                          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mt-6">
                              <div className="flex flex-col md:flex-row gap-4 mb-4">
                                  {/* Discount Code Section */}
                                  <div className="flex-1">
                                      <label className="text-xs text-gray-500 block mb-1">Discount Code (Optional)</label>
                                      <div className="flex gap-2">
                                          <input 
                                            type="text" 
                                            value={discountCode} 
                                            onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                                            disabled={isIssued || appliedDiscount > 0}
                                            placeholder="Enter code"
                                            className="p-2 border rounded flex-1 uppercase font-mono"
                                          />
                                          {appliedDiscount > 0 ? (
                                              <button 
                                                onClick={handleRemoveDiscount}
                                                disabled={isIssued}
                                                className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 font-medium text-sm"
                                              >
                                                  Remove
                                              </button>
                                          ) : (
                                              <button 
                                                onClick={handleApplyDiscountCode}
                                                disabled={isIssued || !discountCode.trim()}
                                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 font-medium text-sm"
                                              >
                                                  Apply
                                              </button>
                                          )}
                                      </div>
                                      {discountError && (
                                          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                              <AlertCircle className="w-3 h-3" /> {discountError}
                                          </p>
                                      )}
                                      {discountSuccess && (
                                          <p className="text-xs text-green-600 mt-1 flex items-center gap-1 font-medium">
                                              <CheckCircle className="w-3 h-3" /> {discountSuccess}
                                          </p>
                                      )}
                                  </div>

                                  {/* Mobile for Payment Link */}
                                  <div className="flex-1">
                                      <label className="text-xs text-gray-500 block mb-1">Mobile for Payment Link</label>
                                      <input 
                                        type="text" 
                                        value={currentQuote.contactNumberForLink || ''} 
                                        onChange={(e) => updateQuote({ contactNumberForLink: e.target.value })}
                                        disabled={isIssued}
                                        placeholder="973XXXXXXX"
                                        className="p-2 border rounded w-full"
                                      />
                                  </div>
                              </div>

                              <div className="flex justify-between items-center">
                                  <div className="flex gap-3">
                                      {!isIssued && (
                                          <button 
                                              onClick={handleSaveAndExit}
                                              className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm flex items-center"
                                          >
                                              <Save className="w-4 h-4 mr-2" /> Save Draft & Exit
                                          </button>
                                      )}
                                  </div>

                                  {/* Conditional Action Buttons */}
                                  {isInstallmentSelected && !isEligibleForInstallment && !isPendingApproval && !isExceptionRejected ? (
                                      <button 
                                        onClick={handleRequestException}
                                        disabled={!currentQuote.selectedPlanId || requestingException}
                                        className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center shadow-sm"
                                      >
                                        {requestingException ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <ShieldAlert className="w-4 h-4 mr-2" />} 
                                        Request Exception
                                      </button>
                                  ) : (
                                      <button 
                                        onClick={handleSendLink}
                                        disabled={
                                            !currentQuote.selectedPlanId || 
                                            loading || 
                                            isIssued || 
                                            (isInstallmentSelected && isPendingApproval) ||
                                            (isInstallmentSelected && isExceptionRejected)
                                        }
                                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center shadow-sm"
                                      >
                                          {loading ? <Loader2 className="animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Send Link</>}
                                      </button>
                                  )}
                              </div>
                          </div>
                      </>
                  )}
              </CardBody>
          </Card>
          
          {/* Draft Application Popup */}
          {showDraftPopup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-in fade-in">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-in zoom-in-95">
                <div className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0">
                      <AlertCircle className="w-6 h-6 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">Draft Application Found</h3>
                      <p className="text-sm text-gray-600">{draftMessage}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3 mt-6">
                    <button
                      onClick={handleContinueDraft}
                      className="w-full px-4 py-3 bg-zain-600 text-white rounded-lg hover:bg-zain-700 font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <Check className="w-5 h-5" />
                      Continue with Draft
                    </button>
                    <button
                      onClick={handleStartNewApplication}
                      className="w-full px-4 py-3 bg-white text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <XCircle className="w-5 h-5" />
                      Start New Application
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Comparison Modal */}
          {isCompareMode && renderComparisonView()}
      </div>
  );
};
