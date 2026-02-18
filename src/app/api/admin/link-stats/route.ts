import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// GET - Ad link (gtaw.link/matchupfb) visit counts
export async function GET(request: Request) {
  const password = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  try {
    const { count: total } = await supabase
      .from('link_visits')
      .select('*', { count: 'exact', head: true })
      .eq('ref', 'gtawfb');

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: last7 } = await supabase
      .from('link_visits')
      .select('*', { count: 'exact', head: true })
      .eq('ref', 'gtawfb')
      .gte('created_at', weekAgo);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count: today } = await supabase
      .from('link_visits')
      .select('*', { count: 'exact', head: true })
      .eq('ref', 'gtawfb')
      .gte('created_at', todayStart.toISOString());

    return NextResponse.json({
      gtawfb: {
        total: total ?? 0,
        last7Days: last7 ?? 0,
        today: today ?? 0,
      },
    });
  } catch (error) {
    console.error('link-stats error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
