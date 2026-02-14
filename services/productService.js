import { supabase } from '../lib/supabase';

const productService = {
  /**
   * Get all products
   * @param {boolean} activeOnly - Filter active products only
   */
  async getAll(activeOnly = true) {
    try {
      let query = supabase
        .from('products')
        .select(`
          id,
          sku,
          nama_produk,
          stock,
          min_stock,
          harga_modal_non_rp,
          harga_modal_rp,
          harga_jual_rp,
          is_active,
          created_at,
          updated_at,
          created_by,
          updated_by
        `)
        .order('created_at', { ascending: false });

      if (activeOnly) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get all products error:', error);
      throw new Error(error.message || 'Gagal memuat produk');
    }
  },

  /**
   * Get product by ID
   * @param {string} productId - Product UUID
   */
  async getById(productId) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          sku,
          nama_produk,
          stock,
          min_stock,
          harga_modal_non_rp,
          harga_modal_rp,
          harga_jual_rp,
          is_active,
          created_at,
          updated_at,
          created_by,
          updated_by
        `)
        .eq('id', productId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get product by ID error:', error);
      throw new Error(error.message || 'Gagal memuat detail produk');
    }
  },

  /**
   * Get product by SKU
   * @param {string} sku - Product SKU
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
   * @param {string} searchTerm - Search term for SKU or product name
   */
  async search(searchTerm) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .or(`sku.ilike.%${searchTerm}%,nama_produk.ilike.%${searchTerm}%`)
        .order('nama_produk', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Search products error:', error);
      throw new Error(error.message || 'Gagal mencari produk');
    }
  },

  /**
   * Get low stock products
   */
  async getLowStock() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      // Filter manually: stock > 0 AND stock <= min_stock
      return (data || []).filter(p => p.stock > 0 && p.stock <= p.min_stock);
    } catch (error) {
      console.error('Get low stock products error:', error);
      throw new Error(error.message || 'Gagal memuat produk stok menipis');
    }
  },

  /**
   * Get out of stock products
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
      throw new Error(error.message || 'Gagal memuat produk habis');
    }
  },

  /**
   * Create new product
   * @param {object} productData - Product data
   */
  async create(productData) {
    try {
      // Validate required fields
      if (!productData.sku || !productData.nama_produk) {
        throw new Error('SKU dan Nama Produk harus diisi');
      }

      // Check if SKU already exists
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('sku', productData.sku)
        .single();

      if (existing) {
        throw new Error('SKU sudah digunakan');
      }

      const { data, error } = await supabase
        .from('products')
        .insert({
          sku: productData.sku,
          nama_produk: productData.nama_produk,
          stock: productData.stock || 0,
          min_stock: productData.min_stock || 5,
          harga_modal_non_rp: productData.harga_modal_non_rp || 0,
          harga_modal_rp: productData.harga_modal_rp || 0,
          harga_jual_rp: productData.harga_jual_rp || 0,
          is_active: true,
          created_by: productData.created_by,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create product error:', error);
      throw new Error(error.message || 'Gagal menambahkan produk');
    }
  },

  /**
   * Update product
   * @param {string} productId - Product UUID
   * @param {object} productData - Updated product data
   */
  async update(productId, productData) {
    try {
      // If updating SKU, check if new SKU already exists
      if (productData.sku) {
        const { data: existing } = await supabase
          .from('products')
          .select('id')
          .eq('sku', productData.sku)
          .neq('id', productId)
          .single();

        if (existing) {
          throw new Error('SKU sudah digunakan oleh produk lain');
        }
      }

      const updateData = {
        ...productData,
        updated_at: new Date().toISOString(),
      };

      // Remove fields that shouldn't be updated directly
      delete updateData.id;
      delete updateData.created_at;
      delete updateData.stock; // Stock should only be updated via stock_logs

      const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', productId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update product error:', error);
      throw new Error(error.message || 'Gagal mengupdate produk');
    }
  },

  /**
   * Soft delete product (set is_active to false)
   * @param {string} productId - Product UUID
   */
  async softDelete(productId) {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', productId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Soft delete product error:', error);
      throw new Error(error.message || 'Gagal menghapus produk');
    }
  },

  /**
   * Restore soft-deleted product
   * @param {string} productId - Product UUID
   */
  async restore(productId) {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: true })
        .eq('id', productId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Restore product error:', error);
      throw new Error(error.message || 'Gagal mengembalikan produk');
    }
  },

  /**
   * Hard delete product (permanent deletion)
   * Warning: This will cascade delete stock logs
   * @param {string} productId - Product UUID
   */
  async delete(productId) {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Hard delete product error:', error);
      throw new Error(error.message || 'Gagal menghapus produk secara permanen');
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
      throw new Error(error.message || 'Gagal memuat statistik stok');
    }
  },

  /**
   * Get products with stock status summary
   */
  async getStockStatusSummary() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('stock, min_stock')
        .eq('is_active', true);

      if (error) throw error;

      const summary = {
        total_products: data.length,
        low_stock_count: 0,
        out_of_stock_count: 0,
        safe_stock_count: 0,
      };

      data.forEach(product => {
        if (product.stock === 0) {
          summary.out_of_stock_count += 1;
        } else if (product.stock <= product.min_stock) {
          summary.low_stock_count += 1;
        } else {
          summary.safe_stock_count += 1;
        }
      });

      return summary;
    } catch (error) {
      console.error('Get stock status summary error:', error);
      throw new Error(error.message || 'Gagal memuat ringkasan status stok');
    }
  },

  /**
   * Calculate total stock value
   */
  async getStockValue() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('stock, harga_modal_rp, harga_jual_rp')
        .eq('is_active', true);

      if (error) throw error;

      const value = {
        total_modal: 0,
        total_harga_jual: 0,
        potential_profit: 0,
      };

      data.forEach(product => {
        const modal = product.stock * (parseFloat(product.harga_modal_rp) || 0);
        const jual = product.stock * (parseFloat(product.harga_jual_rp) || 0);
        
        value.total_modal += modal;
        value.total_harga_jual += jual;
        value.potential_profit += (jual - modal);
      });

      return value;
    } catch (error) {
      console.error('Get stock value error:', error);
      throw new Error(error.message || 'Gagal menghitung nilai stok');
    }
  },
};

export default productService;