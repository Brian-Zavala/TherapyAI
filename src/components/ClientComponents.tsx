"use client";

import { ReactNode } from "react";
import { SoundProvider } from "@/components/SoundProvider";
import MusicPlayer from "@/components/MusicPlayer";
import SpotlightManager from "@/components/SpotlightManager";
import AuthProvider from "@/components/AuthProvider";
import Navigation from "@/components/Navigation";
import { ReactQueryProvider } from "@/providers/ReactQueryProvider";
import { ProfileProvider } from "@/providers/ProfileProvider";
import { WebVitalsReporter } from "@/components/performance/WebVitalsReporter";

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <>
      <SpotlightManager />
      <AuthProvider>
        <ReactQueryProvider>
          <ProfileProvider>
            <SoundProvider>
              <Navigation />
              {children}
              <MusicPlayer />
              <WebVitalsReporter />
            </SoundProvider>
          </ProfileProvider>
        </ReactQueryProvider>
      </AuthProvider>
    </>
  );
}