import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { getOrCreateRefCode } from '@/lib/referral';

// GET - Kullanıcının referans kodunu, davet linkini ve davet sayısını döndür
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.gtawId) {
    return NextResponse.json({ error: 'Giriş gerekli' }, { status: 401 });
  }

  try {
    const code = await getOrCreateRefCode(session.user.gtawId);
    const baseUrl = process.env.NEXTAUTH_URL || 'https://matchup.icu';
    const inviteLink = `${baseUrl}?ref=${code}`;

    const { count } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_gtaw_user_id', session.user.gtawId);

    return NextResponse.json({ code, inviteLink, referralCount: count ?? 0 });
  } catch (e) {
    console.error('Referral code error:', e);
    return NextResponse.json({ error: 'Kod alınamadı' }, { status: 500 });
  }
}
