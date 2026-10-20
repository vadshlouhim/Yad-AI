import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parseNewsletterLabels } from "@/lib/newsletter/labels";

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ code: "UNAUTHENTICATED" }, { status: 401 });

    const body = await request.json().catch(() => ({})) as { donationUrl?: unknown; newsletterLabels?: unknown };
    const hasDonationUrl = Object.prototype.hasOwnProperty.call(body, "donationUrl");
    const hasNewsletterLabels = Object.prototype.hasOwnProperty.call(body, "newsletterLabels");
    if (!hasDonationUrl && !hasNewsletterLabels) return NextResponse.json({ code: "INVALID_REQUEST" }, { status: 400 });
    const donationUrl = typeof body.donationUrl === "string" ? body.donationUrl.trim() : "";
    if (hasDonationUrl && donationUrl) {
      try {
        const parsed = new URL(donationUrl);
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("protocol");
      } catch {
        return NextResponse.json({ code: "INVALID_DONATION_URL" }, { status: 400 });
      }
    }

    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("communityId").eq("id", user.id).single();
    if (!profile?.communityId) return NextResponse.json({ code: "COMMUNITY_UNAVAILABLE" }, { status: 403 });

    const { data: community } = await admin.from("Community").select("vocabulary").eq("id", profile.communityId).single();
    const vocabulary = community?.vocabulary && typeof community.vocabulary === "object" && !Array.isArray(community.vocabulary)
      ? community.vocabulary as Record<string, unknown>
      : {};
    const newsletterLabels = hasNewsletterLabels ? parseNewsletterLabels(body.newsletterLabels) : parseNewsletterLabels(vocabulary.newsletterLabels);
    const nextVocabulary = {
      ...vocabulary,
      ...(hasDonationUrl ? { donationUrl: donationUrl || null } : {}),
      ...(hasNewsletterLabels ? { newsletterLabels } : {}),
    };
    const { error } = await admin.from("Community").update({ vocabulary: nextVocabulary, updatedAt: new Date().toISOString() }).eq("id", profile.communityId);
    if (error) return NextResponse.json({ code: "SAVE_UNAVAILABLE" }, { status: 500 });
    return NextResponse.json({
      donationUrl: hasDonationUrl ? donationUrl || null : typeof vocabulary.donationUrl === "string" ? vocabulary.donationUrl : null,
      newsletterLabels,
    });
  } catch {
    return NextResponse.json({ code: "SAVE_UNAVAILABLE" }, { status: 500 });
  }
}
