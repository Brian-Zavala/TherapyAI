"use client";

import { ReactNode } from "react";
import { SoundProvider } from "@/components/providers/SoundProvider";
import MusicPlayer from "@/components/shared/MusicPlayer";
import SpotlightManager from "@/components/layout/SpotlightManager";
import AuthProvider from "@/components/providers/AuthProvider";
import Navigation from "@/components/layout/Navigation";
import { ReactQueryProvider } from "@/providers/ReactQueryProvider";
import { ProfileProvider } from "@/providers/ProfileProvider";
import { NotificationProvider } from "@/providers/NotificationProvider";
import { WebVitalsReporter } from "@/components/performance/WebVitalsReporter";

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <>
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
    </>
  );
}