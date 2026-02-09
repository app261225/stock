import { supabase } from '../lib/supabase.js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_SESSION_KEY = '@stock_app_user_session';

/**
 * Authentication Service
 * Custom authentication without Supabase Auth
 */
export const authService = {
  /**
   * Login with username and password
   * @param {string} username 
   * @param {string} password 
   * @returns {Promise<{user: object, token: string, expiresAt: number}>}
   */
  async login(username, password) {
    try {
      // Query user from database
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password) // TODO: In production, use bcrypt comparison
        .eq('is_active', true)
        .single();

      if (error || !data) {
        throw new Error('Username atau password salah');
      }

      // Update last login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.id);

      // Create session
      const session = {
        user: data,
        token: `custom_token_${data.id}_${Date.now()}`, // Simple token
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      };

      // Save session to AsyncStorage
      await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));

      return session;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  /**
   * Logout and clear session
   * @returns {Promise<void>}
   */
  async logout() {
    try {
      await AsyncStorage.removeItem(USER_SESSION_KEY);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  /**
   * Get current session from AsyncStorage
   * @returns {Promise<{user: object, token: string, expiresAt: number} | null>}
   */
  async getSession() {
    try {
      const sessionStr = await AsyncStorage.getItem(USER_SESSION_KEY);
      if (!sessionStr) return null;

      const session = JSON.parse(sessionStr);

      // Check if session expired
      if (session.expiresAt < Date.now()) {
        await this.logout();
        return null;
      }

      return session;
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  },

  /**
   * Get current user
   * @returns {Promise<object | null>}
   */
  async getCurrentUser() {
    const session = await this.getSession();
    return session?.user ?? null;
  },

  /**
   * Check if user is logged in
   * @returns {Promise<boolean>}
   */
  async isLoggedIn() {
    const session = await this.getSession();
    return session !== null;
  },

  /**
   * Change password
   * @param {string} userId 
   * @param {string} oldPassword 
   * @param {string} newPassword 
   * @returns {Promise<void>}
   */
  async changePassword(userId, oldPassword, newPassword) {
    try {
      // Verify old password
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .eq('password', oldPassword) // TODO: Use bcrypt comparison
        .single();

      if (error || !data) {
        throw new Error('Password lama salah');
      }

      // Update password
      const { error: updateError } = await supabase
        .from('users')
        .update({ password: newPassword }) // TODO: Hash with bcrypt
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  },
};

export default authService;
