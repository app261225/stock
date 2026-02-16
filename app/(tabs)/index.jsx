import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Animated, Dimensions, Alert } from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSession } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import productService from '../../services/productService';
import stockLogService from '../../services/stockLogService';
import EventBus from '../../lib/EventBus';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 16px padding + 16px gap

export default function DashboardScreen() {
  const { session } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({
    total: 0,
    lowStock: 0,
    outOfStock: 0,
    healthy: 0,
  });
  const [todayStats, setTodayStats] = useState({
    totalIn: 0,
    totalOut: 0,
    transactionCount: 0,
    countIn: 0,
    countOut: 0,
  });
  const [allTimeStats, setAllTimeStats] = useState({
    totalIn: 0,
    totalOut: 0,
    countIn: 0,
    countOut: 0,
  });
  const [stockValue, setStockValue] = useState({
    total_modal: 0,
    total_harga_jual: 0,
    potential_profit: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    loadDashboardData();

    // Subscribe to stock_action event untuk update otomatis
    const unsubscribeStockAction = EventBus.on('stock_action', (data) => {
      console.log('[Dashboard] Received stock_action event:', data);
      
      // Update today stats
      setTodayStats(prevStats => ({
        ...prevStats,
        transactionCount: prevStats.transactionCount + 1,
        totalIn: data.type === 'IN' ? prevStats.totalIn + data.quantity : prevStats.totalIn,
        totalOut: data.type === 'OUT' ? prevStats.totalOut + data.quantity : prevStats.totalOut,
        countIn: data.type === 'IN' ? prevStats.countIn + 1 : prevStats.countIn,
        countOut: data.type === 'OUT' ? prevStats.countOut + 1 : prevStats.countOut,
      }));

      // Update all-time stats
      setAllTimeStats(prevStats => ({
        ...prevStats,
        totalIn: data.type === 'IN' ? prevStats.totalIn + data.quantity : prevStats.totalIn,
        totalOut: data.type === 'OUT' ? prevStats.totalOut + data.quantity : prevStats.totalOut,
        countIn: data.type === 'IN' ? prevStats.countIn + 1 : prevStats.countIn,
        countOut: data.type === 'OUT' ? prevStats.countOut + 1 : prevStats.countOut,
        lastIn: data.type === 'IN' ? data.created_at : prevStats.lastIn,
        lastOut: data.type === 'OUT' ? data.created_at : prevStats.lastOut,
      }));

      // Update stock value jika perlu (kurang akurat dari Supabase, tapi cukup untuk UI)
      setStockValue(prevValue => ({
        ...prevValue,
        // Bisa di-update lebih akurat dengan refetch, tapi untuk sekarang skip
      }));

      // Update stats untuk Out of Stock / Low Stock
      setStats(prevStats => {
        let newStats = { ...prevStats };
        if (data.stock_after === 0) {
          // Jadi out of stock
          if (data.stock_before > 0) {
            newStats.outOfStock = (newStats.outOfStock || 0) + 1;
            newStats.healthy = Math.max(0, (newStats.healthy || 0) - 1);
          }
        } else if (data.stock_before === 0 && data.stock_after > 0) {
          // Dari out of stock jadi ada stock
          newStats.outOfStock = Math.max(0, (newStats.outOfStock || 0) - 1);
          newStats.healthy = (newStats.healthy || 0) + 1;
        }
        return newStats;
      });
    });

    // Subscribe to product_changed event untuk update saat add/edit/delete produk
    const unsubscribeProductChanged = EventBus.on('product_changed', (data) => {
      console.log('[Dashboard] Received product_changed event:', data);
      
      // Update stats berdasarkan action
      if (data.action === 'add') {
        setStats(prevStats => ({
          ...prevStats,
          total: prevStats.total + 1,
          // Classify based on initial stock
          outOfStock: data.product.stock === 0 ? prevStats.outOfStock + 1 : prevStats.outOfStock,
          lowStock: data.product.stock > 0 && data.product.stock <= data.product.min_stock ? prevStats.lowStock + 1 : prevStats.lowStock,
          healthy: data.product.stock > data.product.min_stock ? prevStats.healthy + 1 : prevStats.healthy,
        }));
      } else if (data.action === 'delete') {
        setStats(prevStats => ({
          ...prevStats,
          total: Math.max(0, prevStats.total - 1),
        }));
      }
      
      // Refresh stock value for add/edit/delete
      productService.getStockValue().then(value => {
        setStockValue(value);
      }).catch(err => console.error('[Dashboard] Error updating stock value:', err));
    });

    // Subscribe to force_refresh event dari profile screen
    const unsubscribeForceRefresh = EventBus.on('force_refresh', (data) => {
      console.log('[Dashboard] Received force_refresh event:', data);
      loadDashboardData();
    });

    return () => {
      unsubscribeStockAction();
      unsubscribeProductChanged();
      unsubscribeForceRefresh();
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      // Trigger animations when data loaded
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel (use summaries that include counts)
      const [stockStats, todaySummary, valueData, allTimeSummary] = await Promise.all([
        productService.getStockStats(),
        stockLogService.getTodaySummary(),
        productService.getStockValue(),
        stockLogService.getAllTimeSummary(),
      ]);

      setStats(stockStats);
      console.log('[Dashboard] todaySummary:', todaySummary);
      console.log('[Dashboard] allTimeSummary:', allTimeSummary);
      setTodayStats({
        totalIn: todaySummary.total_in,
        totalOut: todaySummary.total_out,
        transactionCount: (todaySummary.count_in || 0) + (todaySummary.count_out || 0),
        countIn: todaySummary.count_in || 0,
        countOut: todaySummary.count_out || 0,
      });
      setStockValue(valueData);
      setAllTimeStats({
        totalIn: allTimeSummary.total_in || 0,
        totalOut: allTimeSummary.total_out || 0,
        countIn: allTimeSummary.count_in || 0,
        countOut: allTimeSummary.count_out || 0,
        lastIn: allTimeSummary.last_in || null,
        lastOut: allTimeSummary.last_out || null,
      });
    } catch (error) {
      console.error('[Dashboard] Load error:', error);
      Alert.alert('Error', 'Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatStamp = (iso) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      const day = d.getDate();
      const month = d.toLocaleDateString('id-ID', { month: 'short' });
      const year = d.getFullYear();
      const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
      return `${time} • ${day} ${month} ${year}`;
    } catch (e) {
      return iso;
    }
  };

  const getStockPercentage = (current, total) => {
    return total > 0 ? (current / total) * 100 : 0;
  };

  const showInformation = () => {
    Alert.alert(
      'ℹ️ Informasi Dashboard',
      'Selamat datang di Dashboard Inventory Management!\n\n' +
      '📦 Status Stok:\n' +
      '• Total: Semua produk dalam sistem\n' +
      '• Aman: Stok mencukupi\n' +
      '• Menipis: Stok mendekati batas minimum\n' +
      '• Habis: Stok kosong\n\n' +
      '📊 Aktivitas:\n' +
      '• IN: Barang masuk\n' +
      '• OUT: Barang keluar\n' +
      '• Angka menunjukkan total quantity\n' +
      '• Simbol × menunjukkan jumlah transaksi\n\n' +
      '💡 Tips: Tap pada setiap card untuk melihat detail lebih lanjut!',
      [{ text: 'Tutup', style: 'cancel' }],
      { cancelable: true }
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Memuat dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 120 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome Section moved to Profile Page */}

      {/* Quick Action Buttons - hidden temporarily */}
      {/*
      <Animated.View 
        style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            marginTop: 6
          }
        ]}
      >
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickActionBtn} activeOpacity={0.7}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#e0e7ff' }]}>
              <MaterialCommunityIcons name="file-document" size={24} color="#4f46e5" />
            </View>
            <Text style={styles.quickActionLabel}>Laporan</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionBtn} activeOpacity={0.7}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#fef3c7' }]}>
              <MaterialCommunityIcons name="chart-line" size={24} color="#f59e0b" />
            </View>
            <Text style={styles.quickActionLabel}>Analisis</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionBtn} activeOpacity={0.7}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#fce7f3' }]}>
              <MaterialCommunityIcons name="cog" size={24} color="#ec4899" />
            </View>
            <Text style={styles.quickActionLabel}>Pengaturan</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionBtn} activeOpacity={0.7}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#f0fdf4' }]}>
              <MaterialCommunityIcons name="history" size={24} color="#16a34a" />
            </View>
            <Text style={styles.quickActionLabel}>Riwayat</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
      */}

      {/* Stock Status & Activity Cards - Compact */}
      <Animated.View 
        style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            marginTop: 6
          }
        ]}
      >
        {/* Status Stok - Inline 4 Cards */}
        <View style={styles.statusInlineContainer}>
          {/* Total */}
          <TouchableOpacity 
            style={[styles.statusInlineCard, { borderTopColor: '#2563eb' }]} 
            onPress={() => router.push({ pathname: 'products', params: { filter: 'all' } })} 
            activeOpacity={0.7}
          >
            <View style={[styles.statusInlineIconWrapper, { backgroundColor: '#dbeafe' }]}>
              <MaterialCommunityIcons name="package-variant" size={22} color="#2563eb" />
            </View>
            <Text style={styles.statusInlineNumber}>{stats.total}</Text>
            <Text style={styles.statusInlineLabel}>Total</Text>
          </TouchableOpacity>

          {/* Aman */}
          <TouchableOpacity 
            style={[styles.statusInlineCard, { borderTopColor: '#16a34a' }]} 
            onPress={() => router.push({ pathname: 'products', params: { filter: 'aman' } })} 
            activeOpacity={0.7}
          >
            <View style={[styles.statusInlineIconWrapper, { backgroundColor: '#dcfce7' }]}>
              <MaterialCommunityIcons name="check-circle" size={22} color="#16a34a" />
            </View>
            <Text style={styles.statusInlineNumber}>{stats.healthy}</Text>
            <Text style={styles.statusInlineLabel}>Aman</Text>
          </TouchableOpacity>

          {/* Menipis */}
          <TouchableOpacity 
            style={[styles.statusInlineCard, { borderTopColor: '#f59e0b' }]} 
            onPress={() => router.push({ pathname: 'products', params: { filter: 'menipis' } })} 
            activeOpacity={0.7}
          >
            <View style={[styles.statusInlineIconWrapper, { backgroundColor: '#fef3c7' }]}>
              <MaterialCommunityIcons name="alert" size={22} color="#f59e0b" />
            </View>
            <Text style={styles.statusInlineNumber}>{stats.lowStock}</Text>
            <Text style={styles.statusInlineLabel}>Menipis</Text>
          </TouchableOpacity>

          {/* Habis */}
          <TouchableOpacity 
            style={[styles.statusInlineCard, { borderTopColor: '#ef4444' }]} 
            onPress={() => router.push({ pathname: 'products', params: { filter: 'habis' } })} 
            activeOpacity={0.7}
          >
            <View style={[styles.statusInlineIconWrapper, { backgroundColor: '#fee2e2' }]}>
              <MaterialCommunityIcons name="close-circle" size={22} color="#ef4444" />
            </View>
            <Text style={styles.statusInlineNumber}>{stats.outOfStock}</Text>
            <Text style={styles.statusInlineLabel}>Habis</Text>
          </TouchableOpacity>
        </View>

        {/* Information Button */}
        <TouchableOpacity 
          style={styles.infoButton} 
          onPress={showInformation}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="information-outline" size={20} color="#2563eb" />
          <Text style={styles.infoButtonText}>Informasi Dashboard</Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#9ca3af" />
        </TouchableOpacity>

        {/* Activity Cards - Enhanced Design */}
        <View style={[styles.stockStatusGrid, { marginTop: 0 }]}>
          {/* IN Today (click -> Log filter IN) */}
          <TouchableOpacity style={[styles.compactStatBox, styles.activityCard]} onPress={() => router.push({ pathname: '/(tabs)/log', params: { filter: 'in' } })} activeOpacity={0.7}>
            <View style={styles.compactStatHeader}>
              <View style={[styles.compactStatIcon, { backgroundColor: '#dcfce7' }]}>
                <MaterialCommunityIcons name="package-down" size={22} color="#16a34a" />
              </View>
              <View style={styles.compactStatContent}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.compactStatNumber}>{todayStats.totalIn}</Text>
                  <Text style={styles.compactStatCount}>× {todayStats.countIn}</Text>
                </View>
                <Text style={styles.compactStatLabel}>IN (Hari ini)</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* OUT Today (click -> Log filter OUT) */}
          <TouchableOpacity style={[styles.compactStatBox, styles.activityCard]} onPress={() => router.push({ pathname: '/(tabs)/log', params: { filter: 'out' } })} activeOpacity={0.7}>
            <View style={styles.compactStatHeader}>
              <View style={[styles.compactStatIcon, { backgroundColor: '#fee2e2' }]}>
                <MaterialCommunityIcons name="package-up" size={22} color="#ef4444" />
              </View>
              <View style={styles.compactStatContent}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.compactStatNumber}>{todayStats.totalOut}</Text>
                  <Text style={styles.compactStatCount}>× {todayStats.countOut}</Text>
                </View>
                <Text style={styles.compactStatLabel}>OUT (Hari ini)</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Total IN (click -> Log filter IN) */}
          <TouchableOpacity style={[styles.compactStatBox, styles.activityCard]} onPress={() => router.push({ pathname: '/(tabs)/log', params: { filter: 'in' } })} activeOpacity={0.7}>
            <View style={styles.compactStatHeader}>
              <View style={[styles.compactStatIcon, { backgroundColor: '#e0e7ff' }]}>
                <MaterialCommunityIcons name="plus" size={22} color="#4f46e5" />
              </View>
              <View style={styles.compactStatContent}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.compactStatNumber}>{allTimeStats.totalIn}</Text>
                  <Text style={styles.compactStatCount}>× {allTimeStats.countIn}</Text>
                </View>
                <Text style={styles.compactStatLabel}>Total IN</Text>
              </View>
            </View>
            <Text style={styles.compactStatStampFull}>Last: {formatStamp(allTimeStats.lastIn)}</Text>
          </TouchableOpacity>

          {/* Total OUT (click -> Log filter OUT) */}
          <TouchableOpacity style={[styles.compactStatBox, styles.activityCard]} onPress={() => router.push({ pathname: '/(tabs)/log', params: { filter: 'out' } })} activeOpacity={0.7}>
            <View style={styles.compactStatHeader}>
              <View style={[styles.compactStatIcon, { backgroundColor: '#fce7f3' }]}>
                <MaterialCommunityIcons name="minus" size={22} color="#ec4899" />
              </View>
              <View style={styles.compactStatContent}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.compactStatNumber}>{allTimeStats.totalOut}</Text>
                  <Text style={styles.compactStatCount}>× {allTimeStats.countOut}</Text>
                </View>
                <Text style={styles.compactStatLabel}>Total OUT</Text>
              </View>
            </View>
            <Text style={styles.compactStatStampFull}>Last: {formatStamp(allTimeStats.lastOut)}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>


      {/* Bottom Spacing */}
      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa' 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#f9fafb'
  },
  loadingText: { 
    marginTop: 12, 
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500'
  },

  // Welcome Section
  welcomeSection: {
    marginBottom: 8,
    overflow: 'hidden',
  },
  welcomeGradient: {
    padding: 14,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#2563eb', // Solid blue background instead of gradient
  },
  welcomeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: { 
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  userName: { 
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  roleBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleText: { 
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Quick Actions
  quickActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.005,
    shadowRadius: 1,
    elevation: 0.5,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },

  // Section
  section: { 
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  
  // Status Inline - Modern 4 Cards in 1 Row
  statusInlineContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statusInlineCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderTopWidth: 3,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.005,
    shadowRadius: 1,
    elevation: 0.5,
  },
  statusInlineIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusInlineNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  statusInlineLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Information Button
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.005,
    shadowRadius: 1,
    elevation: 0.5,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    marginLeft: 8,
  },
  
  // Stock Status Grid - Compact Style with Dynamic Height
  stockStatusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  compactStatBox: {
    minWidth: 140,
    minHeight: 70,
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activityCard: {
  },
  compactStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactStatIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  compactStatContent: {
    flex: 1,
  },
  compactStatNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 24,
    letterSpacing: -0.5,
  },
  compactStatCount: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '600',
  },
  compactStatLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    marginTop: 3,
    letterSpacing: 0.3,
  },
  compactStatStamp: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
  compactStatStampFull: {
    fontSize: 9,
    color: '#9ca3af',
    marginTop: 10,
    fontWeight: '500',
  },

  // Quick Action Buttons
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  quickActionBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
});