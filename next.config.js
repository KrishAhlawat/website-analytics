/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Enable standalone output for Docker
  experimental: {
    serverComponentsExternalPackages: ['mongoose'],
  },
  // Optimize for production
  poweredByHeader: false,
  compress: true,
  // Image optimization
  images: {
    domains: [],
    formats: ['image/webp'],
  },
}

module.exports = nextConfig
