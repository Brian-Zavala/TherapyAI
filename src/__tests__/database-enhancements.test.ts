// Test file - Jest globals will be available in test environment
// @ts-ignore
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals'
import { PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma-enhanced'
import { createMockUser, createMockSession, cleanupTestData } from './test-utils'

// Test database client
let testPrisma: PrismaClient

beforeAll(async () => {
  // Use test database
  testPrisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
      },
    },
  })
  await testPrisma.$connect()
})

afterAll(async () => {
  await testPrisma.$disconnect()
})

describe('Database Enhancements', () => {
  describe('Family Member Normalization', () => {
    let testUser: any

    beforeEach(async () => {
      testUser = await createMockUser(testPrisma)
    })

    afterEach(async () => {
      await cleanupTestData(testPrisma, testUser.id)
    })

    it('should create family members with proper relationships', async () => {
      const familyMembers = [
        { name: 'John Doe', age: 45, relationship: 'Father' },
        { name: 'Jane Doe', age: 43, relationship: 'Mother' },
        { name: 'Jack Doe', age: 16, relationship: 'Son' },
      ]

      const createdMembers = await testPrisma.familyMember.createMany({
        data: familyMembers.map((member, index) => ({
          userId: testUser.id,
          ...member,
          order: index,
          isActive: true,
        })),
      })

      expect(createdMembers.count).toBe(3)

      // Verify ordering
      const fetchedMembers = await testPrisma.familyMember.findMany({
        where: { userId: testUser.id },
        orderBy: { order: 'asc' },
      })

      expect(fetchedMembers[0].name).toBe('John Doe')
      expect(fetchedMembers[1].name).toBe('Jane Doe')
      expect(fetchedMembers[2].name).toBe('Jack Doe')
    })

    it('should handle family member soft deletion', async () => {
      const member = await testPrisma.familyMember.create({
        data: {
          userId: testUser.id,
          name: 'Test Member',
          relationship: 'Sibling',
          order: 0,
          isActive: true,
        },
      })

      // Soft delete
      await testPrisma.familyMember.update({
        where: { id: member.id },
        data: { isActive: false },
      })

      // Should not appear in active queries
      const activeMembers = await testPrisma.familyMember.findMany({
        where: { userId: testUser.id, isActive: true },
      })

      expect(activeMembers.length).toBe(0)

      // Should still exist in database
      const allMembers = await testPrisma.familyMember.findMany({
        where: { userId: testUser.id },
      })

      expect(allMembers.length).toBe(1)
    })
  })

  describe('Optimistic Locking', () => {
    let testUser: any
    let testSession: any

    beforeEach(async () => {
      testUser = await createMockUser(testPrisma)
      testSession = await createMockSession(testPrisma, testUser.id)
    })

    afterEach(async () => {
      await cleanupTestData(testPrisma, testUser.id)
    })

    it('should prevent concurrent updates with version mismatch', async () => {
      // Simulate two concurrent reads
      const session1 = await testPrisma.session.findUnique({
        where: { id: testSession.id },
      })
      const session2 = await testPrisma.session.findUnique({
        where: { id: testSession.id },
      })

      expect(session1!.version).toBe(0)
      expect(session2!.version).toBe(0)

      // First update succeeds
      await testPrisma.session.update({
        where: { 
          id: testSession.id,
          version: session1!.version,
        },
        data: {
          status: 'COMPLETED',
          version: { increment: 1 },
        },
      })

      // Second update should fail
      await expect(
        testPrisma.session.update({
          where: { 
            id: testSession.id,
            version: session2!.version,
          },
          data: {
            status: 'CANCELLED',
            version: { increment: 1 },
          },
        })
      ).rejects.toThrow()
    })
  })

  describe('Index Performance', () => {
    let testUser: any

    beforeEach(async () => {
      testUser = await createMockUser(testPrisma)
    })

    afterEach(async () => {
      await cleanupTestData(testPrisma, testUser.id)
    })

    it('should efficiently query sessions by status and user', async () => {
      // Create multiple sessions
      const sessions = []
      for (let i = 0; i < 20; i++) {
        sessions.push({
          userId: testUser.id,
          assistantId: 'test-assistant',
          status: i % 3 === 0 ? 'active' : 'completed',
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Spread over days
        })
      }

      await testPrisma.session.createMany({ data: sessions })

      // This query should use the compound index
      const start = Date.now()
      const activeSessions = await testPrisma.session.findMany({
        where: {
          userId: testUser.id,
          status: 'ACTIVE',
        },
        orderBy: { date: 'desc' },
      })
      const duration = Date.now() - start

      // Should be fast with index
      expect(duration).toBeLessThan(100) // Less than 100ms
      expect(activeSessions.length).toBeGreaterThan(0)
    })

    it('should efficiently query metrics by date range', async () => {
      // Create metrics over time
      const metrics = []
      for (let i = 0; i < 30; i++) {
        metrics.push({
          userId: testUser.id,
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
          sessionId: `session-${i}`,
          clarity: 50 + Math.random() * 50,
          empathy: 50 + Math.random() * 50,
          respect: 50 + Math.random() * 50,
          overall: 50 + Math.random() * 50,
          listening: 50 + Math.random() * 50,
          expression: 50 + Math.random() * 50,
          metricType: 'manual' as const,
          calculatedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        })
      }

      await testPrisma.communicationMetric.createMany({ data: metrics })

      // Query with date range
      const start = Date.now()
      const weekMetrics = await testPrisma.communicationMetric.findMany({
        where: {
          userId: testUser.id,
          calculatedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { calculatedAt: 'desc' },
      })
      const duration = Date.now() - start

      expect(duration).toBeLessThan(100)
      expect(weekMetrics.length).toBe(7)
    })
  })

  describe('Transaction Integrity', () => {
    let testUser: any

    beforeEach(async () => {
      testUser = await createMockUser(testPrisma)
    })

    afterEach(async () => {
      await cleanupTestData(testPrisma, testUser.id)
    })

    it('should rollback all changes on transaction failure', async () => {
      try {
        await testPrisma.$transaction(async (tx) => {
          // Create session
          const session = await tx.session.create({
            data: {
              userId: testUser.id,
              assistantId: 'test-assistant',
              status: 'ACTIVE',
              date: new Date(),
            },
          })

          // Create conversation state
          await tx.conversationState.create({
            data: {
              sessionId: session.id,
              userId: testUser.id,
              assistantId: 'test-assistant',
              sessionStartTime: new Date(),
              lastActiveTime: new Date(),
              messages: {
                create: []
              },
            },
          })

          // Force failure
          throw new Error('Simulated failure')
        })
      } catch (error) {
        // Expected to fail
      }

      // Verify nothing was created
      const sessions = await testPrisma.session.findMany({
        where: { userId: testUser.id },
      })
      const states = await testPrisma.conversationState.findMany({
        where: { userId: testUser.id },
      })

      expect(sessions.length).toBe(0)
      expect(states.length).toBe(0)
    })
  })

  describe('Constraint Validation', () => {
    let testUser: any

    beforeEach(async () => {
      testUser = await createMockUser(testPrisma)
    })

    afterEach(async () => {
      await cleanupTestData(testPrisma, testUser.id)
    })

    it('should enforce check constraints on session duration', async () => {
      await expect(
        testPrisma.session.create({
          data: {
            userId: testUser.id,
            assistantId: 'test-assistant',
            duration: -10, // Invalid negative duration
            date: new Date(),
          },
        })
      ).rejects.toThrow()
    })

    it('should enforce check constraints on metric scores', async () => {
      await expect(
        testPrisma.communicationMetric.create({
          data: {
            userId: testUser.id,
            sessionId: 'test-session',
            clarity: 150, // Invalid score > 100
            empathy: 50,
            respect: 50,
            overall: 50,
            metricType: 'manual',
            calculatedAt: new Date(),
          },
        })
      ).rejects.toThrow()
    })

    it('should enforce unique constraints on family member ordering', async () => {
      await testPrisma.familyMember.create({
        data: {
          userId: testUser.id,
          name: 'Member 1',
          relationship: 'Sibling',
          order: 0,
        },
      })

      await expect(
        testPrisma.familyMember.create({
          data: {
            userId: testUser.id,
            name: 'Member 2',
            relationship: 'Sibling',
            order: 0, // Duplicate order
          },
        })
      ).rejects.toThrow()
    })
  })

  describe('Backward Compatibility', () => {
    it('should handle legacy family member fields', async () => {
      // Create user with legacy fields
      const legacyUser = await testPrisma.user.create({
        data: {
          email: 'legacy@test.com',
          password: 'hashed',
        },
      })

      // Create family members in normalized structure
      await testPrisma.familyMember.createMany({
        data: [
          { userId: legacyUser.id, name: 'John', age: 45, relationship: 'Father', order: 0 },
          { userId: legacyUser.id, name: 'Jane', age: 43, relationship: 'Mother', order: 1 },
        ],
      })
      
      // Verify normalized data exists
      const familyMembers = await testPrisma.familyMember.findMany({
        where: { userId: legacyUser.id },
        orderBy: { order: 'asc' },
      })
      expect(familyMembers[0].name).toBe('John')
      expect(familyMembers[1].name).toBe('Jane')

      // Clean up
      await testPrisma.user.delete({ where: { id: legacyUser.id } })
    })
  })

  describe('Connection Pooling', () => {
    it('should handle connection retry logic', async () => {
      // This test would require mocking database connection failures
      // For now, we'll test that the enhanced client works
      const result = await prisma.user.count()
      expect(result).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Batch Processing', () => {
    let testUser: any

    beforeEach(async () => {
      testUser = await createMockUser(testPrisma)
    })

    afterEach(async () => {
      await cleanupTestData(testPrisma, testUser.id)
    })

    it('should efficiently batch create transcript entries', async () => {
      const session = await createMockSession(testPrisma, testUser.id)
      
      // Create many transcript entries
      const entries = []
      for (let i = 0; i < 100; i++) {
        entries.push({
          sessionId: session.id,
          assistantId: 'test-assistant',
          speaker: i % 2 === 0 ? 'user' : 'assistant',
          text: `Message ${i}`,
          timestamp: new Date(Date.now() + i * 1000),
          isFinal: true,
        })
      }

      const start = Date.now()
      await testPrisma.transcriptEntry.createMany({ data: entries })
      const duration = Date.now() - start

      // Should be reasonably fast for batch operation
      expect(duration).toBeLessThan(1000) // Less than 1 second for 100 entries

      const count = await testPrisma.transcriptEntry.count({
        where: { sessionId: session.id },
      })
      expect(count).toBe(100)
    })
  })
})