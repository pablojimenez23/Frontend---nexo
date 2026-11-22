import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useCart } from '@/context/CartContext';
import { apiUsers } from '@/services/api';
import { haySesionActiva } from '@/hooks/useAuth';
import { alCerrarSesion } from '@/services/sesion';
import { useFuncion } from '@/services/version';

export function AppHeader() {
  const { items } = useCart();
  const [noLeidas, setNoLeidas] = useState(0);
  const [direccionCorta, setDireccionCorta] = useState<string | null>(null);
  const verNotificaciones = useFuncion('notificaciones');

  const cantidadCarrito = items.reduce((acc, i) => acc + i.cantidad, 0);

  // Al cerrar sesión se limpia todo al instante
  useEffect(() => {
    return alCerrarSesion(() => {
      setNoLeidas(0);
      setDireccionCorta(null);
    });
  }, []);

  useEffect(() => {
    let activo = true;

    const consultar = async () => {
      if (!verNotificaciones) {
        setNoLeidas(0);
        return;
      }
      const logueado = await haySesionActiva();
      if (!activo) return;

      if (!logueado) {
        setNoLeidas(0);
        return;
      }

      try {
        const res = await apiUsers.get('/notificaciones/no-leidas');
        // Si mientras tanto se cerró la sesión, se descarta la respuesta
        if (activo && (await haySesionActiva())) {
          setNoLeidas(res.data.cantidad ?? 0);
        } else if (activo) {
          setNoLeidas(0);
        }
      } catch {
        // Sin sesión válida o sin conexión: no se muestra un número viejo
        if (activo) setNoLeidas(0);
      }
    };

    consultar();
    const intervalo = setInterval(consultar, 15000);
    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, [verNotificaciones]);

  useEffect(() => {
    let activo = true;

    const consultarDireccion = async () => {
      const logueado = await haySesionActiva();
      if (!activo) return;

      if (!logueado) {
        setDireccionCorta(null);
        return;
      }

      try {
        const res = await apiUsers.get('/direcciones');
        if (!activo) return;
        const primera = res.data[0];
        if (primera?.calle) {
          const texto = primera.calle.length > 22
            ? primera.calle.slice(0, 22) + '…'
            : primera.calle;
          setDireccionCorta(texto);
        } else {
          setDireccionCorta(null);
        }
      } catch {
        if (activo) setDireccionCorta(null);
      }
    };

    consultarDireccion();
    const intervalo = setInterval(consultarDireccion, 5000);
    return () => {
      activo = false;
      clearInterval(intervalo);
    };
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

          {verNotificaciones && (
            <TouchableOpacity style={styles.icono} onPress={handlePresionarNotificaciones}>
              <Ionicons name="notifications-outline" size={20} color="#1d1d1d" />
              {noLeidas > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeTexto}>{noLeidas}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

export default AppHeader;

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
    width: 18, height: 18, borderRadius: 999,
    backgroundColor: '#1d1d1d',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#c1121f',
    overflow: 'hidden',
  },
  badgeTexto: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
});