import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST - Referans linkinden gelen ziyareti kaydet (public, auth yok)
// Tüm ref'ler kabul edilir (gtawfb, kullanıcı kodları vb.)
export async function POST(request: Request) {
  try {
    const { ref } = await request.json();

    if (!ref || typeof ref !== 'string' || ref.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(ref)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const { error } = await supabase.from('link_visits').insert({ ref });

    if (error) {
      console.error('link_visits insert error:', error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
