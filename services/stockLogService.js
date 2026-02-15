import { supabase } from '../lib/supabase';

const stockLogService = {
  /**
   * Get all stock logs with product and user details
   * @param {number} limit 
   * @returns {Promise<Array>}
   */
  async getAll(limit = 50, page = 1, filters = {}) {
    try {
      // Support both simple limit mode and pagination mode
      if (typeof page === 'object') {
        // Called with (limit, filters) - no pagination
        filters = page;
        const { data, error } = await supabase
          .from('stock_logs')
          .select(`
            id,
            type,
            quantity,
            stock_before,
            stock_after,
            notes,
            created_at,
            products:product_id (
              id,
              sku,
              nama_produk
            ),
            users:user_id (
              id,
              full_name,
              username
            )
          `)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) throw error;

        return data.map(log => ({
          id: log.id,
          type: log.type,
          quantity: log.quantity,
          stock_before: log.stock_before,
          stock_after: log.stock_after,
          notes: log.notes,
          created_at: log.created_at,
          product: {
            id: log.products?.id,
            sku: log.products?.sku,
            nama_produk: log.products?.nama_produk,
          },
          user: {
            id: log.users?.id,
            name: log.users?.full_name || log.users?.username,
          },
        }));
      }

      // Pagination mode with filters
      const offset = (page - 1) * limit;
      let query = supabase.from('stock_logs').select(`
          id,
          type,
          quantity,
          stock_before,
          stock_after,
          notes,
          created_at,
          products:product_id (
            id,
            sku,
            nama_produk
          ),
          users:user_id (
            id,
            full_name,
            username
          )
        `, { count: 'exact' });

      // Apply filters
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Transform data
      const logs = data.map(log => ({
        id: log.id,
        type: log.type,
        quantity: log.quantity,
        stock_before: log.stock_before,
        stock_after: log.stock_after,
        notes: log.notes,
        created_at: log.created_at,
        product: {
          id: log.products?.id,
          sku: log.products?.sku,
          nama_produk: log.products?.nama_produk,
        },
        user: {
          id: log.users?.id,
          name: log.users?.full_name || log.users?.username,
        },
      }));

      return {
        logs,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      };
    } catch (error) {
      console.error('Get all stock logs error:', error);
      throw new Error(error.message || 'Gagal memuat riwayat stock');
    }
  },

  /**
   * Get stock logs by product ID (simple - no pagination)
   * @param {string} productId 
   * @param {number} limit 
   * @returns {Promise<Array>}
   */
  async getByProductId(productId, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('stock_logs')
        .select(`
          id,
          type,
          quantity,
          stock_before,
          stock_after,
          notes,
          created_at,
          products:product_id (
            id,
            sku,
            nama_produk
          ),
          users:user_id (
            id,
            full_name,
            username
          )
        `)
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map(log => ({
        id: log.id,
        type: log.type,
        quantity: log.quantity,
        stock_before: log.stock_before,
        stock_after: log.stock_after,
        notes: log.notes,
        created_at: log.created_at,
        product: {
          id: log.products?.id,
          sku: log.products?.sku,
          nama_produk: log.products?.nama_produk,
        },
        user: {
          id: log.users?.id,
          name: log.users?.full_name || log.users?.username,
        },
      }));
    } catch (error) {
      console.error('Get stock logs by product error:', error);
      throw new Error(error.message || 'Gagal memuat riwayat produk');
    }
  },

  /**
   * Get stock logs by product with pagination (for detail modal)
   * @param {string} productId 
   * @param {number} page - Page number (1-indexed)
   * @param {number} limit - Items per page
   * @returns {Promise<{logs: Array, total: number, page: number, limit: number, totalPages: number}>}
   */
  async getByProduct(productId, page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;

      // Get total count
      const { count, error: countError } = await supabase
        .from('stock_logs')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', productId);

      if (countError) throw countError;

      // Get paginated data with user info
      const { data, error } = await supabase
        .from('stock_logs')
        .select(`
          id,
          type,
          quantity,
          stock_before,
          stock_after,
          notes,
          created_at,
          users:user_id (
            id,
            full_name,
            username
          )
        `)
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Transform data to match expected format
      const logs = data.map(log => ({
        id: log.id,
        type: log.type,
        quantity: log.quantity,
        stock_before: log.stock_before,
        stock_after: log.stock_after,
        notes: log.notes,
        created_at: log.created_at,
        user_name: log.users?.full_name || log.users?.username || 'Unknown',
        user_id: log.users?.id,
      }));

      return {
        logs,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      };
    } catch (error) {
      console.error('Get stock logs by product error:', error);
      throw new Error(error.message || 'Gagal memuat riwayat stock');
    }
  },

  /**
   * Get today's stock logs
   * @returns {Promise<Array>}
   */
  async getToday() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('stock_logs')
        .select(`
          id,
          type,
          quantity,
          stock_before,
          stock_after,
          notes,
          created_at,
          products:product_id (
            id,
            sku,
            nama_produk
          ),
          users:user_id (
            id,
            full_name,
            username
          )
        `)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(log => ({
        id: log.id,
        type: log.type,
        quantity: log.quantity,
        stock_before: log.stock_before,
        stock_after: log.stock_after,
        notes: log.notes,
        created_at: log.created_at,
        product: {
          id: log.products?.id,
          sku: log.products?.sku,
          nama_produk: log.products?.nama_produk,
        },
        user: {
          id: log.users?.id,
          name: log.users?.full_name || log.users?.username,
        },
      }));
    } catch (error) {
      console.error('Get today stock logs error:', error);
      throw new Error(error.message || 'Gagal memuat riwayat hari ini');
    }
  },

  /**
   * Get stock logs by date range
   * @param {Date} startDate 
   * @param {Date} endDate 
   * @returns {Promise<Array>}
   */
  async getByDateRange(startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('stock_logs')
        .select(`
          id,
          type,
          quantity,
          stock_before,
          stock_after,
          notes,
          created_at,
          products:product_id (
            id,
            sku,
            nama_produk
          ),
          users:user_id (
            id,
            full_name,
            username
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(log => ({
        id: log.id,
        type: log.type,
        quantity: log.quantity,
        stock_before: log.stock_before,
        stock_after: log.stock_after,
        notes: log.notes,
        created_at: log.created_at,
        product: {
          id: log.products?.id,
          sku: log.products?.sku,
          nama_produk: log.products?.nama_produk,
        },
        user: {
          id: log.users?.id,
          name: log.users?.full_name || log.users?.username,
        },
      }));
    } catch (error) {
      console.error('Get stock logs by date range error:', error);
      throw new Error(error.message || 'Gagal memuat riwayat tanggal');
    }
  },

  /**
   * Get stock logs by type (IN or OUT)
   * @param {'IN' | 'OUT'} type 
   * @param {number} limit 
   * @returns {Promise<Array>}
   */
  async getByType(type, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('stock_logs')
        .select(`
          id,
          type,
          quantity,
          stock_before,
          stock_after,
          notes,
          created_at,
          products:product_id (
            id,
            sku,
            nama_produk
          ),
          users:user_id (
            id,
            full_name,
            username
          )
        `)
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map(log => ({
        id: log.id,
        type: log.type,
        quantity: log.quantity,
        stock_before: log.stock_before,
        stock_after: log.stock_after,
        notes: log.notes,
        created_at: log.created_at,
        product: {
          id: log.products?.id,
          sku: log.products?.sku,
          nama_produk: log.products?.nama_produk,
        },
        user: {
          id: log.users?.id,
          name: log.users?.full_name || log.users?.username,
        },
      }));
    } catch (error) {
      console.error('Get stock logs by type error:', error);
      throw new Error(error.message || 'Gagal memuat riwayat tipe');
    }
  },

  /**
   * Get recent stock logs (last N entries)
   * @param {number} limit - Number of recent logs to fetch
   */
  async getRecent(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('stock_logs')
        .select(`
          id,
          type,
          quantity,
          stock_before,
          stock_after,
          notes,
          created_at,
          products:product_id (
            id,
            sku,
            nama_produk
          ),
          users:user_id (
            id,
            full_name,
            username
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map(log => ({
        id: log.id,
        type: log.type,
        quantity: log.quantity,
        stock_before: log.stock_before,
        stock_after: log.stock_after,
        notes: log.notes,
        created_at: log.created_at,
        product: {
          id: log.products?.id,
          sku: log.products?.sku,
          nama_produk: log.products?.nama_produk,
        },
        user: {
          id: log.users?.id,
          name: log.users?.full_name || log.users?.username,
        },
      }));
    } catch (error) {
      console.error('Get recent logs error:', error);
      throw new Error(error.message || 'Gagal memuat riwayat terbaru');
    }
  },

  /**
   * Record stock IN transaction
   * Note: Trigger will auto-update product stock
   * @param {string} productId 
   * @param {string} userId 
   * @param {number} quantity 
   * @param {string} notes 
   * @returns {Promise<object>}
   */
  async recordStockIn(productId, userId, quantity, notes = '') {
    try {
      // Get current product stock for validation
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('stock')
        .eq('id', productId)
        .single();

      if (productError) throw productError;

      const stockBefore = product.stock;
      const stockAfter = stockBefore + quantity;

      const { data, error } = await supabase
        .from('stock_logs')
        .insert({
          product_id: productId,
          user_id: userId,
          type: 'IN',
          quantity: quantity,
          stock_before: stockBefore,
          stock_after: stockAfter,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Stock IN error:', error);
      throw new Error(error.message || 'Gagal mencatat stock IN');
    }
  },

  /**
   * Record stock OUT transaction
   * Note: Trigger will auto-update product stock and validate
   * @param {string} productId 
   * @param {string} userId 
   * @param {number} quantity 
   * @param {string} notes 
   * @returns {Promise<object>}
   */
  async recordStockOut(productId, userId, quantity, notes = '') {
    try {
      // Get current product stock
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('stock, nama_produk')
        .eq('id', productId)
        .single();

      if (productError) throw productError;

      const stockBefore = product.stock;

      // Validate sufficient stock
      if (stockBefore < quantity) {
        throw new Error(
          `Stok tidak mencukupi. Tersedia: ${stockBefore}, Diminta: ${quantity}`
        );
      }

      const stockAfter = stockBefore - quantity;

      const { data, error } = await supabase
        .from('stock_logs')
        .insert({
          product_id: productId,
          user_id: userId,
          type: 'OUT',
          quantity: quantity,
          stock_before: stockBefore,
          stock_after: stockAfter,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Stock OUT error:', error);
      throw new Error(error.message || 'Gagal mencatat stock OUT');
    }
  },

  /**
   * Get today's stock movements summary
   */
  async getTodaySummary() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('stock_logs')
        .select('type, quantity, created_at')
        .gte('created_at', today.toISOString());

      if (error) throw error;

      const summary = {
        total_in: 0,
        total_out: 0,
        count_in: 0,
        count_out: 0,
        last_in: null,
        last_out: null,
      };

      data.forEach(log => {
        const ts = log.created_at ? new Date(log.created_at).toISOString() : null;
        if (log.type === 'IN') {
          summary.total_in += log.quantity;
          summary.count_in += 1;
          if (ts && (!summary.last_in || ts > summary.last_in)) summary.last_in = ts;
        } else if (log.type === 'OUT') {
          summary.total_out += log.quantity;
          summary.count_out += 1;
          if (ts && (!summary.last_out || ts > summary.last_out)) summary.last_out = ts;
        }
      });

      // Fallback: fetch latest per type if missing
      if ((!summary.last_in || !summary.last_out) && (summary.count_in > 0 || summary.count_out > 0)) {
        try {
          if (!summary.last_in && summary.count_in > 0) {
            const { data: lastInRow, error: errIn } = await supabase
              .from('stock_logs')
              .select('created_at')
              .gte('created_at', today.toISOString())
              .eq('type', 'IN')
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            if (!errIn && lastInRow?.created_at) summary.last_in = new Date(lastInRow.created_at).toISOString();
          }

          if (!summary.last_out && summary.count_out > 0) {
            const { data: lastOutRow, error: errOut } = await supabase
              .from('stock_logs')
              .select('created_at')
              .gte('created_at', today.toISOString())
              .eq('type', 'OUT')
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            if (!errOut && lastOutRow?.created_at) summary.last_out = new Date(lastOutRow.created_at).toISOString();
          }
        } catch (e) {
          // ignore fallback errors
        }
      }

      return summary;
    } catch (error) {
      console.error('Get today summary error:', error);
      throw new Error(error.message || 'Gagal memuat ringkasan hari ini');
    }
  },

  /**
   * Get today's statistics (alias for getTodaySummary)
   * @returns {Promise<{totalIn: number, totalOut: number, transactionCount: number}>}
   */
  async getTodayStats() {

            // Fallback: if last_in/last_out still null but there are counts, fetch latest per type
            if ((!summary.last_in || !summary.last_out) && (summary.count_in > 0 || summary.count_out > 0)) {
              try {
                if (!summary.last_in && summary.count_in > 0) {
                  const { data: lastInRow, error: errIn } = await supabase
                    .from('stock_logs')
                    .select('created_at')
                    .eq('type', 'IN')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();
                  if (!errIn && lastInRow?.created_at) summary.last_in = new Date(lastInRow.created_at).toISOString();
                }

                if (!summary.last_out && summary.count_out > 0) {
                  const { data: lastOutRow, error: errOut } = await supabase
                    .from('stock_logs')
                    .select('created_at')
                    .eq('type', 'OUT')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();
                  if (!errOut && lastOutRow?.created_at) summary.last_out = new Date(lastOutRow.created_at).toISOString();
                }
              } catch (e) {
                // ignore fallback errors, we already have counts
              }
            }
    try {
      const summary = await this.getTodaySummary();
      
      return {
        totalIn: summary.total_in,
        totalOut: summary.total_out,
        transactionCount: summary.count_in + summary.count_out,
      };
    } catch (error) {
      console.error('Get today stats error:', error);
      throw new Error(error.message || 'Gagal memuat statistik hari ini');
    }
  },

  /**
   * Get all-time total stock movements
   * @returns {Promise<{totalIn: number, totalOut: number}>}
   */
  async getAllTimeStats() {
    try {
      const { data, error } = await supabase
        .from('stock_logs')
        .select('type, quantity');

      if (error) throw error;

      const summary = {
        totalIn: 0,
        totalOut: 0,
      };

      data.forEach(log => {
        if (log.type === 'IN') {
          summary.totalIn += log.quantity;
        } else if (log.type === 'OUT') {
          summary.totalOut += log.quantity;
        }
      });

      return summary;
    } catch (error) {
      console.error('Get all-time stats error:', error);
      throw new Error(error.message || 'Gagal memuat statistik total');
    }
  },

  /**
   * Get all-time stock movements summary including counts
   * @returns {Promise<{total_in: number, total_out: number, count_in: number, count_out: number}>}
   */
  async getAllTimeSummary() {
    try {
      // include created_at so we can determine the last timestamp per type
      const { data, error } = await supabase
        .from('stock_logs')
        .select('type, quantity, created_at');

      if (error) throw error;

      const summary = {
        total_in: 0,
        total_out: 0,
        count_in: 0,
        count_out: 0,
        last_in: null,
        last_out: null,
      };

      data.forEach(log => {
        const ts = log.created_at ? new Date(log.created_at).toISOString() : null;
        if (log.type === 'IN') {
          summary.total_in += log.quantity;
          summary.count_in += 1;
          if (ts && (!summary.last_in || ts > summary.last_in)) summary.last_in = ts;
        } else if (log.type === 'OUT') {
          summary.total_out += log.quantity;
          summary.count_out += 1;
          if (ts && (!summary.last_out || ts > summary.last_out)) summary.last_out = ts;
        }
      });

      // Fallback: if for some reason we didn't capture last_in/last_out (e.g. nulls), query latest per type
      if ((!summary.last_in || !summary.last_out) && (summary.count_in > 0 || summary.count_out > 0)) {
        try {
          if (!summary.last_in && summary.count_in > 0) {
            const { data: lastInRow, error: errIn } = await supabase
              .from('stock_logs')
              .select('created_at')
              .eq('type', 'IN')
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            if (!errIn && lastInRow?.created_at) summary.last_in = new Date(lastInRow.created_at).toISOString();
          }

          if (!summary.last_out && summary.count_out > 0) {
            const { data: lastOutRow, error: errOut } = await supabase
              .from('stock_logs')
              .select('created_at')
              .eq('type', 'OUT')
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            if (!errOut && lastOutRow?.created_at) summary.last_out = new Date(lastOutRow.created_at).toISOString();
          }
        } catch (e) {
          // ignore fallback errors
        }
      }

      return summary;
    } catch (error) {
      console.error('Get all-time summary error:', error);
      throw new Error(error.message || 'Gagal memuat ringkasan total');
    }
  },

  /**
   * Delete a stock log (admin only - use with caution)
   * Note: This won't automatically adjust product stock
   * @param {string} logId - Log UUID
   */
  async delete(logId) {
    try {
      const { error } = await supabase
        .from('stock_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete log error:', error);
      throw new Error(error.message || 'Gagal menghapus log');
    }
  },
};

export default stockLogService;