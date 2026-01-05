/**
 * WhatsApp Service
 * Integration with WhatsApp Business API for sending automated messages
 */

// WhatsApp API Configuration
const WHATSAPP_CONFIG = {
  apiUrl: 'https://graph.facebook.com/v17.0', // WhatsApp Business API endpoint
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || 'YOUR_PHONE_NUMBER_ID',
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || 'YOUR_ACCESS_TOKEN',
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || 'YOUR_BUSINESS_ACCOUNT_ID',
};

// Enable mock mode for development (set to false when WhatsApp API is configured)
const MOCK_MODE = true;

export interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp?: string;
}

export interface WhatsAppTemplate {
  name: string;
  language: string;
  components: any[];
}

/**
 * Send a WhatsApp message
 */
export const sendWhatsAppMessage = async (
  recipientPhone: string,
  message: string
): Promise<WhatsAppResponse> => {
  if (MOCK_MODE) {
    return mockSendWhatsApp(recipientPhone, message);
  }

  try {
    // Format phone number (remove + and spaces, ensure country code)
    const formattedPhone = formatPhoneNumber(recipientPhone);

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: message,
      },
    };

    const response = await fetch(
      `${WHATSAPP_CONFIG.apiUrl}/${WHATSAPP_CONFIG.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_CONFIG.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to send WhatsApp message');
    }

    const data = await response.json();
    
    return {
      success: true,
      messageId: data.messages[0].id,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[WhatsAppService] Error sending message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Send a WhatsApp template message (for approved templates)
 */
export const sendWhatsAppTemplate = async (
  recipientPhone: string,
  templateName: string,
  templateParams: string[] = []
): Promise<WhatsAppResponse> => {
  if (MOCK_MODE) {
    return mockSendWhatsApp(recipientPhone, `Template: ${templateName}`);
  }

  try {
    const formattedPhone = formatPhoneNumber(recipientPhone);

    const payload = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'en', // or 'ar' for Arabic
        },
        components: [
          {
            type: 'body',
            parameters: templateParams.map(param => ({
              type: 'text',
              text: param,
            })),
          },
        ],
      },
    };

    const response = await fetch(
      `${WHATSAPP_CONFIG.apiUrl}/${WHATSAPP_CONFIG.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_CONFIG.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to send template message');
    }

    const data = await response.json();

    return {
      success: true,
      messageId: data.messages[0].id,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[WhatsAppService] Error sending template:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Send bulk WhatsApp messages
 */
export const sendBulkWhatsAppMessages = async (
  messages: Array<{ phone: string; message: string }>
): Promise<{ sent: number; failed: number; results: WhatsAppResponse[] }> => {
  const results: WhatsAppResponse[] = [];
  let sent = 0;
  let failed = 0;

  for (const msg of messages) {
    const result = await sendWhatsAppMessage(msg.phone, msg.message);
    results.push(result);
    
    if (result.success) {
      sent++;
    } else {
      failed++;
    }

    // Rate limiting: wait 100ms between messages
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return { sent, failed, results };
};

/**
 * Format phone number for WhatsApp API
 * Ensures format: 973XXXXXXXX (country code + number without + or spaces)
 */
const formatPhoneNumber = (phone: string): string => {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If it starts with 973 (Bahrain), return as is
  if (cleaned.startsWith('973')) {
    return cleaned;
  }
  
  // If it starts with 00973, remove the 00
  if (cleaned.startsWith('00973')) {
    return cleaned.substring(2);
  }
  
  // If it doesn't start with country code, add 973 (Bahrain)
  if (cleaned.length === 8) {
    return '973' + cleaned;
  }
  
  return cleaned;
};

/**
 * Mock WhatsApp send for development/testing
 */
const mockSendWhatsApp = async (
  recipientPhone: string,
  message: string
): Promise<WhatsAppResponse> => {
  console.log('📱 [MOCK WhatsApp] Sending message:');
  console.log(`   To: ${recipientPhone}`);
  console.log(`   Message: ${message.substring(0, 100)}...`);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Simulate 95% success rate
  const success = Math.random() > 0.05;
  
  if (success) {
    return {
      success: true,
      messageId: `wamid.mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
    };
  } else {
    return {
      success: false,
      error: 'Mock failure: Simulated network error',
    };
  }
};

/**
 * Validate WhatsApp configuration
 */
export const validateWhatsAppConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!WHATSAPP_CONFIG.phoneNumberId || WHATSAPP_CONFIG.phoneNumberId === 'YOUR_PHONE_NUMBER_ID') {
    errors.push('WhatsApp Phone Number ID not configured');
  }
  
  if (!WHATSAPP_CONFIG.accessToken || WHATSAPP_CONFIG.accessToken === 'YOUR_ACCESS_TOKEN') {
    errors.push('WhatsApp Access Token not configured');
  }
  
  if (!WHATSAPP_CONFIG.businessAccountId || WHATSAPP_CONFIG.businessAccountId === 'YOUR_BUSINESS_ACCOUNT_ID') {
    errors.push('WhatsApp Business Account ID not configured');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Get WhatsApp message status
 */
export const getMessageStatus = async (messageId: string): Promise<{
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp?: string;
}> => {
  if (MOCK_MODE) {
    return {
      status: 'delivered',
      timestamp: new Date().toISOString(),
    };
  }

  // Implement webhook-based status tracking in production
  // This would typically be handled by WhatsApp webhooks
  return {
    status: 'sent',
    timestamp: new Date().toISOString(),
  };
};
