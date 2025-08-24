'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';

interface ImagePreloaderProps {
  imagePaths: string[];
  priority?: boolean; // 2025 Standard: Allow controlling priority for LCP optimization
}

// Keep track of already preloaded images to avoid duplicate loading
const preloadedImages = new Set<string>();

/**
 * A component that preloads images in the background
 * Use this component near the top of your page to start loading images early
 */
export default function ImagePreloader({ imagePaths, priority = false }: ImagePreloaderProps) {
  const preloadTimeoutRef = useRef<number | undefined>(undefined);
  
  // Start preloading images as soon as the component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 2025 Standard: For non-priority images, delay loading to improve LCP
      const startDelay = priority ? 0 : 2000; // 2s delay for non-priority images
      
      const startPreloading = () => {
        // Batch preloading to reduce long tasks
        const preloadBatch = (paths: string[], startIndex: number) => {
          const batchSize = priority ? 4 : 2; // More aggressive batching for priority images
          const endIndex = Math.min(startIndex + batchSize, paths.length);
          
          for (let i = startIndex; i < endIndex; i++) {
            const path = paths[i];
            
            // Skip if already preloaded
            if (preloadedImages.has(path)) {
              continue;
            }
            
            preloadedImages.add(path);
            const img = new window.Image();
            
            img.onerror = () => {
              console.warn(`Failed to preload image: ${path}`);
              preloadedImages.delete(path); // Remove from set if failed
            };
            
            img.onload = () => {
              if (priority) {
                console.log(`Successfully preloaded priority image: ${path}`);
              }
            };
            
            // 2025 Standard: Set fetch priority based on component priority prop
            img.fetchPriority = priority && i < 2 ? 'high' : 'auto';
            img.loading = priority ? 'eager' : 'lazy';
            img.src = path;
          }
          
          // Schedule next batch
          if (endIndex < paths.length) {
            preloadTimeoutRef.current = window.setTimeout(() => {
              preloadBatch(paths, endIndex);
            }, priority ? 30 : 100); // Faster batching for priority images
          }
        };
      
        // Filter out already preloaded images
        const imagesToPreload = imagePaths.filter(path => !preloadedImages.has(path));
        
        if (imagesToPreload.length > 0) {
          // Special handling for first image - highest priority (only for priority preloaders)
          if (priority && imagesToPreload[0] && !preloadedImages.has(imagesToPreload[0])) {
            const firstPath = imagesToPreload[0];
            preloadedImages.add(firstPath);
            
            const firstImg = new window.Image();
            firstImg.onerror = () => {
              console.warn(`Failed to preload first priority image: ${firstPath}`);
              preloadedImages.delete(firstPath);
            };
            firstImg.onload = () => {
              console.log(`Successfully preloaded first priority image: ${firstPath}`);
            };
            
            firstImg.fetchPriority = 'high';
            firstImg.loading = 'eager';
            firstImg.src = firstPath;
            
            // Force into DOM for immediate loading (only for priority images)
            firstImg.style.position = 'absolute';
            firstImg.style.opacity = '0';
            firstImg.style.width = '1px';
            firstImg.style.height = '1px';
            document.body.appendChild(firstImg);
            
            setTimeout(() => {
              if (firstImg.parentNode === document.body) {
                document.body.removeChild(firstImg);
              }
            }, 1000);
            
            // Start batch preloading for remaining images
            if (imagesToPreload.length > 1) {
              preloadTimeoutRef.current = window.setTimeout(() => {
                preloadBatch(imagesToPreload, 1);
              }, 50); // Very small delay after first priority image
            }
          } else {
            // For non-priority images or when no special first image handling needed
            preloadBatch(imagesToPreload, 0);
          }
        }
      };
      
      // Start preloading with appropriate delay
      preloadTimeoutRef.current = window.setTimeout(startPreloading, startDelay);
    }
    
    // Cleanup
    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, []); // Remove imagePaths dependency to prevent re-running

  // Only render hidden images for paths we haven't seen before
  const newPaths = imagePaths.filter(path => !preloadedImages.has(path));
  
  // Don't render anything if all images are already preloaded
  if (newPaths.length === 0) {
    return null;
  }
  
  // 2025 Standard: Render hidden Next.js Image components for better preloading
  return (
    <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0 }}>
      {/* Only render first few images to avoid blocking */}
      {newPaths.slice(0, priority ? 4 : 2).map((path, index) => (
        <Image
          key={`preload-${path}`}
          src={path}
          width={priority && index === 0 ? 100 : 1}
          height={priority && index === 0 ? 100 : 1}
          alt="preload"
          priority={priority && index < 2}
          fetchPriority={priority && index === 0 ? "high" : "auto"}
          sizes={priority && index === 0 ? "100vw" : undefined}
          quality={priority ? 100 : 75}
          loading={priority ? "eager" : "lazy"}
        />
      ))}
    </div>
  );
}