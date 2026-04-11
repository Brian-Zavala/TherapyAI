import { getAuthSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma-optimized"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getAuthSession()

  if (!session) {
    redirect("/sign-in")
  }

  // Check if user has completed onboarding
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingCompleted: true, hasSeenIntro: true },
  })

  if (!user) {
    redirect("/sign-in")
  }

  if (!user.hasSeenIntro) {
    redirect("/intro")
  }

  if (!user.onboardingCompleted) {
    redirect("/welcome")
  }

  return <>{children}</>
}
