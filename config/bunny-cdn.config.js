/**
 * Bunny CDN Configuration
 * Ready for integration when deploying to Railway
 */

const bunnyConfig = {
  // CDN Status
  enabled: process.env.CDN_ENABLED === 'true',
  
  // Bunny CDN URLs (configure after creating pull zone)
  cdnUrl: process.env.BUNNY_CDN_URL || '',
  pullZoneId: process.env.BUNNY_PULL_ZONE_ID || '',
  apiKey: process.env.BUNNY_API_KEY || '',
  
  // Storage Configuration
  storageZone: {
    name: 'therapy-storage',
    region: 'ny', // New York (closest to us-east)
    replicationRegions: ['la', 'de'], // Los Angeles, Germany
  },
  
  // Pull Zone Configuration
  pullZone: {
    name: 'therapy-cdn',
    originUrl: process.env.NEXTAUTH_URL || 'https://couple-therapy.railway.app',
    
    // Caching Rules
    cacheSettings: {
      // Static assets - cache for 1 year
      '/_next/static/*': {
        browserCacheTime: 31536000,
        edgeCacheTime: 31536000,
        cacheControl: 'public, max-age=31536000, immutable',
      },
      
      // Images - cache for 1 month
      '/images/*': {
        browserCacheTime: 2592000,
        edgeCacheTime: 2592000,
        cacheControl: 'public, max-age=2592000',
      },
      
      // Fonts - cache for 1 year
      '/fonts/*': {
        browserCacheTime: 31536000,
        edgeCacheTime: 31536000,
        cacheControl: 'public, max-age=31536000',
      },
      
      // API routes - no cache
      '/api/*': {
        browserCacheTime: 0,
        edgeCacheTime: 0,
        cacheControl: 'no-cache, no-store, must-revalidate',
      },
    },
    
    // Edge Rules
    edgeRules: [
      {
        pattern: '\\.(jpg|jpeg|png|gif|webp|svg|ico)$',
        action: 'optimize_image',
        settings: {
          webp: true,
          quality: 85,
        },
      },
      {
        pattern: '\\.(js|css)$',
        action: 'compress',
        settings: {
          gzip: true,
          brotli: true,
        },
      },
    ],
    
    // Security
    security: {
      blockRootPathAccess: false,
      blockPostRequests: false,
      blockNonSNI: true,
      challengeUnknownCountries: false,
      
      // Rate limiting
      rateLimiting: {
        enabled: true,
        requestsPerSecond: 100,
        burstSize: 200,
      },
      
      // DDoS protection
      ddosProtection: {
        enabled: true,
        shieldMode: 'standard', // or 'aggressive'
      },
    },
    
    // Optimizer Settings (requires Bunny Optimizer addon)
    optimizer: {
      enabled: process.env.BUNNY_OPTIMIZER_ENABLED === 'true',
      settings: {
        // Image optimization
        webpCompression: true,
        autoWebp: true,
        imageQuality: 85,
        
        // CSS/JS optimization
        minifyCSS: true,
        minifyJS: true,
        
        // Advanced features
        lazyLoading: true,
        smartImageSizing: true,
        mobileOptimization: true,
      },
    },
    
    // Perma-Cache (optional - one-time fee)
    permaCache: {
      enabled: false,
      paths: [
        '/_next/static/chunks/*.js',
        '/_next/static/css/*.css',
        '/fonts/*.woff2',
      ],
    },
  },
  
  // Asset Prefix for Next.js
  getAssetPrefix() {
    if (!this.enabled || !this.cdnUrl) {
      return '';
    }
    return this.cdnUrl;
  },
  
  // Image Loader for Next.js
  imageLoader({ src, width, quality }) {
    if (!this.enabled || !this.cdnUrl) {
      return src;
    }
    
    const params = [];
    if (width) params.push(`width=${width}`);
    if (quality) params.push(`quality=${quality || 85}`);
    
    // Use Bunny Optimizer if enabled
    if (this.pullZone.optimizer.enabled) {
      params.push('optimizer=true');
    }
    
    const queryString = params.length > 0 ? `?${params.join('&')}` : '';
    return `${this.cdnUrl}${src}${queryString}`;
  },
  
  // Purge CDN Cache
  async purgeCache(paths = ['*']) {
    if (!this.enabled || !this.apiKey || !this.pullZoneId) {
      console.warn('CDN not configured for cache purging');
      return false;
    }
    
    try {
      const response = await fetch(
        `https://api.bunny.net/pullzone/${this.pullZoneId}/purgeCache`,
        {
          method: 'POST',
          headers: {
            'AccessKey': this.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paths),
        }
      );
      
      return response.ok;
    } catch (error) {
      console.error('Failed to purge CDN cache:', error);
      return false;
    }
  },
  
  // Prefetch critical assets
  getPrefetchLinks() {
    if (!this.enabled || !this.cdnUrl) {
      return [];
    }
    
    return [
      `${this.cdnUrl}/_next/static/css/app.css`,
      `${this.cdnUrl}/_next/static/chunks/main.js`,
      `${this.cdnUrl}/_next/static/chunks/webpack.js`,
      `${this.cdnUrl}/fonts/inter-var.woff2`,
    ];
  },
  
  // Get security headers for CDN
  getSecurityHeaders() {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    };
  },
};

module.exports = bunnyConfig;