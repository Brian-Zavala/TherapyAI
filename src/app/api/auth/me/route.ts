import { getAuthSession } from '@/lib/auth'
import { NextResponse } from 'next/server'

/**
 * GET /api/auth/me
 * Returns the current authenticated user's database info.
 * Used by the client-side useSession compat hook to resolve
 * Clerk user → database user ID.
 */
export async function GET() {
  try {
    const session = await getAuthSession()

    if (!session?.user) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    return NextResponse.json({ user: session.user })
  } catch (error) {
    console.error('[/api/auth/me] Error:', error)
    return NextResponse.json({ user: null }, { status: 500 })
  }
}
