-- Reklam sistemi: sol ve sağ banner alanları, 25k/hafta
CREATE TABLE IF NOT EXISTS ads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gtaw_user_id INTEGER NOT NULL,
  position TEXT NOT NULL CHECK (position IN ('left', 'right')),
  image_url TEXT NOT NULL,
  link_url TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  order_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ads_active ON ads(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_ads_position ON ads(position);

ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to ads" ON ads;
CREATE POLICY "Allow all access to ads" ON ads FOR ALL USING (true) WITH CHECK (true);
