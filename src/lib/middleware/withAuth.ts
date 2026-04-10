import { NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth"
import { checkRateLimit, RATE_LIMITS } from "@/lib/security/rateLimiter"

type AuthLevel = "public" | "authenticated" | "admin"

interface AuthOptions {
  level?: AuthLevel
  rateLimit?: keyof typeof RATE_LIMITS
  requireEmailVerified?: boolean
}

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
      let session = null
      let userId: string | undefined

      if (level !== "public") {
        session = await getAuthSession()

        if (!session?.user) {
          return NextResponse.json(
            { error: "Unauthorized", code: "UNAUTHORIZED" },
            { status: 401 }
          )
        }

        userId = session.user.id
      }

      // Apply rate limiting
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

      const response = await handler(request, { ...context, session })

      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        if (value) {
          response.headers.set(key, value)
        }
      })

      response.headers.set("X-Content-Type-Options", "nosniff")
      response.headers.set("X-Frame-Options", "DENY")
      response.headers.set("X-XSS-Protection", "1; mode=block")

      return response

    } catch (error) {
      console.error("Auth middleware error:", error)

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

export function getCSRFToken(request: NextRequest): string | null {
  return request.headers.get("X-CSRF-Token")
}

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
