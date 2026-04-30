import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHmac } from "crypto";

type RouteParams = { params: Promise<{ provider: string }> };

const META_SCOPES = {
  facebook: ["pages_show_list", "pages_read_engagement", "pages_manage_posts"],
  instagram: [
    "pages_show_list",
    "pages_read_engagement",
    "pages_manage_posts",
    "instagram_basic",
    "instagram_content_publish",
  ],
};

function base64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function signState(payload: Record<string, unknown>, secret: string) {
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { provider } = await params;
  if (provider !== "facebook" && provider !== "instagram") {
    return NextResponse.json({ error: "Provider non supporté" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/auth/login", request.url));

  const appId = process.env.META_APP_ID ?? process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.META_APP_SECRET ?? process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) {
    return NextResponse.json({ error: "META_APP_ID ou META_APP_SECRET manquant" }, { status: 500 });
  }

  const url = new URL(request.url);
  const communityId = url.searchParams.get("communityId");
  const nonce = crypto.randomUUID();
  const state = signState({
    nonce,
    provider,
    communityId,
    exp: Date.now() + 10 * 60 * 1000,
  }, appSecret);
  const cookieStore = await cookies();
  cookieStore.set(`meta_oauth_state_${provider}`, JSON.stringify({ state, communityId }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });

  const redirectUri = new URL(`/api/auth/oauth/${provider}/callback`, url.origin).toString();
  const dialogUrl = new URL("https://www.facebook.com/v20.0/dialog/oauth");
  dialogUrl.searchParams.set("client_id", appId);
  dialogUrl.searchParams.set("redirect_uri", redirectUri);
  dialogUrl.searchParams.set("state", state);
  dialogUrl.searchParams.set("scope", META_SCOPES[provider].join(","));
  dialogUrl.searchParams.set("response_type", "code");

  return NextResponse.redirect(dialogUrl);
}
