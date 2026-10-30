import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const supabaseImageHostname = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://xicipkwqvuoaavvdgnnb.supabase.co").hostname;
  } catch {
    return "xicipkwqvuoaavvdgnnb.supabase.co";
  }
})();

const nextConfig: NextConfig = {
  serverExternalPackages: ["@keeratita/heic-converter", "web-push"],
  experimental: {
    preloadEntriesOnStart: false,
  },
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
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.0.100"],
};

export default withNextIntl(nextConfig);
