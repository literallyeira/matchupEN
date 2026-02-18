import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// GET - Ad system status
export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'ads_enabled')
    .maybeSingle();

  return NextResponse.json({ enabled: data?.value === 'true' });
}

// POST - Enable/disable ad system
export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  try {
    const { enabled } = await request.json();
    const value = enabled ? 'true' : 'false';

    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'ads_enabled', value }, { onConflict: 'key' });

    if (error) {
      console.error('Settings upsert error:', error);
      return NextResponse.json({ error: 'Ayar kaydedilemedi' }, { status: 500 });
    }

    return NextResponse.json({ enabled: !!enabled });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
