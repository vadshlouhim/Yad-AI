import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertTierFeature } from '@/lib/billing';
import { replyToGmbReview } from '@/lib/gmb/reviews';

export async function POST(request: Request) {
  const url = new URL(request.url);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await request.json();
  const { reviewName, replyText } = body; // reviewName = "locations/xxx/reviews/yyy"

  if (!reviewName || !replyText?.trim()) {
    return NextResponse.json({ error: 'reviewName et replyText obligatoires' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin.from('profiles').select('communityId').eq('id', user.id).single();
  if (!profile?.communityId) return NextResponse.json({ error: 'Pas de communauté' }, { status: 400 });

  const tierCheck = await assertTierFeature(
    admin,
    user.id,
    'PRO',
    'reviews_management',
    "La gestion des avis Google est réservée à l'offre Business."
  );
  if (!tierCheck.ok) return tierCheck.response;

  const result = await replyToGmbReview(admin, profile.communityId, { reviewName, replyText }, url);
  if (!result.success) {
    return NextResponse.json({ error: result.error ?? 'Erreur lors de la publication' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
