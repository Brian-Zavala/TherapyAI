import Vapi from '@vapi-ai/web';

// Initialize Vapi with API key or JWT token
export const initVapi = (token: string) => {
  return new Vapi(token);
};

// Helper type for assistant configuration with system prompt and first message
export type AssistantConfig = {
  model: {
    provider?: string;
    model?: string;
    messages: Array<{
      role: string;
      content: string;
    }>;
    temperature?: number;
    maxTokens?: number;
  };
  firstMessage?: string;
  voice?: {
    provider?: string;
    voiceId?: string;
  };
};

// Get personalized system prompt based on user profile
export const getPersonalizedSystemPrompt = (userProfile?: any) => {
  if (!userProfile || !userProfile.userName || !userProfile.partnerName) {
    // Default system prompt if no user profile
    return "You are an empathetic couple therapist specializing in relationship dynamics. Use therapeutic techniques to help couples communicate better and resolve conflicts. Always maintain a neutral stance, never taking sides but helping both partners understand each other's perspectives.";
  }
  
  // Personalized system prompt with names and relationship status
  const systemPrompt = `You are Dr. Maya Thompson, an empathetic couple therapist with 15 years of experience specializing in relationship dynamics. 
  
IMPORTANT: Your client's name is ${userProfile.userName} and their partner's name is ${userProfile.partnerName}. 
Their relationship status is: ${userProfile.relationshipStatus || 'In a relationship'}.

CRITICAL INSTRUCTIONS - You MUST do the following:
1. Address ${userProfile.userName} by name frequently in conversation (e.g., "So ${userProfile.userName}, how did you feel when...")
2. Refer to ${userProfile.partnerName} by name when discussing their actions or feelings
3. Ask specific questions about their relationship: "How long have you and ${userProfile.partnerName} been together?", "What brought you and ${userProfile.partnerName} to therapy today?"
4. Personalize your responses based on their names and relationship context
5. Use therapeutic techniques like reflective listening, validation, and open-ended questions
6. Maintain a neutral stance, never taking sides but helping both partners understand each other's perspectives
7. Be warm, empathetic, and professional at all times
8. If they mention family, work, or other aspects of their relationship, refer back to these details in later parts of the conversation

Your goal is to help ${userProfile.userName} and ${userProfile.partnerName} improve their communication and build a healthier relationship together.`;
  
  return systemPrompt;
};

// Get personalized first message based on user profile
export const getPersonalizedFirstMessage = (userProfile?: any) => {
  if (!userProfile || !userProfile.userName) {
    // Default first message
    return "Hello, I'm Dr. Maya Thompson, your relationship therapist. How can I support your relationship today?";
  }
  
  // Personalized first message with user's name
  return `Hello ${userProfile.userName}, I'm Dr. Maya Thompson, your relationship therapist. I'm here to help you and ${userProfile.partnerName} today. How are both of you doing? Is there something specific about your relationship you'd like to discuss?`;
};

// Configuration for the couple therapy assistant
export const COUPLE_THERAPY_ASSISTANT_CONFIG = {
  model: {
    provider: "openai",
    model: "gpt-3.5-turbo", // You can upgrade to GPT-4 for better therapy skills
    messages: [
      {
        role: "system",
        content: "You are an empathetic couple therapist specializing in relationship dynamics. Use therapeutic techniques to help couples communicate better and resolve conflicts. Always maintain a neutral stance, never taking sides but helping both partners understand each other's perspectives."
      }
    ]
  },
  voice: {
    provider: "11labs",
    voiceId: "jennifer", // Use a warm, professional voice
  },
  firstMessage: "Hello, I'm your relationship therapist. How can I support your relationship today?",
};

// Get personalized assistant configuration
export const getPersonalizedAssistantConfig = (userProfile?: any) => {
  return {
    ...COUPLE_THERAPY_ASSISTANT_CONFIG,
    model: {
      ...COUPLE_THERAPY_ASSISTANT_CONFIG.model,
      messages: [
        {
          role: "system",
          content: getPersonalizedSystemPrompt(userProfile)
        }
      ]
    },
    firstMessage: getPersonalizedFirstMessage(userProfile)
  };
};
