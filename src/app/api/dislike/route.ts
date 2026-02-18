import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// POST - Dislike: bu profili tekrar gösterme (hak düşmez, sadece like hakkı düşer)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.gtawId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { toApplicationId, characterId } = await request.json();

    if (!toApplicationId) {
      return NextResponse.json({ error: 'toApplicationId gerekli' }, { status: 400 });
    }
    if (!characterId) {
      return NextResponse.json({ error: 'characterId gerekli' }, { status: 400 });
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

    const fromId = myApp.id;

    supabase.from('applications').update({ last_active_at: new Date().toISOString() }).eq('id', fromId).then(() => {});

    if (fromId === toApplicationId) {
      return NextResponse.json({ error: 'Geçersiz' }, { status: 400 });
    }

    // created_at her dislike'ta güncellenir; böylece 10 saatlik süre yeniden başlar
    await supabase.from('dislikes').upsert(
      { from_application_id: fromId, to_application_id: toApplicationId, created_at: new Date().toISOString() },
      { onConflict: 'from_application_id,to_application_id' }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Dislike error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
