// src/app/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import dynamic from 'next/dynamic';

// Dynamic imports for heavy dashboard components
const SessionTimeChart = dynamic(
  () => import("@/components/dashboard/SessionTimeChart"),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 animate-pulse">
        <div className="h-8 bg-white/20 rounded w-1/3 mb-4"></div>
        <div className="h-64 bg-white/20 rounded"></div>
      </div>
    )
  }
);

const RelationshipProgressCard = dynamic(
  () => import("@/components/dashboard/RelationshipProgressCard"),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 animate-pulse">
        <div className="h-8 bg-white/20 rounded w-1/2 mb-4"></div>
        <div className="h-32 bg-white/20 rounded"></div>
      </div>
    )
  }
);

const CommunicationMetrics = dynamic(
  () => import("@/components/dashboard/CommunicationMetrics"),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 animate-pulse">
        <div className="h-8 bg-white/20 rounded w-2/3 mb-4"></div>
        <div className="h-48 bg-white/20 rounded"></div>
      </div>
    )
  }
);

const UpcomingSessions = dynamic(
  () => import("@/components/dashboard/UpcomingSessions"),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 animate-pulse">
        <div className="h-8 bg-white/20 rounded w-1/2 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-white/20 rounded"></div>
          ))}
        </div>
      </div>
    )
  }
);

const ComprehensiveTherapyInsights = dynamic(
  () => import("@/components/dashboard/ComprehensiveTherapyInsights").then(mod => ({ default: mod.ComprehensiveTherapyInsights })),
  { 
    ssr: false,
    loading: () => (
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 animate-pulse">
        <div className="h-8 bg-white/20 rounded w-2/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-32 bg-white/20 rounded"></div>
          <div className="h-24 bg-white/20 rounded"></div>
          <div className="h-28 bg-white/20 rounded"></div>
        </div>
      </div>
    )
  }
);

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import NotificationBell from "@/components/ui/notification-bell";
import { useProfile } from "@/hooks/useApiQuery";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Use React Query for profile data
  const { 
    profile, 
    isLoading: isProfileLoading, 
    error: profileError 
  } = useProfile();
  
  // Note: Notification state is now managed by NotificationProvider
  
  // Enable smooth scrolling for this page
  useEffect(() => {
    document.documentElement.classList.add('smooth-scroll');
    return () => {
      document.documentElement.classList.remove('smooth-scroll');
    };
  }, []);

  // Handle authentication and onboarding redirect
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/login");
      return;
    }

    if (status === "authenticated" && profile) {
      // Check if user has completed onboarding
      if (!(profile as any).onboardingCompleted) {
        router.push("/welcome");
      }
    }
  }, [status, router, profile]);

  // Handle profile error (404 means redirect to welcome)
  useEffect(() => {
    if (profileError && profileError.message.includes('404')) {
      router.push("/welcome");
    }
  }, [profileError, router]);

  if (status === "loading" || isProfileLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen pt-8 pb-12 px-4 sm:px-6 md:px-8 lg:px-6 bg-gray-900">
      <div className="max-w-7xl mx-auto">
        {/* Dashboard Header with Welcome Message */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex justify-between items-center"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
              Welcome back, {profile?.name || session?.user?.name?.split(" ")[0] || "there"}!
            </h1>
            <p className="text-gray-400 mt-2">
              Your relationship journey continues today
            </p>
          </div>
          
          {/* Notification Bell */}
          <NotificationBell />
        </motion.div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-800">
          {["overview", "insights", "progress", "sessions", "resources"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 capitalize transition-all duration-200 ${
                activeTab === tab
                  ? "text-green-500 border-b-2 border-green-500"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {/* Quick Actions Card */}
            <motion.div
              variants={item}
              className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700"
            >
              <h2 className="text-xl font-semibold text-white mb-4">
                Quick Actions
              </h2>
              <div className="space-y-3">
                <Link
                  href="/schedule"
                  className="block w-full py-3 px-4 bg-green-600 text-white text-center rounded-lg hover:bg-green-700 transition-colors"
                >
                  Schedule Session
                </Link>
                <Link
                  href="/dashboard/therapy"
                  className="block w-full py-3 px-4 bg-gray-700 text-white text-center rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Start Therapy Session
                </Link>
                <Link
                  href="/dashboard/resources"
                  className="block w-full py-3 px-4 bg-gray-700 text-white text-center rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Educational Resources
                </Link>
              </div>
            </motion.div>

            {/* Relationship Progress Card */}
            <motion.div variants={item} className="md:col-span-2">
              <RelationshipProgressCard />
            </motion.div>

            {/* Upcoming Sessions */}
            <motion.div variants={item} className="lg:col-span-2">
              <UpcomingSessions />
            </motion.div>

            {/* Session Time Chart */}
            <motion.div variants={item}>
              <SessionTimeChart />
            </motion.div>

            {/* Communication Metrics */}
            <motion.div variants={item} className="lg:col-span-3">
              <CommunicationMetrics />
            </motion.div>

            {/* Therapy Insights Preview */}
            <motion.div variants={item} className="lg:col-span-3">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">Therapy Insights</h2>
                  <button
                    onClick={() => setActiveTab("insights")}
                    className="text-green-500 hover:text-green-400 transition-colors text-sm"
                  >
                    View All →
                  </button>
                </div>
                <p className="text-gray-400">
                  Get personalized insights and recommendations based on your therapy progress.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeTab === "progress" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RelationshipProgressCard />
              <SessionTimeChart />
            </div>
            <div className="mt-6">
              <CommunicationMetrics />
            </div>
          </motion.div>
        )}

        {activeTab === "sessions" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <UpcomingSessions />
            <div className="mt-6 text-center">
              <Link
                href="/dashboard/sessions"
                className="text-green-500 hover:text-green-400 transition-colors"
              >
                View All Sessions →
              </Link>
            </div>
          </motion.div>
        )}

        {activeTab === "resources" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700"
          >
            <h2 className="text-2xl font-semibold text-white mb-4">
              Educational Resources
            </h2>
            <p className="text-gray-400 mb-6">
              Explore guides, articles, and tools to strengthen your
              relationship.
            </p>
            <Link
              href="/dashboard/resources"
              className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Browse Resources
              <svg
                className="w-5 h-5 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </motion.div>
        )}

        {activeTab === "insights" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <ComprehensiveTherapyInsights />
          </motion.div>
        )}
      </div>
    </div>
  );
}