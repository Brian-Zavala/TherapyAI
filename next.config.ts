import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // This top-level option tells Next.js (both Webpack in App Router and Turbopack)
  // which packages should not be bundled within Server Components and should be
  // treated as external dependencies on the server.
  serverExternalPackages: ["ws", "@deepgram/sdk"],

  // Configure the Webpack bundler specifically.
  webpack: (config, { isServer, webpack }) => {
    // This specific configuration ensures 'ws' and '@deepgram/sdk' are treated
    // as external modules in the server-side bundle when using Webpack.
    // While `serverExternalPackages` handles Server Components, this `externals`
    // config can be important for other server-side contexts (like Pages Router API routes
    // or if `serverExternalPackages` doesn't cover all Webpack server use cases).
    // It's generally safe to keep both if you need broad compatibility.
    if (isServer) {
      config.externals = [...(config.externals || []), "ws", "@deepgram/sdk"];
    }

    return config;
  },
};

export default nextConfig;
