// src/app/api/user/profile/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET handler to fetch user profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Find user by email (more reliable than ID which might differ between auth and DB)
    let user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        partnerName: true,
        relationshipStatus: true
      }
    })
    
    // Auto-create user if they don't exist in Prisma but have a valid session
    if (!user && session.user.email) {
      console.log(`Auto-creating user in database for ${session.user.email}`)
      
      try {
        user = await prisma.user.create({
          data: {
            email: session.user.email,
            name: session.user.name || session.user.email.split('@')[0],
            password: 'SESSION_CREATED_USER', // Placeholder password
          },
          select: {
            id: true,
            name: true,
            email: true,
            partnerName: true,
            relationshipStatus: true
          }
        })
        console.log('User auto-created successfully:', user.id)
      } catch (createError) {
        console.error('Error auto-creating user:', createError)
        return NextResponse.json({ error: 'Failed to create user record' }, { status: 500 })
      }
    }
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    
    return NextResponse.json(user)
  } catch (error) {
    console.error("Profile fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

// PUT handler to update user profile
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const data = await request.json()
    
    // Validate the data
    if (!data.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    
    // Find user by email
    let user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    
    // Auto-create user if they don't exist
    if (!user) {
      try {
        user = await prisma.user.create({
          data: {
            email: session.user.email,
            name: data.name,
            password: 'SESSION_CREATED_USER',
            partnerName: data.partnerName || null,
            relationshipStatus: data.relationshipStatus || 'Married'
          }
        })
        
        return NextResponse.json({ 
          message: "Profile created successfully",
          user: {
            name: user.name,
            email: user.email,
            partnerName: user.partnerName,
            relationshipStatus: user.relationshipStatus
          }
        })
      } catch (createError) {
        console.error('Error auto-creating user during update:', createError)
        return NextResponse.json({ error: 'Failed to create user record' }, { status: 500 })
      }
    }
    
    // Update the existing user profile
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name: data.name,
        partnerName: data.partnerName,
        relationshipStatus: data.relationshipStatus
      }
    })
    
    return NextResponse.json({ 
      message: "Profile updated successfully",
      user: {
        name: updatedUser.name,
        email: updatedUser.email,
        partnerName: updatedUser.partnerName,
        relationshipStatus: updatedUser.relationshipStatus
      }
    })
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}