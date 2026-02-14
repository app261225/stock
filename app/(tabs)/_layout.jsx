import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, Alert, View, TouchableOpacity, Text } from 'react-native';
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
    <>
      <Tabs
        screenOptions={({ route }) => ({
          tabBarActiveTintColor: '#2563eb',
          tabBarInactiveTintColor: '#9ca3af',
          headerShown: true,
          // Modern Light Header (no neon)
          headerStyle: {
            backgroundColor: '#ffffff',
            borderBottomWidth: 1,
            borderBottomColor: '#eef2f7',
            elevation: 1,
            shadowColor: '#000',
            shadowOpacity: 0.02,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
          },
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: '700',
            color: '#111827',
            letterSpacing: -0.25,
          },
          headerTitleAlign: 'center',
          headerLeftContainerStyle: {
            paddingLeft: 16,
          },
          headerRightContainerStyle: {
            paddingRight: 16,
          },
          headerSafeAreaInsets: { top: 0 },
          contentStyle: {
            backgroundColor: '#f3f4f6',
          },
          headerRight: () => null,
          // Professional Modern Tab Bar
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 0,
            height: 70 + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 0,
            paddingHorizontal: 0,
            elevation: 12,
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: -4 },
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          },
        })}
        tabBar={(props) => {
          return (
            <View style={{
              flexDirection: 'row',
              paddingHorizontal: 0,
              paddingTop: 8,
              paddingBottom: insets.bottom,
              backgroundColor: '#ffffff',
              gap: 0,
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 70 + insets.bottom,
              justifyContent: 'space-around',
              alignItems: 'center',
            }}>
              {props.state.routes.map((route, index) => {
                const { options } = props.descriptors[route.key];
                const isFocused = props.state.index === index;
                const label = options.tabBarLabel || options.title || route.name;
                
                const onPress = () => {
                  const event = props.navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!isFocused && !event.defaultPrevented) {
                    props.navigation.navigate(route.name);
                  }
                };

                const onLongPress = () => {
                  props.navigation.emit({
                    type: 'tabLongPress',
                    target: route.key,
                  });
                };

                return (
                  <TouchableOpacity
                    key={route.key}
                    onPress={onPress}
                    onLongPress={onLongPress}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 0,
                      backgroundColor: 'transparent',
                      borderBottomWidth: isFocused ? 3 : 0,
                      borderBottomColor: isFocused ? '#2563eb' : 'transparent',
                    }}
                    activeOpacity={0.6}
                  >
                    {/* Icon */}
                    {options.tabBarIcon &&
                      options.tabBarIcon({
                        color: isFocused ? '#2563eb' : '#9ca3af',
                        size: 24,
                      })}

                    {/* Label */}
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: isFocused ? '700' : '500',
                        color: isFocused ? '#2563eb' : '#9ca3af',
                        letterSpacing: -0.2,
                      }}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        }}
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
        name="log"
        options={{
          title: 'Riwayat',
          tabBarLabel: 'Log',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="history" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-circle" size={size} color={color} />
          ),
        }}
      />
      </Tabs>
    </>
  );
}