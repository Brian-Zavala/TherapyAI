import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // This top-level option tells Next.js (both Webpack in App Router and Turbopack)
  // which packages should not be bundled within Server Components and should be
  // treated as external dependencies on the server.
  serverExternalPackages: ["ws", "@deepgram/sdk", "@mapbox/node-pre-gyp", "bcrypt"],

  // Configure Turbopack to handle HTML files properly
  turbopack: {
    rules: {
      // Handle HTML files that are being imported as modules
      "*.html": {
        loaders: ["raw-loader"],
        as: "*.js",
      },
    },
    resolveAlias: {
      // Map server-only packages to empty modules for client-side
      "@mapbox/node-pre-gyp": "@/lib/empty-module", 
      "aws-sdk": "@/lib/empty-module",
      "mock-aws-s3": "@/lib/empty-module",
      "nock": "@/lib/empty-module",
      "fs": "@/lib/empty-module",
      "net": "@/lib/empty-module",
      "tls": "@/lib/empty-module",
      "tar": "@/lib/empty-module",
      "https-proxy-agent": "@/lib/empty-module",
    },
  },

  // Configure the Webpack bundler specifically.
  webpack: (config, { isServer, webpack }) => {
    // Add raw-loader for HTML files
    config.module.rules.push({
      test: /\.html$/,
      use: 'raw-loader',
    });

    // Exclude bcrypt and native modules from client-side bundle
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'bcrypt': false,
        '@mapbox/node-pre-gyp': false,
      };
    }

    // This specific configuration ensures native packages are treated
    // as external modules in the server-side bundle when using Webpack.
    if (isServer) {
      config.externals = [...(config.externals || []), "ws", "@deepgram/sdk", "@mapbox/node-pre-gyp", "bcrypt"];
    }

    // Ignore problematic HTML files from node_modules that aren't meant to be bundled
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /\.html$/,
        contextRegExp: /node_modules\/@mapbox\/node-pre-gyp/,
      })
    );

    return config;
  },
};

export default nextConfig;
