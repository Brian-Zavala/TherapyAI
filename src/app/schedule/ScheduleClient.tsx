"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Clock,
  Loader,
  Users,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import { useSession } from '@/hooks/useClerkSession'
import { useRouter, useSearchParams } from "next/navigation";
import { useProfile } from "@/providers/ProfileProvider";
import { motion, AnimatePresence } from "framer-motion";
import { EnhancedSchedulerModal } from "@/components/enhanced-scheduler/EnhancedSchedulerModal";
import TherapeuticBokehBackground from "@/components/ui/therapeutic-bokeh-background";
import { UserPreferences } from "@/lib/enhanced-scheduler/types";
import {
  formatInUserTimezone,
  getUserTimezone,
} from "@/lib/date-utils";
import { useNotificationPermissions } from "@/hooks/useNotificationPermissions";
import { NotificationPermissionModal } from "@/components/NotificationPermissionModal";

interface Session {
  id: string;
  userId: string;
  partnerId?: string;
  partnerName?: string;
  familyMembers?: Array<{
    id: string;
    name: string;
    relation?: string;
  }>;
  startTime: string;
  endTime?: string;
  status: string;
  therapyType: string;
  notes?: string;
  duration: number;
}

export default function ScheduleClient() {
  const { status: authStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, isLoading: profileLoading } = useProfile();
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showScheduler, setShowScheduler] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState<Session | null>(null);
  const [userPreferences, setUserPreferences] =
    useState<UserPreferences | null>(null);
  // These are set based on profile but will be used in future recurring session feature
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_showRecurringOptions, setShowRecurringOptions] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_recurringFrequency, setRecurringFrequency] = useState("weekly");
  const [isLoadingRescheduleSession, setIsLoadingRescheduleSession] =
    useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  // Check notification permissions
  const {
    checkPermissions,
    hasEmailPermission,
    hasSmsPermission,
  } = useNotificationPermissions();

  // Define handleRescheduleSession before it's used
  const handleRescheduleSession = useCallback(async (sessionId: string) => {
    try {
      setIsLoadingRescheduleSession(true);
      const response = await fetch(`/api/sessions/${sessionId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch session for rescheduling");
      }

      const sessionData = await response.json();

      // Convert the session data to match the expected format
      const formattedSession: Session = {
        id: sessionData.id,
        userId: sessionData.userId,
        partnerId: sessionData.partnerId,
        partnerName: sessionData.partnerName,
        familyMembers: sessionData.familyMembers || [],
        startTime: sessionData.date,
        endTime: sessionData.endTime,
        status: sessionData.status,
        therapyType:
          sessionData.sessionType || sessionData.theme || "individual",
        notes: sessionData.notes,
        duration: sessionData.duration || 30,
      };

      setSessionToEdit(formattedSession);
      setShowScheduler(true);

      // Clear the query parameter to avoid re-triggering
      router.replace("/schedule");
    } catch (error) {
      console.error("Error loading session for rescheduling:", error);
      alert("Unable to load session for rescheduling. Please try again.");
    } finally {
      setIsLoadingRescheduleSession(false);
    }
  }, [router]);

  // Redirect if not authenticated
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [authStatus, router]);

  // Fetch sessions
  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Handle reschedule query parameter
  useEffect(() => {
    const rescheduleId = searchParams.get("reschedule");
    if (rescheduleId && authStatus === "authenticated") {
      handleRescheduleSession(rescheduleId);
    }
  }, [searchParams, authStatus, handleRescheduleSession]);

  // Set user preferences from profile
  useEffect(() => {
    if (profile && !profileLoading) {
      // Create minimal valid UserPreferences object
      const prefs: UserPreferences = {
        id: profile.id || 'temp-id',
        userId: profile.id || 'temp-user-id',
        preferredDays: profile.preferredDays ? (Array.isArray(profile.preferredDays) ? profile.preferredDays : [profile.preferredDays]) : [],
        preferredTimes: {
          start: '09:00',
          end: '17:00'
        },
        timezone: profile.timezone || getUserTimezone(),
        reminderSettings: {
          email: profile.notificationPrefs?.includes?.('email') ?? true,
          sms: profile.notificationPrefs?.includes?.('sms') ?? false,
          minutesBefore: profile.reminderTiming ? parseInt(profile.reminderTiming) : 60
        },
        autoSchedule: false,
        bufferTime: 15,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setUserPreferences(prefs);

      // Set recurring options based on user preference
      if (profile.recurringSession === "yes") {
        setShowRecurringOptions(true);
        setRecurringFrequency(profile.sessionFrequency || "weekly");
      }
    }
  }, [profile, profileLoading]);

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/sessions/upcoming");
      if (!response.ok) throw new Error("Failed to fetch sessions");

      const data = await response.json();
      setUpcomingSessions(data.sessions || []);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScheduleSession = () => {
    // Check if user has notification permissions
    const { needsPermission } = checkPermissions();

    if (needsPermission) {
      // Show permission modal first
      setShowPermissionModal(true);
    } else {
      // User has permissions, proceed with scheduling
      setSessionToEdit(null);
      setShowScheduler(true);
    }
  };

  const handleEditSession = (session: Session) => {
    setSessionToEdit(session);
    setShowScheduler(true);
  };

  const handleCancelSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to cancel this session?")) return;

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to cancel session");

      // Refresh sessions
      fetchSessions();
    } catch (error) {
      console.error("Error cancelling session:", error);
    }
  };

  const handleSchedulerClose = () => {
    setShowScheduler(false);
    setSessionToEdit(null);
    fetchSessions(); // Refresh sessions after scheduling
  };

  if (
    authStatus === "loading" ||
    profileLoading ||
    isLoadingRescheduleSession
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="text-white text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>
            {isLoadingRescheduleSession
              ? "Loading session for rescheduling..."
              : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <TherapeuticBokehBackground />

      <div className="min-h-screen bg-transparent relative z-10 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">
                Schedule Sessions
              </h1>
              <p className="text-gray-300">
                Book and manage your therapy sessions
              </p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleScheduleSession}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl p-6 flex items-center justify-center gap-3 shadow-lg cursor-pointer"
              >
                <Calendar className="w-6 h-6" />
                <span className="font-semibold">Schedule New Session</span>
              </motion.button>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-white"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-6 h-6 text-blue-400" />
                  <h3 className="font-semibold">Next Session</h3>
                </div>
                {upcomingSessions.length > 0 ? (
                  <p className="text-sm text-gray-300">
                    {formatInUserTimezone(
                      upcomingSessions[0].startTime,
                      "MMM d, yyyy h:mm a",
                      getUserTimezone(profile?.timezone)
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400">No upcoming sessions</p>
                )}
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-white"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-6 h-6 text-purple-400" />
                  <h3 className="font-semibold">Therapy Type</h3>
                </div>
                <p className="text-sm text-gray-300 capitalize">Not set</p>
              </motion.div>
            </div>

            {/* Upcoming Sessions */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">
                Upcoming Sessions
              </h2>

              {isLoading ? (
                <div className="text-center py-8">
                  <Loader className="w-8 h-8 animate-spin mx-auto text-white" />
                </div>
              ) : upcomingSessions.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-400">
                    No upcoming sessions scheduled
                  </p>
                  <button
                    onClick={handleScheduleSession}
                    className="mt-4 text-blue-400 hover:text-blue-300"
                  >
                    Schedule your first session
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingSessions.map((session) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white/5 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-white font-medium">
                            {session.therapyType} Therapy Session
                          </h3>
                          <p className="text-sm text-gray-300 mt-1">
                            {formatInUserTimezone(
                              session.startTime,
                              "MMM d, yyyy h:mm a",
                              getUserTimezone(profile?.timezone)
                            )}
                          </p>
                          <p className="text-sm text-gray-400 mt-1">
                            Duration: {session.duration} minutes
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditSession(session)}
                            className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-sm transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleCancelSession(session.id)}
                            className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Enhanced Scheduler Modal */}
      <AnimatePresence>
        {showScheduler && (
          <EnhancedSchedulerModal
            isOpen={showScheduler}
            onClose={handleSchedulerClose}
            sessionToEdit={sessionToEdit}
            userPreferences={userPreferences}
            onSchedule={async (sessionData) => {
              try {
                const response = await fetch("/api/sessions/schedule", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    date: sessionData.date || new Date().toISOString(),
                    duration: sessionData.duration || 30,
                    therapyType: profile?.sessionPreference === 'couple' ? 'COUPLE' : profile?.sessionPreference === 'family' ? 'FAMILY' : 'SOLO',
                    notes: sessionData.notes || "",
                  }),
                });

                if (!response.ok) {
                  const error = await response.json();
                  if (error.needsPermission) {
                    setShowScheduler(false);
                    setShowPermissionModal(true);
                    return;
                  }
                  throw new Error(
                    error.message || "Failed to schedule session"
                  );
                }

                handleSchedulerClose();
                fetchSessions();
              } catch (error) {
                console.error("Error scheduling session:", error);
                alert("Failed to schedule session. Please try again.");
              }
            }}
          />
        )}

        {showPermissionModal && (
          <NotificationPermissionModal
            isOpen={showPermissionModal}
            onClose={() => setShowPermissionModal(false)}
            currentPermissions={{
              email: hasEmailPermission,
              sms: hasSmsPermission,
              phone: profile?.phone,
            }}
            onPermissionsUpdate={(permissions) => {
              setShowPermissionModal(false);
              // After updating permissions, proceed with scheduling
              if (permissions.email || permissions.sms) {
                setSessionToEdit(null);
                setShowScheduler(true);
              }
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
