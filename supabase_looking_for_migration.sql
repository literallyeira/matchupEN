-- looking_for: Arkadaş arıyor (friends) | Flört arıyor (dating) - sadece rozet, eşleşmeyi etkilemez
-- Supabase SQL Editor'da çalıştır

ALTER TABLE applications ADD COLUMN IF NOT EXISTS looking_for TEXT CHECK (looking_for IN ('friends', 'dating'));
