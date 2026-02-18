import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// GET - List all ads (admin)
export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('ads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Admin ads fetch error:', error);
    return NextResponse.json([], { status: 200 });
  }

  return NextResponse.json(data || []);
}

// DELETE - Delete or deactivate ad (admin)
export async function DELETE(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  try {
    const { adId } = await request.json();
    if (!adId) {
      return NextResponse.json({ error: 'adId gerekli' }, { status: 400 });
    }

    const { error } = await supabase
      .from('ads')
      .update({ is_active: false })
      .eq('id', adId);

    if (error) {
      console.error('Admin ad deactivate error:', error);
      return NextResponse.json({ error: 'Deaktif edilemedi' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
