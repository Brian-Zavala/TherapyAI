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
  
  // Enable smooth scrolling for this page
  useEffect(() => {
    document.documentElement.classList.add('smooth-scroll');
    return () => {
      document.documentElement.classList.remove('smooth-scroll');
    };
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth/login");
      return;
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
    <div className="min-h-screen pt-8 pb-12 px-4 sm:px-6 bg-gray-900">
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
              className="mt-6 sm:mt-0 bg-gradient-to-r from-green-500 to-green-600 text-white font-medium py-3 sm:py-4 px-8 sm:px-10 rounded-full text-base sm:text-lg shadow-lg shadow-green-500/30 transition-all duration-300 hover:shadow-lg hover:from-green-600 hover:to-green-600 focus:ring-4 focus:ring-green-400 relative overflow-hidden"
            >
              Start New Session
              <span className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 to-green-500 opacity-0 hover:opacity-100 transition-opacity duration-300"></span>
              <span className="absolute -inset-1 rounded-full bg-gradient-to-br from-green-400 to-green-500 opacity-30 blur-lg"></span>
            </Link>
          </div>
        </motion.div>

        {/* Dashboard Tab Navigation for Mobile */}
        <div className="sm:hidden mb-6">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-1 shadow-lg">
            <div className="flex space-x-0.5">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab("overview")}
                className={`relative px-1.5 py-2.5 rounded-lg font-medium flex-1 text-[10px] transition-all duration-300 min-w-0 ${
                  activeTab === "overview"
                    ? "text-white shadow-lg"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
              >
                {activeTab === "overview" && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex flex-col items-center justify-center">
                  <svg className="w-3 h-3 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="truncate font-semibold">Overview</span>
                </span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab("progress")}
                className={`relative px-1.5 py-2.5 rounded-lg font-medium flex-1 text-[10px] transition-all duration-300 min-w-0 ${
                  activeTab === "progress"
                    ? "text-white shadow-lg"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
              >
                {activeTab === "progress" && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex flex-col items-center justify-center">
                  <svg className="w-3 h-3 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span className="truncate font-semibold">Progress</span>
                </span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab("communication")}
                className={`relative px-1.5 py-2.5 rounded-lg font-medium flex-1 text-[10px] transition-all duration-300 min-w-0 ${
                  activeTab === "communication"
                    ? "text-white shadow-lg"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
              >
                {activeTab === "communication" && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex flex-col items-center justify-center">
                  <svg className="w-3 h-3 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="truncate font-semibold">Comm</span>
                </span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab("sessions")}
                className={`relative px-1.5 py-2.5 rounded-lg font-medium flex-1 text-[10px] transition-all duration-300 min-w-0 ${
                  activeTab === "sessions"
                    ? "text-white shadow-lg"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
              >
                {activeTab === "sessions" && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex flex-col items-center justify-center">
                  <svg className="w-3 h-3 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="truncate font-semibold">Sessions</span>
                </span>
              </motion.button>
            </div>
          </div>
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
            className="w-full h-full min-h-[500px]"
          >
            <SessionTimeChart />
          </motion.div>

          {/* Relationship Progress Card */}
          <motion.div
            variants={item}
            className="w-full h-full min-h-[500px]"
          >
            <RelationshipProgressCard />
          </motion.div>

          {/* Communication Metrics */}
          <motion.div
            variants={item}
            className="w-full h-full min-h-[500px]"
          >
            <CommunicationMetrics />
          </motion.div>

          {/* Upcoming Sessions */}
          <motion.div
            variants={item}
            className="w-full h-full min-h-[500px]"
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
              className="w-full h-full min-h-[480px] mb-4 sm:mb-6"
            >
              <SessionTimeChart />
            </motion.div>
          )}

          {activeTab === "progress" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full h-full min-h-[480px] mb-4 sm:mb-6"
            >
              <RelationshipProgressCard />
            </motion.div>
          )}

          {activeTab === "communication" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full h-full min-h-[480px] mb-4 sm:mb-6"
            >
              <CommunicationMetrics />
            </motion.div>
          )}

          {activeTab === "sessions" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="w-full h-full min-h-[480px] mb-4 sm:mb-6"
            >
              <UpcomingSessions />
            </motion.div>
          )}

          {/* Quick Actions for Mobile - Displayed after charts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl shadow-xl p-5 mb-4"
          >
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center text-white mr-3 shadow-lg">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-white">
                Quick Actions
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/dashboard/therapy"
                  className="flex flex-col items-center p-4 bg-gradient-to-br from-green-500/80 to-green-600/80 backdrop-blur-sm rounded-xl hover:from-green-400/80 hover:to-green-500/80 transition-all duration-300 shadow-lg border border-green-400/30"
                >
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white mb-2 shadow-md">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-white text-center">
                    Start Therapy
                  </p>
                </Link>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/dashboard/sessions"
                  className="flex flex-col items-center p-4 bg-gradient-to-br from-blue-500/80 to-blue-600/80 backdrop-blur-sm rounded-xl hover:from-blue-400/80 hover:to-blue-500/80 transition-all duration-300 shadow-lg border border-blue-400/30"
                >
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white mb-2 shadow-md">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-white text-center">
                    Past Sessions
                  </p>
                </Link>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/dashboard/resources"
                  className="flex flex-col items-center p-4 bg-gradient-to-br from-purple-500/80 to-purple-600/80 backdrop-blur-sm rounded-xl hover:from-purple-400/80 hover:to-purple-500/80 transition-all duration-300 shadow-lg border border-purple-400/30"
                >
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white mb-2 shadow-md">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-white text-center">Resources</p>
                </Link>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href="/dashboard/profile"
                  className="flex flex-col items-center p-4 bg-gradient-to-br from-indigo-500/80 to-indigo-600/80 backdrop-blur-sm rounded-xl hover:from-indigo-400/80 hover:to-indigo-500/80 transition-all duration-300 shadow-lg border border-indigo-400/30"
                >
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white mb-2 shadow-md">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-white text-center">Profile</p>
                </Link>
              </motion.div>
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
              className="flex items-center p-4 bg-white/70 rounded-xl hover:bg-white/80 transition-colors shadow-md border border-green-100"
            >
              <div className="w-10 h-10 min-w-[2.5rem] rounded-full bg-green-500 flex items-center justify-center text-white mr-3 shadow-md">
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
                <h3 className="font-medium text-green-800">Start Therapy</h3>
                <p className="text-sm text-green-600">Begin a new session</p>
              </div>
            </Link>

            <Link
              href="/dashboard/sessions"
              className="flex items-center p-4 bg-white/70 rounded-xl hover:bg-white/80 transition-colors shadow-md border border-green-100"
            >
              <div className="w-10 h-10 min-w-[2.5rem] rounded-full bg-green-500 flex items-center justify-center text-white mr-3 shadow-md">
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
                <h3 className="font-medium text-green-800">Past Sessions</h3>
                <p className="text-sm text-green-600">View your history</p>
              </div>
            </Link>

            <Link
              href="/dashboard/resources"
              className="flex items-center p-4 bg-white/70 rounded-xl hover:bg-white/80 transition-colors shadow-md border border-green-100"
            >
              <div className="w-10 h-10 min-w-[2.5rem] rounded-full bg-green-500 flex items-center justify-center text-white mr-3 shadow-md">
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
                <h3 className="font-medium text-green-800">Resources</h3>
                <p className="text-sm text-green-600">Find helpful guides</p>
              </div>
            </Link>

            <Link
              href="/dashboard/profile"
              className="flex items-center p-4 bg-white/70 rounded-xl hover:bg-white/80 transition-colors shadow-md border border-green-100"
            >
              <div className="w-10 h-10 min-w-[2.5rem] rounded-full bg-green-500 flex items-center justify-center text-white mr-3 shadow-md">
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
                <h3 className="font-medium text-green-800">Profile</h3>
                <p className="text-sm text-green-600">View your details</p>
              </div>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
