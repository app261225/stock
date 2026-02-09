import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSession } from '../../contexts/AuthContext';
import productService from '../../services/productService';

export default function AddProductScreen() {
  const { session } = useSession();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    sku: '',
    nama_produk: '',
    stock: '',
    min_stock: '',
    harga_modal_cny: '',
    harga_modal_rp: '',
    harga_jual_rp: '',
  });

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.sku.trim()) {
      Alert.alert('Error', 'SKU harus diisi');
      return false;
    }
    if (!formData.nama_produk.trim()) {
      Alert.alert('Error', 'Nama produk harus diisi');
      return false;
    }
    if (!formData.stock || isNaN(parseInt(formData.stock))) {
      Alert.alert('Error', 'Stock harus berupa angka');
      return false;
    }
    if (!formData.harga_jual_rp || isNaN(parseInt(formData.harga_jual_rp))) {
      Alert.alert('Error', 'Harga jual harus berupa angka');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      const productData = {
        sku: formData.sku.trim().toUpperCase(),
        nama_produk: formData.nama_produk.trim(),
        stock: parseInt(formData.stock) || 0,
        min_stock: parseInt(formData.min_stock) || 5,
        harga_modal_cny: parseFloat(formData.harga_modal_cny) || 0,
        harga_modal_rp: parseFloat(formData.harga_modal_rp) || 0,
        harga_jual_rp: parseFloat(formData.harga_jual_rp) || 0,
        created_by: session?.user?.id,
      };

      await productService.create(productData);

      Alert.alert(
        'Success',
        'Product berhasil ditambahkan!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setFormData({
                sku: '',
                nama_produk: '',
                stock: '',
                min_stock: '',
                harga_modal_cny: '',
                harga_modal_rp: '',
                harga_jual_rp: '',
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Add product error:', error);
      Alert.alert('Error', error.message || 'Gagal menambahkan product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formCard}>
          {/* SKU */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>SKU *</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="barcode" size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="e.g., SKU-001"
                value={formData.sku}
                onChangeText={(value) => updateField('sku', value.toUpperCase())}
                autoCapitalize="characters"
                editable={!loading}
              />
            </View>
          </View>

          {/* Nama Produk */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nama Produk *</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="package-variant" size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="e.g., Kemeja Flanel"
                value={formData.nama_produk}
                onChangeText={(value) => updateField('nama_produk', value)}
                editable={!loading}
              />
            </View>
          </View>

          {/* Stock Row */}
          <View style={styles.rowGroup}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Stock Awal *</Text>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="numeric" size={20} color="#6b7280" />
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  value={formData.stock}
                  onChangeText={(value) => updateField('stock', value)}
                  keyboardType="numeric"
                  editable={!loading}
                />
              </View>
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Min Stock</Text>
              <View style={styles.inputContainer}>
                <MaterialCommunityIcons name="alert" size={20} color="#6b7280" />
                <TextInput
                  style={styles.input}
                  placeholder="5"
                  value={formData.min_stock}
                  onChangeText={(value) => updateField('min_stock', value)}
                  keyboardType="numeric"
                  editable={!loading}
                />
              </View>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <Text style={styles.dividerText}>Harga</Text>
          </View>

          {/* Harga Modal CNY */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Harga Modal (CNY)</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="currency-cny" size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="0"
                value={formData.harga_modal_cny}
                onChangeText={(value) => updateField('harga_modal_cny', value)}
                keyboardType="decimal-pad"
                editable={!loading}
              />
            </View>
          </View>

          {/* Harga Modal IDR */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Harga Modal (IDR)</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencyPrefix}>Rp</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={formData.harga_modal_rp}
                onChangeText={(value) => updateField('harga_modal_rp', value)}
                keyboardType="numeric"
                editable={!loading}
              />
            </View>
          </View>

          {/* Harga Jual IDR */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Harga Jual (IDR) *</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencyPrefix}>Rp</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={formData.harga_jual_rp}
                onChangeText={(value) => updateField('harga_jual_rp', value)}
                keyboardType="numeric"
                editable={!loading}
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="check-circle" size={20} color="#ffffff" />
            <Text style={styles.submitButtonText}>
              {loading ? 'Adding Product...' : 'Add Product'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.noteText}>* Required fields</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollContent: {
    padding: 16,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputGroup: {
    marginBottom: 16,
  },
  rowGroup: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    height: 48,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  currencyPrefix: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  divider: {
    marginVertical: 20,
    alignItems: 'center',
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 12,
    height: 52,
    marginTop: 8,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#2563eb',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  submitButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  noteText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 12,
  },
});