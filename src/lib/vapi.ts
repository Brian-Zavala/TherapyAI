import Vapi from '@vapi-ai/web';

// Initialize Vapi with API key or JWT token
export const initVapi = (token: string) => {
  return new Vapi(token);
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
