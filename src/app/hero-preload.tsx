'use client';

// Use in layout.tsx to preload hero assets
export default function HeroPreloads() {
  return (
    <>
      {/* Preload critical hero image */}
      <link
        rel="preload"
        as="image"
        href="/images/home/7.webp"
        type="image/webp"
        fetchPriority="high"
      />
      
      {/* Preconnect to CDNs if using them */}
      <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      
      {/* Preload CSS for smooth animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes hero-gradient-preload {
              from { background-position: 0% 50%; }
              to { background-position: 100% 50%; }
            }
            
            .hero-preload-warmup {
              position: absolute;
              left: -9999px;
              width: 1px;
              height: 1px;
              background: linear-gradient(to right, #3b82f6, #ec4899);
              background-size: 200% 100%;
              animation: hero-gradient-preload 0.1s ease-out;
            }
          `,
        }}
      />
    </>
  );
}