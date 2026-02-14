import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSession } from '../../contexts/AuthContext';
import { useConfig } from '../../contexts/ConfigContext';
import configService from '../../services/configService';
import { useState, useRef, useEffect } from 'react';

export default function ProfileScreen() {
  const { session, signOut } = useSession();
  const { jpyToIdr, setJpyToIdr, isLoadingConfig } = useConfig();
  
  // Local editing state - hanya untuk input form
  const [jpyValue, setJpyValue] = useState('0');
  const [savedJpyValue, setSavedJpyValue] = useState('0');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const jpyInputRef = useRef(null);
  
  const isJpyChanged = jpyValue !== savedJpyValue;

  // Sync dengan context value
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Compact User Header */}
      <View style={styles.userHeader}>
        <MaterialCommunityIcons name="account-circle" size={48} color="#2563eb" />
        <View style={styles.userBasicInfo}>
          <Text style={styles.userName}>{session?.user?.full_name || 'User'}</Text>
          <View style={styles.userInfoRow}>
            <Text style={styles.username}>{session?.user?.username || 'username'}</Text>
            <View style={[styles.roleBadge, { backgroundColor: roleStyle.backgroundColor }]}>
              <MaterialCommunityIcons name={roleStyle.icon} size={10} color="#fff" />
              <Text style={styles.roleText}>{session?.user?.role || 'staff'}</Text>
            </View>
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

      {/* Realtime Config Display Card */}
      <View style={styles.section}>
        <View style={styles.realtimeHeaderRow}>
          <Text style={styles.sectionTitle}>Konfigurasi Realtime</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        <View style={styles.realtimeCard}>
          <View style={styles.realtimeCardContent}>
            <View>
              <Text style={styles.realtimeKey}>jpy_to_idr</Text>
              <Text style={styles.realtimeDesc}>Kurs Yen Jepang ke Rupiah</Text>
            </View>
            <View style={styles.realtimeValue}>
              <Text style={styles.realtimeAmount}>{jpyToIdr || '0'}</Text>
              <Text style={styles.realtimeCurrency}>IDR</Text>
            </View>
          </View>
          <Text style={styles.realtimeFooter}>
            💡 Diperbarui realtime untuk semua pengguna
          </Text>
        </View>
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
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  userBasicInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6b7280',
  },
  roleBadge: {
    alignSelf: 'flex-start',
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
    marginVertical: 8,
    borderRadius: 8,
    padding: 12,
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
    gap: 8,
  },
  configLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  configInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
