'use client';

import { usePathname } from 'next/navigation';
import { RadialGradientBackground } from '@/components/ui/radial-gradient-background';
import { useEffect, useState } from 'react';

export default function RadialGradientManager() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  
  // Make sure we're running on client-side only
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // If not mounted yet, don't render anything
  if (!mounted) return null;
  
  // Debug log
  console.log('RadialGradient - Current pathname:', pathname);
  
  // Disable radial gradient effect for login, register, welcome, intro, and support pages
  const disableEffect = 
    pathname?.startsWith('/auth') || 
    pathname?.includes('support') ||
    pathname === '/welcome' ||
    pathname === '/intro';
  
  console.log('RadialGradient disabled?', disableEffect);
  
  if (disableEffect) {
    // Return a static background instead
    return (
      <div 
        className="fixed top-0 left-0 w-full h-full -z-50"
        style={{
          backgroundColor: "#DCD9D4",
          backgroundImage: `
            linear-gradient(to bottom, rgba(255,255,255,0.50) 0%, rgba(0,0,0,0.50) 100%), 
            repeating-radial-gradient(
              circle at center, 
              rgba(255,255,255,0.25) 85px,
              rgba(255,255,255,0.20) 0px,
              rgba(0,0,0,0.30) 0px,
              rgba(0,0,0,0.27) 90px
            )
          `,
          backgroundBlendMode: "soft-light, screen, multiply",
          boxShadow: "inset 0 0 100px rgba(0,0,0,0.3)",
          pointerEvents: "none",
        }}
      />
    );
  }
  
  return <RadialGradientBackground />;
}