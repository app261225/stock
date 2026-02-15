import React, { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import productService from '../../services/productService';

const AddEditProductModal = forwardRef(({ jpyToIdr, onSuccess, onShowHistory }, ref) => {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState('add'); // 'add' or 'edit'
  const [product, setProduct] = useState(null);
  const [form, setForm] = useState({
    sku: '',
    nama_produk: '',
    harga_modal_non_rp: '',
    harga_modal_rp: '',
    harga_jual_rp: '',
    min_stock: '',
    stock: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useImperativeHandle(ref, () => ({
    open: (m = 'add', prod = null) => {
      setMode(m);
      if (m === 'edit' && prod) {
        setProduct(prod);
        setForm({
          sku: prod.sku || '',
          nama_produk: prod.nama_produk || '',
          harga_modal_non_rp: prod.harga_modal_non_rp ? prod.harga_modal_non_rp.toString() : '',
          harga_modal_rp: prod.harga_modal_rp ? prod.harga_modal_rp.toString() : '',
          harga_jual_rp: prod.harga_jual_rp ? prod.harga_jual_rp.toString() : '',
          min_stock: prod.min_stock ? prod.min_stock.toString() : '',
          stock: prod.stock ? prod.stock.toString() : '',
        });
      } else {
        setProduct(null);
        setForm({ sku: '', nama_produk: '', harga_modal_non_rp: '', harga_modal_rp: '', harga_jual_rp: '', min_stock: '', stock: '' });
      }
      setVisible(true);
    },
    close: () => setVisible(false),
  }));

  useEffect(() => {
    // Recalculate harga_modal_rp if harga_modal_non_rp exists and jpyToIdr updates
    if (form.harga_modal_non_rp) {
      const parseValue = form.harga_modal_non_rp.replace(/\./g, '').replace(',', '.');
      if (parseValue && jpyToIdr > 0) {
        const yen = parseFloat(parseValue);
        if (!isNaN(yen)) {
          const newRp = Math.round(yen * parseFloat(jpyToIdr)).toString();
          setForm(prev => ({ ...prev, harga_modal_rp: newRp }));
        }
      }
    }
  }, [jpyToIdr]);

  const formatNumberWithSeparator = (value, allowDecimal = false) => {
    let cleaned = value.replace(/[^0-9.,]/g, '');
    if (!allowDecimal) cleaned = cleaned.replace(/[.,]/g, '');
    else {
      const commaParts = cleaned.split(',');
      if (commaParts.length > 2) return value;
    }
    return cleaned;
  };

  const parseNumberWithSeparator = (value) => {
    return parseFloat(value.replace(/\./g, '').replace(',', '.'));
  };

  const displayNumberWithSeparator = (value) => {
    if (!value) return '';
    const num = parseNumberWithSeparator(value);
    if (isNaN(num)) return value;
    return num.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const handleNonRpChange = (value) => {
    let formattedValue = value.replace(/[^0-9.,]/g, '');
    const commaParts = formattedValue.split(',');
    if (commaParts.length > 2) return;
    let parseValue = formattedValue.replace(/\./g, '').replace(',', '.');
    let conversionValue = '';
    if (parseValue && jpyToIdr > 0) {
      const yen = parseFloat(parseValue);
      if (!isNaN(yen)) conversionValue = Math.round(yen * parseFloat(jpyToIdr)).toString();
    }
    setForm(prev => ({ ...prev, harga_modal_non_rp: formattedValue, harga_modal_rp: conversionValue }));
  };

  const handleHargaJualChange = (value) => setForm(prev => ({ ...prev, harga_jual_rp: formatNumberWithSeparator(value, true) }));
  const handleStockChange = (value) => setForm(prev => ({ ...prev, stock: formatNumberWithSeparator(value, false) }));
  const handleMinStockChange = (value) => setForm(prev => ({ ...prev, min_stock: formatNumberWithSeparator(value, false) }));

  const handleSubmit = async () => {
    const { sku, nama_produk, harga_modal_rp, harga_jual_rp, min_stock, stock } = form;
    if (!sku.trim() || !nama_produk.trim() || !harga_modal_rp || !harga_jual_rp || !min_stock || !stock) {
      Alert.alert('Error', 'Semua field harus diisi');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'add') {
        await productService.create({
          sku: sku.trim(),
          nama_produk: nama_produk.trim(),
          harga_modal_non_rp: parseFloat(form.harga_modal_non_rp.replace(/\./g, '').replace(',', '.')) || 0,
          harga_modal_rp: parseInt(harga_modal_rp, 10),
          harga_jual_rp: parseInt(harga_jual_rp, 10),
          min_stock: parseInt(min_stock, 10),
          stock: parseInt(stock, 10),
        });
        Alert.alert('Sukses', 'Produk berhasil ditambahkan');
      } else if (mode === 'edit' && product) {
        await productService.update(product.id, {
          nama_produk: nama_produk.trim(),
          harga_modal_non_rp: parseFloat(form.harga_modal_non_rp.replace(/\./g, '').replace(',', '.')) || 0,
          harga_modal_rp: parseInt(harga_modal_rp, 10),
          harga_jual_rp: parseInt(harga_jual_rp, 10),
          min_stock: parseInt(min_stock, 10),
        });
        Alert.alert('Sukses', 'Produk berhasil diperbarui');
      }
      setVisible(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Add/Edit product error:', error);
      Alert.alert('Error', error.message || 'Gagal menyimpan produk');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    Alert.alert(
      'Hapus Produk',
      `Yakin ingin menghapus "${product.nama_produk}"? Tindakan ini tidak dapat dibatalkan.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              setSubmitting(true);
              await productService.delete(product.id);
              Alert.alert('Sukses', 'Produk berhasil dihapus');
              setVisible(false);
              if (onSuccess) onSuccess();
            } catch (error) {
              console.error('Delete product error:', error);
              Alert.alert('Error', error.message || 'Gagal menghapus produk');
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const handleShowHistory = () => {
    if (!product) return;
    if (onShowHistory) onShowHistory(product);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <KeyboardAvoidingView style={styles.alertOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={styles.alertBackdrop} activeOpacity={1} onPress={() => setVisible(false)} />
        <View style={styles.alertWrapper}>
          <View style={styles.alertContainer}>
            <View style={[styles.alertHeader, { backgroundColor: mode === 'add' ? '#eff6ff' : '#fff7ed' }]}>
              <View style={[styles.alertIconContainer, { backgroundColor: mode === 'add' ? '#3b82f6' : '#f59e0b' }]}>
                <MaterialCommunityIcons name={mode === 'add' ? 'package-variant-plus' : 'pencil'} size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>{mode === 'add' ? 'Tambah Produk Baru' : 'Edit Produk'}</Text>
                <Text style={styles.alertSubtitle}>{mode === 'add' ? 'Isi detail produk' : 'Perbarui detail produk'}</Text>
              </View>
              <TouchableOpacity style={styles.alertCloseButton} onPress={() => setVisible(false)}>
                <MaterialCommunityIcons name="close" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.alertScrollContent}>
              <View style={styles.alertContentScrollable}>
                <View style={styles.formRow}>
                  <View style={styles.formCol40}>
                    <Text style={styles.formLabel}>SKU</Text>
                    <TextInput style={styles.formInput} placeholder="ABC123" value={form.sku} onChangeText={(t) => setForm(prev => ({ ...prev, sku: t }))} autoCapitalize="characters" />
                  </View>
                  <View style={styles.formCol60}>
                    <Text style={styles.formLabel}>Nama Produk</Text>
                    <TextInput style={styles.formInput} placeholder="Nama produk" value={form.nama_produk} onChangeText={(t) => setForm(prev => ({ ...prev, nama_produk: t }))} />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formCol50}>
                    <Text style={styles.formLabel}>Modal (¥)</Text>
                    <View style={styles.inputWithPrefix}>
                      <Text style={styles.inputPrefix}>¥</Text>
                      <TextInput style={[styles.formInput, styles.inputPrefixed]} placeholder="0" value={form.harga_modal_non_rp} onChangeText={handleNonRpChange} keyboardType="decimal-pad" />
                    </View>
                    {jpyToIdr && <Text style={styles.conversionRateHint}>1¥ = {parseFloat(jpyToIdr).toLocaleString('id-ID')}</Text>}
                  </View>
                  <View style={styles.formCol50}>
                    <Text style={styles.formLabel}>Modal (RP)</Text>
                    <View style={styles.inputWithPrefix}>
                      <Text style={styles.inputPrefix}>Rp</Text>
                      <TextInput style={[styles.formInput, styles.inputPrefixed, styles.inputReadonly]} value={form.harga_modal_rp ? displayNumberWithSeparator(form.harga_modal_rp) : ''} editable={false} />
                    </View>
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formCol50}>
                    <Text style={styles.formLabel}>Harga Jual (RP)</Text>
                    <View style={styles.inputWithPrefix}>
                      <Text style={styles.inputPrefix}>Rp</Text>
                      <TextInput style={[styles.formInput, styles.inputPrefixed]} placeholder="0" value={form.harga_jual_rp} onChangeText={handleHargaJualChange} keyboardType="numeric" />
                    </View>
                  </View>
                  <View style={styles.formCol25}>
                    <Text style={styles.formLabel}>Stock Awal</Text>
                    <TextInput style={styles.formInput} placeholder="0" value={form.stock} onChangeText={handleStockChange} keyboardType="numeric" />
                  </View>
                  <View style={styles.formCol25}>
                    <Text style={styles.formLabel}>Min Stock</Text>
                    <TextInput style={styles.formInput} placeholder="0" value={form.min_stock} onChangeText={handleMinStockChange} keyboardType="numeric" />
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.alertActions}>
              <TouchableOpacity style={styles.alertButtonCancel} onPress={() => setVisible(false)}>
                <Text style={styles.alertButtonCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.alertButtonConfirm, { backgroundColor: mode === 'add' ? '#3b82f6' : '#f59e0b' }]} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator size="small" color="#fff" /> : (
                  <>
                    <MaterialCommunityIcons name="check" size={18} color="#fff" />
                    <Text style={styles.alertButtonConfirmText}>{mode === 'add' ? 'Simpan' : 'Simpan'}</Text>
                  </>
                )}
              </TouchableOpacity>
              {mode === 'edit' && (
                <TouchableOpacity style={styles.iconActionBtn} onPress={handleDelete} disabled={submitting}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              )}
              {mode === 'edit' && (
                <TouchableOpacity style={styles.iconActionBtn} onPress={handleShowHistory}>
                  <MaterialCommunityIcons name="history" size={18} color="#6b7280" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  alertOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, zIndex: 9999 },
  alertBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  alertWrapper: { width: '100%', maxWidth: 400 },
  alertContainer: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  alertHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  alertIconContainer: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  alertTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  alertSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  alertCloseButton: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', borderRadius: 16, backgroundColor: '#f3f4f6' },
  alertScrollContent: { maxHeight: 420 },
  alertContentScrollable: { padding: 16, paddingTop: 12, gap: 12 },
  formRow: { flexDirection: 'row', gap: 12 },
  formCol40: { flex: 0.4 },
  formCol60: { flex: 0.6 },
  formCol50: { flex: 0.5 },
  formCol25: { flex: 0.25 },
  formLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  formInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#111827' },
  inputWithPrefix: { flexDirection: 'row', alignItems: 'center' },
  inputPrefix: { marginRight: 8, color: '#6b7280', fontWeight: '700' },
  inputPrefixed: { flex: 1 },
  inputReadonly: { backgroundColor: '#f9fafb' },
  conversionRateHint: { fontSize: 12, color: '#9ca3af', marginTop: 6 },
  alertActions: { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  alertButtonCancel: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  alertButtonCancelText: { fontSize: 15, fontWeight: '600', color: '#6b7280' },
  alertButtonConfirm: { flex: 2, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  alertButtonConfirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  iconActionBtn: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
});

export default AddEditProductModal;