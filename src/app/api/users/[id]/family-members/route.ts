import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database/prisma-optimized'
import { withRetry, withTransaction } from '@/lib/database/prisma-enhanced'
import { familyMembersCache } from '@/lib/cache/family-members-cache'
import { z } from 'zod'

// Family member validation schema
const FamilyMemberSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(255),
  age: z.number().int().min(0).max(150).nullable().optional(),
  relationship: z.string().max(100).nullable().optional(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional().default(true),
})

const FamilyMembersUpdateSchema = z.object({
  familyMembers: z.array(FamilyMemberSchema),
})

// GET /api/users/[id]/family-members - Get family members
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    // Check authorization
    if (!session?.user?.id || session.user.id !== id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check cache first
    const cached = familyMembersCache.get(id)
    if (cached) {
      return NextResponse.json({
        familyMembers: cached.data,
        isLegacyFormat: cached.isLegacyFormat,
        cached: true,
      })
    }

    // Fetch family members with retry logic
    const familyMembers = await withRetry(async () => {
      return await prisma.familyMember.findMany({
        where: {
          userId: id,
          isActive: true,
        },
        orderBy: {
          order: 'asc',
        },
        select: {
          id: true,
          name: true,
          age: true,
          relationship: true,
          order: true,
          isActive: true,
        },
      })
    })

    // Cache the results
    familyMembersCache.set(id, familyMembers, false)

    // No backward compatibility needed - old schema fields have been migrated

    return NextResponse.json({
      familyMembers,
      isLegacyFormat: false,
      cached: false,
    })
  } catch (error) {
    console.error('Error fetching family members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch family members' },
      { status: 500 }
    )
  }
}

// PUT /api/users/[id]/family-members - Update family members
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    // Check authorization
    if (!session?.user?.id || session.user.id !== id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { familyMembers } = FamilyMembersUpdateSchema.parse(body)

    // Update family members in a transaction
    const updatedMembers = await withTransaction(async (tx) => {
      // First, soft delete all existing family members
      await tx.familyMember.updateMany({
        where: { userId: id },
        data: { isActive: false },
      })

      // Process each family member
      const results = []
      for (let i = 0; i < familyMembers.length; i++) {
        const member = familyMembers[i]
        
        if (member.id && !member.id.startsWith('temp-') && !member.id.startsWith('legacy-')) {
          // Update existing member
          const updated = await tx.familyMember.update({
            where: { id: member.id },
            data: {
              name: member.name,
              age: member.age ?? null,
              relationship: member.relationship ?? '',
              order: i,
              isActive: true,
              updatedAt: new Date(),
            },
          })
          results.push(updated)
        } else {
          // Create new member
          const created = await tx.familyMember.create({
            data: {
              userId: id,
              name: member.name,
              age: member.age ?? null,
              relationship: member.relationship ?? '',
              order: i,
              isActive: true,
            },
          })
          results.push(created)
        }
      }

      // If we had legacy data, clear it from the user table
      const clearedFields: any = {}
      for (let i = 1; i <= 7; i++) {
        clearedFields[`familyMember${i}`] = null
        clearedFields[`familyMemberAge${i}`] = null
        clearedFields[`familyMemberRelation${i}`] = null
      }

      await tx.user.update({
        where: { id: id },
        data: clearedFields,
      })

      return results
    })

    // Invalidate cache after successful update
    familyMembersCache.invalidate(id)

    return NextResponse.json({
      familyMembers: updatedMembers,
      message: 'Family members updated successfully',
    })
  } catch (error) {
    console.error('Error updating family members:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update family members' },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id]/family-members - Delete all family members
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    // Check authorization
    if (!session?.user?.id || session.user.id !== id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Soft delete all family members
    const result = await prisma.familyMember.updateMany({
      where: {
        userId: id,
        isActive: true,
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    })

    // Invalidate cache after successful deletion
    familyMembersCache.invalidate(id)

    return NextResponse.json({
      message: `Removed ${result.count} family members`,
    })
  } catch (error) {
    console.error('Error deleting family members:', error)
    return NextResponse.json(
      { error: 'Failed to delete family members' },
      { status: 500 }
    )
  }
}