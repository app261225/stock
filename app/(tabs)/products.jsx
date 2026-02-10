import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Modal, TextInput as RNTextInput } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSession } from '../../contexts/AuthContext';
import productService from '../../services/productService';
import stockLogService from '../../services/stockLogService';

export default function ProductsScreen() {
  const { session } = useSession();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, aman, menipis, habis
  const [cacheLoaded, setCacheLoaded] = useState(false);
  
  // Action modal state
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null); // 'IN' or 'OUT'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [actionQuantity, setActionQuantity] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);
  
  // Add product modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFormData, setAddFormData] = useState({
    sku: '',
    nama_produk: '',
    harga_modal_rp: '',
    harga_jual_rp: '',
    min_stock: '',
    stock: '',
  });
  const [addSubmitting, setAddSubmitting] = useState(false);
  
  const CACHE_KEY = 'products_cache';

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [products, filter, searchQuery]);

  const loadProducts = async () => {
    try {
      // Try to load from cache first
      if (!cacheLoaded) {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const cachedData = JSON.parse(cached);
          setProducts(cachedData);
          setCacheLoaded(true);
          setLoading(false);
        }
      }

      // Fetch fresh data from server
      setLoading(true);
      const data = await productService.getAll(true);
      setProducts(data);
      
      // Save to cache
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
      setCacheLoaded(true);
    } catch (error) {
      console.error('Load products error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-sync when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Don't reload if already have cached data, only on explicit refresh
      return () => {};
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  }, []);

  const applyFilter = () => {
    let filtered = [...products];

    // Apply status filter
    if (filter === 'menipis') {
      filtered = filtered.filter(p => p.stock > 0 && p.stock <= p.min_stock);
    } else if (filter === 'habis') {
      filtered = filtered.filter(p => p.stock === 0);
    } else if (filter === 'aman') {
      filtered = filtered.filter(p => p.stock > p.min_stock);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.sku.toLowerCase().includes(query) || 
        p.nama_produk.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(filtered);
  };

  const getStockStatus = (product) => {
    if (product.stock === 0) {
      return { label: 'HABIS', color: '#ef4444', bgColor: '#fee2e2' };
    } else if (product.stock <= product.min_stock) {
      return { label: 'MENIPIS', color: '#f59e0b', bgColor: '#fef3c7' };
    }
    return { label: 'AMAN', color: '#16a34a', bgColor: '#dcfce7' };
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleActionSubmit = async () => {
    if (!actionQuantity.trim() || !selectedProduct) return;
    
    setActionSubmitting(true);
    try {
      const quantity = parseInt(actionQuantity, 10);
      if (isNaN(quantity) || quantity <= 0) {
        alert('Kuantitas harus berupa angka positif');
        return;
      }

      if (actionType === 'IN') {
        await stockLogService.recordStockIn(selectedProduct.id, session.user.id, quantity, '');
      } else {
        await stockLogService.recordStockOut(selectedProduct.id, session.user.id, quantity, '');
      }

      alert(`${actionType === 'IN' ? 'Stock IN' : 'Stock OUT'} berhasil`);
      setShowActionModal(false);
      setActionQuantity('');
      setActionType(null);
      setSelectedProduct(null);
      
      // Refresh products
      await loadProducts();
    } catch (error) {
      console.error('Action error:', error);
      alert(error.message || 'Terjadi kesalahan');
    } finally {
      setActionSubmitting(false);
    }
  };

  const openActionModal = (product, type) => {
    setSelectedProduct(product);
    setActionType(type);
    setActionQuantity('');
    setShowActionModal(true);
  };

  const handleAddProduct = async () => {
    const { sku, nama_produk, harga_modal_rp, harga_jual_rp, min_stock, stock } = addFormData;
    
    if (!sku.trim() || !nama_produk.trim() || !harga_modal_rp || !harga_jual_rp || !min_stock || !stock) {
      alert('Semua field harus diisi');
      return;
    }

    setAddSubmitting(true);
    try {
      await productService.create({
        sku: sku.trim(),
        nama_produk: nama_produk.trim(),
        harga_modal_rp: parseInt(harga_modal_rp, 10),
        harga_jual_rp: parseInt(harga_jual_rp, 10),
        min_stock: parseInt(min_stock, 10),
        stock: parseInt(stock, 10),
      });

      alert('Produk berhasil ditambahkan');
      setShowAddModal(false);
      setAddFormData({
        sku: '',
        nama_produk: '',
        harga_modal_rp: '',
        harga_jual_rp: '',
        min_stock: '',
        stock: '',
      });
      
      // Refresh products
      await loadProducts();
    } catch (error) {
      console.error('Add product error:', error);
      alert(error.message || 'Gagal menambahkan produk');
    } finally {
      setAddSubmitting(false);
    }
  };

  const renderProduct = ({ item }) => {
    const status = getStockStatus(item);
    
    return (
      <View style={styles.productCard}>
        <View style={styles.productHeader}>
          <View style={styles.productMain}>
            <Text style={styles.productSku}>{item.sku}</Text>
            <Text style={styles.productName}>{item.nama_produk}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.productDetailsCompact}>
          <View style={styles.detailsLeft}>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="package-variant" size={14} color="#6b7280" />
              <Text style={styles.detailLabel}>Stock</Text>
              <Text style={styles.detailValue}>{item.stock}</Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="alert-circle" size={14} color="#6b7280" />
              <Text style={styles.detailLabel}>Min</Text>
              <Text style={styles.detailValue}>{item.min_stock}</Text>
            </View>
          </View>

          <View style={styles.detailsRight}>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="cash" size={14} color="#6b7280" />
              <Text style={styles.detailLabel}>Modal</Text>
              <Text style={[styles.detailValue, { fontWeight: '600' }]}>{formatCurrency(item.harga_modal_rp)}</Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="currency-usd" size={14} color="#6b7280" />
              <Text style={styles.detailLabel}>Jual</Text>
              <Text style={[styles.detailValue, { color: '#16a34a', fontWeight: '700' }]}>{formatCurrency(item.harga_jual_rp)}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.actionButtonIn]}
            onPress={() => openActionModal(item, 'IN')}
          >
            <MaterialCommunityIcons name="package-down" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>IN</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.actionButtonOut]}
            onPress={() => openActionModal(item, 'OUT')}
          >
            <MaterialCommunityIcons name="package-up" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>OUT</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by SKU or name..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <View style={styles.filterBar}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.filterButtonActiveNeutral]}
            onPress={() => setFilter('all')}
          >
            <MaterialCommunityIcons name="apps" size={20} color={filter === 'all' ? '#fff' : '#6b7280'} />
            <View style={[styles.filterBadge, { backgroundColor: filter === 'all' ? '#2563eb' : '#e5e7eb' }]}>
              <Text style={[styles.filterBadgeText, filter === 'all' && { color: '#fff' }]}>{products.length}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filter === 'aman' && { backgroundColor: '#16a34a' }]}
            onPress={() => setFilter('aman')}
          >
            <MaterialCommunityIcons name="check-circle" size={20} color={filter === 'aman' ? '#fff' : '#16a34a'} />
            <View style={[styles.filterBadge, { backgroundColor: filter === 'aman' ? '#14532d' : '#d1fae5' }]}>
              <Text style={[styles.filterBadgeText, filter === 'aman' && { color: '#fff' }]}>{products.filter(p => p.stock > p.min_stock).length}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filter === 'menipis' && { backgroundColor: '#f59e0b' }]}
            onPress={() => setFilter('menipis')}
          >
            <MaterialCommunityIcons name="alert" size={20} color={filter === 'menipis' ? '#fff' : '#f59e0b'} />
            <View style={[styles.filterBadge, { backgroundColor: filter === 'menipis' ? '#7c2d12' : '#fff7ed' }]}>
              <Text style={[styles.filterBadgeText, filter === 'menipis' && { color: '#fff' }]}>{products.filter(p => p.stock > 0 && p.stock <= p.min_stock).length}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filter === 'habis' && { backgroundColor: '#ef4444' }]}
            onPress={() => setFilter('habis')}
          >
            <MaterialCommunityIcons name="close-circle" size={20} color={filter === 'habis' ? '#fff' : '#ef4444'} />
            <View style={[styles.filterBadge, { backgroundColor: filter === 'habis' ? '#7f1d1d' : '#fee2e2' }]}>
              <Text style={[styles.filterBadgeText, filter === 'habis' && { color: '#fff' }]}>{products.filter(p => p.stock === 0).length}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Product List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        scrollEnabled={true}
        scrollEventThrottle={16}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="package-variant-closed" size={64} color="#9ca3af" />
            <Text style={styles.emptyStateText}>No products found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery ? 'Try different search terms' : 'Add your first product to get started'}
            </Text>
          </View>
        }
      />

      {/* Add Product Modal */}
      <Modal
        visible={showAddModal}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setShowAddModal(false);
          setAddFormData({ sku: '', nama_produk: '', harga_modal_rp: '', harga_jual_rp: '', min_stock: '', stock: '' });
        }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            paddingBottom: 40,
            maxHeight: '90%',
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#111827' }}>Tambah Produk Baru</Text>
                <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>Isi semua informasi produk di bawah</Text>
              </View>
              <TouchableOpacity 
                onPress={() => {
                  setShowAddModal(false);
                  setAddFormData({ sku: '', nama_produk: '', harga_modal_rp: '', harga_jual_rp: '', min_stock: '', stock: '' });
                }}
                style={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: 10, 
                  backgroundColor: '#f3f4f6',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >
                <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Form */}
            <View style={{ gap: 16, marginBottom: 24 }}>
              {/* SKU Field */}
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <MaterialCommunityIcons name="barcode" size={18} color="#2563eb" />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>SKU</Text>
                </View>
                <RNTextInput
                  placeholder="Masukkan kode SKU produk"
                  placeholderTextColor="#d1d5db"
                  value={addFormData.sku}
                  onChangeText={(val) => setAddFormData({ ...addFormData, sku: val })}
                  style={styles.modernInput}
                  editable={!addSubmitting}
                />
              </View>

              {/* Product Name Field */}
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <MaterialCommunityIcons name="package-variant" size={18} color="#2563eb" />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>Nama Produk</Text>
                </View>
                <RNTextInput
                  placeholder="Masukkan nama produk"
                  placeholderTextColor="#d1d5db"
                  value={addFormData.nama_produk}
                  onChangeText={(val) => setAddFormData({ ...addFormData, nama_produk: val })}
                  style={styles.modernInput}
                  editable={!addSubmitting}
                />
              </View>

              {/* Prices Row */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <MaterialCommunityIcons name="cash" size={18} color="#f59e0b" />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>Harga Modal</Text>
                  </View>
                  <RNTextInput
                    placeholder="0"
                    placeholderTextColor="#d1d5db"
                    keyboardType="number-pad"
                    value={addFormData.harga_modal_rp}
                    onChangeText={(val) => setAddFormData({ ...addFormData, harga_modal_rp: val })}
                    style={styles.modernInput}
                    editable={!addSubmitting}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <MaterialCommunityIcons name="currency-usd" size={18} color="#16a34a" />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>Harga Jual</Text>
                  </View>
                  <RNTextInput
                    placeholder="0"
                    placeholderTextColor="#d1d5db"
                    keyboardType="number-pad"
                    value={addFormData.harga_jual_rp}
                    onChangeText={(val) => setAddFormData({ ...addFormData, harga_jual_rp: val })}
                    style={styles.modernInput}
                    editable={!addSubmitting}
                  />
                </View>
              </View>

              {/* Stock Row */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <MaterialCommunityIcons name="alert-circle" size={18} color="#ef4444" />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>Min Stock</Text>
                  </View>
                  <RNTextInput
                    placeholder="0"
                    placeholderTextColor="#d1d5db"
                    keyboardType="number-pad"
                    value={addFormData.min_stock}
                    onChangeText={(val) => setAddFormData({ ...addFormData, min_stock: val })}
                    style={styles.modernInput}
                    editable={!addSubmitting}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <MaterialCommunityIcons name="layers" size={18} color="#2563eb" />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>Stok Awal</Text>
                  </View>
                  <RNTextInput
                    placeholder="0"
                    placeholderTextColor="#d1d5db"
                    keyboardType="number-pad"
                    value={addFormData.stock}
                    onChangeText={(val) => setAddFormData({ ...addFormData, stock: val })}
                    style={styles.modernInput}
                    editable={!addSubmitting}
                  />
                </View>
              </View>
            </View>

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  setAddFormData({ sku: '', nama_produk: '', harga_modal_rp: '', harga_jual_rp: '', min_stock: '', stock: '' });
                }}
                disabled={addSubmitting}
                style={{
                  flex: 1,
                  backgroundColor: '#f3f4f6',
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  opacity: addSubmitting ? 0.5 : 1,
                }}
              >
                <Text style={{ color: '#6b7280', fontSize: 16, fontWeight: '600' }}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddProduct}
                disabled={addSubmitting}
                style={{
                  flex: 1,
                  backgroundColor: '#2563eb',
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: addSubmitting ? 0.6 : 1,
                  flexDirection: 'row',
                  gap: 8,
                }}
              >
                {addSubmitting ? (
                  <>
                    <ActivityIndicator color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Menyimpan...</Text>
                  </>
                ) : (
                  <>
                    <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Tambah Produk</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Action Modal (IN/OUT) */}
      <Modal
        visible={showActionModal}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setShowActionModal(false);
          setActionQuantity('');
        }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: '#fff',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            paddingBottom: 32,
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
                Stock {actionType === 'IN' ? 'IN' : 'OUT'}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowActionModal(false);
                setActionQuantity('');
              }} style={{ padding: 8 }}>
                <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* Product Info */}
            {selectedProduct && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>Produk</Text>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>{selectedProduct.nama_produk}</Text>
                <Text style={{ fontSize: 13, color: '#2563eb', marginTop: 4 }}>{selectedProduct.sku}</Text>
              </View>
            )}

            {/* Current Stock */}
            {selectedProduct && (
              <View style={{ marginBottom: 20, backgroundColor: '#f3f4f6', padding: 12, borderRadius: 8 }}>
                <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Stok Saat Ini</Text>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>{selectedProduct.stock} unit</Text>
              </View>
            )}

            {/* Quantity Input */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>Kuantitas</Text>
              <RNTextInput
                placeholder="Masukkan kuantitas"
                keyboardType="number-pad"
                value={actionQuantity}
                onChangeText={setActionQuantity}
                style={{
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  color: '#111827',
                }}
                editable={!actionSubmitting}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleActionSubmit}
              disabled={actionSubmitting || !actionQuantity.trim()}
              style={{
                backgroundColor: actionType === 'IN' ? '#16a34a' : '#ef4444',
                borderRadius: 8,
                padding: 14,
                alignItems: 'center',
                opacity: (actionSubmitting || !actionQuantity.trim()) ? 0.6 : 1,
              }}
            >
              {actionSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                  Konfirmasi Stock {actionType === 'IN' ? 'IN' : 'OUT'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  formInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 14,
    color: '#1f2937',
  },
  formInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  formInputHalf: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1f2937',
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 16,
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
  searchContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  modernInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    justifyContent: 'center',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  filterTabActive: {
    backgroundColor: '#2563eb',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  filterTabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  filterTabActiveNeutral: {
    backgroundColor: '#6b7280',
  },
  /* New icon-button filter styles */
  filterBar: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 640,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterButton: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    marginHorizontal: 6,
    position: 'relative',
    paddingHorizontal: 6,
  },
  filterButtonActiveNeutral: {
    backgroundColor: '#2563eb',
  },
  filterBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#fff',
  },
  filterBadgeText: {
    color: '#111827',
    fontSize: 10,
    fontWeight: '700',
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productMain: {
    flex: 1,
  },
  productSku: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  productDetailsCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailsLeft: {
    flex: 1,
    paddingRight: 8,
  },
  detailsRight: {
    flex: 1,
    paddingLeft: 8,
    alignItems: 'flex-end',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 2,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 6,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 6,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceInfo: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonIn: {
    backgroundColor: '#16a34a',
  },
  actionButtonOut: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});