import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Tüm aktif üyelikleri listele (admin)
export async function GET(request: NextRequest) {
  const password = request.headers.get('Authorization');
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  try {
    const now = new Date().toISOString();
    const { data: subs, error: subError } = await supabase
      .from('subscriptions')
      .select('application_id, tier, expires_at')
      .gt('expires_at', now)
      .order('expires_at', { ascending: false });

    if (subError) {
      console.error('Subscriptions list error:', subError);
      return NextResponse.json({ error: 'Üyelikler alınamadı' }, { status: 500 });
    }

    if (!subs?.length) {
      return NextResponse.json([]);
    }

    const appIds = subs.map((s) => s.application_id);
    const { data: apps, error: appError } = await supabase
      .from('applications')
      .select('id, first_name, last_name, character_name')
      .in('id', appIds);

    if (appError || !apps?.length) {
      return NextResponse.json(
        subs.map((s) => ({
          application_id: s.application_id,
          tier: s.tier,
          expires_at: s.expires_at,
          first_name: null,
          last_name: null,
          character_name: null,
        }))
      );
    }

    const appMap: Record<string, { first_name: string; last_name: string; character_name?: string }> = {};
    apps.forEach((a) => {
      appMap[a.id] = {
        first_name: a.first_name,
        last_name: a.last_name,
        character_name: a.character_name,
      };
    });

    const list = subs.map((s) => ({
      application_id: s.application_id,
      tier: s.tier,
      expires_at: s.expires_at,
      first_name: appMap[s.application_id]?.first_name,
      last_name: appMap[s.application_id]?.last_name,
      character_name: appMap[s.application_id]?.character_name,
    }));

    return NextResponse.json(list);
  } catch (error) {
    console.error('Subscriptions list error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
