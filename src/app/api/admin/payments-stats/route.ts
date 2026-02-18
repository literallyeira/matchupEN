import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// GET - Payment statistics
export async function GET(request: Request) {
  const password = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  try {
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, product, created_at');

    const list = payments || [];
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let total = 0;
    let lastWeek = 0;
    const byProduct: Record<string, number> = {
      plus: 0,
      pro: 0,
      boost: 0,
      ad_left: 0,
      ad_right: 0,
    };

    for (const p of list) {
      const amt = Number(p.amount) || 0;
      total += amt;
      if (p.created_at && new Date(p.created_at) >= weekAgo) {
        lastWeek += amt;
      }
      const prod = String(p.product || '').toLowerCase();
      if (prod in byProduct) {
        byProduct[prod] += amt;
      }
    }

    const fromSubscriptions = byProduct.plus + byProduct.pro;
    const fromBoost = byProduct.boost;
    const fromAds = byProduct.ad_left + byProduct.ad_right;

    return NextResponse.json({
      total,
      lastWeek,
      fromSubscriptions,
      fromBoost,
      fromAds,
      byProduct: {
        plus: byProduct.plus,
        pro: byProduct.pro,
        boost: byProduct.boost,
        ad_left: byProduct.ad_left,
        ad_right: byProduct.ad_right,
      },
    });
  } catch (error) {
    console.error('payments-stats error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
