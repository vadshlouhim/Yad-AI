import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CHANNEL_LABELS } from "@/lib/utils";

type RouteParams = { params: Promise<{ provider: string }> };

type MetaPage = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: {
    id: string;
    username?: string;
  };
};

type SignedOAuthState = {
  nonce: string;
  provider: string;
  communityId?: string | null;
  returnTo?: string;
  exp: number;
};

type StoredOAuthState = {
  state: string;
  communityId?: string | null;
  returnTo?: string;
};

function verifySignedState(state: string, secret: string): SignedOAuthState | null {
  const [encodedPayload, signature] = state.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SignedOAuthState;
  if (!payload.exp || payload.exp < Date.now()) return null;
  return payload;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error?.message ?? "Erreur Meta OAuth");
  }
  return data as T;
}

function getOAuthBaseUrl(requestUrl: URL) {
  const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  return appUrl?.replace(/\/$/, "") ?? requestUrl.origin;
}

/** Construit l'URL de retour selon returnTo ("onboarding", "meta_popup" ou "settings") */
function buildReturnUrl(origin: string, returnTo: string | undefined): URL {
  if (returnTo === "onboarding") {
    return new URL("/onboarding", origin);
  }
  if (returnTo === "meta_popup") {
    return new URL("/dashboard/settings/channels/oauth-done", origin);
  }
  return new URL("/dashboard/settings/channels", origin);
}

export async function GET(request: Request, { params }: RouteParams) {
  const { provider } = await params;
  if (provider !== "facebook" && provider !== "instagram") {
    return NextResponse.json({ error: "Provider non supporté" }, { status: 400 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const appId = provider === "instagram"
    ? (process.env.INSTAGRAM_APP_ID ?? process.env.META_APP_ID ?? process.env.FACEBOOK_APP_ID)
    : (process.env.META_APP_ID ?? process.env.FACEBOOK_APP_ID);
  const appSecret = provider === "instagram"
    ? (process.env.INSTAGRAM_APP_SECRET ?? process.env.META_APP_SECRET ?? process.env.FACEBOOK_APP_SECRET)
    : (process.env.META_APP_SECRET ?? process.env.FACEBOOK_APP_SECRET);

  // Lire + supprimer le cookie en une seule fois
  const cookieStore = await cookies();
  const rawState = cookieStore.get(`meta_oauth_state_${provider}`)?.value;
  cookieStore.delete(`meta_oauth_state_${provider}`);

  const stored = rawState ? (JSON.parse(rawState) as StoredOAuthState) : null;
  const returnTo = stored?.returnTo ?? "settings";
  const returnUrl = buildReturnUrl(url.origin, returnTo);
  returnUrl.searchParams.set("provider", provider);

  if (!code || !state) {
    returnUrl.searchParams.set("oauth", "missing_code");
    return NextResponse.redirect(returnUrl);
  }

  if (!appId || !appSecret) {
    returnUrl.searchParams.set("oauth", "missing_env");
    return NextResponse.redirect(returnUrl);
  }

  const signedState = verifySignedState(state, appSecret);

  if (!signedState && !stored) {
    returnUrl.searchParams.set("oauth", "expired");
    return NextResponse.redirect(returnUrl);
  }

  if (stored && stored.state !== state) {
    returnUrl.searchParams.set("oauth", "invalid_state");
    return NextResponse.redirect(returnUrl);
  }

  if (signedState && signedState.provider !== provider) {
    returnUrl.searchParams.set("oauth", "invalid_state");
    return NextResponse.redirect(returnUrl);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/auth/login", url.origin));

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("communityId")
    .eq("id", user.id)
    .single();

  const communityId = profile?.communityId;
  const stateCommunityId = stored?.communityId ?? signedState?.communityId;
  if (!communityId || (stateCommunityId && stateCommunityId !== communityId)) {
    returnUrl.searchParams.set("oauth", "forbidden");
    return NextResponse.redirect(returnUrl);
  }

  try {
    const redirectUri = new URL(`/api/auth/oauth/${provider}/callback`, getOAuthBaseUrl(url)).toString();
    const tokenUrl = new URL("https://graph.facebook.com/v20.0/oauth/access_token");
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const token = await fetchJson<{ access_token: string; expires_in?: number }>(tokenUrl.toString());

    const longLivedUrl = new URL("https://graph.facebook.com/v20.0/oauth/access_token");
    longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
    longLivedUrl.searchParams.set("client_id", appId);
    longLivedUrl.searchParams.set("client_secret", appSecret);
    longLivedUrl.searchParams.set("fb_exchange_token", token.access_token);
    const longLived = await fetchJson<{ access_token: string; expires_in?: number }>(longLivedUrl.toString());

    const pagesUrl = new URL("https://graph.facebook.com/v20.0/me/accounts");
    pagesUrl.searchParams.set("fields", "id,name,access_token,instagram_business_account{id,username}");
    pagesUrl.searchParams.set("access_token", longLived.access_token);
    const pagesResponse = await fetchJson<{ data: MetaPage[] }>(pagesUrl.toString());

    console.log("[Meta OAuth] Pages response:", JSON.stringify(pagesResponse, null, 2));

    const selectedPage = pagesResponse.data.find((page) =>
      provider === "instagram" ? Boolean(page.instagram_business_account?.id) : Boolean(page.access_token)
    );

    if (!selectedPage) {
      returnUrl.searchParams.set("oauth", provider === "instagram" ? "no_instagram_business" : "no_page");
      return NextResponse.redirect(returnUrl);
    }

    const type = provider === "instagram" ? "INSTAGRAM" : "FACEBOOK";
    const pageId = provider === "instagram"
      ? selectedPage.instagram_business_account?.id
      : selectedPage.id;
    const handle = provider === "instagram"
      ? selectedPage.instagram_business_account?.username
      : selectedPage.name;
    const expiresAt = longLived.expires_in
      ? new Date(Date.now() + longLived.expires_in * 1000).toISOString()
      : null;

    const { data: existingChannel } = await admin
      .from("Channel")
      .select("id, settings")
      .eq("communityId", communityId)
      .eq("type", type)
      .maybeSingle();

    const mergedSettings = {
      ...(existingChannel?.settings && typeof existingChannel.settings === "object" ? existingChannel.settings : {}),
      metaPageId: selectedPage.id,
      metaPageName: selectedPage.name,
      metaUserToken: longLived.access_token,
      provider,
    };

    await admin.from("Channel").upsert(
      {
        id: existingChannel?.id ?? crypto.randomUUID(),
        communityId,
        type,
        name: CHANNEL_LABELS[type],
        handle: handle ?? selectedPage.name,
        accessToken: selectedPage.access_token,
        refreshToken: longLived.access_token,
        tokenExpiresAt: expiresAt,
        pageId,
        isConnected: true,
        isActive: true,
        lastSyncAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        settings: mergedSettings,
      },
      { onConflict: "communityId,type" }
    );

    returnUrl.searchParams.set("oauth", "success");
    return NextResponse.redirect(returnUrl);
  } catch (error) {
    console.error("[Meta OAuth]", error);
    returnUrl.searchParams.set("oauth", "error");
    return NextResponse.redirect(returnUrl);
  }
}
