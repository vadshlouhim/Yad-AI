import type { NextConfig } from "next";

const supabaseImageHostname = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://xicipkwqvuoaavvdgnnb.supabase.co").hostname;
  } catch {
    return "xicipkwqvuoaavvdgnnb.supabase.co";
  }
})();

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseImageHostname,
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
