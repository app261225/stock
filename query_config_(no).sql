-- =============================================
-- CONFIG TABLE (Application Configuration)
-- =============================================
CREATE TABLE config (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    config_key TEXT NOT NULL UNIQUE,
    config_value TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index untuk performa
CREATE INDEX idx_config_key ON config(config_key);

-- RLS Policy
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for config" ON config FOR ALL USING (true);