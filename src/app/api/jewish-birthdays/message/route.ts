import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateContent } from "@/lib/ai/engine";

const LANGUAGES = {
  fr: "en français",
  he: "en hébreu",
  bilingual: "en français puis en hébreu",
} as const;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const admin = createAdminClient() as ReturnType<typeof createAdminClient> & {
    from: (table: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]>;
  };
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
  if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });

  const body = await request.json().catch(() => ({})) as { kind?: "birthday" | "yahrzeit"; contactId?: string; yahrzeitId?: string; language?: keyof typeof LANGUAGES };
  const language = body.language && body.language in LANGUAGES ? body.language : "fr";
  const kind = body.kind === "yahrzeit" ? "yahrzeit" : "birthday";
  if (kind === "birthday" && !body.contactId) return NextResponse.json({ error: "Contact manquant" }, { status: 400 });
  if (kind === "yahrzeit" && !body.yahrzeitId) return NextResponse.json({ error: "Yahrzeit manquant" }, { status: 400 });

  let deceasedName: string | null = null;
  let relationship: string | null = null;
  let contact: { id: string; firstName: string | null; displayName: string; phone: string | null } | null = null;
  if (kind === "birthday") {
    const result = await admin.from("CommunityMember").select("id, firstName, displayName, phone").eq("id", body.contactId).eq("communityId", profile.communityId).maybeSingle();
    contact = result.data;
  } else {
    const result = await admin.from("MemberYahrzeit").select("deceasedName, relationship, member:CommunityMember(id, firstName, displayName, phone)").eq("id", body.yahrzeitId).eq("communityId", profile.communityId).maybeSingle();
    deceasedName = result.data?.deceasedName ?? null;
    relationship = result.data?.relationship ?? null;
    const member = result.data?.member;
    contact = (Array.isArray(member) ? member[0] : member) ?? null;
  }
  if (!contact) return NextResponse.json({ error: "Contact introuvable" }, { status: 404 });

  const firstName = contact.firstName?.trim() || contact.displayName?.trim().split(/\s+/)[0] || "";
  if (!firstName) return NextResponse.json({ error: "Ajoutez le prénom de ce contact dans le CRM." }, { status: 400 });

  try {
    const result = await generateContent({
      communityId: profile.communityId,
      contentType: "GENERAL",
      customInstructions: [
        kind === "birthday"
          ? `Rédige un message personnel pour l'anniversaire juif de ${firstName}.`
          : `Rédige un message personnel à ${firstName} pour le Yahrzeit de ${deceasedName}${relationship ? ` (${relationship})` : ""}.`,
        `Langue demandée : ${LANGUAGES[language]}.`,
        "Le message doit être chaleureux, délicat et concis (2 à 4 phrases).",
        `Commence naturellement en utilisant exactement le prénom « ${firstName} ».`,
        "Propose dans ce message unique d'offrir soit le Kidouch, soit le Parnass Hayom.",
        "Formule la proposition comme une question simple et bienveillante.",
        "N’invente aucune information personnelle, aucun âge, aucune date et aucun lien.",
        "Retourne uniquement le message final, sans titre, sans explication et sans hashtag.",
      ].join("\n"),
    });
    return NextResponse.json({ message: result.body.trim(), firstName, phone: contact.phone });
  } catch (error) {
    console.error("[Jewish Birthday Message]", error);
    return NextResponse.json({ error: "David n’a pas pu préparer le message." }, { status: 500 });
  }
}

