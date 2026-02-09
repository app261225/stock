import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import productService from '../../services/productService';

export default function ProductsScreen() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, low, out

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [products, filter, searchQuery]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.getAll(true);
      setProducts(data);
    } catch (error) {
      console.error('Load products error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  }, []);

  const applyFilter = () => {
    let filtered = [...products];

    // Apply status filter
    if (filter === 'low') {
      filtered = filtered.filter(p => p.stock > 0 && p.stock <= p.min_stock);
    } else if (filter === 'out') {
      filtered = filtered.filter(p => p.stock === 0);
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

  const renderProduct = ({ item }) => {
    const status = getStockStatus(item);
    
    return (
      <TouchableOpacity style={styles.productCard} activeOpacity={0.7}>
        <View style={styles.productHeader}>
          <View style={styles.productMain}>
            <Text style={styles.productSku}>{item.sku}</Text>
            <Text style={styles.productName}>{item.nama_produk}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bgColor }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={styles.productDetails}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="package-variant" size={16} color="#6b7280" />
            <Text style={styles.detailLabel}>Stock:</Text>
            <Text style={styles.detailValue}>{item.stock} units</Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="alert-circle" size={16} color="#6b7280" />
            <Text style={styles.detailLabel}>Min Stock:</Text>
            <Text style={styles.detailValue}>{item.min_stock} units</Text>
          </View>
        </View>

        <View style={styles.productFooter}>
          <View style={styles.priceInfo}>
            <Text style={styles.priceLabel}>Harga Modal:</Text>
            <Text style={styles.priceValue}>{formatCurrency(item.harga_modal_rp)}</Text>
          </View>
          <View style={styles.priceInfo}>
            <Text style={styles.priceLabel}>Harga Jual:</Text>
            <Text style={[styles.priceValue, { color: '#16a34a', fontWeight: 'bold' }]}>
              {formatCurrency(item.harga_jual_rp)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
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
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All ({products.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'low' && styles.filterTabActive]}
          onPress={() => setFilter('low')}
        >
          <Text style={[styles.filterText, filter === 'low' && styles.filterTextActive]}>
            Low Stock ({products.filter(p => p.stock > 0 && p.stock <= p.min_stock).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'out' && styles.filterTabActive]}
          onPress={() => setFilter('out')}
        >
          <Text style={[styles.filterText, filter === 'out' && styles.filterTextActive]}>
            Out of Stock ({products.filter(p => p.stock === 0).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Product List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
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
    padding: 16,
    backgroundColor: '#ffffff',
  },
  searchInputContainer: {
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 8,
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
  listContainer: {
    padding: 16,
    gap: 12,
  },
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
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
  productDetails: {
    gap: 8,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
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
});