"use client";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import React, { useEffect, useState, useCallback } from "react";

// Define image config type
export interface ImageConfig {
  src: string;
  width?: string;
  height?: string;
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
  objectPosition?: string;
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

  useEffect(() => {
    loadImages();
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
    const loadPromises = images.map((image) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const imageSrc = typeof image === 'string' ? image : image.src;
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
      {areImagesLoaded && children}
      {areImagesLoaded && overlay && (
        <div
          className={cn("absolute inset-0 bg-black/60 z-40", overlayClassName)}
        />
      )}

      {areImagesLoaded && (
        <AnimatePresence>
          <motion.div
            key={currentIndex}
            initial={initialLoad ? false : "initial"}
            animate="visible"
            exit={!initialLoad && direction === "up" ? "upExit" : (!initialLoad ? "downExit" : false)}
            variants={slideVariants}
            className="absolute inset-0 flex items-center justify-center"
          >
            {(() => {
              const currentImage = images[currentIndex];
              const imageConfig = typeof currentImage === 'string' 
                ? { src: loadedImages[currentIndex] } 
                : { ...currentImage, src: loadedImages[currentIndex] };
              
              return (
                <img
                  src={imageConfig.src}
                  className={cn(
                    "image",
                    imageConfig.objectFit === 'contain' ? 'object-contain' : 'object-cover',
                    "object-center"
                  )}
                  style={{
                    width: imageConfig.width || '100%',
                    height: imageConfig.height || '100%',
                    objectFit: imageConfig.objectFit || 'cover',
                    objectPosition: imageConfig.objectPosition || 'center',
                  }}
                  alt=""
                />
              );
            })()}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};