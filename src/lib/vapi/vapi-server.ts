// Server-side Vapi integration for managing assistants programmatically

import { COUPLE_THERAPY_ASSISTANT_CONFIG } from './vapi';
import jwt from 'jsonwebtoken';

const VAPI_API_URL = 'https://api.vapi.ai';
const VAPI_SERVER_API_KEY = process.env.VAPI_SERVER_API_KEY || process.env.VAPI_API_KEY;

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
export async function updateAssistant(assistantId: string, config: Record<string, unknown>) {
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
    // Check if we have the necessary environment variables
    const orgId = process.env.VAPI_ORG_ID;
    const privateKey = process.env.VAPI_PRIVATE_KEY;
    
    if (!orgId || !privateKey) {
      console.error('[VAPI JWT] Missing required environment variables:', {
        hasOrgId: !!orgId,
        hasPrivateKey: !!privateKey,
        userId,
        timestamp: new Date().toISOString()
      });
      
      // Provide more helpful error message
      const missingVars = [];
      if (!orgId) missingVars.push('VAPI_ORG_ID');
      if (!privateKey) missingVars.push('VAPI_PRIVATE_KEY');
      
      throw new Error(`Missing required JWT authentication credentials: ${missingVars.join(', ')}. Please check your .env file.`);
    }
    
    // For Vapi, we need to construct the payload according to their requirements
    // Documentation: https://docs.vapi.ai/customization/jwt-authentication
    const payload = {
      orgId: orgId,
      token: {
        tag: "public", // "public" for client-side usage
        // Optional restrictions for public tokens:
        userId: userId,
        // List of assistant IDs this token can access
        assistantIds: [
          process.env.NEXT_PUBLIC_VAPI_COUPLE_ASSISTANT_ID, // Dr. Maya Thompson (couple)
          process.env.NEXT_PUBLIC_VAPI_INDIVIDUAL_ASSISTANT_ID, // Dr. Elliot Mackaphy (solo)
          process.env.NEXT_PUBLIC_VAPI_FAMILY_ASSISTANT_ID  // Dr. Jada Pearson (family)
        ].filter(Boolean), // Filter out any undefined values
      },
    };
    
    try {
      const token = jwt.sign(payload, privateKey, { 
        algorithm: 'RS256',
        expiresIn: '1h' 
      });
      
      console.log(`Generated JWT token for user ${userId} with expiry of 1 hour`);
      return token;
    } catch (jwtError) {
      console.error('JWT signing failed:', jwtError);
      throw new Error('Failed to sign JWT');
    }
    
  } catch (error) {
    console.error('Error generating client token:', error);
    throw error;
  }
}