import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

function generateOrderId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

const AUTH_KEY = process.env.GTAW_GATEWAY_AUTH_KEY!;
const GATEWAY_BASE = 'https://banking-tr.gta.world';

const PRODUCTS: Record<string, { price: number }> = {
  plus: { price: 5000 },
  pro: { price: 16500 },
  boost: { price: 5000 },
  ad_left: { price: 25000 },
  ad_right: { price: 25000 },
};

// POST - Start payment: pending order + gateway redirect URL
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.gtawId) {
    return NextResponse.json({ error: 'You must sign in' }, { status: 401 });
  }

  if (!AUTH_KEY) {
    return NextResponse.json({ error: 'Payment system not configured' }, { status: 500 });
  }

  try {
    const { product, characterId, adImageUrl, adLinkUrl } = await request.json();
    const validProducts = ['plus', 'pro', 'boost', 'ad_left', 'ad_right'];
    if (!product || !validProducts.includes(product)) {
      return NextResponse.json({ error: 'Invalid product' }, { status: 400 });
    }

    // Ad products require image and link
    if (product.startsWith('ad_') && (!adImageUrl || !adLinkUrl)) {
      return NextResponse.json({ error: 'Image and link required for ad' }, { status: 400 });
    }

    let appId: string | null = null;

    if (product.startsWith('ad_')) {
      // Ad products: use any profile the user has
      const { data: anyApp } = await supabase
        .from('applications')
        .select('id')
        .eq('gtaw_user_id', session.user.gtawId)
        .limit(1)
        .maybeSingle();
      appId = anyApp?.id || null;
    } else {
      if (!characterId) {
        return NextResponse.json({ error: 'characterId gerekli' }, { status: 400 });
      }
      const { data: myApp, error: appError } = await supabase
        .from('applications')
        .select('id')
        .eq('gtaw_user_id', session.user.gtawId)
        .eq('character_id', parseInt(characterId))
        .single();

      if (appError || !myApp) {
        return NextResponse.json({ error: 'Profil bulunamadı' }, { status: 404 });
      }
      appId = myApp.id;
    }

    const prod = PRODUCTS[product];
    const orderId = generateOrderId();

    const { error: insertError } = await supabase.from('pending_orders').insert({
      order_id: orderId,
      application_id: appId,
      product,
      amount: prod.price,
    });

    if (insertError) {
      console.error('Pending order insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    // If ad product, add to ads table as inactive (will activate after payment)
    if (product.startsWith('ad_')) {
      const position = product === 'ad_left' ? 'left' : 'right';
      const { error: adInsertError } = await supabase.from('ads').insert({
        gtaw_user_id: session.user.gtawId,
        position,
        image_url: adImageUrl,
        link_url: adLinkUrl,
        expires_at: new Date().toISOString(),
        is_active: false,
        order_id: orderId,
      });
      if (adInsertError) {
        console.error('Ad insert error:', adInsertError);
      }
    }

    // Token akışı: önce token üret, sonra /gateway/{token} ile yönlendir (query string 404 veriyor)
    const tokenRes = await fetch(
      `${GATEWAY_BASE}/gateway_token/generateToken?price=${prod.price}&type=0`,
      { headers: { Authorization: `Bearer ${AUTH_KEY}` } }
    );
    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('Gateway token error:', tokenRes.status, errText);
      return NextResponse.json(
        { error: 'Payment page could not be opened. Please try again later.' },
        { status: 502 }
      );
    }
    const paymentTokenRaw = await tokenRes.text();
    let token: string;
    try {
      const parsed = JSON.parse(paymentTokenRaw);
      token = typeof parsed === 'string' ? parsed : (parsed?.token ?? parsed?.data ?? String(parsed));
    } catch {
      token = paymentTokenRaw.replace(/^"|"$/g, '').trim();
    }
    if (!token) {
      return NextResponse.json({ error: 'Payment token could not be retrieved' }, { status: 502 });
    }
    await supabase.from('pending_orders').update({ gateway_token: token }).eq('order_id', orderId);

    const gatewayUrl = `${GATEWAY_BASE}/gateway/${encodeURIComponent(token)}`;

    const res = NextResponse.json({ redirectUrl: gatewayUrl });
    res.cookies.set('matchup_pending_order', orderId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 30,
      path: '/',
    });
    return res;
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
