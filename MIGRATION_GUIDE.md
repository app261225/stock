# Migration Guide: Rename harga_modal_cny to harga_modal_non_rp

## ✅ Project Updates Completed

Semua file dalam project sudah diupdate untuk mengganti kolom `harga_modal_cny` → `harga_modal_non_rp`:

### 1. **Database Schema** (`supabase-schema.sql`)
- ✅ CREATE TABLE definition - line 50
- ✅ INSERT INTO sample data (3 products) - lines 186, 199, 212

### 2. **Backend Service** (`services/productService.js`)
- ✅ `getAll()` method - SELECT query line 18
- ✅ `getById()` method - SELECT query line 57
- ✅ `add()` method - INSERT query line 187

### 3. **Frontend UI** (`app/(tabs)/products.jsx`)
- ✅ `addFormData` state initialization - line 27
- ✅ `handleNonRpChange()` function (renamed from handleCNYChange) - line 178
- ✅ `openAddProductModal()` reset form - line 287
- ✅ TextInput form field - line 679
  - Label: "Modal (Non-RP)" (changed from "Modal (CNY)")
  - Prefix: "$" (changed from "¥")
  - Function: `handleNonRpChange` (changed from `handleCNYChange`)

---

## 🔧 Next: Run Database Migration

**Salin query berikut dan jalankan di Supabase SQL Editor:**

### Step 1: Update kolom (REQUIRED)
```sql
ALTER TABLE products RENAME COLUMN IF EXISTS harga_modal_cny TO harga_modal_non_rp;
```

**Penjelasan:**
- Mengubah nama kolom di database
- Data dalam kolom tidak akan hilang
- IF EXISTS mencegah error jika kolom sudah di-rename

### Step 2: Verifikasi (OPTIONAL - untuk testing)
```sql
-- Cek struktur tabel
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products'
ORDER BY ordinal_position;
```

Expected output akan menampilkan kolom `harga_modal_non_rp` (bukan `harga_modal_cny`)

### Step 3: Verifikasi data (OPTIONAL - untuk testing)
```sql
-- Cek data ada dengan kolom baru
SELECT id, sku, nama_produk, harga_modal_non_rp, harga_modal_rp, harga_jual_rp 
FROM products 
LIMIT 5;
```

---

## ✨ Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Database Schema (SQL) | ✅ Updated | siap untuk migration |
| ProductService (API) | ✅ Updated | semua queries sudah diupdate |
| Products Screen (UI) | ✅ Updated | form, state, & function sudah diupdate |
| Structure Guide | ⚠️ Documentation only | bisa di-update kemudian |

---

## 🚀 Implementation Flow

```
1. ✅ Update Project Code (DONE)
   ├─ supabase-schema.sql
   ├─ services/productService.js
   └─ app/(tabs)/products.jsx

2. 🔄 Run Migration Query (NEXT)
   └─ ALTER TABLE products RENAME COLUMN ...

3. ✅ Test Aplikasi
   ├─ Add new product
   ├─ Verify data saved correctly
   └─ Check detail produk
```

---

## 📝 Notes

- Tidak ada data loss
- Backward compatibility tidak diperlukan (ini first migration)
- File yang di-ignore (build files, old schema) tidak perlu diupdate
- Semua kolom reference sudah fixed di code
