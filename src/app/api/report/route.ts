import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// POST - Raporla: reporter benim, reported karşı profil
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.gtawId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { reportedApplicationId, characterId, reason } = await request.json();

    if (!reportedApplicationId || !characterId) {
      return NextResponse.json({ error: 'reportedApplicationId ve characterId gerekli' }, { status: 400 });
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

    if (reportedApplicationId === myApp.id) {
      return NextResponse.json({ error: 'Kendinizi raporlayamazsınız' }, { status: 400 });
    }

    const { error: insertError } = await supabase
      .from('reports')
      .insert({
        reporter_application_id: myApp.id,
        reported_application_id: reportedApplicationId,
        reason: (reason && String(reason).trim().slice(0, 1000)) || null,
      });

    if (insertError) {
      console.error('Report error:', insertError);
      return NextResponse.json({ error: 'Rapor kaydedilemedi' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Report error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
