// Optimized auth configuration for <1s callback performance
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import FacebookProvider from "next-auth/providers/facebook"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from '@/lib/prisma-optimized'
import { compare } from "bcryptjs"
import { z } from "zod"
import { setCache, getCached } from '@/lib/cache/redis-connection-pool'

// Validation schemas
const credentialsSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required")
})

// OAuth provider configuration with caching
const getOAuthProviders = () => {
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

// Optimized user lookup with caching
async function findUserByEmailOptimized(email: string) {
  const cacheKey = `auth:user:${email}`
  
  return getCached(cacheKey, async () => {
    return prisma.user.findUnique({
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
  }, 300) // 5 minutes cache
}

// Async credit initialization to avoid blocking auth
async function initializeCreditsAsync(userId: string, email: string) {
  // Use a job queue in production
  setImmediate(async () => {
    try {
      const { creditManager } = await import('@/lib/services/credit-manager.service')
      
      const billingStart = new Date()
      const billingEnd = new Date()
      billingEnd.setMonth(billingEnd.getMonth() + 1)
      
      await creditManager.initializeBillingPeriod(
        userId,
        'free',
        billingStart,
        billingEnd
      )
      
      console.log(`✓ Async initialized free tier for: ${email}`)
    } catch (error) {
      console.error(`Failed to async initialize credits for ${userId}:`, error)
    }
  })
}

export const authOptionsOptimized: NextAuthOptions = {
  debug: false,
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
    ...getOAuthProviders(),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "email@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          const validatedInput = credentialsSchema.safeParse(credentials)
          if (!validatedInput.success) {
            throw new Error("Invalid credentials format")
          }

          const { email, password } = validatedInput.data
          const user = await findUserByEmailOptimized(email)

          if (!user || !user.password) {
            throw new Error("Invalid credentials")
          }

          if (user.isDeleted === true) {
            throw new Error("Account is deactivated")
          }

          const isPasswordValid = await compare(password, user.password)
          if (!isPasswordValid) {
            throw new Error("Invalid credentials")
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            emailVerified: user.emailVerified
          }
        } catch (error) {
          console.error("[Auth] Login error:", error instanceof Error ? error.message : "Unknown error")
          return null
        }
      }
    })
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // Fast validation
        if (!user?.email) {
          console.error("[Auth] Sign-in attempted without email")
          return false
        }

        // Only process OAuth providers with optimized transactions
        if (account?.provider && account.provider !== 'credentials') {
          console.log("[Auth] Processing OAuth sign-in for:", account.provider)
          
          // Optimized transaction with timeout
          const result = await Promise.race([
            new Promise<boolean>((_, reject) => 
              setTimeout(() => reject(new Error('Auth timeout')), 8000)
            ),
            prisma.$transaction(async (tx) => {
              // Optimized user lookup with minimal select
              const existingUser = await tx.user.findUnique({
                where: { email: user.email! },
                select: {
                  id: true,
                  email: true,
                  name: true,
                  accounts: {
                    select: {
                      provider: true,
                      providerAccountId: true
                    }
                  }
                }
              })

              if (existingUser) {
                // Check if OAuth account already linked
                const isLinked = existingUser.accounts.some(
                  acc => acc.provider === account.provider && 
                         acc.providerAccountId === account.providerAccountId
                )
                
                if (!isLinked) {
                  // Link OAuth account (minimal data)
                  await tx.account.create({
                    data: {
                      userId: existingUser.id,
                      type: account.type,
                      provider: account.provider,
                      providerAccountId: account.providerAccountId,
                      access_token: account.access_token,
                      expires_at: account.expires_at,
                      refresh_token: account.refresh_token,
                      scope: account.scope,
                      token_type: account.token_type,
                    }
                  })
                }
              } else {
                // Create new user with minimal required data
                const userName = user.name || 
                  (profile as any)?.name || 
                  user.email!.split('@')[0]
                
                const newUser = await tx.user.create({
                  data: {
                    email: user.email!,
                    name: userName,
                    emailVerified: new Date(),
                    image: user.image || (profile as any)?.picture || null,
                    isDeleted: false,
                  }
                })

                // Create OAuth account
                await tx.account.create({
                  data: {
                    userId: newUser.id,
                    type: account.type,
                    provider: account.provider,
                    providerAccountId: account.providerAccountId,
                    access_token: account.access_token,
                    expires_at: account.expires_at,
                    refresh_token: account.refresh_token,
                    scope: account.scope,
                    token_type: account.token_type,
                  }
                })

                // Initialize credits asynchronously (non-blocking)
                initializeCreditsAsync(newUser.id, newUser.email)
              }
              
              return true
            }, {
              timeout: 5000, // 5 second transaction timeout
              isolationLevel: 'ReadCommitted' // Better performance
            })
          ])

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
        const allowedPaths = ['/welcome', '/intro', '/dashboard', '/auth']
        
        if (url.includes('/welcome') || url.includes('/intro')) {
          return `${baseUrl}/welcome`
        }
        
        if (url.startsWith("/")) {
          const path = url.split('?')[0]
          const isAllowed = allowedPaths.some(allowed => path.startsWith(allowed))
          return isAllowed ? `${baseUrl}${url}` : `${baseUrl}/welcome`
        }
        
        const urlObj = new URL(url, baseUrl)
        if (urlObj.origin === baseUrl) {
          return url
        }
        
        return `${baseUrl}/welcome`
      } catch {
        return `${baseUrl}/welcome`
      }
    },

    // Optimized session callback
    session: ({ session, token }) => {
      // Minimal processing for speed
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
      
      if (!session.user) session.user = {}

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

    // Fast JWT processing
    jwt: ({ token, user, account, trigger }) => {
      if (trigger === "update") return token

      if (user?.id) {
        token.id = user.id
        token.emailVerified = (user as any).emailVerified || null
      }

      if (account?.provider) {
        token.provider = account.provider
      }

      return token
    },
  },

  events: {
    async signIn({ user, account, isNewUser }) {
      // Async logging to avoid blocking
      setImmediate(() => {
        console.log("[Auth] User signed in:", {
          userId: user?.id,
          provider: account?.provider,
          isNewUser,
          timestamp: new Date().toISOString()
        })
      })
    },
    async signOut({ token }) {
      // Async cleanup
      setImmediate(() => {
        console.log("[Auth] User signed out:", {
          userId: token?.sub,
          timestamp: new Date().toISOString()
        })
      })
    }
  }
}