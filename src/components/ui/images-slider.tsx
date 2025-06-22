"use client";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";

// Define image config type
export interface ImageConfig {
  src: string;
  width?: number | string;
  height?: number | string;
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  objectPosition?: string;
  priority?: boolean;
  quality?: number;
  sizes?: string;
}

export const ImagesSlider = ({
  images,
  children,
  overlay = true,
  overlayClassName,
  className,
  autoplay = true,
  direction = "up",
}: {
  images: (string | ImageConfig)[];
  children: React.ReactNode;
  overlay?: React.ReactNode;
  overlayClassName?: string;
  className?: string;
  autoplay?: boolean;
  direction?: "up" | "down";
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false); // Start with loading=false
  
  // Always initialize with the first image already loaded
  const firstImageSrc = images.length > 0 
    ? (typeof images[0] === 'string' ? images[0] : images[0].src)
    : '';
  const [loadedImages, setLoadedImages] = useState<string[]>(firstImageSrc ? [firstImageSrc] : []);
  
  // Keep initial load true to prevent animation on first image
  const [initialLoad, setInitialLoad] = useState(true);
  // Don't start slider immediately
  const [startSlider, setStartSlider] = useState(false);
  const [fullyLoaded, setFullyLoaded] = useState(false);
  const [displayFirstImageTimer, setDisplayFirstImageTimer] = useState<NodeJS.Timeout | null>(null);

  const handleNext = useCallback(() => {
    setCurrentIndex((prevIndex) =>
      prevIndex + 1 === images.length ? 0 : prevIndex + 1
    );
  }, [images.length]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((prevIndex) =>
      prevIndex - 1 < 0 ? images.length - 1 : prevIndex - 1
    );
  }, [images.length]);

  // Background preloading - doesn't block UI
  useEffect(() => {
    if (typeof window === 'undefined' || !images.length) return;
    
    // Skip the first image since we've loaded it already
    const imagesToLoad = images.slice(1).map(image => 
      typeof image === 'string' ? image : image.src
    );
    
    // Background preloading without blocking UI
    const preloadImagesInBackground = () => {
      let loadedCount = 1; // Start at 1 since first image is already "loaded"
      const allSources = [firstImageSrc, ...imagesToLoad];
      
      // Load each image in the background
      imagesToLoad.forEach(src => {
        const img = new window.Image();
        img.fetchPriority = "high";
        img.loading = "eager";
        
        img.onload = () => {
          loadedCount++;
          
          // When a new image is loaded, update our array of loaded images
          if (loadedCount > loadedImages.length) {
            setLoadedImages(allSources.slice(0, loadedCount));
          }
          
          // When all images are loaded, mark as fully loaded
          if (loadedCount >= images.length) {
            setFullyLoaded(true);
          }
        };
        
        img.onerror = () => {
          console.warn(`Could not load image: ${src}`);
          // Continue anyway
          loadedCount++;
        };
        
        // Start loading
        img.src = src;
      });
    };
    
    // Start background loading
    preloadImagesInBackground();
  }, [images, firstImageSrc, loadedImages.length]);

  // Display first image statically, then start autoplay after delay
  useEffect(() => {
    if (!images.length) return;
    
    // When component mounts, immediately show first image without animation
    // and after a delay, enable animations and start autoplay
    const timer = setTimeout(() => {
      console.log('Starting slider animations after static display');
      setInitialLoad(false); // Enable animations
      setStartSlider(true); // Enable autoplay
    }, 3000); // 3 second delay before starting animations (reduced from 7)
    
    setDisplayFirstImageTimer(timer);
    
    return () => {
      if (displayFirstImageTimer) {
        clearTimeout(displayFirstImageTimer);
      }
    };
  }, [images.length]);
  
  // Log when animation states change
  useEffect(() => {
    console.log(`Slider state: initialLoad=${initialLoad}, startSlider=${startSlider}`);
  }, [initialLoad, startSlider]);

  const loadImages = async () => {
    setLoading(true);

    // Create an array to track which images are already cached
    const cachedImages: string[] = [];
    const imagesToLoad: string[] = [];

    // Check if images are already in browser cache
    images.forEach((image) => {
      const imageSrc = typeof image === "string" ? image : image.src;
      const tempImg = new window.Image();
      // If the image is already in cache, this will trigger immediately
      tempImg.src = imageSrc;
      if (tempImg.complete) {
        cachedImages.push(imageSrc);
      } else {
        imagesToLoad.push(imageSrc);
      }
    });

    // Log image loading status for debugging
    console.log(`Images slider: ${cachedImages.length} cached, ${imagesToLoad.length} to load`);

    // If all images are already cached, use them immediately
    if (cachedImages.length === images.length) {
      setLoadedImages(cachedImages as string[]);
      setLoading(false);
      console.log("All images were already cached");
      return;
    }

    // Otherwise load them with promises
    const loadPromises = imagesToLoad.map((imageSrc) => {
      return new Promise((resolve, reject) => {
        // Use the global HTMLImageElement constructor
        const img = new window.Image();

        // Set highest priority for loading
        img.loading = "eager";
        img.fetchPriority = "high";
        img.decoding = "sync";

        img.onload = () => {
          console.log(`Loaded image: ${imageSrc}`);
          resolve(imageSrc);
        };
        img.onerror = (err) => {
          console.error(`Failed to load image: ${imageSrc}`, err);
          // Resolve anyway to prevent the whole Promise.all from failing
          resolve(imageSrc);
        };
        
        // Set the src last
        img.src = imageSrc;
        
        // If the image loads immediately
        if (img.complete) {
          console.log(`Image already loaded: ${imageSrc}`);
          resolve(imageSrc);
        }
      });
    });

    // Combine cached and newly loaded images
    try {
      const newlyLoadedImages = await Promise.all(loadPromises);
      const allLoadedImages = [...cachedImages, ...(newlyLoadedImages as string[])];
      console.log(`Total images loaded: ${allLoadedImages.length}`);
      setLoadedImages(allLoadedImages as string[]);
      setLoading(false);
    } catch (error) {
      console.error("Error loading images:", error);
      // If there was an error, still use whatever images we have
      if (cachedImages.length > 0) {
        setLoadedImages(cachedImages as string[]);
        setLoading(false);
      }
    }
  };
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        handleNext();
      } else if (event.key === "ArrowLeft") {
        handlePrevious();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // Autoplay with smooth timing
    let interval: any;
    if (autoplay && startSlider) {
      // Only start autoplay when slider is ready to animate
      console.log('Setting up autoplay timer');
      interval = setInterval(() => {
        handleNext();
      }, 4000); // Reduced from 6000ms to 4000ms for faster progression
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearInterval(interval);
    };
  }, [handleNext, handlePrevious, autoplay, startSlider]);

  const slideVariants = {
    initial: {
      scale: 0,
      opacity: 0,
      rotateX: 45,
    },
    visible: {
      scale: 1,
      rotateX: 0,
      opacity: 1,
      transition: {
        duration: 0.3, // Reduced from 0.5 for faster enter animation
        ease: [0.645, 0.045, 0.355, 1.0],
      },
    },
    upExit: {
      opacity: 1,
      y: "-150%",
      transition: {
        duration: 0.6, // Reduced from 1 for faster exit animation
      },
    },
    downExit: {
      opacity: 1,
      y: "150%",
      transition: {
        duration: 0.6, // Reduced from 1 for faster exit animation
      },
    },
  };

  const areImagesLoaded = loadedImages.length > 0;

  // Skip loading screen and show images immediately
  const renderContent = () => {
    // If no images are loaded yet, assume the first image is ready and show it immediately
    if (!areImagesLoaded) {
      // Immediately use the first image as a fallback
      if (images.length > 0) {
        const fallbackImage = images[0];
        const fallbackSrc = typeof fallbackImage === 'string' ? fallbackImage : fallbackImage.src;
        
        // Add it to loadedImages if not already loading
        if (!loading) {
          setLoadedImages([fallbackSrc]);
        }
      }
    }

    // Images are loaded - show the slider
    return (
      <>
        {/* Show children when loaded */}
        {children}

        {/* Show overlay when loaded */}
        {overlay && (
          <div
            className={cn(
              "absolute inset-0 bg-black/30 z-40",
              overlayClassName
            )}
          />
        )}

        {/* Slides container */}
        <AnimatePresence>
          <motion.div
            key={currentIndex}
            // First image should have no animation at all
            initial={initialLoad ? false : "initial"}
            // Only animate after initialLoad is cleared
            animate={initialLoad ? undefined : "visible"}
            exit={
              !initialLoad && direction === "up"
                ? "upExit"
                : !initialLoad
                  ? "downExit"
                  : undefined
            }
            variants={slideVariants}
            className="absolute inset-0 w-full h-full min-h-[100vh]"
          >
            {(() => {
              // Safety check to ensure we don't exceed array bounds
              const safeIndex = currentIndex % loadedImages.length;
              const currentImage = images[safeIndex];
              
              // Use the corresponding loaded image source with enhanced quality
              const imageConfig =
                typeof currentImage === "string"
                  ? { 
                      src: loadedImages[safeIndex],
                      width: 1920,
                      height: 1080,
                      sizes: "(max-width: 768px) 100vw, 100vw",
                      objectFit: "cover" as const,
                      objectPosition: "center center",
                      quality: 100, // Maximum quality for production
                    }
                  : { 
                      ...currentImage, 
                      src: loadedImages[safeIndex],
                      quality: 100, // Maximum quality for production
                    };

              return (
                <Image
                  src={imageConfig.src}
                  width={
                    typeof imageConfig.width === "string"
                      ? 1920
                      : imageConfig.width || 1920
                  }
                  height={
                    typeof imageConfig.height === "string"
                      ? 1080
                      : imageConfig.height || 1080
                  }
                  quality={imageConfig.quality || 85}
                  priority={true} // Always set to priority
                  fetchPriority="high" // Always high priority
                  sizes={imageConfig.sizes || "(max-width: 768px) 100vw, 100vw"}
                  className={cn(
                    "image w-full h-full",
                    imageConfig.objectFit === "contain"
                      ? "object-contain"
                      : "object-cover",
                    "object-center"
                  )}
                  style={{
                    width: "100%", // Always use full width
                    height: "100%", // Always use full height
                    objectFit: (imageConfig.objectFit || "cover") as any,
                    objectPosition: imageConfig.objectPosition || "center",
                    minHeight: "100vh", // Ensure it covers full viewport height
                    transition: "none", // Disable CSS transitions that might conflict
                    willChange: "transform", // Optimize for animations
                  }}
                  alt="Slider image"
                  placeholder="blur"
                  blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMjAyMDIwIi8+PC9zdmc+"
                />
              );
            })()}
          </motion.div>
        </AnimatePresence>
      </>
    );
  };

  return (
    <div
      className={cn(
        "overflow-hidden h-full w-full relative",
        className
      )}
      style={{
        perspective: "1000px",
        minHeight: "100vh", // Ensure full viewport height
        height: "100%", // Fill parent height completely
      }}
    >
      {renderContent()}
    </div>
  );
};
