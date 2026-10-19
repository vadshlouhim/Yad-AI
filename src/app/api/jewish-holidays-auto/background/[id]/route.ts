import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveTemplateAssetUrl } from "@/lib/templates/shared";
import { renderReusableHolidayBackground } from "@/lib/religious/poster-overlay";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: template } = await admin.from("Template").select("originalUrl,previewUrl,tags,isActive").eq("id", id).eq("category", "HOLIDAY").eq("isActive", true).contains("tags", ["usage:holiday-times", "crop:right-clean"]).maybeSingle();
  const sourceUrl = template ? resolveTemplateAssetUrl(template.originalUrl) ?? resolveTemplateAssetUrl(template.previewUrl) : null;
  if (!sourceUrl) return new NextResponse("Not found", { status: 404 });
  try {
    const image = await renderReusableHolidayBackground(sourceUrl);
    return new NextResponse(new Uint8Array(image), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600, s-maxage=86400" } });
  } catch {
    return new NextResponse("Image unavailable", { status: 502 });
  }
}
