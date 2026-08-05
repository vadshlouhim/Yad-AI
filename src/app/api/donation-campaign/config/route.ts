import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import OpenAI from "openai";
import type { DonationCampaignBrief, ConversationMessage, StepType, AssetType, CampaignChannel } from "@/lib/donation-campaign";
import { notifyUser } from "@/lib/notifications/notify";
import { createNotificationOnce } from "@/lib/notifications/create-once";

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY!,
});

async function getAuthorizedProfile(userId: string) {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("communityId")
    .eq("id", userId)
    .single();
  return profile;
}

function buildSystemPrompt(communityName: string, tone: string | null) {
  return `Tu es l'assistant IA de EasyCom AI, expert en campagnes de dons pour les communautés juives francophones (synagogues, Beth Habad, associations).

Tu aides ${communityName} à construire une campagne de dons complète, étape par étape, à travers une conversation naturelle.

Tu dois rassembler les informations dans cet ordre, une à deux questions à la fois :
1. Dates de campagne (début et fin)
2. Informations de campagne (nom, objectif de collecte, montant déjà collecté si connu, lien de don)
3. Identité (nom de l'association/structure, nom du rabbin si pertinent)
4. Message (slogan — propose-en 3 si l'utilisateur n'en a pas, ton souhaité, thème, cause)
5. Canaux (WhatsApp, Instagram, Facebook, Email, SMS)
6. Mode de publication (après validation ou automatique)

Règles absolues :
- Une ou deux questions maximum à la fois
- Ton chaleureux, professionnel, adapté aux communautés juives
- Ne jamais inventer de données religieuses
- Langue : français uniquement
- Ton de la structure : ${tone ?? "chaleureux et communautaire"}

Quand tu as toutes les informations nécessaires (au minimum : dates, nom de campagne, un canal, et un slogan ou cause), propose de générer le plan en écrivant exactement :
###PLAN_READY###

Quand tu proposes des slogans, liste-les exactement comme ceci :
###SLOGANS###
1. [slogan 1]
2. [slogan 2]
3. [slogan 3]
###END_SLOGANS###

Quand ta question peut être répondue par UN SEUL choix (Oui/Non, ton, mode de publication, montant), utilise les réponses rapides simples APRÈS ta question :
###QUICK_REPLIES###
["option 1", "option 2", "option 3"]
###END_QUICK_REPLIES###

Exemples de réponses rapides SIMPLES (un seul choix) :
- Oui / Non → ["Oui", "Non"]
- Ton → ["Chaleureux", "Professionnel", "Percutant", "Émouvant"]
- Mode de publication → ["Après validation manuelle", "Automatique"]
- Montant → ["5 000 €", "10 000 €", "20 000 €", "Autre montant"]

Quand ta question permet PLUSIEURS choix (canaux de diffusion, jours, types de contenu), utilise les réponses rapides MULTI-SÉLECTION :
###QUICK_REPLIES_MULTI###
["option 1", "option 2", "option 3"]
###END_QUICK_REPLIES_MULTI###

Exemples de réponses rapides MULTI (plusieurs choix possibles) :
- Canaux → ["WhatsApp", "Instagram", "Facebook", "Email", "SMS"]

N'utilise jamais les réponses rapides quand la réponse est libre (dates, noms, texte ouvert).

Pour expliquer le mode automatique, dis : "Si vous choisissez le mode automatique, les contenus validés dans ce plan pourront être publiés automatiquement sur tous les canaux sélectionnés. Vous devrez valider le plan une première fois avant l'activation finale."`;
}

function extractBriefFromConversation(messages: ConversationMessage[]): Partial<DonationCampaignBrief> {
  const conversation = messages.map((m) => `${m.role === "user" ? "Utilisateur" : "Assistant"}: ${m.content}`).join("\n");
  return { _raw: conversation } as unknown as Partial<DonationCampaignBrief>;
}

async function extractStructuredBrief(
  messages: ConversationMessage[],
  communityName: string
): Promise<Partial<DonationCampaignBrief>> {
  const conversation = messages.map((m) => `${m.role === "user" ? "Utilisateur" : "Assistant"}: ${m.content}`).join("\n\n");

  const extractPrompt = `À partir de cette conversation sur une campagne de dons pour "${communityName}", extrais les informations en JSON (null si non mentionné) :

${conversation}

Réponds UNIQUEMENT avec un objet JSON valide :
{
  "title": "nom de la campagne ou null",
  "slogan": "slogan choisi ou null",
  "theme": "thème général ou null",
  "cause": "objectif / cause ou null",
  "tone": "ton choisi ou null",
  "objective_amount": nombre ou null,
  "collected_amount": nombre ou null,
  "donation_url": "URL ou null",
  "organization_name": "nom association ou null",
  "rabbi_name": "nom rabbin ou null",
  "channels": ["WhatsApp", "Instagram"] ou [],
  "publication_mode": "after_validation" ou "automatic" ou null,
  "email_enabled": true ou false,
  "sms_enabled": true ou false,
  "start_date": "YYYY-MM-DD ou null",
  "end_date": "YYYY-MM-DD ou null"
}`;

  try {
    const completion = await openrouter.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: extractPrompt }],
      max_tokens: 600,
      temperature: 0.1,
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch {
    return {};
  }
}

function generateDefaultSteps(brief: Partial<DonationCampaignBrief>): Array<{
  step_date: string;
  step_label: string;
  step_type: StepType;
  visual_type: AssetType;
  selected_channels: CampaignChannel[];
}> {
  const start = brief.start_date ? new Date(brief.start_date) : new Date();
  const end = brief.end_date ? new Date(brief.end_date) : new Date(start.getTime() + 14 * 86400000);
  const channels = (brief.channels ?? ["WhatsApp"]) as CampaignChannel[];

  const addDays = (d: Date, n: number) => {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r.toISOString().split("T")[0];
  };

  const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000);
  const midPoint = Math.floor(totalDays / 2);

  const steps = [
    { step_date: addDays(start, 0), step_label: "Lancement de la campagne", step_type: "launch" as StepType, visual_type: "square_poster" as AssetType, selected_channels: channels },
    { step_date: addDays(start, Math.min(3, totalDays - 1)), step_label: "Premier rappel", step_type: "reminder" as StepType, visual_type: "whatsapp_text" as AssetType, selected_channels: channels.filter((c) => c === "WhatsApp" || c === "Instagram") },
    { step_date: addDays(start, midPoint), step_label: "Relance intermédiaire", step_type: "relay" as StepType, visual_type: "social_post" as AssetType, selected_channels: channels },
    { step_date: addDays(end, -3), step_label: "Dernière ligne droite", step_type: "final_push" as StepType, visual_type: "whatsapp_text" as AssetType, selected_channels: channels },
    { step_date: addDays(end, 0), step_label: "Clôture de la campagne", step_type: "closing" as StepType, visual_type: "square_poster" as AssetType, selected_channels: channels },
    { step_date: addDays(end, 2), step_label: "Message de remerciement", step_type: "thank_you" as StepType, visual_type: "whatsapp_text" as AssetType, selected_channels: channels.filter((c) => c === "WhatsApp" || c === "Email") },
  ];

  return steps.filter((s) => s.step_date >= start.toISOString().split("T")[0]);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const profile = await getAuthorizedProfile(user.id);
  if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });
  const { communityId } = profile;

  const admin = createAdminClient();
  const { data: community } = await admin
    .from("Community")
    .select("name, tone")
    .eq("id", communityId)
    .single();

  const body = await request.json() as Record<string, unknown>;
  const { action } = body;

  // ── continue-assistant ──────────────────────────────────────────────
  if (action === "continue-assistant") {
    const messages = (body.messages as ConversationMessage[]) ?? [];
    const communityName = community?.name ?? "votre communauté";

    const completion = await openrouter.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: buildSystemPrompt(communityName, community?.tone ?? null) },
        ...messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      max_tokens: 600,
      temperature: 0.6,
    });

    const text = completion.choices[0]?.message?.content ?? "";
    const planReady = text.includes("###PLAN_READY###");
    const cleanText = text.replace("###PLAN_READY###", "").trim();

    const slogans: string[] = [];
    const slogansMatch = cleanText.match(/###SLOGANS###([\s\S]*?)###END_SLOGANS###/);
    if (slogansMatch) {
      const lines = slogansMatch[1].split("\n").filter((l) => l.trim());
      for (const line of lines) {
        const m = line.match(/^\d+\.\s+(.+)/);
        if (m) slogans.push(m[1].trim());
      }
    }

    let quickReplies: string[] = [];
    const quickMatch = cleanText.match(/###QUICK_REPLIES###([\s\S]*?)###END_QUICK_REPLIES###/);
    if (quickMatch) {
      try {
        const parsed = JSON.parse(quickMatch[1].trim());
        if (Array.isArray(parsed)) quickReplies = parsed.map(String).filter(Boolean);
      } catch { /* ignore malformed JSON */ }
    }

    let quickRepliesMulti: string[] = [];
    const quickMultiMatch = cleanText.match(/###QUICK_REPLIES_MULTI###([\s\S]*?)###END_QUICK_REPLIES_MULTI###/);
    if (quickMultiMatch) {
      try {
        const parsed = JSON.parse(quickMultiMatch[1].trim());
        if (Array.isArray(parsed)) quickRepliesMulti = parsed.map(String).filter(Boolean);
      } catch { /* ignore malformed JSON */ }
    }

    const displayText = cleanText
      .replace(/###SLOGANS###[\s\S]*?###END_SLOGANS###/, "")
      .replace(/###QUICK_REPLIES###[\s\S]*?###END_QUICK_REPLIES###/, "")
      .replace(/###QUICK_REPLIES_MULTI###[\s\S]*?###END_QUICK_REPLIES_MULTI###/, "")
      .trim();

    return NextResponse.json({ message: displayText, planReady, slogans, quickReplies, quickRepliesMulti });
  }

  // ── generate-plan ───────────────────────────────────────────────────
  if (action === "generate-plan") {
    const messages = (body.messages as ConversationMessage[]) ?? [];
    const briefOverride = (body.brief as Partial<DonationCampaignBrief>) ?? {};

    const extractedBrief = await extractStructuredBrief(messages, community?.name ?? "");
    const brief: Partial<DonationCampaignBrief> = { ...extractedBrief, ...briefOverride };

    const campaignPayload = {
      id: crypto.randomUUID(),
      communityId,
      title: brief.title ?? `Campagne de dons ${new Date().getFullYear()}`,
      slogan: brief.slogan ?? null,
      theme: brief.theme ?? null,
      cause: brief.cause ?? null,
      tone: brief.tone ?? null,
      objective_amount: brief.objective_amount ?? null,
      collected_amount: brief.collected_amount ?? null,
      donation_url: brief.donation_url ?? null,
      organization_name: brief.organization_name ?? community?.name ?? null,
      rabbi_name: brief.rabbi_name ?? null,
      channels: brief.channels ?? ["WhatsApp"],
      publication_mode: brief.publication_mode ?? "after_validation",
      email_enabled: brief.email_enabled ?? false,
      sms_enabled: brief.sms_enabled ?? true,
      status: "draft",
      start_date: brief.start_date ?? null,
      end_date: brief.end_date ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: campaign, error: campaignError } = await admin
      .from("donation_campaigns")
      .insert(campaignPayload)
      .select()
      .single();

    if (campaignError) {
      if (
        campaignError.code === "42P01" ||
        campaignError.code === "PGRST205" ||
        campaignError.message?.includes("does not exist") ||
        campaignError.message?.includes("schema cache")
      ) {
        return NextResponse.json(
          { error: "Tables SQL manquantes ou cache PostgREST non rechargé — exécutez la section 9 du bootstrap.sql dans Supabase, puis rechargez le schéma : NOTIFY pgrst, 'reload schema';" },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: campaignError.message, code: campaignError.code, details: campaignError.details }, { status: 400 });
    }

    const stepsData = generateDefaultSteps(brief);
    const stepsPayload = stepsData.map((s) => ({
      id: crypto.randomUUID(),
      campaign_id: campaign!.id,
      communityId,
      ...s,
      status: "to_prepare",
      requires_validation: campaignPayload.publication_mode === "after_validation",
      scheduled_publish_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { data: steps } = await admin.from("donation_campaign_steps").insert(stepsPayload).select();

    await admin.from("donation_campaign_ai_sessions").insert({
      id: crypto.randomUUID(),
      campaign_id: campaign!.id,
      communityId,
      conversation_payload: messages,
      generated_plan: { steps: stepsData },
      generated_slogans: body.slogans ?? [],
      generated_theme: brief.theme ?? null,
      generated_assets: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ campaign, steps: steps ?? [] });
  }

  // ── update-step-status ──────────────────────────────────────────────
  if (action === "update-step-status") {
    const { stepId, status } = body as { stepId: string; status: string };
    const { error } = await admin
      .from("donation_campaign_steps")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", stepId)
      .eq("communityId", communityId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  // ── validate-plan ───────────────────────────────────────────────────
  if (action === "validate-plan") {
    const { campaignId } = body as { campaignId: string };
    const { error } = await admin
      .from("donation_campaigns")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .eq("id", campaignId)
      .eq("communityId", communityId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  // ── generate-whatsapp-text ──────────────────────────────────────────
  if (action === "generate-whatsapp-text") {
    const { stepLabel, campaignTitle, slogan, donationUrl } = body as Record<string, string>;
    const prompt = `Rédige un message WhatsApp court et percutant pour cette étape de campagne de dons :
Étape : ${stepLabel}
Campagne : ${campaignTitle}
${slogan ? `Slogan : ${slogan}` : ""}
${donationUrl ? `Lien de don : ${donationUrl}` : ""}

Règles absolues :
- Court (3-5 lignes max)
- Accroche avec emoji en première ligne
- Appel à l'action clair
- Inclure le lien si fourni
- Style chaleureux et mobilisateur
- Uniquement en français
- JAMAIS de ** ni de * ni de # — texte brut uniquement, aucun markdown

Réponds UNIQUEMENT avec le texte du message, sans guillemets.`;

    const completion = await openrouter.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.7,
    });
    return NextResponse.json({ text: completion.choices[0]?.message?.content?.trim() ?? "" });
  }

  // ── generate-sms-text ───────────────────────────────────────────────
  if (action === "generate-sms-text") {
    const { stepLabel, campaignTitle, donationUrl } = body as Record<string, string>;
    const prompt = `Rédige un SMS ultra-court pour cette étape de campagne de dons :
Étape : ${stepLabel}
Campagne : ${campaignTitle}
${donationUrl ? `Lien : ${donationUrl}` : ""}

Règles absolues :
- Maximum 160 caractères (idéalement 120-140 avec un lien)
- Direct, percutant, appel à l'action
- En français
- JAMAIS de ** ni de * — texte brut uniquement, aucun markdown
- Un seul message, sans guillemets ni commentaires`;

    const completion = await openrouter.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 120,
      temperature: 0.6,
    });
    return NextResponse.json({ text: completion.choices[0]?.message?.content?.trim() ?? "" });
  }

  // ── generate-social-post ───────────────────────────────────────────────
  if (action === "generate-social-post") {
    const { stepLabel, campaignTitle, slogan, donationUrl } = body as Record<string, string>;
    const prompt = `Rédige une publication pour Facebook et Instagram pour cette étape de campagne de dons :
Étape : ${stepLabel}
Campagne : ${campaignTitle}
${slogan ? `Slogan : ${slogan}` : ""}
${donationUrl ? `Lien de don : ${donationUrl}` : ""}

Règles absolues :
- Texte engageant, 3-5 lignes maximum
- Accroche forte avec emoji en première ligne
- Appel à l'action clair
- Inclure le lien si fourni
- Terminer par 3-5 hashtags pertinents en français (précédés de #)
- Style chaleureux, communautaire et mobilisateur
- Uniquement en français
- Texte brut pour le corps principal (jamais de ** ni de formatage markdown)
- Les hashtags commencent par # (c'est normal pour les réseaux sociaux)

Réponds UNIQUEMENT avec le texte de la publication, sans guillemets ni commentaires.`;

    const completion = await openrouter.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 350,
      temperature: 0.7,
    });
    return NextResponse.json({ text: completion.choices[0]?.message?.content?.trim() ?? "" });
  }

  // ── save-asset ──────────────────────────────────────────────────────────
  if (action === "save-asset") {
    const { campaignId, stepId, assetType, textContent, title } = body as Record<string, string>;
    const { data: existing } = await admin
      .from("donation_campaign_assets")
      .select("id")
      .eq("step_id", stepId)
      .eq("asset_type", assetType)
      .maybeSingle();
    let saveResult;
    if (existing?.id) {
      saveResult = await admin
        .from("donation_campaign_assets")
        .update({ text_content: textContent, status: "generated", updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single();
    } else {
      saveResult = await admin
        .from("donation_campaign_assets")
        .insert({
          id: crypto.randomUUID(),
          campaign_id: campaignId,
          step_id: stepId,
          asset_type: assetType,
          title,
          text_content: textContent,
          status: "generated",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
    }
    if (saveResult.error) return NextResponse.json({ error: saveResult.error.message }, { status: 400 });
    return NextResponse.json({ asset: saveResult.data });
  }

  // ── schedule-step ───────────────────────────────────────────────────────
  if (action === "schedule-step") {
    const { stepId, campaignId, scheduledAt, stepLabel } = body as Record<string, string>;
    const { error: stepError } = await admin
      .from("donation_campaign_steps")
      .update({ status: "scheduled", scheduled_publish_at: scheduledAt, updated_at: new Date().toISOString() })
      .eq("id", stepId)
      .eq("communityId", communityId);
    if (stepError) return NextResponse.json({ error: stepError.message }, { status: 400 });
    const { data: camp } = await admin.from("donation_campaigns").select("title").eq("id", campaignId).single();
    const scheduledDate = new Date(scheduledAt).toLocaleString("fr-FR", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
    const title = `📅 Étape programmée — ${stepLabel}`;
    const body = `L'étape "${stepLabel}" de la campagne "${camp?.title ?? "de dons"}" est programmée pour le ${scheduledDate}.`;
    const created = await createNotificationOnce(admin, {
      userId: user.id,
      communityId,
      type: "PUBLICATION_SCHEDULED",
      title,
      body,
      link: "/dashboard/donation-campaign/visuals",
      data: { stepId, campaignId, scheduledAt },
      dedupeKey: `donation-schedule:${stepId}:${scheduledAt}`,
    });
    if (created) {
      await notifyUser(admin, user.id, {
        title: `📅 Étape programmée — ${stepLabel}`,
        body: `L'étape "${stepLabel}" est programmée pour le ${scheduledDate}. Vous recevrez un rappel à cette heure.`,
        link: "/dashboard/donation-campaign/visuals",
      });
    }
    return NextResponse.json({ success: true });
  }

  // ── mark-step-published ─────────────────────────────────────────────────
  if (action === "mark-step-published") {
    const { stepId } = body as { stepId: string };
    const { error } = await admin
      .from("donation_campaign_steps")
      .update({ status: "published", updated_at: new Date().toISOString() })
      .eq("id", stepId)
      .eq("communityId", communityId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await admin
      .from("donation_campaign_assets")
      .update({ status: "published", updated_at: new Date().toISOString() })
      .eq("step_id", stepId);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const profile = await getAuthorizedProfile(user.id);
  if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 403 });
  const { communityId } = profile;

  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaignId");

  const admin = createAdminClient();

  if (campaignId) {
    const [{ data: campaign }, { data: steps }, { data: assets }] = await Promise.all([
      admin.from("donation_campaigns").select("*").eq("id", campaignId).eq("communityId", communityId).single(),
      admin.from("donation_campaign_steps").select("*").eq("campaign_id", campaignId).eq("communityId", communityId).order("step_date"),
      admin.from("donation_campaign_assets").select("*").eq("campaign_id", campaignId).order("created_at"),
    ]);
    return NextResponse.json({ campaign, steps: steps ?? [], assets: assets ?? [] });
  }

  const { data: campaigns, error } = await admin
    .from("donation_campaigns")
    .select("*")
    .eq("communityId", communityId)
    .in("status", ["draft", "active", "pending_validation"])
    .order("created_at", { ascending: false })
    .limit(1);

  if (error?.code === "42P01") return NextResponse.json({ campaign: null, steps: [] });

  const latest = campaigns?.[0] ?? null;
  if (!latest) return NextResponse.json({ campaign: null, steps: [] });

  const { data: steps } = await admin
    .from("donation_campaign_steps")
    .select("*")
    .eq("campaign_id", latest.id)
    .eq("communityId", communityId)
    .order("step_date");

  return NextResponse.json({ campaign: latest, steps: steps ?? [] });
}
