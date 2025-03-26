// src/lib/auth.ts
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { compare } from "bcrypt"

export const authOptions: NextAuthOptions = {
  debug: true, // Helpful for troubleshooting
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login?error=true",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await compare(credentials.password, user.password)

        if (!isPasswordValid) {
          return null
        }

        // Return the user with ID explicitly included
        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      }
    })
  ],
  // src/lib/auth.ts 
// In your callbacks section:

callbacks: {
  session: ({ session, token }) => {
    console.log("Session callback - token:", JSON.stringify(token))
    console.log("Session callback - session before:", JSON.stringify(session))
    
    // Ensure user ID is consistently available
    const updatedSession = {
      ...session,
      user: {
        ...session.user,
        id: token.sub || token.id, // Use both possible locations
      }
    }
    
    console.log("Session callback - session after:", JSON.stringify(updatedSession))
    return updatedSession
  },
  jwt: ({ token, user }) => {
    console.log("JWT callback - user:", JSON.stringify(user))
    console.log("JWT callback - token before:", JSON.stringify(token))
    
    if (user) {
      // Store user ID in both conventional locations
      token.id = user.id
      // token.sub is automatically set by NextAuth
    }
    
    console.log("JWT callback - token after:", JSON.stringify(token))
    return token
  },
  },
}