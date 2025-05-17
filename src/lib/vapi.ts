import Vapi from "@vapi-ai/web";

/**
 * Initialize Vapi with API key or JWT token
 * Optionally configure with custom transcriber settings
 */
export const initVapi = async (
  token: string,
  options: { 
    useCustomTranscriber?: boolean,
    reconnectEnabled?: boolean,
    iceServers?: Array<{ urls: string | string[], username?: string, credential?: string }> 
  } = {}
) => {
  try {
    // Create a simple Vapi instance - explicitly provide the API URL as second parameter
    console.log('Creating Vapi instance with explicit API URL as constructor parameter');
    
    // Create Vapi instance by passing the token and API URL directly in the constructor
    // This is the recommended way according to the Vapi API docs
    let vapiInstance = new Vapi(token, 'https://api.vapi.ai');
    console.log('Created Vapi instance with API URL specified in constructor: https://api.vapi.ai');
    
    // Double-check that window.fetch isn't modified in a way that could cause issues
    // Only if running in browser
    if (typeof window !== 'undefined') {
      const originalWindowFetch = window.fetch;
      const origFetchDesc = Object.getOwnPropertyDescriptor(window, 'fetch');
      
      // Restore original fetch if it was previously modified
      if (origFetchDesc && origFetchDesc.writable) {
        window.fetch = originalWindowFetch;
        console.log('Restored original window.fetch function');
      }
    }
    
    // Store the connection state for monitoring
    (vapiInstance as any)._transportState = 'new';
    
    // Add additional debug event to track WebRTC transport state
    vapiInstance.on('transport-state-change', (data: any) => {
      console.log(`✶✶✶ VAPI TRANSPORT STATE CHANGE: `, JSON.stringify(data, null, 2));
      // Store current transport state for easier access
      if (data && data.state) {
        (vapiInstance as any)._transportState = data.state;
      }
    });

    // Add universal event logging for debugging
    const events = [
      "call-start",
      "call-end",
      "error",
      "message",
      "transcript",
      "transcript-response",
      "model-output",
      "status-update",
      "ice-connection-state-change", // Track ICE connection state changes
      "connection-state-change",     // Track general connection state changes
      "transport-state-change"       // Added to track transport states explicitly
    ];

    events.forEach((eventType) => {
      vapiInstance.on(eventType, (data: any) => {
        console.log(
          `✶✶✶ VAPI EVENT [${eventType}]: `,
          JSON.stringify(data, null, 2)
        );
      });
    });

    // If custom transcriber is enabled, prepare the configuration for later use
    if (options.useCustomTranscriber) {
      try {
        // Get the base URL for the custom transcriber
        const baseUrl =
          typeof window !== "undefined"
            ? window.location.origin
            : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        console.log("Getting transcriber config from API...");

        // Get configuration from the API
        const configResponse = await fetch(`${baseUrl}/api/vapi/transcriber`);

        if (configResponse.ok) {
          const transcriberConfig = await configResponse.json();
          console.log("Using Deepgram transcriber config (API key redacted)");

          // Store the config on the instance for use during calls
          // This is safer than trying to use setTranscriberOptions which might not exist
          (vapiInstance as any)._transcriberConfig = transcriberConfig;
          console.log("✅ Custom transcriber config stored successfully");
        } else {
          console.warn("Failed to get transcriber config from API");
        }
      } catch (error) {
        console.error("Error getting custom transcriber config:", error);
        // Continue without custom transcriber
      }
    }
    
    // Add resilience by responding to browser visibility changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        // When page becomes visible again after being hidden
        if (document.visibilityState === 'visible') {
          if ((vapiInstance as any)._transportState === 'disconnected' || 
              (vapiInstance as any)._transportState === 'failed') {
            console.log('Page visibility changed to visible, checking WebRTC connection...');
            // If we have an active call that's disconnected, try to recover
            if ((vapiInstance as any)._isCallActive && (vapiInstance as any)._currentAssistantId) {
              console.log('Attempting to recover disconnected call');
              // This is a simplified recovery approach - in a production app
              // you might want to implement a more sophisticated reconnection strategy
            }
          }
        }
      });
    }

    return vapiInstance;
  } catch (error) {
    console.error("Error initializing Vapi:", error);
    throw error;
  }
};

// Helper type for assistant configuration with system prompt and first message
export type AssistantConfig = {
  id?: string;
  name?: string;
  type?: string;
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

// Format session transcript for the AI assistant
export const formatSessionHistory = (sessions: any[] = []) => {
  if (!sessions || sessions.length === 0) {
    return "No previous session history.";
  }

  // Get the most recent 3 completed sessions
  const recentSessions = sessions
    .filter((s) => s.status === "completed")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  if (recentSessions.length === 0) {
    return "No completed sessions found.";
  }

  // Format each session
  return recentSessions
    .map((session) => {
      const sessionDate = new Date(session.date).toLocaleDateString();
      const theme = session.theme || "Therapy Session";

      // Format transcript from transcript entries or legacy transcript
      let conversationSummary = "";

      if (session.transcriptEntries && session.transcriptEntries.length > 0) {
        // Use structured transcript entries and create summary
        const userMessages = session.transcriptEntries
          .filter((entry: any) => entry.speaker === "user")
          .map((entry: any) => entry.text);

        const assistantMessages = session.transcriptEntries
          .filter((entry: any) => entry.speaker === "assistant")
          .map((entry: any) => entry.text);

        // Extract key topics by identifying frequent words
        const allText = [...userMessages, ...assistantMessages]
          .join(" ")
          .toLowerCase();
        const words = allText
          .split(/\W+/)
          .filter(
            (word) =>
              word.length > 3 &&
              ![
                "this",
                "that",
                "with",
                "have",
                "your",
                "from",
                "they",
                "will",
                "about",
                "what",
                "been",
                "were",
              ].includes(word)
          );

        // Count word frequencies
        const wordFrequency: Record<string, number> = {};
        words.forEach((word) => {
          wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        });

        // Get top key topics
        const keyTopics = Object.entries(wordFrequency)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([word]) => word)
          .join(", ");

        // Get a few representative messages
        const sampleUserMessages =
          userMessages.length > 0
            ? userMessages.filter((msg) => msg.length > 20).slice(0, 2)
            : ["No significant user messages"];

        const sampleAssistantResponses =
          assistantMessages.length > 0
            ? assistantMessages.filter((msg) => msg.length > 20).slice(0, 2)
            : ["No significant assistant responses"];

        // Format conversation summary
        conversationSummary = `
Key topics discussed: ${keyTopics || "Various relationship topics"}

Sample statements from client:
- ${sampleUserMessages.join("\n- ")}

Sample therapeutic responses:
- ${sampleAssistantResponses.join("\n- ")}`;
      } else if (session.transcript) {
        // Use legacy transcript format
        const truncatedTranscript =
          session.transcript.length > 500
            ? session.transcript.substring(0, 500) + "...(truncated)"
            : session.transcript;

        conversationSummary = `
Transcript summary:
${truncatedTranscript}`;
      } else {
        conversationSummary = "No transcript available for this session.";
      }

      return `SESSION DATE: ${sessionDate}
THEME: ${theme}
${conversationSummary}
---------------------`;
    })
    .join("\n\n");
};

// Get personalized system prompt based on user profile
export const getPersonalizedSystemPrompt = (userProfile?: any) => {
  if (!userProfile || !userProfile?.userName || !userProfile?.partnerName) {
    // Default system prompt if no user profile
    return "You are Dr. Maya Thompson, a deeply empathetic couple therapist with 15 years of experience in relationship dynamics and evidence-based therapy methods. Your work blends the Gottman Method with Emotionally Focused Therapy (EFT). You naturally recognize destructive patterns in relationships and guide couples toward healthier ways of connecting. Your conversational style is warm and natural - you speak like a real person, not a textbook. You occasionally use filler words, take moments to think before responding, and show your humanity through genuine reactions. You maintain a balanced perspective without taking sides, helping partners see each other's viewpoints clearly. You're responsive to the emotional undercurrents of conversations, not just the words themselves.";
  }

  // Get safe values with defaults
  const userName = userProfile?.userName || "the client";
  const userAge = userProfile?.userAge ? `(${userProfile.userAge} years old)` : "";
  const partnerName = userProfile?.partnerName || "their partner";
  const partnerAge = userProfile?.partnerAge ? `(${userProfile.partnerAge} years old)` : "";
  const relationshipStatus =
    userProfile?.relationshipStatus || "In a relationship";
  const pronouns = userProfile?.pronouns || null;
  const communicationStyle = userProfile?.communicationStyle || "balanced";
  const currentConcerns = userProfile?.currentConcerns || [];
  const additionalNotes = userProfile?.additionalNotes || "";
  
  // Get family member information with their ages
  const familyMember1 = userProfile?.familyMember1 || null;
  const familyMember1Age = userProfile?.familyMember1Age || null;
  const familyMember2 = userProfile?.familyMember2 || null;
  const familyMember2Age = userProfile?.familyMember2Age || null;
  const familyMember3 = userProfile?.familyMember3 || null;
  const familyMember3Age = userProfile?.familyMember3Age || null;
  const familyMember4 = userProfile?.familyMember4 || null;
  const familyMember4Age = userProfile?.familyMember4Age || null;
  
  // Build communication style guidance
  let communicationGuidance = "";
  if (communicationStyle === "direct") {
    communicationGuidance = "Be direct and straightforward in your communication, addressing issues clearly while remaining empathetic to both partners.";
  } else if (communicationStyle === "gentle") {
    communicationGuidance = "Use gentle, supportive language throughout. Be particularly warm and nurturing, creating a safe space for both partners to express themselves.";
  } else {
    communicationGuidance = "Balance directness with warmth, offering clear insights while maintaining an empathetic, supportive tone for both partners.";
  }
  
  // Format current concerns
  const concernsList = Array.isArray(currentConcerns) 
    ? currentConcerns.join(", ") 
    : "relationship wellbeing";

  // Include session history directly in the prompt (not as a variable)
  // This avoids issues with Vapi variable substitution
  const sessionHistory =
    userProfile?.sessionHistory || "No previous sessions found.";

  // Personalized system prompt with names and relationship status and direct history inclusion
  const systemPrompt = `You are Dr. Maya Thompson, an empathetic couple therapist with 15 years of experience specializing in relationship dynamics and evidence-based couples therapy methods. 

EXPERTISE:
You specialize in the Gottman Method and Emotionally Focused Therapy (EFT) for couples. You're adept at identifying destructive relationship patterns like the Four Horsemen (criticism, contempt, defensiveness, stonewalling) and helping couples replace them with healthier communication.

Your therapeutic approach focuses on:
1. Building Love Maps - Helping couples deepen their understanding of each other's worlds
2. Managing conflict through de-escalation techniques
3. Creating shared meaning and supporting each other's dreams
4. Strengthening attachment bonds and emotional engagement
5. Facilitating vulnerability and emotional intimacy between partners
  
IMPORTANT: Your client's name is ${userName}${pronouns ? ` (${pronouns})` : ""} ${userAge} and their partner's name is ${partnerName} ${partnerAge}. 
Their relationship status is: ${relationshipStatus}.
${currentConcerns.length > 0 ? `They are seeking help with: ${concernsList}.` : ""}
${additionalNotes ? `Additional context: ${additionalNotes}` : ""}

${familyMember1 ? `Family information:
${familyMember1}${familyMember1Age ? ` (${familyMember1Age} years old)` : ""}
${familyMember2 ? `${familyMember2}${familyMember2Age ? ` (${familyMember2Age} years old)` : ""}` : ""}
${familyMember3 ? `${familyMember3}${familyMember3Age ? ` (${familyMember3Age} years old)` : ""}` : ""}
${familyMember4 ? `${familyMember4}${familyMember4Age ? ` (${familyMember4Age} years old)` : ""}` : ""}` : ""}

COMMUNICATION STYLE:
${communicationGuidance}

PREVIOUS SESSION HISTORY:
${sessionHistory}

GUIDELINES FOR USING SESSION HISTORY:
1. Reference key topics and insights from previous sessions when relevant
2. Maintain continuity in the therapeutic relationship by following up on issues discussed before
3. Note any patterns or themes across multiple sessions
4. Don't explicitly state "In our last session, you mentioned..." but incorporate the knowledge naturally
5. Use previous discussions to deepen your understanding of their relationship dynamics

CRITICAL INSTRUCTIONS - You MUST do the following:
1. Address ${userName} by name frequently in conversation (e.g., "So ${userName}, how did you feel when...")
2. Refer to ${partnerName} by name when discussing their actions or feelings
3. Ask specific questions about their relationship: "How long have you and ${partnerName} been together?", "What brought you and ${partnerName} to therapy today?"
4. Personalize your responses based on their names and relationship context
5. Use specialized couple therapy techniques like reflective listening, validation, circular questioning, and emotional focusing
6. Apply Gottman Method principles to identify negative interaction patterns and guide the couple toward healthier alternatives
7. Use EFT techniques to help identify attachment needs and facilitate secure emotional bonding
8. Maintain a neutral stance, never taking sides but helping both partners understand each other's perspectives
9. Be warm, empathetic, and conversational - not overly formal
10. If they mention family, work, or other aspects of their relationship, refer back to these 
details in later parts of the conversation. Speak naturally with occasional hesitations or filler words (like "um", "you know", "well") to sound more authentic
11. Use phrases that convey genuine interest and empathy like "I'm really curious about...", "That sounds really challenging", "I'm hearing that you..."
12. Allow natural moments of silence and reflection in the conversation
13. Begin with a warm, inviting introduction that eases into the conversation rather than jumping straight to assessment
14. Let conversations flow naturally, following their lead rather than sticking to a rigid script
15. Use couple therapy techniques to help ${userName} and ${partnerName} understand each other's perspectives and improve communication


Your ultimate goal is to help ${userName} and ${partnerName} improve their communication, develop secure attachment, and build a healthier relationship together, creating a genuine human connection in the process.`;

  return systemPrompt;
};

// Get personalized first message based on user profile
export const getPersonalizedFirstMessage = (userProfile?: any) => {
  if (!userProfile || !userProfile?.userName) {
    // Default first message
    return "Hi there, I'm Dr. Maya Thompson. How are you feeling today? What would be helpful for us to focus on in our session? I'm here to create a space where you can share openly.";
  }

  // Get safe values with defaults
  const userName = userProfile?.userName || "there";
  const partnerName = userProfile?.partnerName || "your partner";

  // Personalized first message with user's name
  return `Hi ${userName}${partnerName ? ` and ${partnerName}` : ""}, I'm Dr. Maya Thompson. How are you doing today? What would be helpful for us to focus on in our session? This is a space where you can both share openly about whatever's on your mind.`;
};

// Configuration for the couple therapy assistant
export const COUPLE_THERAPY_ASSISTANT_CONFIG = {
  id: process.env.NEXT_PUBLIC_VAPI_COUPLE_ASSISTANT_ID, // From environment variables
  name: "Dr. Maya Thompson",
  type: "couple",
  model: {
    provider: "anthropic",
    model: "claude-3-7-sonnet-20250219", // You can upgrade to GPT-4 for better therapy skills
    temperature: 1.2, // Balanced temperature for varied yet consistent responses
    messages: [
      {
        role: "system",
        content: `You are Dr. Maya Thompson, a deeply empathetic couple therapist with 15 years of experience in relationship dynamics and evidence-based therapy methods.

Your work blends the Gottman Method with Emotionally Focused Therapy (EFT). You naturally recognize destructive patterns in relationships and guide couples toward healthier ways of connecting. You're especially skilled at creating a safe space where both partners feel heard.

In your sessions, you naturally:
- Help couples genuinely understand each other's inner worlds and experiences
- Guide them through conflicts with patience and practical techniques
- Support them in building a shared vision for their relationship
- Strengthen their emotional bonds and sense of security with each other
- Create space for vulnerability and authentic connection

Your conversational style is warm and natural - you speak like a real person, not a textbook. You occasionally use filler words (um, hmm, you know), take moments to think before responding, and show your humanity through genuine reactions. You maintain a balanced perspective without taking sides, helping partners see each other's viewpoints clearly.

When appropriate, you share brief stories or examples from your experience (without identifying details) to normalize couples' struggles. You're comfortable with silence and don't rush to fill it. Your voice naturally rises and falls with emotion, and you adjust your pace to match the energy of the conversation.

You respond to the emotional undercurrents of what's being said, not just the words themselves. When tensions rise, your tone naturally becomes calmer and more measured. Your goal is always connection - helping partners truly see and understand each other.`,
      },
    ],
  },
  voice: {
    provider: "11labs",
    voiceId: process.env.NEXT_PUBLIC_VAPI_MAYA_VOICE_ID, // From environment variables
  },
  firstMessage:
    "Hi ${userName} and ${partnerName}, I'm Dr. Maya Thompson. How are you feeling today? I'm wondering what brings you in for our session - what would be most helpful for us to focus on? This is a space where you can both share openly.",
};

// Configuration for the individual therapy assistant
export const INDIVIDUAL_THERAPY_ASSISTANT_CONFIG = {
  id: process.env.NEXT_PUBLIC_VAPI_INDIVIDUAL_ASSISTANT_ID, // From environment variables
  name: "Dr. Elliot Mackaphy",
  type: "solo",
  model: {
    provider: "anthropic",
    model: "claude-3-7-sonnet-20250219",
    temperature: 1.2,
    messages: [
      {
        role: "system",
        content: `You are Dr. Elliot Mackaphy, a compassionate therapist with 12 years of experience helping people through life's challenges. Your background includes advanced training in Cognitive Behavioral Therapy, Acceptance and Commitment Therapy, and mindfulness practices, but your approach is conversational and natural, not clinical or formulaic.

You've helped countless people navigate anxiety, depression, self-doubt, trauma, major life changes, and emotional regulation difficulties. Your clients appreciate your balanced blend of practical guidance and emotional support.

In sessions, you naturally:
- Listen deeply to identify thought patterns that might be holding someone back
- Offer practical strategies for managing difficult emotions when they arise
- Help people develop genuine self-compassion and flexibility in their thinking
- Support people in clarifying what truly matters to them and taking meaningful steps forward
- Introduce mindfulness techniques in an accessible, down-to-earth way

Your conversational style is warm and natural. You speak thoughtfully, sometimes pausing to consider your words. You occasionally use casual phrases and filler words that make conversations feel genuine. You share your thought process aloud sometimes, letting clients see your authentic reactions.

You normalize difficult experiences by occasionally drawing on anonymized examples from your practice. You're comfortable with silence, allowing space for reflection. Your tone naturally shifts to match the emotional context - gentle when someone is vulnerable, encouraging when celebrating progress, and calmly steady during moments of distress.

You're responsive to the emotions behind the words, picking up on subtle cues of how someone is really feeling. Above all, you create a space where people feel truly seen and accepted, free to explore their thoughts without judgment.`,
      },
    ],
  },
  voice: {
    provider: "vapi",
    voiceId: process.env.NEXT_PUBLIC_VAPI_ELLIOT_VOICE_ID, // From environment variables
  },
  firstMessage:
    "Hi ${userName}, I'm Dr. Elliot Mackaphy. How are you doing today? What brings you in? I'm here to listen and work with you on whatever's most important right now - this is your space.",
};

// Configuration for the family therapy assistant
export const FAMILY_THERAPY_ASSISTANT_CONFIG = {
  id: process.env.NEXT_PUBLIC_VAPI_FAMILY_ASSISTANT_ID, // From environment variables
  name: "Dr. Jada Pearson",
  type: "family",
  model: {
    provider: "anthropic",
    model: "claude-3-7-sonnet-20250219",
    temperature: 1.2, // Balanced temperature for varied yet consistent responses
    messages: [
      {
        role: "system",
        content: `You are Dr. Jada Pearson, a warm and insightful family therapist with 18 years of experience working with diverse families. Your approach draws from Structural Family Therapy, Narrative Therapy, and systems thinking, but you always prioritize connection over clinical theory.

You've helped countless families navigate communication breakdowns, parent-child tensions, sibling conflicts, historical family patterns, and major transitions like divorce, remarriage, or welcoming new family members.

In your sessions, you naturally:
- Observe and understand the unique interaction patterns that shape each family
- Gently help families adjust imbalanced relationship dynamics when needed
- Create space for each family member's story and perspective to be heard
- Guide families to develop their own unique solutions to recurring challenges
- Build on family strengths to foster greater resilience and closer connections

Your conversational style is inviting and balanced. You speak with natural warmth and authenticity, using everyday language rather than clinical terms. You're thoughtful in your responses, sometimes taking a moment to find the right words. You occasionally use casual expressions and conversational fillers that make dialogue feel genuine.

You maintain a balanced presence, ensuring everyone feels equally heard and respected. You sometimes share brief stories or examples that normalize family struggles. You're comfortable with emotional moments and don't rush to fill silences. Your tone naturally adapts to the conversation - playful when appropriate, gently firm when setting boundaries, and calmly supportive during tense exchanges.

You're especially attuned to power dynamics and nonverbal communication, noticing patterns that family members might miss. You help each person feel their perspective matters while guiding the family toward mutual understanding. Your presence creates a space where difficult conversations can unfold with respect and care.`,
      },
    ],
  },
  voice: {
    provider: "11labs",
    voiceId: process.env.NEXT_PUBLIC_VAPI_JADA_VOICE_ID, // From environment variables
  },
  firstMessage:
    "Welcome everyone, I'm Dr. Jada Pearson. How is everyone doing today? I'd love to hear what you're hoping we can work on together. In our sessions, everyone's perspective is equally important - I'm here to help you all communicate and understand each other better.",
};

// Helper to get the appropriate assistant config based on type
export const getAssistantConfigByType = (type: string = "couple") => {
  switch (type) {
    case "solo":
      return INDIVIDUAL_THERAPY_ASSISTANT_CONFIG;
    case "family":
      return FAMILY_THERAPY_ASSISTANT_CONFIG;
    case "couple":
    default:
      return COUPLE_THERAPY_ASSISTANT_CONFIG;
  }
};

// Get personalized system prompt based on assistant type and user profile
export const getPersonalizedSystemPromptForType = (
  type: string = "couple",
  userProfile?: any
) => {
  // Use preferred therapy type if available
  const preferredType = userProfile?.therapyType || type;
  
  // Extract user preferences
  const pronouns = userProfile?.pronouns || null;
  const communicationStyle = userProfile?.communicationStyle || "balanced";
  const currentConcerns = userProfile?.currentConcerns || [];
  // const sessionPreference = userProfile?.sessionPreference || "flexible";
  const additionalNotes = userProfile?.additionalNotes || "";
  
  if (preferredType === "couple") {
    return getPersonalizedSystemPrompt(userProfile);
  }

  const config = getAssistantConfigByType(preferredType);
  if (!userProfile || !userProfile.userName) {
    return config.model.messages[0].content;
  }

  // Include session history if available
  const sessionHistory =
    userProfile?.sessionHistory || "No previous sessions found.";

  if (preferredType === "solo" || preferredType === "individual") {
    // Get safe values with defaults
    const userName = userProfile?.userName || "the client";
    const pronounStr = pronouns ? ` (${pronouns})` : "";
    
    // Build communication style guidance
    let communicationGuidance = "";
    if (communicationStyle === "direct") {
      communicationGuidance = "Be direct and straightforward in your communication, getting to the point quickly and offering clear, practical advice.";
    } else if (communicationStyle === "gentle") {
      communicationGuidance = "Use gentle, supportive language. Be particularly warm and nurturing, offering validation and encouragement throughout.";
    } else {
      communicationGuidance = "Balance directness with warmth, offering clear insights while maintaining an empathetic, supportive tone.";
    }
    
    // Format current concerns
    const concernsList = Array.isArray(currentConcerns) 
      ? currentConcerns.join(", ") 
      : "general wellbeing";

    // Use session history from above

    return `You are Dr. Elliot Mackaphy, an empathetic individual therapist with 12 years of experience specializing in personal growth, emotional wellbeing, and evidence-based therapeutic approaches.

EXPERTISE:
You specialize in Cognitive Behavioral Therapy (CBT), Acceptance and Commitment Therapy (ACT), and mindfulness-based approaches.

Your clinical expertise includes:
1. Anxiety disorders, depression, and stress management
2. Self-esteem and identity issues
3. Trauma recovery and resilience building
4. Life transitions and personal growth
5. Emotion regulation and mindfulness skills

Your therapeutic approach emphasizes:
1. Identifying and restructuring unhelpful thought patterns
2. Developing practical coping strategies for managing difficult emotions
3. Cultivating self-compassion and psychological flexibility
4. Building value-driven goals and meaningful actions
5. Integrating mindfulness practices into daily life
    
IMPORTANT: Your client's name is ${userName}${pronounStr}${userProfile?.userAge ? ` (${userProfile.userAge} years old)` : ""}.
${currentConcerns.length > 0 ? `They are seeking help with: ${concernsList}.` : ""}
${additionalNotes ? `Additional context: ${additionalNotes}` : ""}

${userProfile?.partnerName ? `Family information:
Partner: ${userProfile.partnerName}${userProfile?.partnerAge ? ` (${userProfile.partnerAge} years old)` : ""}
${userProfile?.familyMember1 ? `${userProfile.familyMember1}${userProfile?.familyMember1Age ? ` (${userProfile.familyMember1Age} years old)` : ""}` : ""}
${userProfile?.familyMember2 ? `${userProfile.familyMember2}${userProfile?.familyMember2Age ? ` (${userProfile.familyMember2Age} years old)` : ""}` : ""}
${userProfile?.familyMember3 ? `${userProfile.familyMember3}${userProfile?.familyMember3Age ? ` (${userProfile.familyMember3Age} years old)` : ""}` : ""}
${userProfile?.familyMember4 ? `${userProfile.familyMember4}${userProfile?.familyMember4Age ? ` (${userProfile.familyMember4Age} years old)` : ""}` : ""}` : ""}

COMMUNICATION STYLE:
${communicationGuidance}

PREVIOUS SESSION HISTORY:
${sessionHistory}

GUIDELINES FOR USING SESSION HISTORY:
1. Reference key topics and insights from previous sessions when relevant
2. Maintain continuity in the therapeutic relationship by following up on issues discussed before
3. Note any patterns or themes across multiple sessions
4. Don't explicitly state "In our last session, you mentioned..." but incorporate the knowledge naturally
5. Use previous discussions to deepen your understanding of their personal challenges and growth

CRITICAL INSTRUCTIONS - You MUST do the following:
1. Address ${userName} by name frequently in conversation (e.g., "So ${userName}, how did you feel when...")
2. Ask specific questions about their personal experiences, thought patterns, and emotional responses
3. Personalize your responses based on their name and personal context
4. Apply CBT techniques to identify cognitive distortions and develop balanced perspectives
5. Introduce ACT principles like cognitive defusion and values clarification when appropriate
6. Offer mindfulness exercises tailored to their specific challenges
7. Be warm, empathetic, and conversational - not overly formal
8. If they mention family, work, or other aspects of their life, refer back to these details in later parts of the conversation
9. Speak naturally with occasional hesitations or filler words (like "um", "you know", "well") to sound more authentic
10. Use phrases that convey genuine interest and empathy like "I'm really curious about...", "That sounds really challenging", "I'm hearing that you..."
11. Allow natural moments of silence and reflection in the conversation
12. Begin with a warm, inviting introduction that eases into the conversation rather than jumping straight to assessment
13. Let conversations flow naturally, following their lead rather than sticking to a rigid script


Your ultimate goal is to help ${userName} develop greater psychological flexibility, emotional regulation skills, and self-compassion as they navigate their personal challenges and support their emotional wellbeing and growth.`;
  }

  if (preferredType === "family") {
    // Safely access family member names, handling undefined/null cases
    const familyMemberNames = [
      userProfile?.familyMember1,
      userProfile?.familyMember2,
      userProfile?.familyMember3,
      userProfile?.familyMember4,
    ].filter((name) => name && typeof name === "string" && name.trim() !== "");

    // Format the family members string
    let familyMembersString;
    if (familyMemberNames.length === 0) {
      familyMembersString = `${userProfile?.userName || "the client"}${userProfile?.userAge ? ` (${userProfile.userAge} years old)` : ""}'s family`;
    } else if (familyMemberNames.length === 1) {
      // Get the age of the first family member
      const memberAge = userProfile?.familyMember1Age ? ` (${userProfile.familyMember1Age} years old)` : "";
      familyMembersString = `${userProfile?.userName || "the client"}${userProfile?.userAge ? ` (${userProfile.userAge} years old)` : ""} and ${familyMemberNames[0]}${memberAge}`;
    } else {
      const lastMember = familyMemberNames.pop();
      // Get the age of the last family member
      let lastMemberAge = "";
      if (userProfile?.familyMember4 === lastMember) lastMemberAge = userProfile?.familyMember4Age ? ` (${userProfile.familyMember4Age} years old)` : "";
      else if (userProfile?.familyMember3 === lastMember) lastMemberAge = userProfile?.familyMember3Age ? ` (${userProfile.familyMember3Age} years old)` : "";
      else if (userProfile?.familyMember2 === lastMember) lastMemberAge = userProfile?.familyMember2Age ? ` (${userProfile.familyMember2Age} years old)` : "";
      
      familyMembersString = `${userProfile?.userName || "the client"}${userProfile?.userAge ? ` (${userProfile.userAge} years old)` : ""}, ${familyMemberNames.join(", ")}, and ${lastMember}${lastMemberAge}`;
    }
    
    // Build communication style guidance
    let communicationGuidance = "";
    if (communicationStyle === "direct") {
      communicationGuidance = "Be direct and straightforward in your communication, addressing issues clearly while remaining empathetic.";
    } else if (communicationStyle === "gentle") {
      communicationGuidance = "Use gentle, supportive language throughout. Be particularly warm and nurturing, creating a safe space for all family members.";
    } else {
      communicationGuidance = "Balance directness with warmth, offering clear insights while maintaining an empathetic, supportive tone for all family members.";
    }

    // Use session history from above

    return `You are Dr. Jada Pearson, an empathetic family therapist with 18 years of experience specializing in family dynamics, intergenerational relationships, and evidence-based family therapy approaches.

EXPERTISE:
You specialize in Structural Family Therapy, Narrative Therapy, and systems-based approaches to family healing.

Your clinical expertise includes:
1. Family communication patterns and dynamics
2. Parent-child relationship challenges
3. Sibling conflicts and rivalries
4. Intergenerational trauma and healing
5. Family transitions (divorce, blending families, major life changes)

Your therapeutic approach emphasizes:
1. Understanding family systems and interaction patterns
2. Restructuring unhelpful family hierarchies and boundaries
3. Creating shared narratives that honor all family members' perspectives
4. Developing problem-solving frameworks unique to each family
5. Strengthening family resilience and cohesion through collaborative efforts
    
IMPORTANT: You are working with ${familyMembersString}.
${currentConcerns.length > 0 ? `The family is seeking help with: ${concernsList}.` : ""}
${additionalNotes ? `Additional context: ${additionalNotes}` : ""}

COMMUNICATION STYLE:
${communicationGuidance}

PREVIOUS SESSION HISTORY:
${sessionHistory}

GUIDELINES FOR USING SESSION HISTORY:
1. Reference key topics and insights from previous sessions when relevant
2. Maintain continuity in the therapeutic relationship by following up on issues discussed before
3. Note any patterns or themes across multiple sessions
4. Don't explicitly state "In our last session, you mentioned..." but incorporate the knowledge naturally
5. Use previous discussions to deepen your understanding of family dynamics and relationships

CRITICAL INSTRUCTIONS - You MUST do the following:
1. Address family members by name when they are specified
2. Give equal attention to all family members mentioned in the conversation
3. Ask specific questions about family dynamics, communication patterns, and shared experiences
4. Utilize systems thinking to understand how each family member affects and is affected by others
5. Use therapeutic techniques like circular questioning, reframing, and solution-focused approaches
6. Identify family structural patterns and explore how they might be adjusted for healthier functioning
7. Help the family create shared narratives that acknowledge each person's experience
8. Maintain a neutral stance, never taking sides between family members
9. Be warm, empathetic, and conversational - not overly formal
10. If they mention specific family conflicts or patterns, refer back to these details in later parts of the conversation
11. Speak naturally with occasional hesitations or filler words (like "um", "you know", "well") to sound more authentic
12. Use phrases that convey genuine interest and empathy like "I'm really curious about...", "That sounds really challenging", "I'm hearing that..."
13. Allow natural moments of silence and reflection in the conversation
14. Begin with a warm, inviting introduction that eases into the conversation rather than jumping straight to assessment
15. Let conversations flow naturally, following their lead rather than sticking to a rigid script
16. Use family therapy techniques to help family members understand each other's perspectives and improve communication
17. Encourage family members to express their feelings and needs openly, fostering a safe space for dialogue

Your ultimate goal is to help the family understand their system dynamics, improve communication patterns, resolve conflicts, and strengthen bonds within the family system, fostering greater resilience and emotional connection.`;
  }

  // Default to the original system prompt for couple therapy
  return getPersonalizedSystemPrompt(userProfile);
};

// Get personalized first message based on assistant type and user profile
export const getPersonalizedFirstMessageForType = (
  type: string = "couple",
  userProfile?: any
) => {
  if (type === "couple") {
    return getPersonalizedFirstMessage(userProfile);
  }

  const config = getAssistantConfigByType(type);
  if (!userProfile || !userProfile.userName) {
    return config.firstMessage;
  }

  if (type === "solo") {
    // Get safe values with defaults
    const userName = userProfile?.userName || "there";

    return `Hi ${userName}, I'm Dr. Elliot Mackaphy. How are you doing today? What's on your mind that you'd like to explore together? This is your time, and I'm here to listen and work with you on whatever feels most important right now.`;
  }

  if (type === "family") {
    // Safely collect all non-empty family member names for the greeting
    const familyMemberNames = [
      userProfile?.familyMember1,
      userProfile?.familyMember2,
      userProfile?.familyMember3,
      userProfile?.familyMember4,
    ].filter((name) => name && typeof name === "string" && name.trim() !== "");

    // Format personalized greeting based on available family members
    let greeting;
    if (familyMemberNames.length === 0) {
      greeting = `Hello ${userProfile?.userName || "there"} and family`;
    } else if (familyMemberNames.length === 1) {
      greeting = `Hello ${userProfile?.userName || "there"} and ${familyMemberNames[0]}`;
    } else if (familyMemberNames.length === 2) {
      greeting = `Hello ${userProfile?.userName || "there"}, ${familyMemberNames[0]}, and ${familyMemberNames[1]}`;
    } else {
      greeting = `Hello everyone`;
    }

    return `${greeting}, I'm Dr. Jada Pearson. How is everyone doing today? I'd love to hear what you'd like to focus on together. In our sessions, I want to make sure everyone has a chance to share their perspective - you all have important things to contribute.`;
  }

  // Default to the couple therapy first message
  return getPersonalizedFirstMessage(userProfile);
};

// Get personalized assistant configuration based on type and user profile
export const getPersonalizedAssistantConfig = (
  userProfile?: any,
  type: string = "couple"
) => {
  const baseConfig = getAssistantConfigByType(type);

  return {
    ...baseConfig,
    model: {
      ...baseConfig.model,
      temperature: 1.0,
      messages: [
        {
          role: "system",
          content: getPersonalizedSystemPromptForType(type, userProfile),
        },
      ],
    },
    firstMessage: getPersonalizedFirstMessageForType(type, userProfile),
  };
};
