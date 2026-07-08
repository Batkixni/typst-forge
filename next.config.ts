import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {},
  },
  webpack: (config) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true }
    return config
  },
}

export default nextConfig
