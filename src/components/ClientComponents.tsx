"use client";

import { ReactNode } from "react";
import dynamic from "next/dynamic";
import { SoundProvider } from "@/components/SoundProvider";
const MusicPlayer = dynamic(() => import("@/components/MusicPlayer"), { ssr: false });
import SpotlightManager from "@/components/SpotlightManager";
import AuthProvider from "@/components/AuthProvider";
import Navigation from "@/components/Navigation";
import { ReactQueryProvider } from "@/providers/ReactQueryProvider";
import { ProfileProvider } from "@/providers/ProfileProvider";
import { NotificationProvider } from "@/providers/NotificationProvider";
import { WebVitalsReporter } from "@/components/performance/WebVitalsReporter";
import { AnalyticsProvider } from "@/lib/analytics/posthog";
import { Toaster } from "sonner";

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <AnalyticsProvider>
      <SpotlightManager />
      <AuthProvider>
        <ReactQueryProvider>
          <ProfileProvider>
            <NotificationProvider>
              <SoundProvider>
                <Navigation />
                {children}
                <MusicPlayer />
                <WebVitalsReporter />
              </SoundProvider>
            </NotificationProvider>
          </ProfileProvider>
        </ReactQueryProvider>
      </AuthProvider>
      {/* Toast surface — z-[10002] above phone overlay (10000) and error modal (10001) */}
      <Toaster
        position="top-center"
        richColors
        closeButton
        theme="dark"
        toastOptions={{ style: { zIndex: 10002 } }}
      />
    </AnalyticsProvider>
  );
}