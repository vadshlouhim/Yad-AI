export const runtime = "nodejs";
export const maxDuration = 180;

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  PosterCompositionError,
  recordToPosterTextBlocks,
  renderTemplatePoster,
  validateTextBlocks,
  type PosterTextBlock,
} from "@/lib/templates/render";
import { getStoredShabbatTimes } from "@/lib/ai/engine";
import { getBillingGate, getBillingUsage, FREE_POSTER_LIMIT, paywallResponse } from "@/lib/billing";

function normalizeKey(key: string) {
  return key
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\s-]/g, "");
}

function formatShabbatDate(date: string) {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

function refreshBlocks(
  blocks: PosterTextBlock[],
  times: { date: string; entry: string; exit: string; hebrewDate?: string; parasha?: string },
) {
  const replacedKeys: string[] = [];
  const textBlocks = blocks.map((block) => {
    const key = normalizeKey(`${block.id} ${block.role}`);
    let text = block.text;
    if (["entree", "entry", "allumage", "candles"].some((token) => key.includes(token))) {
      text = times.entry;
    } else if (["sortie", "exit", "havdala", "motzei"].some((token) => key.includes(token))) {
      text = times.exit;
    } else if (key.includes("parasha") || key.includes("paracha")) {
      text = times.parasha ?? text;
    } else if (key.includes("hebrew") || key.includes("hebraique") || key.includes("hebreu")) {
      text = times.hebrewDate ?? text;
    } else if (key.includes("date")) {
      text = formatShabbatDate(times.date);
    }
    if (text !== block.text) replacedKeys.push(block.id);
    return { ...block, text };
  });
  return { textBlocks, replacedKeys };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const body = await request.json() as {
      templateId?: string;
      textBlocks?: unknown;
      generatedTexts?: Record<string, string>;
    };
    if (!body.templateId) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    const initialBlocks = body.textBlocks
      ? validateTextBlocks(body.textBlocks)
      : recordToPosterTextBlocks(body.generatedTexts ?? {});
    if (initialBlocks.length === 0) {
      return NextResponse.json({ error: "Aucun texte à composer" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
    if (!profile?.communityId) return NextResponse.json({ error: "Communauté introuvable" }, { status: 400 });

    const { data: template } = await admin
      .from("Template")
      .select("*")
      .eq("id", body.templateId)
      .or(`isGlobal.eq.true,communityId.eq.${profile.communityId}`)
      .single();
    if (!template) return NextResponse.json({ error: "Template introuvable" }, { status: 404 });

    const gate = await getBillingGate(admin, user.id);
    if (!gate.isPaid) {
      const usage = await getBillingUsage(admin, profile.communityId, gate.tier);
      if (usage.posterGenerations >= FREE_POSTER_LIMIT) {
        return paywallResponse(
          "poster_generations",
          "Limite atteinte pour les affiches gratuites.",
          { posterGenerations: usage.posterGenerations },
        );
      }
    }

    const { data: community } = await admin
      .from("Community")
      .select("city, timezone")
      .eq("id", profile.communityId)
      .single();
    const freshTimes = await getStoredShabbatTimes({
      city: community?.city ?? "Paris",
      timezone: community?.timezone ?? "Europe/Paris",
    });
    const refreshed = freshTimes
      ? refreshBlocks(initialBlocks, {
          date: freshTimes.date ?? "",
          entry: freshTimes.entry,
          exit: freshTimes.exit,
          hebrewDate: freshTimes.hebrewDate,
          parasha: freshTimes.parasha,
        })
      : { textBlocks: initialBlocks, replacedKeys: [] };

    const rendered = await renderTemplatePoster({
      admin,
      template,
      communityId: profile.communityId,
      textBlocks: refreshed.textBlocks,
    });
    await admin
      .from("Template")
      .update({ usageCount: (template.usageCount ?? 0) + 1, updatedAt: new Date().toISOString() })
      .eq("id", template.id);
    await admin.from("MediaFile").insert({
      id: crypto.randomUUID(),
      communityId: profile.communityId,
      userId: user.id,
      templateId: template.id,
      name: `Affiche Chabbat - ${freshTimes?.date ?? "composition"}`,
      originalName: template.name,
      url: rendered.imageUrl,
      publicId: rendered.storagePath,
      source: "TEMPLATE_GENERATION",
      type: "IMAGE",
      mimeType: "image/png",
      size: rendered.size,
      width: rendered.width,
      height: rendered.height,
      tags: ["generated", "template", "shabbat", `text-hash:${rendered.textHash}`],
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      imageUrl: rendered.imageUrl,
      textBlocks: refreshed.textBlocks,
      refreshedTexts: Object.fromEntries(refreshed.textBlocks.map((block) => [block.id, block.text])),
      replacedKeys: refreshed.replacedKeys,
      visualReport: rendered.visualReport,
      textHash: rendered.textHash,
      shabbatDate: freshTimes?.date,
      entry: freshTimes?.entry,
      exit: freshTimes?.exit,
    });
  } catch (error) {
    if (error instanceof PosterCompositionError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 422 });
    }
    console.error("[Render Shabbat] Erreur:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
