'use client';

import { useEffect, useRef } from 'react';

interface ScrollVideoProps {
  src: string;
  className?: string;
}

/**
 * Video that starts buffering ~400px before it enters the viewport so playback
 * is seamless the moment the user scrolls to it.
 *
 * Strategy:
 *  - Render with preload="none" so the initial page load is not slowed down.
 *  - IntersectionObserver (rootMargin 400px) triggers video.load() early.
 *  - A second observer (rootMargin 0px) calls video.play() when visible.
 */
export default function ScrollVideo({ src, className }: ScrollVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let loaded = false;

    // Preload observer — fires 400px before entering viewport
    const preloadObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !loaded) {
          loaded = true;
          video.preload = 'auto';
          video.load();
          preloadObserver.disconnect();
        }
      },
      { rootMargin: '400px' }
    );

    // Play observer — fires when element is actually on screen
    const playObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {/* autoplay blocked — silently ignore */});
        } else {
          video.pause();
        }
      },
      { rootMargin: '0px' }
    );

    preloadObserver.observe(video);
    playObserver.observe(video);

    return () => {
      preloadObserver.disconnect();
      playObserver.disconnect();
    };
  }, []);

  return (
    <video
      ref={videoRef}
      className={className}
      preload="none"
      loop
      muted
      playsInline
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
