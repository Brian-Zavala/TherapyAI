'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
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

export function useFamilyMembersEnhanced({
  enableBackwardCompatibility = true,
  autoSave = true,
  autoSaveDelay = 2000,
}: UseFamilyMembersOptions = {}): UseFamilyMembersReturn {
  const { data: session, status } = useSession()
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [hasLegacyData, setHasLegacyData] = useState(false)
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const previousMembersRef = useRef<string>('')

  // Load family members from API
  const loadFamilyMembers = useCallback(async () => {
    if (!session?.user?.id) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/users/${session.user.id}/family-members`)
      if (!response.ok) throw new Error('Failed to load family members')

      const data = await response.json()
      
      // Check if using new normalized structure
      if (data.familyMembers && Array.isArray(data.familyMembers)) {
        setFamilyMembers(data.familyMembers)
      } else if (enableBackwardCompatibility) {
        // Check for legacy data
        const legacyResponse = await fetch(`/api/users/${session.user.id}`)
        if (legacyResponse.ok) {
          const userData = await legacyResponse.json()
          const legacyMembers = extractLegacyFamilyMembers(userData)
          
          if (legacyMembers.length > 0) {
            setHasLegacyData(true)
            setFamilyMembers(legacyMembers)
          }
        }
      }
      
      // Store initial state for comparison
      previousMembersRef.current = JSON.stringify(familyMembers)
    } catch (err) {
      console.error('Error loading family members:', err)
      setError('Failed to load family members')
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id, enableBackwardCompatibility])

  // Extract legacy family members from old user schema
  const extractLegacyFamilyMembers = (userData: any): FamilyMember[] => {
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

  // Add new family member
  const addFamilyMember = useCallback((member: Omit<FamilyMember, 'id' | 'order'>) => {
    try {
      const validated = FamilyMemberSchema.omit({ id: true, order: true }).parse(member)
      
      const newMember: FamilyMember = {
        ...validated,
        id: `temp-${Date.now()}`, // Temporary ID until saved
        order: familyMembers.length,
        isActive: true,
      }
      
      setFamilyMembers(prev => [...prev, newMember])
      
      if (autoSave) {
        scheduleSave()
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(`Invalid family member data: ${err.errors[0].message}`)
      }
    }
  }, [familyMembers.length, autoSave])

  // Update existing family member
  const updateFamilyMember = useCallback((id: string, updates: Partial<FamilyMember>) => {
    setFamilyMembers(prev => prev.map(member =>
      member.id === id
        ? { ...member, ...updates }
        : member
    ))
    
    if (autoSave) {
      scheduleSave()
    }
  }, [autoSave])

  // Remove family member
  const removeFamilyMember = useCallback((id: string) => {
    setFamilyMembers(prev => {
      const filtered = prev.filter(member => member.id !== id)
      // Reorder remaining members
      return filtered.map((member, index) => ({
        ...member,
        order: index,
      }))
    })
    
    if (autoSave) {
      scheduleSave()
    }
  }, [autoSave])

  // Reorder family members
  const reorderFamilyMembers = useCallback((fromIndex: number, toIndex: number) => {
    setFamilyMembers(prev => {
      const reordered = [...prev]
      const [movedMember] = reordered.splice(fromIndex, 1)
      reordered.splice(toIndex, 0, movedMember)
      
      // Update order values
      return reordered.map((member, index) => ({
        ...member,
        order: index,
      }))
    })
    
    if (autoSave) {
      scheduleSave()
    }
  }, [autoSave])

  // Schedule auto-save
  const scheduleSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      saveFamilyMembers()
    }, autoSaveDelay)
  }, [autoSaveDelay])

  // Save family members to API
  const saveFamilyMembers = useCallback(async () => {
    if (!session?.user?.id || isSaving) return
    
    // Check if data has changed
    const currentData = JSON.stringify(familyMembers)
    if (currentData === previousMembersRef.current) {
      return // No changes to save
    }

    try {
      setIsSaving(true)
      setError(null)

      const response = await fetch(`/api/users/${session.user.id}/family-members`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyMembers }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to save family members')
      }

      const result = await response.json()
      
      // Update with server-generated IDs
      if (result.familyMembers) {
        setFamilyMembers(result.familyMembers)
        previousMembersRef.current = JSON.stringify(result.familyMembers)
      }
      
      // Clear legacy data flag after successful save
      if (hasLegacyData) {
        setHasLegacyData(false)
      }
    } catch (err: any) {
      console.error('Error saving family members:', err)
      setError(err.message || 'Failed to save family members')
    } finally {
      setIsSaving(false)
    }
  }, [session?.user?.id, familyMembers, isSaving, hasLegacyData])

  // Migrate from legacy format
  const migrateFromLegacyFormat = useCallback(async () => {
    if (!hasLegacyData || !session?.user?.id) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/users/${session.user.id}/migrate-family-members`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to migrate family members')
      }

      const result = await response.json()
      
      // Reload family members after migration
      await loadFamilyMembers()
      
      setHasLegacyData(false)
    } catch (err) {
      console.error('Error migrating family members:', err)
      setError('Failed to migrate family members')
    } finally {
      setLoading(false)
    }
  }, [hasLegacyData, session?.user?.id, loadFamilyMembers])

  // Load family members on mount
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.id) {
      loadFamilyMembers()
    }
  }, [status, session?.user?.id, loadFamilyMembers])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        // Save any pending changes
        saveFamilyMembers()
      }
    }
  }, [saveFamilyMembers])

  // Real-time sync with other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `family-members-${session?.user?.id}` && e.newValue) {
        try {
          const updatedMembers = JSON.parse(e.newValue)
          setFamilyMembers(updatedMembers)
        } catch (err) {
          console.error('Error syncing family members:', err)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [session?.user?.id])

  // Sync to localStorage for cross-tab communication
  useEffect(() => {
    if (session?.user?.id && familyMembers.length > 0) {
      localStorage.setItem(
        `family-members-${session.user.id}`,
        JSON.stringify(familyMembers)
      )
    }
  }, [session?.user?.id, familyMembers])

  return {
    familyMembers,
    loading,
    error,
    isSaving,
    
    // Actions
    addFamilyMember,
    updateFamilyMember,
    removeFamilyMember,
    reorderFamilyMembers,
    saveFamilyMembers,
    
    // Migration helpers
    migrateFromLegacyFormat,
    hasLegacyData,
  }
}