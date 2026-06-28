export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderTemplatePoster } from "@/lib/templates/render";
import { getStoredShabbatTimes } from "@/lib/ai/engine";
import { getBillingGate, getBillingUsage, FREE_LIMITS, paywallResponse } from "@/lib/billing";

// Normalise une clé de zone pour la comparaison
function normalizeKey(key: string) {
  return key
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[_\s-]/g, "");
}

function isEntryTimeZone(key: string) {
  const k = normalizeKey(key);
  return ["entree", "entry", "hentree", "heureentree", "debut", "candles", "allumagebougie", "allumage"].some((token) => k.includes(token));
}

function isExitTimeZone(key: string) {
  const k = normalizeKey(key);
  return ["sortie", "exit", "hsortie", "heuresortie", "havdala", "havdalah", "motzei", "finchabat", "finchabbat"].some((token) => k.includes(token));
}

function isDateZone(key: string) {
  const k = normalizeKey(key);
  return (
    k === "date" ||
    k === "datechabbat" ||
    k === "datechabat" ||
    k.startsWith("date") ||
    k.endsWith("date")
  );
}

function isParashaZone(key: string) {
  const k = normalizeKey(key);
  return k.includes("parasha") || k.includes("paracha") || k.includes("parshat") || k === "parasha";
}

function isHebrewDateZone(key: string) {
  const k = normalizeKey(key);
  return k.includes("hebraique") || k.includes("hebrew") || k.includes("datehebraique") || k === "datehebreu";
}

function formatShabbatDate(dateStr: string): string {
  try {
    const d = new Date(`${dateStr}T12:00:00`);
    return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function refreshTextsWithShabbatTimes(
  generatedTexts: Record<string, string>,
  freshTimes: { date: string; entry: string; exit: string; hebrewDate?: string; parasha?: string }
): { refreshedTexts: Record<string, string>; replacedKeys: string[] } {
  const refreshedTexts = { ...generatedTexts };
  const replacedKeys: string[] = [];

  for (const key of Object.keys(refreshedTexts)) {
    if (isEntryTimeZone(key)) {
      refreshedTexts[key] = freshTimes.entry;
      replacedKeys.push(key);
    } else if (isExitTimeZone(key)) {
      refreshedTexts[key] = freshTimes.exit;
      replacedKeys.push(key);
    } else if (isDateZone(key) && !isHebrewDateZone(key)) {
      refreshedTexts[key] = formatShabbatDate(freshTimes.date);
      replacedKeys.push(key);
    } else if (isParashaZone(key) && freshTimes.parasha) {
      refreshedTexts[key] = freshTimes.parasha;
      replacedKeys.push(key);
    } else if (isHebrewDateZone(key) && freshTimes.hebrewDate) {
      refreshedTexts[key] = freshTimes.hebrewDate;
      replacedKeys.push(key);
    }
  }

  // Fallback : si aucun champ n'a été remplacé, chercher les valeurs qui ressemblent à HH:MM
  if (replacedKeys.length === 0) {
    const timeRegex = /^\d{1,2}[h:]\d{2}$/;
    const entryRegex = /entrée|entree|entry|allumage/i;
    const exitRegex = /sortie|exit|havdala/i;

    for (const key of Object.keys(refreshedTexts)) {
      const val = refreshedTexts[key];
      if (timeRegex.test(val.trim())) {
        if (entryRegex.test(key)) {
          refreshedTexts[key] = freshTimes.entry;
          replacedKeys.push(key);
        } else if (exitRegex.test(key)) {
          refreshedTexts[key] = freshTimes.exit;
          replacedKeys.push(key);
        }
      }
    }
  }

  return { refreshedTexts, replacedKeys };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    if (!process.env.FAL_KEY) {
      return NextResponse.json({ error: "FAL_KEY manquant" }, { status: 500 });
    }

    const body = await request.json() as { templateId?: string; generatedTexts?: Record<string, string> };
    const { templateId, generatedTexts } = body;

    if (!templateId || !generatedTexts || typeof generatedTexts !== "object") {
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    }

    const admin = createAdminClient();
    const [{ data: profile }, templateResult] = await Promise.all([
      admin.from("profiles").select("communityId").eq("id", user.id).single(),
      admin.from("Template").select("*").eq("id", templateId).single(),
    ]);

    if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 400 });
    if (!templateResult.data) return NextResponse.json({ error: "Template introuvable" }, { status: 404 });

    const gate = await getBillingGate(admin, user.id);
    if (!gate.isPaid) {
      const usage = await getBillingUsage(admin, profile.communityId);
      if (usage.posterGenerations >= FREE_LIMITS.posterGenerations) {
        return paywallResponse("poster_generations", "Limite atteinte pour les affiches gratuites.", { posterGenerations: usage.posterGenerations });
      }
    }

    const { data: community } = await admin
      .from("Community")
      .select("city, timezone")
      .eq("id", profile.communityId)
      .single();

    // Re-fetch les vrais horaires de Chabbat actuels
    const freshTimes = await getStoredShabbatTimes({
      city: community?.city ?? "Paris",
      timezone: community?.timezone ?? "Europe/Paris",
    });

    if (!freshTimes) {
      // Si impossible de récupérer les horaires, on rend quand même avec les textes existants
      const rendered = await renderTemplatePoster({
        admin,
        template: templateResult.data,
        communityId: profile.communityId,
        generatedTexts,
      });
      return NextResponse.json({ imageUrl: rendered.imageUrl, refreshedTexts: generatedTexts, replacedKeys: [] });
    }

    const { refreshedTexts, replacedKeys } = refreshTextsWithShabbatTimes(generatedTexts, {
      date: freshTimes.date ?? "",
      entry: freshTimes.entry,
      exit: freshTimes.exit,
      hebrewDate: freshTimes.hebrewDate,
      parasha: freshTimes.parasha,
    });

    const rendered = await renderTemplatePoster({
      admin,
      template: templateResult.data,
      communityId: profile.communityId,
      generatedTexts: refreshedTexts,
    });

    await admin
      .from("Template")
      .update({ usageCount: (templateResult.data.usageCount ?? 0) + 1, updatedAt: new Date().toISOString() })
      .eq("id", templateId);

    await admin.from("MediaFile").insert({
      id: crypto.randomUUID(),
      communityId: profile.communityId,
      userId: user.id,
      templateId,
      name: `Affiche Chabbat — ${freshTimes.date}`,
      originalName: templateResult.data.name,
      url: rendered.imageUrl,
      publicId: rendered.storagePath,
      source: "TEMPLATE_GENERATION",
      type: "IMAGE",
      mimeType: "image/png",
      size: 0,
      tags: ["generated", "template", "shabbat"],
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      imageUrl: rendered.imageUrl,
      refreshedTexts,
      replacedKeys,
      shabbatDate: freshTimes.date,
      entry: freshTimes.entry,
      exit: freshTimes.exit,
    });
  } catch (error) {
    console.error("[Render Shabbat] Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
