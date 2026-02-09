import { supabase } from '../lib/supabase.js';

/**
 * Product Service
 * Handle all product-related database operations
 */
export const productService = {
  /**
   * Get all products
   * @param {boolean} activeOnly - Filter only active products
   * @returns {Promise<Array>}
   */
  async getAll(activeOnly = true) {
    try {
      let query = supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get all products error:', error);
      throw error;
    }
  },

  /**
   * Get product by ID
   * @param {string} id 
   * @returns {Promise<object | null>}
   */
  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get product by ID error:', error);
      throw error;
    }
  },

  /**
   * Get product by SKU
   * @param {string} sku 
   * @returns {Promise<object | null>}
   */
  async getBySku(sku) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('sku', sku)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get product by SKU error:', error);
      return null;
    }
  },

  /**
   * Search products by SKU or name
   * @param {string} keyword 
   * @returns {Promise<Array>}
   */
  async search(keyword) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`sku.ilike.%${keyword}%,nama_produk.ilike.%${keyword}%`)
        .eq('is_active', true)
        .order('nama_produk', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Search products error:', error);
      throw error;
    }
  },

  /**
   * Get low stock products
   * @returns {Promise<Array>}
   */
  async getLowStock() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      // Filter manually: stock <= min_stock
      return (data || []).filter(p => p.stock <= p.min_stock);
    } catch (error) {
      console.error('Get low stock products error:', error);
      throw error;
    }
  },

  /**
   * Get out of stock products
   * @returns {Promise<Array>}
   */
  async getOutOfStock() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('stock', 0)
        .eq('is_active', true)
        .order('nama_produk', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get out of stock products error:', error);
      throw error;
    }
  },

  /**
   * Create new product
   * @param {object} product - Product data
   * @returns {Promise<object>}
   */
  async create(product) {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create product error:', error);
      throw error;
    }
  },

  /**
   * Update product
   * @param {string} id 
   * @param {object} updates - Fields to update
   * @returns {Promise<object>}
   */
  async update(id, updates) {
    try {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update product error:', error);
      throw error;
    }
  },

  /**
   * Soft delete product (set is_active to false)
   * @param {string} id 
   * @returns {Promise<void>}
   */
  async softDelete(id) {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Soft delete product error:', error);
      throw error;
    }
  },

  /**
   * Hard delete product
   * @param {string} id 
   * @returns {Promise<void>}
   */
  async delete(id) {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Delete product error:', error);
      throw error;
    }
  },

  /**
   * Get stock status statistics
   * @returns {Promise<{total: number, lowStock: number, outOfStock: number, healthy: number}>}
   */
  async getStockStats() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('stock, min_stock')
        .eq('is_active', true);

      if (error) throw error;

      const total = data?.length || 0;
      const outOfStock = data?.filter(p => p.stock === 0).length || 0;
      const lowStock = data?.filter(p => p.stock > 0 && p.stock <= p.min_stock).length || 0;
      const healthy = total - outOfStock - lowStock;

      return { total, lowStock, outOfStock, healthy };
    } catch (error) {
      console.error('Get stock stats error:', error);
      throw error;
    }
  },
};

export default productService;
