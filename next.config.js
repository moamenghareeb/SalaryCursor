/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: false,
  trailingSlash: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  // Workaround for NFT issue
  experimental: {
    outputFileTracingRoot: process.env.NODE_ENV === 'production' ? undefined : __dirname,
  },
}

module.exports = nextConfig 