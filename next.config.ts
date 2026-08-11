import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Self-contained server output for Docker (includes traced node_modules)
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  experimental: {
    serverActions: {},
  },
  webpack: (config) => {
    // codemirror-lang-typst ships wasm-bindgen "bundler" target:
    //   import * as wasm from "./xxx.wasm"
    //   wasm.__wbindgen_start()
    // That requires async WebAssembly modules with named exports —
    // NOT asset/resource (which only provides a default URL export).
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    }

    // Drop any rule that force-loads .wasm as a static asset URL
    const stripWasmAsset = (rules: unknown[] | undefined) => {
      if (!Array.isArray(rules)) return
      for (let i = rules.length - 1; i >= 0; i--) {
        const rule = rules[i] as {
          test?: RegExp
          type?: string
          oneOf?: unknown[]
          rules?: unknown[]
        } | null
        if (!rule || typeof rule !== "object") continue
        if (rule.oneOf) stripWasmAsset(rule.oneOf)
        if (rule.rules) stripWasmAsset(rule.rules)
        const testStr = rule.test?.toString?.() ?? ""
        if (
          testStr.includes("wasm") &&
          (rule.type === "asset/resource" || rule.type === "asset")
        ) {
          rules.splice(i, 1)
        }
      }
    }
    stripWasmAsset(config.module.rules as unknown[])

    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    })

    // Emit wasm next to server chunks (avoids ENOENT under .next/server/static/wasm)
    if (config.output) {
      config.output.webassemblyModuleFilename = "static/wasm/[modulehash].wasm"
    }

    return config
  },
}

export default nextConfig
