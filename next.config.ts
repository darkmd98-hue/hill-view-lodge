import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allows requests from tunnels and local network IPs in Next.js 15
  allowedDevOrigins: ["*.loca.lt", "10.22.226.23:3000", "localhost:3000"],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
