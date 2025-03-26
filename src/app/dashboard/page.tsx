// src/app/dashboard/page.tsx
import { getServerSession } from "next-auth/next"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export default async function Dashboard() {
  // Get the session
  const session = await getServerSession(authOptions)
  
  // Debug log to see what session contains
  console.log("Dashboard session:", JSON.stringify(session, null, 2))
  
  // Redirect if not authenticated
  if (!session) {
    redirect("/login")
  }
  
  // Get user ID (with fallback)
  const userId = session?.user?.id || ""
  
  if (!userId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
          <p>Session found but no user ID available. Please try logging in again.</p>
        </div>
      </div>
    )
  }
  
  try {
    // Fetch user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        partnerName: true
      }
    })
    
    // Render dashboard with user data
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        
        {user ? (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
            <p className="mb-2"><span className="font-medium">Name:</span> {user.name}</p>
            <p className="mb-2"><span className="font-medium">Email:</span> {user.email}</p>
            {user.partnerName && (
              <p className="mb-2"><span className="font-medium">Partner:</span> {user.partnerName}</p>
            )}
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 p-4 rounded">
            <p>User not found. Please try logging in again.</p>
          </div>
        )}
      </div>
    )
  } catch (error) {
    console.error("Dashboard error:", error)
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <div className="bg-red-50 border border-red-200 p-4 rounded">
          <p>Error loading dashboard data: {error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    )
  }
}