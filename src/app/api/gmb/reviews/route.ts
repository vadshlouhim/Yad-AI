import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createGmbOAuth2Client, getGmbRedirectUri } from '@/lib/gmb';
import { getGmbCache, setGmbCache } from '@/lib/gmb-cache';
import { assertTierFeature } from '@/lib/billing';

const REVIEWS_CACHE_TTL_MS = 2 * 60 * 1000;

export async function GET(request: Request) {
  const url = new URL(request.url);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('communityId').eq('id', user.id).single();
  if (!profile?.communityId) return NextResponse.json({ error: 'Pas de communauté' }, { status: 400 });

  const tierCheck = await assertTierFeature(
    admin,
    user.id,
    'BUSINESS',
    'reviews_management',
    "La gestion des avis Google est réservée à l'offre Business."
  );
  if (!tierCheck.ok) return tierCheck.response;

  const { data: channel } = await admin
    .from('Channel')
    .select('refreshToken, accessToken, settings, tokenExpiresAt')
    .eq('communityId', profile.communityId)
    .eq('type', 'GOOGLE_BUSINESS')
    .maybeSingle();

  if (!channel?.refreshToken) {
    return NextResponse.json({ error: 'GMB non connecté' }, { status: 400 });
  }

  const cacheKey = `reviews:${profile.communityId}`;
  const cached = getGmbCache<{
    reviews: unknown[];
    locationName: string | null;
    locationDisplayName: string | null;
    needsLocationSync?: boolean;
    message?: string;
  }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    // Rafraîchir l'access token via le refresh token
    const oauth2Client = createGmbOAuth2Client(getGmbRedirectUri(url));
    oauth2Client.setCredentials({ refresh_token: channel.refreshToken });
    const { token } = await oauth2Client.getAccessToken();
    if (!token) throw new Error('Impossible de rafraîchir le token');

    const settings = channel.settings as { accountName?: string; locationName?: string } | null;
    const locationName = settings?.locationName;
    const accountName = settings?.accountName;

    if (!locationName || !accountName) {
      return NextResponse.json({
        reviews: [],
        locationName: null,
        locationDisplayName: null,
        needsLocationSync: true,
        message: 'Google Business est connecte. La selection de la fiche sera synchronisee ensuite.',
      });
    }

    // Appel API GMB v4 pour les avis
    const apiUrl = `https://mybusiness.googleapis.com/v4/${locationName}/reviews?pageSize=50`;
    const res = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('[GMB Reviews Error]', data);
      throw new Error(data?.error?.message ?? 'Erreur API GMB');
    }

    // Normaliser les reviews
    const reviews = (data.reviews ?? []).map((r: {
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
      author: r.reviewer?.displayName ?? 'Anonyme',
      avatarLetter: (r.reviewer?.displayName ?? 'A')[0].toUpperCase(),
      avatarUrl: r.reviewer?.profilePhotoUrl ?? null,
      rating: starRatingToNumber(r.starRating),
      comment: r.comment ?? '',
      relativeTime: formatRelative(r.createTime),
      timestamp: r.createTime ?? new Date().toISOString(),
      answered: Boolean(r.reviewReply?.comment),
      replyText: r.reviewReply?.comment ?? null,
      repliedAt: r.reviewReply?.updateTime ?? null,
    }));

    const payload = {
      reviews,
      locationName: settings?.locationName ?? null,
      locationDisplayName: (settings as { locationDisplayName?: string })?.locationDisplayName ?? null,
    };

    setGmbCache(cacheKey, payload, REVIEWS_CACHE_TTL_MS);
    return NextResponse.json(payload);
  } catch (error) {
    console.error('[GMB Reviews Error]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

function starRatingToNumber(star?: string): number {
  const map: Record<string, number> = {
    ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
  };
  return star ? (map[star] ?? 0) : 0;
}

function formatRelative(iso?: string): string {
  if (!iso) return 'Date inconnue';
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
  return new Date(iso).toLocaleDateString('fr-FR');
}
