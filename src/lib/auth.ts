// src/lib/auth.ts
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import FacebookProvider from "next-auth/providers/facebook"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from '@/lib/database/prisma-optimized'
import { compare } from "bcryptjs"
import { z } from "zod"
import { creditManager } from '@/lib/services/credit-manager.service'

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
  // Check if running on non-default port
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return 'http://localhost:3000'
}

// 2025 Standard: Validate NextAuth configuration
if (!process.env.NEXTAUTH_SECRET) {
  console.error("[Auth] CRITICAL: NEXTAUTH_SECRET is not set! This will cause session errors.")
}

export const authOptions: NextAuthOptions = {
  debug: false, // Disable debug mode to clean up console
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
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
              isDeleted: true
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

          // 2025 Standard: User authenticated successfully
          // Note: lastLogin field not in schema, could track in UserProfile or audit log instead

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
    // Add timeout protection
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Callback timeout')), 15000)
    )

    try {
      console.log("[Auth] Sign-in attempt:", {
        provider: account?.provider,
        email: user?.email,
        hasProfile: !!profile,
        timestamp: new Date().toISOString()
      })

      // 2025 Standard: Early validation
      if (!user?.email) {
        console.error("[Auth] Sign-in attempted without email")
        return false
      }

      // Handle OAuth providers (Google, Facebook)
      if (account?.provider && account.provider !== 'credentials') {
        console.log("[Auth] Processing OAuth sign-in for:", account.provider)
        
        // Race between transaction and timeout
        const result = await Promise.race<boolean>([
          timeoutPromise as Promise<boolean>,
          prisma.$transaction(async (tx) => {
            // Check if user exists with this email
            const existingUser = await tx.user.findUnique({
              where: { email: user.email! },
              include: { accounts: true }
            })

            if (existingUser) {
              console.log("[Auth] Found existing user, linking account")
              
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
              
              // User authenticated successfully
              // Note: lastLogin tracking could be added to UserProfile if needed
            } else {
              console.log("[Auth] Creating new user for OAuth sign-in")
              
              // Create new user for OAuth sign-in
              // Handle Google profile data safely
              let userName = user.name
              if (!userName && profile) {
                // For Google, try different profile fields
                userName = (profile as any).name || 
                          (profile as any).given_name || 
                          (profile as any).family_name ||
                          user.email!.split('@')[0]
              }
              
              const newUser = await tx.user.create({
                data: {
                  email: user.email!,
                  name: userName || user.email!.split('@')[0],
                  emailVerified: new Date(),
                  image: user.image || (profile as any)?.picture || null,
                  isDeleted: false,
                }
              })

              console.log("[Auth] Created new user:", newUser.id)

              // Initialize free tier credits for new OAuth user
              const billingStart = new Date();
              const billingEnd = new Date();
              billingEnd.setMonth(billingEnd.getMonth() + 1);
              
              try {
                await creditManager.initializeBillingPeriod(
                  newUser.id,
                  'free',
                  billingStart,
                  billingEnd
                );
                console.log(`✓ Initialized free tier (45 credits) for OAuth user: ${newUser.email}`);
              } catch (creditError) {
                console.error(`Failed to initialize credits for OAuth user ${newUser.id}:`, creditError);
                // Don't fail the sign-in process, credits can be initialized later
              }

              // Create the OAuth account
              await tx.account.create({
                data: {
                  userId: newUser.id,
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
            
            return true
          }, {
            timeout: 10000 // 10 second transaction timeout
          })
        ])

        console.log("[Auth] OAuth sign-in completed successfully")
        return result
      }

      console.log("[Auth] Non-OAuth sign-in completed")
      return true
    } catch (error) {
      console.error("[Auth] Sign-in error:", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
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
    console.log("[Auth] Session callback:", {
      hasSession: !!session,
      hasToken: !!token,
      sessionUser: session?.user,
      tokenSub: token?.sub
    })
    
    // 2025 Standard: Always return a valid session structure
    if (!session) {
      return {
        user: token ? {
          id: (token.id as string) || (token.sub as string) || '',
          email: (token.email as string) || '',
          name: (token.name as string) || null,
          image: (token.picture as string) || null,
          emailVerified: (token.emailVerified as Date | null) || null,
        } : null,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    }
    
    // Ensure session.user exists
    if (!session.user) {
      session.user = {}
    }

    return {
      ...session,
      user: {
        ...session.user,
        id: (token?.id as string) || (token?.sub as string) || session.user.id || '',
        emailVerified: (token?.emailVerified as Date | null) || session.user.emailVerified || null,
      },
      expires: session.expires || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  },

  jwt: ({ token, user, account, trigger }) => {
    // 2025 Standard: Handle different JWT triggers
    if (trigger === "update") {
      // Handle session updates
      return token
    }

    // Only add user data during sign-in
    if (user?.id) {
      token.id = user.id
      token.emailVerified = (user as any).emailVerified || null
    }

    // Store provider info for OAuth users
    if (account?.provider) {
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
}
}