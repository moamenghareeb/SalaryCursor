/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  trailingSlash: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  // Workaround for NFT issue
  experimental: {
    outputFileTracingRoot: process.env.NODE_ENV === 'production' ? undefined : __dirname,
    optimizeCss: true,
    legacyBrowsers: false,
    browsersListForSwc: true,
  },
  images: {
    unoptimized: true
  },
  // Compression and caching
  compress: true,
  // Webpack optimizations
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        maxInitialRequests: 25,
        minSize: 20000
      }
    }
    return config
  },
  // Redirects and rewrites for SEO and performance
  async redirects() {
    return [
      {
        source:
    ]
  }
}

module.exports = nextConfig 