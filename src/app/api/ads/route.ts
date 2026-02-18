import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Get active ads
export async function GET() {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('ads')
      .select('id, position, image_url, link_url, expires_at')
      .eq('is_active', true)
      .gt('expires_at', now)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Ads fetch error:', error);
      return NextResponse.json([]);
    }

    // Get the most recently added ad for each position
    const left = data?.find((a: { position: string }) => a.position === 'left') || null;
    const right = data?.find((a: { position: string }) => a.position === 'right') || null;

    return NextResponse.json({ left, right }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=120' },
    });
  } catch (error) {
    console.error('Ads error:', error);
    return NextResponse.json({ left: null, right: null });
  }
}
