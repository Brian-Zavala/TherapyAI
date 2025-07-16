"use client";

// Phase 2: Optimized client component wrapper
// Only handles interactive dashboard elements

import { useState, useEffect, Suspense, lazy } from "react";
import { motion } from "framer-motion";
// Removed legacy useRealtimeNotifications import - now using NotificationProvider
import NotificationBell from "@/components/ui/notification-bell";
import Link from "next/link";
import dynamic from "next/dynamic";

// Lazy load heavy components
const SessionTimeChart = lazy(() => import("@/components/dashboard/SessionTimeChart"));
const RelationshipProgressCard = lazy(() => import("@/components/dashboard/RelationshipProgressCard"));
const CommunicationMetrics = lazy(() => import("@/components/dashboard/CommunicationMetrics"));
const UpcomingSessions = lazy(() => import("@/components/dashboard/UpcomingSessions"));

// Dynamic import for better code splitting
const DashboardMobileNav = dynamic(() => import("@/components/dashboard/DashboardMobileNav"), {
  ssr: false
});

interface DashboardClientWrapperProps {
  userId: string;
  userEmail: string;
  initialData: {
    sessionCount: number;
    lastSession: any;
  };
}

export default function DashboardClientWrapper({
  userId,
  userEmail,
  initialData
}: DashboardClientWrapperProps) {
  const [activeTab, setActiveTab] = useState("overview");
  
  // Initialize real-time notifications
  // Commented out to prevent duplicate notification requests
  // The NotificationBell component handles its own notifications
  // const { unreadCount } = useRealtimeNotifications({
  //   playSound: true,
  //   showBrowserNotifications: true,
  //   autoMarkAsRead: false
  // });
  
  // Mount notification bell in server-rendered shell
  useEffect(() => {
    const bellMount = document.getElementById('notification-bell-mount');
    if (bellMount) {
      const bellElement = document.createElement('div');
      bellMount.appendChild(bellElement);
      
      // Mount notification bell
      import('react-dom/client').then(({ createRoot }) => {
        const root = createRoot(bellElement);
        root.render(<NotificationBell className="sm:mr-2" />);
        
        return () => root.unmount();
      });
    }
  }, []);

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
    <>
      {/* Mobile Navigation */}
      <DashboardMobileNav 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Desktop View - All Cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="hidden sm:grid sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 xl:gap-10"
      >
        <motion.div variants={item} className="w-full h-full min-h-[400px] md:min-h-[450px] lg:min-h-[500px]">
          <Suspense fallback={<div className="bg-white/10 backdrop-blur-md rounded-xl h-full animate-pulse" />}>
            <SessionTimeChart />
          </Suspense>
        </motion.div>

        <motion.div variants={item} className="w-full h-full min-h-[400px] md:min-h-[450px] lg:min-h-[500px]">
          <Suspense fallback={<div className="bg-white/10 backdrop-blur-md rounded-xl h-full animate-pulse" />}>
            <RelationshipProgressCard />
          </Suspense>
        </motion.div>

        <motion.div variants={item} className="w-full h-full min-h-[400px] md:min-h-[450px] lg:min-h-[500px]">
          <Suspense fallback={<div className="bg-white/10 backdrop-blur-md rounded-xl h-full animate-pulse" />}>
            <CommunicationMetrics />
          </Suspense>
        </motion.div>

        <motion.div variants={item} className="w-full h-full min-h-[400px] md:min-h-[450px] lg:min-h-[500px]">
          <Suspense fallback={<div className="bg-white/10 backdrop-blur-md rounded-xl h-full animate-pulse" />}>
            <UpcomingSessions />
          </Suspense>
        </motion.div>
      </motion.div>

      {/* Mobile View - Tabbed Interface */}
      <div className="sm:hidden">
        {activeTab === "overview" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full h-full min-h-[480px] mb-4 sm:mb-6"
          >
            <Suspense fallback={<div className="bg-white/10 backdrop-blur-md rounded-xl h-full animate-pulse" />}>
              <SessionTimeChart />
            </Suspense>
          </motion.div>
        )}

        {activeTab === "progress" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full h-full min-h-[480px] mb-4 sm:mb-6"
          >
            <Suspense fallback={<div className="bg-white/10 backdrop-blur-md rounded-xl h-full animate-pulse" />}>
              <RelationshipProgressCard />
            </Suspense>
          </motion.div>
        )}

        {activeTab === "communication" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full h-full min-h-[480px] mb-4 sm:mb-6"
          >
            <Suspense fallback={<div className="bg-white/10 backdrop-blur-md rounded-xl h-full animate-pulse" />}>
              <CommunicationMetrics />
            </Suspense>
          </motion.div>
        )}

        {activeTab === "sessions" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full h-full min-h-[480px] mb-4 sm:mb-6"
          >
            <Suspense fallback={<div className="bg-white/10 backdrop-blur-md rounded-xl h-full animate-pulse" />}>
              <UpcomingSessions />
            </Suspense>
          </motion.div>
        )}

        {/* Mobile Quick Actions */}
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
            {[
              { href: "/dashboard/therapy", label: "Start Therapy", icon: "M12 6v6m0 0v6m0-6h6m-6 0H6", color: "from-green-500/80 to-green-600/80 hover:from-green-400/80 hover:to-green-500/80 border-green-400/30" },
              { href: "/dashboard/sessions", label: "Past Sessions", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", color: "from-blue-500/80 to-blue-600/80 hover:from-blue-400/80 hover:to-blue-500/80 border-blue-400/30" },
              { href: "/dashboard/resources", label: "Resources", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", color: "from-purple-500/80 to-purple-600/80 hover:from-purple-400/80 hover:to-purple-500/80 border-purple-400/30" },
              { href: "/dashboard/profile", label: "Profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", color: "from-indigo-500/80 to-indigo-600/80 hover:from-indigo-400/80 hover:to-indigo-500/80 border-indigo-400/30" }
            ].map((action, index) => (
              <motion.div key={index} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href={action.href}
                  className={`flex flex-col items-center p-4 bg-gradient-to-br ${action.color} backdrop-blur-sm rounded-xl transition-all duration-300 shadow-lg border`}
                >
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white mb-2 shadow-md">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-white text-center">
                    {action.label}
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </>
  );
}