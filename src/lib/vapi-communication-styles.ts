/**
 * VAPI Communication Style Guidance
 * Maps profile communication styles to therapeutic guidance for VAPI AI therapist
 */

export type CommunicationStyle = 
  | 'direct'
  | 'gentle'
  | 'structured'
  | 'exploratory'
  | 'collaborative'
  | 'motivational'
  | 'analytical'
  | 'balanced';

export interface CommunicationGuidance {
  style: CommunicationStyle;
  guidance: string;
  approach: string[];
  techniques: string[];
}

const COMMUNICATION_STYLES: Record<CommunicationStyle, CommunicationGuidance> = {
  direct: {
    style: 'direct',
    guidance: 'Be direct and straightforward in your communication, addressing issues clearly while remaining empathetic. Get to the point quickly and offer clear, practical advice.',
    approach: [
      'Clear and concise language',
      'Focus on solutions',
      'Address issues head-on',
      'Practical advice and action steps'
    ],
    techniques: [
      'Use "I notice" statements',
      'Provide specific examples',
      'Offer actionable steps',
      'Summarize key points clearly'
    ]
  },
  
  gentle: {
    style: 'gentle',
    guidance: 'Use gentle, supportive language throughout. Be particularly warm and nurturing, creating a safe space for expression. Validate emotions before offering suggestions.',
    approach: [
      'Soft and compassionate tone',
      'Emotional validation first',
      'Gradual exploration',
      'Emphasis on safety and comfort'
    ],
    techniques: [
      'Reflect feelings frequently',
      'Use metaphors and stories',
      'Offer gentle suggestions',
      'Normalize experiences'
    ]
  },
  
  structured: {
    style: 'structured',
    guidance: 'Provide a clear framework and organized approach to the session. Set agendas, track progress systematically, and use structured exercises.',
    approach: [
      'Clear session structure',
      'Goal-oriented discussions',
      'Step-by-step processes',
      'Regular progress checks'
    ],
    techniques: [
      'Start with agenda setting',
      'Use numbered steps',
      'Track progress explicitly',
      'End with clear action items'
    ]
  },
  
  exploratory: {
    style: 'exploratory',
    guidance: 'Encourage deep exploration and self-discovery. Ask open-ended questions, follow their lead, and help them uncover insights through reflection.',
    approach: [
      'Open-ended questioning',
      'Follow client\'s lead',
      'Deep diving into topics',
      'Encourage self-discovery'
    ],
    techniques: [
      'Use "What if" questions',
      'Explore underlying patterns',
      'Connect past to present',
      'Encourage free association'
    ]
  },
  
  collaborative: {
    style: 'collaborative',
    guidance: 'Work as a team with the client(s). Emphasize partnership, shared decision-making, and co-creating solutions together.',
    approach: [
      'Partnership emphasis',
      'Shared problem-solving',
      'Joint decision-making',
      'Co-created solutions'
    ],
    techniques: [
      'Use "we" language frequently',
      'Ask for their ideas first',
      'Build on their suggestions',
      'Collaborate on homework'
    ]
  },
  
  motivational: {
    style: 'motivational',
    guidance: 'Be energizing and inspiring. Focus on strengths, celebrate progress, and help build momentum toward positive change.',
    approach: [
      'Positive and energetic tone',
      'Focus on strengths',
      'Celebrate all progress',
      'Build momentum'
    ],
    techniques: [
      'Highlight successes',
      'Use encouraging language',
      'Reframe challenges as opportunities',
      'Set inspiring goals'
    ]
  },
  
  analytical: {
    style: 'analytical',
    guidance: 'Take a thoughtful, analytical approach. Help identify patterns, explore cause-and-effect relationships, and develop deep understanding.',
    approach: [
      'Pattern recognition',
      'Cause-effect analysis',
      'Systematic exploration',
      'Evidence-based insights'
    ],
    techniques: [
      'Identify recurring patterns',
      'Analyze behavioral sequences',
      'Use data and examples',
      'Draw logical connections'
    ]
  },
  
  balanced: {
    style: 'balanced',
    guidance: 'Adapt your style to what feels most helpful in the moment. Balance directness with warmth, structure with flexibility, and support with challenge.',
    approach: [
      'Flexible approach',
      'Read the room',
      'Adapt to needs',
      'Balance multiple styles'
    ],
    techniques: [
      'Assess what\'s needed',
      'Switch approaches smoothly',
      'Combine techniques',
      'Stay responsive to feedback'
    ]
  }
};

/**
 * Get communication guidance for VAPI based on user's selected style
 */
export function getCommunicationGuidance(style?: string | null): string {
  const normalizedStyle = (style?.toLowerCase() || 'balanced') as CommunicationStyle;
  const styleConfig = COMMUNICATION_STYLES[normalizedStyle] || COMMUNICATION_STYLES.balanced;
  
  return styleConfig.guidance;
}

/**
 * Get detailed communication configuration for advanced VAPI setup
 */
export function getCommunicationConfig(style?: string | null): CommunicationGuidance {
  const normalizedStyle = (style?.toLowerCase() || 'balanced') as CommunicationStyle;
  return COMMUNICATION_STYLES[normalizedStyle] || COMMUNICATION_STYLES.balanced;
}

/**
 * Build comprehensive communication instructions for VAPI prompt
 */
export function buildCommunicationInstructions(style?: string | null): string {
  const config = getCommunicationConfig(style);
  
  return `
COMMUNICATION STYLE: ${config.style.toUpperCase()}

${config.guidance}

APPROACH:
${config.approach.map(a => `• ${a}`).join('\n')}

TECHNIQUES TO USE:
${config.techniques.map(t => `• ${t}`).join('\n')}

Remember to maintain this communication style consistently throughout the session while remaining authentic and responsive to the client's needs.
`;
}

export default {
  getCommunicationGuidance,
  getCommunicationConfig,
  buildCommunicationInstructions
};