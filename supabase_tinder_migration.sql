-- MatchUp Tinder-style: Like / Dislike → Mutual Like = Match
-- Bu SQL'i Supabase SQL Editor'da mevcut projede çalıştır

-- 1. Likes tablosu: kim kimi beğendi
CREATE TABLE IF NOT EXISTS likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  to_application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(from_application_id, to_application_id),
  CHECK (from_application_id != to_application_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_from ON likes(from_application_id);
CREATE INDEX IF NOT EXISTS idx_likes_to ON likes(to_application_id);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to likes" ON likes;
CREATE POLICY "Allow all access to likes" ON likes FOR ALL USING (true) WITH CHECK (true);

-- 2. Dislikes tablosu: kim kimi beğenmedi (tekrar gösterme)
CREATE TABLE IF NOT EXISTS dislikes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  to_application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(from_application_id, to_application_id),
  CHECK (from_application_id != to_application_id)
);

CREATE INDEX IF NOT EXISTS idx_dislikes_from ON dislikes(from_application_id);
CREATE INDEX IF NOT EXISTS idx_dislikes_to ON dislikes(to_application_id);

ALTER TABLE dislikes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to dislikes" ON dislikes;
CREATE POLICY "Allow all access to dislikes" ON dislikes FOR ALL USING (true) WITH CHECK (true);

-- Not: matches tablosu aynı kalıyor; eşleşmeler artık sadece API'de
-- karşılıklı like atıldığında oluşturulacak (created_by = 'mutual_like').
