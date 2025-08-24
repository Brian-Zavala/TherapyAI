'use client';

import { usePathname } from 'next/navigation';
import { Spotlight } from '@/components/ui/spotlight-new';
import { useEffect, useState } from 'react';

export default function SpotlightManager() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  
  // Make sure we're running on client-side only
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // If not mounted yet, don't render anything
  if (!mounted) return null;
  
  // Only show spotlight on login, register, and onboarding pages
  // Explicitly disable on intro page to avoid performance issues
  const enableSpotlight = 
    (pathname?.startsWith('/auth/login') || 
     pathname?.startsWith('/auth/register') || 
     pathname?.startsWith('/welcome')) &&
    pathname !== '/intro';
  
  if (!enableSpotlight) {
    return null;
  }
  
  return <Spotlight />;
}