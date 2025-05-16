// src/app/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import SessionTimeChart from "@/components/dashboard/SessionTimeChart";
import RelationshipProgressCard from "@/components/dashboard/RelationshipProgressCard";
import CommunicationMetrics from "@/components/dashboard/CommunicationMetrics";
import UpcomingSessions from "@/components/dashboard/UpcomingSessions";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }

    if (status === "authenticated" && session?.user?.email) {
      // Fetch user profile to check if it's complete
      const fetchUserProfile = async () => {
        try {
          setIsProfileLoading(true);
          const response = await fetch("/api/user/profile");

          if (response.ok) {
            const userData = await response.json();

            // Check if user has completed onboarding
            if (!userData.onboardingCompleted) {
              // Redirect to welcome page if onboarding is not complete
              router.push("/welcome");
            }
          } else if (response.status === 404) {
            // If user not found, redirect to welcome page
            router.push("/welcome");
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        } finally {
          setIsProfileLoading(false);
        }
      };

      fetchUserProfile();
    }
  }, [status, router, session]);

  if (status === "loading" || isProfileLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
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
    <div className="min-h-screen pt-8 pb-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Dashboard Header with Welcome Message */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/25 backdrop-blur-sm border border-white/30 rounded-xl shadow-lg mb-8 p-6 sm:p-10 text-white"
        >
          <div className="flex flex-col items-center sm:flex-row sm:justify-between sm:items-center">
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold">
                Welcome back, {session?.user?.name?.split(" ")[0] || "there"}
              </h1>
              <p className="mt-2 text-white">
                Track your progress and manage your relationship journey
              </p>
            </div>
            <Link
              href="/dashboard/therapy"
              className="mt-6 sm:mt-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium py-3 sm:py-4 px-8 sm:px-10 rounded-full text-base sm:text-lg shadow-lg shadow-blue-500/30 transition-all duration-300 hover:shadow-lg hover:from-blue-600 hover:to-blue-600 focus:ring-4 focus:ring-blue-400 relative overflow-hidden"
            >
              Start New Session
              <span className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 opacity-0 hover:opacity-100 transition-opacity duration-300"></span>
              <span className="absolute -inset-1 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 opacity-30 blur-lg"></span>
            </Link>
          </div>
        </motion.div>

        {/* Dashboard Tab Navigation for Mobile */}
        <div className="sm:hidden mb-4 overflow-x-auto scrollbar-hide flex space-x-2 pb-2 border-b border-white/20">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 py-2 rounded-lg font-medium flex-shrink-0 text-sm min-w-[90px] ${
              activeTab === "overview"
                ? "bg-green-500/50 text-white"
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("progress")}
            className={`px-3 py-2 rounded-lg font-medium flex-shrink-0 text-sm min-w-[90px] ${
              activeTab === "progress"
                ? "bg-green-500/50 text-white"
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            Progress
          </button>
          <button
            onClick={() => setActiveTab("communication")}
            className={`px-3 py-2 rounded-lg font-medium flex-shrink-0 text-sm min-w-[90px] ${
              activeTab === "communication"
                ? "bg-green-500/50 text-white"
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            Comm.
          </button>
          <button
            onClick={() => setActiveTab("sessions")}
            className={`px-3 py-2 rounded-lg font-medium flex-shrink-0 text-sm min-w-[90px] ${
              activeTab === "sessions"
                ? "bg-green-500/50 text-white"
                : "bg-white/20 text-white hover:bg-white/30"
            }`}
          >
            Sessions
          </button>
        </div>

        {/* Desktop View - All Cards */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="hidden sm:grid sm:grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 xl:gap-10"
        >
          {/* Session Time Visualization */}
          <motion.div
            variants={item}
            className="w-full" style={{ minHeight: "500px" }}
          >
            <SessionTimeChart />
          </motion.div>

          {/* Relationship Progress Card */}
          <motion.div
            variants={item}
            className="w-full" style={{ minHeight: "480px" }}
          >
            <RelationshipProgressCard />
          </motion.div>

          {/* Communication Metrics */}
          <motion.div
            variants={item}
            className="w-full" style={{ minHeight: "500px" }}
          >
            <CommunicationMetrics />
          </motion.div>

          {/* Upcoming Sessions */}
          <motion.div
            variants={item}
            className="w-full"
          >
            <UpcomingSessions />
          </motion.div>
        </motion.div>

        {/* Mobile View - Tabbed Interface */}
        <div className="sm:hidden">
          {/* Chart Component based on active tab */}
          {activeTab === "overview" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full mb-6" style={{ minHeight: "450px" }}
            >
              <SessionTimeChart />
            </motion.div>
          )}

          {activeTab === "progress" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full mb-6" style={{ minHeight: "450px" }}
            >
              <RelationshipProgressCard />
            </motion.div>
          )}

          {activeTab === "communication" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full mb-6" style={{ minHeight: "480px" }}
            >
              <CommunicationMetrics />
            </motion.div>
          )}

          {activeTab === "sessions" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full mb-6"
            >
              <UpcomingSessions />
            </motion.div>
          )}

          {/* Quick Actions for Mobile - Displayed after charts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/25 backdrop-blur-sm border border-white/30 rounded-xl shadow-lg p-4 mb-4"
          >
            <h2 className="text-lg font-semibold text-white mb-3">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/dashboard/therapy"
                className="flex flex-col items-center p-3 bg-white/70 rounded-lg hover:bg-white/80 transition-colors shadow-md border border-blue-100"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white mb-1 shadow-sm">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-blue-800">
                    Start Therapy
                  </p>
                </div>
              </Link>

              <Link
                href="/dashboard/sessions"
                className="flex flex-col items-center p-3 bg-white/70 rounded-lg hover:bg-white/80 transition-colors shadow-md border border-blue-100"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white mb-1 shadow-sm">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-blue-800">
                    Past Sessions
                  </p>
                </div>
              </Link>

              <Link
                href="/dashboard/resources"
                className="flex flex-col items-center p-3 bg-white/70 rounded-lg hover:bg-white/80 transition-colors shadow-md border border-blue-100"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white mb-1 shadow-sm">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-blue-800">Resources</p>
                </div>
              </Link>

              <Link
                href="/dashboard/profile"
                className="flex flex-col items-center p-3 bg-white/70 rounded-lg hover:bg-white/80 transition-colors shadow-md border border-blue-100"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white mb-1 shadow-sm">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-blue-800">Profile</p>
                </div>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Quick Actions - Desktop only */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="hidden sm:block mt-8 bg-white/25 backdrop-blur-sm border border-white/30 rounded-xl shadow-lg p-6"
        >
          <h2 className="text-xl font-semibold text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/dashboard/therapy"
              className="flex items-center p-4 bg-white/70 rounded-xl hover:bg-white/80 transition-colors shadow-md border border-blue-100"
            >
              <div className="w-10 h-10 min-w-[2.5rem] rounded-full bg-blue-500 flex items-center justify-center text-white mr-3 shadow-md">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-black/80">Start Therapy</h3>
                <p className="text-sm text-black">Begin a new session</p>
              </div>
            </Link>

            <Link
              href="/dashboard/sessions"
              className="flex items-center p-4 bg-white/70 rounded-xl hover:bg-white/80 transition-colors shadow-md border border-blue-100"
            >
              <div className="w-10 h-10 min-w-[2.5rem] rounded-full bg-blue-600 flex items-center justify-center text-white mr-3 shadow-md">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-blue-800">Past Sessions</h3>
                <p className="text-sm text-blue-600">View your history</p>
              </div>
            </Link>

            <Link
              href="/dashboard/resources"
              className="flex items-center p-4 bg-white/70 rounded-xl hover:bg-white/80 transition-colors shadow-md border border-blue-100"
            >
              <div className="w-10 h-10 min-w-[2.5rem] rounded-full bg-blue-600 flex items-center justify-center text-white mr-3 shadow-md">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-blue-800">Resources</h3>
                <p className="text-sm text-blue-600">Find helpful guides</p>
              </div>
            </Link>

            <Link
              href="/dashboard/profile"
              className="flex items-center p-4 bg-white/70 rounded-xl hover:bg-white/80 transition-colors shadow-md border border-blue-100"
            >
              <div className="w-10 h-10 min-w-[2.5rem] rounded-full bg-blue-600 flex items-center justify-center text-white mr-3 shadow-md">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-blue-800">Profile</h3>
                <p className="text-sm text-blue-600">View your details</p>
              </div>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
