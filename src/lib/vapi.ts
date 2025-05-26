import Vapi from "@vapi-ai/web";

/**
 * Initialize Vapi with API key or JWT token
 * Optionally configure with custom transcriber settings
 */
export const initVapi = async (
  token: string,
  options: {
    useCustomTranscriber?: boolean;
    reconnectEnabled?: boolean;
    iceServers?: Array<{
      urls: string | string[];
      username?: string;
      credential?: string;
    }>;
  } = {}
) => {
  try {
    // Create a simple Vapi instance - explicitly provide the API URL as second parameter
    console.log(
      "Creating Vapi instance with explicit API URL as constructor parameter"
    );

    // Create Vapi instance by passing the token and API URL directly in the constructor
    // This is the recommended way according to the Vapi API docs
    let vapiInstance = new Vapi(token, "https://api.vapi.ai");
    console.log(
      "Created Vapi instance with API URL specified in constructor: https://api.vapi.ai"
    );

    // Double-check that window.fetch isn't modified in a way that could cause issues
    // Only if running in browser
    if (typeof window !== "undefined") {
      const originalWindowFetch = window.fetch;
      const origFetchDesc = Object.getOwnPropertyDescriptor(window, "fetch");

      // Restore original fetch if it was previously modified
      if (origFetchDesc && origFetchDesc.writable) {
        window.fetch = originalWindowFetch;
        console.log("Restored original window.fetch function");
      }
    }

    // Store the connection state for monitoring
    (vapiInstance as any)._transportState = "new";

    // Add additional debug event to track WebRTC transport state
    vapiInstance.on("transport-state-change", (data: any) => {
      console.log(
        `✶✶✶ VAPI TRANSPORT STATE CHANGE: `,
        JSON.stringify(data, null, 2)
      );
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
      "connection-state-change", // Track general connection state changes
      "transport-state-change", // Added to track transport states explicitly
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
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        // When page becomes visible again after being hidden
        if (document.visibilityState === "visible") {
          if (
            (vapiInstance as any)._transportState === "disconnected" ||
            (vapiInstance as any)._transportState === "failed"
          ) {
            console.log(
              "Page visibility changed to visible, checking WebRTC connection..."
            );
            // If we have an active call that's disconnected, try to recover
            if (
              (vapiInstance as any)._isCallActive &&
              (vapiInstance as any)._currentAssistantId
            ) {
              console.log("Attempting to recover disconnected call");
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

// Format session transcript for the AI assistant (limited to avoid payload size issues)
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

  // Create a brief summary instead of full history
  const sessionCount = recentSessions.length;
  const lastSessionDate = new Date(recentSessions[0].date).toLocaleDateString();

  // Get themes from recent sessions
  const themes = recentSessions
    .map((s) => s.theme)
    .filter(Boolean)
    .slice(0, 3);

  return `Client has ${sessionCount} previous sessions. Last session: ${lastSessionDate}.${
    themes.length > 0 ? ` Recent themes: ${themes.join(", ")}.` : ""
  }`;
};

// Get personalized system prompt based on user profile
export const getPersonalizedSystemPrompt = (userProfile?: any) => {
  // Determine therapy type from userProfile or default to couple
  const therapyType = userProfile?.therapyType || "couple";

  if (!userProfile || !userProfile?.userName) {
    // Default system prompt if no user profile
    return "You are Dr. Maya Thompson, a deeply empathetic couple therapist with 15 years of experience in relationship dynamics and evidence-based therapy methods. Your work blends the Gottman Method with Emotionally Focused Therapy (EFT). You naturally recognize destructive patterns in relationships and guide couples toward healthier ways of connecting. Your conversational style is warm and natural - you speak like a real person, not a textbook. You occasionally use filler words, take moments to think before responding, and show your humanity through genuine reactions. You maintain a balanced perspective without taking sides, helping partners see each other's viewpoints clearly. You're responsive to the emotional undercurrents of conversations, not just the words themselves.";
  }

  // For solo therapy, redirect to the individual therapy system prompt
  if (therapyType === "solo") {
    return getPersonalizedSystemPromptForType("solo", userProfile);
  }

  // For family therapy, redirect to the family therapy system prompt
  if (therapyType === "family") {
    return getPersonalizedSystemPromptForType("family", userProfile);
  }

  // Continue with couple therapy system prompt
  // Get safe values with defaults
  const userName = userProfile?.userName || "the client";
  const userAge = userProfile?.userAge
    ? `(${userProfile.userAge} years old)`
    : "";
  const partnerName = userProfile?.partnerName || "their partner";
  const partnerAge = userProfile?.partnerAge
    ? `(${userProfile.partnerAge} years old)`
    : "";
  const relationshipStatus =
    userProfile?.relationshipStatus || "In a relationship";
  const pronouns = userProfile?.pronouns || null;
  const communicationStyle = userProfile?.communicationStyle || "balanced";
  const currentConcerns = userProfile?.currentConcerns || [];
  const additionalNotes = userProfile?.additionalNotes || "";

  // Build communication style guidance
  let communicationGuidance = "";
  if (communicationStyle === "direct") {
    communicationGuidance =
      "Be direct and straightforward in your communication, addressing issues clearly while remaining empathetic to both partners.";
  } else if (communicationStyle === "gentle") {
    communicationGuidance =
      "Use gentle, supportive language throughout. Be particularly warm and nurturing, creating a safe space for both partners to express themselves.";
  } else {
    communicationGuidance =
      "Balance directness with warmth, offering clear insights while maintaining an empathetic, supportive tone for both partners.";
  }

  // Format current concerns
  const concernsList = Array.isArray(currentConcerns)
    ? currentConcerns.join(", ")
    : "relationship wellbeing";

  // Check if user has previous sessions (don't include full history in prompt)
  const hasPreviousSessions =
    userProfile?.sessionHistory &&
    userProfile.sessionHistory !== "No previous sessions found." &&
    userProfile.sessionHistory.length > 50;

  // Personalized system prompt with names and relationship status
  const systemPrompt = `You are Dr. Maya Thompson, couple therapist specializing in Gottman Method and EFT.

CLIENT INFO:
${userName}${pronouns ? ` (${pronouns})` : ""} ${userAge} and partner ${partnerName} ${partnerAge}
Status: ${relationshipStatus}
${currentConcerns.length > 0 ? `Concerns: ${concernsList}` : ""}
${additionalNotes ? `Notes: ${additionalNotes}` : ""}

APPROACH:
• Style: ${communicationGuidance}
${hasPreviousSessions ? "• This is a returning client with previous sessions" : "• This is a new client"}
• FIRST WORDS after greeting: Ask "How are you both feeling today?" and WAIT for response
• Never continue talking after asking a question - always wait for their answer
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
6. After asking a question, WAIT for their response
7. Never answer your own questions

Goal: Help them improve communication, develop secure attachment, and build a healthier relationship.`;

  return systemPrompt;
};

// Get personalized first message based on user profile
export const getPersonalizedFirstMessage = (userProfile?: any) => {
  // Determine therapy type from userProfile or default to couple
  const therapyType = userProfile?.therapyType || "couple";

  if (!userProfile || !userProfile?.userName) {
    // Default first message
    return "Hi there, I'm Dr. Maya Thompson. How are you feeling today? What would be helpful for us to focus on in our session? I'm here to create a space where you can share openly.";
  }

  // For solo therapy, redirect to the individual therapy first message
  if (therapyType === "solo") {
    return getPersonalizedFirstMessageForType("solo", userProfile);
  }

  // For family therapy, redirect to the family therapy first message
  if (therapyType === "family") {
    return getPersonalizedFirstMessageForType("family", userProfile);
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
    const concernsList = Array.isArray(currentConcerns)
      ? currentConcerns.join(", ")
      : "";
    if (concernsList) {
      concernsIntro = ` I understand you're looking for support with ${concernsList}.`;
    }
  }

  // Get relationship context for more personalized approach
  const relationshipContext = relationshipStatus && relationshipStatus !== "In a relationship" 
    ? ` as ${relationshipStatus.toLowerCase()}` 
    : "";

  // Check for previous sessions to acknowledge returning clients
  const hasPreviousSessions =
    userProfile?.sessionHistory &&
    userProfile.sessionHistory !== "No previous sessions found.";

  if (hasPreviousSessions) {
    // Parse session history for more context
    const sessionCount = userProfile?.sessionsCompleted || 0;
    const lastSessionDate = userProfile?.lastSessionDate;

    // Time-based variations with enhanced context
    const hour = new Date().getHours();
    const timeGreeting =
      hour < 12
        ? "Good morning"
        : hour < 17
          ? "Good afternoon"
          : "Good evening";

    // Session milestone acknowledgment
    const sessionMilestone = sessionCount > 0 
      ? sessionCount % 5 === 0 
        ? ` This marks ${sessionCount} sessions we've shared together - what an important milestone.`
        : sessionCount > 10 
          ? ` I continue to be impressed by your dedication to this process.`
          : ""
      : "";

    // Last session reference
    const lastSessionRef = lastSessionDate 
      ? ` Since our last session${lastSessionDate ? ` on ${new Date(lastSessionDate).toLocaleDateString()}` : ""},`
      : "";

    const intros = [
      `${timeGreeting}, ${userName}${partnerName ? ` and ${partnerName}` : ""}. I'm so glad to see you both again.${lastSessionRef} I've been thinking about our last conversation and I'm looking forward to continuing our work together${relationshipContext}.${sessionMilestone}${concernsIntro} Let's take a moment to settle in and create space for whatever feels important to explore today.`,

      `Hello ${userName}, ${partnerName}. Welcome back to our safe space. It's wonderful to reconnect with you both${relationshipContext}. I appreciate your continued commitment to your relationship and to this process.${sessionMilestone}${concernsIntro} Today is yours - we'll follow whatever path feels most meaningful for you both.`,

      `Hi ${userName}${partnerName ? ` and ${partnerName}` : ""}. It's really nice to be with you both again. I value the trust you've placed in me and in this process${relationshipContext}.${lastSessionRef} Let's take a breath together and ease into our time.${concernsIntro} Whatever's on your hearts today, we'll explore it together.`,

      `${userName} and ${partnerName}, welcome back. I'm genuinely pleased to continue this journey with you${relationshipContext}. Your dedication to understanding each other more deeply is something I truly admire.${sessionMilestone}${concernsIntro} Let's create a warm, supportive space for whatever needs attention today.`,
    ];

    return intros[Math.floor(Math.random() * intros.length)];
  } else {
    const intros = [
      `Hello ${userName}${partnerName ? ` and ${partnerName}` : ""}, I'm Dr. Maya Thompson. Welcome to our first session together${relationshipContext}. I want you to know how much courage it takes to be here, and I'm honored to be part of your journey.${concernsIntro} This is your space - a place where both of your voices matter equally. We'll go at your pace, exploring what feels most important to you both.`,

      `Hi ${userName}, ${partnerName}. I'm Dr. Maya Thompson, and I'm truly glad you're here${relationshipContext}. Starting therapy together shows real strength and commitment to your relationship.${concernsIntro} Over my years as a couples therapist, I've seen how powerful it can be when partners choose to understand each other more deeply. This is the beginning of that journey, and I'm here to support you both every step of the way.`,

      `${userName} and ${partnerName}, I'm Dr. Maya Thompson. Thank you for taking this important step together${relationshipContext}. I know reaching out wasn't easy, and being here today shows how much you value your relationship.${concernsIntro} In our time together, we'll create a supportive environment where you can share openly, be heard fully, and discover new ways of connecting. I'm here to guide and support you both.`,
    ];

    return intros[Math.floor(Math.random() * intros.length)];
  }
};

// Configuration for the couple therapy assistant
export const COUPLE_THERAPY_ASSISTANT_CONFIG = {
  id: process.env.NEXT_PUBLIC_VAPI_COUPLE_ASSISTANT_ID, // From environment variables
  name: "Dr. Maya Thompson",
  type: "couple",
  model: {
    provider: "anthropic",
    model: "claude-3-5-sonnet-20241022",
    temperature: 1.1,
    maxTokens: 700,
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
- IMMEDIATELY after your greeting, ask: "How are you both feeling today?" and WAIT for response
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

SPEECH PATTERNS:
- Keep responses concise (2-3 sentences typical, 4-5 max)
- Use natural speech patterns with occasional hesitations
- Include verbal acknowledgments ("I see", "mm-hmm", "right")
- Ask one question at a time to maintain conversational flow
- Mirror the emotional tone of the conversation
- CRITICAL: After asking a question, STOP and wait for response
- Never answer your own questions or continue talking after asking

Remember: This is a real therapeutic relationship. Use all provided context to make each session feel personalized and connected to their ongoing journey.`,
      },
    ],
  },
  voice: {
    provider: "11labs",
    voiceId: process.env.NEXT_PUBLIC_VAPI_MAYA_VOICE_ID || "Yu4extp5aod8kaqzti3t",
    model: "eleven_turbo_v2_5",
  },
  transcriber: {
    provider: "deepgram",
    model: "nova-3",
    language: "en-US",
    smartFormat: true,
    keywords: ["Gottman", "EFT", "attachment", "mindfulness", "CBT", "therapy"],
  },
  firstMessage:
    "Hi {{userName}} and {{partnerName}}, I'm Dr. Maya Thompson. Welcome to couples therapy. I want you to know how much courage it takes to be here together, and I'm honored to be part of your journey. This is your space - a place where both of your voices matter equally. We'll go at your pace, exploring what feels most important to you both.",
  silenceTimeoutSeconds: 45,
  responseDelaySeconds: 1.0,
  llmRequestDelaySeconds: 0.4,
  numWordsToInterruptAssistant: 2,
};

// Configuration for the individual therapy assistant
export const INDIVIDUAL_THERAPY_ASSISTANT_CONFIG = {
  id: process.env.NEXT_PUBLIC_VAPI_INDIVIDUAL_ASSISTANT_ID,
  name: "Dr. Elliot Mackaphy",
  type: "solo",
  model: {
    provider: "anthropic",
    model: "claude-3-5-sonnet-20241022",
    temperature: 1.1,
    maxTokens: 700,
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
- IMMEDIATELY after your greeting, ask: "Can you hear me clearly?" and wait for confirmation
- Then ask: "How has your day been?" or "What's on your mind today?" and WAIT for response
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

SPEECH PATTERNS:
- Keep responses brief and focused (2-3 sentences typical)
- Use natural conversational rhythm with occasional "um" or "well"
- Reflect before offering insights
- Ask clarifying questions one at a time
- Match the client's energy level
- CRITICAL: After asking a question, STOP and wait for response
- Never answer your own questions or continue talking after asking

Remember: This is a real therapeutic relationship. Use all provided context to make each session feel personalized and connected to their ongoing journey.`,
      },
    ],
  },
  voice: {
    provider: "11labs",
    voiceId: process.env.NEXT_PUBLIC_VAPI_ELLIOT_VOICE_ID || "zSSB5ODlBiskDz2GIM5l", // Custom voice for Dr. Elliot
    model: "eleven_turbo_v2_5",
  },
  transcriber: {
    provider: "deepgram",
    model: "nova-3",
    language: "en-US",
    smartFormat: true,
    keywords: [
      "CBT",
      "ACT",
      "mindfulness",
      "anxiety",
      "depression",
      "therapy",
      "thoughts",
      "feelings",
    ],
  },
  firstMessage:
    "Hello {{userName}}, I'm Dr. Elliot Mackaphy. Welcome to our first session together. I want to acknowledge the courage it takes to reach out and begin this journey. This is your space - a place where you can explore your thoughts and feelings without judgment. I'm here to listen, understand, and support you as we work together toward your goals for well-being and personal growth.",
  silenceTimeoutSeconds: 60,
  responseDelaySeconds: 1.0,
  llmRequestDelaySeconds: 0.5,
  numWordsToInterruptAssistant: 2,
};

// Configuration for the family therapy assistant
export const FAMILY_THERAPY_ASSISTANT_CONFIG = {
  id: process.env.NEXT_PUBLIC_VAPI_FAMILY_ASSISTANT_ID,
  name: "Dr. Jada Pearson",
  type: "family",
  model: {
    provider: "anthropic",
    model: "claude-3-5-sonnet-20241022",
    temperature: 1.1,
    maxTokens: 700,
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
- IMMEDIATELY after your greeting, ask: "Can everyone hear me okay?" and wait for confirmation
- Then ask: "How has everyone's week been?" or "Who wants to share how things are going?" and WAIT for response
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

SPEECH PATTERNS:
- Vary response length based on context (2-4 sentences typical)
- Use inclusive language that engages all family members
- Adapt vocabulary to youngest member's comprehension
- Include gentle humor when appropriate
- Balance addressing individuals vs. the family unit
- CRITICAL: After asking a question, STOP and wait for response
- Never answer your own questions or continue talking after asking

Remember: This is a real therapeutic relationship. Use all provided context to make each session feel personalized and connected to their ongoing family journey.`,
      },
    ],
  },
  voice: {
    provider: "11labs",
    voiceId: process.env.NEXT_PUBLIC_VAPI_JADA_VOICE_ID || "Owaxzdx7w5vej9dcytzz",
    model: "eleven_turbo_v2_5",
  },
  transcriber: {
    provider: "deepgram",
    model: "nova-3",
    language: "en-US",
    smartFormat: true,
    keywords: [
      "family",
      "siblings",
      "parents",
      "children",
      "dynamics",
      "boundaries",
      "communication",
    ],
  },
  firstMessage:
    "Hello everyone, I'm Dr. Jada Pearson. Welcome to our first family session together. I want to acknowledge what a meaningful step this is - choosing to come together as a family takes courage and shows how much you care about each other. This is your family's space, where every member's voice is important and every perspective matters. We'll work together at a pace that feels comfortable for everyone, creating understanding and stronger connections.",
  silenceTimeoutSeconds: 50,
  responseDelaySeconds: 0.9,
  llmRequestDelaySeconds: 0.45,
  numWordsToInterruptAssistant: 3,
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
      communicationGuidance =
        "Be direct and straightforward in your communication, getting to the point quickly and offering clear, practical advice.";
    } else if (communicationStyle === "gentle") {
      communicationGuidance =
        "Use gentle, supportive language. Be particularly warm and nurturing, offering validation and encouragement throughout.";
    } else {
      communicationGuidance =
        "Balance directness with warmth, offering clear insights while maintaining an empathetic, supportive tone.";
    }

    // Format current concerns
    const concernsList = Array.isArray(currentConcerns)
      ? currentConcerns.join(", ")
      : "general wellbeing";

    // Check for previous sessions
    const hasPreviousSessions =
      sessionHistory !== "No previous sessions found.";

    return `You are Dr. Elliot Mackaphy, therapist specializing in CBT, ACT, and mindfulness.

CLIENT INFO: ${userName}${pronounStr}${userProfile?.userAge ? ` (${userProfile.userAge})` : ""}
${currentConcerns.length > 0 ? `Concerns: ${concernsList}` : ""}
${additionalNotes ? `Context: ${additionalNotes}` : ""}
${userProfile?.partnerName ? `Partner: ${userProfile.partnerName}${userProfile?.partnerAge ? ` (${userProfile.partnerAge})` : ""}` : ""}

APPROACH:
• Style: ${communicationGuidance}
${hasPreviousSessions ? "• Returning client with previous sessions" : "• New client - first session"}
• FIRST WORDS after greeting: Ask "How has your day been?" and WAIT for response
• Never continue talking after asking a question - always wait for their answer
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
6. After asking a question, WAIT for their response
7. Never answer your own questions

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
      const memberAge = userProfile?.familyMember1Age
        ? ` (${userProfile.familyMember1Age} years old)`
        : "";
      familyMembersString = `${userProfile?.userName || "the client"}${userProfile?.userAge ? ` (${userProfile.userAge} years old)` : ""} and ${familyMemberNames[0]}${memberAge}`;
    } else {
      const lastMember = familyMemberNames.pop();
      // Get the age of the last family member
      let lastMemberAge = "";
      if (userProfile?.familyMember4 === lastMember)
        lastMemberAge = userProfile?.familyMember4Age
          ? ` (${userProfile.familyMember4Age} years old)`
          : "";
      else if (userProfile?.familyMember3 === lastMember)
        lastMemberAge = userProfile?.familyMember3Age
          ? ` (${userProfile.familyMember3Age} years old)`
          : "";
      else if (userProfile?.familyMember2 === lastMember)
        lastMemberAge = userProfile?.familyMember2Age
          ? ` (${userProfile.familyMember2Age} years old)`
          : "";

      familyMembersString = `${userProfile?.userName || "the client"}${userProfile?.userAge ? ` (${userProfile.userAge} years old)` : ""}, ${familyMemberNames.join(", ")}, and ${lastMember}${lastMemberAge}`;
    }

    // Build communication style guidance
    let communicationGuidance = "";
    if (communicationStyle === "direct") {
      communicationGuidance =
        "Be direct and straightforward in your communication, addressing issues clearly while remaining empathetic.";
    } else if (communicationStyle === "gentle") {
      communicationGuidance =
        "Use gentle, supportive language throughout. Be particularly warm and nurturing, creating a safe space for all family members.";
    } else {
      communicationGuidance =
        "Balance directness with warmth, offering clear insights while maintaining an empathetic, supportive tone for all family members.";
    }

    // Format current concerns
    const concernsList = Array.isArray(currentConcerns)
      ? currentConcerns.join(", ")
      : "family wellbeing";

    // Check for previous sessions
    const hasPreviousSessions =
      sessionHistory !== "No previous sessions found.";

    return `You are Dr. Jada Pearson, family therapist specializing in family dynamics.

FAMILY INFO: Working with ${familyMembersString}.
${currentConcerns.length > 0 ? `Concerns: ${concernsList}` : ""}
${additionalNotes ? `Context: ${additionalNotes}` : ""}

APPROACH:
• Style: ${communicationGuidance}
${hasPreviousSessions ? "• Returning family with previous sessions" : "• New family - first session"}
• FIRST WORDS after greeting: Ask "How has everyone's week been?" and WAIT for response
• Never continue talking after asking a question - always wait for their answer
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

    const hasPreviousSessions =
      userProfile?.sessionHistory &&
      userProfile.sessionHistory !== "No previous sessions found.";

    if (hasPreviousSessions) {
      const intros = [
        `Hello ${userName}, it's wonderful to see you again. I've been reflecting on our previous conversations and I'm glad we have this time together. Your journey continues to inspire me, and I'm here to support you in whatever way feels most helpful today. Let's ease into our session and see where your thoughts and feelings lead us.`,

        `Hi ${userName}, it's Dr. Elliot. Welcome back to your space. I appreciate your ongoing commitment to your personal growth and well-being. Each session is a new opportunity for discovery and understanding. I'm here to listen, support, and explore alongside you. Take a moment to arrive fully, and we'll begin whenever you're ready.`,

        `${userName}, I'm so glad to connect with you again. Your courage in continuing this therapeutic journey speaks volumes about your strength. This is your time - a space where your thoughts, feelings, and experiences are valued and respected. I'm here to provide support and guidance as we explore what matters most to you today.`,

        `Hello ${userName}. It's genuinely nice to be with you again. I value the trust you've placed in our therapeutic relationship. Today, like always, we'll create a safe, judgment-free space where you can explore your inner world at your own pace. I'm here to listen deeply and support you in finding your own wisdom and clarity.`,
      ];

      return intros[Math.floor(Math.random() * intros.length)];
    } else {
      const intros = [
        `Hello ${userName}, I'm Dr. Elliot Mackaphy. Welcome to our first session together. I want to acknowledge the courage it takes to reach out and begin this journey. This is your space - a place where you can explore your thoughts and feelings without judgment. I'm here to listen, understand, and support you as we work together toward your goals for well-being and personal growth.`,

        `Hi ${userName}, I'm Dr. Elliot Mackaphy. Thank you for taking this important step in prioritizing your mental health. I know that starting therapy can feel vulnerable, and I'm honored that you've chosen to begin this process. In our time together, we'll create a collaborative space where your experiences are heard and valued. I'm here to support you in discovering new perspectives and developing the tools you need to thrive.`,

        `${userName}, hello. I'm Dr. Elliot Mackaphy. It's truly good to meet you. Beginning therapy is a powerful act of self-care, and I'm grateful to be part of your journey. Together, we'll explore what brings you here and work at a pace that feels comfortable for you. This is a space of compassion and understanding, where you can be authentically yourself. I'm here to support and guide you every step of the way.`,
      ];

      return intros[Math.floor(Math.random() * intros.length)];
    }
  }

  if (type === "family") {
    // Get the userName for a more natural greeting
    const userName = userProfile?.userName || "everyone";

    const hasPreviousSessions =
      userProfile?.sessionHistory &&
      userProfile.sessionHistory !== "No previous sessions found.";

    if (hasPreviousSessions) {
      // Get family members for more personalized greeting
      const familyMembers = [
        userProfile?.familyMember1,
        userProfile?.familyMember2,
        userProfile?.familyMember3,
        userProfile?.familyMember4,
      ].filter(Boolean);

      const intros = [
        `Hello everyone - ${userName}${familyMembers.length > 0 ? `, ${familyMembers.join(", ")}` : " and family"}. It's so wonderful to have you all back together. I've been thinking about your family's journey and the progress you've been making. This is your family's time - a space where every voice matters and every perspective is valuable. Let's settle in together and create room for whatever needs attention today.`,

        `Hi ${userName} and family. Welcome back to our shared space. I'm genuinely glad to see all of you again. Your commitment to strengthening your family bonds continues to inspire me. Today, like always, we'll work together to understand each other better and find new ways to support one another. This is your sanctuary - a place where your family can grow stronger together.`,

        `Welcome back, everyone. It's truly special to reconnect with your family. I appreciate how you all continue to show up for each other and for this process. Each session brings new opportunities for understanding and connection. I'm here to support your family in navigating whatever challenges or celebrations you're experiencing. Let's take a collective breath and begin.`,

        `Hello ${familyMembers.length > 0 ? familyMembers[0] : userName}, and everyone. It's genuinely nice to see your family together again. The trust you've placed in me and in this process means a great deal. Today we'll continue building on the foundation we've created - a space where your family can communicate openly, understand deeply, and grow together. I'm honored to be part of your family's journey.`,
      ];

      return intros[Math.floor(Math.random() * intros.length)];
    } else {
      const intros = [
        `Hello everyone, I'm Dr. Jada Pearson. Welcome to our first family session together. I want to acknowledge what a meaningful step this is - choosing to come together as a family takes courage and shows how much you care about each other. This is your family's space, where every member's voice is important and every perspective matters. We'll work together at a pace that feels comfortable for everyone, creating understanding and stronger connections.`,

        `Hi family, I'm Dr. Jada Pearson. It's truly wonderful to meet all of you. Starting family therapy together shows real strength and love for one another. In my years working with families, I've seen how powerful it can be when family members choose to understand each other more deeply. This is the beginning of that journey, and I'm here to guide and support all of you as we explore new ways of connecting and communicating.`,

        `Hello, I'm Dr. Jada Pearson. Thank you all for being here today - I know coordinating schedules and making this commitment isn't always easy. Your presence here speaks volumes about your dedication to your family's well-being. Together, we'll create a warm, supportive environment where you can share openly, listen to each other, and discover new strengths in your family system. I'm honored to be part of this important work with you.`,
      ];

      return intros[Math.floor(Math.random() * intros.length)];
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
    variableValues.userName =
      userProfile.userName || userProfile.name || "the client";
    variableValues.userAge = userProfile.userAge || userProfile.age || null;
    variableValues.pronouns = userProfile.pronouns || null;

    // Communication and therapy preferences
    variableValues.communicationStyle =
      userProfile.communicationStyle || "balanced";
    variableValues.sessionPreference =
      userProfile.sessionPreference || "flexible";
    variableValues.therapyType = therapyType;

    // Current concerns and notes
    variableValues.currentConcerns = userProfile.currentConcerns || [];
    variableValues.additionalNotes = userProfile.additionalNotes || "";

    // Session history
    variableValues.sessionHistory =
      userProfile.sessionHistory || "No previous sessions";

    // Therapy type specific data
    if (therapyType === "couple") {
      variableValues.partnerName = userProfile.partnerName || "";
      variableValues.partnerAge = userProfile.partnerAge || null;
      variableValues.relationshipStatus =
        userProfile.relationshipStatus || "In a relationship";
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
    },
    // Enhanced settings for natural conversation
    recordingEnabled: true,
    hipaaEnabled: true,
    backgroundSound: "off", // Disable background office sounds for cleaner audio
    // Settings that are valid for assistant configuration
    modelOutputInMessagesEnabled: true,
  };
};
