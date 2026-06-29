import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: { root: '.' },
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      path: false,
      net: false,
      tls: false,
      ws: false,
      bufferutil: false,
      'utf-8-validate': false,
    };
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

export default nextConfig;
