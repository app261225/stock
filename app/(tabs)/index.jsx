import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal, Animated, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSession } from '../../contexts/AuthContext';
import { useState, useEffect, useRef } from 'react';

export default function Dashboard() {
  const { session } = useSession();
  const [refreshing, setRefreshing] = useState(false);
  const [showWelcomeDetails, setShowWelcomeDetails] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const detailsHeight = useRef(new Animated.Value(0)).current;
  
  // Dummy metadata - will be replaced with Supabase real-time data
  const [metadata, setMetadata] = useState({
    last_stock_update: '2026-02-09T14:30:00Z', // TODO: From Supabase stock_logs table
    updated_by: 'Admin User', // TODO: From Supabase users table join
    total_products: 0, // TODO: Count from products table
    total_stock: 0, // TODO: Sum from products table
    low_stock: 0, // TODO: Count where stock <= min_stock
    out_of_stock: 0, // TODO: Count where stock = 0
    stock_in_today: 0, // TODO: Sum from stock_logs where type='IN' AND date=today
    stock_out_today: 0, // TODO: Sum from stock_logs where type='OUT' AND date=today
  });

  // Dummy recent activities - TODO: Replace with Supabase data
  const [recentActivities, setRecentActivities] = useState([
    // Example structure:
    // {
    //   id: '1',
    //   type: 'IN',
    //   product_name: 'Sample Product',
    //   quantity: 10,
    //   created_at: '2026-02-09T14:30:00Z',
    //   created_by: 'Admin User'
    // }
  ]);

  useEffect(() => {
    loadDashboardData();
    
    // Register global function to open modal from header button
    global.openActivityModal = () => setShowActivityModal(true);
    
    return () => {
      delete global.openActivityModal;
    };
  }, []);

  useEffect(() => {
    Animated.timing(detailsHeight, {
      toValue: showWelcomeDetails ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [showWelcomeDetails]);

  const loadDashboardData = async () => {
    // TODO: Fetch from Supabase
    // const { data: products } = await supabase
    //   .from('products')
    //   .select('stock, min_stock');
    // 
    // const { data: lastLog } = await supabase
    //   .from('stock_logs')
    //   .select('created_at, users(full_name)')
    //   .order('created_at', { ascending: false })
    //   .limit(1)
    //   .single();
    // 
    // const { data: activities } = await supabase
    //   .from('stock_logs')
    //   .select('*, products(nama_produk), users(full_name)')
    //   .order('created_at', { ascending: false })
    //   .limit(20);
    //
    // setRecentActivities(activities || []);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString('id-ID', options);
  };

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;
    
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const stats = [
    { 
      icon: 'package-variant', 
      label: 'Total Produk', 
      value: metadata.total_products.toString(), 
      color: '#3b82f6' 
    },
    { 
      icon: 'chart-bar', 
      label: 'Total Stok', 
      value: metadata.total_stock.toString(), 
      color: '#10b981' 
    },
    { 
      icon: 'alert', 
      label: 'Stok Menipis', 
      value: metadata.low_stock.toString(), 
      color: '#f59e0b' 
    },
    { 
      icon: 'close-circle', 
      label: 'Stok Habis', 
      value: metadata.out_of_stock.toString(), 
      color: '#ef4444' 
    },
    { 
      icon: 'package-down', 
      label: 'Masuk Hari Ini', 
      value: metadata.stock_in_today.toString(), 
      color: '#8b5cf6' 
    },
    { 
      icon: 'package-up', 
      label: 'Keluar Hari Ini', 
      value: metadata.stock_out_today.toString(), 
      color: '#ec4899' 
    },
  ];

  const detailsHeightInterpolate = detailsHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 140],
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView 
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Welcome Card - Touchable */}
        <Pressable onPress={() => setShowWelcomeDetails(!showWelcomeDetails)}>
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeHeader}>
              <View style={styles.welcomeLeft}>
                <View style={styles.avatarContainer}>
                  <MaterialCommunityIcons name="account-circle" size={48} color="#2563eb" />
                </View>
                <View style={styles.welcomeInfo}>
                  <Text style={styles.greeting}>{getGreeting()},</Text>
                  <Text style={styles.userName}>{session?.full_name || session?.username || 'User'}</Text>
                </View>
              </View>
              <MaterialCommunityIcons 
                name={showWelcomeDetails ? "chevron-up" : "chevron-down"} 
                size={24} 
                color="#6b7280" 
              />
            </View>
            
            {/* Collapsible Details */}
            <Animated.View style={[styles.detailsContainer, { height: detailsHeightInterpolate, opacity: detailsHeight }]}>
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="login" size={16} color="#6b7280" />
                <Text style={styles.detailLabel}>Last Login:</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {formatDate(session?.last_login)}
                </Text>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="update" size={16} color="#6b7280" />
                <Text style={styles.detailLabel}>Last Update:</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {formatDate(metadata.last_stock_update)}
                </Text>
              </View>
              
              {metadata.updated_by && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="account" size={16} color="#6b7280" />
                    <Text style={styles.detailLabel}>Updated By:</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>{metadata.updated_by}</Text>
                  </View>
                </>
              )}
            </Animated.View>
          </View>
        </Pressable>

        {/* Stats Grid - Horizontal Compact Layout */}
        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <View style={[styles.iconContainer, { backgroundColor: `${stat.color}15` }]}>
                <MaterialCommunityIcons name={stat.icon} size={24} color={stat.color} />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel} numberOfLines={1}>{stat.label}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Spacer for bottom navigation */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Recent Activity Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showActivityModal}
        onRequestClose={() => setShowActivityModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowActivityModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <MaterialCommunityIcons name="history" size={24} color="#111827" />
                <Text style={styles.modalTitle}>Recent Activity</Text>
              </View>
              <TouchableOpacity onPress={() => setShowActivityModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {recentActivities.length === 0 ? (
                <View style={styles.emptyActivity}>
                  <MaterialCommunityIcons name="history" size={64} color="#d1d5db" />
                  <Text style={styles.emptyActivityText}>No recent activity</Text>
                  <Text style={styles.emptyActivitySubtext}>
                    Stock movements will appear here
                  </Text>
                </View>
              ) : (
                recentActivities.map((activity, index) => (
                  <View key={index} style={styles.activityItem}>
                    <View style={[
                      styles.activityIconContainer,
                      { backgroundColor: activity.type === 'IN' ? '#ede9fe' : '#fce7f3' }
                    ]}>
                      <MaterialCommunityIcons 
                        name={activity.type === 'IN' ? 'package-down' : 'package-up'} 
                        size={20} 
                        color={activity.type === 'IN' ? '#8b5cf6' : '#ec4899'} 
                      />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>{activity.product_name}</Text>
                      <Text style={styles.activitySubtitle}>
                        {activity.created_by} • {formatTime(activity.created_at)}
                      </Text>
                    </View>
                    <Text style={[
                      styles.activityQuantity,
                      { color: activity.type === 'IN' ? '#10b981' : '#ef4444' }
                    ]}>
                      {activity.type === 'IN' ? '+' : '-'}{activity.quantity}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  container: {
    flex: 1,
  },
  welcomeCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  welcomeInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 13,
    color: '#6b7280',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 2,
  },
  detailsContainer: {
    overflow: 'hidden',
    marginTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    minWidth: 85,
  },
  detailValue: {
    fontSize: 12,
    color: '#111827',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 6,
  },
  statsContainer: {
    paddingHorizontal: 16,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    lineHeight: 28,
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingTop: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  emptyActivity: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyActivityText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
    fontWeight: '500',
  },
  emptyActivitySubtext: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  activitySubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  activityQuantity: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});