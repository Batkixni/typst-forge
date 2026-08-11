import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Self-contained server output for Docker (includes traced node_modules)
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    serverActions: {},
  },
  webpack: (config) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true }
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    })
    return config
  },
}

export default nextConfig
