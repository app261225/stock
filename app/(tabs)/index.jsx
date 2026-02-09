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
      
      // Load stock stats
      const stockStats = await productService.getStockStats();
      setStats(stockStats);

      // Load today's transaction stats
      const todayStatsData = await stockLogService.getTodayStats();
      setTodayStats(todayStatsData);

      // Load recent logs
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
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#dbeafe' }]}>
            <View style={styles.statIconContainer}>
              <MaterialCommunityIcons name="package-variant" size={24} color="#2563eb" />
            </View>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Products</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#dcfce7' }]}>
            <View style={styles.statIconContainer}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#16a34a" />
            </View>
            <Text style={styles.statValue}>{stats.healthy}</Text>
            <Text style={styles.statLabel}>Healthy Stock</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#fef3c7' }]}>
            <View style={styles.statIconContainer}>
              <MaterialCommunityIcons name="alert" size={24} color="#f59e0b" />
            </View>
            <Text style={styles.statValue}>{stats.lowStock}</Text>
            <Text style={styles.statLabel}>Low Stock</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#fee2e2' }]}>
            <View style={styles.statIconContainer}>
              <MaterialCommunityIcons name="close-circle" size={24} color="#ef4444" />
            </View>
            <Text style={styles.statValue}>{stats.outOfStock}</Text>
            <Text style={styles.statLabel}>Out of Stock</Text>
          </View>
        </View>
      </View>

      {/* Today's Activity */}
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

          <View style={styles.activityCard}>
            <View style={[styles.activityIcon, { backgroundColor: '#dbeafe' }]}>
              <MaterialCommunityIcons name="swap-horizontal" size={24} color="#2563eb" />
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityValue}>{todayStats.transactionCount}</Text>
              <Text style={styles.activityLabel}>Transactions</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity onPress={() => global.openActivityModal?.()}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {recentLogs.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="inbox" size={48} color="#9ca3af" />
            <Text style={styles.emptyStateText}>No recent activity</Text>
          </View>
        ) : (
          <View style={styles.logsList}>
            {recentLogs.map((log) => (
              <View key={log.id} style={styles.logItem}>
                <View style={[
                  styles.logIcon,
                  { backgroundColor: log.type === 'IN' ? '#dcfce7' : '#fee2e2' }
                ]}>
                  <MaterialCommunityIcons 
                    name={log.type === 'IN' ? 'package-down' : 'package-up'} 
                    size={20} 
                    color={log.type === 'IN' ? '#16a34a' : '#ef4444'}
                  />
                </View>
                <View style={styles.logContent}>
                  <Text style={styles.logProduct}>
                    {log.product?.nama_produk || 'Unknown Product'}
                  </Text>
                  <Text style={styles.logDetail}>
                    {log.type === 'IN' ? 'Stock IN' : 'Stock OUT'} • {log.quantity} units
                  </Text>
                </View>
                <Text style={styles.logTime}>{formatTime(log.created_at)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
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
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 14,
    color: '#6b7280',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8b5cf6',
    textTransform: 'capitalize',
  },
  section: {
    padding: 16,
    backgroundColor: '#ffffff',
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '46%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  activityContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  activityCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
  },
  activityValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  activityLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  logsList: {
    gap: 12,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  logIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logContent: {
    flex: 1,
  },
  logProduct: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  logDetail: {
    fontSize: 12,
    color: '#6b7280',
  },
  logTime: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
});