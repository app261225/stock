import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSession } from '../../contexts/AuthContext';
import productService from '../../services/productService';
import stockLogService from '../../services/stockLogService';

export default function DashboardScreen() {
  const { session } = useSession();
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
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const stockStats = await productService.getStockStats();
      setStats(stockStats);

      const todayStatsData = await stockLogService.getTodayStats();
      setTodayStats(todayStatsData);

      const logs = await stockLogService.getAll(5);
      setRecentLogs(logs);
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

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{session?.user?.full_name || session?.user?.username || 'User'}</Text>
        </View>
        <View style={styles.roleBadge}>
          <MaterialCommunityIcons name="shield-account" size={16} color="#8b5cf6" />
          <Text style={styles.roleText}>{session?.user?.role || 'staff'}</Text>
        </View>
      </View>

      {/* Stock Overview Cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stock Overview</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#eff6ff' }]}>
              <MaterialCommunityIcons name="package-variant" size={24} color="#2563eb" />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#dcfce7' }]}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#16a34a" />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>{stats.healthy}</Text>
              <Text style={styles.statLabel}>Aman</Text>
            </View>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#fef3c7' }]}>
              <MaterialCommunityIcons name="alert" size={24} color="#f59e0b" />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>{stats.lowStock}</Text>
              <Text style={styles.statLabel}>Menipis</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#fee2e2' }]}>
              <MaterialCommunityIcons name="close-circle" size={24} color="#ef4444" />
            </View>
            <View style={styles.statInfo}>
              <Text style={styles.statValue}>{stats.outOfStock}</Text>
              <Text style={styles.statLabel}>Habis</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Today Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Activity</Text>
        <View style={styles.activityContainer}>
          <View style={styles.activityCard}>
            <View style={[styles.activityIcon, { backgroundColor: '#dcfce7' }]}>
              <MaterialCommunityIcons name="package-down" size={24} color="#16a34a" />
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityValue}>{todayStats.totalIn}</Text>
              <Text style={styles.activityLabel}>Stock IN</Text>
            </View>
          </View>
          <View style={styles.activityCard}>
            <View style={[styles.activityIcon, { backgroundColor: '#fee2e2' }]}>
              <MaterialCommunityIcons name="package-up" size={24} color="#ef4444" />
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityValue}>{todayStats.totalOut}</Text>
              <Text style={styles.activityLabel}>Stock OUT</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Recent Activity removed - global recent button available in header */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#6b7280' },
  welcomeSection: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', marginBottom: 8 },
  userName: { fontSize: 20, fontWeight: 'bold' },
  welcomeText: { color: '#6b7280' },
  roleBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3e8ff', paddingHorizontal: 12, borderRadius: 20 },
  roleText: { color: '#8b5cf6', fontWeight: '600' },
  section: { padding: 16, backgroundColor: '#fff', marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  statCard: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  statIcon: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  statInfo: { marginLeft: 10 },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { fontSize: 11, color: '#6b7280' },
  activityContainer: { flexDirection: 'row', gap: 12 },
  activityCard: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#f9fafb', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  activityIcon: { width: 40, height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  activityInfo: { marginLeft: 10 },
  activityValue: { fontSize: 18, fontWeight: 'bold' },
  activityLabel: { fontSize: 11, color: '#6b7280' },
  logItem: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#f9fafb', borderRadius: 12, marginBottom: 8 },
  logIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  logContent: { flex: 1, marginLeft: 12 },
  logProduct: { fontWeight: '600' },
  logDetail: { fontSize: 12, color: '#6b7280' },
  logTime: { fontSize: 12, color: '#9ca3af' },
  viewAllText: { color: '#2563eb', fontWeight: 'bold' },
  emptyState: { alignItems: 'center', padding: 20 },
  emptyStateText: { color: '#9ca3af' }
});