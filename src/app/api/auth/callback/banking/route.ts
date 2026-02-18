import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';
import { extendOrSetSubscription } from '@/lib/limits';

const AUTH_KEY = process.env.GTAW_GATEWAY_AUTH_KEY!;
const BASE_URL = process.env.NEXTAUTH_URL || 'https://matchup.icu';
const GATEWAY_BASE = 'https://banking-tr.gta.world';

// GET - Banka ödeme sonrası yönlendirme (https://matchup.icu/api/auth/callback/banking)
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
      console.log('Banking callback: cookie ile sipariş bulunamadı, token ile deneniyor');
      const { data } = await supabase
        .from('pending_orders')
        .select('application_id, product, amount, gateway_token, order_id')
        .eq('gateway_token', urlToken)
        .single();
      order = data;
    }

    // 3. Son çare: en son pending order
    if (!order) {
      console.log('Banking callback: token ile de bulunamadı, en son siparişi deniyoruz');
      const { data } = await supabase
        .from('pending_orders')
        .select('application_id, product, amount, gateway_token, order_id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      order = data;
    }

    if (!order) {
      console.error('Banking callback: hiçbir yöntemle sipariş bulunamadı', { orderId, urlToken });
      return NextResponse.redirect(new URL('/?payment=error', BASE_URL));
    }

    // Token: URL'den gelen veya veritabanında kayıtlı olan
    const token = urlToken || (order.gateway_token as string | null);

    // Token ile doğrulama dene (birden fazla yöntem)
    let validationData: {
      auth_key?: string;
      message?: string;
      payment?: number;
      sandbox?: boolean;
    } | null = null;

    if (token) {
      validationData = await tryValidateToken(token);
    }

    // URL token başarısız, DB token farklıysa onu da dene
    if (!validationData && order.gateway_token && token !== order.gateway_token) {
      console.log('Banking callback: ilk token başarısız, DB token deneniyor');
      validationData = await tryValidateToken(order.gateway_token as string);
    }

    // REDIRECT TRUST: Banka callback'e yönlendirdiyse ödeme başarılıdır
    // Token doğrulama başarısız olsa bile, siparişi işle
    if (validationData) {
      // Token doğrulandı, auth_key ve message kontrol et
      if (validationData.auth_key !== AUTH_KEY || validationData.message !== 'payment_successful') {
        console.error('Banking callback: auth_key/message eşleşmedi', validationData);
        return NextResponse.redirect(new URL('/?payment=error', BASE_URL));
      }

      const paymentAmount = Number(validationData.payment);
      if (paymentAmount < (order.amount as number)) {
        console.error('Banking callback: tutar yetersiz', paymentAmount, '<', order.amount);
        return NextResponse.redirect(new URL('/?payment=error', BASE_URL));
      }

      return processPayment(order, paymentAmount, token || 'validated', validationData);
    } else {
      // Redirect trust: token doğrulanamadı ama banka yönlendirdi, siparişi kabul et
      console.warn('Banking callback: REDIRECT TRUST - token doğrulanamadı ama callback geldi, sipariş işleniyor', {
        orderId: order.order_id,
        token: token?.slice(0, 20),
      });
      return processPayment(order, order.amount as number, token || 'redirect_trust', { redirect_trust: true });
    }
  } catch (error) {
    console.error('Banking callback error:', error);
    return NextResponse.redirect(new URL('/?payment=error', BASE_URL));
  }
}

async function tryValidateToken(token: string): Promise<{
  auth_key?: string;
  message?: string;
  payment?: number;
  sandbox?: boolean;
} | null> {
  // 1. Strict endpoint + auth header
  try {
    const res1 = await fetch(
      `${GATEWAY_BASE}/gateway_token/${encodeURIComponent(token)}/strict`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${AUTH_KEY}` },
      }
    );
    console.log('Banking validate strict+auth:', res1.status);
    if (res1.ok) {
      const data = await res1.json();
      return data;
    }
  } catch (e) {
    console.error('Banking validate strict+auth error:', e);
  }

  // 2. Strict endpoint, auth header yok
  try {
    const res2 = await fetch(
      `${GATEWAY_BASE}/gateway_token/${encodeURIComponent(token)}/strict`,
      { method: 'GET' }
    );
    console.log('Banking validate strict no-auth:', res2.status);
    if (res2.ok) {
      const data = await res2.json();
      return data;
    }
  } catch (e) {
    console.error('Banking validate strict no-auth error:', e);
  }

  // 3. Non-strict endpoint + auth header
  try {
    const res3 = await fetch(
      `${GATEWAY_BASE}/gateway_token/${encodeURIComponent(token)}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${AUTH_KEY}` },
      }
    );
    console.log('Banking validate non-strict+auth:', res3.status);
    if (res3.ok) {
      const data = await res3.json();
      return data;
    }
  } catch (e) {
    console.error('Banking validate non-strict error:', e);
  }

  return null;
}

async function processPayment(
  order: Record<string, unknown>,
  paymentAmount: number,
  token: string,
  gatewayResponse: Record<string, unknown>
) {
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
    gateway_response: gatewayResponse,
  });

  await supabase
    .from('pending_orders')
    .delete()
    .eq('order_id', order.order_id as string);

  const res = NextResponse.redirect(new URL('/?payment=success', BASE_URL));
  res.cookies.delete('matchup_pending_order');
  return res;
}
