import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';
import configService from '../services/configService';

export const ConfigContext = createContext();

export function ConfigProvider({ children }) {
  // Global config state - single source of truth
  const [jpyToIdr, setJpyToIdr] = useState('0');
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const unsubscribeRef = useRef(null);

  // Load initial config from database
  const loadConfig = useCallback(async () => {
    try {
      setIsLoadingConfig(true);
      const value = await configService.get('jpy_to_idr');
      if (value != null) {
        setJpyToIdr(value);
        console.log('[ConfigContext] Config loaded:', value);
      }
    } catch (error) {
      console.error('[ConfigContext] Load config error:', error);
    } finally {
      setIsLoadingConfig(false);
    }
  }, []);

  // Setup realtime listener - HANYA 1 SUBSCRIPTION untuk semua aplikasi
  const setupRealtimeListener = useCallback(() => {
    try {
      const unsubscribe = configService.subscribeToConfig('jpy_to_idr', (updateData) => {
        const remoteValue = updateData.value;
        console.log('[ConfigContext] 🔄 Realtime update:', remoteValue);
        setJpyToIdr(remoteValue);
      });
      
      unsubscribeRef.current = unsubscribe;
    } catch (error) {
      console.error('[ConfigContext] Setup realtime listener error:', error);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    loadConfig();
    setupRealtimeListener();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [loadConfig, setupRealtimeListener]);

  const value = {
    jpyToIdr,
    setJpyToIdr, // Untuk di-update dari profile screen setelah save
    isLoadingConfig,
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}

/**
 * Hook untuk consume config realtime
 * @returns {Object} { jpyToIdr, isLoadingConfig }
 */
export function useConfig() {
  const context = React.useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
}
