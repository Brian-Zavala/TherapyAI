/**
 * CDN Image Loader for Next.js
 * Supports both Bunny CDN (production) and default loading (development/Render)
 */

const bunnyConfig = require('../../config/bunny-cdn.config');

export default function cdnImageLoader({ src, width, quality }) {
  // If CDN is not enabled, return the original source
  if (!bunnyConfig.enabled || !bunnyConfig.cdnUrl) {
    // For Render deployment or local development
    if (process.env.RENDER_EXTERNAL_URL) {
      // Render deployment - use Render's URL
      return `${src}${width ? `?w=${width}` : ''}${quality ? `&q=${quality}` : ''}`;
    }
    // Local development or no CDN
    return src;
  }
  
  // Bunny CDN is enabled (for Railway production deployment)
  const params = [];
  
  // Width parameter
  if (width) {
    params.push(`width=${width}`);
  }
  
  // Quality parameter (default to 85 for optimization)
  if (quality || !quality) {
    params.push(`quality=${quality || 85}`);
  }
  
  // Add Bunny Optimizer parameters if enabled
  if (bunnyConfig.pullZone?.optimizer?.enabled) {
    params.push('optimizer=true');
    
    // Auto WebP conversion
    if (bunnyConfig.pullZone.optimizer.settings?.autoWebp) {
      params.push('format=webp');
    }
    
    // Smart image sizing for mobile
    if (bunnyConfig.pullZone.optimizer.settings?.mobileOptimization) {
      params.push('auto=compress');
    }
  }
  
  // Build the CDN URL
  const queryString = params.length > 0 ? `?${params.join('&')}` : '';
  const cdnUrl = bunnyConfig.cdnUrl.replace(/\/$/, ''); // Remove trailing slash
  
  // Handle external images
  if (src.startsWith('http://') || src.startsWith('https://')) {
    // For external images, use Bunny's image processing endpoint
    return `${cdnUrl}/process?url=${encodeURIComponent(src)}${queryString ? '&' + queryString : ''}`;
  }
  
  // For local images, construct the CDN URL
  return `${cdnUrl}${src}${queryString}`;
}

// Export configuration for use in components
export const imageLoaderConfig = {
  // Determine if CDN is active
  isCdnEnabled: bunnyConfig.enabled,
  
  // Get the CDN base URL
  cdnUrl: bunnyConfig.cdnUrl,
  
  // Helper to preload critical images
  preloadImage: (src, priority = false) => {
    if (!bunnyConfig.enabled) return null;
    
    return {
      rel: priority ? 'preload' : 'prefetch',
      as: 'image',
      href: cdnImageLoader({ src, width: 1920, quality: 90 }),
      type: 'image/webp',
    };
  },
  
  // Get responsive image srcSet
  getResponsiveSrcSet: (src, sizes = [640, 750, 828, 1080, 1200, 1920]) => {
    return sizes
      .map(size => `${cdnImageLoader({ src, width: size })} ${size}w`)
      .join(', ');
  },
  
  // Get optimized avatar URL
  getAvatarUrl: (src, size = 128) => {
    return cdnImageLoader({ 
      src, 
      width: size, 
      quality: 90 // Higher quality for avatars
    });
  },
  
  // Get thumbnail URL
  getThumbnailUrl: (src, width = 320, height = 240) => {
    const url = cdnImageLoader({ src, width, quality: 80 });
    // Add height parameter if Bunny Optimizer is enabled
    if (bunnyConfig.pullZone?.optimizer?.enabled) {
      return `${url}&height=${height}&fit=cover`;
    }
    return url;
  },
};