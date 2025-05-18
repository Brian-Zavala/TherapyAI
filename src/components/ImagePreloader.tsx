'use client';

import { useEffect } from 'react';
import Image from 'next/image';

interface ImagePreloaderProps {
  imagePaths: string[];
}

/**
 * A component that preloads images in the background
 * Use this component near the top of your page to start loading images early
 */
export default function ImagePreloader({ imagePaths }: ImagePreloaderProps) {
  // Start preloading images as soon as the component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Create new image objects to preload images into browser cache
      imagePaths.forEach(path => {
        const img = new window.Image();
        img.src = path;
        // Set loading priority
        img.fetchPriority = 'high';
        img.loading = 'eager';
      });
    }
  }, [imagePaths]);

  // Render hidden Next.js Image components for even better preloading
  return (
    <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0 }}>
      {imagePaths.map((path, index) => (
        <Image
          key={index}
          src={path}
          width={1}
          height={1}
          alt="preload"
          priority={true}
          fetchPriority="high"
        />
      ))}
    </div>
  );
}