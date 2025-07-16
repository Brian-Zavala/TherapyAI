// src/lib/auth.ts
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import FacebookProvider from "next-auth/providers/facebook"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from '@/lib/prisma-optimized'
import { compare } from "bcryptjs"
import { z } from "zod"

// 2025 Standard: Enhanced validation schemas
const credentialsSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required")
})

// 2025 Standard: Type-safe environment validation
const validateOAuthConfig = () => {
  const providers = []
  
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }))
  }
  
  if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
    providers.push(FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    }))
  }
  
  return providers
}

// 2025 Standard: Ensure proper URL configuration for NextAuth
const getBaseUrl = () => {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === 'development',
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/login",
    error: "/auth/login",
    verifyRequest: "/auth/verify-request",
    newUser: "/welcome"
  },
  // 2025 Standard: Ensure cookies work properly in development
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token' 
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  providers: [
    ...validateOAuthConfig(),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "email@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          // 2025 Standard: Input validation with Zod
          const validatedInput = credentialsSchema.safeParse(credentials)
          if (!validatedInput.success) {
            throw new Error("Invalid credentials format")
          }

          const { email, password } = validatedInput.data

          // 2025 Standard: Optimized query with select
          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              name: true,
              password: true,
              emailVerified: true,
              isDeleted: false
            }
          })

          if (!user || !user.password) {
            // 2025 Standard: Generic error to prevent email enumeration
            throw new Error("Invalid credentials")
          }

          // 2025 Standard: Check if account is deleted
          if (user.isDeleted === true) {
            throw new Error("Account is deactivated")
          }

          const isPasswordValid = await compare(password, user.password)

          if (!isPasswordValid) {
            throw new Error("Invalid credentials")
          }

          // 2025 Standard: Update last login timestamp
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
          })

          // Return user object without sensitive data
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            emailVerified: user.emailVerified
          }
        } catch (error) {
          // 2025 Standard: Structured error logging
          console.error("[Auth] Login error:", {
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString()
          })
          return null
        }
      }
    })
  ],
 
callbacks: {
  async signIn({ user, account, profile }) {
    try {
      // 2025 Standard: Early validation
      if (!user?.email) {
        console.error("[Auth] Sign-in attempted without email")
        return false
      }

      // Handle OAuth providers (Google, Facebook)
      if (account?.provider && account.provider !== 'credentials') {
        // 2025 Standard: Transaction for OAuth account linking
        const result = await prisma.$transaction(async (tx) => {
          // Check if user exists with this email
          const existingUser = await tx.user.findUnique({
            where: { email: user.email! },
            include: { accounts: true }
          })

          if (existingUser) {
            // Check if this OAuth account is already linked
            const linkedAccount = existingUser.accounts.find(
              acc => acc.provider === account.provider && 
                     acc.providerAccountId === account.providerAccountId
            )
            
            if (!linkedAccount) {
              // Auto-link the OAuth account to the existing user
              await tx.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  id_token: account.id_token,
                  refresh_token: account.refresh_token,
                  scope: account.scope,
                  session_state: account.session_state as string | undefined,
                  token_type: account.token_type,
                }
              })
            }
            
            // Update last login
            await tx.user.update({
              where: { id: existingUser.id },
              data: { lastLogin: new Date() }
            })
          }
          
          return true
        })

        return result
      }

      return true
    } catch (error) {
      console.error("[Auth] Sign-in error:", {
        error: error instanceof Error ? error.message : "Unknown error",
        provider: account?.provider,
        timestamp: new Date().toISOString()
      })
      return false
    }
  },

  async redirect({ url, baseUrl }) {
    try {
      // 2025 Standard: Secure URL validation
      const allowedPaths = ['/welcome', '/intro', '/dashboard', '/auth']
      
      // Handle explicit redirects
      if (url.includes('/welcome') || url.includes('/intro')) {
        return `${baseUrl}/welcome`
      }
      
      // Validate relative URLs
      if (url.startsWith("/")) {
        const path = url.split('?')[0] // Remove query params for validation
        const isAllowed = allowedPaths.some(allowed => path.startsWith(allowed))
        return isAllowed ? `${baseUrl}${url}` : `${baseUrl}/welcome`
      }
      
      // Validate same-origin URLs
      const urlObj = new URL(url, baseUrl)
      if (urlObj.origin === baseUrl) {
        return url
      }
      
      return `${baseUrl}/welcome`
    } catch {
      return `${baseUrl}/welcome`
    }
  },

  session: ({ session, token }) => {
    // 2025 Standard: Type-safe session enhancement
    if (!session?.user) {
      return session
    }

    return {
      ...session,
      user: {
        ...session.user,
        id: token.id as string ?? token.sub ?? '',
        emailVerified: token.emailVerified as Date | null ?? null,
      },
      expires: session.expires
    }
  },

  jwt: ({ token, user, account, trigger }) => {
    // 2025 Standard: Handle different JWT triggers
    if (trigger === "update") {
      // Handle session updates
      return token
    }

    // Only add user data during sign-in
    if (user) {
      token.id = user.id
      token.emailVerified = user.emailVerified
    }

    // Store provider info for OAuth users
    if (account) {
      token.provider = account.provider
    }

    return token
  },
},

// 2025 Standard: Enhanced security options
events: {
  async signIn({ user, account, isNewUser }) {
    // Log sign-in events for security monitoring
    console.log("[Auth] User signed in:", {
      userId: user?.id,
      provider: account?.provider,
      isNewUser,
      timestamp: new Date().toISOString()
    })
  },
  async signOut({ token }) {
    console.log("[Auth] User signed out:", {
      userId: token?.sub,
      timestamp: new Date().toISOString()
    })
  }
},

// 2025 Standard: Security headers
cookies: {
  sessionToken: {
    name: process.env.NODE_ENV === 'production' 
      ? '__Secure-next-auth.session-token' 
      : 'next-auth.session-token',
    options: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production'
    }
  }
}
}