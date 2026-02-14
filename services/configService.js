import { supabase } from '../lib/supabase';

const configService = {
  /**
   * Get configuration value by key
   * @param {string} key - Configuration key
   * @returns {Promise<string|null>} Configuration value or null if not found
   */
  async get(key) {
    try {
      const { data, error } = await supabase
        .from('konfigurasi')
        .select('config_value')
        .eq('config_key', key)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        throw error;
      }

      return data?.config_value || null;
    } catch (error) {
      console.error(`Get config error for key "${key}":`, error);
      throw new Error(error.message || 'Gagal memuat konfigurasi');
    }
  },

  /**
   * Set or update configuration value
   * @param {string} key - Configuration key
   * @param {string} value - Configuration value
   * @param {string} description - Configuration description (optional)
   * @returns {Promise<void>}
   */
  async set(key, value, description = '') {
    try {
      // Try to update first
      const { data: existing, error: selectError } = await supabase
        .from('konfigurasi')
        .select('id')
        .eq('config_key', key)
        .single();

      if (!selectError && existing) {
        // Update existing
        const { error: updateError } = await supabase
          .from('konfigurasi')
          .update({
            config_value: value,
            description: description || null,
          })
          .eq('config_key', key);

        if (updateError) throw updateError;
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('konfigurasi')
          .insert([
            {
              config_key: key,
              config_value: value,
              description: description || null,
            },
          ]);

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error(`Set config error for key "${key}":`, error);
      throw new Error(error.message || 'Gagal menyimpan konfigurasi');
    }
  },

  /**
   * Get multiple configuration values
   * @param {string[]} keys - Array of configuration keys
   * @returns {Promise<Object>} Object with keys and values
   */
  async getMultiple(keys) {
    try {
      const { data, error } = await supabase
        .from('konfigurasi')
        .select('config_key, config_value')
        .in('config_key', keys);

      if (error) throw error;

      const result = {};
      data.forEach(row => {
        result[row.config_key] = row.config_value;
      });

      return result;
    } catch (error) {
      console.error('Get multiple configs error:', error);
      throw new Error(error.message || 'Gagal memuat konfigurasi');
    }
  },

  /**
   * Get all configurations
   * @returns {Promise<Array>} Array of all configurations
   */
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('konfigurasi')
        .select('*');

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Get all configs error:', error);
      throw new Error(error.message || 'Gagal memuat konfigurasi');
    }
  },

  /**
   * Delete configuration
   * @param {string} key - Configuration key
   * @returns {Promise<void>}
   */
  async delete(key) {
    try {
      const { error } = await supabase
        .from('konfigurasi')
        .delete()
        .eq('config_key', key);

      if (error) throw error;
    } catch (error) {
      console.error(`Delete config error for key "${key}":`, error);
      throw new Error(error.message || 'Gagal menghapus konfigurasi');
    }
  },
};

export default configService;
