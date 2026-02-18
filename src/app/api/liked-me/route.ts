import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { getTier } from '@/lib/limits';
import type { Application } from '@/lib/supabase';

// GET - Beni like edenler: Pro ise listeyi döner, değilse sadece sayı (kim olduğu gizli)
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.gtawId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const characterId = searchParams.get('characterId');
  if (!characterId) {
    return NextResponse.json({ error: 'characterId gerekli' }, { status: 400 });
  }

  try {
    const { data: myApp, error: appError } = await supabase
      .from('applications')
      .select('id')
      .eq('gtaw_user_id', session.user.gtawId)
      .eq('character_id', parseInt(characterId))
      .single();

    if (appError || !myApp) {
      return NextResponse.json({ error: 'Profil bulunamadı' }, { status: 404 });
    }

    const tier = await getTier(myApp.id);

    // Sorguları paralel çalıştır (blocked dahil)
    const tenHoursAgo = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();
    const [likesRes, matches1, matches2, dislikesRes, myLikesRes, blockedRes] = await Promise.all([
      supabase.from('likes').select('from_application_id').eq('to_application_id', myApp.id),
      supabase.from('matches').select('application_1_id, application_2_id').eq('application_1_id', myApp.id),
      supabase.from('matches').select('application_1_id, application_2_id').eq('application_2_id', myApp.id),
      supabase.from('dislikes').select('to_application_id').eq('from_application_id', myApp.id).gt('created_at', tenHoursAgo),
      supabase.from('likes').select('to_application_id').eq('from_application_id', myApp.id),
      supabase.from('blocked_users').select('blocked_application_id').eq('blocker_application_id', myApp.id),
    ]);

    const fromIds = (likesRes.data ?? []).map((r: { from_application_id: string }) => r.from_application_id);
    const matchedIds = new Set<string>();
    [...(matches1.data ?? []), ...(matches2.data ?? [])].forEach((m: { application_1_id: string; application_2_id: string }) => {
      matchedIds.add(m.application_1_id === myApp.id ? m.application_2_id : m.application_1_id);
    });
    const dislikedIds = new Set((dislikesRes.data ?? []).map((d: { to_application_id: string }) => d.to_application_id));
    const likedIds = new Set((myLikesRes.data ?? []).map((l: { to_application_id: string }) => l.to_application_id));
    const blockedIds = new Set((blockedRes.data ?? []).map((r: { blocked_application_id: string }) => r.blocked_application_id));
    const filteredFromIds = fromIds.filter((id: string) => !matchedIds.has(id) && !dislikedIds.has(id) && !likedIds.has(id) && !blockedIds.has(id));
    const count = filteredFromIds.length;

    if (tier !== 'pro') {
      return NextResponse.json({ count, likedBy: [] });
    }

    if (count === 0) {
      return NextResponse.json({ count: 0, likedBy: [] });
    }

    const { data: apps } = await supabase
      .from('applications')
      .select('*')
      .in('id', filteredFromIds);

    const list = (apps ?? []) as Application[];
    return NextResponse.json({ count, likedBy: list });
  } catch (error) {
    console.error('Liked-me error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
