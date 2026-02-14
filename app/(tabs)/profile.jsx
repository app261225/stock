import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSession } from '../../contexts/AuthContext';
import configService from '../../services/configService';
import { useState, useRef, useEffect } from 'react';

export default function ProfileScreen() {
  const { session, signOut } = useSession();
  const [jpyValue, setJpyValue] = useState('0');
  const [savedJpyValue, setSavedJpyValue] = useState('0');
  const [loadingConfig, setLoadingConfig] = useState(true);
  const isJpyChanged = parseFloat(jpyValue) !== parseFloat(savedJpyValue);
  const jpyInputRef = useRef(null);

  // Load JPY config from database on mount
  useEffect(() => {
    loadJpyConfig();
  }, []);

  const loadJpyConfig = async () => {
    try {
      setLoadingConfig(true);
      const value = await configService.get('jpy_to_idr');
      if (value) {
        setJpyValue(value);
        setSavedJpyValue(value);
      }
    } catch (error) {
      console.error('Load JPY config error:', error);
      // Continue with default value
    } finally {
      setLoadingConfig(false);
    }
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

  const handleSaveJpy = async () => {
    try {
      const formattedValue = formatToTwoDecimals(jpyValue);
      await configService.set(
        'jpy_to_idr',
        formattedValue,
        'Kurs tukar Yen Jepang ke Rupiah Indonesia'
      );
      setSavedJpyValue(formattedValue);
      Alert.alert('Berhasil', `Nilai ¥ ke IDR disimpan: ${formattedValue}`);
    } catch (error) {
      console.error('Save JPY config error:', error);
      Alert.alert('Error', 'Gagal menyimpan konfigurasi: ' + (error.message || 'Unknown error'));
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
    // Allow only numbers and one decimal point
    const filtered = value.replace(/[^0-9.]/g, '');
    if (filtered.split('.').length > 2) return; // Prevent multiple decimals
    setJpyValue(filtered);
  };

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
              />
              {isJpyChanged && (
                <TouchableOpacity 
                  style={styles.saveButtonInside}
                  onPress={handleSaveJpy}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="check" size={16} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.configUnit}>IDR</Text>
          </View>
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
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  configInputGroup: {
    gap: 6,
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
  saveButton: {
    backgroundColor: '#16a34a',
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
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
