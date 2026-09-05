import { Stack } from 'expo-router';

export default function TiendaLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerBackTitle: 'Atrás' }}>
      <Stack.Screen name="[id]" options={{ title: '' }} />
    </Stack>
  );
}