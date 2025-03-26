// src/app/dashboard/page.tsx
import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import TherapyButton from '@/components/TherapyButton'
import SessionHistory from '@/components/SessionHistory'

export default async function Dashboard() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/login')
  }
  
  // Fetch user's therapy sessions
  const therapySessions = await prisma.session.findMany({
    where: { 
      userId: session.user.id as string 
    },
    orderBy: { 
      startTime: 'desc' 
    }
  })
  
  // Fetch user details
  const user = await prisma.user.findUnique({
    where: { 
      id: session.user.id as string 
    },
    select: {
      name: true,
      email: true,
      partnerName: true
    }
  })
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome, {user?.name}</h1>
        <p className="text-gray-600 mt-2">
          {user?.partnerName 
            ? `You and ${user.partnerName} can start or schedule therapy sessions below.`
            : 'You can start or schedule therapy sessions below.'}
        </p>
      </header>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Start a New Therapy Session</h2>
        <TherapyButton userId={session.user.id as string} />
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Your Session History</h2>
        {therapySessions.length > 0 ? (
          <SessionHistory initialSessions={therapySessions} />
        ) : (
          <p className="text-gray-500 italic">You haven't had any therapy sessions yet.</p>
        )}
      </div>
    </div>
  )
}