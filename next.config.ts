import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Configure bundlers to handle ws module for WebSockets
  webpack: (config, { isServer, webpack }) => {
    if (isServer) {
      // Add WebSocket as an external module for the server
      config.externals = [...(config.externals || []), 'ws', '@deepgram/sdk'];
    }
    
    return config;
  },
  
  // Define experimental section for Turbopack configuration
  experimental: {
    // Turbopack needs to know about external packages used on the server
    serverComponentsExternalPackages: ['ws', '@deepgram/sdk']
  }
};

export default nextConfig;
