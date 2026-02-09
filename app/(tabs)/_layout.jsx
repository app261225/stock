import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, TouchableOpacity, Alert, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '../../contexts/AuthContext';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { signOut } = useSession();

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
          // Only show on Dashboard screen
          if (route.name === 'index') {
            return (
              <View style={{ flexDirection: 'row', gap: 8, marginRight: 16 }}>
                <TouchableOpacity 
                  onPress={() => {
                    // Trigger modal via navigation params
                    global.openActivityModal?.();
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
          }
          
          // For other screens, only show logout
          return (
            <View style={{ flexDirection: 'row', gap: 8, marginRight: 16 }}>
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
  );
}