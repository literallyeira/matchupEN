import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - List all payments (admin)
export async function GET(request: NextRequest) {
  const password = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: payments, error: payError } = await supabase
      .from('payments')
      .select('id, application_id, product, amount, created_at')
      .order('created_at', { ascending: false });

    if (payError) {
      console.error('Payments list error:', payError);
      return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
    }

    if (!payments?.length) {
      return NextResponse.json([]);
    }

    const appIds = [...new Set(payments.map((p) => p.application_id))];
    const { data: apps } = await supabase
      .from('applications')
      .select('id, first_name, last_name, character_name')
      .in('id', appIds);

    const appMap: Record<string, { first_name: string; last_name: string; character_name?: string }> = {};
    (apps || []).forEach((a) => {
      appMap[a.id] = {
        first_name: a.first_name,
        last_name: a.last_name,
        character_name: a.character_name,
      };
    });

    const list = payments.map((p) => ({
      id: p.id,
      application_id: p.application_id,
      product: p.product,
      amount: p.amount,
      created_at: p.created_at,
      first_name: appMap[p.application_id]?.first_name,
      last_name: appMap[p.application_id]?.last_name,
      character_name: appMap[p.application_id]?.character_name,
    }));

    return NextResponse.json(list);
  } catch (error) {
    console.error('Payments list error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
