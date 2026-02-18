-- Genel ayarlar tablosu (key-value)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to settings" ON settings;
CREATE POLICY "Allow all access to settings" ON settings FOR ALL USING (true) WITH CHECK (true);

-- Varsayılan: reklamlar kapalı
INSERT INTO settings (key, value) VALUES ('ads_enabled', 'false')
ON CONFLICT (key) DO NOTHING;
