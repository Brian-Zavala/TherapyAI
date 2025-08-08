// Next.js 15 route configuration for optimal performance
// See: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config

// Dynamic rendering for user-specific data
export const dynamic = 'force-dynamic'

// Disable static generation since this is user-specific
export const dynamicParams = true

// No revalidation needed for user-specific data
export const revalidate = false

// Use default fetch cache behavior
export const fetchCache = 'default'

// Use Node.js runtime for full feature support
export const runtime = 'nodejs'

// Max duration for Vercel/Railway deployments (in seconds)
// This should be higher than our internal timeouts
export const maxDuration = 30

// Preferred region for deployment (if using edge)
export const preferredRegion = 'auto'