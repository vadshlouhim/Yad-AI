import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("CommunityRhythm")
    .select("id, name, slug, description, isActive, sortOrder")
    .eq("isActive", true)
    .order("sortOrder", { ascending: true })
    .order("name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
