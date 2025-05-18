"use client";

import { ReactNode } from "react";
import { SoundProvider } from "@/components/SoundProvider";
import MusicPlayer from "@/components/MusicPlayer";
import SpotlightManager from "@/components/SpotlightManager";
import RadialGradientManager from "@/components/RadialGradientManager";
import AuthProvider from "@/components/AuthProvider";
import Navigation from "@/components/Navigation";

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <>
      <RadialGradientManager />
      <SpotlightManager />
      <AuthProvider>
        <SoundProvider>
          <Navigation />
          {children}
          <MusicPlayer />
        </SoundProvider>
      </AuthProvider>
    </>
  );
}