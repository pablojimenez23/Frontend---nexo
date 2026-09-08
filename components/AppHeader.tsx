import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useCart } from '@/context/CartContext';
import { apiUsers } from '@/services/api';
import { haySesionActiva } from '@/hooks/useAuth';

export function AppHeader() {
  const { items } = useCart();
  const [noLeidas, setNoLeidas] = useState(0);
  const [direccionCorta, setDireccionCorta] = useState<string | null>(null);

  const cantidadCarrito = items.reduce((acc, i) => acc + i.cantidad, 0);

  useEffect(() => {
    const consultar = () => {
      haySesionActiva().then((logueado) => {
        if (!logueado) {
          setNoLeidas(0);
          return;
        }
        apiUsers.get('/notificaciones/no-leidas')
          .then((res) => setNoLeidas(res.data.cantidad))
          .catch(() => {});
      });
    };
    consultar();
    const intervalo = setInterval(consultar, 15000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    const consultarDireccion = () => {
      haySesionActiva().then((logueado) => {
        if (!logueado) {
          setDireccionCorta(null);
          return;
        }
        apiUsers.get('/direcciones')
          .then((res) => {
            const primera = res.data[0];
            if (primera?.calle) {
              const texto = primera.calle.length > 22
                ? primera.calle.slice(0, 22) + '…'
                : primera.calle;
              setDireccionCorta(texto);
            } else {
              setDireccionCorta(null);
            }
          })
          .catch(() => {});
      });
    };
    consultarDireccion();
    const intervalo = setInterval(consultarDireccion, 5000);
    return () => clearInterval(intervalo);
  }, []);

  const handlePresionarCarrito = () => {
    router.push('/carrito' as any);
  };

  const handlePresionarNotificaciones = () => {
    router.push('/notificaciones' as any);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.left}>
          <View style={styles.logoWrapper}>
            <Image source={require('@/assets/images/logonexo.jpg')} style={styles.logo} />
          </View>
          <View>
            <Text style={styles.saludo}>Entregar en</Text>
            <Text style={styles.marca} numberOfLines={1}>
              {direccionCorta ?? 'NEXO'}
            </Text>
          </View>
        </View>

        <View style={styles.right}>
          <TouchableOpacity style={styles.icono} onPress={handlePresionarCarrito}>
            <Ionicons name="cart-outline" size={20} color="#1d1d1d" />
            {cantidadCarrito > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeTexto}>{cantidadCarrito}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.icono} onPress={handlePresionarNotificaciones}>
            <Ionicons name="notifications-outline" size={20} color="#1d1d1d" />
            {noLeidas > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeTexto}>{noLeidas}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#c1121f' },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#c1121f',
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  logoWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  logo: { width: '100%', height: '100%' },
  saludo: { fontSize: 11, color: 'rgba(255,255,255,0.75)' },
  marca: { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: 0.3, maxWidth: 180 },
  right: { flexDirection: 'row', gap: 10 },
  icono: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4,
    elevation: 3,
  },
  badge: {
    position: 'absolute', top: -3, right: -3,
    backgroundColor: '#1d1d1d', borderRadius: 9, minWidth: 18, height: 18,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: '#c1121f',
  },
  badgeTexto: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
});