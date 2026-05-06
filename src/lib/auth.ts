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

  // Lecture du profil avec le client session (RLS autorise l'accès à son propre profil)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // PGRST116 = "no rows returned" — profil absent, à créer
  // Toute autre erreur = problème DB réel, on propage
  if (profileError && profileError.code !== "PGRST116") {
    throw new Error(`Erreur de lecture du profil : ${profileError.message}`);
  }

  if (!profile) {
    // Profil absent → first login, créer le profil (upsert pour éviter les doublons)
    const admin = createAdminClient();
    const { data: newProfile, error: createError } = await admin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email!,
          name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? null,
          avatarUrl: user.user_metadata?.avatar_url ?? null,
          role: "ADMIN",
          updatedAt: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select()
      .single();

    if (createError || !newProfile) {
      throw new Error(`Impossible de créer le profil utilisateur : ${createError?.message}`);
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
