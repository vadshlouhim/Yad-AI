import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import type { Tables } from "@/types/database.types";

type Profile = Tables<"profiles">;

// Récupère l'utilisateur Supabase + son profil
// Redirige vers /auth/login si non connecté
export async function requireAuth(): Promise<{
  supabaseUser: { id: string; email: string };
  profile: Profile;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    // Profil absent → first login, créer le profil
    const { data: newProfile, error: createError } = await admin
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? null,
        avatarUrl: user.user_metadata?.avatar_url ?? null,
        role: "ADMIN",
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError || !newProfile) {
      throw new Error("Impossible de créer le profil utilisateur");
    }

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

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("*, community:Community(*)")
    .eq("id", user.id)
    .single();

  return profile ?? null;
}

// Récupère uniquement l'utilisateur Supabase (léger, sans DB)
export async function getSupabaseUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
