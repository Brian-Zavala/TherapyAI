/** @type {import('next').NextConfig} */
// Note: Custom webpack config is used for fs fallbacks and aliases.
// To use Turbopack, remove the webpack function and update fallback handling.
const nextConfig = {
  reactStrictMode: true,
  
  // Railway-specific optimizations
  output: 'standalone',
  
  // Enable experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Note: instrumentationHook removed - instrumentation.js is available by default in Next.js 15
  },

  // Image optimization
  images: {
    domains: [
      'localhost',
      'pjmdlinrffawvhoktopd.supabase.co',
      'images.unsplash.com',
      'api.dicebear.com',
    ],
    unoptimized: process.env.NODE_ENV === 'development',
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), geolocation=(), interest-cohort=()',
          },
        ],
      },
      // SSE and WebSocket headers
      {
        source: '/api/realtime/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache',
          },
          {
            key: 'Content-Type',
            value: 'text/event-stream',
          },
          {
            key: 'Connection',
            value: 'keep-alive',
          },
          {
            key: 'X-Accel-Buffering',
            value: 'no',
          },
        ],
      },
    ];
  },

  // Redirects for old routes
  async redirects() {
    return [
      // Remove dashboard redirect since we have a page.tsx at /dashboard
    ];
  },

  // Environment variables available to the client
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `fs` module
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Add custom aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
    };

    // Optimize compilation speed
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
    };

    return config;
  },

  // TypeScript configuration
  typescript: {
    // During production build, do not fail on TypeScript errors
    ignoreBuildErrors: false,
  },

  // ESLint configuration  
  eslint: {
    // During production build, do not fail on ESLint errors
    ignoreDuringBuilds: false,
  },

  // Note: Sentry configuration moved to withSentryConfig wrapper below
};

// Bundle analyzer for performance optimization
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

// Sentry webpack plugin
const { withSentryConfig } = require('@sentry/nextjs');

// Compose configurations
const sentryConfig = withSentryConfig(
  nextConfig,
  {
    // Sentry build options
    org: 'couple-therapy',
    project: 'couple-therapy-web',
    silent: true,
    widenClientFileUpload: true,
    reactComponentAnnotation: {
      enabled: true,
    },
    tunnelRoute: '/monitoring',
    hideSourceMaps: true,
    disableLogger: true,
    // Sentry webpack plugin options (moved from nextConfig.sentry)
    disableServerWebpackPlugin: false, // Enable for testing
    disableClientWebpackPlugin: false, // Enable for testing
  }
);

// Export with bundle analyzer wrapper
module.exports = withBundleAnalyzer(sentryConfig);