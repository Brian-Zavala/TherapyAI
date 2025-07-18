// src/app/dashboard/therapy/page.tsx
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from '@/lib/prisma-optimized'
import TherapyPageClient from "./client"

export default async function TherapyPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/auth/login")
  }

  // Check if user exists in database - if not, session is stale
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, onboardingCompleted: true }
  })

  if (!user) {
    // User doesn't exist in DB - stale session, redirect to login
    console.log(`[TherapyPage] User ${session.user.id} not found in DB - redirecting to login`)
    redirect("/auth/login")
  }

  if (!user.onboardingCompleted) {
    redirect("/welcome")
  }

  return <TherapyPageClient userId={session.user.id} />
}