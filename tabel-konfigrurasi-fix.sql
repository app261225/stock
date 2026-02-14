-- =============================================
-- KONFIGURASI TABLE (Application Configuration)
-- =============================================

-- Drop jika sudah ada
DROP TABLE IF EXISTS konfigurasi CASCADE;

-- Buat tabel konfigurasi
CREATE TABLE konfigurasi (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    config_key TEXT NOT NULL UNIQUE,
    config_value TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index untuk performa
CREATE INDEX idx_konfigurasi_key ON konfigurasi(config_key);

-- RLS Policy
ALTER TABLE konfigurasi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for konfigurasi" ON konfigurasi FOR ALL USING (true);