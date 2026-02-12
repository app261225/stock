import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, TouchableOpacity, Alert, View, Modal, Text, FlatList, ActivityIndicator, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '../../contexts/AuthContext';
import { useState, useMemo } from 'react';
import stockLogService from '../../services/stockLogService';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { signOut } = useSession();
  const [recentOpen, setRecentOpen] = useState(false);
  const [recentLogs, setRecentLogs] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const groupedLogs = useMemo(() => {
    // Ensure recentLogs is always an array
    let filtered = Array.isArray(recentLogs) ? recentLogs : [];
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.product?.nama_produk?.toLowerCase().includes(query) ||
        item.user?.name?.toLowerCase().includes(query)
      );
    }

    // Group by date
    const groups = {};
    filtered.forEach(item => {
      const date = new Date(item.created_at);
      const dateKey = date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    });

    // Convert to array format for FlatList
    return Object.entries(groups).map(([date, items]) => ({
      type: 'date',
      date,
      items
    })).flat(1).reduce((acc, item) => {
      if (item.type === 'date') {
        acc.push(item);
      } else {
        if (acc.length > 0 && acc[acc.length - 1].type === 'date') {
          acc[acc.length - 1].items.push(item);
        }
      }
      return acc;
    }, []);
  }, [recentLogs, searchQuery]);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Apakah Anda yakin ingin logout?',
      [
        { 
          text: 'Batal', 
          style: 'cancel' 
        },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: signOut
        },
      ]
    );
  };

  return (
    <>
      <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
        headerShown: true,
        // PERBAIKAN: Konfigurasi header agar konten mepet
        headerStyle: {
          backgroundColor: '#ffffff',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: 'bold',
          color: '#111827',
        },
        headerTitleAlign: 'left',
        headerLeftContainerStyle: {
          paddingLeft: 16,
        },
        headerRightContainerStyle: {
          paddingRight: 0,
        },
        // PENTING: Hilangkan safe area default dari header
        headerSafeAreaInsets: { top: 0 },
        // PENTING: Set background untuk content area
        contentStyle: {
          backgroundColor: '#f3f4f6',
        },
        headerRight: () => {
          // Show recent + logout on all screens
          return (
            <View style={{ flexDirection: 'row', gap: 8, marginRight: 16 }}>
              <TouchableOpacity 
                onPress={async () => {
                  // fetch logs (limit 100) and open modal
                  setRecentLoading(true);
                  setSearchQuery('');
                  try {
                    const result = await stockLogService.getRecent(100);
                    // getRecent returns array directly, not object with logs property
                    setRecentLogs(Array.isArray(result) ? result : []);
                  } catch (e) {
                    console.error('Load recent logs error:', e);
                    setRecentLogs([]);
                  } finally {
                    setRecentLoading(false);
                    setRecentOpen(true);
                  }
                }}
                style={{ 
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: '#ede9fe',
                }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="history" size={22} color="#8b5cf6" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleLogout}
                style={{ 
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: '#fee2e2',
                }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="logout" size={22} color="#ef4444" />
              </TouchableOpacity>
            </View>
          );
        },
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginBottom: Platform.OS === 'android' ? 4 : 0,
        },
        tabBarIconStyle: {
          marginTop: Platform.OS === 'android' ? 4 : 0,
        },
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'List Product',
          tabBarLabel: 'Products',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="package-variant" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add-product"
        options={{
          title: 'Add Product',
          tabBarLabel: 'Add',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="plus-circle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="product-in"
        options={{
          title: 'Product IN',
          tabBarLabel: 'IN',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="package-down" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="product-out"
        options={{
          title: 'Product OUT',
          tabBarLabel: 'OUT',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="package-up" size={size} color={color} />
          ),
        }}
      />
      </Tabs>

      <Modal
        visible={recentOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setRecentOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Recent Activity</Text>
            <TouchableOpacity onPress={() => setRecentOpen(false)} style={{ padding: 8 }}>
              <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={{ padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>
              <MaterialCommunityIcons name="magnify" size={20} color="#6b7280" />
              <TextInput
                placeholder="Cari produk atau user..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, color: '#111827', fontSize: 14 }}
                placeholderTextColor="#9ca3af"
              />
              {searchQuery.trim() !== '' && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <MaterialCommunityIcons name="close-circle" size={18} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>{groupedLogs.reduce((sum, g) => sum + (g.items?.length || 0), 0)} aktivitas ditemukan</Text>
          </View>

          {/* Content */}
          {recentLoading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          ) : (
            <FlatList
              data={groupedLogs}
              keyExtractor={(item, index) => item.date ? `date-${item.date}` : `log-${item.id}-${index}`}
              contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
              renderItem={({ item }) => {
                // Render date header
                if (item.date) {
                  return (
                    <View key={`date-${item.date}`}>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#6b7280', marginTop: item === groupedLogs[0] ? 0 : 16, marginBottom: 12 }}>
                        {item.date}
                      </Text>
                      {item.items && item.items.map((log, idx) => (
                        <View key={`log-${log.id}-${idx}`} style={{ flexDirection: 'row', alignItems: 'flex-start', padding: 12, backgroundColor: '#fff', borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' }}>
                          <View style={{ width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: log.type === 'IN' ? '#dcfce7' : '#fee2e2' }}>
                            <MaterialCommunityIcons name={log.type === 'IN' ? 'package-down' : 'package-up'} size={20} color={log.type === 'IN' ? '#16a34a' : '#ef4444'} />
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={{ fontWeight: '600', color: '#111827' }}>{log.product?.nama_produk || 'Unknown Product'}</Text>
                            <Text style={{ color: '#6b7280', marginTop: 2, fontSize: 13 }}>{log.type === 'IN' ? 'Stock IN' : 'Stock OUT'} • {log.quantity} unit</Text>
                            <Text style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>oleh {log.user?.name || 'Unknown'}</Text>
                          </View>
                          <Text style={{ color: '#9ca3af', fontSize: 12 }}>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        </View>
                      ))}
                    </View>
                  );
                }
                return null;
              }}
              ListEmptyComponent={() => (
                <View style={{ alignItems: 'center', padding: 32 }}>
                  <MaterialCommunityIcons name="inbox" size={48} color="#d1d5db" />
                  <Text style={{ color: '#9ca3af', marginTop: 12, fontSize: 14 }}>
                    {searchQuery.trim() ? 'Tidak ada aktivitas yang cocok' : 'Tidak ada aktivitas'}
                  </Text>
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </>
  );
}