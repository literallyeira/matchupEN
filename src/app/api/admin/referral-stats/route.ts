import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// GET - Referans kodları ve aldıkları davet sayısı
export async function GET(request: Request) {
  const password = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  try {
    const { data: codes } = await supabase
      .from('referral_codes')
      .select('gtaw_user_id, code')
      .order('gtaw_user_id');

    if (!codes || codes.length === 0) {
      return NextResponse.json({ referrals: [] });
    }

    const { data: counts } = await supabase
      .from('referrals')
      .select('referrer_gtaw_user_id');

    const countMap: Record<number, number> = {};
    for (const r of counts || []) {
      countMap[r.referrer_gtaw_user_id] = (countMap[r.referrer_gtaw_user_id] || 0) + 1;
    }

    const gtawIds = [...new Set(codes.map((c) => c.gtaw_user_id))];
    const { data: apps } = await supabase
      .from('applications')
      .select('gtaw_user_id, first_name, last_name')
      .in('gtaw_user_id', gtawIds);

    const ownerMap: Record<number, string> = {};
    for (const a of apps || []) {
      if (!ownerMap[a.gtaw_user_id]) {
        ownerMap[a.gtaw_user_id] = `${a.first_name || ''} ${a.last_name || ''}`.trim() || `GTAW ${a.gtaw_user_id}`;
      }
    }

    const referrals = codes.map((c) => ({
      code: c.code,
      gtawUserId: c.gtaw_user_id,
      ownerName: ownerMap[c.gtaw_user_id] || `GTAW ${c.gtaw_user_id}`,
      count: countMap[c.gtaw_user_id] || 0,
    }));

    referrals.sort((a, b) => b.count - a.count);

    return NextResponse.json({ referrals });
  } catch (error) {
    console.error('referral-stats error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
