// src/app/dashboard/therapy/page.tsx
import { getAuthSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { findUserByIdOptimized } from '@/lib/database/optimized-user-queries'
import TherapyPageClient from "./client"

export default async function TherapyPage() {
  const session = await getAuthSession()

  if (!session) {
    redirect("/auth/login")
  }

  // Check if user exists in database - if not, session is stale
  const user = await findUserByIdOptimized(session.user.id)

  if (!user) {
    console.log(`[TherapyPage] User ${session.user.id} not found in DB - redirecting to login`)
    redirect("/auth/login")
  }

  if (!user.onboardingCompleted) {
    redirect("/welcome")
  }

  return <TherapyPageClient userId={session.user.id} />
}
