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
  
  // Debug log
  console.log('Current pathname:', pathname);
  
  // Disable spotlight effect for login, register, and support pages
  const disableSpotlight = 
    pathname?.startsWith('/auth') || 
    pathname?.includes('support');
  
  console.log('Spotlight disabled?', disableSpotlight);
  
  if (disableSpotlight) {
    return null;
  }
  
  return <Spotlight />;
}