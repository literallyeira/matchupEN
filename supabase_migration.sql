-- MatchUp GTAW OAuth Migration
-- Bu SQL'i Supabase SQL Editor'da çalıştır

-- 1. Applications tablosuna yeni sütunlar ekle
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS gtaw_user_id INTEGER,
ADD COLUMN IF NOT EXISTS character_id INTEGER,
ADD COLUMN IF NOT EXISTS character_name TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 1.1 Benzersizlik kuralı ekle (Upsert için gerekli)
-- Önce varsa temizlik
-- DELETE FROM applications a USING applications b WHERE a.id > b.id AND a.gtaw_user_id = b.gtaw_user_id AND a.character_id = b.character_id;
-- SQL: ALTER TABLE applications ADD CONSTRAINT unique_user_character UNIQUE (gtaw_user_id, character_id);

-- 2. Matches tablosuna admin sütununu ekleyelim
ALTER TABLE matches ADD COLUMN IF NOT EXISTS created_by_admin TEXT;

-- 3. Logs tablosu oluştur
CREATE TABLE IF NOT EXISTS logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  admin_name TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS: Tüm tablolara erişim izni (Geliştirme kolaylığı için)
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to logs" ON logs;
CREATE POLICY "Allow all access to logs" ON logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to matches" ON matches;
CREATE POLICY "Allow all access to matches" ON matches FOR ALL USING (true) WITH CHECK (true);

-- 4. Matches tablosu oluştur (Daha önce yoksa)
CREATE TABLE IF NOT EXISTS matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_1_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  application_2_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  UNIQUE(application_1_id, application_2_id)
);

-- 3. Index'ler (performans için)
CREATE INDEX IF NOT EXISTS idx_applications_gtaw_user ON applications(gtaw_user_id);
CREATE INDEX IF NOT EXISTS idx_applications_character ON applications(character_id);
CREATE INDEX IF NOT EXISTS idx_matches_app1 ON matches(application_1_id);
CREATE INDEX IF NOT EXISTS idx_matches_app2 ON matches(application_2_id);

-- 4. RLS (Row Level Security) - matches tablosu için
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir (kullanıcılar kendi eşleşmelerini görmeli)
CREATE POLICY "Allow read access to matches" ON matches
  FOR SELECT USING (true);

-- Sadece authenticated kullanıcılar insert/update/delete yapabilir
-- Not: Admin kontrolü API katmanında yapılıyor
CREATE POLICY "Allow all access to matches" ON matches
  FOR ALL USING (true);

-- 5. GTAW Kullanıcı Takibi (Gizli - Admin Panelde Görünmez)
CREATE TABLE IF NOT EXISTS gtaw_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gtaw_id INTEGER UNIQUE NOT NULL,
  username TEXT NOT NULL,
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gtaw_characters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id INTEGER UNIQUE NOT NULL,
  gtaw_user_id INTEGER REFERENCES gtaw_users(gtaw_id),
  firstname TEXT NOT NULL,
  lastname TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gtaw_users_gtaw_id ON gtaw_users(gtaw_id);
CREATE INDEX IF NOT EXISTS idx_gtaw_characters_user ON gtaw_characters(gtaw_user_id);

-- RLS for tracking tables
ALTER TABLE gtaw_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE gtaw_characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to gtaw_users" ON gtaw_users FOR ALL USING (true);
CREATE POLICY "Allow all access to gtaw_characters" ON gtaw_characters FOR ALL USING (true);

-- 6. Reddedilen Eşleşmeler (Önerilen eşleşmelerde tekrar gösterilmez)
CREATE TABLE IF NOT EXISTS rejected_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_1_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  application_2_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  rejected_by UUID REFERENCES applications(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(application_1_id, application_2_id)
);

CREATE INDEX IF NOT EXISTS idx_rejected_app1 ON rejected_matches(application_1_id);
CREATE INDEX IF NOT EXISTS idx_rejected_app2 ON rejected_matches(application_2_id);

ALTER TABLE rejected_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to rejected_matches" ON rejected_matches FOR ALL USING (true);
