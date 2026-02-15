-- TERLANJUR MENJALANKAN INI

-- Enable Realtime for Stock App Tables
-- Run this in Supabase SQL Editor

-- 1. Enable REPLICA IDENTITY FULL (required for realtime)
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.stock_logs REPLICA IDENTITY FULL;
ALTER TABLE public.users REPLICA IDENTITY FULL;

-- 2. Optional: Disable RLS for development (NOT production safe!)
-- Uncomment these lines if you want to disable row-level security
-- ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.stock_logs DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 3. If RLS is enabled, create policies for anonymous access
-- Make sure you have these policies enabled:

-- For products table
CREATE POLICY "Allow anonymous SELECT on products" ON public.products
FOR SELECT
USING (is_active = true);

-- For stock_logs table  
CREATE POLICY "Allow anonymous SELECT on stock_logs" ON public.stock_logs
FOR SELECT
USING (true);

-- For users table
CREATE POLICY "Allow anonymous SELECT on users" ON public.users
FOR SELECT
USING (true);

-- Done! 
-- Next: Enable realtime in Supabase Dashboard
-- 1. Go to Supabase Dashboard > your-project > Database > Tables
-- 2. For each table (products, stock_logs, users):
--    - Click on table name
--    - Scroll down to "Realtime" section
--    - Toggle "Realtime" ON
-- 3. Save changes
