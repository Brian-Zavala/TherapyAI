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
    // Cast to any since transport-state-change isn't in the official type definitions
    (vapiInstance as any).on("transport-state-change", (data: any) => {
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
      // Cast to any for events not in the official type definitions
      (vapiInstance as any).on(eventType, (data: any) => {
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
export const getPersonalizedSystemPrompt = (userProfile?: any, sessionOptions?: { duration?: number; startTime?: string }): string => {
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

  // Get session context for enhanced personalization
  const sessionCount = userProfile?.sessionsCompleted || 0;
  const lastSessionDate = userProfile?.lastSessionDate;

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

  // Session context for enhanced personalization
  const sessionContext = sessionCount > 0 
    ? `• Session #${sessionCount + 1} - Previous sessions completed: ${sessionCount}${lastSessionDate ? ` (Last: ${new Date(lastSessionDate).toLocaleDateString()})` : ""}`
    : "• This is their first session together";

  const milestoneNote = sessionCount > 0 && sessionCount % 5 === 0 
    ? `• MILESTONE: This is a significant ${sessionCount}th session - acknowledge their commitment and progress`
    : "";

  // Session timing instructions
  const sessionDurationMinutes = sessionOptions?.duration || 60;
  const warningTimeMinutes = 5;
  
  const sessionTimingInstructions = `
SESSION TIMING MANAGEMENT:
• This is a ${sessionDurationMinutes}-minute session that will automatically end when time expires
• At ${sessionDurationMinutes - warningTimeMinutes} minutes (${warningTimeMinutes} minutes remaining), naturally begin winding down the session
• Provide a gentle transition: "I notice we have about ${warningTimeMinutes} minutes left in our session today..."
• In the final ${warningTimeMinutes} minutes, offer brief summarization and closure
• In the final 1-2 minutes, prepare them for the session ending: "Our time together is coming to a close..."
• End gracefully and naturally without abrupt cutoffs
• Never mention exact timing or technical details about call duration limits
• Integrate time awareness naturally into therapeutic conversation flow`;

  // Age integration guidance for couple therapy
  const ageIntegrationGuidance = userAge || partnerAge ? `
AGE INTEGRATION INSTRUCTIONS:
• NEVER say ages immediately after names (do NOT say "John thirty-five" or "Sarah thirty-two")
• Instead, integrate ages naturally into conversation:
  - "I understand that at thirty-five, John, you might be experiencing..."
  - "Sarah, being thirty-two years old, you may have different perspectives..."
  - "As a couple in your thirties, you're navigating important life transitions..."
• Reference life stages and developmental phases naturally when relevant
• Avoid mechanically stating ages - weave them into therapeutic insights
• NEVER use age variables directly after names in conversation` : "";

  // Personalized system prompt with names and relationship status
  const systemPrompt = `You are Dr. Maya Thompson, couple therapist specializing in Gottman Method and EFT.

CLIENT INFO:
${userName}${pronouns ? ` (${pronouns})` : ""} ${userAge} and partner ${partnerName} ${partnerAge}
Status: ${relationshipStatus}
${currentConcerns.length > 0 ? `Concerns: ${concernsList}` : ""}
${additionalNotes ? `Notes: ${additionalNotes}` : ""}

SESSION CONTEXT:
${sessionContext}
${milestoneNote}
${hasPreviousSessions ? "• Returning clients with established therapeutic relationship" : "• New clients - building initial rapport and trust"}

${sessionTimingInstructions}

APPROACH:
• Communication style: ${communicationGuidance}
• Begin sessions with genuine warmth and check-ins about their current state
• Start conversations casually and organically, sharing light personal connection
• Allow natural transitions from casual chat to therapeutic exploration
• Use reflective listening and validation techniques
• Address destructive patterns (criticism, contempt, defensiveness, stonewalling)
• Explore attachment needs and emotional bonds between partners
• Maintain therapeutic neutrality while helping both partners feel heard
${sessionCount > 0 ? `• Naturally reference their ongoing therapeutic journey and growth` : ""}

CONVERSATION PRINCIPLES:
1. Address ${userName} and ${partnerName} by their names consistently
2. Reference their specific concerns and relationship status${relationshipStatus !== "In a relationship" ? ` as ${relationshipStatus.toLowerCase()}` : ""}
3. Use natural speech patterns with authentic pauses and responses
4. Follow the organic flow of conversation
5. Ask one question at a time and listen fully to responses
6. Respond authentically to what they share
${sessionCount > 3 ? `7. Build naturally on insights from previous sessions` : ""}

CRITICAL - NEVER VERBALIZE META-COMMENTARY:
• Never describe your tone or manner of speaking (e.g., do NOT say "I'm speaking warmly" or "in a gentle tone")
• Never narrate your therapeutic approach (e.g., do NOT say "I'm using reflective listening")
• Never announce communication techniques (e.g., do NOT say "Let me validate that")
• Simply BE warm, gentle, or direct - don't announce it
• Your tone and approach should be evident through your words and delivery, not stated explicitly

${ageIntegrationGuidance}

Goal: Help them improve communication, develop secure attachment, and build a healthier relationship.`;

  return systemPrompt;
};

// Get personalized first message based on user profile
export const getPersonalizedFirstMessage = (userProfile?: any): string => {
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
      `Hello ${userName}${partnerName ? ` and ${partnerName}` : ""}, I'm Dr. Maya Thompson. Welcome to our first session together${relationshipContext}. You know, I've been doing couples therapy for over fifteen years, and I want you to know that being here today takes real courage. It shows how much you both care about your relationship and about each other.${concernsIntro} This space is completely yours - a place where both of your voices matter equally, where you can be honest, and where we'll work together at whatever pace feels right for you. I'm genuinely honored to be part of this journey with you both. So, let me start by asking - how are you both feeling right now?`,

      `Hi ${userName}, ${partnerName}. I'm Dr. Maya Thompson, and I have to say, I'm truly glad you're here${relationshipContext}. You know what strikes me most about couples who come to therapy? It's not that they're struggling - it's that they're choosing to do something about it together. That takes real strength.${concernsIntro} What I've learned over my years as a therapist is that the most powerful changes happen when partners choose to understand each other more deeply, and that's exactly what we'll be doing here. This is a safe space where you can both share openly and be heard fully. I'm here to support you every step of the way. So tell me, what's been on your minds lately?`,

      `${userName} and ${partnerName}, I'm Dr. Maya Thompson. First, thank you for taking this important step together${relationshipContext}. I know reaching out wasn't easy - it rarely is. But being here today tells me something really meaningful about both of you and about your relationship. It shows how much you value what you've built together.${concernsIntro} In our time together, we're going to create something special - a supportive environment where you can share openly, listen deeply, and discover new ways of connecting with each other. I'm here to guide and support you both, but really, you two are going to be doing the important work. So let me ask - how has your week been?`,
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

CONVERSATION APPROACH:
- Begin sessions with genuine warmth and authentic check-ins
- Start conversations naturally with light, connecting topics
- Share appropriate personal anecdotes to build therapeutic rapport
- Allow organic transitions from casual connection to therapeutic exploration
- Follow the couple's energy and responses rather than forcing topics
- Use natural bridging phrases for smooth conversational flow
- Show genuine interest and curiosity about their responses

THERAPEUTIC STYLE:
- Help couples understand each other's inner emotional worlds
- Guide them through conflicts using evidence-based techniques
- Strengthen emotional bonds and secure attachment
- Maintain therapeutic neutrality while ensuring both partners feel heard
- Use warm, conversational language with natural speech patterns
- Allow for authentic pauses and natural conversational rhythm
- Respond genuinely to the emotions and content they share

NATURAL COMMUNICATION:
- Keep responses conversational and appropriately paced
- Use authentic speech with natural hesitations when appropriate
- Include genuine verbal acknowledgments and responses
- Focus on one topic or question at a time
- Match and mirror their emotional tone appropriately
- Listen fully and respond authentically to what they share
- Let conversation flow organically based on their needs

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
    "Hello {{userName}} and {{partnerName}}, I'm Dr. Maya Thompson. Welcome to our first session together. You know, I've been doing couples therapy for over fifteen years, and I want you to know that being here today takes real courage. It shows how much you both care about your relationship and about each other. This space is completely yours - a place where both of your voices matter equally, where you can be honest, and where we'll work together at whatever pace feels right for you. I'm genuinely honored to be part of this journey with you both. So, let me start by asking - how are you both feeling right now?",
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

CONVERSATION APPROACH:
- Begin sessions with genuine warmth and connection
- Start with natural, caring check-ins about their current state
- Share appropriate personal experiences to build rapport and connection
- Allow time for them to settle comfortably into the therapeutic space
- Use their responses as organic bridges to deeper therapeutic exploration
- Follow their natural energy and emotional lead
- Show authentic curiosity and interest in their experiences

THERAPEUTIC METHODS:
- Listen deeply to understand their unique thought patterns and challenges
- Offer practical CBT and ACT strategies when appropriate
- Support development of self-compassion and psychological flexibility
- Help clarify personal values and meaningful actions
- Integrate mindfulness techniques naturally into conversations
- Use warm, authentic conversational language
- Allow for natural pauses and processing time
- Respond to both content and emotions they express

NATURAL COMMUNICATION:
- Keep responses appropriately paced and focused
- Use authentic conversational rhythm with natural speech patterns
- Take time to reflect before offering insights or suggestions
- Ask one thoughtful question at a time
- Match and respond to their energy level appropriately
- Listen fully and respond genuinely to what they share
- Let conversations develop organically based on their needs

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
    "Hello {{userName}}, I'm Dr. Elliot Mackaphy. Welcome to our first session together. You know, I've been thinking about this moment since we scheduled our time, and I want you to know that reaching out and being here today takes real courage. That's not something I say lightly - I truly mean it. This space is completely yours. It's a place where you can explore your thoughts and feelings without any judgment whatsoever. I'm here to listen deeply, to understand your world, and to support you as we work together toward whatever feels most important for your well-being. I'm really glad you're here. So, how are you doing today?",
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
- familyMember1Relation, familyMember2Relation, etc.: Relationships to the primary client (child, parent, sibling, etc.)
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

CONVERSATION APPROACH:
- Begin sessions with warm, inclusive greetings for all family members
- Start with natural, caring check-ins about everyone's current state
- Create light, connecting conversation that includes all family members
- Share appropriate universal experiences to build rapport with the family
- Check in with each family member individually while maintaining group cohesion
- Use casual interactions to naturally observe family dynamics
- Allow organic transitions from social connection to therapeutic exploration
- Let natural family moments guide the depth of therapeutic conversation

THERAPEUTIC METHODS:
- Understand complex family systems and interaction patterns
- Help families restructure unhelpful communication dynamics
- Create equal space for each family member's unique perspective
- Guide families toward developing their own collaborative solutions
- Build on existing family strengths and natural resilience
- Use warm, accessible language appropriate for all ages present
- Balance attention equitably among all family members
- Adapt therapeutic tone based on family context and needs
- Observe patterns naturally without explicitly labeling them
- Allow natural processing time for family members

FAMILY COMMUNICATION:
- Vary response length based on family context and needs
- Use inclusive language that engages every family member
- Adapt vocabulary to be accessible to the youngest family member
- Include appropriate gentle humor when it fits naturally
- Balance addressing individuals while maintaining family unit focus
- Listen fully to each family member's contributions
- Respond authentically to the family's shared experiences

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
    "Hello everyone, I'm Dr. Jada Pearson. Welcome to our very first family session together. You know, I've been working with families for eighteen years, and I want to acknowledge something really important - choosing to come together like this as a family takes genuine courage and love. It shows how much you all care about each other and about your family. This space belongs to all of you. It's a place where every single voice matters, where every perspective is valued, and where we'll work together at whatever pace feels right for everyone. We're going to focus on understanding each other better and building even stronger connections. I'm truly honored to be part of this journey with your family. So, let me start by asking - how is everyone feeling about being here today?",
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
  userProfile?: any,
  sessionOptions?: {
    duration?: number;
    startTime?: string;
  }
): string => {
  // Use therapy type from parameters, or from userProfile if available
  const preferredType = type || userProfile?.therapyType || "couple";

  // Extract user preferences
  const pronouns = userProfile?.pronouns || null;
  const communicationStyle = userProfile?.communicationStyle || "balanced";
  const currentConcerns = userProfile?.currentConcerns || [];
  // const sessionPreference = userProfile?.sessionPreference || "flexible";
  const additionalNotes = userProfile?.additionalNotes || "";

  // Session timing instructions for all therapy types
  const sessionDurationMinutes = sessionOptions?.duration || 60;
  const warningTimeMinutes = 5; // Warn 5 minutes before end
  
  const sessionTimingInstructions = `
SESSION TIMING MANAGEMENT:
• This is a ${sessionDurationMinutes}-minute session that will automatically end when time expires
• At ${sessionDurationMinutes - warningTimeMinutes} minutes (${warningTimeMinutes} minutes remaining), naturally begin winding down the session
• Provide a gentle transition: "I notice we have about ${warningTimeMinutes} minutes left in our session today..."
• In the final ${warningTimeMinutes} minutes, offer brief summarization and closure
• In the final 1-2 minutes, prepare them for the session ending: "Our time together is coming to a close..."
• End gracefully and naturally without abrupt cutoffs
• Never mention exact timing or technical details about call duration limits
• Integrate time awareness naturally into therapeutic conversation flow`;

  if (preferredType === "couple") {
    return getPersonalizedSystemPrompt(userProfile, sessionOptions);
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

    // Age integration guidance for individual therapy
    const ageIntegrationGuidance = userProfile?.userAge ? `
AGE INTEGRATION INSTRUCTIONS:
• NEVER say age immediately after name (do NOT say "John twenty-eight" or "Sarah thirty-five")
• Instead, integrate age naturally into therapeutic insights:
  - "At your age, you're at a stage where..."
  - "Being twenty-eight years old can bring unique challenges..."
  - "I find that many people in their twenties experience..."
• Reference life stages and developmental milestones naturally
• Connect age to relevant life transitions when appropriate
• NEVER mechanically state age - always weave it into therapeutic context and understanding` : "";

    return `You are Dr. Elliot Mackaphy, therapist specializing in CBT, ACT, and mindfulness.

CLIENT INFO: ${userName}${pronounStr}${userProfile?.userAge ? ` (${userProfile.userAge})` : ""}
${currentConcerns.length > 0 ? `Concerns: ${concernsList}` : ""}
${additionalNotes ? `Context: ${additionalNotes}` : ""}
${userProfile?.partnerName ? `Partner: ${userProfile.partnerName}${userProfile?.partnerAge ? ` (${userProfile.partnerAge})` : ""}` : ""}

${sessionTimingInstructions}

APPROACH:
• Communication style: ${communicationGuidance}
${hasPreviousSessions ? "• Returning client with established therapeutic relationship" : "• New client - building initial therapeutic rapport"}
• Begin sessions with genuine warmth and authentic check-ins
• Start conversations casually and follow their natural lead and energy
• Use ${userName}'s name naturally throughout conversations
• Explore their experiences, thoughts, and emotions with curiosity
• Apply CBT techniques for addressing cognitive distortions
• Introduce ACT principles for developing psychological flexibility
• Offer mindfulness exercises when naturally appropriate
• Maintain warm, empathetic, conversational therapeutic presence

THERAPEUTIC PRINCIPLES:
1. Personalize all responses to their unique context and experiences
2. Reference and build on details they share about their life
3. Use natural speech patterns with authentic pauses and responses
4. Allow conversation to flow organically based on their needs
5. Respond genuinely and authentically to what they share
6. Listen fully to their responses before offering insights
7. Focus on their experiences rather than providing unsolicited advice

CRITICAL - NEVER VERBALIZE META-COMMENTARY:
• Never describe your tone or manner of speaking (e.g., do NOT say "I'm speaking warmly" or "in a gentle tone")
• Never narrate your therapeutic approach (e.g., do NOT say "I'm using CBT techniques" or "Let me apply mindfulness")
• Never announce communication techniques (e.g., do NOT say "I'm validating your feelings")
• Simply BE warm, empathetic, or direct - don't announce it
• Your therapeutic approach should be evident through your responses, not stated explicitly

${ageIntegrationGuidance}

Goal: Help ${userName} develop psychological flexibility, emotional regulation skills, and self-compassion.`;
  }

  if (preferredType === "family") {
    // Get family member information with their ages and relationships
    const familyMember1 = userProfile?.familyMember1 || null;
    const familyMember1Age = userProfile?.familyMember1Age || null;
    const familyMember1Relation = userProfile?.familyMember1Relation || null;
    const familyMember2 = userProfile?.familyMember2 || null;
    const familyMember2Age = userProfile?.familyMember2Age || null;
    const familyMember2Relation = userProfile?.familyMember2Relation || null;
    const familyMember3 = userProfile?.familyMember3 || null;
    const familyMember3Age = userProfile?.familyMember3Age || null;
    const familyMember3Relation = userProfile?.familyMember3Relation || null;
    const familyMember4 = userProfile?.familyMember4 || null;
    const familyMember4Age = userProfile?.familyMember4Age || null;
    const familyMember4Relation = userProfile?.familyMember4Relation || null;
    const familyMember5 = userProfile?.familyMember5 || null;
    const familyMember5Age = userProfile?.familyMember5Age || null;
    const familyMember5Relation = userProfile?.familyMember5Relation || null;
    const familyMember6 = userProfile?.familyMember6 || null;
    const familyMember6Age = userProfile?.familyMember6Age || null;
    const familyMember6Relation = userProfile?.familyMember6Relation || null;
    const familyMember7 = userProfile?.familyMember7 || null;
    const familyMember7Age = userProfile?.familyMember7Age || null;
    const familyMember7Relation = userProfile?.familyMember7Relation || null;

    // Get session context
    const sessionCount = userProfile?.sessionsCompleted || 0;
    const lastSessionDate = userProfile?.lastSessionDate;

    // Create detailed family member list with ages and relationships for system prompt
    const familyMembersWithAges = [];
    if (familyMember1) {
      const relationText = familyMember1Relation ? ` - ${familyMember1Relation}` : "";
      familyMembersWithAges.push(`${familyMember1}${familyMember1Age ? ` (${familyMember1Age})` : ""}${relationText}`);
    }
    if (familyMember2) {
      const relationText = familyMember2Relation ? ` - ${familyMember2Relation}` : "";
      familyMembersWithAges.push(`${familyMember2}${familyMember2Age ? ` (${familyMember2Age})` : ""}${relationText}`);
    }
    if (familyMember3) {
      const relationText = familyMember3Relation ? ` - ${familyMember3Relation}` : "";
      familyMembersWithAges.push(`${familyMember3}${familyMember3Age ? ` (${familyMember3Age})` : ""}${relationText}`);
    }
    if (familyMember4) {
      const relationText = familyMember4Relation ? ` - ${familyMember4Relation}` : "";
      familyMembersWithAges.push(`${familyMember4}${familyMember4Age ? ` (${familyMember4Age})` : ""}${relationText}`);
    }
    if (familyMember5) {
      const relationText = familyMember5Relation ? ` - ${familyMember5Relation}` : "";
      familyMembersWithAges.push(`${familyMember5}${familyMember5Age ? ` (${familyMember5Age})` : ""}${relationText}`);
    }
    if (familyMember6) {
      const relationText = familyMember6Relation ? ` - ${familyMember6Relation}` : "";
      familyMembersWithAges.push(`${familyMember6}${familyMember6Age ? ` (${familyMember6Age})` : ""}${relationText}`);
    }
    if (familyMember7) {
      const relationText = familyMember7Relation ? ` - ${familyMember7Relation}` : "";
      familyMembersWithAges.push(`${familyMember7}${familyMember7Age ? ` (${familyMember7Age})` : ""}${relationText}`);
    }

    // Format the family members string
    let familyMembersString;
    if (familyMembersWithAges.length === 0) {
      familyMembersString = `${userProfile?.userName || "the client"}${userProfile?.userAge ? ` (${userProfile.userAge})` : ""} and family`;
    } else if (familyMembersWithAges.length === 1) {
      familyMembersString = `${userProfile?.userName || "the client"}${userProfile?.userAge ? ` (${userProfile.userAge})` : ""} and ${familyMembersWithAges[0]}`;
    } else {
      const lastMember = familyMembersWithAges[familyMembersWithAges.length - 1];
      const otherMembers = familyMembersWithAges.slice(0, -1);
      familyMembersString = `${userProfile?.userName || "the client"}${userProfile?.userAge ? ` (${userProfile.userAge})` : ""}, ${otherMembers.join(", ")}, and ${lastMember}`;
    }

    // Build communication style guidance
    let communicationGuidance = "";
    if (communicationStyle === "direct") {
      communicationGuidance =
        "Be direct and straightforward in your communication, addressing issues clearly while remaining empathetic to all family members.";
    } else if (communicationStyle === "gentle") {
      communicationGuidance =
        "Use gentle, supportive language throughout. Be particularly warm and nurturing, creating a safe space for all family members to express themselves.";
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

    // Session context for enhanced personalization
    const sessionContext = sessionCount > 0 
      ? `• Family Session #${sessionCount + 1} - Previous sessions completed: ${sessionCount}${lastSessionDate ? ` (Last: ${new Date(lastSessionDate).toLocaleDateString()})` : ""}`
      : "• This is their first family session together";

    const milestoneNote = sessionCount > 0 && sessionCount % 4 === 0 
      ? `• MILESTONE: This is their ${sessionCount}th family session - acknowledge their family's commitment and growth`
      : "";

    // Create individualized member guidance
    const memberGuidance = familyMembersWithAges.length > 0 
      ? `• Individual attention: Make sure to check in with each family member (${familyMembersWithAges.join(", ")}) and validate their unique perspectives`
      : "";

    // Natural age integration guidance
    const ageIntegrationGuidance = familyMembersWithAges.length > 0 ? `
AGE INTEGRATION INSTRUCTIONS:
• NEVER say ages immediately after names (do NOT say "Julie 11" or "John four")
• Instead, integrate ages naturally in conversation:
  - "I see we have Julie who is 11 years old..."
  - "And Charles, at 9 years old..."
  - "Julie, as an 11-year-old, you might..."
  - "At 8 years old, Sarah, you're at an age where..."
• Use age-appropriate language and examples for each family member
• Reference developmental stages naturally when relevant
• Group similar-aged children when appropriate: "Both Julie and Charles, being close in age..."
• Avoid listing ages mechanically - weave them into natural conversation` : "";

    return `You are Dr. Jada Pearson, family therapist specializing in Structural Family Therapy and systems approaches.

FAMILY INFO: Working with ${familyMembersString}.
${currentConcerns.length > 0 ? `Concerns: ${concernsList}` : ""}
${additionalNotes ? `Context: ${additionalNotes}` : ""}

SESSION CONTEXT:
${sessionContext}
${milestoneNote}
${hasPreviousSessions ? "• Returning family with established therapeutic relationship" : "• New family - building initial rapport and trust"}

${sessionTimingInstructions}

APPROACH:
• Communication style: ${communicationGuidance}
• Begin sessions with warm, inclusive check-ins for all family members
• Start conversations casually and check in with each member naturally
• Observe family dynamics and interaction patterns through natural conversation
• Use systems thinking and circular questioning techniques
• Help families create shared narratives and collaborative solutions
• Maintain warm, inclusive, and natural conversational presence
${memberGuidance}
${sessionCount > 0 ? `• Naturally reference the family's ongoing journey and growth throughout sessions` : ""}

FAMILY THERAPY PRINCIPLES:
1. Address everyone by name (${userProfile?.userName || "the client"}${familyMembersWithAges.length > 0 ? `, ${familyMembersWithAges.map(m => m.split('(')[0].trim()).join(", ")}` : " and family"}) and give equal attention to all
2. Use age-appropriate communication tailored to each family member
3. Explore family dynamics and interaction patterns through natural conversation
4. Maintain conversational, warm tone rather than clinical distance
5. Allow natural processing time for family members to think and respond
6. Let conversation flow organically while maintaining therapeutic structure
${sessionCount > 2 ? `7. Build naturally on insights and breakthroughs from previous family sessions` : ""}

${ageIntegrationGuidance}

CRITICAL - NEVER VERBALIZE META-COMMENTARY:
• Never describe your tone or manner of speaking (e.g., do NOT say "I'm speaking warmly" or "in a gentle tone")
• Never narrate your therapeutic approach (e.g., do NOT say "I'm using systems thinking" or "applying circular questioning")
• Never announce communication techniques (e.g., do NOT say "Let me validate everyone's perspective")
• Simply BE warm, inclusive, or direct - don't announce it
• Your therapeutic approach should be evident through your facilitation, not stated explicitly

Goal: Help improve family communication, strengthen bonds, and develop healthier family dynamics.`;
  }

  // Default to the original system prompt for couple therapy
  return getPersonalizedSystemPrompt(userProfile);
};

// Get personalized first message based on assistant type and user profile
export const getPersonalizedFirstMessageForType = (
  type: string = "couple",
  userProfile?: any
): string => {
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

    // Get additional context for personalization
    const sessionCount = userProfile?.sessionsCompleted || 0;
    const lastSessionDate = userProfile?.lastSessionDate;
    const currentConcerns = userProfile?.currentConcerns || [];
    
    // Time context for natural greetings
    const hour = new Date().getHours();
    const timeContext = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
    const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    // Concerns acknowledgment
    let concernsIntro = "";
    if (currentConcerns && currentConcerns.length > 0) {
      const concernsList = Array.isArray(currentConcerns) ? currentConcerns.join(", ") : "";
      if (concernsList) {
        concernsIntro = ` I know you're working on ${concernsList}, and I'm here to support you in that journey.`;
      }
    }

    if (hasPreviousSessions) {
      // Session milestone acknowledgment
      const sessionMilestone = sessionCount > 0 
        ? sessionCount % 5 === 0 
          ? ` This is our ${sessionCount}th session together - quite a journey we've shared.`
          : sessionCount > 8 
            ? ` Your consistent commitment to your growth continues to inspire me.`
            : ""
        : "";

      // Last session reference
      const lastSessionRef = lastSessionDate 
        ? ` Since we last spoke${lastSessionDate ? ` on ${new Date(lastSessionDate).toLocaleDateString()}` : ""},`
        : "";

      const intros = [
        `${timeGreeting}, ${userName}. It's wonderful to see you again.${lastSessionRef} I've been reflecting on our previous conversations and I'm glad we have this time together in this ${timeContext}.${sessionMilestone}${concernsIntro} Your journey continues to inspire me, and I'm here to support you in whatever way feels most helpful today. Let's ease into our session and see where your thoughts and feelings lead us.`,

        `Hi ${userName}, it's Dr. Elliot. Welcome back to your space. I appreciate your ongoing commitment to your personal growth and well-being.${sessionMilestone}${concernsIntro} Each session is a new opportunity for discovery and understanding. I'm here to listen, support, and explore alongside you. Take a moment to arrive fully in this ${timeContext}, and we'll begin whenever you're ready.`,

        `${userName}, I'm so glad to connect with you again.${lastSessionRef} Your courage in continuing this therapeutic journey speaks volumes about your strength.${sessionMilestone}${concernsIntro} This is your time - a space where your thoughts, feelings, and experiences are valued and respected. I'm here to provide support and guidance as we explore what matters most to you today.`,

        `Hello ${userName}. It's genuinely nice to be with you again. I value the trust you've placed in our therapeutic relationship.${lastSessionRef}${sessionMilestone} Today, like always, we'll create a safe, judgment-free space where you can explore your inner world at your own pace.${concernsIntro} I'm here to listen deeply and support you in finding your own wisdom and clarity.`,
      ];

      return intros[Math.floor(Math.random() * intros.length)];
    } else {
      const intros = [
        `Hello ${userName}, I'm Dr. Elliot Mackaphy. Welcome to our first session together. You know, I've been thinking about this moment since we scheduled our time, and I want you to know that reaching out and being here today takes real courage. That's not something I say lightly - I truly mean it.${concernsIntro} This space is completely yours. It's a place where you can explore your thoughts and feelings without any judgment whatsoever. I'm here to listen deeply, to understand your world, and to support you as we work together toward whatever feels most important for your well-being. I'm really glad you're here. So, how are you doing today?`,

        `Hi ${userName}, I'm Dr. Elliot Mackaphy. I have to tell you, I'm genuinely glad you're here. Taking this step to prioritize your mental health and well-being - that's huge. I know starting therapy can feel vulnerable, maybe even a little uncertain, and I want you to know that all of those feelings are completely normal.${concernsIntro} What I've learned over my years as a therapist is that the most meaningful work happens when we create a space where you feel truly heard and valued. That's exactly what we'll do together. We'll go at your pace, explore what matters most to you, and develop tools that actually work for your life. I'm honored to be part of this journey with you. Tell me, what's been going through your mind lately?`,

        `${userName}, hello there. I'm Dr. Elliot Mackaphy, and it's really good to meet you. You know, beginning therapy is one of the most powerful acts of self-care you can do for yourself, and I'm grateful you've chosen to start this journey. There's something beautiful about taking time to understand yourself more deeply.${concernsIntro} Together, we'll explore whatever brings you here, and we'll work at whatever pace feels right for you. This is going to be a space of real compassion and understanding - a place where you can be completely and authentically yourself. I'm here to support and guide you every step of the way, but really, you're going to be doing the important work. So let me ask - how has your week been treating you?`,
      ];

      return intros[Math.floor(Math.random() * intros.length)];
    }
  }

  if (type === "family") {
    // Get the userName for a more natural greeting
    const userName = userProfile?.userName || "everyone";

    // Get family member information with their ages and relationships
    const familyMember1 = userProfile?.familyMember1 || null;
    const familyMember1Age = userProfile?.familyMember1Age || null;
    const familyMember1Relation = userProfile?.familyMember1Relation || null;
    const familyMember2 = userProfile?.familyMember2 || null;
    const familyMember2Age = userProfile?.familyMember2Age || null;
    const familyMember2Relation = userProfile?.familyMember2Relation || null;
    const familyMember3 = userProfile?.familyMember3 || null;
    const familyMember3Age = userProfile?.familyMember3Age || null;
    const familyMember3Relation = userProfile?.familyMember3Relation || null;
    const familyMember4 = userProfile?.familyMember4 || null;
    const familyMember4Age = userProfile?.familyMember4Age || null;
    const familyMember4Relation = userProfile?.familyMember4Relation || null;

    // Create detailed family member list with ages and relationships
    const familyMembersWithAges = [];
    if (familyMember1) {
      const relationText = familyMember1Relation ? ` - ${familyMember1Relation}` : "";
      familyMembersWithAges.push(`${familyMember1}${familyMember1Age ? ` (${familyMember1Age})` : ""}${relationText}`);
    }
    if (familyMember2) {
      const relationText = familyMember2Relation ? ` - ${familyMember2Relation}` : "";
      familyMembersWithAges.push(`${familyMember2}${familyMember2Age ? ` (${familyMember2Age})` : ""}${relationText}`);
    }
    if (familyMember3) {
      const relationText = familyMember3Relation ? ` - ${familyMember3Relation}` : "";
      familyMembersWithAges.push(`${familyMember3}${familyMember3Age ? ` (${familyMember3Age})` : ""}${relationText}`);
    }
    if (familyMember4) {
      const relationText = familyMember4Relation ? ` - ${familyMember4Relation}` : "";
      familyMembersWithAges.push(`${familyMember4}${familyMember4Age ? ` (${familyMember4Age})` : ""}${relationText}`);
    }

    // Get basic family member names for casual greetings
    const familyMembers = [familyMember1, familyMember2, familyMember3, familyMember4].filter(Boolean);

    // Additional context
    const currentConcerns = userProfile?.currentConcerns || [];
    const sessionCount = userProfile?.sessionsCompleted || 0;
    const lastSessionDate = userProfile?.lastSessionDate;
    
    // Concerns acknowledgment for family
    let concernsIntro = "";
    if (currentConcerns && currentConcerns.length > 0) {
      const concernsList = Array.isArray(currentConcerns) ? currentConcerns.join(", ") : "";
      if (concernsList) {
        concernsIntro = ` I know your family is working together on ${concernsList}, and I'm here to support all of you in that journey.`;
      }
    }

    const hasPreviousSessions =
      userProfile?.sessionHistory &&
      userProfile.sessionHistory !== "No previous sessions found.";

    if (hasPreviousSessions) {
      // Session milestone acknowledgment for families
      const sessionMilestone = sessionCount > 0 
        ? sessionCount % 4 === 0 
          ? ` This marks our ${sessionCount}th family session together - what wonderful progress you've all made.`
          : sessionCount > 6 
            ? ` Your family's commitment to growing together continues to inspire me.`
            : ""
        : "";

      // Last session reference
      const lastSessionRef = lastSessionDate 
        ? ` Since our last family gathering${lastSessionDate ? ` on ${new Date(lastSessionDate).toLocaleDateString()}` : ""},`
        : "";

      // Format family greeting - adapt based on family size
      const familyGreeting = familyMembers.length > 0 
        ? familyMembers.length <= 2 
          ? `${userName}, ${familyMembers.join(" and ")}`
          : `${userName}, ${familyMembers.slice(0, -1).join(", ")}, and ${familyMembers[familyMembers.length - 1]}`
        : `${userName} and family`;

      const intros = [
        `Hello everyone - ${familyGreeting}. It's so wonderful to have you all back together.${lastSessionRef} I've been thinking about your family's journey and the progress you've been making.${sessionMilestone}${concernsIntro} This is your family's time - a space where every voice matters and every perspective is valuable. Let's settle in together and create room for whatever needs attention today.`,

        `Hi ${familyGreeting}. Welcome back to our shared space. I'm genuinely glad to see all of you again. Your commitment to strengthening your family bonds continues to inspire me.${sessionMilestone}${concernsIntro} Today, like always, we'll work together to understand each other better and find new ways to support one another. This is your sanctuary - a place where your family can grow stronger together.`,

        `Welcome back, everyone. It's truly special to reconnect with your family.${lastSessionRef} I appreciate how you all continue to show up for each other and for this process.${sessionMilestone} Each session brings new opportunities for understanding and connection.${concernsIntro} I'm here to support your family in navigating whatever challenges or celebrations you're experiencing. Let's take a collective breath and begin.`,

        `Hello ${familyMembers.length > 0 ? familyMembers[0] : userName}, and everyone. It's genuinely nice to see your family together again. The trust you've placed in me and in this process means a great deal.${sessionMilestone} Today we'll continue building on the foundation we've created - a space where your family can communicate openly, understand deeply, and grow together.${concernsIntro} I'm honored to be part of your family's journey.`,
      ];

      return intros[Math.floor(Math.random() * intros.length)];
    } else {
      // First session - more detailed family acknowledgment
      const familyIntroduction = familyMembersWithAges.length > 0 
        ? ` I'm absolutely delighted to meet ${userName}${familyMembersWithAges.length > 0 ? ` and ${familyMembersWithAges.join(", ")}` : " and your family"}.`
        : "";

      const intros = [
        `Hello everyone, I'm Dr. Jada Pearson. Welcome to our very first family session together.${familyIntroduction} You know, I've been working with families for eighteen years, and I want to acknowledge something really important - choosing to come together like this as a family takes genuine courage and love. It shows how much you all care about each other and about your family.${concernsIntro} This space belongs to all of you. It's a place where every single voice matters, where every perspective is valued, and where we'll work together at whatever pace feels right for everyone. We're going to focus on understanding each other better and building even stronger connections. I'm truly honored to be part of this journey with your family. So, let me start by asking - how is everyone feeling about being here today?`,

        `Hi family, I'm Dr. Jada Pearson, and I have to say, it's truly wonderful to meet all of you.${familyIntroduction} You know what I love most about families who come to therapy? It's not that they're perfect - no family is. It's that they're choosing to invest in each other, just like you're doing right now.${concernsIntro} What I've learned over my years working with families is that the most beautiful changes happen when family members decide to understand each other more deeply. That's exactly what we'll be doing together. This is the beginning of something really special, and I'm here to guide and support all of you as we explore new ways of connecting and communicating as a family. Tell me, what's been happening in your family's world lately?`,

        `Hello, I'm Dr. Jada Pearson. First, thank you all for being here today. I know coordinating everyone's schedules and making this commitment isn't always easy - believe me, I work with families every day, and I know the logistics alone can be challenging.${familyIntroduction} But your presence here today tells me something really beautiful about your family. It shows your dedication to each other and to your family's well-being.${concernsIntro} Together, we're going to create something special - a warm, supportive space where you can all share openly, listen to each other with real intention, and discover new strengths in your family. I'm honored to be part of this important work with all of you. So, how has everyone's week been?`,
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
  type?: string,
  sessionOptions?: {
    duration?: number; // Session duration in minutes (30 or 60)
    startTime?: string; // ISO string of session start time
  }
) => {
  // Determine therapy type from user profile if not explicitly provided
  const therapyType = type || userProfile?.therapyType || "couple";
  const baseConfig = getAssistantConfigByType(therapyType);

  // Session duration handling - default to 60 minutes if not specified
  const sessionDurationMinutes = sessionOptions?.duration || 60;
  const sessionDurationSeconds = sessionDurationMinutes * 60;
  
  // Calculate session timing thresholds
  const warningTimeSeconds = sessionDurationSeconds - (5 * 60); // 5 minutes before end
  const finalWarningTimeSeconds = sessionDurationSeconds - (1 * 60); // 1 minute before end

  // Build comprehensive variable values from user profile
  const variableValues: Record<string, any> = {
    // Session timing variables
    sessionDurationMinutes,
    sessionDurationSeconds,
    warningTimeMinutes: Math.floor(warningTimeSeconds / 60),
    finalWarningTimeMinutes: 1,
    sessionStartTime: sessionOptions?.startTime || new Date().toISOString(),
  };

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
      variableValues.familyMember1Relation = userProfile.familyMember1Relation || "";
      variableValues.familyMember2 = userProfile.familyMember2 || "";
      variableValues.familyMember2Age = userProfile.familyMember2Age || null;
      variableValues.familyMember2Relation = userProfile.familyMember2Relation || "";
      variableValues.familyMember3 = userProfile.familyMember3 || "";
      variableValues.familyMember3Age = userProfile.familyMember3Age || null;
      variableValues.familyMember3Relation = userProfile.familyMember3Relation || "";
      variableValues.familyMember4 = userProfile.familyMember4 || "";
      variableValues.familyMember4Age = userProfile.familyMember4Age || null;
      variableValues.familyMember4Relation = userProfile.familyMember4Relation || "";
      variableValues.familyMember5 = userProfile.familyMember5 || "";
      variableValues.familyMember5Age = userProfile.familyMember5Age || null;
      variableValues.familyMember5Relation = userProfile.familyMember5Relation || "";
      variableValues.familyMember6 = userProfile.familyMember6 || "";
      variableValues.familyMember6Age = userProfile.familyMember6Age || null;
      variableValues.familyMember6Relation = userProfile.familyMember6Relation || "";
      variableValues.familyMember7 = userProfile.familyMember7 || "";
      variableValues.familyMember7Age = userProfile.familyMember7Age || null;
      variableValues.familyMember7Relation = userProfile.familyMember7Relation || "";
    }
  }

  return {
    ...baseConfig,
    model: {
      ...baseConfig.model,
      messages: [
        {
          role: "system",
          content: getPersonalizedSystemPromptForType(therapyType, userProfile, sessionOptions),
        },
      ],
    },
    firstMessage: getPersonalizedFirstMessageForType(therapyType, userProfile),
    variableValues: variableValues,
    metadata: {
      therapyType,
      hasUserProfile: !!userProfile,
      userId: userProfile?.id,
      sessionDuration: sessionDurationMinutes,
    },
    // Session timing configuration for VAPI
    maxDurationSeconds: sessionDurationSeconds, // VAPI will automatically end the call after this duration
    silenceTimeoutSeconds: Math.min(baseConfig.silenceTimeoutSeconds || 45, 60), // Keep existing silence timeout
    
    // Enhanced settings for natural conversation
    recordingEnabled: true,
    hipaaEnabled: true,
    backgroundSound: "off", // Disable background office sounds for cleaner audio
    // Settings that are valid for assistant configuration
    modelOutputInMessagesEnabled: true,
  };
};
