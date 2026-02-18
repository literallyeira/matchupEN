import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.gtawId) {
    return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const characterId = searchParams.get('characterId');
  if (!characterId) {
    return NextResponse.json({ error: 'characterId gerekli' }, { status: 400 });
  }

  try {
    // Profil bilgisi
    const { data: app } = await supabase
      .from('applications')
      .select('id, created_at')
      .eq('gtaw_user_id', session.user.gtawId)
      .eq('character_id', parseInt(characterId))
      .single();

    if (!app) {
      return NextResponse.json({ error: 'Profil bulunamadı' }, { status: 404 });
    }

    // Paralel sorgular
    const [
      likesReceived,
      likesSent,
      matchesResult,
      dislikesSent,
      viewsReceived,
      viewsLast7,
    ] = await Promise.all([
      // Alınan beğeniler
      supabase.from('likes').select('id', { count: 'exact', head: true }).eq('to_application_id', app.id),
      // Gönderilen beğeniler
      supabase.from('likes').select('id', { count: 'exact', head: true }).eq('from_application_id', app.id),
      // Eşleşmeler
      supabase.from('matches').select('id', { count: 'exact', head: true }).or(`application_1_id.eq.${app.id},application_2_id.eq.${app.id}`),
      // Gönderilen dislike'lar
      supabase.from('dislikes').select('id', { count: 'exact', head: true }).eq('from_application_id', app.id),
      // Toplam görüntülenme
      supabase.from('profile_views').select('id', { count: 'exact', head: true }).eq('viewed_application_id', app.id),
      // Son 7 gün görüntülenme
      supabase.from('profile_views').select('id', { count: 'exact', head: true })
        .eq('viewed_application_id', app.id)
        .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    // Profil yaşı
    const createdAt = new Date(app.created_at);
    const daysActive = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    // Match oranı
    const totalLikes = (likesSent.count || 0);
    const matchCount = (matchesResult.count || 0);
    const matchRate = totalLikes > 0 ? Math.round((matchCount / totalLikes) * 100) : 0;

    return NextResponse.json({
      likesReceived: likesReceived.count || 0,
      likesSent: likesSent.count || 0,
      matches: matchCount,
      dislikesSent: dislikesSent.count || 0,
      totalViews: viewsReceived.count || 0,
      weeklyViews: viewsLast7.count || 0,
      daysActive,
      matchRate,
      memberSince: app.created_at,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
