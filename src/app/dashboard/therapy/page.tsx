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

  // Check if user has completed onboarding
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingCompleted: true }
  })

  if (!user || !user.onboardingCompleted) {
    redirect("/welcome")
  }

  return <TherapyPageClient userId={session.user.id} />
}