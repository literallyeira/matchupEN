-- Undo, Block, Report tablolari
-- Supabase SQL Editor'da calistir

-- 1. Gunluk Undo sayaci (Free: 1/gun, Pro: 5/gun)
CREATE TABLE IF NOT EXISTS daily_undo (
  application_id UUID PRIMARY KEY REFERENCES applications(id) ON DELETE CASCADE,
  undos_used_since_reset INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_daily_undo_reset ON daily_undo(reset_at);
ALTER TABLE daily_undo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all daily_undo" ON daily_undo FOR ALL USING (true) WITH CHECK (true);

-- 2. Engelleme
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  blocked_application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_application_id, blocked_application_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_blocker ON blocked_users(blocker_application_id);
CREATE INDEX IF NOT EXISTS idx_blocked_blocked ON blocked_users(blocked_application_id);
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all blocked_users" ON blocked_users FOR ALL USING (true) WITH CHECK (true);

-- 3. Raporlama
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  reported_application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_application_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_application_id);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all reports" ON reports FOR ALL USING (true) WITH CHECK (true);

-- 4. applications tablosuna last_active_at ekle
-- Eger column zaten varsa hata verebilir - o zaman bu satiri atla
ALTER TABLE applications ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_applications_last_active ON applications(last_active_at);
