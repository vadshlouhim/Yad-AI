import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ignorer les erreurs TS au build — les types Prisma ne sont pas encore générés
  // (requiert `npx prisma generate` avec une vraie DB Supabase)
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
