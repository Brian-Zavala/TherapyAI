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
      // Preload the first image immediately with highest priority
      if (imagePaths.length > 0) {
        const firstImg = new window.Image();
        firstImg.onerror = () => {
          console.warn(`Failed to preload first image: ${imagePaths[0]}`);
        };
        firstImg.onload = () => {
          console.log(`Successfully preloaded first image: ${imagePaths[0]}`);
        };
        
        // Use highest possible priority for first image
        firstImg.fetchPriority = 'high';
        firstImg.loading = 'eager';
        firstImg.src = imagePaths[0];
        
        // Force image to be fully loaded by adding to DOM temporarily
        firstImg.style.position = 'absolute';
        firstImg.style.opacity = '0';
        firstImg.style.width = '1px';
        firstImg.style.height = '1px';
        document.body.appendChild(firstImg);
        
        // Remove after a short delay
        setTimeout(() => {
          if (firstImg.parentNode === document.body) {
            document.body.removeChild(firstImg);
          }
        }, 1000);
      }
      
      // Then preload the rest of the images
      if (imagePaths.length > 1) {
        // Create new image objects to preload images into browser cache
        imagePaths.slice(1).forEach(path => {
          const img = new window.Image();
          // Handle errors
          img.onerror = () => {
            console.warn(`Failed to preload image: ${path}`);
          };
          img.onload = () => {
            // Successfully loaded
            console.log(`Successfully preloaded: ${path}`);
          };
          
          // Set loading priority
          img.fetchPriority = 'high';
          img.loading = 'eager';
          
          // Set src last to start loading
          img.src = path;
        });
      }
    }
  }, [imagePaths]);

  // Render hidden Next.js Image components for even better preloading
  return (
    <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0 }}>
      {/* First image gets special treatment with larger size for better preloading */}
      {imagePaths.length > 0 && (
        <Image
          key="first-image"
          src={imagePaths[0]}
          width={100}
          height={100}
          alt="preload-first"
          priority={true}
          fetchPriority="high"
          sizes="100vw"
          quality={100}
        />
      )}
      
      {/* Remaining images */}
      {imagePaths.slice(1).map((path, index) => (
        <Image
          key={`next-image-${index}`}
          src={path}
          width={1}
          height={1}
          alt="preload"
          priority={index < 3} // Only the first few images get priority
          fetchPriority={index < 3 ? "high" : "auto"}
        />
      ))}
    </div>
  );
}