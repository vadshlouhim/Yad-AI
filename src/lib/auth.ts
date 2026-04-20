import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";

// Récupère l'utilisateur Supabase + son profil Prisma
// Redirige vers /auth/login si non connecté
export async function requireAuth(): Promise<{
  supabaseUser: { id: string; email: string };
  profile: User;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!profile) {
    // Profil absent → first login, créer le profil
    const newProfile = await prisma.user.create({
      data: {
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.full_name ?? user.email?.split("@")[0],
        avatarUrl: user.user_metadata?.avatar_url ?? null,
        role: "ADMIN",
      },
    });
    redirect("/onboarding");
    return { supabaseUser: { id: user.id, email: user.email! }, profile: newProfile };
  }

  return {
    supabaseUser: { id: user.id, email: user.email! },
    profile,
  };
}

// Version sans redirection (pour les layouts qui vérifient sans bloquer)
export async function getOptionalUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    include: { community: true },
  });

  return profile;
}

// Récupère uniquement l'utilisateur Supabase (léger, sans Prisma)
export async function getSupabaseUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
