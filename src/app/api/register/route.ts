// src/app/api/register/route.ts
import { NextResponse } from 'next/server'
import bcrypt from 'bcrypt'

// This is a placeholder - I'll implement proper DB storage later
let users = [
  {
    id: "1",
    name: "Test User",
    email: "test@example.com",
    password: "$2b$10$8OxzvHfRbIvp/6dxQUFkHeTjYUJFw1J3BUTjdZG.hX1MISTsshCxy" // "password123"
  }
]

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()
    
    // Basic validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      )
    }
    
    // Check if user already exists
    if (users.some(user => user.email === email)) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 409 }
      )
    }
    
    // Hash password
    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(password, saltRounds)
    
    // Create new user
    const newUser = {
      id: `${users.length + 1}`,
      name,
      email,
      password: hashedPassword
    }
    
    // Add to users array (In a real app, you would save to a database)
    users.push(newUser)
    
    // Return success response (excluding password)
    const { password: _, ...userWithoutPassword } = newUser
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