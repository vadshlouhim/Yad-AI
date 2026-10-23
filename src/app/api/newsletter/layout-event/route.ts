import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseOutputLocale } from "@/lib/ai/output-locale";

export const runtime = "nodejs";

/** Records when the newsletter layout needed its safety net, so the team can follow up. */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse(null, { status: 204 });
    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    const event = {
      pageCount: Math.min(20, Math.max(0, Number(body?.pageCount) || 0)),
      omittedMedia: Math.min(50, Math.max(0, Number(body?.omittedMedia) || 0)),
      flowFallback: body?.flowFallback === true,
      oversizedBlocks: Array.isArray(body?.oversizedBlocks)
        ? body.oversizedBlocks.filter((id): id is string => typeof id === "string").map(id => id.slice(0, 100)).slice(0, 20)
        : [],
      outputLocale: parseOutputLocale(body?.outputLocale),
    };
    console.warn("[Newsletter layout fallback]", { communityId: profile?.communityId, ...event });
    await admin.from("AuditLog").insert({
      id: crypto.randomUUID(),
      userId: user.id,
      communityId: profile?.communityId ?? null,
      action: "newsletter.layout_fallback",
      resource: "Newsletter",
      newData: event,
    });
  } catch (error) {
    console.error("[Newsletter layout event]", error);
  }
  // Logging must never surface to the user.
  return new NextResponse(null, { status: 204 });
}
