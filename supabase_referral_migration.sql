-- Referans sistemi: 20 yeni davet = Pro
-- Supabase SQL Editor'da çalıştır

-- Her kullanıcının benzersiz referans kodu (gtaw_user_id -> code)
CREATE TABLE IF NOT EXISTS referral_codes (
  gtaw_user_id INTEGER PRIMARY KEY,
  code TEXT UNIQUE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);

-- Davet eden -> davet edilen (application'ı olmayan karakter bazında)
CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_gtaw_user_id INTEGER NOT NULL,
  referred_gtaw_user_id INTEGER NOT NULL,
  referred_application_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referred_application_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_gtaw_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_gtaw_user_id);

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to referral_codes" ON referral_codes;
CREATE POLICY "Allow all access to referral_codes" ON referral_codes FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to referrals" ON referrals;
CREATE POLICY "Allow all access to referrals" ON referrals FOR ALL USING (true) WITH CHECK (true);
