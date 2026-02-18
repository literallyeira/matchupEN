import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// POST - Kullanıcı kendi profilini (application) siler
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.gtawId) {
    return NextResponse.json({ error: 'Giriş yapmanız gerekir' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const applicationId = body.applicationId;

  if (!applicationId) {
    return NextResponse.json({ error: 'applicationId gerekli' }, { status: 400 });
  }

  try {
    const { data: app, error: fetchError } = await supabase
      .from('applications')
      .select('id, gtaw_user_id, first_name, last_name, photo_url')
      .eq('id', applicationId)
      .single();

    if (fetchError || !app) {
      return NextResponse.json({ error: 'Profil bulunamadı' }, { status: 404 });
    }

    if (app.gtaw_user_id !== session.user.gtawId) {
      return NextResponse.json({ error: 'Bu profili silme yetkiniz yok' }, { status: 403 });
    }

    if (app.photo_url) {
      const fileName = app.photo_url.split('/').pop();
      if (fileName) {
        await supabase.storage.from('photos').remove([fileName]).catch(() => {});
      }
    }

    // İlişkili tüm verileri sil
    await supabase.from('matches').delete().eq('application_1_id', applicationId);
    await supabase.from('matches').delete().eq('application_2_id', applicationId);
    await supabase.from('likes').delete().eq('from_application_id', applicationId);
    await supabase.from('likes').delete().eq('to_application_id', applicationId);
    await supabase.from('dislikes').delete().eq('from_application_id', applicationId);
    await supabase.from('dislikes').delete().eq('to_application_id', applicationId);
    await supabase.from('profile_views').delete().eq('viewer_application_id', applicationId);
    await supabase.from('profile_views').delete().eq('viewed_application_id', applicationId);
    await supabase.from('subscriptions').delete().eq('application_id', applicationId);
    await supabase.from('boosts').delete().eq('application_id', applicationId);
    await supabase.from('daily_likes').delete().eq('application_id', applicationId);

    const { error: deleteError } = await supabase.from('applications').delete().eq('id', applicationId);

    if (deleteError) {
      console.error('Delete application error:', deleteError);
      return NextResponse.json({ error: 'Profil silinirken hata oluştu' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete application error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
