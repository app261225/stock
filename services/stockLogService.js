import { supabase } from '../lib/supabase.js';

/**
 * Stock Log Service
 * Handle all stock transaction operations
 */
export const stockLogService = {
  /**
   * Get all stock logs with product and user details
   * @param {number} limit 
   * @returns {Promise<Array>}
   */
  async getAll(limit = 50) {
    try {
      const { data, error } = await supabase
        .from('stock_logs')
        .select(`
          *,
          product:products(sku, nama_produk),
          user:users(full_name, username)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get all stock logs error:', error);
      throw error;
    }
  },

  /**
   * Get stock logs by product ID
   * @param {string} productId 
   * @param {number} limit 
   * @returns {Promise<Array>}
   */
  async getByProductId(productId, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('stock_logs')
        .select(`
          *,
          product:products(sku, nama_produk),
          user:users(full_name, username)
        `)
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get stock logs by product error:', error);
      throw error;
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
          *,
          product:products(sku, nama_produk),
          user:users(full_name, username)
        `)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get today stock logs error:', error);
      throw error;
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
          *,
          product:products(sku, nama_produk),
          user:users(full_name, username)
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get stock logs by date range error:', error);
      throw error;
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
          *,
          product:products(sku, nama_produk),
          user:users(full_name, username)
        `)
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get stock logs by type error:', error);
      throw error;
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
  async recordStockIn(productId, userId, quantity, notes = null) {
    try {
      // Get current product stock
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
          quantity,
          stock_before: stockBefore,
          stock_after: stockAfter,
          notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Record stock IN error:', error);
      throw error;
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
  async recordStockOut(productId, userId, quantity, notes = null) {
    try {
      // Get current product stock
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('stock')
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
          quantity,
          stock_before: stockBefore,
          stock_after: stockAfter,
          notes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Record stock OUT error:', error);
      throw error;
    }
  },

  /**
   * Get today's statistics
   * @returns {Promise<{totalIn: number, totalOut: number, transactionCount: number}>}
   */
  async getTodayStats() {
    try {
      const todayLogs = await this.getToday();

      const totalIn = todayLogs
        .filter(log => log.type === 'IN')
        .reduce((sum, log) => sum + log.quantity, 0);

      const totalOut = todayLogs
        .filter(log => log.type === 'OUT')
        .reduce((sum, log) => sum + log.quantity, 0);

      return {
        totalIn,
        totalOut,
        transactionCount: todayLogs.length,
      };
    } catch (error) {
      console.error('Get today stats error:', error);
      throw error;
    }
  },

  /**
   * Delete stock log (admin only - will not revert stock changes)
   * @param {string} id 
   * @returns {Promise<void>}
   */
  async delete(id) {
    try {
      const { error } = await supabase
        .from('stock_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Delete stock log error:', error);
      throw error;
    }
  },
};

export default stockLogService;
