import { NextResponse, NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { rateLimitManager } from '@/lib/rate-limit-manager'
import { upstashRedis } from '@/lib/upstash-redis.service'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check - based on IP for registration
    const clientId = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'anonymous';
    
    // Use Redis-based rate limiting if available
    const rateLimitResult = await rateLimitManager.checkLimits(
      clientId, 
      'registration',
      { endpoint: '/api/register' }
    );
    
    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        { 
          message: "Too many registration attempts. Please try again later.",
          retryAfter: rateLimitResult.nextRetryAfter 
        },
        { status: 429 }
      );
      
      if (rateLimitResult.nextRetryAfter) {
        response.headers.set('Retry-After', rateLimitResult.nextRetryAfter.toString());
      }
      
      return response;
    }
    
    const { name, email, password } = await request.json()
    
    // Basic validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: "Please enter a valid email address" },
        { status: 400 }
      )
    }

    // Password validation
    if (password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters long" },
        { status: 400 }
      )
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return NextResponse.json(
        { message: "Password must contain at least one lowercase letter" },
        { status: 400 }
      )
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return NextResponse.json(
        { message: "Password must contain at least one uppercase letter" },
        { status: 400 }
      )
    }
    if (!/(?=.*\d)/.test(password)) {
      return NextResponse.json(
        { message: "Password must contain at least one number" },
        { status: 400 }
      )
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })
    
    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      )
    }
    
    // Hash password
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(password, saltRounds)
    
    // Create new user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword
      }
    })
    
    // Return success response (excluding password)
    const { password: _, ...userWithoutPassword } = user
    return NextResponse.json(
      { message: "User created successfully", user: userWithoutPassword },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}