import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static export for desktop builds
  output: process.env.NEXT_OUTPUT_MODE === 'export' ? 'export' : undefined,
  
  // For static export, we need to disable image optimization
  images: process.env.NEXT_OUTPUT_MODE === 'export' 
    ? { unoptimized: true }
    : {
        remotePatterns: [
          {
            protocol: 'https',
            hostname: '**',
          },
          {
            protocol: 'http',
            hostname: '**',
          },
        ],
      },
  
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
