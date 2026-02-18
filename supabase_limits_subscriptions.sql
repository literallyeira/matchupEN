-- MatchUp: Günlük like limiti, Plus/Pro/Boost, ödemeler
-- Supabase SQL Editor'da çalıştır

-- 1. Günlük like/dislike sayacı (24 saatte bir sıfırlanır)
CREATE TABLE IF NOT EXISTS daily_likes (
  application_id UUID PRIMARY KEY REFERENCES applications(id) ON DELETE CASCADE,
  likes_used_since_reset INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_daily_likes_reset ON daily_likes(reset_at);
ALTER TABLE daily_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all daily_likes" ON daily_likes FOR ALL USING (true) WITH CHECK (true);

-- 2. Abonelik (Plus haftalık 20 hak, Pro haftalık sınırsız + likelayanları gör)
CREATE TABLE IF NOT EXISTS subscriptions (
  application_id UUID PRIMARY KEY REFERENCES applications(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('plus', 'pro')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON subscriptions(expires_at);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all subscriptions" ON subscriptions FOR ALL USING (true) WITH CHECK (true);

-- 3. Beni öne çıkart (24 saat boost: uygun herkeste ilk 10'da)
CREATE TABLE IF NOT EXISTS boosts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boosts_app ON boosts(application_id);
CREATE INDEX IF NOT EXISTS idx_boosts_expires ON boosts(expires_at);
ALTER TABLE boosts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all boosts" ON boosts FOR ALL USING (true) WITH CHECK (true);

-- 4. Ödeme log (doğrulama sonrası)
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  product TEXT NOT NULL CHECK (product IN ('plus', 'pro', 'boost')),
  amount NUMERIC NOT NULL,
  gateway_token TEXT,
  gateway_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_app ON payments(application_id);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all payments" ON payments FOR ALL USING (true) WITH CHECK (true);

-- 5. Ödeme öncesi bekleyen sipariş (callback'te eşleştirmek için)
CREATE TABLE IF NOT EXISTS pending_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  product TEXT NOT NULL CHECK (product IN ('plus', 'pro', 'boost')),
  amount INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_orders_order_id ON pending_orders(order_id);
ALTER TABLE pending_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all pending_orders" ON pending_orders FOR ALL USING (true) WITH CHECK (true);
