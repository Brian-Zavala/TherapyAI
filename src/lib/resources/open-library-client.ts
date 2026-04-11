// Open Library API client — completely free, no auth required
// Docs: https://openlibrary.org/developers/api

const BASE_URL = 'https://openlibrary.org'

export interface BookResult {
  title: string
  authors: string[]
  description: string
  openLibraryKey: string
  url: string
  coverUrl?: string
}

// Search terms per insight category
const CATEGORY_QUERIES: Record<string, string> = {
  communication: 'communication skills relationships',
  emotional: 'emotional intelligence self-awareness',
  behavioral: 'cognitive behavioral therapy workbook',
  'mental-health': 'mental health self-help therapy',
  relationship: 'couples therapy relationship skills',
  progress: 'therapy progress personal growth mindfulness',
}

interface OpenLibraryDoc {
  key: string
  title: string
  author_name?: string[]
  first_sentence?: { value: string } | string
}

interface OpenLibraryResponse {
  docs: OpenLibraryDoc[]
  numFound: number
}

export async function fetchBooksForCategory(
  category: string,
  limit = 2
): Promise<BookResult[]> {
  const query = CATEGORY_QUERIES[category] || 'therapy self-help'
  const encoded = encodeURIComponent(query)

  try {
    const res = await fetch(
      `${BASE_URL}/search.json?q=${encoded}&limit=5&fields=key,title,author_name,first_sentence`,
      { next: { revalidate: 86400 } }  // cache for 24 hours
    )

    if (!res.ok) return []

    const data: OpenLibraryResponse = await res.json()
    if (!data.docs?.length) return []

    return data.docs
      .filter(doc => doc.title && doc.author_name?.length)
      .slice(0, limit)
      .map(doc => {
        const firstSentence = typeof doc.first_sentence === 'object'
          ? doc.first_sentence?.value
          : doc.first_sentence

        return {
          title: doc.title,
          authors: doc.author_name ?? [],
          description: firstSentence
            ? firstSentence.length > 160
              ? firstSentence.slice(0, 157) + '...'
              : firstSentence
            : 'A recommended read for this area of growth.',
          openLibraryKey: doc.key,
          url: `${BASE_URL}${doc.key}`,
        }
      })
  } catch {
    // External API failure is non-fatal — return empty
    return []
  }
}
