export const runtime = "nodejs";
export const maxDuration = 180;

import { getShabbatTimes } from "@/lib/automation/hebcal";
import { getPosterSource, trustedCommunityLogo, trustedStoredCommunityLogo, logoEditInstructions } from "@/lib/templates/edit-source";
import { readPosterEditState } from "@/lib/templates/edit-state";
import { describeLogoZone, getTemplateLogoZone } from "@/lib/templates/logo-zone";
import { NextResponse } from "next/server";
import { getBillingGate, paywallResponse } from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { editTemplatePosterWithFal, type PosterChange } from "@/lib/templates/fal-edit";
import { parseOutputLocale, outputIntlLocale } from "@/lib/ai/output-locale";

function changesFromLegacyBody(body: Record<string, unknown>): PosterChange[] {
  if (Array.isArray(body.textBlocks)) {
    return body.textBlocks.slice(0, 20).flatMap((item, index) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const block = item as Record<string, unknown>;
      const newText = typeof block.text === "string" ? block.text.trim() : "";
      if (!newText) return [];
      return [{
        label: typeof block.role === "string" ? block.role : `Texte ${index + 1}`,
        currentText: "",
        newText: newText.slice(0, 500),
      }];
    });
  }
  if (body.generatedTexts && typeof body.generatedTexts === "object" && !Array.isArray(body.generatedTexts)) {
    return Object.entries(body.generatedTexts as Record<string, unknown>).slice(0, 20).flatMap(([label, value]) => {
      const newText = typeof value === "string" ? value.trim() : "";
      return newText ? [{ label, currentText: "", newText: newText.slice(0, 500) }] : [];
    });
  }
  return [];
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    const body = await request.json() as Record<string, unknown>;
    const templateId = typeof body.templateId === "string" ? body.templateId : "";
    const changes = changesFromLegacyBody(body);
    const customInstructions = typeof body.customInstructions === "string"
      ? body.customInstructions.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 800)
      : "";

    const structureName = changes.find((change) => change.label === "organization")?.newText;
    if (!templateId || changes.length === 0) return NextResponse.json({ error: "Données invalides" }, { status: 400 });

    const admin = createAdminClient();
    const gate = await getBillingGate(admin, user.id);
    if (!gate.communityId) return NextResponse.json({ error: "Communauté non configurée" }, { status: 400 });
    if (!gate.isPaid) return paywallResponse("poster_generations");
    const { data: template } = await admin.from("Template").select("*").eq("id", templateId)
      .or(`isGlobal.eq.true,communityId.eq.${gate.communityId}`).single();
    if (!template) return NextResponse.json({ error: "Template introuvable" }, { status: 404 });
    const source = await getPosterSource(admin, gate.communityId, body.sourceMediaId);
    if (source && source.templateId !== template.id) return NextResponse.json({ error: "Modèle source incompatible." }, { status: 400 });
    const requestedLogoUrl = trustedCommunityLogo(body.logoUrl, gate.communityId);
    const { data: communityIdentity } = await admin
      .from("Community")
      .select("logoUrl")
      .eq("id", gate.communityId)
      .single();
    const storedLogoUrl = trustedStoredCommunityLogo(communityIdentity?.logoUrl);
    const isExactStoredLogo = typeof body.logoUrl === "string"
      && body.logoUrl === communityIdentity?.logoUrl
      && Boolean(storedLogoUrl);
    if (body.logoUrl && !requestedLogoUrl && !isExactStoredLogo) {
      return NextResponse.json({ error: "Logo inaccessible." }, { status: 400 });
    }
    // The logo chosen in the dialog always wins; the community's saved logo is only a fallback.
    const logoUrl = body.shabbat === true
      ? requestedLogoUrl ?? storedLogoUrl
      : requestedLogoUrl;
    const logoZone = getTemplateLogoZone(template);
    // The source may be the user's previous poster, which already carries an older logo there.
    const logoArea = logoZone ? `the logo area (${describeLogoZone(logoZone)})` : "the top-right corner";
    let shabbatDate: string | undefined;
    const outputLocale = parseOutputLocale(body.outputLocale, "fr");
    if (body.shabbat === true) {
      const { data: community } = await admin.from("Community").select("city, country, timezone").eq("id", gate.communityId).single();
      const city = changes.find((change) => change.label === "location")?.newText ?? community?.city ?? undefined;
      const times = await getShabbatTimes({ city, country: community?.country ?? undefined, timezone: community?.timezone ?? undefined, outputLocale });
      if (!times?.entry || !times.exit || !times.parasha) return NextResponse.json({ error: "Impossible d’actualiser les horaires. Vérifiez la ville et réessayez." }, { status: 422 });
      shabbatDate = times.date;
      const fresh: Record<string, string> = { parasha: times.parasha, "entry time": times.entry, "exit time": times.exit, location: city ?? "" };
      for (const change of changes) if (fresh[change.label]) change.newText = fresh[change.label];
      changes.push({ label: "Date", currentText: "", newText: new Date(`${times.date}T12:00:00Z`).toLocaleDateString(outputIntlLocale(outputLocale), { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) });
    }
    const previous = readPosterEditState(source?.editState);
    for (const change of changes) change.currentText = previous?.changes.find((old) => old.label === change.label)?.newText ?? change.currentText;

    const edited = await editTemplatePosterWithFal({
      admin,
      template,
      communityId: gate.communityId,
      userId: user.id,
      changes,
      sourceImageUrl: source?.url,
      editState: { version: 1, templateId: template.id, sourceMediaId: source?.id ?? null, changes: previous?.changes ?? [], textsToRemove: [], logoUrl, shabbatDate },
      referenceImageUrls: body.shabbat !== true && logoUrl ? [logoUrl] : undefined,
      overlayLogoUrl: body.shabbat === true && logoUrl ? logoUrl : undefined,
      overlayLogoZone: logoZone,
      overlayLogoWhitePlate: body.shabbat === true,
      editInstructions: [
        "NON-NEGOTIABLE BRANDING REQUIREMENTS:",
        body.shabbat === true && logoUrl
          ? `Completely erase any existing logo, emblem, logo placeholder, white box or sticker inside ${logoArea}, and fill that area with the surrounding background so it looks clean and empty. Keep it free of any text or drawing: the exact official logo will be composited there after generation.`
          : logoEditInstructions(logoUrl),
        body.shabbat === true
          ? "Never write any source, credit or attribution line for the times (for example \"Chabad.org\" or \"Shabbat times provided by…\"), and remove any such line already on the image."
          : "",
        body.shabbat === true
          ? "GRAPHIC COHERENCE FOR THIS SHABBAT POSTER: derive the text styling from the template's existing dominant palette. Use no more than two text colours: one dark, highly legible primary colour for essential information and one existing template accent colour for emphasis. Keep the same semantic role in the same colour throughout. Never introduce unrelated purple, blue, red or decorative colours. Maintain strong contrast against every local background, a clear hierarchy, consistent type weight, balanced spacing and aligned text blocks. The organization name, title, location, dates, labels and times must read as one intentional visual system."
          : "",
        structureName
          ? `The official organization name is "${structureName}". It is mandatory: reproduce it exactly, clearly and legibly once on the final poster. Never omit, abbreviate, translate or alter it.`
          : "The organization name provided in the confirmed content is mandatory and must never be omitted or altered.",
        body.shabbat === true && logoUrl
          ? "The official logo is applied after image generation. Do not invent, redraw or duplicate it."
          : logoUrl
          ? "The second reference image is the community's official logo. Its presence is mandatory: add that exact logo once, fully visible, in a discreet existing branding area. Never ignore, redraw, crop, distort, recolor or replace it, and never write its URL as text."
          : "No separate official logo reference was supplied; do not invent one.",
        customInstructions
          ? `OPTIONAL USER PREFERENCE: ${customInstructions}. Apply it only when it is compatible with the confirmed text, legibility, the original template, and every non-negotiable requirement above.`
          : "No additional user preference was supplied.",
      ].filter(Boolean).join("\n"),
        });
    await admin.from("Template").update({ usageCount: (template.usageCount ?? 0) + 1, updatedAt: new Date().toISOString() }).eq("id", template.id);
    return NextResponse.json({ imageUrl: edited.imageUrl, mediaId: edited.mediaId, shabbatDate, usedTextBlocks: body.textBlocks ?? [], generatedTexts: body.generatedTexts ?? {}, warnings: [] });
  } catch (error) {
    console.error("[Template Fal Render]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Modification impossible" }, { status: 500 });
  }
}
