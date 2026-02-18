import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Is ad system enabled?
export async function GET() {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'ads_enabled')
      .maybeSingle();

    const enabled = data?.value === 'true';
    return NextResponse.json({ enabled });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}
