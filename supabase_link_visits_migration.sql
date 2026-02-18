-- gtaw.link/matchupfb üzerinden gelen ziyaretçi takibi
-- Supabase SQL Editor'da çalıştır

CREATE TABLE IF NOT EXISTS link_visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ref TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_link_visits_ref ON link_visits(ref);
CREATE INDEX IF NOT EXISTS idx_link_visits_created_at ON link_visits(created_at);

ALTER TABLE link_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to link_visits" ON link_visits;
CREATE POLICY "Allow all access to link_visits" ON link_visits FOR ALL USING (true) WITH CHECK (true);
