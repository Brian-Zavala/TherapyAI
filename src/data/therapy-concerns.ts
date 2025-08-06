export interface TherapyConcern {
  id: string;
  label: string;
  category: 'emotional' | 'relational' | 'practical' | 'future' | 'personal';
  description?: string;
  common?: boolean; // Flag for most common concerns
}

export const THERAPY_CONCERNS: TherapyConcern[] = [
  // Relational Concerns (Most Common)
  { id: 'communication', label: 'Communication Issues', category: 'relational', common: true },
  { id: 'trust', label: 'Trust Issues', category: 'relational', common: true },
  { id: 'intimacy', label: 'Intimacy Problems', category: 'relational', common: true },
  { id: 'conflict', label: 'Frequent Conflicts', category: 'relational', common: true },
  { id: 'emotional-disconnect', label: 'Emotional Disconnect', category: 'relational', common: true },
  { id: 'infidelity', label: 'Infidelity', category: 'relational' },
  { id: 'boundaries', label: 'Boundary Issues', category: 'relational' },
  { id: 'codependency', label: 'Codependency', category: 'relational' },
  { id: 'roommates', label: 'Feeling Like Roommates', category: 'relational' },
  { id: 'different-love-languages', label: 'Different Love Languages', category: 'relational' },
  
  // Emotional Concerns
  { id: 'anxiety', label: 'Anxiety', category: 'emotional', common: true },
  { id: 'depression', label: 'Depression', category: 'emotional', common: true },
  { id: 'trauma', label: 'Past Trauma', category: 'emotional' },
  { id: 'grief', label: 'Grief/Loss', category: 'emotional' },  { id: 'anger', label: 'Anger Management', category: 'emotional' },
  { id: 'stress', label: 'Stress/Overwhelm', category: 'emotional' },
  { id: 'self-esteem', label: 'Low Self-Esteem', category: 'emotional' },
  { id: 'abandonment', label: 'Abandonment Fears', category: 'emotional' },
  { id: 'jealousy', label: 'Jealousy', category: 'emotional' },
  { id: 'resentment', label: 'Resentment', category: 'emotional' },
  
  // Practical Concerns
  { id: 'finances', label: 'Financial Stress', category: 'practical', common: true },
  { id: 'parenting', label: 'Parenting Differences', category: 'practical', common: true },
  { id: 'work-life', label: 'Work-Life Balance', category: 'practical', common: true },
  { id: 'household', label: 'Household Responsibilities', category: 'practical' },
  { id: 'in-laws', label: 'In-Law Issues', category: 'practical' },
  { id: 'blended-family', label: 'Blended Family Challenges', category: 'practical' },
  { id: 'career', label: 'Career Decisions', category: 'practical' },
  { id: 'relocation', label: 'Relocation Stress', category: 'practical' },
  { id: 'cultural-differences', label: 'Cultural Differences', category: 'practical' },
  { id: 'religious-differences', label: 'Religious Differences', category: 'practical' },
  
  // Future/Planning Concerns
  { id: 'commitment', label: 'Commitment Issues', category: 'future' },
  { id: 'marriage', label: 'Marriage Decisions', category: 'future' },
  { id: 'children', label: 'Having Children', category: 'future' },
  { id: 'life-goals', label: 'Different Life Goals', category: 'future' },
  { id: 'retirement', label: 'Retirement Planning', category: 'future' },
  { id: 'lifestyle', label: 'Lifestyle Differences', category: 'future' },  
  // Personal/Individual Concerns
  { id: 'substance-use', label: 'Substance Use', category: 'personal' },
  { id: 'addiction', label: 'Addiction Issues', category: 'personal' },
  { id: 'mental-health', label: 'Mental Health', category: 'personal' },
  { id: 'sexual-issues', label: 'Sexual Dysfunction', category: 'personal' },
  { id: 'health-problems', label: 'Health Problems', category: 'personal' },
  { id: 'aging', label: 'Aging Concerns', category: 'personal' },
  { id: 'identity', label: 'Identity Issues', category: 'personal' },
  { id: 'personal-growth', label: 'Personal Growth', category: 'personal' },
];

// Helper functions to organize concerns
export const getConcernsByCategory = (category: TherapyConcern['category']) => 
  THERAPY_CONCERNS.filter(concern => concern.category === category);

export const getCommonConcerns = () => 
  THERAPY_CONCERNS.filter(concern => concern.common);

export const getConcernById = (id: string) => 
  THERAPY_CONCERNS.find(concern => concern.id === id);

export const getConcernsByIds = (ids: string[]) => 
  THERAPY_CONCERNS.filter(concern => ids.includes(concern.id));

// Category labels for display
export const CONCERN_CATEGORIES = {
  emotional: 'Emotional & Mental Health',
  relational: 'Relationship & Communication',
  practical: 'Life & Family Challenges',
  future: 'Future & Goals',
  personal: 'Personal Issues'
} as const;