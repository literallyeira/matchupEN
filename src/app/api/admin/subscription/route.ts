import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Bir kullanıcının üyelik durumunu getir
export async function GET(request: NextRequest) {
  const password = request.headers.get('Authorization');
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  const applicationId = request.nextUrl.searchParams.get('applicationId');
  if (!applicationId) {
    return NextResponse.json({ error: 'applicationId gerekli' }, { status: 400 });
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('tier, expires_at')
    .eq('application_id', applicationId)
    .single();

  const { data: boost } = await supabase
    .from('boosts')
    .select('expires_at')
    .eq('application_id', applicationId)
    .gt('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    tier: sub && new Date(sub.expires_at) > new Date() ? sub.tier : 'free',
    expiresAt: sub?.expires_at || null,
    boostExpiresAt: boost?.expires_at || null,
  });
}

// POST - Üyelik durumunu değiştir
export async function POST(request: NextRequest) {
  const password = request.headers.get('Authorization');
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  const { applicationId, tier, durationDays } = await request.json();
  if (!applicationId || !tier) {
    return NextResponse.json({ error: 'applicationId ve tier gerekli' }, { status: 400 });
  }

  if (tier === 'free') {
    // Üyeliği kaldır
    await supabase.from('subscriptions').delete().eq('application_id', applicationId);
    return NextResponse.json({ success: true, tier: 'free' });
  }

  if (!['plus', 'pro'].includes(tier)) {
    return NextResponse.json({ error: 'Geçersiz tier' }, { status: 400 });
  }

  const days = durationDays || 7;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await supabase.from('subscriptions').upsert(
    { application_id: applicationId, tier, expires_at: expiresAt.toISOString() },
    { onConflict: 'application_id' }
  );

  return NextResponse.json({ success: true, tier, expiresAt: expiresAt.toISOString() });
}
