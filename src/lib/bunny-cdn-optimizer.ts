/**
 * Bunny CDN Optimizer Utilities
 * Advanced image and asset optimization for Railway deployment
 */

import bunnyConfig from '../../config/bunny-cdn.config';

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside';
  gravity?: 'center' | 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest';
  blur?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  sharpen?: boolean;
}

export class BunnyCDNOptimizer {
  private static instance: BunnyCDNOptimizer;
  private readonly baseUrl: string;
  private readonly enabled: boolean;

  private constructor() {
    this.baseUrl = bunnyConfig.cdnUrl || '';
    this.enabled = bunnyConfig.enabled && bunnyConfig.pullZone?.optimizer?.enabled;
  }

  static getInstance(): BunnyCDNOptimizer {
    if (!BunnyCDNOptimizer.instance) {
      BunnyCDNOptimizer.instance = new BunnyCDNOptimizer();
    }
    return BunnyCDNOptimizer.instance;
  }

  /**
   * Generate optimized image URL with Bunny CDN parameters
   */
  optimizeImage(src: string, options: ImageOptimizationOptions = {}): string {
    if (!this.enabled || !this.baseUrl) {
      return src;
    }

    const params = new URLSearchParams();

    // Core optimization parameters
    if (options.width) params.append('width', options.width.toString());
    if (options.height) params.append('height', options.height.toString());
    if (options.quality) params.append('quality', Math.min(100, Math.max(1, options.quality)).toString());
    
    // Format conversion (WebP by default for supported browsers)
    if (options.format) {
      params.append('format', options.format);
    } else if (bunnyConfig.pullZone?.optimizer?.settings?.autoWebp) {
      params.append('format', 'webp');
    }

    // Image fitting
    if (options.fit) params.append('fit', options.fit);
    if (options.gravity) params.append('gravity', options.gravity);

    // Image effects
    if (options.blur) params.append('blur', Math.min(20, Math.max(0, options.blur)).toString());
    if (options.brightness) params.append('brightness', Math.min(200, Math.max(-100, options.brightness)).toString());
    if (options.contrast) params.append('contrast', Math.min(200, Math.max(-100, options.contrast)).toString());
    if (options.saturation) params.append('saturation', Math.min(200, Math.max(-100, options.saturation)).toString());
    if (options.sharpen) params.append('sharpen', 'true');

    // Mobile optimization
    if (bunnyConfig.pullZone?.optimizer?.settings?.mobileOptimization) {
      params.append('auto', 'compress');
    }

    const queryString = params.toString();
    const cleanSrc = src.startsWith('/') ? src : `/${src}`;
    
    return `${this.baseUrl}${cleanSrc}${queryString ? '?' + queryString : ''}`;
  }

  /**
   * Generate responsive image srcSet for different viewport sizes
   */
  generateResponsiveSrcSet(src: string, options: ImageOptimizationOptions = {}): string {
    if (!this.enabled) {
      return src;
    }

    const breakpoints = [320, 640, 768, 1024, 1280, 1536, 1920];
    const srcSetEntries: string[] = [];

    for (const width of breakpoints) {
      const optimizedUrl = this.optimizeImage(src, {
        ...options,
        width,
        quality: this.getOptimalQuality(width),
      });
      srcSetEntries.push(`${optimizedUrl} ${width}w`);
    }

    return srcSetEntries.join(', ');
  }

  /**
   * Get optimal quality based on viewport width
   */
  private getOptimalQuality(width: number): number {
    if (width <= 640) return 75; // Mobile - lower quality for faster loading
    if (width <= 1024) return 80; // Tablet - balanced quality
    return 85; // Desktop - higher quality
  }

  /**
   * Generate avatar URL with circular crop
   */
  generateAvatarUrl(src: string, size: number = 128): string {
    return this.optimizeImage(src, {
      width: size,
      height: size,
      quality: 90,
      fit: 'cover',
      gravity: 'center',
      format: 'webp',
      sharpen: true,
    });
  }

  /**
   * Generate thumbnail URL for gallery/preview use
   */
  generateThumbnailUrl(src: string, width: number = 320, height: number = 240): string {
    return this.optimizeImage(src, {
      width,
      height,
      quality: 80,
      fit: 'cover',
      gravity: 'center',
      format: 'webp',
    });
  }

  /**
   * Generate hero image URL with optimal settings
   */
  generateHeroUrl(src: string, width: number = 1920): string {
    return this.optimizeImage(src, {
      width,
      quality: 90,
      format: 'webp',
      fit: 'cover',
      gravity: 'center',
      contrast: 10, // Slight contrast boost for hero images
      sharpen: true,
    });
  }

  /**
   * Preload critical images with proper hints
   */
  preloadImage(src: string, options: ImageOptimizationOptions = {}, priority: boolean = true): HTMLLinkElement | null {
    if (!this.enabled || typeof document === 'undefined') {
      return null;
    }

    const link = document.createElement('link');
    link.rel = priority ? 'preload' : 'prefetch';
    link.as = 'image';
    link.href = this.optimizeImage(src, { quality: 85, ...options });
    
    // Add WebP type hint if supported
    if (options.format === 'webp' || bunnyConfig.pullZone?.optimizer?.settings?.autoWebp) {
      link.type = 'image/webp';
    }

    document.head.appendChild(link);
    return link;
  }

  /**
   * Batch preload multiple images
   */
  preloadImages(images: Array<{ src: string; options?: ImageOptimizationOptions; priority?: boolean }>): void {
    if (!this.enabled) return;

    images.forEach(({ src, options = {}, priority = false }) => {
      this.preloadImage(src, options, priority);
    });
  }

  /**
   * Check if CDN optimization is available
   */
  isOptimizationEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get CDN stats and performance info
   */
  getCDNInfo(): {
    enabled: boolean;
    baseUrl: string;
    optimizerEnabled: boolean;
    features: string[];
  } {
    return {
      enabled: this.enabled,
      baseUrl: this.baseUrl,
      optimizerEnabled: bunnyConfig.pullZone?.optimizer?.enabled || false,
      features: [
        ...(bunnyConfig.pullZone?.optimizer?.settings?.autoWebp ? ['WebP Conversion'] : []),
        ...(bunnyConfig.pullZone?.optimizer?.settings?.mobileOptimization ? ['Mobile Optimization'] : []),
        ...(bunnyConfig.pullZone?.optimizer?.settings?.lazyLoading ? ['Lazy Loading'] : []),
        ...(bunnyConfig.pullZone?.optimizer?.settings?.smartImageSizing ? ['Smart Sizing'] : []),
      ],
    };
  }
}

// Export singleton instance
export const bunnyCDN = BunnyCDNOptimizer.getInstance();

// React hook for easy component integration
export function useBunnyCDN() {
  return {
    optimizeImage: bunnyCDN.optimizeImage.bind(bunnyCDN),
    generateResponsiveSrcSet: bunnyCDN.generateResponsiveSrcSet.bind(bunnyCDN),
    generateAvatarUrl: bunnyCDN.generateAvatarUrl.bind(bunnyCDN),
    generateThumbnailUrl: bunnyCDN.generateThumbnailUrl.bind(bunnyCDN),
    generateHeroUrl: bunnyCDN.generateHeroUrl.bind(bunnyCDN),
    preloadImage: bunnyCDN.preloadImage.bind(bunnyCDN),
    preloadImages: bunnyCDN.preloadImages.bind(bunnyCDN),
    isEnabled: bunnyCDN.isOptimizationEnabled(),
    info: bunnyCDN.getCDNInfo(),
  };
}

// Utility functions for common use cases
export const imageUtils = {
  /**
   * Get optimal image props for Next.js Image component
   */
  getImageProps(src: string, options: ImageOptimizationOptions = {}) {
    const optimizer = BunnyCDNOptimizer.getInstance();
    
    if (!optimizer.isOptimizationEnabled()) {
      return { src };
    }

    return {
      src: optimizer.optimizeImage(src, options),
      sizes: options.width ? `${options.width}px` : '100vw',
      quality: options.quality || 85,
    };
  },

  /**
   * Get responsive image props with srcSet
   */
  getResponsiveImageProps(src: string, options: ImageOptimizationOptions = {}) {
    const optimizer = BunnyCDNOptimizer.getInstance();
    
    if (!optimizer.isOptimizationEnabled()) {
      return { src };
    }

    return {
      src: optimizer.optimizeImage(src, options),
      srcSet: optimizer.generateResponsiveSrcSet(src, options),
      sizes: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
    };
  },
};