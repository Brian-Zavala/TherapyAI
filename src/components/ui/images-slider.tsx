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
  const [loading, setLoading] = useState(false);
  const [loadedImages, setLoadedImages] = useState<string[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const [startSlider, setStartSlider] = useState(false);

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

  // Prefetch images as early as possible with a higher priority
  useEffect(() => {
    // Start loading immediately
    loadImages();
    
    // Use Next.js Image prefetching for better performance
    if (typeof window !== 'undefined') {
      images.forEach(image => {
        const src = typeof image === 'string' ? image : image.src;
        const img = new window.Image();
        img.src = src;
        // Set to highest priority
        img.fetchPriority = 'high';
      });
    }
  }, []);
  
  // Start slider animation after a delay to allow first image to display without animation
  useEffect(() => {
    if (areImagesLoaded && initialLoad) {
      const timer = setTimeout(() => {
        setInitialLoad(false);
        setStartSlider(true);
      }, 1000); // Wait 1 second before enabling slide animations
      
      return () => clearTimeout(timer);
    }
  }, [loadedImages]);

  const loadImages = () => {
    setLoading(true);
    
    // Create an array to track which images are already cached
    const cachedImages = [];
    
    // Check if images are already in browser cache
    images.forEach((image) => {
      const imageSrc = typeof image === 'string' ? image : image.src;
      const tempImg = new window.Image();
      // If the image is already in cache, this will trigger immediately
      tempImg.src = imageSrc;
      if (tempImg.complete) {
        cachedImages.push(imageSrc);
      }
    });
    
    // If all images are already cached, use them immediately
    if (cachedImages.length === images.length) {
      setLoadedImages(cachedImages);
      setLoading(false);
      return;
    }
    
    // Otherwise load them with promises
    const loadPromises = images.map((image) => {
      return new Promise((resolve, reject) => {
        // Use the global HTMLImageElement constructor instead of the imported Next Image component
        const img = new window.Image();
        const imageSrc = typeof image === 'string' ? image : image.src;
        
        // Set highest priority for loading
        img.loading = 'eager';
        img.fetchPriority = 'high';
        
        img.src = imageSrc;
        img.onload = () => resolve(imageSrc);
        img.onerror = reject;
      });
    });

    Promise.all(loadPromises)
      .then((loadedImages) => {
        setLoadedImages(loadedImages as string[]);
        setLoading(false);
      })
      .catch((error) => console.error("Failed to load images", error));
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

    // autoplay - only start after initial load animation
    let interval: any;
    if (autoplay && startSlider) {
      interval = setInterval(() => {
        handleNext();
      }, 5000);
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
        duration: 0.5,
        ease: [0.645, 0.045, 0.355, 1.0],
      },
    },
    upExit: {
      opacity: 1,
      y: "-150%",
      transition: {
        duration: 1,
      },
    },
    downExit: {
      opacity: 1,
      y: "150%",
      transition: {
        duration: 1,
      },
    },
  };

  const areImagesLoaded = loadedImages.length > 0;

  // Handle rendering of slides - returning early with a placeholder during loading
  const renderContent = () => {
    // Loading state - show a low-quality placeholder until images are ready
    if (!areImagesLoaded) {
      return (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          {/* This is a hidden preloader that forces browsers to load the first image */}
          {typeof images[0] === 'string' ? (
            <Image 
              src={typeof images[0] === 'string' ? images[0] : images[0].src}
              width={1920}
              height={1080}
              quality={1} // Low quality for fast loading
              priority={true}
              fetchPriority="high"
              style={{ opacity: 0, position: 'absolute' }}
              alt="Preload"
            />
          ) : null}
          
          <div className="w-12 h-12 rounded-full" />
        </div>
      );
    }
    
    // Images are loaded - show the slider
    return (
      <>
        {/* Show children when loaded */}
        {children}
        
        {/* Show overlay when loaded */}
        {overlay && (
          <div className={cn("absolute inset-0 bg-black/60 z-40", overlayClassName)} />
        )}
        
        {/* Slides container */}
        <AnimatePresence>
          <motion.div
            key={currentIndex}
            initial={initialLoad ? false : "initial"}
            animate="visible"
            exit={!initialLoad && direction === "up" ? "upExit" : (!initialLoad ? "downExit" : false)}
            variants={slideVariants}
            className="absolute inset-0 flex items-center justify-center w-full h-full"
          >
            {(() => {
              const currentImage = images[currentIndex];
              const imageConfig = typeof currentImage === 'string' 
                ? { src: loadedImages[currentIndex] } 
                : { ...currentImage, src: loadedImages[currentIndex] };
              
              return (
                <Image
                  src={imageConfig.src}
                  width={typeof imageConfig.width === 'string' ? 1920 : (imageConfig.width || 1920)}
                  height={typeof imageConfig.height === 'string' ? 1080 : (imageConfig.height || 1080)}
                  quality={imageConfig.quality || 85}
                  priority={true} // Always set to priority
                  fetchPriority="high" // Always high priority
                  sizes={imageConfig.sizes || "(max-width: 768px) 100vw, 100vw"}
                  className={cn(
                    "image w-full h-full",
                    imageConfig.objectFit === 'contain' ? 'object-contain' : 'object-cover',
                    "object-center"
                  )}
                  style={{
                    width: typeof imageConfig.width === 'string' ? imageConfig.width : '100%',
                    height: typeof imageConfig.height === 'string' ? imageConfig.height : '100%',
                    objectFit: imageConfig.objectFit || 'cover',
                    objectPosition: imageConfig.objectPosition || 'center',
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
        "overflow-hidden h-full w-full relative flex items-center justify-center",
        className
      )}
      style={{
        perspective: "1000px",
      }}
    >
      {renderContent()}
    </div>
  );
};