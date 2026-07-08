import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugifyUnique, defaultCommunityType } from "@/lib/onboarding/community-draft";

/**
 * Crée (ou met à jour) la fiche Community "brouillon" dès la fin de l'étape Identité,
 * pour que la connexion OAuth des réseaux sociaux (étape suivante) ait un communityId
 * auquel s'attacher. `/api/onboarding/complete` finalise ensuite ce brouillon.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, data } = body;
    if (userId !== user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const communityName = typeof data?.communityName === "string" ? data.communityName.trim() : "";
    const city = typeof data?.city === "string" ? data.city.trim() : "";
    if (communityName.length < 2 || city.length < 2) {
      return NextResponse.json({ error: "Nom et ville requis" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("communityId")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
    }

    const fields = {
      name: communityName,
      city,
      country: data.country || "France",
      timezone: data.timezone || "Europe/Paris",
      phone: data.phone || null,
      email: data.email || null,
      website: data.website || null,
      logoUrl: data.logoUrl || null,
      updatedAt: new Date().toISOString(),
    };

    if (profile.communityId) {
      const { data: existing } = await admin
        .from("Community")
        .select("id, onboardingDone")
        .eq("id", profile.communityId)
        .single();

      if (existing?.onboardingDone) {
        return NextResponse.json({ error: "Onboarding déjà finalisé" }, { status: 409 });
      }

      const { error: updateError } = await admin
        .from("Community")
        .update(fields)
        .eq("id", profile.communityId);

      if (updateError) {
        return NextResponse.json({ error: "Mise à jour du brouillon impossible" }, { status: 500 });
      }

      return NextResponse.json({ success: true, communityId: profile.communityId });
    }

    const slug = await slugifyUnique(admin, communityName);
    const { data: community, error: communityError } = await admin
      .from("Community")
      .insert({
        id: crypto.randomUUID(),
        slug,
        communityType: defaultCommunityType(),
        onboardingDone: false,
        onboardingStep: 1,
        ...fields,
      })
      .select("id")
      .single();

    if (communityError || !community) {
      console.error("[Onboarding Draft] Erreur création communauté:", communityError);
      return NextResponse.json({ error: "Erreur lors de la création de la communauté" }, { status: 500 });
    }

    const { error: linkError } = await admin
      .from("profiles")
      .update({ communityId: community.id, updatedAt: new Date().toISOString() })
      .eq("id", userId);

    if (linkError) {
      await admin.from("Community").delete().eq("id", community.id);
      return NextResponse.json({ error: "Impossible de lier le profil à la communauté" }, { status: 500 });
    }

    return NextResponse.json({ success: true, communityId: community.id });
  } catch (error) {
    console.error("[Onboarding Draft] Erreur:", error);
    return NextResponse.json({ error: "Erreur lors de la création du brouillon" }, { status: 500 });
  }
}
