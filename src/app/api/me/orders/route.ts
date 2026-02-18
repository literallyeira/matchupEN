import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export interface OrderItem {
  id: string;
  product: string;
  amount: number;
  created_at: string;
  character_name?: string;
}

// GET - All orders for signed-in user (payment history)
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.gtawId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: apps, error: appsError } = await supabase
      .from('applications')
      .select('id, character_name')
      .eq('gtaw_user_id', session.user.gtawId);

    if (appsError || !apps?.length) {
      return NextResponse.json([]);
    }

    const appIds = apps.map((a) => a.id);
    const appNames: Record<string, string> = {};
    apps.forEach((a) => { appNames[a.id] = a.character_name || '-'; });

    const { data: payments, error: payError } = await supabase
      .from('payments')
      .select('id, application_id, product, amount, created_at')
      .in('application_id', appIds)
      .order('created_at', { ascending: false });

    if (payError) {
      console.error('Orders fetch error:', payError);
      return NextResponse.json({ error: 'Siparişler yüklenemedi' }, { status: 500 });
    }

    const orders: OrderItem[] = (payments || []).map((p) => ({
      id: p.id,
      product: p.product,
      amount: p.amount,
      created_at: p.created_at,
      character_name: appNames[p.application_id],
    }));

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Orders error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
