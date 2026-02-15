-- =============================================
-- SQLITE SCHEMA FOR ANDROID LOCAL-FIRST APP
-- Optimized for 10,000+ Products with Instant Search
-- =============================================

-- =============================================
-- DROP EXISTING TABLES (Reset)
-- =============================================
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS stock_logs;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS sync_metadata;
DROP INDEX IF EXISTS idx_products_search;
DROP INDEX IF EXISTS idx_products_updated;
DROP INDEX IF EXISTS idx_products_sku;
DROP INDEX IF EXISTS idx_products_active;
DROP INDEX IF EXISTS idx_logs_product;
DROP INDEX IF EXISTS idx_logs_created;

-- =============================================
-- PRODUCTS TABLE (Mirror dari Supabase)
-- =============================================
CREATE TABLE products (
    id TEXT PRIMARY KEY NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    nama_produk TEXT NOT NULL,
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    
    -- Pricing
    harga_modal_non_rp REAL DEFAULT 0,
    harga_modal_rp REAL DEFAULT 0,
    harga_jual_rp REAL DEFAULT 0,
    
    -- Status & Timestamps
    is_active INTEGER DEFAULT 1,
    created_at TEXT,
    updated_at TEXT NOT NULL,
    
    -- Search Optimization
    search_token TEXT NOT NULL,
    
    -- Metadata
    synced_at TEXT DEFAULT (datetime('now'))
);

-- =============================================
-- STOCK LOGS TABLE (Transaction History)
-- =============================================
CREATE TABLE stock_logs (
    id TEXT PRIMARY KEY NOT NULL,
    product_id TEXT NOT NULL,
    user_id TEXT,
    type TEXT NOT NULL CHECK(type IN ('IN', 'OUT')),
    quantity INTEGER NOT NULL,
    stock_before INTEGER NOT NULL,
    stock_after INTEGER NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL,
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- =============================================
-- USERS TABLE (Cache User Info)
-- =============================================
CREATE TABLE users (
    id TEXT PRIMARY KEY NOT NULL,
    username TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role TEXT,
    is_active INTEGER DEFAULT 1,
    last_login TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- =============================================
-- SYNC METADATA TABLE (Tracking Sync State)
-- =============================================
CREATE TABLE sync_metadata (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Insert default sync metadata
INSERT INTO sync_metadata (key, value) VALUES 
    ('last_sync_time', '1970-01-01T00:00:00Z'),
    ('total_products', '0'),
    ('sync_version', '1.0.0'),
    ('last_sync_status', 'never'),
    ('pending_sync', '0');

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Products - Search Optimization (CRITICAL untuk instant search)
CREATE INDEX idx_products_search ON products(search_token);

-- Products - Sync Optimization
CREATE INDEX idx_products_updated ON products(updated_at DESC);

-- Products - Business Logic
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_stock ON products(stock);

-- Composite index untuk low stock query
CREATE INDEX idx_products_low_stock ON products(stock, min_stock, is_active);

-- Stock Logs
CREATE INDEX idx_logs_product ON stock_logs(product_id);
CREATE INDEX idx_logs_created ON stock_logs(created_at DESC);
CREATE INDEX idx_logs_type ON stock_logs(type);

-- =============================================
-- FULL-TEXT SEARCH TABLE (FTS5 - Optimal)
-- =============================================

-- Drop jika ada
DROP TABLE IF EXISTS products_fts;

-- Buat FTS5 virtual table untuk pencarian super cepat
CREATE VIRTUAL TABLE products_fts USING fts5(
    product_id UNINDEXED,
    search_content,
    tokenize = 'unicode61 remove_diacritics 2'
);

-- =============================================
-- TRIGGERS FOR AUTO-SYNC FTS
-- =============================================

-- Trigger: Insert ke FTS saat insert ke products
CREATE TRIGGER products_ai AFTER INSERT ON products BEGIN
    INSERT INTO products_fts(product_id, search_content)
    VALUES (new.id, new.search_token);
END;

-- Trigger: Update FTS saat update products
CREATE TRIGGER products_au AFTER UPDATE ON products BEGIN
    UPDATE products_fts 
    SET search_content = new.search_token
    WHERE product_id = new.id;
END;

-- Trigger: Delete dari FTS saat delete products
CREATE TRIGGER products_ad AFTER DELETE ON products BEGIN
    DELETE FROM products_fts WHERE product_id = old.id;
END;

-- =============================================
-- HELPER VIEWS
-- =============================================

-- View: Low Stock Products
CREATE VIEW v_low_stock AS
SELECT 
    id,
    sku,
    nama_produk,
    stock,
    min_stock,
    harga_jual_rp,
    CASE 
        WHEN stock = 0 THEN 'HABIS'
        WHEN stock <= min_stock THEN 'MENIPIS'
        ELSE 'AMAN'
    END as status
FROM products
WHERE stock <= min_stock AND is_active = 1
ORDER BY stock ASC;

-- View: Recent Stock Logs with Product Info
CREATE VIEW v_recent_logs AS
SELECT 
    sl.id,
    sl.created_at,
    p.sku,
    p.nama_produk,
    sl.type,
    sl.quantity,
    sl.stock_before,
    sl.stock_after,
    sl.notes
FROM stock_logs sl
INNER JOIN products p ON sl.product_id = p.id
ORDER BY sl.created_at DESC
LIMIT 100;

-- =============================================
-- UTILITY FUNCTIONS (Sebagai Query Template)
-- =============================================

-- Query 1: Search Products (Instant Search - Main Query)
-- SELECT p.* FROM products p
-- INNER JOIN products_fts fts ON p.id = fts.product_id
-- WHERE fts.search_content MATCH ? || '*' 
-- AND p.is_active = 1
-- ORDER BY p.nama_produk
-- LIMIT 50;

-- Query 2: Search Products (Fallback - jika FTS tidak digunakan)
-- SELECT * FROM products
-- WHERE search_token LIKE '%' || ? || '%'
-- AND is_active = 1
-- ORDER BY nama_produk
-- LIMIT 50;

-- Query 3: Get Products for Sync (Incremental)
-- SELECT * FROM products
-- WHERE updated_at > ?
-- ORDER BY updated_at ASC;

-- Query 4: Insert or Replace Product
-- INSERT OR REPLACE INTO products 
-- (id, sku, nama_produk, stock, min_stock, harga_modal_non_rp, 
--  harga_modal_rp, harga_jual_rp, is_active, created_at, updated_at, search_token)
-- VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

-- Query 5: Batch Insert (untuk initial sync)
-- BEGIN TRANSACTION;
-- INSERT OR REPLACE INTO products (...) VALUES (...);
-- INSERT OR REPLACE INTO products (...) VALUES (...);
-- ... (repeat untuk semua records)
-- COMMIT;

-- Query 6: Update Sync Metadata
-- INSERT OR REPLACE INTO sync_metadata (key, value, updated_at)
-- VALUES ('last_sync_time', ?, datetime('now'));

-- Query 7: Get Last Sync Time
-- SELECT value FROM sync_metadata WHERE key = 'last_sync_time';

-- Query 8: Dashboard Statistics
-- SELECT 
--     COUNT(*) as total_products,
--     SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock,
--     SUM(CASE WHEN stock <= min_stock AND stock > 0 THEN 1 ELSE 0 END) as low_stock,
--     SUM(stock * harga_jual_rp) as total_value
-- FROM products
-- WHERE is_active = 1;

-- Query 9: Soft Delete (mark as inactive)
-- UPDATE products SET is_active = 0 WHERE id = ?;

-- Query 10: Hard Delete (untuk cleanup)
-- DELETE FROM products WHERE is_active = 0 AND updated_at < datetime('now', '-30 days');

-- =============================================
-- OPTIMIZATION SETTINGS
-- =============================================

-- Pragmas untuk performa optimal (jalankan setiap kali open database)
-- PRAGMA journal_mode = WAL;              -- Write-Ahead Logging untuk concurrency
-- PRAGMA synchronous = NORMAL;            -- Balance antara speed dan safety
-- PRAGMA cache_size = -64000;             -- Cache 64MB untuk performa
-- PRAGMA temp_store = MEMORY;             -- Gunakan memory untuk temp storage
-- PRAGMA mmap_size = 268435456;           -- Memory-mapped I/O 256MB
-- PRAGMA page_size = 4096;                -- Optimal page size
-- PRAGMA foreign_keys = ON;               -- Enable foreign key constraints

-- =============================================
-- MIGRATION MANAGEMENT
-- =============================================

-- Untuk tracking versi schema
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT DEFAULT (datetime('now')),
    description TEXT
);

INSERT INTO schema_version (version, description) VALUES 
    (1, 'Initial schema with FTS5 support');

-- =============================================
-- DATA INTEGRITY CHECKS
-- =============================================

-- Check 1: Validate all products have search_token
-- SELECT COUNT(*) FROM products WHERE search_token IS NULL OR search_token = '';

-- Check 2: Validate stock consistency
-- SELECT COUNT(*) FROM products WHERE stock < 0;

-- Check 3: Validate FTS sync
-- SELECT COUNT(*) FROM products p
-- LEFT JOIN products_fts fts ON p.id = fts.product_id
-- WHERE fts.product_id IS NULL;

-- =============================================
-- CLEANUP & MAINTENANCE QUERIES
-- =============================================

-- Cleanup 1: Remove old inactive products (jalankan periodik)
-- DELETE FROM products 
-- WHERE is_active = 0 
-- AND updated_at < datetime('now', '-90 days');

-- Cleanup 2: Vacuum database (untuk reclaim space)
-- VACUUM;

-- Cleanup 3: Optimize FTS table
-- INSERT INTO products_fts(products_fts) VALUES('optimize');

-- Cleanup 4: Rebuild FTS index (jika ada masalah)
-- INSERT INTO products_fts(products_fts) VALUES('rebuild');

-- =============================================
-- NOTES & BEST PRACTICES
-- =============================================

-- 1. SEARCH STRATEGY:
--    - Gunakan FTS5 (products_fts) untuk pencarian instant
--    - Fallback ke LIKE jika FTS gagal
--    - Selalu batasi hasil dengan LIMIT (50-100 items)

-- 2. SYNC STRATEGY:
--    - Initial sync: Download semua data, insert dengan batch transaction
--    - Incremental sync: Query berdasarkan last_sync_time
--    - Realtime: Update individual record saat ada notifikasi

-- 3. PERFORMANCE:
--    - Gunakan prepared statements untuk query berulang
--    - Batch insert dalam 1 transaction untuk 1000+ records
--    - Jalankan VACUUM setelah delete banyak data
--    - Monitor database size dan cleanup data lama

-- 4. ERROR HANDLING:
--    - Selalu gunakan transaction untuk batch operations
--    - Rollback jika ada error saat sync
--    - Log error ke table terpisah jika perlu

-- 5. SECURITY:
--    - Jangan simpan password di SQLite
--    - Enkripsi database jika menyimpan data sensitif (gunakan SQLCipher)
--    - Validasi data sebelum insert/update

-- =============================================
-- EXAMPLE USAGE FLOW
-- =============================================

-- INITIAL SYNC:
-- 1. BEGIN TRANSACTION;
-- 2. INSERT OR REPLACE INTO products (...) VALUES (...); (repeat 10,000 kali)
-- 3. UPDATE sync_metadata SET value = <current_timestamp> WHERE key = 'last_sync_time';
-- 4. UPDATE sync_metadata SET value = '10000' WHERE key = 'total_products';
-- 5. COMMIT;

-- INCREMENTAL SYNC:
-- 1. last_sync = SELECT value FROM sync_metadata WHERE key = 'last_sync_time';
-- 2. Fetch dari server: WHERE updated_at > last_sync
-- 3. BEGIN TRANSACTION;
-- 4. INSERT OR REPLACE INTO products (...) VALUES (...); (hanya yang berubah)
-- 5. UPDATE sync_metadata SET value = <current_timestamp> WHERE key = 'last_sync_time';
-- 6. COMMIT;

-- INSTANT SEARCH:
-- 1. User types "kemeja"
-- 2. Query: SELECT p.* FROM products p 
--          INNER JOIN products_fts fts ON p.id = fts.product_id
--          WHERE fts.search_content MATCH 'kemeja*' AND p.is_active = 1
--          LIMIT 50;
-- 3. Display results (takes <10ms)

-- REALTIME UPDATE:
-- 1. Receive WebSocket notification: product ID=xxx changed
-- 2. Fetch single product from server
-- 3. INSERT OR REPLACE INTO products (...) VALUES (...);
-- 4. UI auto-refresh

-- =============================================
-- END OF SCHEMA
-- =============================================
