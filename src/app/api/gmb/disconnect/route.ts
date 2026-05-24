import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/auth/login', origin));

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('communityId').eq('id', user.id).single();

  if (profile?.communityId) {
    await admin.from('Channel')
      .update({
        isConnected: false,
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        updatedAt: new Date().toISOString(),
      })
      .eq('communityId', profile.communityId)
      .eq('type', 'GOOGLE_BUSINESS');
  }

  return NextResponse.redirect(new URL('/dashboard/google-reviews?gmb=disconnected', origin));
}
