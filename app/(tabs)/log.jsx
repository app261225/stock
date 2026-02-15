import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { useSession } from '../../contexts/AuthContext';
import stockLogService from '../../services/stockLogService';
import StockLogDAO from '../../lib/dao/StockLogDAO';
import EventBus from '../../lib/EventBus';

export default function LogScreen() {
  const { session } = useSession();
  const route = useRoute();

  // Data state
  const [allLogs, setAllLogs] = useState([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & Search state - start with 'all'
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Apply filter from dashboard route params when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (route.params?.filter) {
        setFilter(route.params.filter);
      }
    }, [route.params?.filter])
  );

  // Load initial data once when screen mounts
  useEffect(() => {
    loadLogs();

    // Subscribe to stock_action event untuk append card baru
    const unsubscribeStockAction = EventBus.on('stock_action', (data) => {
      console.log('[Log] Received stock_action event:', data);
      // Append card baru ke list tanpa full reload
      const newLog = {
        id: data.logId,
        product_id: data.product_id,
        user_id: data.user_id,
        type: data.type,
        quantity: data.quantity,
        stock_before: data.stock_before,
        stock_after: data.stock_after,
        notes: data.notes,
        created_at: data.created_at,
        product: data.product,
        user: data.user,
      };
      
      // Enrich dengan product & user info jika tidak lengkap
      const enrichedLog = enrichLogsWithProductInfo([newLog])[0];
      
      console.log('[Log] Enriched log:', enrichedLog);
      setAllLogs(prevLogs => [enrichedLog, ...prevLogs]);
    });

    // Subscribe to force_refresh event dari profile screen
    const unsubscribeForceRefresh = EventBus.on('force_refresh', (data) => {
      console.log('[Log] Received force_refresh event:', data);
      loadLogs();
    });

    return () => {
      unsubscribeStockAction();
      unsubscribeForceRefresh();
    };
  }, []);

  const enrichLogsWithProductInfo = (logs) => {
    // Enrich logs dengan product & user info (dari Supabase response atau lokal)
    return logs.map(log => ({
      ...log,
      product: log.product || { id: log.product_id, nama_produk: 'Product', sku: '-' },
      user: log.user || { id: log.user_id, name: 'Unknown' },
    }));
  };

  const loadLogs = async () => {
    setIsLoadingInitial(true);
    try {
      // Always prioritize Supabase for display (dengan product & user detail)
      let logs = [];
      let useLocalFallback = false;

      try {
        // Try Supabase first
        const response = await stockLogService.getAll();
        logs = response?.logs || [];
        console.log('[Log] Fetched', logs.length, 'logs from Supabase with product details');
        
        // Async sync ke DAO untuk offline use (non-blocking)
        if (logs.length > 0) {
          const daoLogs = logs.map(log => ({
            id: log.id,
            product_id: log.product?.id || '',
            user_id: log.user?.id || '',
            type: log.type,
            quantity: log.quantity,
            stock_before: log.stock_before,
            stock_after: log.stock_after,
            notes: log.notes,
            created_at: log.created_at,
          }));
          StockLogDAO.batchInsert(daoLogs).catch(err => 
            console.error('[Log] Background DAO sync error:', err)
          );
        }
      } catch (supabaseErr) {
        // Fallback ke DAO lokal jika Supabase gagal (offline mode)
        console.warn('[Log] Supabase unavailable, using local DAO:', supabaseErr.message);
        useLocalFallback = true;
        
        try {
          logs = await StockLogDAO.getRecent(100);
          console.log('[Log] Using', logs?.length || 0, 'logs from local DAO (offline)');
        } catch (daoErr) {
          console.error('[Log] DAO fallback error:', daoErr);
          logs = [];
        }
      }
      
      // Display dengan product & user info
      const enriched = enrichLogsWithProductInfo(logs);
      setAllLogs(enriched);
    } catch (error) {
      console.error('[Log] loadLogs unexpected error:', error);
      setAllLogs([]);
    } finally {
      setIsLoadingInitial(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLogs();
    setRefreshing(false);
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('id-ID', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  // Filter logs based on type and search query
  const filteredLogs = (allLogs || []).filter(log => {
    // Apply type filter
    if (filter === 'in' && log.type !== 'IN') return false;
    if (filter === 'out' && log.type !== 'OUT') return false;

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        log.product?.nama_produk?.toLowerCase().includes(query) ||
        log.product?.sku?.toLowerCase().includes(query) ||
        log.user?.name?.toLowerCase().includes(query) ||
        log.notes?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const renderLogCard = ({ item }) => (
    <View style={[
      styles.logCard,
      { borderLeftColor: item.type === 'IN' ? '#16a34a' : '#ef4444' }
    ]}>
      <View style={styles.logRow}>
        {/* Icon + Qty */}
        <View style={styles.iconCol}>
          <View style={[
            styles.logIcon,
            { backgroundColor: item.type === 'IN' ? '#dcfce7' : '#fee2e2' }
          ]}>
            <MaterialCommunityIcons
              name={item.type === 'IN' ? 'package-down' : 'package-up'}
              size={16}
              color={item.type === 'IN' ? '#16a34a' : '#ef4444'}
            />
          </View>
          <Text style={[
            styles.qtyBadge,
            { 
              backgroundColor: item.type === 'IN' ? '#dcfce7' : '#fee2e2',
              color: item.type === 'IN' ? '#16a34a' : '#ef4444' 
            }
          ]}>
            {item.type === 'IN' ? '+' : '-'}{item.quantity}
          </Text>
        </View>

        {/* Product Info */}
        <View style={styles.infoCol}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.product?.nama_produk}
          </Text>
          <View style={styles.skuRow}>
            <Text style={styles.skuBadge}>{item.product?.sku}</Text>
            <MaterialCommunityIcons name="circle-small" size={12} color="#d1d5db" />
            <Text style={styles.userName}>{item.user?.name || 'Unknown'}</Text>
          </View>
          {item.notes && (
            <Text style={styles.notesText} numberOfLines={1}>
              {item.notes}
            </Text>
          )}
        </View>

        {/* Date & Time */}
        <View style={styles.timeCol}>
          <Text style={styles.timeText}>{formatTime(item.created_at)}</Text>
          <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
        </View>
      </View>
    </View>
  );

  if (isLoadingInitial) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Memuat riwayat...</Text>
      </View>
    );
  }

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
              placeholder="Cari produk, SKU..."
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
        </View>

        {/* Filter Chips */}
        <View style={styles.filterContainer}>
          <View style={styles.filterChipsRow}>
            {[
              { key: 'all', label: 'Semua', icon: 'checkbox-multiple-blank-outline', color: '#3b82f6' },
              { key: 'in', label: 'IN', icon: 'package-down', color: '#16a34a' },
              { key: 'out', label: 'OUT', icon: 'package-up', color: '#ef4444' },
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
          
          {/* Result Count */}
          <View style={styles.productCount}>
            <Text style={styles.productCountText}>
              Terdapat <Text style={styles.productCountNumber}>{filteredLogs.length}</Text> transaksi
            </Text>
          </View>
        </View>
      </View>

      {/* Logs List */}
      {filteredLogs.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="package-variant-closed" size={64} color="#d1d5db" />
          <Text style={styles.emptyStateText}>Tidak ada riwayat</Text>
          <Text style={styles.emptyStateSubtext}>
            {searchQuery ? 'Coba kata kunci lain' : 'Belum ada transaksi'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredLogs}
          renderItem={renderLogCard}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          contentContainerStyle={[styles.listContent, { paddingBottom: 120 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },

  // Header - Same style as Products
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

  // List Content
  listContent: {
    padding: 12,
    gap: 8,
  },

  // Log Card - Compact & Efficient
  logCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconCol: {
    alignItems: 'center',
    gap: 4,
    width: 40,
  },
  logIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  infoCol: {
    flex: 1,
    gap: 3,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 18,
  },
  skuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  skuBadge: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  userName: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '500',
  },
  notesText: {
    fontSize: 11,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 1,
  },
  timeCol: {
    alignItems: 'flex-end',
    gap: 2,
    width: 68,
  },
  timeText: {
    fontSize: 12,
    color: '#111827',
    fontWeight: '700',
  },
  dateText: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
});