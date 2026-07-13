import type { createAdminClient } from "@/lib/supabase/admin";
import { createGmbOAuth2Client, getGmbRedirectUri } from "@/lib/gmb";
import { getGmbCache, setGmbCache } from "@/lib/gmb-cache";

// Lecture et réponse aux avis Google Business — partagé entre les routes API
// /api/gmb/reviews (+ /reply) et l'exécuteur de l'assistant IA.

type Admin = ReturnType<typeof createAdminClient>;

const REVIEWS_CACHE_TTL_MS = 2 * 60 * 1000;

export interface GmbReview {
  id: string;
  googleReviewName: string;
  author: string;
  avatarLetter: string;
  avatarUrl: string | null;
  rating: number;
  comment: string;
  relativeTime: string;
  timestamp: string;
  answered: boolean;
  replyText: string | null;
  repliedAt: string | null;
}

export interface GmbReviewsResult {
  reviews: GmbReview[];
  locationName: string | null;
  locationDisplayName: string | null;
  needsLocationSync?: boolean;
  message?: string;
}

function starRatingToNumber(star?: string): number {
  const map: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
  return star ? (map[star] ?? 0) : 0;
}

function formatRelative(iso?: string): string {
  if (!iso) return "Date inconnue";
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days} jour${days > 1 ? "s" : ""}`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

async function getGmbAccessToken(admin: Admin, communityId: string, requestUrl?: URL) {
  const { data: channel } = await admin
    .from("Channel")
    .select("refreshToken, settings")
    .eq("communityId", communityId)
    .eq("type", "GOOGLE_BUSINESS")
    .maybeSingle();

  if (!channel?.refreshToken) {
    return { error: "Google Business n'est pas connecté." as string, token: null, settings: null };
  }

  const oauth2Client = createGmbOAuth2Client(getGmbRedirectUri(requestUrl));
  oauth2Client.setCredentials({ refresh_token: channel.refreshToken });
  const { token } = await oauth2Client.getAccessToken();
  if (!token) return { error: "Impossible de rafraîchir le token Google.", token: null, settings: null };

  return {
    error: null,
    token,
    settings: (channel.settings ?? null) as { accountName?: string; locationName?: string; locationDisplayName?: string } | null,
  };
}

export async function listGmbReviews(
  admin: Admin,
  communityId: string,
  requestUrl?: URL
): Promise<GmbReviewsResult | { error: string }> {
  const cacheKey = `reviews:${communityId}`;
  const cached = getGmbCache<GmbReviewsResult>(cacheKey);
  if (cached) return cached;

  const auth = await getGmbAccessToken(admin, communityId, requestUrl);
  if (auth.error || !auth.token) return { error: auth.error ?? "Erreur d'authentification Google." };

  const locationName = auth.settings?.locationName;
  const accountName = auth.settings?.accountName;

  if (!locationName || !accountName) {
    return {
      reviews: [],
      locationName: null,
      locationDisplayName: null,
      needsLocationSync: true,
      message: "Google Business est connecté. La sélection de la fiche sera synchronisée ensuite.",
    };
  }

  const apiUrl = `https://mybusiness.googleapis.com/v4/${locationName}/reviews?pageSize=50`;
  const res = await fetch(apiUrl, { headers: { Authorization: `Bearer ${auth.token}` } });
  const data = await res.json();
  if (!res.ok) {
    console.error("[GMB Reviews Error]", data);
    return { error: data?.error?.message ?? "Erreur API Google Business." };
  }

  const reviews: GmbReview[] = (data.reviews ?? []).map((r: {
    reviewId: string;
    reviewer?: { displayName?: string; profilePhotoUrl?: string };
    starRating?: string;
    comment?: string;
    createTime?: string;
    updateTime?: string;
    reviewReply?: { comment?: string; updateTime?: string };
  }) => ({
    id: r.reviewId,
    googleReviewName: `${locationName}/reviews/${r.reviewId}`,
    author: r.reviewer?.displayName ?? "Anonyme",
    avatarLetter: (r.reviewer?.displayName ?? "A")[0].toUpperCase(),
    avatarUrl: r.reviewer?.profilePhotoUrl ?? null,
    rating: starRatingToNumber(r.starRating),
    comment: r.comment ?? "",
    relativeTime: formatRelative(r.createTime),
    timestamp: r.createTime ?? new Date().toISOString(),
    answered: Boolean(r.reviewReply?.comment),
    replyText: r.reviewReply?.comment ?? null,
    repliedAt: r.reviewReply?.updateTime ?? null,
  }));

  const payload: GmbReviewsResult = {
    reviews,
    locationName: auth.settings?.locationName ?? null,
    locationDisplayName: auth.settings?.locationDisplayName ?? null,
  };

  setGmbCache(cacheKey, payload, REVIEWS_CACHE_TTL_MS);
  return payload;
}

export async function replyToGmbReview(
  admin: Admin,
  communityId: string,
  params: { reviewName: string; replyText: string },
  requestUrl?: URL
): Promise<{ success: boolean; error?: string }> {
  const auth = await getGmbAccessToken(admin, communityId, requestUrl);
  if (auth.error || !auth.token) return { success: false, error: auth.error ?? "Erreur d'authentification Google." };

  const apiUrl = `https://mybusiness.googleapis.com/v4/${params.reviewName}/reply`;
  const res = await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ comment: params.replyText }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("[GMB Reply Error]", data);
    return { success: false, error: data?.error?.message ?? "Erreur lors de la publication de la réponse." };
  }

  await admin
    .from("Channel")
    .update({ lastSyncAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .eq("communityId", communityId)
    .eq("type", "GOOGLE_BUSINESS");

  return { success: true };
}
