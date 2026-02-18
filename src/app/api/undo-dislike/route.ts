import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { consumeUndoSlot } from '@/lib/limits';
import type { Application } from '@/lib/supabase';

// POST - Son dislike'i geri al (gunluk limit: Free 1, Pro 5)
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.gtawId) {
    return NextResponse.json({ error: 'Giris gerekli' }, { status: 401 });
  }

  try {
    const { characterId } = await request.json().catch(() => ({}));

    if (!characterId) {
      return NextResponse.json({ error: 'characterId gerekli' }, { status: 400 });
    }

    const { data: myApp, error: appError } = await supabase
      .from('applications')
      .select('id')
      .eq('gtaw_user_id', session.user.gtawId)
      .eq('character_id', parseInt(String(characterId)))
      .single();

    if (appError || !myApp) {
      return NextResponse.json({ error: 'Profil bulunamadi' }, { status: 404 });
    }

    const fromId = myApp.id;

    const { data: lastDislike } = await supabase
      .from('dislikes')
      .select('to_application_id')
      .eq('from_application_id', fromId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!lastDislike?.to_application_id) {
      return NextResponse.json({ error: 'Geri alinacak dislike yok' }, { status: 404 });
    }

    const undoResult = await consumeUndoSlot(fromId);
    if (!undoResult.ok) {
      return NextResponse.json(
        { error: 'Gunluk geri alma hakkiniz doldu.', remaining: 0, resetAt: undoResult.resetAt },
        { status: 429 }
      );
    }

    const { error: deleteError } = await supabase
      .from('dislikes')
      .delete()
      .eq('from_application_id', fromId)
      .eq('to_application_id', lastDislike.to_application_id);

    if (deleteError) {
      return NextResponse.json({ error: 'Geri alinamadi' }, { status: 500 });
    }

    const { data: profile } = await supabase
      .from('applications')
      .select('*')
      .eq('id', lastDislike.to_application_id)
      .single();

    return NextResponse.json({
      success: true,
      profile: profile as Application | null,
      undoRemaining: undoResult.remaining,
      undoResetAt: undoResult.resetAt,
    });
  } catch (error) {
    console.error('Undo dislike error:', error);
    return NextResponse.json({ error: 'Sunucu hatasi' }, { status: 500 });
  }
}
