import { NextResponse } from "next/server";
import { canManageCommunity, getCommunityApiContext } from "@/lib/auth/community-api";
import { syncUnisoftCommunity } from "@/lib/unisoft/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  const context = await getCommunityApiContext();
  if (!context) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!canManageCommunity(context.role)) return NextResponse.json({ error: "Action réservée aux administrateurs." }, { status: 403 });
  try {
    return NextResponse.json(await syncUnisoftCommunity(context.communityId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Synchronisation impossible." }, { status: 502 });
  }
}
