import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Animated, Dimensions } from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSession } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import productService from '../../services/productService';
import stockLogService from '../../services/stockLogService';

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
  });
  const [allTimeStats, setAllTimeStats] = useState({
    totalIn: 0,
    totalOut: 0,
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
      
      // Load all data in parallel
      const [stockStats, todayStatsData, valueData, allTimeStatsData] = await Promise.all([
        productService.getStockStats(),
        stockLogService.getTodayStats(),
        productService.getStockValue(),
        stockLogService.getAllTimeStats(),
      ]);

      setStats(stockStats);
      setTodayStats(todayStatsData);
      setStockValue(valueData);
      setAllTimeStats(allTimeStatsData);
    } catch (error) {
      console.error('Load dashboard data error:', error);
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

  const getStockPercentage = (current, total) => {
    return total > 0 ? (current / total) * 100 : 0;
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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome Section moved to Profile Page */}

      {/* Quick Action Buttons - 2x2 Grid */}
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
        {/* Status Stok Grid - 2x2 Compact Boxes */}
        <View style={styles.stockStatusGrid}>
          {/* Total */}
          <TouchableOpacity style={styles.compactStatBox} onPress={() => router.push({ pathname: 'products', params: { filter: 'all' } })} activeOpacity={0.7}>
            <View style={[styles.compactStatIcon, { backgroundColor: '#dbeafe' }]}>
              <MaterialCommunityIcons name="package-variant" size={20} color="#2563eb" />
            </View>
            <View style={styles.compactStatContent}>
              <Text style={styles.compactStatNumber}>{stats.total}</Text>
              <Text style={styles.compactStatLabel}>Total</Text>
            </View>
          </TouchableOpacity>

          {/* Aman */}
          <TouchableOpacity style={styles.compactStatBox} onPress={() => router.push({ pathname: 'products', params: { filter: 'aman' } })} activeOpacity={0.7}>
            <View style={[styles.compactStatIcon, { backgroundColor: '#dcfce7' }]}>
              <MaterialCommunityIcons name="check-circle" size={20} color="#16a34a" />
            </View>
            <View style={styles.compactStatContent}>
              <Text style={styles.compactStatNumber}>{stats.healthy}</Text>
              <Text style={styles.compactStatLabel}>Aman</Text>
            </View>
          </TouchableOpacity>

          {/* Menipis */}
          <TouchableOpacity style={styles.compactStatBox} onPress={() => router.push({ pathname: 'products', params: { filter: 'menipis' } })} activeOpacity={0.7}>
            <View style={[styles.compactStatIcon, { backgroundColor: '#fef3c7' }]}>
              <MaterialCommunityIcons name="alert" size={20} color="#f59e0b" />
            </View>
            <View style={styles.compactStatContent}>
              <Text style={styles.compactStatNumber}>{stats.lowStock}</Text>
              <Text style={styles.compactStatLabel}>Menipis</Text>
            </View>
          </TouchableOpacity>

          {/* Habis */}
          <TouchableOpacity style={styles.compactStatBox} onPress={() => router.push({ pathname: 'products', params: { filter: 'habis' } })} activeOpacity={0.7}>
            <View style={[styles.compactStatIcon, { backgroundColor: '#fee2e2' }]}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#ef4444" />
            </View>
            <View style={styles.compactStatContent}>
              <Text style={styles.compactStatNumber}>{stats.outOfStock}</Text>
              <Text style={styles.compactStatLabel}>Habis</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Activity Today - 2x2 Compact Boxes */}
        <View style={[styles.stockStatusGrid, { marginTop: 12 }]}>
          {/* IN Today */}
          <View style={styles.compactStatBox}>
            <View style={[styles.compactStatIcon, { backgroundColor: '#dcfce7' }]}>
              <MaterialCommunityIcons name="package-down" size={20} color="#16a34a" />
            </View>
            <View style={styles.compactStatContent}>
              <Text style={styles.compactStatNumber}>{todayStats.totalIn}</Text>
              <Text style={styles.compactStatLabel}>IN (Hari ini)</Text>
            </View>
          </View>

          {/* OUT Today */}
          <View style={styles.compactStatBox}>
            <View style={[styles.compactStatIcon, { backgroundColor: '#fee2e2' }]}>
              <MaterialCommunityIcons name="package-up" size={20} color="#ef4444" />
            </View>
            <View style={styles.compactStatContent}>
              <Text style={styles.compactStatNumber}>{todayStats.totalOut}</Text>
              <Text style={styles.compactStatLabel}>OUT (Hari ini)</Text>
            </View>
          </View>

          {/* Total IN */}
          <View style={styles.compactStatBox}>
            <View style={[styles.compactStatIcon, { backgroundColor: '#e0e7ff' }]}>
              <MaterialCommunityIcons name="plus" size={20} color="#4f46e5" />
            </View>
            <View style={styles.compactStatContent}>
              <Text style={styles.compactStatNumber}>{allTimeStats.totalIn}</Text>
              <Text style={styles.compactStatLabel}>Total IN</Text>
            </View>
          </View>

          {/* Total OUT */}
          <View style={styles.compactStatBox}>
            <View style={[styles.compactStatIcon, { backgroundColor: '#fce7f3' }]}>
              <MaterialCommunityIcons name="minus" size={20} color="#ec4899" />
            </View>
            <View style={styles.compactStatContent}>
              <Text style={styles.compactStatNumber}>{allTimeStats.totalOut}</Text>
              <Text style={styles.compactStatLabel}>Total OUT</Text>
            </View>
          </View>
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
    backgroundColor: '#f9fafb' 
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
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
  // Stock Status Grid - Compact Style
  stockStatusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  compactStatBox: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  compactStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  compactStatContent: {
    flex: 1,
  },
  compactStatNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 22,
  },
  compactStatLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
    marginTop: 2,
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