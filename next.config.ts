import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow mobile devices on LAN to load Next.js dev assets (HMR, chunks, etc.)
  allowedDevOrigins: ['10.170.3.155', 'localhost'],
  async rewrites() {
    const backendUrl =
      process.env.NEXT_PUBLIC_API_URL || 'https://www.triageflow.me';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

