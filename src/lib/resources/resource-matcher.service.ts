// Resource matching service
// Scores curated resources against insight data, user profile, and session analytics

import { prisma } from '@/lib/prisma-optimized'

export interface ResourceMatch {
  id: string
  title: string
  description: string
  type: string
  source: string
  url?: string | null
  duration?: string | null
  difficulty: string
  relevanceScore: number
  relevanceReasons: string[]
}

export interface MatchInput {
  category: string
  priority: 'high' | 'medium' | 'low'
  sessionType: 'SOLO' | 'COUPLE' | 'FAMILY'
  concerns: string[]         // from userProfile.currentConcerns
  topics: string[]           // from transcript topics (already extracted by VAPI pipeline)
  limit?: number
}

// Map insight categories to concern keywords derived from transcript/analytics
const CATEGORY_CONCERN_MAP: Record<string, string[]> = {
  communication: ['communication', 'conflict', 'trust'],
  emotional: ['anxiety', 'stress', 'anger', 'depression'],
  behavioral: ['anger', 'conflict', 'stress'],
  'mental-health': ['anxiety', 'depression', 'grief', 'self-esteem', 'stress'],
  relationship: ['trust', 'communication', 'conflict'],
  progress: ['depression', 'anxiety', 'stress', 'self-esteem'],
}

// Map common transcript topic words to our concern taxonomy
const TOPIC_TO_CONCERN: Record<string, string> = {
  anxiety: 'anxiety',
  anxious: 'anxiety',
  worried: 'anxiety',
  worry: 'anxiety',
  panic: 'anxiety',
  depress: 'depression',
  sad: 'depression',
  hopeless: 'depression',
  grief: 'grief',
  loss: 'grief',
  angry: 'anger',
  anger: 'anger',
  frustrat: 'anger',
  rage: 'anger',
  trust: 'trust',
  honest: 'trust',
  betray: 'trust',
  communic: 'communication',
  listen: 'communication',
  argue: 'conflict',
  conflict: 'conflict',
  fight: 'conflict',
  stress: 'stress',
  overwhelm: 'stress',
  burnout: 'stress',
  'self-esteem': 'self-esteem',
  confidence: 'self-esteem',
  shame: 'self-esteem',
}

function topicsToConcrns(topics: string[]): string[] {
  const concerns = new Set<string>()
  for (const topic of topics) {
    const lower = topic.toLowerCase()
    for (const [keyword, concern] of Object.entries(TOPIC_TO_CONCERN)) {
      if (lower.includes(keyword)) {
        concerns.add(concern)
      }
    }
  }
  return Array.from(concerns)
}

function scoreSingleResource(
  resource: { categories: string[]; sessionTypes: string[]; concerns: string[]; difficulty: string },
  input: MatchInput,
  derivedConcerns: string[],
  allConcerns: string[]
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  // Category match (40 points)
  if (resource.categories.includes(input.category)) {
    score += 40
    reasons.push(`Matches your ${input.category} insight`)
  } else {
    // Partial credit for related categories
    const impliedConcerns = CATEGORY_CONCERN_MAP[input.category] || []
    const categoryOverlap = resource.categories.filter(c => {
      const rc = CATEGORY_CONCERN_MAP[c] || []
      return rc.some(concern => impliedConcerns.includes(concern))
    })
    if (categoryOverlap.length > 0) {
      score += 15
    }
  }

  // Session type match (20 points)
  if (resource.sessionTypes.length === 0) {
    score += 20  // applies to all session types
    reasons.push('Universal technique')
  } else if (resource.sessionTypes.includes(input.sessionType)) {
    score += 20
    reasons.push(`Tailored for ${input.sessionType.toLowerCase()} sessions`)
  } else {
    // Wrong session type — small penalty so mismatched resources rank lower
    score -= 10
  }

  // Concern overlap (30 points — split across matches)
  const matchingConcerns = resource.concerns.filter(c => allConcerns.includes(c))
  if (matchingConcerns.length > 0) {
    const concernScore = Math.min(30, matchingConcerns.length * 12)
    score += concernScore
    if (matchingConcerns.length === 1) {
      reasons.push(`Addresses ${matchingConcerns[0]}`)
    } else {
      reasons.push(`Addresses ${matchingConcerns.slice(0, 2).join(' & ')}`)
    }
  }

  // Priority boosts difficulty alignment (10 points)
  if (input.priority === 'high' && resource.difficulty === 'beginner') {
    score += 10
    reasons.push('Easy to start immediately')
  } else if (input.priority === 'medium' && resource.difficulty === 'intermediate') {
    score += 10
  } else if (input.priority === 'low' && resource.difficulty === 'advanced') {
    score += 10
  }

  // Transcript topic bonus (up to 10 extra points)
  const topicMatches = resource.concerns.filter(c => derivedConcerns.includes(c))
  if (topicMatches.length > 0) {
    score += Math.min(10, topicMatches.length * 5)
    reasons.push('Based on your session topics')
  }

  return { score, reasons }
}

export async function getMatchedResources(input: MatchInput): Promise<ResourceMatch[]> {
  const limit = input.limit ?? 6

  // Derive concerns from transcript topics
  const derivedConcerns = topicsToConcrns(input.topics)

  // Combine: user profile concerns + category implied concerns + transcript derived
  const categoryConcerns = CATEGORY_CONCERN_MAP[input.category] || []
  const allConcerns = Array.from(new Set([
    ...input.concerns,
    ...categoryConcerns,
    ...derivedConcerns,
  ]))

  // Fetch all resources (small table — full scan is fine)
  const resources = await prisma.resource.findMany()

  const scored = resources
    .map(r => {
      const { score, reasons } = scoreSingleResource(
        { categories: r.categories, sessionTypes: r.sessionTypes, concerns: r.concerns, difficulty: r.difficulty },
        input,
        derivedConcerns,
        allConcerns,
      )
      return {
        id: r.id,
        title: r.title,
        description: r.description,
        type: r.type,
        source: r.source,
        url: r.url,
        duration: r.duration,
        difficulty: r.difficulty,
        relevanceScore: score,
        relevanceReasons: reasons,
      } as ResourceMatch
    })
    .filter(r => r.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit)

  return scored
}
