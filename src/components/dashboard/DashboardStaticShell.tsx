// Static server-rendered dashboard header and layout
// Zero client JavaScript required for shell

import Link from "next/link";

interface DashboardStaticShellProps {
  firstName: string;
  sessionCount: number;
  lastSession: any;
  userProfile: any;
}

export default function DashboardStaticShell({
  firstName,
  sessionCount,
  lastSession,
  userProfile
}: DashboardStaticShellProps) {
  
  return (
    <>
      {/* Dashboard Header - Server Rendered */}
      <div className="bg-white/25 backdrop-blur-sm border border-white/30 rounded-xl shadow-lg mb-8 p-6 sm:p-10 text-white">
        <div className="flex flex-col items-center sm:flex-row sm:justify-between sm:items-center">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold">
              Welcome back, {firstName}
            </h1>
            <p className="mt-2 text-white">
              Track your progress and manage your relationship journey
            </p>
            
            {/* Server-rendered stats */}
            <div className="flex gap-4 mt-4 text-sm text-white/80">
              <span>{sessionCount} sessions completed</span>
              {lastSession && (
                <span>Last: {new Date(lastSession.date).toLocaleDateString()}</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4 mt-6 sm:mt-0">
            {/* Notification bell will be client component */}
            <div id="notification-bell-mount" />
            
            <Link
              href="/dashboard/therapy"
              className="bg-gradient-to-r from-green-500 to-green-600 text-white font-medium py-3 sm:py-4 px-8 sm:px-10 rounded-full text-base sm:text-lg shadow-lg shadow-green-500/30 transition-all duration-300 hover:shadow-lg hover:from-green-600 hover:to-green-600 focus:ring-4 focus:ring-green-400 relative overflow-hidden"
            >
              Start New Session
              <span className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 to-green-500 opacity-0 hover:opacity-100 transition-opacity duration-300"></span>
              <span className="absolute -inset-1 rounded-full bg-gradient-to-br from-green-400 to-green-500 opacity-30 blur-lg"></span>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions - Desktop (Server Rendered) */}
      <div className="hidden sm:block mt-8 bg-white/25 backdrop-blur-sm border border-white/30 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
      </div>
    </>
  );
}