/**
 * Zain Takaful API Integration
 * Real API endpoints for eligibility check, vehicle data, motor plans, and travel insurance
 */

const API_BASE_URL = 'https://giguatp.prosys.ai/api/v2';
const TRAVEL_API_BASE_URL = 'https://api.zaininsure.prosys.ai';

// BYPASS MODE - Set to true to use mock data instead of real API calls
// TODO: Set to false when APIs are fully integrated and functional
const BYPASS_MODE = false;

// API Configuration - Add authentication headers if required
const API_CONFIG = {
  sessionToken: '', // Add session token if required
  authToken: '', // Add authorization token if required
  deviceId: 'agent-portal-device-id', // Device ID for travel API
  platform: 'web', // Platform identifier
};

// Helper to get common headers
const getHeaders = () => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  // Add auth headers if configured
  if (API_CONFIG.sessionToken) {
    headers['x-session-token'] = API_CONFIG.sessionToken;
  }
  if (API_CONFIG.authToken) {
    headers['Authorization'] = API_CONFIG.authToken;
  }
  
  return headers;
};

// ==================== TYPE DEFINITIONS ====================

export interface EligibilityCheckRequest {
  subscriberNumber: string; // Zain subscription number
  fullName?: string;
  phoneNumber?: string;
  email?: string;
  vehicleNumber?: string;
}

export interface EligibilityCheckResponse {
  success: boolean;
  isEligible: boolean;
  message?: string;
  subscriberNumber?: string;
  plan?: 'POST' | 'PRE'; // Postpaid or Prepaid
  error?: string;
  // Additional fields from API
  quotationId?: number;
  quotationStatus?: number;
  isEligibleForInstallment?: boolean;
  mobile?: string;
  email?: string;
  name?: string;
}

export interface MotorDataRequest {
  plateNumber: string; // Vehicle plate number
}

export interface MotorDataResponse {
  success: boolean;
  data?: {
    plateNumber: string;
    chassisNumber?: string;
    make?: string;
    model?: string;
    year?: string;
    bodyType?: string;
    engineSize?: string;
    registrationMonth?: number;
  };
  message?: string;
  error?: string;
}

export interface GDTVehicleDetailsRequest {
  plateNumber: string;
  chassisNumber?: string;
}

export interface GDTVehicleDetailsResponse {
  success: boolean;
  data?: {
    plateNumber: string;
    registrationMonth?: number;
    policyStartDate?: string;
    policyEndDate?: string;
    vehicleValue?: number;
    // Additional GDT fields
    [key: string]: any;
  };
  message?: string;
  error?: string;
}

export interface MotorPlansRequest {
  plateNumber: string;
  vehicleValue: number;
  policyStartDate: string;
  policyEndDate: string;
  registrationMonth?: number;
  subscriberNumber?: string;
  make?: string;
  model?: string;
  year?: string;
  // Add any additional fields required by the API
  [key: string]: any;
}

export interface PlanBenefit {
  name: string;
  included: boolean;
}

export interface MotorPlan {
  id: string;
  name: string; // e.g., "Zain Super", "Zain Economy", "Third Party"
  policyPrice: number; // Total price including VAT
  upfront: number; // Upfront payment including VAT
  installmentPrice: number; // Monthly installment price
  vatIncluded: boolean;
  benefits: PlanBenefit[];
  // Raw plan data from API
  rawData?: any;
}

export interface MotorPlansResponse {
  success: boolean;
  plans?: MotorPlan[];
  message?: string;
  error?: string;
}

// ==================== API FUNCTIONS ====================

/**
 * Check eligibility using Zain subscription number
 * POST: https://giguatp.prosys.ai/api/v2/takaful-zain-eligibility-check
 */
export const checkEligibility = async (
  subscriberNumber: string,
  additionalData?: {
    fullName?: string;
    phoneNumber?: string;
    email?: string;
    vehicleNumber?: string;
  }
): Promise<EligibilityCheckResponse> => {
  // BYPASS MODE - Return mock success for testing
  if (BYPASS_MODE) {
    console.log('[BYPASS MODE] Eligibility check - returning mock success');
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay
    
    // Mock eligibility based on subscriber number pattern
    const isPostpaid = subscriberNumber.startsWith('39') || subscriberNumber.startsWith('36');
    
    return {
      success: true,
      isEligible: true,
      subscriberNumber: subscriberNumber,
      plan: isPostpaid ? 'POST' : 'PRE',
      message: `Mock eligibility check successful (${isPostpaid ? 'Postpaid' : 'Prepaid'})`,
    };
  }
  
  try {
    console.log('[API] Checking eligibility for subscriber:', subscriberNumber);
    
    const requestBody: any = { 
      subscriberNumber: subscriberNumber.trim(),
    };
    
    // Add additional required fields if provided
    if (additionalData) {
      if (additionalData.fullName) requestBody.fullName = additionalData.fullName;
      if (additionalData.phoneNumber) requestBody.phoneNumber = additionalData.phoneNumber;
      if (additionalData.email) requestBody.email = additionalData.email;
      if (additionalData.vehicleNumber) requestBody.vehicleNumber = additionalData.vehicleNumber;
    }
    
    console.log('[API] Request body:', requestBody);
    
    const response = await fetch(`${API_BASE_URL}/takaful-zain-eligibility-check`, {
      method: 'POST',
      headers: getHeaders(),
      mode: 'cors',
      credentials: 'omit',
      body: JSON.stringify(requestBody),
    });

    console.log('[API] Response status:', response.status);
    console.log('[API] Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Error response:', errorText);
      
      // Try to parse error as JSON for better error messages
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.errors) {
          const errorMessages = Object.entries(errorJson.errors)
            .map(([field, messages]: [string, any]) => `${field}: ${messages.join(', ')}`)
            .join('; ');
          throw new Error(`Validation failed: ${errorMessages}`);
        } else {
          throw new Error(errorJson.message || errorJson.message_en || `HTTP error! status: ${response.status}`);
        }
      } catch (parseError) {
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
    }

    const responseData = await response.json();
    console.log('[API] Response data:', responseData);
    
    // The API returns data in responseData.data, with top-level message
    const apiData = responseData.data || responseData;
    
    // Parse the actual API response structure
    return {
      success: responseData.success !== undefined ? responseData.success : true,
      isEligible: apiData.isEligible !== undefined ? apiData.isEligible : false,
      subscriberNumber: subscriberNumber,
      plan: apiData.zainPlan || apiData.plan || apiData.planType,
      message: responseData.message || responseData.message_en || 'Eligibility check successful',
      // Include additional fields from API
      quotationId: apiData.quotationId,
      quotationStatus: apiData.quotationStatus,
      isEligibleForInstallment: apiData.isEligibleForInstallment,
      mobile: apiData.mobile,
      email: apiData.email,
      name: apiData.name,
    };
  } catch (error: any) {
    console.error('[API] Eligibility check failed:', error);
    return {
      success: false,
      isEligible: false,
      error: error.message || 'Failed to check eligibility',
    };
  }
};

/**
 * Get vehicle data using plate number
 * POST: https://giguatp.prosys.ai/api/v2/takaful-zain-motor-data
 */
export const getMotorData = async (
  plateNumber: string,
  additionalData?: {
    collaboration?: string;
    eligible?: boolean;
    product?: string;
  }
): Promise<MotorDataResponse> => {
  // BYPASS MODE - Return mock vehicle data
  if (BYPASS_MODE) {
    console.log('[BYPASS MODE] Motor data - returning mock data');
    await new Promise(resolve => setTimeout(resolve, 600));
    
    return {
      success: true,
      data: {
        plateNumber: plateNumber,
        chassisNumber: `CH${plateNumber}ABC`,
        make: 'Toyota',
        model: 'Camry',
        year: '2022',
        bodyType: 'Sedan',
        engineSize: '2.5L',
        registrationMonth: 3,
      },
      message: 'Mock vehicle data retrieved',
    };
  }
  
  try {
    console.log('[API] Fetching motor data for plate:', plateNumber);
    
    const requestBody: any = { 
      plateNumber: plateNumber.trim(),
      collaboration: additionalData?.collaboration || 'zain',
      eligible: additionalData?.eligible !== undefined ? additionalData.eligible : true,
      product: additionalData?.product || 'motor',
    };
    
    console.log('[API] Request body:', requestBody);
    
    const response = await fetch(`${API_BASE_URL}/takaful-zain-motor-data`, {
      method: 'POST',
      headers: getHeaders(),
      mode: 'cors',
      credentials: 'omit',
      body: JSON.stringify(requestBody),
    });

    console.log('[API] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const result = await response.json();
    console.log('[API] Full Response data:', JSON.stringify(result, null, 2));
    
    // API may return data nested in multiple possible structures
    let apiData = result.data || result;
    
    // Check if data is nested deeper or in a different structure
    if (apiData && typeof apiData === 'object') {
      // Look for vehicle data in common nested locations
      if (apiData.vehicle) apiData = apiData.vehicle;
      if (apiData.vehicleData) apiData = apiData.vehicleData;
      if (apiData.motorData) apiData = apiData.motorData;
      if (apiData.details) apiData = apiData.details;
    }
    
    console.log('[API] Extracted apiData:', JSON.stringify(apiData, null, 2));
    
    // Log each field we're looking for
    console.log('[API] Looking for fields in apiData keys:', Object.keys(apiData || {}));
    
    // Extract all possible fields with detailed logging
    const parsedData = {
      plateNumber: apiData?.plateNumber || apiData?.plate_number || apiData?.PlateNumber || plateNumber,
      chassisNumber: apiData?.chassisNumber || apiData?.chassis_number || apiData?.ChassisNumber || apiData?.vin || apiData?.VIN,
      make: apiData?.make || apiData?.manufacturer || apiData?.brand || apiData?.Make || apiData?.Manufacturer,
      model: apiData?.model || apiData?.model_name || apiData?.Model || apiData?.ModelName,
      year: apiData?.year || apiData?.modelYear || apiData?.model_year || apiData?.year_of_manufacture || apiData?.Year || apiData?.ModelYear,
      bodyType: apiData?.bodyType || apiData?.body_type || apiData?.type || apiData?.vehicle_type || apiData?.BodyType || apiData?.Type,
      engineSize: apiData?.engineSize || apiData?.engine_size || apiData?.engineCapacity || apiData?.engine_capacity || apiData?.cc || apiData?.CC || apiData?.hp || apiData?.HP || apiData?.EngineSize,
      registrationMonth: apiData?.registrationMonth || apiData?.registration_month || apiData?.regMonth || apiData?.RegistrationMonth,
    };
    
    console.log('[API] Parsed vehicle data:', parsedData);
    console.log('[API] Non-undefined values:', Object.entries(parsedData).filter(([k, v]) => v !== undefined));
    
    return {
      success: result.success !== undefined ? result.success : true,
      data: parsedData,
      message: result.message || result.message_en,
    };
  } catch (error: any) {
    console.error('[API] Motor data fetch failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch motor data',
    };
  }
};

/**
 * Get GDT vehicle details (registration month, policy dates)
 * POST: https://giguatp.prosys.ai/api/v2/gdt-get-vehicle-details
 */
export const getGDTVehicleDetails = async (
  plateNumber: string,
  chassisNumber?: string
): Promise<GDTVehicleDetailsResponse> => {
  // BYPASS MODE - Return mock GDT data
  if (BYPASS_MODE) {
    console.log('[BYPASS MODE] GDT details - returning mock data');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const today = new Date().toISOString().split('T')[0];
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);
    endDate.setDate(endDate.getDate() - 1);
    
    return {
      success: true,
      data: {
        plateNumber: plateNumber,
        registrationMonth: 3,
        policyStartDate: today,
        policyEndDate: endDate.toISOString().split('T')[0],
        vehicleValue: 15000,
      },
      message: 'Mock GDT data retrieved',
    };
  }
  
  try {
    console.log('[API] Fetching GDT details for plate:', plateNumber, 'chassis:', chassisNumber);
    
    // GDT endpoint requires multipart/form-data, not JSON
    const formData = new FormData();
    formData.append('plateNumber', plateNumber.trim());
    
    if (chassisNumber) {
      formData.append('chassisNumber', chassisNumber.trim());
    }
    
    console.log('[API] Sending FormData with plateNumber:', plateNumber);
    
    // Note: Don't set Content-Type header - browser will set it automatically with boundary
    const headers: HeadersInit = {};
    if (API_CONFIG.sessionToken) {
      headers['x-session-token'] = API_CONFIG.sessionToken;
    }
    if (API_CONFIG.authToken) {
      headers['Authorization'] = API_CONFIG.authToken;
    }
    
    const response = await fetch(`${API_BASE_URL}/gdt-get-vehicle-details`, {
      method: 'POST',
      headers: headers,
      mode: 'cors',
      credentials: 'omit',
      body: formData,
    });

    console.log('[API] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    // First get the raw text to see actual response
    const responseText = await response.text();
    console.log('[API] Raw motor-data response text:', responseText);
    
    // Try to parse as JSON
    let result;
    try {
      result = JSON.parse(responseText);
      console.log('[API] Parsed motor-data response:', result);
    } catch (parseError) {
      console.error('[API] Failed to parse response as JSON:', parseError);
      throw new Error('Invalid JSON response from motor-data API');
    }
    
    // Set default policy dates (start date = today, can be amended by user)
    const today = new Date().toISOString().split('T')[0];
    
    return {
      success: true,
      data: {
        plateNumber: result.plateNumber || plateNumber,
        registrationMonth: result.registrationMonth,
        policyStartDate: result.policyStartDate || today,
        policyEndDate: result.policyEndDate,
        vehicleValue: result.vehicleValue || result.value,
        ...result, // Include any additional fields from API
      },
      message: result.message,
    };
  } catch (error: any) {
    console.error('[API] GDT vehicle details fetch failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch GDT vehicle details',
    };
  }
};

/**
 * Get available motor insurance plans
 * POST: https://giguatp.prosys.ai/api/v2/takaful-zain-motor-plans
 */
export const getMotorPlans = async (
  request: MotorPlansRequest
): Promise<MotorPlansResponse> => {
  // BYPASS MODE - Return mock plans
  if (BYPASS_MODE) {
    console.log('[BYPASS MODE] Motor plans - returning mock plans');
    await new Promise(resolve => setTimeout(resolve, 700));
    
    const mockPlans: MotorPlan[] = [
      {
        id: 'zain-super',
        name: 'Zain Super',
        policyPrice: 242.000,
        upfront: 26.000,
        installmentPrice: 18.000,
        vatIncluded: true,
        benefits: [
          { name: 'Third Party Property Damage', included: true },
          { name: 'Loss or Damage of Vehicle', included: true },
          { name: 'Road Assist Cover', included: true },
          { name: 'Agency Repair', included: true },
          { name: 'Emergency Treatment Cover', included: true },
          { name: 'Windows Cover', included: true },
          { name: 'Car Replacement Cover', included: true },
          { name: 'Natural Perils', included: true },
          { name: 'VIP', included: true },
          { name: 'Third Party Bodily Injury', included: true },
        ],
      },
      {
        id: 'zain-economy',
        name: 'Zain Economy',
        policyPrice: 220.000,
        upfront: 28.000,
        installmentPrice: 16.000,
        vatIncluded: true,
        benefits: [
          { name: 'Third Party Property Damage', included: true },
          { name: 'Loss or Damage of Vehicle', included: true },
          { name: 'Road Assist Cover', included: true },
          { name: 'Agency Repair', included: true },
          { name: 'Emergency Treatment Cover', included: true },
          { name: 'Windows Cover', included: true },
          { name: 'Third Party Bodily Injury', included: true },
        ],
      },
      {
        id: 'third-party',
        name: 'Third Party',
        policyPrice: 64.900,
        upfront: 6.100,
        installmentPrice: 4.900,
        vatIncluded: true,
        benefits: [
          { name: 'Third Party Property Damage', included: true },
          { name: 'Third Party Bodily Injury', included: true },
        ],
      },
    ];
    
    return {
      success: true,
      plans: mockPlans,
      message: 'Mock plans retrieved successfully',
    };
  }
  
  try {
    console.log('[API] Fetching motor plans with request:', request);
    
    const response = await fetch(`${API_BASE_URL}/takaful-zain-motor-plans`, {
      method: 'POST',
      headers: getHeaders(),
      mode: 'cors',
      credentials: 'omit',
      body: JSON.stringify(request),
    });

    console.log('[API] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const result = await response.json();
    console.log('[API] Response data:', result);
    
    // Parse and normalize the plans data
    const plans: MotorPlan[] = [];
    
    if (result.plans && Array.isArray(result.plans)) {
      result.plans.forEach((plan: any) => {
        plans.push({
          id: plan.id || plan.planId || `plan-${Math.random().toString(36).substr(2, 9)}`,
          name: plan.name || plan.planName || 'Unknown Plan',
          policyPrice: parseFloat(plan.policyPrice || plan.totalPrice || 0),
          upfront: parseFloat(plan.upfront || plan.upfrontPrice || 0),
          installmentPrice: parseFloat(plan.installmentPrice || plan.monthlyPrice || 0),
          vatIncluded: plan.vatIncluded !== false, // Default to true
          benefits: parseBenefits(plan.benefits || plan.coverage || []),
          rawData: plan,
        });
      });
    }
    
    return {
      success: true,
      plans,
      message: result.message,
    };
  } catch (error: any) {
    console.error('Motor plans fetch failed:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch motor plans',
    };
  }
};

/**
 * Helper function to parse plan benefits
 */
const parseBenefits = (benefits: any): PlanBenefit[] => {
  if (!benefits) return [];
  
  // If benefits is an array of strings
  if (Array.isArray(benefits)) {
    return benefits.map((benefit: any) => {
      if (typeof benefit === 'string') {
        return { name: benefit, included: true };
      }
      return {
        name: benefit.name || benefit.title || 'Unknown Benefit',
        included: benefit.included !== false,
      };
    });
  }
  
  // If benefits is an object with boolean values
  if (typeof benefits === 'object') {
    return Object.entries(benefits).map(([key, value]) => ({
      name: formatBenefitName(key),
      included: !!value,
    }));
  }
  
  return [];
};

/**
 * Helper function to format benefit names from camelCase or snake_case
 */
const formatBenefitName = (name: string): string => {
  return name
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
    .trim();
};

/**
 * Combined workflow: Fetch all vehicle data in sequence
 * 1. Get motor data
 * 2. Get GDT details
 * Returns combined data
 */
export const getCompleteVehicleData = async (
  plateNumber: string
): Promise<{
  success: boolean;
  motorData?: MotorDataResponse['data'];
  gdtData?: GDTVehicleDetailsResponse['data'];
  error?: string;
}> => {
  try {
    // Step 1: Get motor data
    const motorResult = await getMotorData(plateNumber);
    if (!motorResult.success) {
      return {
        success: false,
        error: motorResult.error || 'Failed to fetch motor data',
      };
    }

    // Step 2: Get GDT details
    const gdtResult = await getGDTVehicleDetails(
      plateNumber,
      motorResult.data?.chassisNumber
    );
    
    if (!gdtResult.success) {
      // Motor data succeeded but GDT failed - return partial success
      return {
        success: true,
        motorData: motorResult.data,
        error: 'GDT data unavailable: ' + (gdtResult.error || ''),
      };
    }

    return {
      success: true,
      motorData: motorResult.data,
      gdtData: gdtResult.data,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch complete vehicle data',
    };
  }
};

// ==================== TRAVEL INSURANCE API ====================

// Helper to get travel API headers
const getTravelHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-device-id': API_CONFIG.deviceId,
    'x-platform': API_CONFIG.platform,
  };
};

export interface TravelDraft {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  zainNumber: string;
  travelType?: 'INDIVIDUAL' | 'FAMILY';
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  travelers?: any[];
  selectedPlanId?: string;
  status?: string;
}

export interface TravelPlan {
  id: string;
  name: string;
  provider: string;
  coverage: string;
  premium: number;
  features: string[];
}

/**
 * Get draft travel application by email
 */
export const getDraftTravelApplicationByEmail = async (
  email: string
): Promise<{ success: boolean; data?: TravelDraft; error?: string }> => {
  if (BYPASS_MODE) {
    return {
      success: true,
      data: undefined, // No existing draft
    };
  }

  try {
    const response = await fetch(
      `${TRAVEL_API_BASE_URL}/travel_application/getDraftTravelApplicationByEmail?email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: getTravelHeaders(),
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    
    return {
      success: true,
      data: data.data || undefined,
    };
  } catch (error: any) {
    console.error('Error fetching travel draft:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch travel draft',
    };
  }
};

/**
 * Get travel insurance plans
 */
export const getTravelPlans = async (
  travelData: {
    destination: string;
    departureDate: string;
    returnDate: string;
    travelType: string;
    adultsCount: number;
    childrenCount: number;
  }
): Promise<{ success: boolean; plans?: TravelPlan[]; error?: string }> => {
  if (BYPASS_MODE) {
    // Mock travel plans
    return {
      success: true,
      plans: [
        {
          id: 'travel-plan-1',
          name: 'Basic Travel',
          provider: 'GIG',
          coverage: 'Basic',
          premium: 25,
          features: ['Medical Emergency', 'Trip Cancellation'],
        },
        {
          id: 'travel-plan-2',
          name: 'Premium Travel',
          provider: 'GIG',
          coverage: 'Premium',
          premium: 50,
          features: ['Medical Emergency', 'Trip Cancellation', 'Lost Luggage', '24/7 Support'],
        },
      ],
    };
  }

  try {
    const formData = new FormData();
    formData.append('destination', travelData.destination);
    formData.append('departureDate', travelData.departureDate);
    formData.append('returnDate', travelData.returnDate);
    formData.append('travelType', travelData.travelType);
    formData.append('adultsCount', travelData.adultsCount.toString());
    formData.append('childrenCount', travelData.childrenCount.toString());

    const response = await fetch(
      `${TRAVEL_API_BASE_URL}/travel_application/getPlans`,
      {
        method: 'POST',
        headers: {
          'x-device-id': API_CONFIG.deviceId,
          'x-platform': API_CONFIG.platform,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    
    return {
      success: true,
      plans: data.plans || [],
    };
  } catch (error: any) {
    console.error('Error fetching travel plans:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch travel plans',
    };
  }
};

/**
 * Update travel application
 */
export const updateTravelApplication = async (
  applicationId: number,
  updateData: any
): Promise<{ success: boolean; data?: any; error?: string }> => {
  if (BYPASS_MODE) {
    return {
      success: true,
      data: { id: applicationId, ...updateData },
    };
  }

  try {
    const formData = new FormData();
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && updateData[key] !== null) {
        formData.append(key, typeof updateData[key] === 'object' ? JSON.stringify(updateData[key]) : updateData[key]);
      }
    });

    const response = await fetch(
      `${TRAVEL_API_BASE_URL}/travel_application/update/${applicationId}`,
      {
        method: 'POST',
        headers: {
          'x-device-id': API_CONFIG.deviceId,
          'x-platform': API_CONFIG.platform,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    
    return {
      success: true,
      data: data.data,
    };
  } catch (error: any) {
    console.error('Error updating travel application:', error);
    return {
      success: false,
      error: error.message || 'Failed to update travel application',
    };
  }
};

/**
 * Calculate travel insurance premium
 */
export const calculateTravelInsurance = async (
  applicationId: number
): Promise<{ success: boolean; data?: any; error?: string }> => {
  if (BYPASS_MODE) {
    return {
      success: true,
      data: {
        premium: 45.50,
        vat: 2.28,
        total: 47.78,
      },
    };
  }

  try {
    const formData = new FormData();
    formData.append('applicationId', applicationId.toString());

    const response = await fetch(
      `${TRAVEL_API_BASE_URL}/travel_application/calculateTravelInsurance`,
      {
        method: 'POST',
        headers: {
          'x-device-id': API_CONFIG.deviceId,
          'x-platform': API_CONFIG.platform,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    
    return {
      success: true,
      data: data.data,
    };
  } catch (error: any) {
    console.error('Error calculating travel insurance:', error);
    return {
      success: false,
      error: error.message || 'Failed to calculate travel insurance',
    };
  }
};

/**
 * Check eligibility for travel insurance
 */
export const checkTravelEligibility = async (
  zainNumber: string,
  email: string
): Promise<{ success: boolean; data?: any; error?: string }> => {
  if (BYPASS_MODE) {
    return {
      success: true,
      data: {
        isEligible: true,
        message: 'Customer is eligible for travel insurance',
      },
    };
  }

  try {
    const formData = new FormData();
    formData.append('zainNumber', zainNumber);
    formData.append('email', email);

    const response = await fetch(
      `${TRAVEL_API_BASE_URL}/travel_application/checkEligibility`,
      {
        method: 'POST',
        headers: {
          'x-device-id': API_CONFIG.deviceId,
          'x-platform': API_CONFIG.platform,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    
    return {
      success: true,
      data: data.data,
    };
  } catch (error: any) {
    console.error('Error checking travel eligibility:', error);
    return {
      success: false,
      error: error.message || 'Failed to check travel eligibility',
    };
  }
};
