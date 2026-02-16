import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSession } from '../../contexts/AuthContext';
import { useConfig } from '../../contexts/ConfigContext';
import configService from '../../services/configService';
import { useState, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EventBus from '../../lib/EventBus';

export default function ProfileScreen() {
  const { session, signOut } = useSession();
  const { jpyToIdr, setJpyToIdr, isLoadingConfig } = useConfig();
  
  // Local editing state - hanya untuk input form
  const [jpyValue, setJpyValue] = useState('0');
  const [savedJpyValue, setSavedJpyValue] = useState('0');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  
  const jpyInputRef = useRef(null);
  
  const isJpyChanged = jpyValue !== savedJpyValue;

  // Load last update time from AsyncStorage
  useEffect(() => {
    const loadLastUpdateTime = async () => {
      try {
        const savedTime = await AsyncStorage.getItem('last_data_update_time');
        if (savedTime) {
          setLastUpdateTime(savedTime);
        }
      } catch (error) {
        console.error('[Profile] Error loading last update time:', error);
      }
    };
    loadLastUpdateTime();
  }, []);

  // Auto-refresh setiap 5 menit
  useEffect(() => {
    console.log('[Profile] Setting up auto-refresh timer (5 minutes)');
    
    const performAutoRefresh = async () => {
      console.log('[Profile] Auto-refresh triggered');
      setIsRefreshing(true);
      try {
        const now = new Date().toISOString();
        await AsyncStorage.setItem('last_data_update_time', now);
        setLastUpdateTime(now);
        
        EventBus.emit('force_refresh', {
          timestamp: now,
          source: 'auto-refresh',
        });
        
        console.log('[Profile] Auto-refresh completed at', now);
      } catch (error) {
        console.error('[Profile] Auto-refresh error:', error);
      } finally {
        setIsRefreshing(false);
      }
    };
    
    const autoRefreshInterval = setInterval(performAutoRefresh, 5 * 60 * 1000); // 5 menit

    return () => {
      console.log('[Profile] Clearing auto-refresh timer');
      clearInterval(autoRefreshInterval);
    };
  }, []);

  // Sync dengan context value jpyToIdr
  useEffect(() => {
    setJpyValue(jpyToIdr);
    setSavedJpyValue(jpyToIdr);
  }, [jpyToIdr]);

  const handleSaveJpy = async () => {
    try {
      setIsSyncing(true);
      const formattedValue = formatToTwoDecimals(jpyValue);
      
      await configService.set(
        'jpy_to_idr',
        formattedValue,
        'Kurs tukar Yen Jepang ke Rupiah Indonesia'
      );
      
      setSavedJpyValue(formattedValue);
      setJpyToIdr(formattedValue); // Update context
      
      Alert.alert('✅ Berhasil', `Nilai ¥ ke IDR: ${formattedValue} (Berlaku untuk semua pengguna)`);
      console.log('[Profile] Saved:', formattedValue);
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('❌ Error', error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRefreshAllData = async () => {
    setIsRefreshing(true);
    try {
      console.log('[Profile] Refreshing all data...');
      
      // Simpan timestamp update terakhir ke AsyncStorage (bertahan lama > 1 bulan)
      const now = new Date().toISOString();
      await AsyncStorage.setItem('last_data_update_time', now);
      setLastUpdateTime(now);
      
      // Emit event force_refresh ke semua halaman
      EventBus.emit('force_refresh', {
        timestamp: now,
        source: 'profile',
      });
      
      Alert.alert('✅ Berhasil', 'Data dashboard, products, dan log sedang di-refresh');
      console.log('[Profile] Refresh triggered at', now);
    } catch (error) {
      console.error('[Profile] Refresh error:', error);
      Alert.alert('❌ Error', 'Gagal melakukan refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatLastUpdateTime = (isoString) => {
    if (!isoString) return 'Belum pernah';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'Baru saja';
      if (diffMins < 60) return `${diffMins} menit lalu`;
      if (diffHours < 24) return `${diffHours} jam lalu`;
      if (diffDays < 30) return `${diffDays} hari lalu`;
      
      // Format tanggal lengkap
      const day = date.getDate();
      const month = date.toLocaleDateString('id-ID', { month: 'short' });
      const year = date.getFullYear();
      const time = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
      return `${time} • ${day} ${month} ${year}`;
    } catch (e) {
      return isoString;
    }
  };

  const handleJpyBlur = () => {
    if (jpyValue && jpyValue !== '') {
      setJpyValue(formatToTwoDecimals(jpyValue));
    }
  };

  const handleSaveJpyOnEnter = () => {
    handleJpyBlur();
    setTimeout(() => {
      if (isJpyChanged) {
        handleSaveJpy();
      }
    }, 100);
  };

  const formatToTwoDecimals = (value) => {
    if (value === '') return '';
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return value;
    return numValue.toFixed(2);
  };

  const handleJpyChange = (value) => {
    const filtered = value.replace(/[^0-9.]/g, '');
    if (filtered.split('.').length > 2) return;
    setJpyValue(filtered);
  };

  const getRoleStyle = (role) => {
    switch(role?.toLowerCase()) {
      case 'super_admin':
        return {
          backgroundColor: '#7c3aed',
          icon: 'shield-crown',
        };
      case 'staff':
        return {
          backgroundColor: '#0ea5e9',
          icon: 'briefcase',
        };
      default:
        return {
          backgroundColor: '#2563eb',
          icon: 'account',
        };
    }
  };

  const roleStyle = getRoleStyle(session?.user?.role);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Apakah Anda yakin ingin logout?',
      [
        { 
          text: 'Batal', 
          style: 'cancel' 
        },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: signOut
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      {/* User Info */}
      <View style={styles.userInfoContainer}>
        <Text style={styles.userName}>{session?.user?.full_name || 'User'}</Text>
        <View style={styles.userInfoRow}>
          <Text style={styles.username}>{session?.user?.username || 'username'}</Text>
          <View style={[styles.roleBadge, { backgroundColor: roleStyle.backgroundColor }]}>
            <MaterialCommunityIcons name={roleStyle.icon} size={10} color="#fff" />
            <Text style={styles.roleText}>{session?.user?.role || 'staff'}</Text>
          </View>
        </View>
      </View>

      {/* Global Config Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Global Config</Text>
        <View style={styles.configInputGroup}>
          <Text style={styles.configLabel}>¥ (Yen) ke IDR</Text>
          <View style={styles.configInputWrapper}>
            <View style={styles.inputWithButton}>
              <TextInput
                ref={jpyInputRef}
                style={styles.configInput}
                value={jpyValue}
                onChangeText={handleJpyChange}
                onBlur={handleJpyBlur}
                onSubmitEditing={handleSaveJpyOnEnter}
                selectTextOnFocus={true}
                placeholder="Harga 1 Yen"
                placeholderTextColor="#d1d5db"
                keyboardType="decimal-pad"
                editable={!isSyncing}
              />
              {isJpyChanged && !isSyncing && (
                <TouchableOpacity 
                  style={styles.saveButtonInside}
                  onPress={handleSaveJpy}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="check" size={16} color="#fff" />
                </TouchableOpacity>
              )}
              {isSyncing && (
                <View style={styles.savingSpin}>
                  <MaterialCommunityIcons name="loading" size={16} color="#3b82f6" />
                </View>
              )}
            </View>
            <Text style={styles.configUnit}>IDR</Text>
          </View>
        </View>
      </View>

      {/* Data Refresh Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Perbaharui Data</Text>
        
        {/* Last Update Info Card */}
        <View style={styles.lastUpdateCard}>
          <View style={styles.lastUpdateContent}>
            <MaterialCommunityIcons name="clock-outline" size={18} color="#6b7280" />
            <View style={styles.lastUpdateTextCol}>
              <Text style={styles.lastUpdateLabel}>Terakhir diperbaharui</Text>
              <Text style={styles.lastUpdateTime}>{formatLastUpdateTime(lastUpdateTime)}</Text>
            </View>
          </View>
        </View>

        {/* Refresh Button */}
        <TouchableOpacity 
          style={[styles.refreshButton, isRefreshing && styles.refreshButtonDisabled]}
          onPress={handleRefreshAllData}
          activeOpacity={0.7}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <>
              <MaterialCommunityIcons name="loading" size={18} color="#fff" />
              <Text style={styles.refreshButtonText}>Sedang memperbaharui...</Text>
            </>
          ) : (
            <>
              <MaterialCommunityIcons name="refresh" size={18} color="#fff" />
              <Text style={styles.refreshButtonText}>Perbaharui Dashboard, Products & Log</Text>
            </>
          )}
        </TouchableOpacity>
        
        <Text style={styles.refreshNote}>
          ℹ️ Tombol ini akan me-refresh data di halaman dashboard, products, dan log. Perubahan akan tersimpan di cache lokal hingga lebih dari 1 bulan.
        </Text>
      </View>

      {/* Logout Button */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="logout" size={18} color="#fff" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  userInfoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  username: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6b7280',
  },
  roleBadge: {
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roleText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 6,
    marginTop: 8,
    borderRadius: 8,
    padding: 14,
    gap: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  configInputGroup: {
    gap: 2,
  },
  configLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  configInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inputWithButton: {
    flex: 1,
    position: 'relative',
  },
  configInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingRight: 40,
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  },
  configUnit: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  saveButtonInside: {
    position: 'absolute',
    right: 8,
    top: '50%',
    marginTop: -16,
    backgroundColor: '#16a34a',
    width: 40,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingSpin: {
    position: 'absolute',
    right: 8,
    top: '50%',
    marginTop: -16,
    backgroundColor: '#3b82f6',
    width: 40,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  realtimeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
    letterSpacing: 0.5,
  },
  realtimeCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    padding: 12,
  },
  realtimeCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  realtimeKey: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065f46',
    marginBottom: 2,
  },
  realtimeDesc: {
    fontSize: 11,
    color: '#10b981',
  },
  realtimeValue: {
    alignItems: 'flex-end',
  },
  realtimeAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#047857',
  },
  realtimeCurrency: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10b981',
  },
  realtimeFooter: {
    fontSize: 11,
    color: '#6b7280',
    fontStyle: 'italic',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#bbf7d0',
  },
  lastUpdateCard: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
  },
  lastUpdateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lastUpdateTextCol: {
    flex: 1,
  },
  lastUpdateLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  lastUpdateTime: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginTop: 2,
  },
  refreshButton: {
    flexDirection: 'row',
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  refreshButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.7,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  refreshNote: {
    fontSize: 11,
    color: '#6b7280',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});