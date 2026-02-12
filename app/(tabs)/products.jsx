import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Modal, KeyboardAvoidingView, ScrollView, Platform, Keyboard, Alert } from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [filter, setFilter] = useState('all');
  const [cacheLoaded, setCacheLoaded] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  // Add product modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFormData, setAddFormData] = useState({
    sku: '',
    nama_produk: '',
    harga_modal_cny: '',
    harga_modal_rp: '',
    harga_jual_rp: '',
    min_stock: '',
    stock: '',
  });
  const [addSubmitting, setAddSubmitting] = useState(false);
  
  // Stock action modal
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockAction, setStockAction] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockQuantity, setStockQuantity] = useState('');
  const [stockNotes, setStockNotes] = useState('');
  const [stockSubmitting, setStockSubmitting] = useState(false);
  
  // Product detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailProduct, setDetailProduct] = useState(null);
  const [stockLogs, setStockLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [hasMoreLogs, setHasMoreLogs] = useState(false);
  const [totalLogs, setTotalLogs] = useState(0);
  
  const LOGS_PER_PAGE = 10;
  
  const CACHE_KEY = 'products_cache';

  useEffect(() => {
    loadProducts();
    
    // Keyboard listeners
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    applyFilter();
  }, [products, filter, searchQuery]);

  const loadProducts = async () => {
    try {
      if (!cacheLoaded) {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const cachedData = JSON.parse(cached);
          setProducts(cachedData);
          setCacheLoaded(true);
          setLoading(false);
        }
      }

      setLoading(true);
      const data = await productService.getAll(true);
      setProducts(data);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
      setCacheLoaded(true);
    } catch (error) {
      console.error('Load products error:', error);
      Alert.alert('Error', 'Gagal memuat produk');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
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

    if (filter === 'menipis') {
      filtered = filtered.filter(p => p.stock > 0 && p.stock <= p.min_stock);
    } else if (filter === 'habis') {
      filtered = filtered.filter(p => p.stock === 0);
    } else if (filter === 'aman') {
      filtered = filtered.filter(p => p.stock > p.min_stock);
    }

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
      return { label: 'Habis', color: '#ef4444', bgColor: '#fef2f2' };
    } else if (product.stock <= product.min_stock) {
      return { label: 'Menipis', color: '#f59e0b', bgColor: '#fffbeb' };
    }
    return { label: 'Aman', color: '#16a34a', bgColor: '#f0fdf4' };
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleCNYChange = (value) => {
    const numValue = value.replace(/[^0-9]/g, '');
    
    setAddFormData({
      ...addFormData,
      harga_modal_cny: numValue,
      harga_modal_rp: numValue,
    });
  };

  const handleHargaJualChange = (value) => {
    const jualValue = value.replace(/[^0-9]/g, '');
    setAddFormData({
      ...addFormData,
      harga_jual_rp: jualValue,
    });
  };

  const calculateProfit = () => {
    const modal = parseFloat(addFormData.harga_modal_rp) || 0;
    const jual = parseFloat(addFormData.harga_jual_rp) || 0;
    const profit = jual - modal;
    const profitPercent = modal > 0 ? ((profit / modal) * 100) : 0;
    
    return {
      profit,
      profitPercent: profitPercent.toFixed(1),
    };
  };

  const handleAddProduct = async () => {
    const { sku, nama_produk, harga_modal_rp, harga_jual_rp, min_stock, stock } = addFormData;
    
    if (!sku.trim() || !nama_produk.trim() || !harga_modal_rp || !harga_jual_rp || !min_stock || !stock) {
      Alert.alert('Error', 'Semua field harus diisi');
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

      Alert.alert('Sukses', 'Produk berhasil ditambahkan');
      setShowAddModal(false);
      setAddFormData({
        sku: '',
        nama_produk: '',
        harga_modal_rp: '',
        harga_jual_rp: '',
        min_stock: '',
        stock: '',
      });
      await loadProducts();
    } catch (error) {
      console.error('Add product error:', error);
      Alert.alert('Error', error.message || 'Gagal menambahkan produk');
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleStockAction = async () => {
    if (!stockQuantity.trim() || !selectedProduct) return;
    
    setStockSubmitting(true);
    try {
      const quantity = parseInt(stockQuantity, 10);
      if (isNaN(quantity) || quantity <= 0) {
        Alert.alert('Error', 'Kuantitas harus berupa angka positif');
        setStockSubmitting(false);
        return;
      }

      if (stockAction === 'IN') {
        await stockLogService.recordStockIn(selectedProduct.id, session.user.id, quantity, stockNotes.trim());
        Alert.alert('Sukses', `Stock IN ${quantity} unit berhasil`);
      } else {
        await stockLogService.recordStockOut(selectedProduct.id, session.user.id, quantity, stockNotes.trim());
        Alert.alert('Sukses', `Stock OUT ${quantity} unit berhasil`);
      }

      setShowStockModal(false);
      setStockQuantity('');
      setStockNotes('');
      setStockAction(null);
      setSelectedProduct(null);
      await loadProducts();
    } catch (error) {
      console.error('Stock action error:', error);
      Alert.alert('Error', error.message || 'Terjadi kesalahan');
    } finally {
      setStockSubmitting(false);
    }
  };

  const openStockModal = (product, action) => {
    setSelectedProduct(product);
    setStockAction(action);
    setStockQuantity('');
    setStockNotes('');
    setShowStockModal(true);
  };

  const openAddProductModal = () => {
    setAddFormData({
      sku: '',
      nama_produk: '',
      harga_modal_cny: '',
      harga_modal_rp: '',
      harga_jual_rp: '',
      min_stock: '',
      stock: '',
    });
    setShowAddModal(true);
  };

  const openProductDetail = async (product) => {
    setDetailProduct(product);
    setShowDetailModal(true);
    setStockLogs([]);
    setLogsPage(1);
    await loadStockLogs(product.id, 1);
  };

  const loadStockLogs = async (productId, page) => {
    try {
      setLogsLoading(true);
      const response = await stockLogService.getByProduct(productId, page, LOGS_PER_PAGE);
      
      // Handle both array response and object response with logs property
      const logsData = Array.isArray(response) ? response : (response?.logs || []);
      const totalCount = response?.total || logsData.length;
      
      if (page === 1) {
        setStockLogs(logsData);
      } else {
        setStockLogs(prev => [...prev, ...logsData]);
      }
      
      setTotalLogs(totalCount);
      setHasMoreLogs(logsData.length === LOGS_PER_PAGE);
    } catch (error) {
      console.error('Load stock logs error:', error);
      console.error('Error details:', {
        message: error.message,
        productId,
        page,
      });
      Alert.alert('Error', 'Gagal memuat riwayat stock: ' + (error.message || 'Unknown error'));
      // Set empty state on error
      if (page === 1) {
        setStockLogs([]);
        setTotalLogs(0);
      }
    } finally {
      setLogsLoading(false);
    }
  };

  const loadMoreLogs = () => {
    if (!logsLoading && hasMoreLogs && detailProduct) {
      const nextPage = logsPage + 1;
      setLogsPage(nextPage);
      loadStockLogs(detailProduct.id, nextPage);
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const renderProduct = ({ item }) => {
    const status = getStockStatus(item);
    const profit = item.harga_jual_rp - item.harga_modal_rp;
    const profitPercent = ((profit / item.harga_modal_rp) * 100).toFixed(0);
    
    return (
      <View style={styles.productCardWrapper}>
        {/* Kolom 1: Product Info (Clickable) */}
        <TouchableOpacity 
          style={styles.productInfoSection}
          activeOpacity={0.7}
          onPress={() => openProductDetail(item)}
        >
          {/* Header: SKU + Status */}
          <View style={styles.cardHeader}>
            <Text style={styles.skuText}>{item.sku}</Text>
            <View style={[styles.statusPill, { backgroundColor: status.bgColor }]}>
              <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>

          {/* Product Name */}
          <Text style={styles.productName} numberOfLines={1}>{item.nama_produk}</Text>

          {/* Stock Info */}
          <View style={styles.stockInfoRow}>
            <MaterialCommunityIcons name="cube-outline" size={13} color="#6b7280" />
            <Text style={styles.stockLabel}>Stock</Text>
            <Text style={styles.stockValue}>{item.stock}/{item.min_stock}</Text>
          </View>

          {/* Price Info Grid - Compact 2 columns */}
          <View style={styles.priceGrid}>
            <View style={styles.priceCol}>
              <Text style={styles.priceLabel}>Modal</Text>
              <Text style={styles.priceValue}>{formatCurrency(item.harga_modal_rp)}</Text>
            </View>
            <View style={styles.priceCol}>
              <Text style={styles.priceLabel}>Jual</Text>
              <Text style={[styles.priceValue, styles.priceValueSell]}>{formatCurrency(item.harga_jual_rp)}</Text>
            </View>
          </View>

          {/* Profit Badge */}
          <View style={styles.profitBadge}>
            <MaterialCommunityIcons name="trending-up" size={12} color="#16a34a" />
            <Text style={styles.profitAmount}>{formatCurrency(profit)}</Text>
            <Text style={styles.profitPercent}>({profitPercent}%)</Text>
          </View>
        </TouchableOpacity>

        {/* Kolom 2: Action Buttons Vertical */}
        <View style={styles.actionColumn}>
          <TouchableOpacity 
            style={styles.actionBtnVertical}
            onPress={() => openStockModal(item, 'IN')}
          >
            <MaterialCommunityIcons name="package-down" size={20} color="#16a34a" />
            <Text style={styles.actionBtnVerticalText}>IN</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionBtnVertical}
            onPress={() => openStockModal(item, 'OUT')}
          >
            <MaterialCommunityIcons name="package-up" size={20} color="#ef4444" />
            <Text style={styles.actionBtnVerticalText}>OUT</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* Search + Add Button */}
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="magnify" size={20} color="#9ca3af" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari SKU atau nama produk..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <MaterialCommunityIcons name="close-circle" size={18} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openAddProductModal}>
            <MaterialCommunityIcons name="plus" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterContainer}>
          <View style={styles.filterChipsRow}>
            {[
              { key: 'all', label: 'Semua', icon: 'checkbox-multiple-blank-outline', color: '#3b82f6' },
              { key: 'aman', label: 'Aman', icon: 'check-circle-outline', color: '#16a34a' },
              { key: 'menipis', label: 'Menipis', icon: 'alert-circle-outline', color: '#f59e0b' },
              { key: 'habis', label: 'Habis', icon: 'close-circle-outline', color: '#ef4444' },
            ].map(({ key, label, icon, color }) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.filterChip,
                  filter === key && styles.filterChipActive,
                  filter === key && { backgroundColor: color }
                ]}
                onPress={() => setFilter(key)}
              >
                <MaterialCommunityIcons 
                  name={icon} 
                  size={15} 
                  color={filter === key ? '#fff' : '#6b7280'} 
                />
                <Text style={[
                  styles.filterChipText,
                  filter === key && styles.filterChipTextActive
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Product Count */}
          <View style={styles.productCount}>
            <Text style={styles.productCountText}>
              Terdapat <Text style={styles.productCountNumber}>{filteredProducts.length}</Text> produk
            </Text>
          </View>
        </View>
      </View>

      {/* Products List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Memuat produk...</Text>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="package-variant-closed" size={64} color="#d1d5db" />
          <Text style={styles.emptyStateText}>Tidak ada produk</Text>
          <Text style={styles.emptyStateSubtext}>
            {searchQuery ? 'Coba kata kunci lain' : 'Tambahkan produk pertama Anda'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />
          }
        />
      )}

      {/* Add Product Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.alertOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity 
            style={styles.alertBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowAddModal(false)}
          />
          <View style={styles.alertWrapper}>
            <View style={styles.alertContainer}>
              {/* Header */}
              <View style={[styles.alertHeader, { backgroundColor: '#eff6ff' }]}>
                <View style={[styles.alertIconContainer, { backgroundColor: '#3b82f6' }]}>
                  <MaterialCommunityIcons name="package-variant-plus" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>Tambah Produk Baru</Text>
                  <Text style={styles.alertSubtitle}>Isi detail produk</Text>
                </View>
                <TouchableOpacity 
                  style={styles.alertCloseButton}
                  onPress={() => setShowAddModal(false)}
                >
                  <MaterialCommunityIcons name="close" size={18} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* Form Content */}
              <ScrollView style={styles.alertScrollContent}>
                <View style={styles.alertContentScrollable}>
                  {/* SKU + Nama Produk */}
                  <View style={styles.formRow}>
                    <View style={styles.formCol40}>
                      <Text style={styles.formLabel}>SKU</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="ABC123"
                        value={addFormData.sku}
                        onChangeText={(text) => setAddFormData({ ...addFormData, sku: text })}
                        autoCapitalize="characters"
                      />
                    </View>
                    <View style={styles.formCol60}>
                      <Text style={styles.formLabel}>Nama Produk</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="Nama produk"
                        value={addFormData.nama_produk}
                        onChangeText={(text) => setAddFormData({ ...addFormData, nama_produk: text })}
                      />
                    </View>
                  </View>

                  {/* Harga Modal CNY + RP (auto-copy) */}
                  <View style={styles.formRow}>
                    <View style={styles.formCol50}>
                      <Text style={styles.formLabel}>Modal (CNY)</Text>
                      <View style={styles.inputWithPrefix}>
                        <Text style={styles.inputPrefix}>¥</Text>
                        <TextInput
                          style={[styles.formInput, styles.inputPrefixed]}
                          placeholder="0"
                          value={addFormData.harga_modal_cny}
                          onChangeText={handleCNYChange}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                    <View style={styles.formCol50}>
                      <Text style={styles.formLabel}>Modal (RP)</Text>
                      <View style={styles.inputWithPrefix}>
                        <Text style={styles.inputPrefix}>Rp</Text>
                        <TextInput
                          style={[styles.formInput, styles.inputPrefixed, styles.inputReadonly]}
                          value={addFormData.harga_modal_rp}
                          editable={false}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Harga Jual + Profit% */}
                  <View style={styles.formRow}>
                    <View style={styles.formCol60}>
                      <Text style={styles.formLabel}>Harga Jual (RP)</Text>
                      <View style={styles.inputWithPrefix}>
                        <Text style={styles.inputPrefix}>Rp</Text>
                        <TextInput
                          style={[styles.formInput, styles.inputPrefixed]}
                          placeholder="0"
                          value={addFormData.harga_jual_rp}
                          onChangeText={handleHargaJualChange}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                    <View style={styles.formCol40}>
                      <Text style={styles.formLabel}>Profit</Text>
                      <View style={styles.percentBox}>
                        <Text style={[
                          styles.percentValue,
                          { color: calculateProfit().profit >= 0 ? '#16a34a' : '#dc2626' }
                        ]}>
                          {calculateProfit().profitPercent}
                        </Text>
                        <Text style={styles.percentSymbol}>%</Text>
                      </View>
                    </View>
                  </View>

                  {/* Stock + Min Stock */}
                  <View style={styles.formRow}>
                    <View style={styles.formCol50}>
                      <Text style={styles.formLabel}>Stock Awal</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="0"
                        value={addFormData.stock}
                        onChangeText={(text) => setAddFormData({ ...addFormData, stock: text.replace(/[^0-9]/g, '') })}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.formCol50}>
                      <Text style={styles.formLabel}>Min Stock</Text>
                      <TextInput
                        style={styles.formInput}
                        placeholder="0"
                        value={addFormData.min_stock}
                        onChangeText={(text) => setAddFormData({ ...addFormData, min_stock: text.replace(/[^0-9]/g, '') })}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>
              </ScrollView>

              {/* Actions */}
              <View style={styles.alertActions}>
                <TouchableOpacity 
                  style={styles.alertButtonCancel}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={styles.alertButtonCancelText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.alertButtonConfirm, { backgroundColor: '#3b82f6' }]}
                  onPress={handleAddProduct}
                  disabled={addSubmitting}
                >
                  {addSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="check" size={18} color="#fff" />
                      <Text style={styles.alertButtonConfirmText}>Simpan</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Stock Action Modal */}
      <Modal
        visible={showStockModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStockModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.alertOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity 
            style={styles.alertBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowStockModal(false)}
          />
          <View style={styles.alertWrapper}>
            <View style={styles.alertContainer}>
              {/* Header */}
              <View style={[
                styles.alertHeader,
                { backgroundColor: stockAction === 'IN' ? '#f0fdf4' : '#fef2f2' }
              ]}>
                <View style={[
                  styles.alertIconContainer,
                  { backgroundColor: stockAction === 'IN' ? '#16a34a' : '#dc2626' }
                ]}>
                  <MaterialCommunityIcons 
                    name={stockAction === 'IN' ? 'plus-circle' : 'minus-circle'} 
                    size={20} 
                    color="#fff" 
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.alertTitleRow}>
                    <Text style={styles.alertTitle}>Stock {stockAction}</Text>
                    <Text style={styles.alertSKU}>({selectedProduct?.sku})</Text>
                  </View>
                  <Text style={styles.alertSubtitle}>{selectedProduct?.nama_produk}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.alertCloseButton}
                  onPress={() => setShowStockModal(false)}
                >
                  <MaterialCommunityIcons name="close" size={18} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <View style={styles.alertContent}>
                <View style={styles.alertInputGroup}>
                  <View style={styles.alertInputLabelRow}>
                    <Text style={styles.alertInputLabel}>Qty</Text>
                    <Text style={styles.alertStockInfo}>
                      Stock: <Text style={styles.alertStockValue}>{selectedProduct?.stock}</Text>
                    </Text>
                  </View>
                  <TextInput
                    style={styles.alertInput}
                    placeholder="Masukkan jumlah"
                    value={stockQuantity}
                    onChangeText={setStockQuantity}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.alertInputGroup}>
                  <Text style={styles.alertInputLabel}>Catatan (Opsional)</Text>
                  <TextInput
                    style={[styles.alertInput, styles.alertInputMultiline]}
                    placeholder="Tambahkan catatan..."
                    value={stockNotes}
                    onChangeText={setStockNotes}
                    multiline
                  />
                </View>
              </View>

              {/* Actions */}
              <View style={styles.alertActions}>
                <TouchableOpacity 
                  style={styles.alertButtonCancel}
                  onPress={() => setShowStockModal(false)}
                >
                  <Text style={styles.alertButtonCancelText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.alertButtonConfirm,
                    { backgroundColor: stockAction === 'IN' ? '#16a34a' : '#dc2626' }
                  ]}
                  onPress={handleStockAction}
                  disabled={stockSubmitting}
                >
                  {stockSubmitting ? (
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

      {/* Product Detail Modal */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.detailModalOverlay}>
          <View style={styles.detailModalContainer}>
            {/* Header */}
            <View style={styles.detailHeader}>
              <TouchableOpacity 
                style={styles.detailBackButton}
                onPress={() => setShowDetailModal(false)}
              >
                <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailTitle}>Detail Produk</Text>
                <Text style={styles.detailSKU}>{detailProduct?.sku}</Text>
              </View>
            </View>

            {/* Product Info Card */}
            <View style={styles.detailContent}>
              <View style={styles.detailInfoCard}>
                <Text style={styles.detailProductName}>{detailProduct?.nama_produk}</Text>
                
                <View style={styles.detailInfoGrid}>
                  <View style={styles.detailInfoItem}>
                    <Text style={styles.detailInfoLabel}>Stock Saat Ini</Text>
                    <Text style={styles.detailInfoValue}>{detailProduct?.stock} unit</Text>
                  </View>
                  <View style={styles.detailInfoItem}>
                    <Text style={styles.detailInfoLabel}>Min Stock</Text>
                    <Text style={styles.detailInfoValue}>{detailProduct?.min_stock} unit</Text>
                  </View>
                </View>

                <View style={styles.detailInfoGrid}>
                  <View style={styles.detailInfoItem}>
                    <Text style={styles.detailInfoLabel}>Harga Modal</Text>
                    <Text style={styles.detailInfoValue}>{formatCurrency(detailProduct?.harga_modal_rp || 0)}</Text>
                  </View>
                  <View style={styles.detailInfoItem}>
                    <Text style={styles.detailInfoLabel}>Harga Jual</Text>
                    <Text style={[styles.detailInfoValue, { color: '#16a34a' }]}>
                      {formatCurrency(detailProduct?.harga_jual_rp || 0)}
                    </Text>
                  </View>
                </View>

                {detailProduct && (
                  <View style={styles.detailProfitCard}>
                    <MaterialCommunityIcons name="trending-up" size={16} color="#16a34a" />
                    <Text style={styles.detailProfitLabel}>Profit per unit:</Text>
                    <Text style={styles.detailProfitValue}>
                      {formatCurrency((detailProduct.harga_jual_rp - detailProduct.harga_modal_rp))}
                    </Text>
                    <Text style={styles.detailProfitPercent}>
                      ({(((detailProduct.harga_jual_rp - detailProduct.harga_modal_rp) / detailProduct.harga_modal_rp) * 100).toFixed(1)}%)
                    </Text>
                  </View>
                )}
              </View>

              {/* Stock History */}
              <View style={styles.detailHistorySection}>
                <View style={styles.detailHistoryHeader}>
                  <Text style={styles.detailHistoryTitle}>Riwayat Stock</Text>
                  <Text style={styles.detailHistoryCount}>
                    {totalLogs} {totalLogs === 1 ? 'transaksi' : 'transaksi'}
                  </Text>
                </View>

                {stockLogs.length === 0 && !logsLoading ? (
                  <View style={styles.detailEmptyLogs}>
                    <MaterialCommunityIcons name="history" size={48} color="#d1d5db" />
                    <Text style={styles.detailEmptyLogsText}>Belum ada riwayat stock</Text>
                  </View>
                ) : (
                  <FlatList
                    data={stockLogs}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 8 }}
                    renderItem={({ item }) => (
                      <View style={styles.logItemCard}>
                        {/* Icon Badge */}
                        <View style={[
                          styles.logIconBadge,
                          { backgroundColor: item.type === 'IN' ? '#dcfce7' : '#fee2e2' }
                        ]}>
                          <MaterialCommunityIcons 
                            name={item.type === 'IN' ? 'package-down' : 'package-up'} 
                            size={20} 
                            color={item.type === 'IN' ? '#16a34a' : '#ef4444'} 
                          />
                        </View>
                        
                        {/* Content */}
                        <View style={styles.logContent}>
                          {/* Header Row: Badge + Time */}
                          <View style={styles.logTopRow}>
                            <Text style={[
                              styles.logTypeText,
                              { color: item.type === 'IN' ? '#16a34a' : '#ef4444' }
                            ]}>
                              {item.type === 'IN' ? 'Stock IN' : 'Stock OUT'} • {item.quantity} unit
                            </Text>
                          </View>
                          
                          {/* Notes */}
                          {item.notes && (
                            <Text style={styles.logNotes} numberOfLines={1}>{item.notes}</Text>
                          )}
                          
                          {/* Footer: User + Time */}
                          <View style={styles.logFooterRow}>
                            <Text style={styles.logUser}>
                              oleh {item.user_name || 'Unknown'}
                            </Text>
                            <Text style={styles.logTime}>
                              {new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}
                    onEndReached={loadMoreLogs}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                      logsLoading ? (
                        <View style={styles.logsLoadingFooter}>
                          <ActivityIndicator size="small" color="#3b82f6" />
                          <Text style={styles.logsLoadingText}>Memuat...</Text>
                        </View>
                      ) : hasMoreLogs ? (
                        <TouchableOpacity style={styles.loadMoreButton} onPress={loadMoreLogs}>
                          <Text style={styles.loadMoreText}>Muat Lebih Banyak</Text>
                        </TouchableOpacity>
                      ) : stockLogs.length > 0 ? (
                        <View style={styles.logsEndIndicator}>
                          <Text style={styles.logsEndText}>Semua riwayat telah dimuat</Text>
                        </View>
                      ) : null
                    }
                  />
                )}
              </View>
            </View>
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
  header: {
    backgroundColor: '#fff',
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  addButton: {
    width: 44,
    height: 44,
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  clearButton: {
    padding: 4,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  filterChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 7,
    borderRadius: 20,
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: '#3b82f6',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  productCount: {
    paddingVertical: 4,
  },
  productCountText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  productCountNumber: {
    fontWeight: '700',
    color: '#111827',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  listContent: {
    padding: 10,
    gap: 8,
  },

  // Product Card - 2 Kolom Layout
  productCardWrapper: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  productInfoSection: {
    flex: 1,
    padding: 12,
    gap: 8,
  },
  actionColumn: {
    width: 64,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderLeftWidth: 1,
    borderLeftColor: '#e5e7eb',
  },
  actionBtnVertical: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionBtnVerticalText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skuText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 0.5,
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  stockInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockLabel: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '500',
  },
  stockValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  priceGrid: {
    flexDirection: 'row',
    gap: 6,
  },
  priceCol: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    padding: 6,
  },
  priceLabel: {
    fontSize: 9,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  priceValueSell: {
    color: '#16a34a',
  },
  profitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 3,
    alignSelf: 'flex-start',
  },
  profitAmount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16a34a',
  },
  profitPercent: {
    fontSize: 9,
    fontWeight: '600',
    color: '#16a34a',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 6,
    gap: 3,
  },
  actionBtnIn: {
    backgroundColor: '#f0fdf4',
  },
  actionBtnOut: {
    backgroundColor: '#fef2f2',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  },

  // Modal Styles
  alertOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    maxWidth: 400,
  },
  alertContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  alertIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  alertSKU: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  alertSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  alertCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  alertContent: {
    padding: 16,
    paddingTop: 12,
    gap: 12,
  },
  alertScrollContent: {
    maxHeight: 380,
  },
  alertContentScrollable: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  
  // Form Grid
  formRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  formCol40: {
    flex: 0.4,
  },
  formCol50: {
    flex: 0.5,
  },
  formCol60: {
    flex: 0.6,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  inputWithPrefix: {
    position: 'relative',
  },
  inputPrefix: {
    position: 'absolute',
    left: 10,
    top: 10,
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
    zIndex: 1,
  },
  inputPrefixed: {
    paddingLeft: 30,
  },
  inputReadonly: {
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
  },
  percentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 4,
  },
  percentValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  percentSymbol: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
  },

  alertInputGroup: {
    gap: 6,
  },
  alertInputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  alertStockInfo: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  alertStockValue: {
    fontWeight: '700',
    color: '#6b7280',
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
    fontWeight: '600',
  },
  alertInputReadonly: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  alertInputMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
    paddingTop: 10,
    fontWeight: '400',
  },
  alertActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  alertButtonCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertButtonCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  alertButtonConfirm: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  alertButtonConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // Detail Modal Styles
  detailModalOverlay: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  detailModalContainer: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  detailBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  detailSKU: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 2,
  },
  detailContent: {
    flex: 1,
  },
  detailInfoCard: {
    backgroundColor: '#fff',
    margin: 12,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  detailProductName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  detailInfoGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  detailInfoItem: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 8,
  },
  detailInfoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  detailInfoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  detailProfitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 10,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  detailProfitLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16a34a',
  },
  detailProfitValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16a34a',
    marginLeft: 'auto',
  },
  detailProfitPercent: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16a34a',
  },
  detailHistorySection: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 12,
    marginTop: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  detailHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailHistoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  detailHistoryCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  detailEmptyLogs: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  detailEmptyLogsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 12,
  },
  logItemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  logIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logContent: {
    flex: 1,
    gap: 2,
  },
  logTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logTypeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  logNotes: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  logFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  logUser: {
    fontSize: 12,
    color: '#9ca3af',
  },
  logTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  logsLoadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  logsLoadingText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  loadMoreButton: {
    padding: 12,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },
  logsEndIndicator: {
    padding: 12,
    alignItems: 'center',
  },
  logsEndText: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
});