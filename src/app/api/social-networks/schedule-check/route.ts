import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAllowedPublishTime } from "@/lib/publishing/observance-guard";

export async function GET(request: Request) {
  const requestedAt = new Date(new URL(request.url).searchParams.get("at") ?? "");
  if (Number.isNaN(requestedAt.getTime())) return NextResponse.json({ error: "INVALID_DATE" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
  if (!profile?.communityId) return NextResponse.json({ error: "COMMUNITY_NOT_FOUND" }, { status: 403 });
  const { data: community } = await admin.from("Community").select("city,country,timezone").eq("id", profile.communityId).single();
  if (!community) return NextResponse.json({ error: "COMMUNITY_NOT_FOUND" }, { status: 404 });

  const resolution = await resolveAllowedPublishTime(requestedAt, community);
  return NextResponse.json({
    adjusted: resolution.adjusted,
    reason: resolution.reason,
    publishAt: resolution.publishAt.toISOString(),
    timezone: community.timezone,
  });
}
