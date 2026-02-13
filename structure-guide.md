# Stock Management App - Project Structure Guide

## Daftar Isi
1. [Overview](#overview)
2. [Folder Structure](#folder-structure)
3. [Core Dependencies](#core-dependencies)
4. [Alur Data & Dependencies](#alur-data--dependencies)
5. [File Details & Functions](#file-details--functions)
6. [Navigation Flow](#navigation-flow)
7. [State Management](#state-management)

---

## Overview

Ini adalah aplikasi **Expo React Native** untuk manajemen stok barang dengan fitur:
- 🔐 Autentikasi custom (username/password)
- 📦 Manajemen produk (CRUD)
- 📊 Dashboard statistik stok & transaksi
- 📋 Log transaksi stok (IN/OUT)
- 🔍 Advanced search dengan pagination

**Tech Stack:**
- **Framework:** Expo (~54.0.33), React Native (0.81.5)
- **Router:** Expo Router (~6.0.23) - File-based routing
- **Database:** Supabase (PostgreSQL)
- **State:** React Context API + AsyncStorage
- **UI:** React Native + Material Community Icons

---

## Folder Structure

```
09-02-2026/
├── app/                           # App screens & routing (Expo Router)
│   ├── _layout.jsx               # Root layout dengan AuthProvider
│   ├── index.jsx                 # Login screen (unauthenticated only)
│   ├── modal.tsx                 # Modal template
│   └── (tabs)/                   # Tabs layout group
│       ├── _layout.jsx           # Bottom tabs navigation
│       ├── index.jsx             # Dashboard screen
│       ├── products.jsx          # Products management screen
│       └── log.jsx               # Stock logs screen
│
├── services/                      # Business logic & API calls
│   ├── authService.js            # Authentication logic
│   ├── productService.js         # Product CRUD operations
│   └── stockLogService.js        # Stock log queries & filtering
│
├── contexts/                      # React Context for state
│   └── AuthContext.jsx           # Authentication state & session
│
├── lib/                           # Library & client setup
│   └── supabase.js               # Supabase client initialization
│
├── hooks/                         # Custom React hooks
│   ├── useAdvancedSearch.js      # Advanced search logic
│   ├── use-color-scheme.ts       # Color scheme detection
│   ├── use-color-scheme.web.ts   # Web-specific color scheme
│   └── use-theme-color.ts        # Theme color utilities
│
├── components/                    # Reusable UI components
│   ├── external-link.tsx         # Link component
│   ├── haptic-tab.tsx            # Haptic feedback tab button
│   ├── hello-wave.tsx            # Wave animation component
│   ├── parallax-scroll-view.tsx  # Parallax scroll view
│   ├── themed-text.tsx           # Text with theme support
│   ├── themed-view.tsx           # View with theme support
│   └── ui/                       # UI-specific components
│       ├── collapsible.tsx       # Collapsible component
│       ├── icon-symbol.tsx       # Icon symbol component
│       └── icon-symbol.ios.tsx   # iOS-specific icon symbol
│
├── constants/                     # App constants
│   └── theme.ts                  # Color & font definitions
│
├── assets/                        # Static assets
│   └── images/                   # App icons & images
│
├── scripts/                       # Build scripts
│   └── reset-project.js          # Reset project script
│
├── android/                       # Android native code
│   └── app/src/main/             # Android app source
│
├── Configuration Files
│   ├── app.json                  # Expo app configuration
│   ├── eas.json                  # EAS Build configuration
│   ├── package.json              # Dependencies & scripts
│   ├── tsconfig.json             # TypeScript configuration
│   ├── eslint.config.js          # ESLint rules
│   ├── expo-env.d.ts             # Expo env types
│   └── .env                      # Environment variables (Supabase keys)
```

---

## Core Dependencies

| Paket | Versi | Fungsi |
|-------|-------|--------|
| `expo` | ~54.0 | Framework & runtime |
| `expo-router` | ~6.0 | File-based routing |
| `react-native` | 0.81.5 | React Native core |
| `@supabase/supabase-js` | ^2.95.3 | Database client |
| `@react-navigation/*` | ^7.x | Navigation |
| `@react-native-async-storage/async-storage` | 2.2.0 | Local storage |
| `@expo/vector-icons` | ^15.0 | Material icons |
| `expo-haptics` | ~15.0 | Haptic feedback |

---

## Alur Data & Dependencies

### 1. **Authentication Flow**

```
LoginScreen (app/index.jsx)
    ↓
    └─→ useSession() hook → AuthContext
            ↓
            └─→ AuthProvider.signIn()
                    ↓
                    └─→ authService.login(username, password)
                            ↓
                            └─→ supabase.from('users').select()
                                    ↓
                                    └─→ AsyncStorage.setItem(session)
                                            ↓
                                            └─→ AuthContext state updated
                                                    ↓
                                                    └─→ Navigator redirects to (tabs)
```

**File Involvement:**
- `lib/supabase.js` - Inisialisasi client Supabase
- `services/authService.js` - Login/logout logic
- `contexts/AuthContext.jsx` - Session state management
- `app/index.jsx` - Login form UI
- `app/_layout.jsx` - Protected routing

---

### 2. **Dashboard Data Flow**

```
DashboardScreen (app/(tabs)/index.jsx)
    ↓
    ├─→ productService.getStockStats()
    │       ↓
    │       └─→ supabase.from('products').select() + aggregation
    │
    ├─→ stockLogService.getTodayStats()
    │       ↓
    │       └─→ supabase.from('stock_logs').select() + filtering
    │
    ├─→ productService.getStockValue()
    │       ↓
    │       └─→ supabase calculations
    │
    └─→ stockLogService.getAll(limit)
            ↓
            └─→ Display stats & recent logs
```

**File Involvement:**
- `services/productService.js` - Methods: `getStockStats()`, `getStockValue()`
- `services/stockLogService.js` - Method: `getTodayStats()`, `getAll()`
- `app/(tabs)/index.jsx` - UI rendering

---

### 3. **Products Management Flow**

```
ProductsScreen (app/(tabs)/products.jsx)
    ├─→ Load Products
    │   ├─→ productService.getAll(activeOnly=true)
    │   │       ↓
    │   │       └─→ supabase.from('products').select()
    │   │               ↓
    │   │               └─→ AsyncStorage cache (CACHE_KEY='products_cache')
    │   │
    │   └─→ Display in FlatList
    │
    ├─→ Search/Filter
    │   └─→ Filter state + search query → Local filtering
    │
    ├─→ Add Product
    │   └─→ productService.add(formData)
    │           ↓
    │           └─→ supabase.from('products').insert()
    │                   ↓
    │                   └─→ Invalidate cache & refresh
    │
    ├─→ Stock Action (IN/OUT)
    │   ├─→ stockLogService.addLog({product_id, type, quantity, notes})
    │   │       ↓
    │   │       └─→ supabase.from('stock_logs').insert()
    │   │
    │   └─→ productService.updateStock()
    │           ↓
    │           └─→ supabase.from('products').update()
    │
    ├─→ View Product Details
    │   ├─→ Show product info
    │   └─→ Load stock logs for this product
    │       └─→ stockLogService.getByProductId(productId, page, limit)
    │               ↓
    │               └─→ Pagination display
    │
    └─→ Edit Product
        └─→ productService.update(id, {name, price, min_stock})
                ↓
                └─→ supabase.from('products').update()
                        ↓
                        └─→ Invalidate cache & refresh
```

**File Involvement:**
- `services/productService.js` - Methods: `getAll()`, `add()`, `update()`, `getById()`, `getStockStats()`, `getStockValue()`, `updateStock()`
- `services/stockLogService.js` - Methods: `addLog()`, `getByProductId()`
- `app/(tabs)/products.jsx` - UI & state management

---

### 4. **Stock Logs Viewing Flow**

```
LogScreen (app/(tabs)/log.jsx)
    ├─→ Load all logs
    │   └─→ stockLogService.getAll()
    │           ↓
    │           └─→ supabase.from('stock_logs').select()
    │               with product & user relations
    │
    ├─→ Filter by type (ALL, IN, OUT)
    │   └─→ Local filtering on loaded data
    │
    ├─→ Search logs
    │   └─→ useAdvancedSearch hook
    │       ├─→ Quick search on loaded data
    │       └─→ Match: product.nama_produk, product.sku, user.name, notes
    │
    └─→ Display with formatting
        ├─→ formatCurrency() - IDR currency
        ├─→ formatDate() - DD MMM YYYY
        └─→ formatTime() - HH:MM
```

**File Involvement:**
- `services/stockLogService.js` - Method: `getAll()`, `getTodayStats()`, `getByProductId()`
- `hooks/useAdvancedSearch.js` - Custom search logic
- `app/(tabs)/log.jsx` - UI & filtering

---

## File Details & Functions

### **services/authService.js**

Menangani semua logika autentikasi. Menggunakan custom auth (bukan Supabase Auth).

| Method | Parameters | Returns | Deskripsi |
|--------|-----------|---------|-----------|
| `login(username, password)` | `string, string` | `Promise<{user, token, expiresAt}>` | Authenticate user dan buat session |
| `logout()` | - | `Promise<void>` | Clear session dari AsyncStorage |
| `getSession()` | - | `Promise<Session\|null>` | Retrieve stored session & validate expiry |
| `getCurrentUser()` | - | `Promise<User\|null>` | Get current user object |

**Dependencies:**
- `lib/supabase.js` - Supabase client untuk query `users` table
- `@react-native-async-storage/async-storage` - Session storage

**Used By:**
- `contexts/AuthContext.jsx` - Untuk login/logout
- `app/_layout.jsx` - Session checking

---

### **services/productService.js**

CRUD & aggregation untuk produk. Query lengkap dengan relasi users.

| Method | Parameters | Returns | Deskripsi |
|--------|-----------|---------|-----------|
| `getAll(activeOnly=true)` | `boolean` | `Promise<Product[]>` | Fetch semua produk dengan sort terbaru |
| `getById(productId)` | `uuid` | `Promise<Product>` | Get detail produk tunggal |
| `getBySkuOrName(query)` | `string` | `Promise<Product[]>` | Search by SKU atau nama |
| `add(formData)` | `{sku, nama_produk, harga_*, min_stock, stock}` | `Promise<Product>` | Create produk baru |
| `update(id, data)` | `uuid, {fields}` | `Promise<Product>` | Update produk existing |
| `delete(id)` | `uuid` | `Promise<void>` | Soft delete / deactivate |
| `updateStock(id, quantity, operation)` | `uuid, number, 'IN'\|'OUT'` | `Promise<void>` | Update stock (with validation min_stock) |
| `getStockStats()` | - | `Promise<{total, lowStock, outOfStock, healthy}>` | Aggregation untuk dashboard |
| `getStockValue()` | - | `Promise<{total_modal, total_harga_jual, potential_profit}>` | Value calculations |

**Database Relations:**
```sql
products (
  id: uuid,
  sku: string,
  nama_produk: string,
  stock: integer,
  min_stock: integer,
  harga_modal_cny: decimal,
  harga_modal_rp: decimal,
  harga_jual_rp: decimal,
  is_active: boolean,
  created_by: uuid → users.id,
  updated_by: uuid → users.id,
  created_at, updated_at: timestamp
)
```

**Used By:**
- `app/(tabs)/index.jsx` - Dashboard stats
- `app/(tabs)/products.jsx` - Product list, add, update, stock actions

---

### **services/stockLogService.js**

Log semua transaksi stok (IN/OUT). Dengan support pagination & filtering.

| Method | Parameters | Returns | Deskripsi |
|--------|-----------|---------|-----------|
| `getAll(limit=50, page=1, filters={})` | `number, number, object` | `Promise<{logs: StockLog[], total, hasMore}>` | Get logs with pagination |
| `getByProductId(productId, page=1, limit=10)` | `uuid, number, number` | `Promise<StockLog[]>` | Get logs untuk specific product |
| `addLog(data)` | `{product_id, type, quantity, stock_before, stock_after, notes}` | `Promise<StockLog>` | Create new log entry |
| `getTodayStats()` | - | `Promise<{totalIn, totalOut, transactionCount}>` | Today's transaction summary |
| `getStatsRange(startDate, endDate)` | `Date, Date` | `Promise<Stats>` | Statistics untuk date range |

**Database Relations:**
```sql
stock_logs (
  id: uuid,
  product_id: uuid → products.id,
  user_id: uuid → users.id,
  type: 'IN' | 'OUT',
  quantity: integer,
  stock_before: integer,
  stock_after: integer,
  notes: text,
  created_at: timestamp
)
```

**Used By:**
- `app/(tabs)/index.jsx` - Today stats, recent logs
- `app/(tabs)/products.jsx` - Stock action, product logs
- `app/(tabs)/log.jsx` - Log list & filtering

---

### **contexts/AuthContext.jsx**

Global state management untuk authentication session.

| Property/Method | Type | Deskripsi |
|-----------------|------|-----------|
| `session` | `{user, token, expiresAt}\|null` | Current user session |
| `loading` | `boolean` | Loading state saat check session |
| `signIn(username, password)` | `Function` | Login & set session |
| `signOut()` | `Function` | Logout & clear session |
| `useSession()` | Custom Hook | Access auth context (throw if outside provider) |

**Provides:**
- Session state ke seluruh app via Context
- Protected navigation: hanya tampil login jika no session, tabs jika ada session

**Used By:**
- `app/_layout.jsx` - Guard routing
- `app/(tabs)/_layout.jsx` - Logout button
- `app/index.jsx` - Login form
- `app/(tabs)/index.jsx` - Display user info

---

### **lib/supabase.js**

Supabase client configuration dengan AsyncStorage support.

| Export | Type | Deskripsi |
|--------|------|-----------|
| `supabase` | `SupabaseClient` | Initialized Supabase client |
| `SUPABASE_URL` | `string` | Public URL |
| `SUPABASE_KEY` | `string` | Anonymous key |

**Configuration:**
- Auth disabled (custom auth in authService)
- AsyncStorage integration untuk session (disabled, manual in authService)
- Custom headers: `'X-Client-Info': 'stock-app-mobile'`

**Environment Variables** (di `.env`):
```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

**Used By:**
- Semua service files (authService, productService, stockLogService)

---

### **hooks/useAdvancedSearch.js**

Custom hook untuk advanced search dengan dual-mode (quick + deep).

```javascript
const {
  searchQuery,           // Current search input
  setSearchQuery,        // Update search
  searchResults,         // Results array
  isSearching,           // Loading state
  noResultsFound         // Boolean: no match found
} = useAdvancedSearch(allData, isLoadingMore, searchFn, debounceMs=300)
```

**Logic:**
1. Quick search di `allData` yang sudah dimuat
2. Jika ada hasil → tampil langsung
3. Jika tidak ada & masih loading → tunggu (debounce)
4. Jika tidak ada & selesai → "tidak ditemukan"

**Search Fields:**
- `product.sku`, `product.nama_produk`
- `user.username`, `user.full_name`
- `notes`

**Used By:**
- `app/(tabs)/log.jsx` - Search logs

---

### **hooks/use-theme-color.ts**

Utility hook untuk theme color selection (light/dark mode).

```typescript
const color = useThemeColor(
  { light: '#black', dark: '#white' },
  'text' // fallback key dari Colors
);
```

**Used By:**
- `components/themed-text.tsx`
- `components/themed-view.tsx`

---

### **constants/theme.ts**

Theme colors & font definitions.

```typescript
Colors = {
  light: { text, background, tint, icon, tabIconDefault, tabIconSelected },
  dark: { ... }
}

Fonts = {
  ios: { sans, serif, rounded, mono },
  android: { ... }
}
```

**Used By:**
- Hook: `use-theme-color.ts`
- Components: themed-* components

---

### **app/_layout.jsx**

Root layout dengan authentication guard & provider setup.

**Structure:**
```jsx
SafeAreaProvider
  ↓
AuthProvider (provides session state)
  ↓
RootNavigator
  ├─→ Stack.Protected guard={!!session}
  │   └─→ (tabs) - Main app screens
  │
  └─→ Stack.Protected guard={!session}
      └─→ index - Login screen
```

**Flow:**
1. Check `useSession()` - apakah ada session
2. Jika ada → render `(tabs)`
3. Jika tidak → render login screen

---

### **app/index.jsx**

Login screen dengan form validation.

**Features:**
- Username & password input
- Show/hide password toggle
- Loading state selama login
- Form validation
- Alert pada error

**Dependencies:**
- `contexts/AuthContext.jsx` - `useSession()` hook untuk `signIn()`
- React Native UI components

**Flow:**
```
handleLogin()
  → Validate (username & password filled)
  → signIn(username, password) via AuthContext
  → Success → Navigation to (tabs)
  → Error → Show alert
```

---

### **app/(tabs)/_layout.jsx**

Bottom tab navigator dengan 3 screens.

**Tabs:**
1. **Home (index.jsx)** - Dashboard
2. **Products (products.jsx)** - Product management
3. **Logs (log.jsx)** - Stock logs

**Header Features:**
- Logout button (red icon + confirmation alert)
- Dynamic safe area insets
- Platform-specific styling (iOS vs Android)

**Dependencies:**
- `contexts/AuthContext.jsx` - `signOut()` untuk logout
- Expo Router & React Navigation

---

### **app/(tabs)/index.jsx**

Dashboard screen dengan statistik & overview.

**Data Loaded:**
- Total produk, low stock, out of stock, healthy
- Today's transactions (IN, OUT, count)
- Stock value (modal cost, selling price, profit)
- Recent 10 stock logs

**Features:**
- Animated cards (fade-in, slide, scale animations)
- Swipe-to-refresh
- Cards klik untuk navigate ke screens
- Real-time stats display

**Methods Called:**
- `productService.getStockStats()`
- `productService.getStockValue()`
- `stockLogService.getTodayStats()`
- `stockLogService.getAll(10)`

**Dependencies:**
- `contexts/AuthContext.jsx` - Session info
- `services/productService.js`
- `services/stockLogService.js`

---

### **app/(tabs)/products.jsx**

Products management dengan CRUD, stock actions, detail view.

**States:**
- `products[]` - All products
- `filteredProducts[]` - Filtered by search/status
- `showAddModal` - Add product dialog
- `showStockModal` - Stock IN/OUT dialog
- `showDetailModal` - Product detail view
- `showEditModal` - Edit product dialog

**Features:**
- **List View:**
  - FlatList dengan refresh control
  - Filter (All, Active, Low Stock, Out of Stock)
  - Search by SKU atau nama
  - Card menampilkan: SKU, nama, stock, status badge

- **Add Product Modal:**
  - Form: SKU, nama, harga modal (CNY/RP), harga jual, min stock
  - Validation & error handling
  - Calls: `productService.add()`

- **Stock Action Modal:**
  - Type: IN atau OUT
  - Input: quantity, notes
  - Calls: `stockLogService.addLog()` + `productService.updateStock()`

- **Product Detail Modal:**
  - Show product info
  - Load paginated stock logs
  - Calls: `stockLogService.getByProductId(productId, page, limit)`

- **Edit Product Modal:**
  - Update: nama, harga, min stock
  - Calls: `productService.update()`

**Caching:**
- `AsyncStorage` key: `'products_cache'`
- Invalidated setelah add/update/stock action

**Methods Called:**
- `productService.getAll()`
- `productService.add()`
- `productService.update()`
- `productService.updateStock()`
- `stockLogService.addLog()`
- `stockLogService.getByProductId()`

---

### **app/(tabs)/log.jsx**

Stock logs viewer dengan filter & search.

**States:**
- `allLogs[]` - All loaded logs
- `filter` - Type filter (all, in, out)
- `searchQuery` - Search input

**Features:**
- **List View:**
  - Logs dengan: product name, SKU, type (IN/OUT), quantity, stock before/after, date, user
  - Color badge: green (IN), red (OUT)
  - Formatted currency & date/time

- **Filtering:**
  - Type: All, IN, OUT
  - Search: product name, SKU, user, notes
  - Local filtering pada loaded data

- **Swipe-to-refresh:**
  - Reload all logs

**Methods Called:**
- `stockLogService.getAll()`

**Used Hooks:**
- `useAdvancedSearch()` - Via built-in filter logic

---

## Navigation Flow

### **Route Hierarchy (Expo Router)**

```
/ (root)
├─ _layout.jsx (SafeAreaProvider + AuthProvider + RootNavigator)
│
├─ index.jsx (Login - guard: !session)
│
└─ (tabs)/ (guard: !!session)
   ├─ _layout.jsx (Bottom tabs)
   │
   ├─ index.jsx (Dashboard / Home tab)
   │
   ├─ products.jsx (Products / Products tab)
   │
   ├─ log.jsx (Logs / Logs tab)
   │
   └─ modal.tsx (Modal template - unused in current version)
```

### **Navigation Conditions**

| Kondisi | Route |
|---------|-------|
| No session + App start | → `index.jsx` (Login) |
| Valid session + Login success | → `(tabs)` (Redirect to Dashboard) |
| Session + Tabs screen | → Navigate between index, products, log |
| Logout button click | → Clear session → `index.jsx` |

---

## State Management

### **1. Authentication State (AuthContext)**
```javascript
{
  session: { user, token, expiresAt } | null,
  loading: boolean,
  signIn: (username, password) => Promise,
  signOut: () => Promise
}
```
**Persistence:** AsyncStorage (key: `@stock_app_user_session`)

### **2. Dashboard Screen State**
```javascript
{
  stats: { total, lowStock, outOfStock, healthy },
  todayStats: { totalIn, totalOut, transactionCount },
  stockValue: { total_modal, total_harga_jual, potential_profit },
  loading: boolean,
  refreshing: boolean
}
```

### **3. Products Screen State**
```javascript
{
  products: Product[],
  filteredProducts: Product[],
  searchQuery: string,
  filter: 'all' | 'active' | 'lowstock' | 'outofstock',
  
  // Modals
  showAddModal: boolean,
  addFormData: { sku, nama_produk, harga_*, stock, min_stock },
  addSubmitting: boolean,
  
  showStockModal: boolean,
  stockAction: 'IN' | 'OUT',
  selectedProduct: Product,
  stockQuantity: string,
  stockNotes: string,
  stockSubmitting: boolean,
  
  showDetailModal: boolean,
  detailProduct: Product,
  stockLogs: StockLog[],
  logsPage: number,
  hasMoreLogs: boolean,
  
  showEditModal: boolean,
  editFormData: { nama_produk, harga_*, min_stock },
  editSubmitting: boolean,
  
  cacheLoaded: boolean
}
```
**Persistence:** AsyncStorage (key: `products_cache`)

### **4. Logs Screen State**
```javascript
{
  allLogs: StockLog[],
  filter: 'all' | 'in' | 'out',
  searchQuery: string,
  isLoadingInitial: boolean,
  refreshing: boolean
}
```

---

## Type Definitions (Inferred)

```typescript
// Authentication
interface Session {
  user: User;
  token: string;
  expiresAt: number;
}

interface User {
  id: string;
  username: string;
  full_name: string;
  email?: string;
  is_active: boolean;
  last_login?: string;
}

// Products
interface Product {
  id: string;
  sku: string;
  nama_produk: string;
  stock: number;
  min_stock: number;
  harga_modal_cny: number;
  harga_modal_rp: number;
  harga_jual_rp: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

// Stock Logs
interface StockLog {
  id: string;
  product_id: string;
  user_id: string;
  type: 'IN' | 'OUT';
  quantity: number;
  stock_before: number;
  stock_after: number;
  notes: string;
  created_at: string;
  
  // Relations (joined data)
  product?: {
    id: string;
    sku: string;
    nama_produk: string;
  };
  user?: {
    id: string;
    full_name: string;
    username: string;
  };
}
```

---

## Data Flow Diagram (High-Level)

```
┌─────────────────────────────────────────────────────────────┐
│                        SUPABASE                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  users   │  │products  │  │stock_logs│  │ other    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              ↑
                    ┌─────────┴──────────────┐
                    │   lib/supabase.js      │
                    │   (Client Instance)    │
                    └─────────┬──────────────┘
                              ↓
         ┌────────────────────┼────────────────────┐
         ↓                    ↓                    ↓
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ authService  │  │productService│  │stockLogServ  │
    │ .login()     │  │ .getAll()    │  │ .getAll()    │
    │ .logout()    │  │ .add()       │  │ .addLog()    │
    │ .getSession()│  │ .update()    │  │ .getTodayStats
    └──────────────┘  └──────────────┘  └──────────────┘
         ↑                    ↑                    ↑
         │                    └────────┬───────────┘
         │                             │
         └─────────────────────────────┼──────────────────┐
                                       ↓                  ↓
                            ┌──────────────────┐  ┌──────────────────┐
                            │   AuthContext    │  │ Component State  │
                            │   (Session)      │  │ (React useState) │
                            └──────────────────┘  └──────────────────┘
                                       ↑                  ↑
                                       │                  │
                            ┌──────────┴──────────────────┴────────────┐
                            ↓                                           ↓
                    ┌──────────────────┐               ┌─────────────────────┐
                    │   app/_layout    │               │   UI Screens        │
                    │   (Root)         │               │ ├─ index (Login)   │
                    └──────────────────┘               │ ├─ (tabs)          │
                                                       │ │  ├─ index (Dash) │
                                                       │ │  ├─ products     │
                                                       │ │  └─ log          │
                                                       └─────────────────────┘
                                                               ↓
                                                    ┌──────────────────────┐
                                                    │   UI Rendering       │
                                                    │   (React Native)     │
                                                    └──────────────────────┘
```

---

## Common Workflows

### **Adding New Product**

1. User clicks "Add Product" button in ProductsScreen
2. `showAddModal` state becomes `true`
3. User fills form: `addFormData`
4. On submit:
   ```
   productService.add(addFormData)
     → supabase.from('products').insert()
     → Invalidate cache (AsyncStorage)
     → Reload products list
     → Close modal
   ```

### **Stock IN/OUT**

1. User selects product & clicks "IN" or "OUT"
2. `showStockModal` opens dengan `stockAction` set
3. User enters quantity & notes
4. On submit (parallel):
   ```
   ┌─→ stockLogService.addLog({
   │     product_id, type, quantity, notes
   │   })
   │     → supabase.from('stock_logs').insert()
   │
   └─→ productService.updateStock(id, quantity, type)
       → supabase.from('products').update({stock})
   ```
5. Both succeed → Refresh products & logs
6. Close modal

### **Searching Logs**

1. User types in search input: `setSearchQuery(text)`
2. Filter logs locally on `allLogs`:
   ```javascript
   allLogs.filter(log => {
     const q = searchQuery.toLowerCase();
     return (
       log.product.nama_produk.includes(q) ||
       log.product.sku.includes(q) ||
       log.user.name.includes(q) ||
       log.notes.includes(q)
     );
   });
   ```
3. Display filtered results in FlatList
4. Also apply type filter (IN/OUT)

### **Logout**

1. User clicks logout button (top-right header)
2. Alert confirmation dialog appears
3. User confirms
4. `signOut()` called via AuthContext:
   ```
   authService.logout()
     → AsyncStorage.removeItem('@stock_app_user_session')
     → AuthContext.session becomes null
     → Navigation redirects to login screen
   ```

---

## Performance Optimizations

### **Caching**
- Products list cached in AsyncStorage
- Cache key: `products_cache`
- Invalidated on: add, update, stock action

### **Pagination**
- Stock logs: paginated (10 items per page)
- Method: `getByProductId(productId, page, limit)`
- Prevents loading all history at once

### **Debouncing**
- Search input: 300ms debounce (in `useAdvancedSearch`)
- Prevents excessive searches while typing

### **Parallel Loading**
- Dashboard loads 4 requests in parallel:
  ```javascript
  Promise.all([
    productService.getStockStats(),
    stockLogService.getTodayStats(),
    productService.getStockValue(),
    stockLogService.getAll(10)
  ])
  ```

### **Animations**
- Fade-in, slide, scale animations on dashboard
- Uses React Native `Animated` API
- Native driver for smooth performance

---

## Best Practices & Conventions

### **Naming**
- Files: camelCase (components/ThemedText.tsx)
- Folders: kebab-case (components/, services/)
- Variables: camelCase (currentUser, isLoading)
- Constants: UPPER_SNAKE_CASE (USER_SESSION_KEY)

### **Code Organization**
- One component/service per file
- Group related functionality (contexts, services, hooks)
- Separate concerns: UI in `app/`, logic in `services/`, state in `contexts/`

### **Error Handling**
- Try-catch in all async operations
- Console.error for logging
- User-friendly alerts via Alert.alert()
- Validation before API calls

### **Database Queries**
- Always select specific fields (not `*`)
- Use `.single()` for single record
- Include relations needed (joins)
- Apply filters in query (not client-side for large datasets)
- Order by created_at descending (latest first)

### **State Management**
- Use Context for global state (session)
- Use useState for component-specific state
- Use AsyncStorage for persistent data
- Debounce expensive operations (search)

---

## Troubleshooting Tips

| Issue | Solution |
|-------|----------|
| Session not persisting | Check AsyncStorage & `getSession()` in AuthContext |
| Products not updating | Verify cache invalidation logic in ProductsScreen |
| Logs not filtering | Check filter logic & search query matching |
| Slow load times | Enable parallel requests & pagination |
| Login fails silently | Check Supabase credentials in `.env` |
| Navigation stuck | Verify AuthContext provider wraps navigation |

---

## Next Steps & Improvements

- [ ] Add TypeScript types throughout (currently mixed JS/TS)
- [ ] Implement proper error boundaries
- [ ] Add offline support with sync
- [ ] Encrypt sensitive data in AsyncStorage
- [ ] Add product image support
- [ ] Implement role-based access (admin vs cashier)
- [ ] Add data export (PDF/CSV)
- [ ] Implement real-time updates (Supabase subscriptions)
- [ ] Add unit & integration tests

---

**Last Updated:** February 13, 2026  
**Version:** 1.0.0  
**Author:** Auto-generated documentation
