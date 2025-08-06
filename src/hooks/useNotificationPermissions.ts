import { useProfile } from '@/providers/ProfileProvider'
import { useCallback, useMemo } from 'react'

interface NotificationPermissions {
  hasEmailPermission: boolean
  hasSmsPermission: boolean
  hasSmsConsent: boolean
  hasAnyPermission: boolean
  isLoading: boolean
  notificationPrefs: string[]
  phone?: string | null
  checkPermissions: () => { needsPermission: boolean; permissions: NotificationPermissions }
}

export function useNotificationPermissions(): NotificationPermissions {
  const { profile, isLoading } = useProfile()
  
  const notificationPrefs = useMemo(() => {
    if (!profile?.notificationPrefs) return []
    
    // Handle both array and string formats
    if (Array.isArray(profile.notificationPrefs)) {
      return profile.notificationPrefs
    }
    
    // Legacy string format
    if (profile.notificationPrefs === 'none') return []
    return [profile.notificationPrefs]
  }, [profile?.notificationPrefs])
  
  const hasEmailPermission = useMemo(() => {
    return notificationPrefs.includes('email')
  }, [notificationPrefs])
  
  const hasSmsPermission = useMemo(() => {
    return notificationPrefs.includes('sms') && !!profile?.smsConsent && !!profile?.phone
  }, [notificationPrefs, profile?.smsConsent, profile?.phone])
  
  const hasSmsConsent = useMemo(() => {
    return !!profile?.smsConsent
  }, [profile?.smsConsent])
  
  const hasAnyPermission = useMemo(() => {
    return hasEmailPermission || hasSmsPermission
  }, [hasEmailPermission, hasSmsPermission])
  
  const checkPermissions = useCallback(() => {
    const needsPermission = !hasAnyPermission
    
    return {
      needsPermission,
      permissions: {
        hasEmailPermission,
        hasSmsPermission,
        hasSmsConsent,
        hasAnyPermission,
        isLoading,
        notificationPrefs,
        phone: profile?.phone,
        checkPermissions
      }
    }
  }, [hasAnyPermission, hasEmailPermission, hasSmsPermission, hasSmsConsent, isLoading, notificationPrefs, profile?.phone])
  
  return {
    hasEmailPermission,
    hasSmsPermission,
    hasSmsConsent,
    hasAnyPermission,
    isLoading,
    notificationPrefs,
    phone: profile?.phone,
    checkPermissions
  }
}