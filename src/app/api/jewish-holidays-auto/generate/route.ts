import { NextResponse } from "next/server";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getBillingGate, paywallResponse } from "@/lib/billing";
import { JEWISH_HOLIDAYS_AUTOMATION_NAME } from "@/lib/automation/jewish-holidays";
import { resolveTemplateAssetUrl } from "@/lib/templates/shared";

const PALETTES: Record<string, { bg: string; accent: string; soft: string; text: string }> = {
  violet: { bg: "#2e1065", accent: "#f4c76a", soft: "#7c3aed", text: "#ffffff" },
  blue: { bg: "#0f172a", accent: "#93c5fd", soft: "#1d4ed8", text: "#ffffff" },
  emerald: { bg: "#064e3b", accent: "#a7f3d0", soft: "#059669", text: "#ffffff" },
  rose: { bg: "#831843", accent: "#fecdd3", soft: "#e11d48", text: "#ffffff" },
  gold: { bg: "#78350f", accent: "#fde68a", soft: "#d97706", text: "#ffffff" },
  mono: { bg: "#18181b", accent: "#f4f4f5", soft: "#52525b", text: "#ffffff" },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapLines(value: string, maxChars = 28, maxLines = 10) {
  const words = value.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines;
}

function buildPosterSvg(params: {
  userText: string;
  palette: string;
  structureName: string;
  templateName?: string | null;
}) {
  const palette = PALETTES[params.palette] ?? PALETTES.violet;
  const lines = wrapLines(params.userText, 30, 12);
  const title = lines[0] ?? "";
  const body = lines.slice(1);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="1200" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.bg}"/>
      <stop offset="62%" stop-color="${palette.soft}"/>
      <stop offset="100%" stop-color="${palette.bg}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="22%" r="58%">
      <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${palette.accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="1200" fill="url(#bg)"/>
  <rect width="1200" height="1200" fill="url(#glow)"/>
  <rect x="54" y="54" width="1092" height="1092" rx="34" fill="none" stroke="${palette.accent}" stroke-width="4" opacity="0.8"/>
  <path d="M118 150 H310 M890 150 H1082 M118 1050 H310 M890 1050 H1082" stroke="${palette.accent}" stroke-width="5" stroke-linecap="round" opacity="0.75"/>
  <text x="600" y="154" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="35" font-weight="700" fill="${palette.text}" letter-spacing="8">${escapeXml(params.structureName || "EasyCom AI")}</text>
  <text x="600" y="498" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="76" font-weight="700" fill="${palette.accent}">
    ${escapeXml(title)}
  </text>
  ${body.map((line, index) => `
  <text x="600" y="${610 + index * 54}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="${index === 0 ? 700 : 500}" fill="${palette.text}" opacity="0.95">${escapeXml(line)}</text>`).join("")}
  <circle cx="600" cy="972" r="38" fill="none" stroke="${palette.accent}" stroke-width="4" opacity="0.8"/>
  <path d="M580 972 H620 M600 952 V992" stroke="${palette.accent}" stroke-width="4" stroke-linecap="round"/>
  ${params.templateName ? `<text x="600" y="1105" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="${palette.text}" opacity="0.55">Inspiration visuelle : ${escapeXml(params.templateName)}</text>` : ""}
</svg>`;
}

async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };

  const admin = createAdminClient();
  const gate = await getBillingGate(admin, user.id);
  if (!gate.isPaid) {
    return {
      error: paywallResponse("holiday_generation", "La génération d'affiches de fêtes est réservée au mode payant."),
    };
  }

  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
  if (!profile?.communityId) return { error: NextResponse.json({ error: "Communauté introuvable" }, { status: 403 }) };

  const { data: community } = await admin.from("Community").select("id, name").eq("id", profile.communityId).single();
  if (!community) return { error: NextResponse.json({ error: "Structure introuvable" }, { status: 404 }) };
  return { admin, communityId: profile.communityId, community };
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthContext();
    if ("error" in auth) return auth.error;

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const userText = typeof body.userText === "string" ? body.userText.trim() : "";
    if (!userText) return NextResponse.json({ error: "Décrivez votre affiche avant de générer." }, { status: 400 });

    const selectedTemplateId = typeof body.selectedTemplateId === "string" ? body.selectedTemplateId : "";
    let templateName: string | null = null;
    let templateImageUrl: string | null = null;

    if (selectedTemplateId) {
      const { data: template } = await auth.admin
        .from("Template")
        .select("id, name, previewUrl, thumbnailUrl, isGlobal, communityId")
        .eq("id", selectedTemplateId)
        .or(`isGlobal.eq.true,communityId.eq.${auth.communityId}`)
        .maybeSingle();
      templateName = template?.name ?? null;
      templateImageUrl = resolveTemplateAssetUrl(template?.previewUrl) ?? resolveTemplateAssetUrl(template?.thumbnailUrl);
    }

    const svg = buildPosterSvg({
      userText,
      palette: typeof body.palette === "string" ? body.palette : "violet",
      structureName: auth.community.name,
      templateName,
    });
    const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
    const storagePath = `generated-holidays/${auth.communityId}/${Date.now()}-${crypto.randomUUID()}.png`;
    const upload = await auth.admin.storage.from("templates").upload(storagePath, buffer, {
      contentType: "image/png",
      upsert: false,
    });
    if (upload.error) throw new Error(upload.error.message);

    const { data: publicData } = auth.admin.storage.from("templates").getPublicUrl(storagePath);
    const imageUrl = publicData.publicUrl;

    const { data: automation } = await auth.admin
      .from("Automation")
      .select("id, triggerConfig")
      .eq("communityId", auth.communityId)
      .eq("trigger", "JEWISH_HOLIDAY")
      .eq("name", JEWISH_HOLIDAYS_AUTOMATION_NAME)
      .order("updatedAt", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (automation && isRecord(automation.triggerConfig)) {
      const holidayPoster = isRecord(automation.triggerConfig.holidayPoster) ? automation.triggerConfig.holidayPoster : {};
      await auth.admin
        .from("Automation")
        .update({
          triggerConfig: {
            ...automation.triggerConfig,
            holidayPoster: {
              ...holidayPoster,
              generatedImageUrl: imageUrl,
              generatedAt: new Date().toISOString(),
              generationSourceTemplateUrl: templateImageUrl,
            },
          },
          updatedAt: new Date().toISOString(),
        })
        .eq("id", automation.id);
    }

    return NextResponse.json({
      imageUrl,
      promptUsed:
        "Nouvelle affiche indépendante générée uniquement avec les informations saisies par l'utilisateur. Le modèle éventuel sert de référence visuelle et n'est pas modifié.",
    });
  } catch (error) {
    console.error("[Jewish Holidays Auto Generate]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Generation impossible" }, { status: 500 });
  }
}
