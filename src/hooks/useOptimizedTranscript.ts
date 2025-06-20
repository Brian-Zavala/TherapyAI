'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase-singleton'

// Get Supabase client singleton
const supabase = getSupabaseClient()

interface TranscriptEntry {
  id: string
  sessionId: string
  speaker: string
  text: string
  timestamp: string
  isFinal: boolean
}

interface UseOptimizedTranscriptOptions {
  sessionId: string
  isActive?: boolean
  pageSize?: number
}

interface UseOptimizedTranscriptReturn {
  entries: TranscriptEntry[]
  isLoading: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
}

// Request deduplication
const pendingRequests = new Map<string, Promise<any>>()

async function deduplicatedFetch(key: string, fetcher: () => Promise<any>) {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)
  }
  
  const promise = fetcher()
  pendingRequests.set(key, promise)
  
  try {
    return await promise
  } finally {
    pendingRequests.delete(key)
  }
}

export function useOptimizedTranscript({
  sessionId,
  isActive = false,
  pageSize = 50
}: UseOptimizedTranscriptOptions): UseOptimizedTranscriptReturn {
  const [entries, setEntries] = useState<TranscriptEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  
  const channelRef = useRef<any>(null)
  const entriesMapRef = useRef(new Map<string, TranscriptEntry>())

  // Load transcript entries with pagination
  const loadEntries = useCallback(async (pageNum: number, append: boolean = false) => {
    const key = `transcript:${sessionId}:${pageNum}`
    
    try {
      const data = await deduplicatedFetch(key, async () => {
        const response = await fetch(
          `/api/sessions/${sessionId}/transcript?page=${pageNum}&limit=${pageSize}`,
          {
            headers: {
              'Cache-Control': 'no-cache'
            }
          }
        )
        
        if (!response.ok) {
          throw new Error('Failed to load transcript')
        }
        
        return response.json()
      })
      
      // Deduplicate entries using Map
      const newEntries = data.entries || []
      newEntries.forEach((entry: TranscriptEntry) => {
        entriesMapRef.current.set(entry.id, entry)
      })
      
      // Convert map to array and sort by timestamp
      const allEntries = Array.from(entriesMapRef.current.values())
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      
      setEntries(allEntries)
      setHasMore(data.hasMore || false)
      
      if (append) {
        setPage(pageNum)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transcript')
      console.error('Error loading transcript:', err)
    }
  }, [sessionId, pageSize])

  // Initial load
  useEffect(() => {
    setIsLoading(true)
    loadEntries(0)
      .finally(() => setIsLoading(false))
  }, [sessionId, loadEntries])

  // Setup real-time subscription for active sessions
  useEffect(() => {
    if (!isActive || !sessionId) return

    // Create channel for real-time updates
    const channel = supabase
      .channel(`transcript:${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'TranscriptEntry',
        filter: `sessionId=eq.${sessionId}`
      }, (payload) => {
        const newEntry = payload.new as TranscriptEntry
        
        // Add to map (handles deduplication)
        entriesMapRef.current.set(newEntry.id, newEntry)
        
        // Update state with sorted entries
        const allEntries = Array.from(entriesMapRef.current.values())
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        
        setEntries(allEntries)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'TranscriptEntry',
        filter: `sessionId=eq.${sessionId}`
      }, (payload) => {
        const updatedEntry = payload.new as TranscriptEntry
        
        // Update in map
        entriesMapRef.current.set(updatedEntry.id, updatedEntry)
        
        // Update state
        const allEntries = Array.from(entriesMapRef.current.values())
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        
        setEntries(allEntries)
      })
      .subscribe()

    channelRef.current = channel

    // Cleanup
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [sessionId, isActive])

  // Load more entries
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return
    
    setIsLoading(true)
    try {
      await loadEntries(page + 1, true)
    } finally {
      setIsLoading(false)
    }
  }, [page, hasMore, isLoading, loadEntries])

  // Refresh all entries
  const refresh = useCallback(async () => {
    entriesMapRef.current.clear()
    setPage(0)
    setIsLoading(true)
    
    try {
      await loadEntries(0)
    } finally {
      setIsLoading(false)
    }
  }, [loadEntries])

  return {
    entries,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh
  }
}