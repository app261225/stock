-- =============================================
-- STOCK APP - FINAL SCHEMA
-- Gabungan dari semua SQL migrations yang telah dieksekusi
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- DROP EXISTING TABLES (Reset)
-- =============================================
DROP TABLE IF EXISTS stock_logs CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS konfigurasi CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS log_type CASCADE;

-- =============================================
-- ENUM TYPES
-- =============================================
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'staff');
CREATE TYPE log_type AS ENUM ('IN', 'OUT');

-- =============================================
-- USERS TABLE (Custom Authentication)
-- =============================================
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL, -- Store hashed password (bcrypt recommended)
    full_name TEXT,
    role user_role DEFAULT 'staff',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- PRODUCTS TABLE
-- =============================================
CREATE TABLE products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sku TEXT NOT NULL UNIQUE,
    nama_produk TEXT NOT NULL,
    stock INTEGER DEFAULT 0 CHECK (stock >= 0),
    min_stock INTEGER DEFAULT 5,
    
    -- Pricing (using DECIMAL for precision)
    harga_modal_non_rp DECIMAL(15,2) DEFAULT 0,
    harga_modal_rp DECIMAL(15,2) DEFAULT 0,
    harga_jual_rp DECIMAL(15,2) DEFAULT 0,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- =============================================
-- STOCK LOGS TABLE (Transaction History)
-- =============================================
CREATE TABLE stock_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type log_type NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    stock_before INTEGER NOT NULL,
    stock_after INTEGER NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- KONFIGURASI TABLE (Application Configuration)
-- =============================================
CREATE TABLE konfigurasi (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    config_key TEXT NOT NULL UNIQUE,
    config_value TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES (Performance Optimization)
-- =============================================

-- Products Indexes
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_nama ON products(nama_produk);
CREATE INDEX idx_products_stock ON products(stock);
CREATE INDEX idx_products_active ON products(is_active);

-- Stock Logs Indexes
CREATE INDEX idx_logs_product ON stock_logs(product_id);
CREATE INDEX idx_logs_created ON stock_logs(created_at DESC);
CREATE INDEX idx_logs_type ON stock_logs(type);
CREATE INDEX idx_logs_user ON stock_logs(user_id);

-- Users Indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- Konfigurasi Indexes
CREATE INDEX idx_konfigurasi_key ON konfigurasi(config_key);

-- =============================================
-- TRIGGERS & FUNCTIONS
-- =============================================

-- Auto update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger untuk users table
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Trigger untuk products table
CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Auto update stock on log insert
CREATE OR REPLACE FUNCTION update_stock_on_log()
RETURNS TRIGGER AS $$
BEGIN
    -- Get current stock
    DECLARE
        current_stock INTEGER;
    BEGIN
        SELECT stock INTO current_stock 
        FROM products 
        WHERE id = NEW.product_id;
        
        NEW.stock_before := current_stock;
        
        -- Update product stock
        IF NEW.type = 'IN' THEN
            UPDATE products 
            SET stock = stock + NEW.quantity,
                updated_at = NOW()
            WHERE id = NEW.product_id;
            NEW.stock_after := current_stock + NEW.quantity;
        ELSIF NEW.type = 'OUT' THEN
            -- Prevent negative stock
            IF current_stock < NEW.quantity THEN
                RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', current_stock, NEW.quantity;
            END IF;
            
            UPDATE products 
            SET stock = stock - NEW.quantity,
                updated_at = NOW()
            WHERE id = NEW.product_id;
            NEW.stock_after := current_stock - NEW.quantity;
        END IF;
        
        RETURN NEW;
    END;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_stock
    BEFORE INSERT ON stock_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_on_log();

-- =============================================
-- REALTIME CONFIGURATION
-- =============================================

-- Enable REPLICA IDENTITY FULL for realtime support
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.stock_logs REPLICA IDENTITY FULL;
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER TABLE public.konfigurasi REPLICA IDENTITY FULL;

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE konfigurasi ENABLE ROW LEVEL SECURITY;

-- Create policies for all tables (allowing all operations for custom auth)
CREATE POLICY "Allow all for users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all for products" ON products FOR ALL USING (true);
CREATE POLICY "Allow all for stock_logs" ON stock_logs FOR ALL USING (true);
CREATE POLICY "Allow all for konfigurasi" ON konfigurasi FOR ALL USING (true);

-- Additional policies for anonymous SELECT access (if needed)
CREATE POLICY "Allow anonymous SELECT on products" ON public.products
FOR SELECT
USING (is_active = true);

CREATE POLICY "Allow anonymous SELECT on stock_logs" ON public.stock_logs
FOR SELECT
USING (true);

CREATE POLICY "Allow anonymous SELECT on users" ON public.users
FOR SELECT
USING (true);

-- =============================================
-- HELPFUL VIEWS
-- =============================================

-- View for low stock products
CREATE OR REPLACE VIEW v_low_stock_products AS
SELECT 
    id,
    sku,
    nama_produk,
    stock,
    min_stock,
    CASE 
        WHEN stock = 0 THEN 'HABIS'
        WHEN stock <= min_stock THEN 'MENIPIS'
        ELSE 'AMAN'
    END as status_stock
FROM products
WHERE stock <= min_stock AND is_active = true
ORDER BY stock ASC;

-- View for recent stock movements
CREATE OR REPLACE VIEW v_recent_stock_logs AS
SELECT 
    sl.id,
    sl.created_at,
    p.sku,
    p.nama_produk,
    sl.type,
    sl.quantity,
    sl.stock_before,
    sl.stock_after,
    u.full_name as user_name,
    sl.notes
FROM stock_logs sl
JOIN products p ON sl.product_id = p.id
LEFT JOIN users u ON sl.user_id = u.id
ORDER BY sl.created_at DESC;

-- =============================================
-- SAMPLE DATA (Development Only - Remove in Production)
-- =============================================

-- Insert admin user (password: admin123 - CHANGE IN PRODUCTION!)
-- Note: In real app, hash this with bcrypt
INSERT INTO users (username, password, full_name, role) VALUES
('admin', 'admin123', 'Super Administrator', 'super_admin'),
('staff1', 'staff123', 'Staff User', 'staff');

-- Insert sample products
INSERT INTO products (sku, nama_produk, stock, min_stock, harga_modal_non_rp, harga_modal_rp, harga_jual_rp, created_by) 
SELECT 
    'SKU-001', 
    'Kemeja Flanel Kotak-kotak', 
    100, 
    10, 
    50.00, 
    100000, 
    150000,
    id
FROM users WHERE username = 'admin'
LIMIT 1;

INSERT INTO products (sku, nama_produk, stock, min_stock, harga_modal_non_rp, harga_modal_rp, harga_jual_rp, created_by) 
SELECT 
    'SKU-002', 
    'Celana Chino Navy', 
    8, 
    10, 
    60.00, 
    120000, 
    180000,
    id
FROM users WHERE username = 'admin'
LIMIT 1;

INSERT INTO products (sku, nama_produk, stock, min_stock, harga_modal_non_rp, harga_modal_rp, harga_jual_rp, created_by) 
SELECT 
    'SKU-003', 
    'Jaket Bomber', 
    0, 
    5, 
    80.00, 
    160000, 
    240000,
    id
FROM users WHERE username = 'admin'
LIMIT 1;

-- Insert sample stock log
INSERT INTO stock_logs (product_id, user_id, type, quantity, stock_before, stock_after, notes)
SELECT 
    p.id,
    u.id,
    'IN',
    50,
    0,
    50,
    'Initial stock'
FROM products p, users u
WHERE p.sku = 'SKU-001' AND u.username = 'admin';

-- =============================================
-- INSTRUCTIONS FOR REALTIME ACTIVATION
-- =============================================

-- After running this schema, complete realtime setup in Supabase Dashboard:
-- 1. Go to Database > Replication
-- 2. Enable replication for tables: products, stock_logs, users, konfigurasi
-- 3. Or go to each table and toggle "Realtime" ON in table settings

-- =============================================
-- USEFUL QUERIES FOR APPLICATION
-- =============================================

-- Query for incremental sync (get products updated after specific timestamp)
-- SELECT * FROM products WHERE updated_at > '2024-01-01T00:00:00Z' AND is_active = true;

-- Query for initial sync (get all active products)
-- SELECT id, sku, nama_produk, stock, min_stock, harga_modal_non_rp, harga_modal_rp, harga_jual_rp, is_active, updated_at 
-- FROM products WHERE is_active = true;

-- Query for dashboard statistics
-- SELECT 
--     COUNT(*) as total_products,
--     COUNT(*) FILTER (WHERE stock <= min_stock AND stock > 0) as low_stock_count,
--     COUNT(*) FILTER (WHERE stock = 0) as out_of_stock_count
-- FROM products WHERE is_active = true;

-- Query for stock value calculation
-- SELECT 
--     SUM(stock * harga_modal_rp) as total_modal,
--     SUM(stock * harga_jual_rp) as total_harga_jual,
--     SUM(stock * (harga_jual_rp - harga_modal_rp)) as potential_profit
-- FROM products WHERE is_active = true;
