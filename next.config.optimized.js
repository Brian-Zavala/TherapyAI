/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Compiler (2025 - still experimental, use with caution)
  experimental: {
    // React Compiler - requires babel-plugin-react-compiler
    reactCompiler: {
      compilationMode: 'annotation' // Opt-in mode for safety
    },
    // Turbopack is now stable in Next.js 15
    turbo: {
      loaders: {
        '.svg': ['@svgr/webpack']
      }
    },
    // Server Components external packages
    serverComponentsExternalPackages: ['@prisma/client'],
    // Optimize bundle splitting for common packages
    optimizePackageImports: [
      'framer-motion',
      '@heroicons/react',
      'lucide-react', 
      'recharts',
      '@tanstack/react-query'
    ]
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000, // 1 year cache
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Bundle optimization
  webpack: (config, { _buildId, dev, isServer, _defaultLoaders, _webpack }) => {
    // Bundle analyzer for development
    if (!dev && !isServer) {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: '../bundle-analysis.html'
        })
      )
    }

    // Optimize framer-motion imports
    config.resolve.alias = {
      ...config.resolve.alias,
      'framer-motion': 'framer-motion/dist/framer-motion',
    }

    // Tree shake unused exports
    config.optimization = {
      ...config.optimization,
      usedExports: true,
      sideEffects: false,
    }

    // Chunk splitting optimization
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            enforce: true,
          },
        },
      }
    }

    return config
  },

  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,

  // Environment variables for performance monitoring
  env: {
    BUNDLE_ANALYZE: process.env.ANALYZE,
    PERFORMANCE_MONITORING: 'true'
  },

  // Headers for performance
  async headers() {
    return [
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig