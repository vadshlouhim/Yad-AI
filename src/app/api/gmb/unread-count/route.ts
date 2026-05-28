/**
 * Route légère qui retourne le nombre d'avis sans réponse.
 * Appelée depuis le topbar/sidebar pour afficher un badge de notification.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createGmbOAuth2Client, getGmbRedirectUri } from '@/lib/gmb';
import { getGmbCache, setGmbCache } from '@/lib/gmb-cache';

const UNREAD_COUNT_CACHE_TTL_MS = 2 * 60 * 1000;

export async function GET(request: Request) {
  const url = new URL(request.url);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ count: 0 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('communityId').eq('id', user.id).single();
  if (!profile?.communityId) return NextResponse.json({ count: 0 });

  const { data: channel } = await admin
    .from('Channel')
    .select('refreshToken, settings, isConnected')
    .eq('communityId', profile.communityId)
    .eq('type', 'GOOGLE_BUSINESS')
    .maybeSingle();

  if (!channel?.refreshToken || !channel.isConnected) return NextResponse.json({ count: 0 });

  const cacheKey = `unread-count:${profile.communityId}`;
  const cached = getGmbCache<{ count: number; connected: boolean }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const oauth2Client = createGmbOAuth2Client(getGmbRedirectUri(url));
    oauth2Client.setCredentials({ refresh_token: channel.refreshToken });
    const { token } = await oauth2Client.getAccessToken();
    if (!token) return NextResponse.json({ count: 0 });

    const settings = channel.settings as { locationName?: string } | null;
    const locationName = settings?.locationName;
    if (!locationName) return NextResponse.json({ count: 0 });

    const res = await fetch(
      `https://mybusiness.googleapis.com/v4/${locationName}/reviews?pageSize=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return NextResponse.json({ count: 0 });

    const data = await res.json();
    const reviews = data.reviews ?? [];
    const unanswered = reviews.filter((r: { reviewReply?: { comment?: string } }) => !r.reviewReply?.comment).length;

    const payload = { count: unanswered, connected: true };
    setGmbCache(cacheKey, payload, UNREAD_COUNT_CACHE_TTL_MS);
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
