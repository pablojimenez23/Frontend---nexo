import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { useState, useCallback, useRef } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiOrders } from '@/services/api';
import { haySesionActiva } from '@/hooks/useAuth';

type Pedido = {
  id: string;
  estado: string;
  total: number;
  direccionEnvio: string;
};

const ESTADOS: Record<string, { label: string; color: string; fondo: string; icono: keyof typeof Ionicons.glyphMap }> = {
  CREATED: { label: 'Pendiente', color: '#8a6109', fondo: '#fffaf0', icono: 'time-outline' },
  PAID: { label: 'Pagado', color: '#8a6109', fondo: '#fffaf0', icono: 'card-outline' },
  READY: { label: 'Listo para despacho', color: '#1e6f64', fondo: '#e3f6f4', icono: 'bag-check-outline' },
  DELIVERING: { label: 'En camino', color: '#c1121f', fondo: '#fdf0f1', icono: 'bicycle-outline' },
  DELIVERED: { label: 'Entregado · confirmá recepción', color: '#c1121f', fondo: '#fdf0f1', icono: 'cube-outline' },
  COMPLETED: { label: 'Completado', color: '#1e6f64', fondo: '#e3f6f4', icono: 'checkmark-done-outline' },
  CANCELLED: { label: 'Cancelado', color: '#999', fondo: '#f4f4f4', icono: 'close-circle-outline' },
};

export default function PedidosScreen() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [verificandoSesion, setVerificandoSesion] = useState(true);
  const [necesitaLogin, setNecesitaLogin] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cargarPedidos = useCallback((esSilencioso = false) => {
    if (!esSilencioso) setCargando(true);
    apiOrders.get('/pedidos/mios')
      .then((res) => setPedidos(res.data))
      .finally(() => setCargando(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      let activo = true;

      haySesionActiva().then((logueado) => {
        if (!activo) return;
        setVerificandoSesion(false);

        if (!logueado) {
          setNecesitaLogin(true);
          return;
        }

        setNecesitaLogin(false);
        cargarPedidos();
        intervalRef.current = setInterval(() => cargarPedidos(true), 15000);
      });

      return () => {
        activo = false;
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [cargarPedidos])
  );

  if (verificandoSesion) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#c1121f" />
      </View>
    );
  }

  if (necesitaLogin) {
    return (
      <View style={styles.center}>
        <View style={styles.figuraCirculoGrande} />
        <View style={styles.figuraCirculoChico} />
        <View style={styles.figuraCuadrado} />
        <Ionicons name="receipt-outline" size={40} color="#c9a3a3" style={{ marginBottom: 10 }} />
        <Text style={styles.mensajeVacio}>Necesitás una cuenta para ver tus pedidos</Text>
        <Text style={styles.mensajeVacioSub}>Iniciá sesión para ver tu historial</Text>
        <TouchableOpacity
          style={styles.botonLoginRequerido}
          onPress={() => router.push('/login' as any)}
        >
          <Text style={styles.botonLoginRequeridoTexto}>Iniciar sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#c1121f" />
      </View>
    );
  }

  if (pedidos.length === 0) {
    return (
      <View style={styles.center}>
        <View style={styles.figuraCirculoGrande} />
        <View style={styles.figuraCirculoChico} />
        <View style={styles.figuraCuadrado} />
        <Image
          source={require('@/assets/images/logopedidos.png')}
          style={styles.imagenVacio}
          resizeMode="contain"
        />
        <Text style={styles.mensajeVacio}>Cachai que no has pedido ni una</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#faf8f6' }}>
      <View style={styles.figuraCirculoGrande} />
      <View style={styles.figuraCirculoChico} />
      <View style={styles.figuraCuadrado} />

      <FlatList
        data={pedidos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.contador}>
            {pedidos.length} {pedidos.length === 1 ? 'pedido' : 'pedidos'}
          </Text>
        }
        renderItem={({ item }) => {
          const info = ESTADOS[item.estado] ?? { label: item.estado, color: '#666', fondo: '#f4f4f4', icono: 'ellipse-outline' as const };
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/pedido/[id]', params: { id: item.id } })}
            >
              <View style={[styles.iconoWrapper, { backgroundColor: info.fondo }]}>
                <Ionicons name={info.icono} size={22} color={info.color} />
              </View>

              <View style={{ flex: 1 }}>
                <View style={[styles.badgeEstado, { backgroundColor: info.fondo }]}>
                  <View style={[styles.puntoEstado, { backgroundColor: info.color }]} />
                  <Text style={[styles.badgeEstadoTexto, { color: info.color }]}>{info.label}</Text>
                </View>
                <Text style={styles.direccion} numberOfLines={1}>{item.direccionEnvio}</Text>
                <Text style={styles.total}>${item.total.toLocaleString('es-CL')}</Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color="#c9a3a3" />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24,
    backgroundColor: '#faf8f6', overflow: 'hidden',
  },
  mensajeVacio: { fontSize: 16, fontWeight: '700', marginTop: 16, textAlign: 'center' },
  mensajeVacioSub: { fontSize: 13, color: '#999', textAlign: 'center', marginTop: 6 },
  botonLoginRequerido: {
    backgroundColor: '#c1121f', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32,
    marginTop: 20,
  },
  botonLoginRequeridoTexto: { color: '#fff', fontWeight: '800', fontSize: 15 },
  imagenVacio: { width: 140, height: 140 },

  figuraCirculoGrande: {
    position: 'absolute', top: -40, left: -60, width: 170, height: 170,
    borderRadius: 85, backgroundColor: 'rgba(230,57,70,0.04)',
  },
  figuraCirculoChico: {
    position: 'absolute', bottom: 120, right: -30, width: 90, height: 90,
    borderRadius: 45, backgroundColor: 'rgba(230,57,70,0.06)',
  },
  figuraCuadrado: {
    position: 'absolute', top: 220, right: 20, width: 45, height: 45,
    borderRadius: 12, backgroundColor: 'rgba(230,57,70,0.04)', transform: [{ rotate: '-15deg' }],
  },

  contador: { fontSize: 12, color: '#999', marginBottom: 10, marginLeft: 2 },
  list: { padding: 16, paddingTop: 14, flexGrow: 1 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8,
    elevation: 3,
  },
  iconoWrapper: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },

  badgeEstado: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10,
    marginBottom: 6,
  },
  puntoEstado: { width: 5, height: 5, borderRadius: 3 },
  badgeEstadoTexto: { fontSize: 11, fontWeight: '800' },

  direccion: { fontSize: 13.5, color: '#333', marginBottom: 4 },
  total: { fontSize: 16, fontWeight: '800', color: '#1d1d1d' },
});