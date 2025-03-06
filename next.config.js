/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  trailingSlash: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  experimental: {
    outputFileTracingRoot: process.env.NODE_ENV === 'production' ? undefined : __dirname,
    optimizeCss: true
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
  // Disable static optimization for authenticated pages
  unstable_runtimeJS: true,
  unstable_JsPreload: false,
  // Redirects and rewrites for SEO and performance
  async redirects() {
    return [
      {
        source: '/old-salary-page',
        destination: '/salary',
        permanent: true,
      }
    ]
  },
  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { 
            key: 'Access-Control-Allow-Origin', 
            value: '*' 
          },
          { 
            key: 'Access-Control-Allow-Methods', 
            value: 'GET,POST,PUT,DELETE,OPTIONS' 
          },
          { 
            key: 'Cache-Control', 
            value: 'public, max-age=3600, stale-while-revalidate' 
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig 