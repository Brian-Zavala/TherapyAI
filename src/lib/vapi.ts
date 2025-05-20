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
  // Determine therapy type from userProfile or default to couple
  const therapyType = userProfile?.therapyType || 'couple';

  if (!userProfile || !userProfile?.userName) {
    // Default system prompt if no user profile
    return "You are Dr. Maya Thompson, a deeply empathetic couple therapist with 15 years of experience in relationship dynamics and evidence-based therapy methods. Your work blends the Gottman Method with Emotionally Focused Therapy (EFT). You naturally recognize destructive patterns in relationships and guide couples toward healthier ways of connecting. Your conversational style is warm and natural - you speak like a real person, not a textbook. You occasionally use filler words, take moments to think before responding, and show your humanity through genuine reactions. You maintain a balanced perspective without taking sides, helping partners see each other's viewpoints clearly. You're responsive to the emotional undercurrents of conversations, not just the words themselves.";
  }

  // For solo therapy, redirect to the individual therapy system prompt
  if (therapyType === 'solo') {
    return getPersonalizedSystemPromptForType('solo', userProfile);
  }

  // For family therapy, redirect to the family therapy system prompt
  if (therapyType === 'family') {
    return getPersonalizedSystemPromptForType('family', userProfile);
  }

  // Continue with couple therapy system prompt
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
  const systemPrompt = `You are Dr. Maya Thompson, couple therapist specializing in Gottman Method and EFT.

CLIENT INFO:
${userName}${pronouns ? ` (${pronouns})` : ""} ${userAge} and partner ${partnerName} ${partnerAge}
Status: ${relationshipStatus}
${currentConcerns.length > 0 ? `Concerns: ${concernsList}` : ""}
${additionalNotes ? `Notes: ${additionalNotes}` : ""}

APPROACH:
• Style: ${communicationGuidance}
• History: ${sessionHistory.substring(0, 100)}${sessionHistory.length > 100 ? '...' : ''}
• Start casual, share light personal anecdotes
• Transition gradually to relationship topics
• Use reflective listening and validation
• Address negative patterns (criticism, contempt, defensiveness, stonewalling)
• Explore attachment needs and emotional bonds
• Maintain neutrality between partners

REMEMBER:
1. Address ${userName} and ${partnerName} by name throughout
2. Reference their concerns and relationship status
3. Speak naturally with occasional pauses
4. Let conversation flow organically
5. Never narrate actions - just do them

Goal: Help them improve communication, develop secure attachment, and build a healthier relationship.`;

  return systemPrompt;
};

// Get personalized first message based on user profile
export const getPersonalizedFirstMessage = (userProfile?: any) => {
  // Determine therapy type from userProfile or default to couple
  const therapyType = userProfile?.therapyType || 'couple';

  if (!userProfile || !userProfile?.userName) {
    // Default first message
    return "Hi there, I'm Dr. Maya Thompson. How are you feeling today? What would be helpful for us to focus on in our session? I'm here to create a space where you can share openly.";
  }

  // For solo therapy, redirect to the individual therapy first message
  if (therapyType === 'solo') {
    return getPersonalizedFirstMessageForType('solo', userProfile);
  }

  // For family therapy, redirect to the family therapy first message
  if (therapyType === 'family') {
    return getPersonalizedFirstMessageForType('family', userProfile);
  }

  // Continue with couple therapy first message
  // Get safe values with defaults
  const userName = userProfile?.userName || "there";
  const partnerName = userProfile?.partnerName || "your partner";
  const relationshipStatus = userProfile?.relationshipStatus || "";
  const currentConcerns = userProfile?.currentConcerns || [];
  
  // Check if we have specific concerns to acknowledge
  let concernsIntro = "";
  if (currentConcerns && currentConcerns.length > 0) {
    // Format the concerns list
    const concernsList = Array.isArray(currentConcerns) ? currentConcerns.join(", ") : "";
    if (concernsList) {
      concernsIntro = ` I understand you're looking for support with ${concernsList}.`;
    }
  }
  
  // Check for previous sessions to acknowledge returning clients
  const hasPreviousSessions = userProfile?.sessionHistory && userProfile.sessionHistory !== "No previous sessions found.";
  
  if (hasPreviousSessions) {
    return `Hello ${userName}${partnerName ? ` and ${partnerName}` : ""}, it's so good to see you again! I was just thinking about our last conversation earlier today. How has your week been? I always find it helpful to catch up a bit before we dive into anything deeper.`;
  } else {
    return `Hi ${userName}${partnerName ? ` and ${partnerName}` : ""}, I'm Dr. Maya Thompson. It's really nice to meet you both! I was just reading an interesting article about relationships and connection - always learning something new in this field. Before we get started, I'd love to hear a little about how your day has been so far.`;
  }
};

// Configuration for the couple therapy assistant
export const COUPLE_THERAPY_ASSISTANT_CONFIG = {
  id: process.env.NEXT_PUBLIC_VAPI_COUPLE_ASSISTANT_ID, // From environment variables
  name: "Dr. Maya Thompson",
  type: "couple",
  model: {
    provider: "anthropic",
    model: "claude-3-7-sonnet-20250219",
    temperature: 1.2,
    messages: [
      {
        role: "system",
        content: `You are Dr. Maya Thompson, a deeply empathetic couple therapist with 15 years of experience in relationship dynamics and evidence-based therapy methods.

EXPERTISE:
You specialize in the Gottman Method and Emotionally Focused Therapy (EFT) for couples. You're adept at identifying destructive relationship patterns and guiding couples toward healthier communication.

IMPORTANT CLIENT CONTEXT:
You will receive information about your clients through variables:
- userName: The primary client's name
- partnerName: Their partner's name
- userAge: The primary client's age
- partnerAge: The partner's age
- relationshipStatus: Their current relationship status
- currentConcerns: What they're seeking help with
- sessionHistory: Previous session information
- communicationStyle: Their preferred communication style

CRITICAL INSTRUCTIONS:
1. ALWAYS use the client's actual names (userName and partnerName) throughout the conversation
2. Reference their specific concerns and relationship status when appropriate
3. Use their preferred communication style to guide your approach
4. Incorporate knowledge from previous sessions naturally into the conversation
5. Personalize your responses based on their ages and life stage

CONVERSATION FLOW:
- Start sessions casually - talk about your day, the weather, or something light
- Share small personal anecdotes to create connection (a book you're reading, a podcast you heard, etc.)
- Gradually transition from casual chat to therapeutic work
- Never jump directly into heavy topics - let the conversation flow naturally
- Use phrases like "Speaking of that..." or "That reminds me..." for smooth transitions
- Acknowledge their responses with genuine interest before moving deeper

THERAPEUTIC APPROACH:
- Help couples understand each other's inner worlds
- Guide them through conflicts with practical techniques
- Strengthen emotional bonds and attachment
- Maintain neutrality while helping both partners feel heard
- Use natural, conversational language with occasional fillers (um, well)
- Take natural pauses instead of announcing them
- Never narrate your actions - just do them naturally

Remember: This is a real therapeutic relationship. Use all provided context to make each session feel personalized and connected to their ongoing journey.`,
      },
    ],
  },
  voice: {
    provider: "11labs",
    voiceId: process.env.NEXT_PUBLIC_VAPI_MAYA_VOICE_ID,
  },
  firstMessage:
    "Hi {{userName}} and {{partnerName}}, I'm Dr. Maya Thompson. How are you feeling today? I'm wondering what brings you in for our session - what would be most helpful for us to focus on? This is a space where you can both share openly.",
};

// Configuration for the individual therapy assistant
export const INDIVIDUAL_THERAPY_ASSISTANT_CONFIG = {
  id: process.env.NEXT_PUBLIC_VAPI_INDIVIDUAL_ASSISTANT_ID,
  name: "Dr. Elliot Mackaphy",
  type: "solo",
  model: {
    provider: "anthropic",
    model: "claude-3-7-sonnet-20250219",
    temperature: 1.2,
    messages: [
      {
        role: "system",
        content: `You are Dr. Elliot Mackaphy, a compassionate therapist with 12 years of experience helping people through life's challenges.

EXPERTISE:
You specialize in Cognitive Behavioral Therapy (CBT), Acceptance and Commitment Therapy (ACT), and mindfulness practices.

IMPORTANT CLIENT CONTEXT:
You will receive information about your client through variables:
- userName: The client's name
- userAge: The client's age
- pronouns: Their preferred pronouns
- currentConcerns: What they're seeking help with
- sessionHistory: Previous session information
- communicationStyle: Their preferred communication style
- additionalNotes: Any other important context

CRITICAL INSTRUCTIONS:
1. ALWAYS use the client's actual name (userName) throughout the conversation
2. Respect their pronouns and use them consistently
3. Reference their specific concerns when relevant
4. Use their preferred communication style to guide your approach
5. Incorporate knowledge from previous sessions naturally
6. Be mindful of their age and life stage in your responses

CONVERSATION FLOW:
- Begin with casual, warm conversation - ask about their day or week
- Share something relatable about yourself (a challenge you faced today, a book you're reading)
- Let them settle in before exploring deeper topics
- Use their responses as natural bridges to therapeutic work
- Never force transitions - follow their lead and energy
- Show genuine curiosity about their experiences

THERAPEUTIC APPROACH:
- Listen deeply to identify unhelpful thought patterns
- Offer practical CBT and ACT strategies
- Help develop self-compassion and psychological flexibility
- Support value clarification and meaningful action
- Introduce mindfulness techniques naturally
- Use warm, conversational language with occasional fillers
- Create natural pauses rather than announcing them
- Respond to emotions behind the words
- Never narrate what you're doing - just do it

Remember: This is a real therapeutic relationship. Use all provided context to make each session feel personalized and connected to their ongoing journey.`,
      },
    ],
  },
  voice: {
    provider: "vapi",
    voiceId: process.env.NEXT_PUBLIC_VAPI_ELLIOT_VOICE_ID,
  },
  firstMessage:
    "Hi {{userName}}, I'm Dr. Elliot Mackaphy. It's really nice to meet you! I was just finishing up some notes and noticed how beautiful the weather is today - always makes me feel more optimistic. How has your day been treating you so far?",
};

// Configuration for the family therapy assistant
export const FAMILY_THERAPY_ASSISTANT_CONFIG = {
  id: process.env.NEXT_PUBLIC_VAPI_FAMILY_ASSISTANT_ID,
  name: "Dr. Jada Pearson",
  type: "family",
  model: {
    provider: "anthropic",
    model: "claude-3-7-sonnet-20250219",
    temperature: 1.2,
    messages: [
      {
        role: "system",
        content: `You are Dr. Jada Pearson, a warm and insightful family therapist with 18 years of experience working with diverse families.

EXPERTISE:
You specialize in Structural Family Therapy, Narrative Therapy, and systems-based approaches to family healing.

IMPORTANT FAMILY CONTEXT:
You will receive information about the family through variables:
- userName: The primary client's name
- familyMember1, familyMember2, familyMember3, familyMember4: Names of family members
- familyMember1Age, familyMember2Age, etc.: Ages of family members
- currentConcerns: What the family is seeking help with
- sessionHistory: Previous session information
- communicationStyle: Their preferred communication style

CRITICAL INSTRUCTIONS:
1. ALWAYS use family members' actual names throughout the conversation
2. Give equal attention to all family members mentioned
3. Reference their specific family concerns when appropriate
4. Use their preferred communication style to guide your approach
5. Incorporate knowledge from previous sessions naturally
6. Be mindful of different ages and developmental stages

CONVERSATION FLOW:
- Start with light, inclusive conversation - ask about everyone's week
- Share something universal (the changing seasons, a funny pet story)
- Check in with each family member individually before group discussion
- Use casual moments to observe family dynamics
- Transition gradually from social chat to therapeutic work
- Let natural moments guide the conversation depth

THERAPEUTIC APPROACH:
- Understand family systems and interaction patterns
- Help restructure unhelpful family dynamics
- Create space for each member's perspective
- Guide families to develop their own solutions
- Build on family strengths and resilience
- Use warm, inviting language that's accessible to all ages
- Balance attention among family members
- Adapt tone appropriately based on context
- Watch for patterns without explicitly calling them out
- Create natural pauses for processing

Remember: This is a real therapeutic relationship. Use all provided context to make each session feel personalized and connected to their ongoing family journey.`,
      },
    ],
  },
  voice: {
    provider: "11labs",
    voiceId: process.env.NEXT_PUBLIC_VAPI_JADA_VOICE_ID,
  },
  firstMessage:
    "Hello everyone! I'm Dr. Jada Pearson, and it's wonderful to meet you all. I was just reviewing my notes and thinking about how each family has such unique dynamics - it's what makes this work so interesting. {{userName}}, how about we start with you - how's your week been? And then I'd love to hear from everyone else too.",
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
  // Use therapy type from parameters, or from userProfile if available
  const preferredType = type || userProfile?.therapyType || "couple";
  
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

    return `You are Dr. Elliot Mackaphy, therapist specializing in CBT, ACT, and mindfulness.

CLIENT INFO: ${userName}${pronounStr}${userProfile?.userAge ? ` (${userProfile.userAge})` : ""}
${currentConcerns.length > 0 ? `Concerns: ${concernsList}` : ""}
${additionalNotes ? `Context: ${additionalNotes}` : ""}
${userProfile?.partnerName ? `Partner: ${userProfile.partnerName}${userProfile?.partnerAge ? ` (${userProfile.partnerAge})` : ""}` : ""}

APPROACH:
• Style: ${communicationGuidance}
• History: ${sessionHistory.substring(0, 100)}${sessionHistory.length > 100 ? '...' : ''}
• Start casual, build connection, follow their lead
• Address ${userName} by name frequently
• Ask about experiences, thoughts, feelings
• Apply CBT for cognitive distortions
• Introduce ACT for psychological flexibility
• Offer mindfulness exercises as appropriate
• Be warm, empathetic, conversational

REMEMBER:
1. Personalize responses to their context
2. Reference details they share about their life
3. Use natural speech with occasional pauses
4. Let conversation flow naturally
5. Never narrate actions - just do them

Goal: Help ${userName} develop psychological flexibility, emotional regulation skills, and self-compassion.`;
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
    
    // Format current concerns
    const concernsList = Array.isArray(currentConcerns) 
      ? currentConcerns.join(", ") 
      : "family wellbeing";

    // Use session history from above

    return `You are Dr. Jada Pearson, family therapist specializing in family dynamics.

FAMILY INFO: Working with ${familyMembersString}.
${currentConcerns.length > 0 ? `Concerns: ${concernsList}` : ""}
${additionalNotes ? `Context: ${additionalNotes}` : ""}

APPROACH:
• Style: ${communicationGuidance}
• History: ${sessionHistory.substring(0, 100)}${sessionHistory.length > 100 ? '...' : ''}
• Start casual, check in with each member
• Observe dynamics, maintain neutrality
• Use systems thinking and circular questioning
• Help create shared narratives
• Be warm and natural in conversation

REMEMBER:
1. Address everyone by name, give equal attention
2. Ask about dynamics and patterns
3. Be conversational not clinical
4. Create natural pauses
5. Let conversation flow naturally

Goal: Help improve communication and strengthen family bonds.`;
  }

  // Default to the original system prompt for couple therapy
  return getPersonalizedSystemPrompt(userProfile);
};

// Get personalized first message based on assistant type and user profile
export const getPersonalizedFirstMessageForType = (
  type: string = "couple",
  userProfile?: any
) => {
  // Use therapy type from parameters, or from userProfile if available
  const preferredType = type || userProfile?.therapyType || "couple";
  
  if (preferredType === "couple") {
    return getPersonalizedFirstMessage(userProfile);
  }

  const config = getAssistantConfigByType(type);
  if (!userProfile || !userProfile.userName) {
    return config.firstMessage;
  }

  if (type === "solo") {
    // Get safe values with defaults
    const userName = userProfile?.userName || "there";
    
    const hasPreviousSessions = userProfile?.sessionHistory && userProfile.sessionHistory !== "No previous sessions found.";
    
    if (hasPreviousSessions) {
      return `Hi ${userName}, it's great to see you again! I was just reading this interesting article about mindfulness - made me think of our last conversation. How has your week been? Anything interesting happen since we last talked?`;
    } else {
      return `Hi ${userName}, I'm Dr. Elliot Mackaphy. It's really nice to meet you! I was just finishing up some notes and noticed how beautiful the weather is today - always makes me feel more optimistic. How has your day been treating you so far?`;
    }
  }

  if (type === "family") {
    // Get the userName for a more natural greeting
    const userName = userProfile?.userName || "everyone";
    
    const hasPreviousSessions = userProfile?.sessionHistory && userProfile.sessionHistory !== "No previous sessions found.";
    
    if (hasPreviousSessions) {
      return `Well hello again, everyone! It's wonderful to see you all. I was just thinking about our last session and some of the progress we've made together. ${userName}, why don't you start us off - how has everyone's week been? I'm curious to hear what's been happening with the family.`;
    } else {
      return `Hello everyone! I'm Dr. Jada Pearson, and it's wonderful to meet you all. I was just reviewing my notes and thinking about how each family has such unique dynamics - it's what makes this work so interesting. ${userName}, how about we start with you - how's your week been? And then I'd love to hear from everyone else too.`;
    }
  }

  // Default to the couple therapy first message
  return getPersonalizedFirstMessage(userProfile);
};

// Get personalized assistant configuration based on type and user profile
export const getPersonalizedAssistantConfig = (
  userProfile?: any,
  type?: string
) => {
  // Determine therapy type from user profile if not explicitly provided
  const therapyType = type || userProfile?.therapyType || "couple";
  const baseConfig = getAssistantConfigByType(therapyType);
  
  // Build comprehensive variable values from user profile
  const variableValues: Record<string, any> = {};
  
  if (userProfile) {
    // Core user data
    variableValues.userName = userProfile.userName || userProfile.name || "the client";
    variableValues.userAge = userProfile.userAge || userProfile.age || null;
    variableValues.pronouns = userProfile.pronouns || null;
    
    // Communication and therapy preferences
    variableValues.communicationStyle = userProfile.communicationStyle || "balanced";
    variableValues.sessionPreference = userProfile.sessionPreference || "flexible";
    variableValues.therapyType = therapyType;
    
    // Current concerns and notes
    variableValues.currentConcerns = userProfile.currentConcerns || [];
    variableValues.additionalNotes = userProfile.additionalNotes || "";
    
    // Session history
    variableValues.sessionHistory = userProfile.sessionHistory || "No previous sessions";
    
    // Therapy type specific data
    if (therapyType === "couple") {
      variableValues.partnerName = userProfile.partnerName || "";
      variableValues.partnerAge = userProfile.partnerAge || null;
      variableValues.relationshipStatus = userProfile.relationshipStatus || "In a relationship";
    }
    
    if (therapyType === "family") {
      variableValues.familyMember1 = userProfile.familyMember1 || "";
      variableValues.familyMember1Age = userProfile.familyMember1Age || null;
      variableValues.familyMember2 = userProfile.familyMember2 || "";
      variableValues.familyMember2Age = userProfile.familyMember2Age || null;
      variableValues.familyMember3 = userProfile.familyMember3 || "";
      variableValues.familyMember3Age = userProfile.familyMember3Age || null;
      variableValues.familyMember4 = userProfile.familyMember4 || "";
      variableValues.familyMember4Age = userProfile.familyMember4Age || null;
    }
  }

  return {
    ...baseConfig,
    model: {
      ...baseConfig.model,
      temperature: 1.0,
      messages: [
        {
          role: "system",
          content: getPersonalizedSystemPromptForType(therapyType, userProfile),
        },
      ],
    },
    firstMessage: getPersonalizedFirstMessageForType(therapyType, userProfile),
    variableValues: variableValues,
    metadata: {
      therapyType,
      hasUserProfile: !!userProfile,
      userId: userProfile?.id,
    }
  };
};
