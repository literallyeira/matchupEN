import { supabase } from './supabase';

const FREE_DAILY_LIMIT = 25;
const PLUS_DAILY_LIMIT = 20;
const RESET_HOURS = 24;
const FREE_UNDO_PER_DAY = 1;
const PRO_UNDO_PER_DAY = 5;

export type Tier = 'free' | 'plus' | 'pro';

export interface LimitsInfo {
  tier: Tier;
  dailyLimit: number;
  remaining: number;
  resetAt: string;
  boostExpiresAt: string | null;
  subscriptionExpiresAt: string | null;
  undoRemaining?: number;
  undoResetAt?: string;
}

/** Aktif abonelik tier'ı (süresi dolmuşsa free) */
export async function getTier(applicationId: string): Promise<Tier> {
  const { data } = await supabase
    .from('subscriptions')
    .select('tier, expires_at')
    .eq('application_id', applicationId)
    .single();
  if (!data || new Date(data.expires_at) <= new Date()) return 'free';
  return data.tier as 'plus' | 'pro';
}

export async function getSubscriptionExpiry(applicationId: string): Promise<string | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select('expires_at')
    .eq('application_id', applicationId)
    .single();
  if (!data || new Date(data.expires_at) <= new Date()) return null;
  return data.expires_at;
}

const TIER_ORDER: Record<string, number> = { free: 0, plus: 1, pro: 2 };

/** Üyelik süresini ekle; üst düzey üyelik korunur (Pro varken Plus alırsa Pro kalır). */
export async function extendOrSetSubscription(
  applicationId: string,
  tier: 'plus' | 'pro',
  daysToAdd: number
): Promise<void> {
  const now = new Date();
  const { data: current } = await supabase
    .from('subscriptions')
    .select('tier, expires_at')
    .eq('application_id', applicationId)
    .single();

  let baseDate: Date;
  let effectiveTier: 'plus' | 'pro' = tier;

  if (current && new Date(current.expires_at) > now) {
    baseDate = new Date(current.expires_at);
    const currentTier = (current.tier as string) || 'free';
    if (TIER_ORDER[currentTier] > TIER_ORDER[tier]) {
      effectiveTier = currentTier as 'pro';
    }
  } else {
    baseDate = now;
  }

  const newExpiresAt = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  await supabase.from('subscriptions').upsert(
    { application_id: applicationId, tier: effectiveTier, expires_at: newExpiresAt.toISOString() },
    { onConflict: 'application_id' }
  );
}

/** Günlük limit: free 25, plus 20, pro sınırsız */
function dailyLimitForTier(tier: Tier): number {
  if (tier === 'pro') return 999999;
  if (tier === 'plus') return PLUS_DAILY_LIMIT;
  return FREE_DAILY_LIMIT;
}

export async function getDailyLimit(applicationId: string): Promise<number> {
  const tier = await getTier(applicationId);
  return dailyLimitForTier(tier);
}

/** Kullanılan ve sıfırlanma zamanını al; gerekirse sıfırla */
async function getOrResetDaily(applicationId: string): Promise<{ used: number; resetAt: Date }> {
  const now = new Date();
  const { data, error } = await supabase
    .from('daily_likes')
    .select('likes_used_since_reset, reset_at')
    .eq('application_id', applicationId)
    .single();

  if (error || !data) {
    const resetAt = new Date(now.getTime() + RESET_HOURS * 60 * 60 * 1000);
    await supabase.from('daily_likes').upsert({
      application_id: applicationId,
      likes_used_since_reset: 0,
      reset_at: resetAt.toISOString(),
    }, { onConflict: 'application_id' });
    return { used: 0, resetAt };
  }

  const resetAt = new Date(data.reset_at);
  if (now >= resetAt) {
    const newResetAt = new Date(now.getTime() + RESET_HOURS * 60 * 60 * 1000);
    await supabase.from('daily_likes').update({
      likes_used_since_reset: 0,
      reset_at: newResetAt.toISOString(),
    }).eq('application_id', applicationId);
    return { used: 0, resetAt: newResetAt };
  }
  return { used: data.likes_used_since_reset ?? 0, resetAt };
}

/** Like/dislike kullanılabilir mi? Kullanıldıysa sayacı artır. */
export async function consumeLikeSlot(applicationId: string): Promise<{ ok: boolean; remaining?: number; resetAt?: string }> {
  const limit = await getDailyLimit(applicationId);
  const { used, resetAt } = await getOrResetDaily(applicationId);
  if (used >= limit) {
    return { ok: false, remaining: 0, resetAt: resetAt.toISOString() };
  }
  const newUsed = used + 1;
  await supabase.from('daily_likes').upsert({
    application_id: applicationId,
    likes_used_since_reset: newUsed,
    reset_at: resetAt.toISOString(),
  }, { onConflict: 'application_id' });
  return { ok: true, remaining: limit - newUsed, resetAt: resetAt.toISOString() };
}

/** Sadece bilgi (sayacı artırmadan) — paralel sorgular */
export async function getLimitsInfo(applicationId: string): Promise<LimitsInfo> {
  // 3 bağımsız sorguyu paralel çalıştır (eskiden 5 sequential)
  const [subResult, dailyResult, boostResult] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('tier, expires_at')
      .eq('application_id', applicationId)
      .single(),
    supabase
      .from('daily_likes')
      .select('likes_used_since_reset, reset_at')
      .eq('application_id', applicationId)
      .single(),
    supabase
      .from('boosts')
      .select('expires_at')
      .eq('application_id', applicationId)
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Tier
  const now = new Date();
  let tier: Tier = 'free';
  let subscriptionExpiresAt: string | null = null;
  if (subResult.data && new Date(subResult.data.expires_at) > now) {
    tier = subResult.data.tier as 'plus' | 'pro';
    subscriptionExpiresAt = subResult.data.expires_at;
  }

  const dailyLimit = dailyLimitForTier(tier);

  // Daily reset
  let used = 0;
  let resetAt: Date;
  if (!dailyResult.data || dailyResult.error) {
    resetAt = new Date(now.getTime() + RESET_HOURS * 60 * 60 * 1000);
    await supabase.from('daily_likes').upsert({
      application_id: applicationId,
      likes_used_since_reset: 0,
      reset_at: resetAt.toISOString(),
    }, { onConflict: 'application_id' });
  } else {
    resetAt = new Date(dailyResult.data.reset_at);
    if (now >= resetAt) {
      resetAt = new Date(now.getTime() + RESET_HOURS * 60 * 60 * 1000);
      await supabase.from('daily_likes').update({
        likes_used_since_reset: 0,
        reset_at: resetAt.toISOString(),
      }).eq('application_id', applicationId);
      used = 0;
    } else {
      used = dailyResult.data.likes_used_since_reset ?? 0;
    }
  }

  const remaining = Math.max(0, dailyLimit - used);
  const boostExpiresAt = boostResult.data?.expires_at || null;

  const undoLimit = undoLimitForTier(tier);
  const { used: undoUsed, resetAt: undoResetAt } = await getOrResetUndoDaily(applicationId);
  const undoRemaining = Math.max(0, undoLimit - undoUsed);

  return {
    tier,
    dailyLimit: tier === 'pro' ? 999999 : dailyLimit,
    remaining,
    resetAt: resetAt.toISOString(),
    boostExpiresAt,
    subscriptionExpiresAt,
    undoRemaining,
    undoResetAt: undoResetAt.toISOString(),
  };
}

/** Undo gunluk limit: Free 1, Pro 5 */
function undoLimitForTier(tier: Tier): number {
  if (tier === 'pro') return PRO_UNDO_PER_DAY;
  return FREE_UNDO_PER_DAY;
}

/** Undo kullan: son dislike geri al, sayaci artir */
export async function consumeUndoSlot(applicationId: string): Promise<{ ok: boolean; remaining?: number; resetAt?: string }> {
  const tier = await getTier(applicationId);
  const limit = undoLimitForTier(tier);
  const { used, resetAt } = await getOrResetUndoDaily(applicationId);
  if (used >= limit) {
    return { ok: false, remaining: 0, resetAt: resetAt.toISOString() };
  }
  const newUsed = used + 1;
  await supabase.from('daily_undo').upsert({
    application_id: applicationId,
    undos_used_since_reset: newUsed,
    reset_at: resetAt.toISOString(),
  }, { onConflict: 'application_id' });
  return { ok: true, remaining: limit - newUsed, resetAt: resetAt.toISOString() };
}

async function getOrResetUndoDaily(applicationId: string): Promise<{ used: number; resetAt: Date }> {
  const now = new Date();
  const { data } = await supabase
    .from('daily_undo')
    .select('undos_used_since_reset, reset_at')
    .eq('application_id', applicationId)
    .single();

  if (!data) {
    const resetAt = new Date(now.getTime() + RESET_HOURS * 60 * 60 * 1000);
    await supabase.from('daily_undo').upsert({
      application_id: applicationId,
      undos_used_since_reset: 0,
      reset_at: resetAt.toISOString(),
    }, { onConflict: 'application_id' });
    return { used: 0, resetAt };
  }

  const resetAt = new Date(data.reset_at);
  if (now >= resetAt) {
    const newResetAt = new Date(now.getTime() + RESET_HOURS * 60 * 60 * 1000);
    await supabase.from('daily_undo').update({
      undos_used_since_reset: 0,
      reset_at: newResetAt.toISOString(),
    }).eq('application_id', applicationId);
    return { used: 0, resetAt: newResetAt };
  }
  return { used: data.undos_used_since_reset ?? 0, resetAt };
}

/** Undo kalan hak bilgisi */
export async function getUndoInfo(applicationId: string): Promise<{ remaining: number; resetAt: string }> {
  const tier = await getTier(applicationId);
  const limit = undoLimitForTier(tier);
  const { used, resetAt } = await getOrResetUndoDaily(applicationId);
  return { remaining: Math.max(0, limit - used), resetAt: resetAt.toISOString() };
}
