'use client';

/**
 * Utility for preloading videos in the browser.
 * This is a client-side only module that safely preloads video files.
 */

// Keep track of already preloaded videos
const preloadedVideos = new Set<string>();

export function preloadVideos(sources: string[]) {
  // Skip if we're not in a browser
  if (typeof window === 'undefined') return;

  // For videos, using a proper preload attribute is more reliable
  sources.forEach(src => {
    // Skip if already preloaded
    if (preloadedVideos.has(src)) return;
    
    // Mark as preloaded to prevent duplicates
    preloadedVideos.add(src);
    
    // Create a video element
    const video = document.createElement('video');
    video.preload = 'auto';
    video.style.display = 'none';
    video.src = src;
    
    // Just trigger preloading by loading metadata, don't need the full video
    video.load();
    
    // Clean up after 10 seconds (enough time for preloading to start)
    setTimeout(() => {
      video.src = '';
      video.load();
    }, 10000);
  });
  
  return preloadedVideos.size; // Return count for debugging
}

// Keep track of already preloaded images
const preloadedImages = new Set<string>();

export function preloadImages(sources: string[]) {
  // Skip if we're not in a browser
  if (typeof window === 'undefined') return;

  sources.forEach(src => {
    // Skip if already preloaded
    if (preloadedImages.has(src)) return;
    
    // Mark as preloaded
    preloadedImages.add(src);
    
    const img = new Image();
    img.src = src;
  });
  
  return preloadedImages.size; // Return count for debugging
}