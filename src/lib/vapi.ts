import Vapi from '@vapi-ai/web';

// Initialize Vapi with API key or JWT token
export const initVapi = (token: string) => {
  return new Vapi(token);
};

// Get personalized system prompt based on user profile
export const getPersonalizedSystemPrompt = (userProfile?: any) => {
  if (!userProfile || !userProfile.userName || !userProfile.partnerName) {
    // Default system prompt if no user profile
    return "You are an empathetic couple therapist specializing in relationship dynamics. Use therapeutic techniques to help couples communicate better and resolve conflicts. Always maintain a neutral stance, never taking sides but helping both partners understand each other's perspectives.";
  }
  
  // Personalized system prompt with names and relationship status
  return `You are an empathetic couple therapist specializing in relationship dynamics. 
Your client's name is ${userProfile.userName} and their partner's name is ${userProfile.partnerName}. 
Their relationship status is: ${userProfile.relationshipStatus || 'In a relationship'}.

Guidelines:
- Refer to them by name naturally in conversation to build rapport (e.g., "So ${userProfile.userName}, how did you feel when...")
- Ask about specific dynamics between ${userProfile.userName} and ${userProfile.partnerName}
- Use therapeutic techniques to help them communicate better and resolve conflicts
- Maintain a neutral stance, never taking sides but helping both partners understand each other's perspectives
- Tailor your advice to their specific relationship status and context
- Be warm, empathetic, and professional at all times`;
};

// Get personalized first message based on user profile
export const getPersonalizedFirstMessage = (userProfile?: any) => {
  if (!userProfile || !userProfile.userName) {
    // Default first message
    return "Hello, I'm your relationship therapist. How can I support your relationship today?";
  }
  
  // Personalized first message with user's name
  return `Hello ${userProfile.userName}, I'm your relationship therapist. How can I support you and ${userProfile.partnerName} today?`;
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
