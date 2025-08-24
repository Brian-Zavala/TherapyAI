import { NextRequest, NextResponse } from 'next/server'
import { PUT } from '@/app/api/user/profile/route'
import { prisma } from '@/lib/database/prisma-optimized'
import { getServerSession } from 'next-auth/next'
import { profileCache } from '@/lib/cache/profile-cache'

// Mock dependencies
jest.mock('next-auth/next')
jest.mock('@/lib/prisma-optimized')
jest.mock('@/lib/cache/profile-cache')

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Profile Update API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('PUT /api/user/profile', () => {
    it('should update all basic profile fields correctly', async () => {
      const mockSession = {
        user: { email: 'test@example.com', name: 'Test User' }
      }
      mockGetServerSession.mockResolvedValueOnce(mockSession as any)

      const mockUser = { 
        id: 'user123', 
        email: 'test@example.com', 
        name: 'Test User' 
      }
      
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const tx = {
          user: {
            findUnique: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(mockUser)
          },
          userProfile: {
            upsert: jest.fn().mockResolvedValue({})
          },
          familyMember: {
            deleteMany: jest.fn().mockResolvedValue({}),
            createMany: jest.fn().mockResolvedValue({})
          }
        }
        return callback(tx)
      })
      
      mockPrisma.$transaction = mockTransaction

      const updateData = {
        name: 'Updated Name',
        pronouns: 'they/them',
        age: '30',
        phone: '+1234567890',
        partnerName: 'Partner Name',
        partnerAge: '32',
        relationshipStatus: 'Married',
        currentConcerns: ['communication', 'trust'],
        emergencyContact: 'Emergency Contact',
        sessionPreference: 'Evening',
        preferredDays: ['Monday', 'Wednesday'],
        sessionFrequency: 'Weekly',
        recurringSession: 'Yes',
        reminderTiming: '1 hour',
        communicationStyle: 'Direct',
        additionalNotes: 'Test notes',
        notificationPrefs: ['email', 'sms']
      }

      const request = new Request('http://localhost/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Profile updated successfully')
      expect(data.user).toEqual({ id: 'user123', email: 'test@example.com' })
    })

    it('should handle family member updates correctly', async () => {
      const mockSession = {
        user: { email: 'test@example.com', name: 'Test User' }
      }
      mockGetServerSession.mockResolvedValueOnce(mockSession as any)

      const mockUser = { 
        id: 'user123', 
        email: 'test@example.com', 
        name: 'Test User' 
      }
      
      let familyMembersCreated: any[] = []
      
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const tx = {
          user: {
            findUnique: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(mockUser)
          },
          userProfile: {
            upsert: jest.fn().mockResolvedValue({})
          },
          familyMember: {
            deleteMany: jest.fn().mockResolvedValue({}),
            createMany: jest.fn().mockImplementation(({ data }) => {
              familyMembersCreated = data
              return Promise.resolve({})
            })
          }
        }
        return callback(tx)
      })
      
      mockPrisma.$transaction = mockTransaction

      const updateData = {
        name: 'Test User',
        familyMember1: 'Child 1',
        familyMember1Age: '10',
        familyMember1Relation: 'Child',
        familyMember2: 'Child 2',
        familyMember2Age: '8',
        familyMember2Relation: 'Child',
        familyMember3: '', // Empty should be ignored
        familyMember4: '   ', // Whitespace should be ignored
        familyMember5: 'Parent',
        familyMember5Age: '65',
        familyMember5Relation: 'Parent'
      }

      const request = new Request('http://localhost/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(familyMembersCreated).toHaveLength(3) // Only non-empty members
      expect(familyMembersCreated[0]).toMatchObject({
        name: 'Child 1',
        age: 10,
        relationship: 'Child',
        order: 0
      })
      expect(familyMembersCreated[1]).toMatchObject({
        name: 'Child 2',
        age: 8,
        relationship: 'Child',
        order: 1
      })
      expect(familyMembersCreated[2]).toMatchObject({
        name: 'Parent',
        age: 65,
        relationship: 'Parent',
        order: 4
      })
    })

    it('should validate and process notification preferences correctly', async () => {
      const mockSession = {
        user: { email: 'test@example.com', name: 'Test User' }
      }
      mockGetServerSession.mockResolvedValueOnce(mockSession as any)

      const mockUser = { 
        id: 'user123', 
        email: 'test@example.com', 
        name: 'Test User' 
      }
      
      let profileUpdateData: any = null
      
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const tx = {
          user: {
            findUnique: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(mockUser)
          },
          userProfile: {
            upsert: jest.fn().mockImplementation(({ create, update }) => {
              profileUpdateData = update || create
              return Promise.resolve({})
            })
          },
          familyMember: {
            deleteMany: jest.fn().mockResolvedValue({}),
            createMany: jest.fn().mockResolvedValue({})
          }
        }
        return callback(tx)
      })
      
      mockPrisma.$transaction = mockTransaction

      // Test different notification preference formats
      const testCases = [
        { input: 'email', expected: 'email' },
        { input: 'sms', expected: 'sms' },
        { input: 'both', expected: ['email', 'sms'] },
        { input: 'none', expected: [] },
        { input: ['email', 'sms'], expected: ['email', 'sms'] },
        { input: undefined, expected: 'email' } // Default
      ]

      for (const testCase of testCases) {
        profileUpdateData = null
        
        const updateData = {
          name: 'Test User',
          notificationPrefs: testCase.input
        }

        const request = new Request('http://localhost/api/user/profile', {
          method: 'PUT',
          body: JSON.stringify(updateData),
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await PUT(request)
        expect(response.status).toBe(200)
        expect(profileUpdateData.notificationPrefs).toEqual(testCase.expected)
      }
    })

    it('should handle phone number validation and SMS consent', async () => {
      const mockSession = {
        user: { email: 'test@example.com', name: 'Test User' }
      }
      mockGetServerSession.mockResolvedValueOnce(mockSession as any)

      const mockUser = { 
        id: 'user123', 
        email: 'test@example.com', 
        name: 'Test User' 
      }
      
      let profileUpdateData: any = null
      
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const tx = {
          user: {
            findUnique: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(mockUser)
          },
          userProfile: {
            upsert: jest.fn().mockImplementation(({ create, update }) => {
              profileUpdateData = update || create
              return Promise.resolve({})
            })
          },
          familyMember: {
            deleteMany: jest.fn().mockResolvedValue({}),
            createMany: jest.fn().mockResolvedValue({})
          }
        }
        return callback(tx)
      })
      
      mockPrisma.$transaction = mockTransaction

      const updateData = {
        name: 'Test User',
        phone: '555-123-4567',
        notificationPrefs: ['email', 'sms'] // Including SMS should set consent
      }

      const request = new Request('http://localhost/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await PUT(request)
      expect(response.status).toBe(200)
      
      // Check that SMS consent is set when SMS is in notification prefs and phone is valid
      expect(profileUpdateData.phone).toBeTruthy()
      expect(profileUpdateData.smsConsent).toBe(true)
      expect(profileUpdateData.smsConsentDate).toBeInstanceOf(Date)
    })

    it('should handle cache invalidation after successful update', async () => {
      const mockSession = {
        user: { email: 'test@example.com', name: 'Test User' }
      }
      mockGetServerSession.mockResolvedValueOnce(mockSession as any)

      const mockUser = { 
        id: 'user123', 
        email: 'test@example.com', 
        name: 'Test User' 
      }
      
      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const tx = {
          user: {
            findUnique: jest.fn().mockResolvedValue(mockUser),
            update: jest.fn().mockResolvedValue(mockUser)
          },
          userProfile: {
            upsert: jest.fn().mockResolvedValue({})
          },
          familyMember: {
            deleteMany: jest.fn().mockResolvedValue({}),
            createMany: jest.fn().mockResolvedValue({})
          }
        }
        return callback(tx)
      })
      
      mockPrisma.$transaction = mockTransaction
      
      const mockInvalidate = jest.fn()
      const mockInvalidatePattern = jest.fn()
      profileCache.invalidate = mockInvalidate
      profileCache.invalidatePattern = mockInvalidatePattern

      const updateData = { name: 'Updated Name' }

      const request = new Request('http://localhost/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await PUT(request)
      expect(response.status).toBe(200)
      
      // Verify cache invalidation was called
      expect(mockInvalidate).toHaveBeenCalledTimes(2)
      expect(mockInvalidatePattern).toHaveBeenCalledWith(expect.stringContaining('test@example.com'))
    })

    it('should return 401 for unauthenticated requests', async () => {
      mockGetServerSession.mockResolvedValueOnce(null)

      const request = new Request('http://localhost/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Test' }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 400 for missing required name field', async () => {
      const mockSession = {
        user: { email: 'test@example.com', name: 'Test User' }
      }
      mockGetServerSession.mockResolvedValueOnce(mockSession as any)

      const request = new Request('http://localhost/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify({ pronouns: 'they/them' }), // Missing name
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Name is required')
    })
  })
})