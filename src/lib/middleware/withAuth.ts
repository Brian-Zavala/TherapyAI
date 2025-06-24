import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { checkRateLimit, RATE_LIMITS } from "@/lib/security/rateLimiter"

type AuthLevel = "public" | "authenticated" | "admin"

interface AuthOptions {
  level?: AuthLevel
  rateLimit?: keyof typeof RATE_LIMITS
  requireEmailVerified?: boolean
}

/**
 * Higher-order function to wrap API routes with authentication and rate limiting
 * Following 2025 best practices - not relying solely on middleware
 * 
 * @param handler - The API route handler
 * @param options - Authentication and rate limiting options
 * @returns Wrapped handler with auth and rate limiting
 */
export function withAuth<T extends NextRequest>(
  handler: (
    request: T,
    context: { params: any; session: any }
  ) => Promise<NextResponse> | NextResponse,
  options: AuthOptions = {}
) {
  const {
    level = "authenticated",
    rateLimit = "DEFAULT",
    requireEmailVerified = false
  } = options

  return async function authenticatedHandler(
    request: T,
    context: { params: any }
  ): Promise<NextResponse> {
    try {
      // Step 1: Get session (if needed)
      let session = null
      let userId: string | undefined

      if (level !== "public") {
        session = await getServerSession(authOptions)
        
        if (!session?.user) {
          return NextResponse.json(
            { error: "Unauthorized", code: "UNAUTHORIZED" },
            { status: 401 }
          )
        }

        userId = session.user.id

        // Check email verification if required
        if (requireEmailVerified && !session.user.emailVerified) {
          return NextResponse.json(
            { error: "Email verification required", code: "EMAIL_NOT_VERIFIED" },
            { status: 403 }
          )
        }

        // Check admin access if required
        if (level === "admin" && session.user.role !== "admin") {
          return NextResponse.json(
            { error: "Admin access required", code: "FORBIDDEN" },
            { status: 403 }
          )
        }
      }

      // Step 2: Apply rate limiting
      const rateLimitResult = await checkRateLimit(request, rateLimit, userId)
      
      if (!rateLimitResult.success) {
        return NextResponse.json(
          { 
            error: "Too many requests", 
            code: "RATE_LIMITED",
            retryAfter: rateLimitResult.headers["Retry-After"]
          },
          { 
            status: 429,
            headers: rateLimitResult.headers
          }
        )
      }

      // Step 3: Call the handler with auth context
      const response = await handler(request, { ...context, session })

      // Step 4: Add rate limit headers to response
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        if (value) {
          response.headers.set(key, value)
        }
      })

      // Add security headers
      response.headers.set("X-Content-Type-Options", "nosniff")
      response.headers.set("X-Frame-Options", "DENY")
      response.headers.set("X-XSS-Protection", "1; mode=block")

      return response

    } catch (error) {
      console.error("Auth middleware error:", error)
      
      // Don't leak internal errors
      return NextResponse.json(
        { 
          error: "Internal server error", 
          code: "INTERNAL_ERROR"
        },
        { status: 500 }
      )
    }
  }
}

/**
 * Get CSRF token from request headers (provided by edge-csrf middleware)
 * This is now handled by the main middleware, but we keep this for API routes
 * that need to access the token value
 */
export function getCSRFToken(request: NextRequest): string | null {
  return request.headers.get("X-CSRF-Token")
}

/**
 * Helper to create consistent error responses
 */
export function createErrorResponse(
  error: string,
  code: string,
  status: number,
  details?: any
): NextResponse {
  const body: any = { error, code }
  
  if (details && process.env.NODE_ENV === "development") {
    body.details = details
  }

  return NextResponse.json(body, { status })
}