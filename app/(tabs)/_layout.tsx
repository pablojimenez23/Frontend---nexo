import { Tabs } from 'expo-router';
import { AppHeader } from '@/components/AppHeader';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#fdf0f1' }}>
      <AppHeader />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#1d1d1d',
          tabBarInactiveTintColor: '#a8a8a8',
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopWidth: 0,
            elevation: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            height: 58 + insets.bottom,
            paddingBottom: 4 + insets.bottom,
            paddingTop: 2,
          },
          tabBarItemStyle: {
            paddingTop: 0,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        }}
      >
        <Tabs.Screen
          name="inicio"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="tiendas"
          options={{
            title: 'Tiendas',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="storefront-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="pedidos"
          options={{
            title: 'Pedidos',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="receipt-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="perfil"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen name="carrito" options={{ href: null }} />
      </Tabs>
    </View>
  );
}