-- 1. Enable REPLICA IDENTITY FULL agar Realtime bisa mengirimkan data lama & baru

-- 2. Tambahkan ke publikasi Realtime (Langkah ini krusial jika kamu menggunakan sistem publikasi manual)
-- Jika kamu mengaktifkan via Dashboard, langkah ini biasanya otomatis.

ALTER TABLE public.konfigurasi REPLICA IDENTITY FULL;