-- Referans sayaci: application'i olmayan karakter bazinda
-- UNIQUE(referred_gtaw_user_id) -> UNIQUE(referred_application_id)
-- Ayni kullanici farkli karakterlerle 3 profil acarsa 3 referral sayilir
-- Supabase SQL Editor'da çalıştır (referrals tablosu varsa)

ALTER TABLE referrals DROP CONSTRAINT IF EXISTS referrals_referred_gtaw_user_id_key;
ALTER TABLE referrals ADD CONSTRAINT referrals_referred_application_id_key UNIQUE (referred_application_id);
