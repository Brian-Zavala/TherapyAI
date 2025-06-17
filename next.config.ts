import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // This top-level option tells Next.js (both Webpack in App Router and Turbopack)
  // which packages should not be bundled within Server Components and should be
  // treated as external dependencies on the server.
  serverExternalPackages: ["ws", "@deepgram/sdk"],

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
      // Keep basic Node.js modules mapped for client compatibility
      "fs": "@/lib/empty-module.js",
      "net": "@/lib/empty-module.js",
      "tls": "@/lib/empty-module.js",
    },
  },

  // Configure the Webpack bundler specifically.
  webpack: (config, { isServer, webpack }) => {
    // Add raw-loader for HTML files
    config.module.rules.push({
      test: /\.html$/,
      use: 'raw-loader',
    });

    // Exclude native modules from client-side bundle
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
      };
    }

    // This specific configuration ensures native packages are treated
    // as external modules in the server-side bundle when using Webpack.
    if (isServer) {
      config.externals = [...(config.externals || []), "ws", "@deepgram/sdk"];
    }


    return config;
  },
};

export default nextConfig;
