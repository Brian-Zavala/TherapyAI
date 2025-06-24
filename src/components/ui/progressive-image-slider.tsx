"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import { useInView } from 'framer-motion'

interface ProgressiveImageConfig {
  src: string
  width: number
  height: number
  alt: string
  priority?: boolean
}

interface ProgressiveImageSliderProps {
  images: ProgressiveImageConfig[]
  autoSlide?: boolean
  slideDuration?: number
  initialBatchSize?: number
  loadBatchSize?: number
  className?: string
}

export function ProgressiveImageSlider({
  images,
  autoSlide = true,
  slideDuration = 4000,
  initialBatchSize = 2,
  loadBatchSize = 3,
  className = ""
}: ProgressiveImageSliderProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [loadedImageCount, setLoadedImageCount] = useState(initialBatchSize)
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set())
  const prefersReducedMotion = useReducedMotion()
  
  // Progressive loading strategy
  const visibleImages = useMemo(() => 
    images.slice(0, Math.min(loadedImageCount, images.length)),
    [images, loadedImageCount]
  )
  
  // Load images progressively as user stays on page
  useEffect(() => {
    if (loadedImageCount >= images.length) return
    
    const timer = setTimeout(() => {
      setLoadedImageCount(prev => 
        Math.min(prev + loadBatchSize, images.length)
      )
    }, 2000) // Load more after 2 seconds
    
    return () => clearTimeout(timer)
  }, [loadedImageCount, images.length, loadBatchSize])
  
  // Auto-slide functionality
  useEffect(() => {
    if (!autoSlide || prefersReducedMotion) return
    
    const timer = setInterval(() => {
      setCurrentImageIndex(prev => 
        (prev + 1) % Math.min(loadedImageCount, images.length)
      )
    }, slideDuration)
    
    return () => clearInterval(timer)
  }, [autoSlide, slideDuration, loadedImageCount, images.length, prefersReducedMotion])
  
  // Handle image load success
  const handleImageLoad = useCallback((index: number) => {
    setLoadedImages(prev => new Set([...prev, index]))
  }, [])
  
  // Preload next batch on user interaction
  const handleUserInteraction = useCallback(() => {
    if (loadedImageCount < images.length) {
      setLoadedImageCount(prev => 
        Math.min(prev + loadBatchSize, images.length)
      )
    }
  }, [loadedImageCount, images.length, loadBatchSize])
  
  return (
    <div 
      className={`relative w-full h-full overflow-hidden ${className}`}
      onMouseEnter={handleUserInteraction}
      onTouchStart={handleUserInteraction}
    >
      <AnimatePresence mode="wait">
        {visibleImages.map((image, index) => (
          index === currentImageIndex && (
            <motion.div
              key={`${image.src}-${index}`}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ 
                duration: prefersReducedMotion ? 0 : 0.8,
                ease: "easeInOut"
              }}
            >
              <Image
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                priority={index < initialBatchSize || image.priority}
                quality={85}
                sizes="100vw"
                className="object-cover w-full h-full"
                onLoad={() => handleImageLoad(index)}
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R7+X1Z/V1+k8ZNYVqNIaWXFnLXRFqgOSW4vdZIzShyRvE9b7/k0Yp9JI6DgHdNUJmJvczp4aOLJk6nC1m/DGa1SRBz9J/vF8/Klt4WNOvyWlL0/lJ4eN/dvv3b5n6aX3LpB3lUaUcMnXoP1gO7+VbYgJ2Hya3IoCPKI5VllWI8yQeRstgdQoWkWA+Bj6i7LqPJNlprpJC0aLx48G5vPkHlPuHMKtaX6TGKaD8aCk1JFEpT6bYrZe6kFqgNrH3bfVuuBaYDhSpI84wDbPnLqTLpZkjMKhBJYJW7lGGxGZGJCZp8YLO8eMOmZO8xJJGwOyVNxq8VSTr3cV/4Xh3VFrqhZpBcmjcmvxCKLB"
              />
            </motion.div>
          )
        ))}
      </AnimatePresence>
      
      {/* Loading indicator for progressive enhancement */}
      {loadedImageCount < images.length && (
        <div className="absolute bottom-4 right-4 text-white/60 text-sm">
          Loading images... {loadedImageCount}/{images.length}
        </div>
      )}
      
      {/* Slide indicators */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {visibleImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentImageIndex(index)}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentImageIndex 
                ? 'bg-white' 
                : 'bg-white/40 hover:bg-white/60'
            }`}
          />
        ))}
      </div>
    </div>
  )
}