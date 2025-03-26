// src/app/dashboard/page.tsx
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import SessionTimeChart from "@/components/dashboard/SessionTimeChart"
import RelationshipProgressCard from "@/components/dashboard/RelationshipProgressCard"
import CommunicationMetrics from "@/components/dashboard/CommunicationMetrics"
import UpcomingSessions from "@/components/dashboard/UpcomingSessions"

export default async function Dashboard() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect("/api/auth/signin")
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Session Time Visualization */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-4">Session Time Overview</h2>
          <SessionTimeChart />
        </div>
        
        {/* Relationship Progress Card */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-4">Relationship Progress</h2>
          <RelationshipProgressCard />
        </div>
        
        {/* Communication Metrics */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-4">Communication Quality</h2>
          <CommunicationMetrics />
        </div>
        
        {/* Upcoming Sessions */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-4">Upcoming Sessions</h2>
          <UpcomingSessions />
        </div>
      </div>
    </div>
  )
}