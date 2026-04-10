'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useSession } from '@/hooks/useClerkSession'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

// Family member schema with validation
const FamilyMemberSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(255),
  age: z.number().int().min(0).max(150).nullable().optional(),
  relation: z.string().max(100).nullable().optional(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

export type FamilyMember = z.infer<typeof FamilyMemberSchema>

interface UseFamilyMembersOptions {
  enableBackwardCompatibility?: boolean
  autoSave?: boolean
  autoSaveDelay?: number
}

interface UseFamilyMembersReturn {
  familyMembers: FamilyMember[]
  loading: boolean
  error: string | null
  isSaving: boolean

  // Actions
  addFamilyMember: (member: Omit<FamilyMember, 'id' | 'order'>) => void
  updateFamilyMember: (id: string, updates: Partial<FamilyMember>) => void
  removeFamilyMember: (id: string) => void
  reorderFamilyMembers: (fromIndex: number, toIndex: number) => void
  saveFamilyMembers: () => Promise<void>

  // Migration helpers
  migrateFromLegacyFormat: () => Promise<void>
  hasLegacyData: boolean
}

// Extract legacy family members from old user schema
function extractLegacyFamilyMembers(userData: any): FamilyMember[] {
  const members: FamilyMember[] = []
  for (let i = 1; i <= 7; i++) {
    const name = userData[`familyMember${i}`]
    if (name) {
      members.push({
        id: `legacy-${i}`,
        name,
        age: userData[`familyMemberAge${i}`] || null,
        relation: userData[`familyMemberRelation${i}`] || null,
        order: i - 1,
        isActive: true,
      })
    }
  }
  return members
}

async function fetchFamilyMembers(userId: string, enableBackwardCompatibility: boolean) {
  const response = await fetch(`/api/users/${userId}/family-members`)
  if (!response.ok) throw new Error('Failed to load family members')

  const data = await response.json()

  if (data.familyMembers && Array.isArray(data.familyMembers)) {
    return { members: data.familyMembers as FamilyMember[], isLegacy: false }
  }

  if (enableBackwardCompatibility) {
    const legacyResponse = await fetch(`/api/users/${userId}`)
    if (legacyResponse.ok) {
      const userData = await legacyResponse.json()
      const legacyMembers = extractLegacyFamilyMembers(userData)
      if (legacyMembers.length > 0) {
        return { members: legacyMembers, isLegacy: true }
      }
    }
  }

  return { members: [] as FamilyMember[], isLegacy: false }
}

export function useFamilyMembersEnhanced({
  enableBackwardCompatibility = true,
  autoSave = true,
  autoSaveDelay = 2000,
}: UseFamilyMembersOptions = {}): UseFamilyMembersReturn {
  const { data: session, status } = useSession()
  const userId = session?.user?.id
  const queryClient = useQueryClient()

  // Local state for optimistic edits between saves
  const [localMembers, setLocalMembers] = useState<FamilyMember[] | null>(null)
  const [hasLegacyData, setHasLegacyData] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const previousMembersRef = useRef<string>('')

  // Fetch family members
  const { data: queryData, isLoading: queryLoading, error: queryError } = useQuery({
    queryKey: ['familyMembers', userId],
    queryFn: () => fetchFamilyMembers(userId!, enableBackwardCompatibility),
    enabled: status === 'authenticated' && !!userId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  })

  // Sync query data to local state and legacy flag
  useEffect(() => {
    if (queryData) {
      if (localMembers === null) {
        setLocalMembers(queryData.members)
        previousMembersRef.current = JSON.stringify(queryData.members)
      }
      setHasLegacyData(queryData.isLegacy)
    }
  }, [queryData]) // eslint-disable-line react-hooks/exhaustive-deps

  const familyMembers = localMembers ?? queryData?.members ?? []

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (members: FamilyMember[]) => {
      const response = await fetch(`/api/users/${userId}/family-members`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyMembers: members }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to save family members')
      }
      return response.json()
    },
    onSuccess: (result) => {
      if (result.familyMembers) {
        setLocalMembers(result.familyMembers)
        previousMembersRef.current = JSON.stringify(result.familyMembers)
        queryClient.setQueryData(['familyMembers', userId], {
          members: result.familyMembers,
          isLegacy: false,
        })
      }
      if (hasLegacyData) setHasLegacyData(false)
    },
  })

  // Migration mutation
  const migrateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/users/${userId}/migrate-family-members`, { method: 'POST' })
      if (!response.ok) throw new Error('Failed to migrate family members')
      return response.json()
    },
    onSuccess: () => {
      setHasLegacyData(false)
      queryClient.invalidateQueries({ queryKey: ['familyMembers', userId] })
      setLocalMembers(null) // reset so query data takes over
    },
  })

  // Schedule auto-save
  const scheduleSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      // Will be called with current familyMembers via saveFamilyMembers
      const current = localMembers
      if (current && JSON.stringify(current) !== previousMembersRef.current) {
        saveMutation.mutate(current)
      }
    }, autoSaveDelay)
  }, [autoSaveDelay, localMembers, saveMutation])

  const saveFamilyMembers = useCallback(async () => {
    if (!userId || saveMutation.isPending) return
    const currentData = JSON.stringify(familyMembers)
    if (currentData === previousMembersRef.current) return
    saveMutation.mutate(familyMembers)
  }, [userId, familyMembers, saveMutation])

  // Add new family member
  const addFamilyMember = useCallback((member: Omit<FamilyMember, 'id' | 'order'>) => {
    try {
      const validated = FamilyMemberSchema.omit({ id: true, order: true }).parse(member)
      setLocalMembers(prev => {
        const current = prev ?? []
        return [...current, {
          ...validated,
          id: `temp-${Date.now()}`,
          order: current.length,
          isActive: true,
        }]
      })
      if (autoSave) scheduleSave()
    } catch (err) {
      // validation error handled silently
    }
  }, [autoSave, scheduleSave])

  // Update existing family member
  const updateFamilyMember = useCallback((id: string, updates: Partial<FamilyMember>) => {
    setLocalMembers(prev => (prev ?? []).map(member =>
      member.id === id ? { ...member, ...updates } : member
    ))
    if (autoSave) scheduleSave()
  }, [autoSave, scheduleSave])

  // Remove family member
  const removeFamilyMember = useCallback((id: string) => {
    setLocalMembers(prev => {
      const filtered = (prev ?? []).filter(member => member.id !== id)
      return filtered.map((member, index) => ({ ...member, order: index }))
    })
    if (autoSave) scheduleSave()
  }, [autoSave, scheduleSave])

  // Reorder family members
  const reorderFamilyMembers = useCallback((fromIndex: number, toIndex: number) => {
    setLocalMembers(prev => {
      const reordered = [...(prev ?? [])]
      const [movedMember] = reordered.splice(fromIndex, 1)
      reordered.splice(toIndex, 0, movedMember)
      return reordered.map((member, index) => ({ ...member, order: index }))
    })
    if (autoSave) scheduleSave()
  }, [autoSave, scheduleSave])

  const migrateFromLegacyFormat = useCallback(async () => {
    if (!hasLegacyData || !userId) return
    migrateMutation.mutate()
  }, [hasLegacyData, userId, migrateMutation])

  // Cross-tab sync
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `family-members-${userId}` && e.newValue) {
        try {
          setLocalMembers(JSON.parse(e.newValue))
        } catch {}
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [userId])

  // Sync to localStorage for cross-tab communication
  useEffect(() => {
    if (userId && familyMembers.length > 0) {
      localStorage.setItem(`family-members-${userId}`, JSON.stringify(familyMembers))
    }
  }, [userId, familyMembers])

  // Cleanup on unmount — save pending changes
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const error = queryError instanceof Error ? queryError.message :
    saveMutation.error instanceof Error ? saveMutation.error.message :
    migrateMutation.error instanceof Error ? migrateMutation.error.message : null

  return {
    familyMembers,
    loading: queryLoading || migrateMutation.isPending,
    error,
    isSaving: saveMutation.isPending,

    addFamilyMember,
    updateFamilyMember,
    removeFamilyMember,
    reorderFamilyMembers,
    saveFamilyMembers,

    migrateFromLegacyFormat,
    hasLegacyData,
  }
}
