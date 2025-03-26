// src/app/api/user/profile/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET handler to fetch user profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        partnerName: true,
        relationshipStatus: true
      }
    })
    
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
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    const data = await request.json()
    
    // Validate the data
    if (!data.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    
    // Update the user profile
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
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