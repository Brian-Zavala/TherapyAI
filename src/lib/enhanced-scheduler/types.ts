/**
 * Enhanced Scheduler Types
 */

export interface UserPreferences {
  id: string
  userId: string
  preferredDays: string[]
  preferredTimes: {
    start: string
    end: string
  }
  timezone: string
  reminderSettings: {
    email: boolean
    sms: boolean
    minutesBefore: number
  }
  autoSchedule: boolean
  bufferTime: number
  createdAt: Date
  updatedAt: Date
}

export interface ScheduleSession {
  id: string
  title: string
  startTime: string
  endTime: string
  therapyType: 'couple' | 'family' | 'solo'
  participants: string[]
  notes?: string
  isRecurring: boolean
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
    endDate?: string
    occurrences?: number
  }
}

export interface CalendarIntegration {
  id: string
  provider: 'google' | 'outlook' | 'apple'
  email: string
  isActive: boolean
  lastSync: Date
  syncEnabled: boolean
}