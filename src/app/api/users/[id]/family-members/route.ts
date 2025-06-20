import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, withRetry, withTransaction } from '@/lib/prisma-enhanced'
import { z } from 'zod'

// Family member validation schema
const FamilyMemberSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(255),
  age: z.number().int().min(0).max(150).nullable().optional(),
  relation: z.string().max(100).nullable().optional(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional().default(true),
})

const FamilyMembersUpdateSchema = z.object({
  familyMembers: z.array(FamilyMemberSchema),
})

// GET /api/users/[id]/family-members - Get family members
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    // Check authorization
    if (!session?.user?.id || session.user.id !== params.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch family members with retry logic
    const familyMembers = await withRetry(async () => {
      return await prisma.familyMember.findMany({
        where: {
          userId: params.id,
          isActive: true,
        },
        orderBy: {
          order: 'asc',
        },
        select: {
          id: true,
          name: true,
          age: true,
          relation: true,
          order: true,
          isActive: true,
        },
      })
    })

    // Check for backward compatibility - if no family members, check old schema
    if (familyMembers.length === 0) {
      const user = await prisma.user.findUnique({
        where: { id: params.id },
        select: {
          familyMember1: true,
          familyMemberAge1: true,
          familyMemberRelation1: true,
          familyMember2: true,
          familyMemberAge2: true,
          familyMemberRelation2: true,
          familyMember3: true,
          familyMemberAge3: true,
          familyMemberRelation3: true,
          familyMember4: true,
          familyMemberAge4: true,
          familyMemberRelation4: true,
          familyMember5: true,
          familyMemberAge5: true,
          familyMemberRelation5: true,
          familyMember6: true,
          familyMemberAge6: true,
          familyMemberRelation6: true,
          familyMember7: true,
          familyMemberAge7: true,
          familyMemberRelation7: true,
        },
      })

      if (user) {
        // Return legacy format if exists
        const legacyMembers = []
        for (let i = 1; i <= 7; i++) {
          const name = user[`familyMember${i}` as keyof typeof user]
          if (name && typeof name === 'string') {
            legacyMembers.push({
              id: `legacy-${i}`,
              name,
              age: user[`familyMemberAge${i}` as keyof typeof user] as number | null,
              relation: user[`familyMemberRelation${i}` as keyof typeof user] as string | null,
              order: i - 1,
              isActive: true,
              isLegacy: true,
            })
          }
        }
        
        if (legacyMembers.length > 0) {
          return NextResponse.json({
            familyMembers: legacyMembers,
            isLegacyFormat: true,
          })
        }
      }
    }

    return NextResponse.json({
      familyMembers,
      isLegacyFormat: false,
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    // Check authorization
    if (!session?.user?.id || session.user.id !== params.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { familyMembers } = FamilyMembersUpdateSchema.parse(body)

    // Update family members in a transaction
    const updatedMembers = await withTransaction(async (tx) => {
      // First, soft delete all existing family members
      await tx.familyMember.updateMany({
        where: { userId: params.id },
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
              relation: member.relation ?? null,
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
              userId: params.id,
              name: member.name,
              age: member.age ?? null,
              relation: member.relation ?? null,
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
        where: { id: params.id },
        data: clearedFields,
      })

      return results
    })

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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    // Check authorization
    if (!session?.user?.id || session.user.id !== params.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Soft delete all family members
    const result = await prisma.familyMember.updateMany({
      where: {
        userId: params.id,
        isActive: true,
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    })

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