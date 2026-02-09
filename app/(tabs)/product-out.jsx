import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSession } from '../../contexts/AuthContext';
import productService from '../../services/productService';
import stockLogService from '../../services/stockLogService';

export default function ProductOutScreen() {
  const { session } = useSession();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await productService.getAll(true);
      // Filter only products with stock > 0
      setProducts(data.filter(p => p.stock > 0));
    } catch (error) {
      console.error('Load products error:', error);
      Alert.alert('Error', 'Gagal memuat data produk');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.nama_produk.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setSearchQuery('');
  };

  const getStockWarning = () => {
    if (!selectedProduct || !quantity) return null;
    
    const qty = parseInt(quantity);
    const newStock = selectedProduct.stock - qty;

    if (qty > selectedProduct.stock) {
      return {
        type: 'error',
        message: 'Quantity melebihi stock tersedia!',
        color: '#ef4444',
        bgColor: '#fee2e2',
      };
    }
    if (newStock === 0) {
      return {
        type: 'warning',
        message: 'Produk akan habis setelah transaksi ini',
        color: '#f59e0b',
        bgColor: '#fef3c7',
      };
    }
    if (newStock <= selectedProduct.min_stock) {
      return {
        type: 'warning',
        message: 'Stock akan menipis setelah transaksi ini',
        color: '#f59e0b',
        bgColor: '#fef3c7',
      };
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!selectedProduct) {
      Alert.alert('Error', 'Pilih produk terlebih dahulu');
      return;
    }
    if (!quantity || parseInt(quantity) <= 0) {
      Alert.alert('Error', 'Quantity harus lebih dari 0');
      return;
    }
    if (parseInt(quantity) > selectedProduct.stock) {
      Alert.alert('Error', 'Quantity melebihi stock tersedia');
      return;
    }

    setSubmitting(true);

    try {
      await stockLogService.recordStockOut(
        selectedProduct.id,
        session?.user?.id,
        parseInt(quantity),
        notes.trim() || null
      );

      Alert.alert(
        'Success',
        `Stock OUT berhasil!\n${selectedProduct.nama_produk}\n-${quantity} units`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setSelectedProduct(null);
              setQuantity('');
              setNotes('');
              loadProducts(); // Refresh product list
            },
          },
        ]
      );
    } catch (error) {
      console.error('Stock OUT error:', error);
      Alert.alert('Error', error.message || 'Gagal melakukan Stock OUT');
    } finally {
      setSubmitting(false);
    }
  };

  const warning = getStockWarning();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Product Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Product</Text>
        
        {selectedProduct ? (
          <View style={styles.selectedProductCard}>
            <View style={styles.selectedProductHeader}>
              <View style={styles.selectedProductInfo}>
                <Text style={styles.selectedProductSku}>{selectedProduct.sku}</Text>
                <Text style={styles.selectedProductName}>{selectedProduct.nama_produk}</Text>
                <Text style={styles.selectedProductStock}>
                  Current Stock: {selectedProduct.stock} units
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedProduct(null)}
                style={styles.clearButton}
              >
                <MaterialCommunityIcons name="close-circle" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.searchContainer}>
              <MaterialCommunityIcons name="magnify" size={20} color="#6b7280" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by SKU or name..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {searchQuery.length > 0 && (
              <View style={styles.productList}>
                {filteredProducts.length === 0 ? (
                  <Text style={styles.emptyText}>No products found with available stock</Text>
                ) : (
                  filteredProducts.slice(0, 5).map((product) => (
                    <TouchableOpacity
                      key={product.id}
                      style={styles.productItem}
                      onPress={() => handleSelectProduct(product)}
                    >
                      <View style={styles.productItemInfo}>
                        <Text style={styles.productItemSku}>{product.sku}</Text>
                        <Text style={styles.productItemName}>{product.nama_produk}</Text>
                        <Text style={styles.productItemStock}>
                          Available: {product.stock} units
                        </Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </>
        )}
      </View>

      {/* Quantity Input */}
      {selectedProduct && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quantity *</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="numeric" size={20} color="#6b7280" />
              <TextInput
                style={styles.input}
                placeholder="Enter quantity"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                editable={!submitting}
              />
              <Text style={styles.unitText}>units</Text>
            </View>
            
            {/* Stock Preview */}
            {quantity && parseInt(quantity) > 0 && parseInt(quantity) <= selectedProduct.stock && (
              <View style={styles.previewCard}>
                <Text style={styles.previewLabel}>New Stock:</Text>
                <Text style={styles.previewValue}>
                  {selectedProduct.stock} - {quantity} = {selectedProduct.stock - parseInt(quantity)}
                </Text>
              </View>
            )}

            {/* Warning */}
            {warning && (
              <View style={[styles.warningCard, { backgroundColor: warning.bgColor }]}>
                <MaterialCommunityIcons 
                  name={warning.type === 'error' ? 'alert-circle' : 'alert'} 
                  size={20} 
                  color={warning.color} 
                />
                <Text style={[styles.warningText, { color: warning.color }]}>
                  {warning.message}
                </Text>
              </View>
            )}
          </View>

          {/* Notes Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes (Optional)</Text>
            <View style={[styles.inputContainer, styles.notesInput]}>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Add notes (e.g., Customer name, Order number...)"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                editable={!submitting}
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton, 
              (submitting || warning?.type === 'error') && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={submitting || warning?.type === 'error'}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="package-up" size={24} color="#ffffff" />
            <Text style={styles.submitButtonText}>
              {submitting ? 'Processing...' : 'Record Stock OUT'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    height: 48,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  productList: {
    marginTop: 12,
    gap: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9ca3af',
    padding: 20,
  },
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  productItemInfo: {
    flex: 1,
  },
  productItemSku: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 2,
  },
  productItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  productItemStock: {
    fontSize: 12,
    color: '#6b7280',
  },
  selectedProductCard: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  selectedProductHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  selectedProductInfo: {
    flex: 1,
  },
  selectedProductSku: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 4,
  },
  selectedProductName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  selectedProductStock: {
    fontSize: 13,
    color: '#6b7280',
  },
  clearButton: {
    padding: 4,
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
  notesInput: {
    height: 'auto',
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  unitText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  previewLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  previewValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 12,
    height: 52,
    gap: 8,
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#fca5a5',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});