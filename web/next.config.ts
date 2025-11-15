import type { NextConfig } from "next"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

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
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "54321",
        pathname: "/storage/v1/object/public/**",
      },
      ...(supabaseUrl
        ? [
            {
              protocol: "https",
              hostname: new URL(supabaseUrl).hostname,
              port: "",
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
    ],
  },
}

export default nextConfig
