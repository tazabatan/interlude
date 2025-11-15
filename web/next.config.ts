import type { NextConfig } from "next"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

const remotePatterns =
  supabaseUrl
    ? [
        {
          protocol: "http",
          hostname: "127.0.0.1",
          port: "54321",
          pathname: "/storage/v1/object/public/**",
        },
        {
          protocol: "https",
          hostname: new URL(supabaseUrl).hostname,
          pathname: "/storage/v1/object/public/**",
        },
      ]
    : [
        {
          protocol: "http",
          hostname: "127.0.0.1",
          port: "54321",
          pathname: "/storage/v1/object/public/**",
        },
      ]

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns,
  },
}

export default nextConfig
