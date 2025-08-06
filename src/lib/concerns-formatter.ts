import { THERAPY_CONCERNS, getConcernsByIds } from '@/data/therapy-concerns';

/**
 * Enhanced concerns formatter that works with the new concern ID structure
 * Maps the new concern IDs to natural language for VAPI assistant context
 */
export const formatConcernsForVAPI = (
  concernIds: string[] | undefined | null,
  therapyType: 'solo' | 'couple' = 'solo',
  context: 'system' | 'greeting' | 'conversation' = 'system'
): string => {
  if (!concernIds || concernIds.length === 0) {
    return '';
  }

  // Get full concern objects from IDs
  const concerns = getConcernsByIds(concernIds);
  
  if (concerns.length === 0) {
    return '';
  }

  // Group concerns by category for natural formatting
  const grouped = {
    relational: concerns.filter(c => c.category === 'relational'),
    emotional: concerns.filter(c => c.category === 'emotional'),
    practical: concerns.filter(c => c.category === 'practical'),
    future: concerns.filter(c => c.category === 'future'),
    personal: concerns.filter(c => c.category === 'personal')
  };

  // Format based on context

  if (context === 'system') {
    // System prompt: comprehensive list
    return concerns.map(c => c.label.toLowerCase()).join(', ');
  }

  if (context === 'greeting') {
    // Greeting: warm and contextual based on therapy type
    if (therapyType === 'couple') {
      // Prioritize relationship concerns for couples
      const primary = grouped.relational[0];
      const secondary = [...grouped.emotional, ...grouped.practical].slice(0, 2);
      
      if (primary) {
        const primaryText = `work on ${primary.label.toLowerCase()}`;
        if (secondary.length > 0) {
          const secondaryText = secondary.map(c => c.label.toLowerCase()).join(' and ');
          return `I understand you're both here to ${primaryText}, while also addressing ${secondaryText}.`;
        }
        return `I see you're both here to ${primaryText} in your relationship.`;
      }
    }
    
    // Solo therapy or no relational concerns
    const topConcerns = concerns.slice(0, 3);
    if (topConcerns.length === 1) {
      return `I understand you're here to work on ${topConcerns[0].label.toLowerCase()}.`;
    } else if (topConcerns.length === 2) {
      return `I see you'd like to explore ${topConcerns[0].label.toLowerCase()} and ${topConcerns[1].label.toLowerCase()}.`;
    } else {
      const first = topConcerns[0].label.toLowerCase();      const rest = topConcerns.slice(1).map(c => c.label.toLowerCase());
      return `I understand you're dealing with ${first}, as well as ${rest.join(' and ')}.`;
    }
  }

  // Conversation context: natural flow
  const labels = concerns.map(c => c.label.toLowerCase());
  
  if (labels.length === 1) {
    return labels[0];
  } else if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  } else {
    const last = labels.pop();
    return `${labels.join(', ')}, and ${last}`;
  }
};

/**
 * Get concerns summary for session context
 * Returns a structured summary with primary and secondary concerns
 */
export const getConcernsSummary = (concernIds: string[]): {
  primary: string[];
  secondary: string[];
  categories: string[];
  formatted: string;
} => {
  const concerns = getConcernsByIds(concernIds);
  
  // Group by category
  const byCategory = concerns.reduce((acc, concern) => {
    if (!acc[concern.category]) {
      acc[concern.category] = [];
    }
    acc[concern.category].push(concern.label);
    return acc;
  }, {} as Record<string, string[]>);  
  // Determine primary concerns (first 3 or most common)
  const primary = concerns
    .filter(c => c.common)
    .slice(0, 3)
    .map(c => c.label);
  
  // Secondary concerns (rest)
  const secondary = concerns
    .filter(c => !primary.includes(c.label))
    .map(c => c.label);
  
  return {
    primary: primary.length > 0 ? primary : concerns.slice(0, 3).map(c => c.label),
    secondary,
    categories: Object.keys(byCategory),
    formatted: formatConcernsForVAPI(concernIds, 'solo', 'system')
  };
};

/**
 * Convert legacy concern IDs to new format
 * For backward compatibility with existing data
 */
export const migrateLegacyConcerns = (legacyConcerns: string[]): string[] => {
  const legacyMapping: Record<string, string> = {
    // Old ID -> New ID mapping
    'relationships': 'emotional-disconnect',
    'family-dynamics': 'in-laws',
    'life-transitions': 'relocation',
    'other': 'personal-growth',
    // Direct matches (same ID)
    'anxiety': 'anxiety',
    'depression': 'depression',
    'communication': 'communication',
    'conflict': 'conflict',
    'intimacy': 'intimacy',
    'trust': 'trust',
    'stress': 'stress',
    'self-esteem': 'self-esteem',
    'grief': 'grief',
    'trauma': 'trauma',
    'parenting': 'parenting',
    'work-life': 'work-life',
    'addiction': 'addiction',
    'anger': 'anger'
  };
  
  return legacyConcerns
    .map(old => legacyMapping[old] || old)
    .filter(id => THERAPY_CONCERNS.some(c => c.id === id));
};