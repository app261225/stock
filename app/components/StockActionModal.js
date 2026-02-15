import React, { useState, forwardRef, useImperativeHandle } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import stockLogService from '../../services/stockLogService';

// Gunakan forwardRef agar parent bisa memanggil fungsi di dalam sini
const StockActionModal = forwardRef(({ onSuccess, session }, ref) => {
  const [visible, setVisible] = useState(false);
  const [product, setProduct] = useState(null);
  const [action, setAction] = useState(null); // 'IN' or 'OUT'
  
  // Local state (tidak akan memicu re-render di Parent saat diketik)
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Ekspos fungsi 'open' ke parent
  useImperativeHandle(ref, () => ({
    open: (selectedProduct, selectedAction) => {
      setProduct(selectedProduct);
      setAction(selectedAction);
      setQuantity('');
      setNotes('');
      setVisible(true); // Hanya komponen ini yang re-render, Parent TIDAK.
    },
    close: () => {
      setVisible(false);
    }
  }));

  const handleClose = () => setVisible(false);

  const handleSubmit = async () => {
    if (!quantity.trim() || !product) return;
    
    setSubmitting(true);
    try {
      const qtyInt = parseInt(quantity, 10);
      if (isNaN(qtyInt) || qtyInt <= 0) {
        Alert.alert('Error', 'Kuantitas harus berupa angka positif');
        setSubmitting(false);
        return;
      }

      if (action === 'IN') {
        await stockLogService.recordStockIn(product.id, session.user.id, qtyInt, notes.trim());
        Alert.alert('Sukses', `Stock IN ${qtyInt} unit berhasil`);
      } else {
        await stockLogService.recordStockOut(product.id, session.user.id, qtyInt, notes.trim());
        Alert.alert('Sukses', `Stock OUT ${qtyInt} unit berhasil`);
      }

      setVisible(false);
      if (onSuccess) onSuccess(); // Refresh data di parent
    } catch (error) {
      console.error('Stock action error:', error);
      Alert.alert('Error', error.message || 'Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible && !product) return null; // Tetap ringan saat closed

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={styles.alertOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity 
          style={styles.alertBackdrop} 
          activeOpacity={1} 
          onPress={handleClose}
        />
        <View style={styles.alertWrapper}>
          <View style={styles.alertContainer}>
            {/* Header */}
            <View style={[
              styles.alertHeader,
              { backgroundColor: action === 'IN' ? '#f0fdf4' : '#fef2f2' }
            ]}>
              <View style={[
                styles.alertIconContainer,
                { backgroundColor: action === 'IN' ? '#16a34a' : '#dc2626' }
              ]}>
                <MaterialCommunityIcons 
                  name={action === 'IN' ? 'plus-circle' : 'minus-circle'} 
                  size={20} 
                  color="#fff" 
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.alertTitleRow}>
                  <Text style={styles.alertTitle}>Stock {action}</Text>
                  <Text style={styles.alertSKU}>({product?.sku})</Text>
                </View>
                <Text style={styles.alertSubtitle}>{product?.nama_produk}</Text>
              </View>
              <TouchableOpacity style={styles.alertCloseButton} onPress={handleClose}>
                <MaterialCommunityIcons name="close" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.alertContent}>
              <View style={styles.alertInputGroup}>
                <View style={styles.alertInputLabelRow}>
                  <Text style={styles.alertInputLabel}>Qty</Text>
                  <Text style={styles.alertStockInfo}>
                    Stock Saat Ini: <Text style={styles.alertStockValue}>{product?.stock}</Text>
                  </Text>
                </View>
                <TextInput
                  style={styles.alertInput}
                  placeholder="Masukkan jumlah"
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="numeric"
                  autoFocus={true}
                />
              </View>

              <View style={styles.alertInputGroup}>
                <Text style={styles.alertInputLabel}>Catatan (Opsional)</Text>
                <TextInput
                  style={[styles.alertInput, styles.alertInputMultiline]}
                  placeholder="Tambahkan catatan..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                />
              </View>
            </View>

            {/* Actions */}
            <View style={styles.alertActions}>
              <TouchableOpacity style={styles.alertButtonCancel} onPress={handleClose}>
                <Text style={styles.alertButtonCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.alertButtonConfirm,
                  { backgroundColor: action === 'IN' ? '#16a34a' : '#dc2626' }
                ]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check" size={18} color="#fff" />
                    <Text style={styles.alertButtonConfirmText}>Konfirmasi</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

StockActionModal.displayName = 'StockActionModal';

const styles = StyleSheet.create({
  alertOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
  },
  alertBackdrop: {
    position: 'absolute',
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  alertWrapper: { 
    width: '100%', 
    maxWidth: 400 
  },
  alertContainer: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    overflow: 'hidden' 
  },
  alertHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 14, 
    gap: 10 
  },
  alertIconContainer: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  alertTitleRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4 
  },
  alertTitle: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#111827' 
  },
  alertSKU: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#6b7280' 
  },
  alertSubtitle: { 
    fontSize: 13, 
    color: '#6b7280', 
    marginTop: 2 
  },
  alertCloseButton: { 
    width: 32, 
    height: 32, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderRadius: 16, 
    backgroundColor: '#f3f4f6' 
  },
  alertContent: { 
    padding: 16, 
    paddingTop: 12, 
    gap: 12 
  },
  alertInputGroup: { 
    gap: 6 
  },
  alertInputLabelRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  alertInputLabel: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#374151' 
  },
  alertStockInfo: { 
    fontSize: 12, 
    color: '#9ca3af', 
    fontWeight: '500' 
  },
  alertStockValue: { 
    fontWeight: '700', 
    color: '#6b7280' 
  },
  alertInput: { 
    backgroundColor: '#f9fafb', 
    borderWidth: 1, 
    borderColor: '#d1d5db', 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 10, 
    fontSize: 15, 
    color: '#111827', 
    fontWeight: '600' 
  },
  alertInputMultiline: { 
    minHeight: 60, 
    textAlignVertical: 'top', 
    paddingTop: 10, 
    fontWeight: '400' 
  },
  alertActions: { 
    flexDirection: 'row', 
    gap: 10, 
    padding: 16, 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#f3f4f6' 
  },
  alertButtonCancel: { 
    flex: 1, 
    paddingVertical: 12, 
    borderRadius: 8, 
    backgroundColor: '#f3f4f6', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  alertButtonCancelText: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#6b7280' 
  },
  alertButtonConfirm: { 
    flex: 2, 
    paddingVertical: 12, 
    borderRadius: 8, 
    alignItems: 'center', 
    justifyContent: 'center', 
    flexDirection: 'row', 
    gap: 6 
  },
  alertButtonConfirmText: { 
    fontSize: 15, 
    fontWeight: '700', 
    color: '#fff' 
  },
});

export default StockActionModal;
