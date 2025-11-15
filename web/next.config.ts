import type { NextConfig } from "next"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

const remotePatterns = [
  {
    protocol: "http" as const,
    hostname: "127.0.0.1",
    port: "54321",
    pathname: "/storage/v1/object/public/**",
  },
  ...(supabaseUrl
    ? [
        {
          protocol: "https" as const,
          hostname: new URL(supabaseUrl).hostname,
          pathname: "/storage/v1/object/public/**",
        },
      ]
    : []),
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
