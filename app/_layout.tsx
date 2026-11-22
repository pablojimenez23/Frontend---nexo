import { Stack } from 'expo-router';
import { CartProvider } from '@/context/CartContext';
import { VersionProvider } from '@/services/version';

export default function RootLayout() {
  return (
    <VersionProvider>
      <CartProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </CartProvider>
    </VersionProvider>
  );
}
