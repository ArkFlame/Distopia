import type { NextConfig } from 'next';

function configuredDevOrigins(): string[] {
  const raw = process.env.DISTOPIA_DEV_ORIGINS || 'localhost,127.0.0.1,0.0.0.0,192.168.1.2,distopia.arkflame.com';
  return Array.from(new Set(raw.split(',').map((origin) => origin.trim()).filter(Boolean)));
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  allowedDevOrigins: configuredDevOrigins(),
  images: {
    unoptimized: true
  }
};

export default nextConfig;
