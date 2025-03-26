// src/app/dashboard/therapy/page.tsx
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import TherapyPageClient from "./client"

export default async function TherapyPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/auth/login")
  }

  return <TherapyPageClient userId={session.user.id} />
}