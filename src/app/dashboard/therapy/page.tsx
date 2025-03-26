// src/app/dashboard/therapy/page.tsx
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import TherapyButton from "@/components/TherapyButton"

export default async function TherapyPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/auth/login")
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Therapy Session</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">AI Therapist</h2>
        <p className="text-gray-600 mb-6">
          Connect with our AI therapist for relationship support.
        </p>
        
        <TherapyButton userId={session.user.id} />
      </div>
    </div>
  )
}