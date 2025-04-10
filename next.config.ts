import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Configure Webpack to handle ws module for WebSockets
  webpack: (config, { isServer, webpack }) => {
    if (isServer) {
      // Add WebSocket as an external module for the server
      config.externals = [...(config.externals || []), 'ws', '@deepgram/sdk'];
    }
    
    return config;
  },
};

export default nextConfig;
