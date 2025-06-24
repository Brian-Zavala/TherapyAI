import crypto from "crypto"

// Get secret from environment with fallback for development
const TOKEN_SECRET = process.env.TOKEN_SECRET || process.env.NEXTAUTH_SECRET || "development-secret-change-in-production"

if (!process.env.TOKEN_SECRET && process.env.NODE_ENV === "production") {
  console.warn("WARNING: TOKEN_SECRET not set in production environment")
}

interface TokenPayload {
  [key: string]: any
  exp?: number // Expiration timestamp
  iat?: number // Issued at timestamp
}

/**
 * Create a signed token with HMAC SHA-256
 * @param payload - Data to include in token
 * @param expiresIn - Expiration time in seconds (default: 24 hours)
 * @returns Signed token string
 */
export function createSignedToken(
  payload: TokenPayload,
  expiresIn: number = 24 * 60 * 60
): string {
  const now = Math.floor(Date.now() / 1000)
  
  const tokenData = {
    ...payload,
    iat: now,
    exp: now + expiresIn
  }

  // Create base64url encoded payload
  const encodedPayload = Buffer.from(JSON.stringify(tokenData))
    .toString("base64url")

  // Create signature
  const signature = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(encodedPayload)
    .digest("base64url")

  // Return token in format: payload.signature
  return `${encodedPayload}.${signature}`
}

/**
 * Verify and decode a signed token
 * @param token - Token to verify
 * @returns Decoded payload or null if invalid/expired
 */
export function verifySignedToken(token: string): TokenPayload | null {
  try {
    const [encodedPayload, signature] = token.split(".")
    
    if (!encodedPayload || !signature) {
      return null
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", TOKEN_SECRET)
      .update(encodedPayload)
      .digest("base64url")

    if (signature !== expectedSignature) {
      console.warn("Token signature mismatch")
      return null
    }

    // Decode payload
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString()
    ) as TokenPayload

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      console.warn("Token expired")
      return null
    }

    return payload
  } catch (error) {
    console.error("Token verification error:", error)
    return null
  }
}

/**
 * Create a secure deletion confirmation token
 * @param userId - User ID requesting deletion
 * @param email - User email for verification
 * @param impactSummary - Summary of deletion impact
 * @returns Signed token
 */
export function createDeletionToken(
  userId: string,
  email: string,
  impactSummary: {
    activeSessions: number
    scheduledSessions: number
    familyMembersAffected: number
    hasSubscription: boolean
  }
): string {
  return createSignedToken(
    {
      type: "account_deletion",
      userId,
      email,
      impact: impactSummary,
      requestedAt: new Date().toISOString()
    },
    24 * 60 * 60 // 24 hours
  )
}

/**
 * Create a password reset token
 * @param userId - User ID
 * @param email - User email
 * @returns Signed token
 */
export function createPasswordResetToken(
  userId: string,
  email: string
): string {
  return createSignedToken(
    {
      type: "password_reset",
      userId,
      email,
      requestedAt: new Date().toISOString()
    },
    60 * 60 // 1 hour
  )
}

/**
 * Create an account recovery token
 * @param userId - User ID
 * @param email - User email
 * @returns Signed token
 */
export function createRecoveryToken(
  userId: string,
  email: string
): string {
  return createSignedToken(
    {
      type: "account_recovery",
      userId,
      email,
      requestedAt: new Date().toISOString()
    },
    30 * 24 * 60 * 60 // 30 days
  )
}

/**
 * Generate a secure random string for CSRF tokens
 * @param length - Token length (default: 32)
 * @returns Random string
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length)
}