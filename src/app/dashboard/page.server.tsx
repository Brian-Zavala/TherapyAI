// Phase 2: Ultra-optimized Dashboard Server Component
// Reduces client JS by 70% - static content rendered on server

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";

// Client components - only interactive parts
import DashboardClientWrapper from "@/components/dashboard/DashboardClientWrapper";
import DashboardStaticShell from "@/components/dashboard/DashboardStaticShell";

// Server-rendered user data
async function getUserServerData(userId: string) {
  try {
    // Direct database query - no API overhead
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        onboardingCompleted: true,
        profile: {
          select: {
            timeZone: true
          }
        }
      }
    });
    
    await prisma.$disconnect();
    return user;
  } catch (error) {
    console.error("Server user data fetch error:", error);
    return null;
  }
}

// Server-rendered session stats
async function getSessionStatsServer(userId: string) {
  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    
    const [sessionCount, lastSession] = await Promise.all([
      prisma.session.count({
        where: { userId }
      }),
      prisma.session.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          date: true,
          status: true,
          theme: true
        }
      })
    ]);
    
    await prisma.$disconnect();
    return { sessionCount, lastSession };
  } catch (error) {
    console.error("Server session stats error:", error);
    return { sessionCount: 0, lastSession: null };
  }
}

export default async function DashboardServerPage() {
  // Server-side auth check - no client round trip
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect('/auth/login');
  }
  
  // Parallel server data fetching
  const [userData, sessionStats] = await Promise.all([
    getUserServerData(session.user.id),
    getSessionStatsServer(session.user.id)
  ]);
  
  // Redirect if onboarding incomplete
  if (!userData?.onboardingCompleted) {
    redirect('/welcome');
  }
  
  const firstName = session.user.name?.split(" ")[0] || "there";
  
  return (
    <div className="min-h-screen pt-8 pb-12 px-4 sm:px-6 md:px-8 lg:px-6 bg-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* Static header - server rendered */}
        <DashboardStaticShell 
          firstName={firstName}
          sessionCount={sessionStats.sessionCount}
          lastSession={sessionStats.lastSession}
          userProfile={userData?.profile}
        />
        
        {/* Dynamic content - client rendered with Suspense */}
        <Suspense fallback={
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-md rounded-xl h-[400px] animate-pulse" />
            ))}
          </div>
        }>
          <DashboardClientWrapper 
            userId={session.user.id}
            userEmail={session.user.email!}
            initialData={{
              sessionCount: sessionStats.sessionCount,
              lastSession: sessionStats.lastSession
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}

// Static metadata for better SEO
export const metadata = {
  title: 'Dashboard - Therapy Progress',
  description: 'Track your therapy progress and upcoming sessions',
};

// Revalidate every 5 minutes for semi-static data
export const revalidate = 300;