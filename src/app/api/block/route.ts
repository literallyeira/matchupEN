import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// POST - Engelle: blocker benim, blocked karşı profil
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.gtawId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { blockedApplicationId, characterId } = await request.json();

    if (!blockedApplicationId || !characterId) {
      return NextResponse.json({ error: 'blockedApplicationId ve characterId gerekli' }, { status: 400 });
    }

    const { data: myApp, error: appError } = await supabase
      .from('applications')
      .select('id')
      .eq('gtaw_user_id', session.user.gtawId)
      .eq('character_id', parseInt(characterId))
      .single();

    if (appError || !myApp) {
      return NextResponse.json({ error: 'Profil bulunamadı' }, { status: 404 });
    }

    if (blockedApplicationId === myApp.id) {
      return NextResponse.json({ error: 'Kendinizi engelleyemezsiniz' }, { status: 400 });
    }

    const { error: insertError } = await supabase
      .from('blocked_users')
      .upsert(
        { blocker_application_id: myApp.id, blocked_application_id: blockedApplicationId },
        { onConflict: 'blocker_application_id,blocked_application_id' }
      );

    if (insertError) {
      console.error('Block error:', insertError);
      return NextResponse.json({ error: 'Engelleme kaydedilemedi' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Block error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
