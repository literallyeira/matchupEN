-- ============================================
-- Çoklu Fotoğraf + Promptlar + Rozetler + İstatistikler + Günün Profili
-- ============================================

-- 1. Çoklu fotoğraf (ek fotoğraflar, maks 4)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS extra_photos JSONB DEFAULT '[]';

-- 2. Profil promptları (isteğe bağlı, boşsa gözükmez)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS prompts JSONB DEFAULT '{}';

-- 3. Admin doğrulanmış rozeti
ALTER TABLE applications ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- 4. Profil görüntüleme takibi (istatistikler için)
CREATE TABLE IF NOT EXISTS profile_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  viewer_application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  viewed_application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profile_views_viewed ON profile_views(viewed_application_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_date ON profile_views(created_at);

ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to profile_views" ON profile_views;
CREATE POLICY "Allow all access to profile_views" ON profile_views FOR ALL USING (true) WITH CHECK (true);
