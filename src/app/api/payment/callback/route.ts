import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';
import { extendOrSetSubscription } from '@/lib/limits';

const AUTH_KEY = process.env.GTAW_GATEWAY_AUTH_KEY!;
const BASE_URL = process.env.NEXTAUTH_URL || 'https://matchup.icu';

// GET - Gateway ödeme sonrası yönlendirme; token doğrula, ürünü aktif et
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const urlToken = searchParams.get('token');

  const cookieStore = await cookies();
  const orderId = cookieStore.get('matchup_pending_order')?.value;

  try {
    let order: Record<string, unknown> | null = null;

    // 1. Cookie varsa orderId ile siparişi bul
    if (orderId) {
      const { data } = await supabase
        .from('pending_orders')
        .select('application_id, product, amount, gateway_token, order_id')
        .eq('order_id', orderId)
        .single();
      order = data;
    }

    // 2. Cookie yoksa veya sipariş bulunamadıysa, URL token ile bul
    if (!order && urlToken) {
      console.log('Payment callback: cookie ile sipariş bulunamadı, token ile deneniyor');
      const { data } = await supabase
        .from('pending_orders')
        .select('application_id, product, amount, gateway_token, order_id')
        .eq('gateway_token', urlToken)
        .single();
      order = data;
    }

    // 3. Son çare: en son pending order
    if (!order) {
      console.log('Payment callback: token ile de bulunamadı, en son siparişi deniyoruz');
      const { data } = await supabase
        .from('pending_orders')
        .select('application_id, product, amount, gateway_token, order_id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      order = data;
    }

    if (!order) {
      console.error('Payment callback: hiçbir yöntemle sipariş bulunamadı', { orderId, urlToken });
      return NextResponse.redirect(new URL('/?payment=error', BASE_URL));
    }

    // Token: URL'den gelen veya veritabanında kayıtlı olan
    const token = urlToken || (order.gateway_token as string | null);
    if (!token) {
      console.error('Payment callback: token bulunamadı (URL veya DB)');
      return NextResponse.redirect(new URL('/?payment=error', BASE_URL));
    }

    const validateRes = await fetch(
      `https://banking-tr.gta.world/gateway_token/${encodeURIComponent(token)}/strict`,
      { method: 'GET' }
    );

    // Doğrulama başarısızsa ama DB'deki farklı tokenle dene
    if (!validateRes.ok && urlToken && order.gateway_token && urlToken !== order.gateway_token) {
      console.log('Payment callback: URL token doğrulama başarısız, DB token deneniyor');
      const retryRes = await fetch(
        `https://banking-tr.gta.world/gateway_token/${encodeURIComponent(order.gateway_token as string)}/strict`,
        { method: 'GET' }
      );
      if (retryRes.ok) {
        const retryData = (await retryRes.json()) as {
          auth_key?: string;
          message?: string;
          payment?: number;
          sandbox?: boolean;
        };
        if (retryData.auth_key === AUTH_KEY && retryData.message === 'payment_successful') {
          return processPayment(order, retryData, order.gateway_token as string);
        }
      }
      console.error('Payment callback: her iki token ile de doğrulama başarısız');
      return NextResponse.redirect(new URL('/?payment=error', BASE_URL));
    }

    if (!validateRes.ok) {
      console.error('Payment callback: token doğrulama başarısız', validateRes.status);
      return NextResponse.redirect(new URL('/?payment=error', BASE_URL));
    }

    const data = (await validateRes.json()) as {
      auth_key?: string;
      message?: string;
      payment?: number;
      sandbox?: boolean;
    };

    if (data.auth_key !== AUTH_KEY || data.message !== 'payment_successful') {
      console.error('Payment callback: auth_key veya message eşleşmedi', data.message);
      return NextResponse.redirect(new URL('/?payment=error', BASE_URL));
    }

    return processPayment(order, data, token);
  } catch (error) {
    console.error('Payment callback error:', error);
    return NextResponse.redirect(new URL('/?payment=error', BASE_URL));
  }
}

async function processPayment(
  order: Record<string, unknown>,
  data: { payment?: number; [key: string]: unknown },
  token: string
) {
  const paymentAmount = Number(data.payment);
  if (paymentAmount < (order.amount as number)) {
    console.error('Payment callback: insufficient payment amount', paymentAmount, '<', order.amount);
    return NextResponse.redirect(new URL('/?payment=error', BASE_URL));
  }

  const appId = order.application_id as string;
  const product = order.product as string;
  const now = new Date();

  if (product === 'plus') {
    await extendOrSetSubscription(appId, 'plus', 7);
  } else if (product === 'pro') {
    await extendOrSetSubscription(appId, 'pro', 7);
  } else if (product === 'boost') {
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    await supabase.from('boosts').insert({
      application_id: appId,
      expires_at: expiresAt.toISOString(),
    });
  } else if (product === 'ad_left' || product === 'ad_right') {
    // Activate ad - find record matching order_id
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from('ads')
      .update({ is_active: true, expires_at: weekFromNow })
      .eq('order_id', order.order_id as string);
  }

  await supabase.from('payments').insert({
    application_id: appId,
    product,
    amount: paymentAmount,
    gateway_token: token,
    gateway_response: data,
  });

  await supabase
    .from('pending_orders')
    .delete()
    .eq('order_id', order.order_id as string);

  const res = NextResponse.redirect(new URL('/?payment=success', BASE_URL));
  res.cookies.delete('matchup_pending_order');
  return res;
}
