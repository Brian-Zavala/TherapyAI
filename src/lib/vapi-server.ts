// Server-side Vapi integration for managing assistants programmatically

import { COUPLE_THERAPY_ASSISTANT_CONFIG } from './vapi';

const VAPI_API_URL = 'https://api.vapi.ai';
const VAPI_SERVER_API_KEY = process.env.VAPI_SERVER_API_KEY || process.env.NEXT_PUBLIC_VAPI_API_KEY;

if (!VAPI_SERVER_API_KEY) {
  console.warn('VAPI_SERVER_API_KEY is not set. Using public key which has limited capabilities.');
}

/**
 * Create a new Vapi assistant
 */
export async function createAssistant(config = COUPLE_THERAPY_ASSISTANT_CONFIG) {
  try {
    const response = await fetch(`${VAPI_API_URL}/assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VAPI_SERVER_API_KEY}`
      },
      body: JSON.stringify(config)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create assistant');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating assistant:', error);
    throw error;
  }
}

/**
 * Get an assistant by ID
 */
export async function getAssistant(assistantId: string) {
  try {
    const response = await fetch(`${VAPI_API_URL}/assistant/${assistantId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_SERVER_API_KEY}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get assistant');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting assistant:', error);
    throw error;
  }
}

/**
 * Update an existing assistant
 */
export async function updateAssistant(assistantId: string, config: any) {
  try {
    const response = await fetch(`${VAPI_API_URL}/assistant/${assistantId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VAPI_SERVER_API_KEY}`
      },
      body: JSON.stringify(config)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update assistant');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating assistant:', error);
    throw error;
  }
}

/**
 * List all assistants
 */
export async function listAssistants() {
  try {
    const response = await fetch(`${VAPI_API_URL}/assistant`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VAPI_SERVER_API_KEY}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to list assistants');
    }

    return await response.json();
  } catch (error) {
    console.error('Error listing assistants:', error);
    throw error;
  }
}

/**
 * Generate a client token for the frontend
 * This allows for more secure access from the client side
 */
export async function generateClientToken(userId: string) {
  try {
    const response = await fetch(`${VAPI_API_URL}/client-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VAPI_SERVER_API_KEY}`
      },
      body: JSON.stringify({
        // You can add custom claims to the token
        userId,
        // Token expires in 1 hour
        expiresIn: '1h'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to generate client token');
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Error generating client token:', error);
    throw error;
  }
}