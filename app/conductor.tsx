import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, ScrollView, TextInput } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { router, useFocusEffect, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiUsers, apiOrders } from '@/services/api';
import { useNoLeidas } from '@/hooks/useNoLeidas';
import { formatearFechaHora, normalizar } from '@/services/pedidos';

type Conductor = {
  id: string;
  estado: string;
};

type Pedido = {
  id: string;
  estado: string;
  total: number;
  direccionEnvio: string;
  creadoEn?: string | null;
};

type Orden = 'antiguos' | 'recientes' | 'monto';

const ORDENES: { clave: Orden; label: string }[] = [
  { clave: 'antiguos', label: 'Más antiguos' },
  { clave: 'recientes', label: 'Más recientes' },
  { clave: 'monto', label: 'Mayor monto' },
];

const tiempoDe = (p: Pedido) => (p.creadoEn ? new Date(p.creadoEn).getTime() : 0);

export default function ConductorScreen() {
  const [conductor, setConductor] = useState<Conductor | null>(null);
  const [pedidoActual, setPedidoActual] = useState<Pedido | null>(null);
  const [disponibles, setDisponibles] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const noLeidas = useNoLeidas();

  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<Orden>('antiguos');

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const resConductor = await apiUsers.get('/conductores/me');
      setConductor(resConductor.data);

      const resEntrega = await apiOrders.get('/pedidos/mi-entrega');
      setPedidoActual(resEntrega.status === 204 ? null : resEntrega.data);

      if (resEntrega.status === 204) {
        const resDisponibles = await apiOrders.get('/pedidos/disponibles');
        setDisponibles(resDisponibles.data);
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [cargarDatos])
  );

  const visibles = useMemo(() => {
    const q = normalizar(busqueda.trim());
    const lista = disponibles.filter((p) => !q || normalizar(p.direccionEnvio).includes(q));
    return [...lista].sort((a, b) => {
      if (orden === 'monto') return b.total - a.total;
      if (orden === 'recientes') return tiempoDe(b) - tiempoDe(a);
      return tiempoDe(a) - tiempoDe(b);
    });
  }, [disponibles, busqueda, orden]);

  const hayFiltros = busqueda.trim() !== '' || orden !== 'antiguos';

  const limpiarFiltros = () => {
    setBusqueda('');
    setOrden('antiguos');
  };

  const cambiarDisponibilidad = async (nuevoEstado: string) => {
    setCambiandoEstado(true);
    try {
      await apiUsers.patch(`/conductores/me/estado?estado=${nuevoEstado}`);
      cargarDatos();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo cambiar tu estado');
    } finally {
      setCambiandoEstado(false);
    }
  };

  const aceptarPedido = async (pedidoId: string) => {
    setProcesandoId(pedidoId);
    try {
      await apiOrders.patch(`/pedidos/${pedidoId}/aceptar`);
      Alert.alert('¡Pedido tomado!', 'Andá a buscarlo a la tienda');
      cargarDatos();
    } catch (err: any) {
      if (err.response?.status === 409) {
        Alert.alert('Ups', 'Ese pedido ya lo tomó otro conductor');
      } else {
        Alert.alert('Error', 'No se pudo aceptar el pedido');
      }
      cargarDatos();
    } finally {
      setProcesandoId(null);
    }
  };

  const marcarEntregado = async () => {
    if (!pedidoActual) return;
    setProcesandoId(pedidoActual.id);
    try {
      await apiOrders.patch(`/pedidos/${pedidoActual.id}/entregado`);
      Alert.alert('¡Entregado!', 'Buen trabajo');
      cargarDatos();
    } catch {
      Alert.alert('Error', 'No se pudo marcar como entregado');
    } finally {
      setProcesandoId(null);
    }
  };

  const headerConfig = (
    <Stack.Screen options={{ headerShown: false }} />
  );

  const CustomHeader = () => (
    <SafeAreaView edges={['top']} style={styles.customHeaderSafeArea}>
      <View style={styles.customHeaderContainer}>
        <View style={styles.customHeaderIzquierda}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 10 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerIconoWrapper}>
            <Ionicons name="bicycle" size={15} color="#fff" />
          </View>
          <Text style={styles.headerTituloTexto}>Modo conductor</Text>
        </View>

        <View style={styles.headerAccionesWrapper}>
          <TouchableOpacity
            onPress={() => router.push('/notificaciones' as any)}
            style={styles.headerIconoCirculo}
          >
            <Ionicons name="notifications-outline" size={18} color="#1d1d1d" />
            {noLeidas > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeTexto}>{noLeidas}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/conductor-actividad' as any)}
            style={styles.headerIconoCirculo}
          >
            <Ionicons name="stats-chart-outline" size={18} color="#1d1d1d" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );

  if (cargando) {
    return (
      <>
        {headerConfig}
        <CustomHeader />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#c1121f" />
        </View>
      </>
    );
  }

  if (!conductor) {
    return (
      <>
        {headerConfig}
        <CustomHeader />
        <View style={styles.center}>
          <Text>No se encontró tu perfil de conductor</Text>
        </View>
      </>
    );
  }

  if (pedidoActual) {
    return (
      <>
        {headerConfig}
        <CustomHeader />
        <View style={styles.pantalla}>
          <View style={styles.figuraCirculoGrande} />
          <View style={styles.figuraCirculoChico} />

          <View style={styles.bannerOcupado}>
            <View style={styles.bannerCirculoDecorativo} />
            <View style={styles.bannerIconoAnillo}>
              <View style={styles.bannerIconoWrapper}>
                <Ionicons name="navigate" size={22} color="#fff" />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTexto}>ENTREGA EN CURSO</Text>
              <Text style={styles.bannerSubtexto}>Andá con cuidado hasta el destino</Text>
            </View>
          </View>

          <View style={styles.contenido}>
            <View style={styles.card}>
              <View style={styles.filaInfo}>
                <View style={styles.filaIconoWrapper}>
                  <Ionicons name="location-outline" size={16} color="#c1121f" />
                </View>
                <Text style={styles.pedidoDireccion}>{pedidoActual.direccionEnvio}</Text>
              </View>
              <Text style={styles.pedidoTotal}>${pedidoActual.total.toLocaleString('es-CL')}</Text>

              <TouchableOpacity
                style={styles.botonEntregar}
                onPress={marcarEntregado}
                disabled={procesandoId === pedidoActual.id}
              >
                {procesandoId === pedidoActual.id ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.botonEntregarTexto}>Marcar como entregado</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      {headerConfig}
      <CustomHeader />
      <View style={styles.pantalla}>
        <View style={styles.figuraCirculoGrande} />
        <View style={styles.figuraCirculoChico} />
        <View style={styles.figuraCuadrado} />

        <View style={styles.controlDisponibilidad}>
          <View style={styles.badgeEstadoActual}>
            <View style={[styles.puntoEstado, { backgroundColor: conductor.estado === 'DISPONIBLE' ? '#2a9d8f' : '#999' }]} />
            <Text style={styles.estadoActual}>Estado: {conductor.estado}</Text>
          </View>

          <View style={styles.botonesEstado}>
            <TouchableOpacity
              style={[styles.chip, conductor.estado === 'DISPONIBLE' && styles.chipActivo]}
              onPress={() => cambiarDisponibilidad('DISPONIBLE')}
              disabled={cambiandoEstado}
            >
              <Ionicons
                name="radio-button-on"
                size={14}
                color={conductor.estado === 'DISPONIBLE' ? '#fff' : '#999'}
              />
              <Text style={[styles.chipTexto, conductor.estado === 'DISPONIBLE' && styles.chipTextoActivo]}>
                Disponible
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chip, conductor.estado === 'INACTIVO' && styles.chipActivo]}
              onPress={() => cambiarDisponibilidad('INACTIVO')}
              disabled={cambiandoEstado}
            >
              <Ionicons
                name="pause-circle-outline"
                size={14}
                color={conductor.estado === 'INACTIVO' ? '#fff' : '#999'}
              />
              <Text style={[styles.chipTexto, conductor.estado === 'INACTIVO' && styles.chipTextoActivo]}>
                Inactivo
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {conductor.estado !== 'DISPONIBLE' ? (
          <View style={styles.centerVacio}>
            <Ionicons name="moon-outline" size={32} color="#c9a3a3" style={{ marginBottom: 10 }} />
            <Text style={styles.mensajeVacio}>Estás fuera de línea</Text>
            <Text style={styles.mensajeVacioSub}>Marcate disponible para ver pedidos.</Text>
          </View>
        ) : disponibles.length === 0 ? (
          <View style={styles.centerVacio}>
            <Ionicons name="bicycle-outline" size={32} color="#c9a3a3" style={{ marginBottom: 10 }} />
            <Text style={styles.mensajeVacio}>Nada por acá</Text>
            <Text style={styles.mensajeVacioSub}>No hay pedidos esperando reparto ahora mismo.</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <View style={styles.buscador}>
              <Ionicons name="search-outline" size={16} color="#999" />
              <TextInput
                style={styles.buscadorInput}
                placeholder="Buscar por dirección"
                placeholderTextColor="#999"
                value={busqueda}
                onChangeText={setBusqueda}
                maxLength={60}
              />
              {busqueda.length > 0 && (
                <TouchableOpacity onPress={() => setBusqueda('')}>
                  <Ionicons name="close-circle" size={16} color="#c9a3a3" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsFila}>
              {ORDENES.map((o) => {
                const activo = orden === o.clave;
                return (
                  <TouchableOpacity
                    key={o.clave}
                    style={[styles.chipFiltro, activo && styles.chipFiltroActivo]}
                    onPress={() => setOrden(o.clave)}
                  >
                    <Text style={[styles.chipFiltroTexto, activo && styles.chipFiltroTextoActivo]}>{o.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <FlatList
              data={visibles}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              ListHeaderComponent={
                <Text style={styles.contador}>
                  {hayFiltros
                    ? `${visibles.length} de ${disponibles.length} pedidos`
                    : `${disponibles.length} ${disponibles.length === 1 ? 'pedido disponible' : 'pedidos disponibles'}`}
                </Text>
              }
              ListEmptyComponent={
                <View style={styles.sinResultados}>
                  <Ionicons name="funnel-outline" size={28} color="#c9a3a3" style={{ marginBottom: 8 }} />
                  <Text style={styles.mensajeVacio}>No hay pedidos con esa búsqueda</Text>
                  <TouchableOpacity style={styles.botonLimpiar} onPress={limpiarFiltros}>
                    <Text style={styles.botonLimpiarTexto}>Limpiar filtros</Text>
                  </TouchableOpacity>
                </View>
              }
              renderItem={({ item }) => {
                const fechaTexto = formatearFechaHora(item.creadoEn);
                return (
                  <View style={styles.card}>
                    <View style={styles.filaInfo}>
                      <View style={styles.filaIconoWrapper}>
                        <Ionicons name="location-outline" size={16} color="#c1121f" />
                      </View>
                      <Text style={styles.pedidoDireccion} numberOfLines={2}>{item.direccionEnvio}</Text>
                    </View>
                    <View style={styles.filaTotalFecha}>
                      <Text style={styles.pedidoTotal}>${item.total.toLocaleString('es-CL')}</Text>
                      {fechaTexto !== '' && <Text style={styles.pedidoFecha}>{fechaTexto}</Text>}
                    </View>

                    <TouchableOpacity
                      style={styles.botonAceptar}
                      onPress={() => aceptarPedido(item.id)}
                      disabled={procesandoId === item.id}
                    >
                      {procesandoId === item.id ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Ionicons name="bicycle" size={16} color="#fff" />
                          <Text style={styles.botonAceptarTexto}>Aceptar pedido</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#faf8f6' },
  pantalla: { flex: 1, backgroundColor: '#faf8f6', overflow: 'hidden' },

  customHeaderSafeArea: { backgroundColor: '#c1121f' },
  customHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#c1121f',
  },
  customHeaderIzquierda: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },

  headerIconoWrapper: {
    width: 26, height: 26, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginRight: 8,
  },
  headerTituloTexto: { color: '#fff', fontSize: 17, fontWeight: '800' },

  headerAccionesWrapper: { flexDirection: 'row', gap: 10 },
  headerIconoCirculo: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4,
    elevation: 3,
  },
  headerBadge: {
    position: 'absolute', top: -4, right: -4,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#1d1d1d',
    justifyContent: 'center', alignItems: 'center',
  },
  headerBadgeTexto: { color: '#fff', fontSize: 9, fontWeight: 'bold' },

  figuraCirculoGrande: {
    position: 'absolute', top: -50, right: -60, width: 180, height: 180,
    borderRadius: 90, backgroundColor: 'rgba(230,57,70,0.04)',
  },
  figuraCirculoChico: {
    position: 'absolute', top: 250, left: -40, width: 100, height: 100,
    borderRadius: 50, backgroundColor: 'rgba(230,57,70,0.06)',
  },
  figuraCuadrado: {
    position: 'absolute', bottom: 40, right: 30, width: 50, height: 50,
    borderRadius: 14, backgroundColor: 'rgba(230,57,70,0.04)', transform: [{ rotate: '25deg' }],
  },

  bannerOcupado: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#1d3557', paddingVertical: 22, paddingHorizontal: 22,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#1d3557', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14,
    elevation: 8,
  },
  bannerCirculoDecorativo: {
    position: 'absolute', top: -40, right: -30, width: 140, height: 140,
    borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.05)',
  },
  bannerIconoAnillo: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  bannerIconoWrapper: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center', alignItems: 'center',
  },
  bannerTexto: { fontSize: 16, fontWeight: '900', color: '#fff', letterSpacing: 0.8 },
  bannerSubtexto: { fontSize: 12.5, color: 'rgba(255,255,255,0.75)', marginTop: 3, fontWeight: '500' },

  contenido: { padding: 20 },

  controlDisponibilidad: { padding: 20, paddingBottom: 16 },
  badgeEstadoActual: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  puntoEstado: { width: 8, height: 8, borderRadius: 4 },
  estadoActual: { fontSize: 14, fontWeight: '700', color: '#1d1d1d' },

  botonesEstado: { flexDirection: 'row', gap: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#eee', borderRadius: 20, paddingVertical: 9, paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  chipActivo: { backgroundColor: '#c1121f', borderColor: '#c1121f' },
  chipTexto: { fontSize: 13, color: '#999', fontWeight: '700' },
  chipTextoActivo: { color: '#fff' },

  buscador: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 20, marginBottom: 10,
    paddingHorizontal: 12, paddingVertical: 9,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4,
    elevation: 1,
  },
  buscadorInput: { flex: 1, fontSize: 14, padding: 0, color: '#1d1d1d' },
  chipsFila: { paddingHorizontal: 20, gap: 8, marginBottom: 8 },
  chipFiltro: {
    borderWidth: 1.5, borderColor: '#eee', backgroundColor: '#fff', borderRadius: 20,
    paddingVertical: 7, paddingHorizontal: 14,
  },
  chipFiltroActivo: { borderColor: '#c1121f', backgroundColor: '#fdf0f1' },
  chipFiltroTexto: { fontSize: 12.5, fontWeight: '700', color: '#666' },
  chipFiltroTextoActivo: { color: '#c1121f' },

  sinResultados: { alignItems: 'center', paddingTop: 40 },
  botonLimpiar: {
    marginTop: 14, borderWidth: 1.5, borderColor: '#c1121f', borderRadius: 10,
    paddingVertical: 9, paddingHorizontal: 18,
  },
  botonLimpiarTexto: { color: '#c1121f', fontWeight: '700', fontSize: 13 },

  centerVacio: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  mensajeVacio: { fontSize: 16, fontWeight: '700', marginBottom: 6, textAlign: 'center', color: '#1d1d1d' },
  mensajeVacioSub: { fontSize: 13, color: '#999', textAlign: 'center', paddingHorizontal: 16 },

  contador: { fontSize: 12, color: '#999', marginBottom: 10, marginLeft: 2 },
  list: { padding: 16, paddingTop: 4 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8,
    elevation: 3,
  },
  filaInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  filaIconoWrapper: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: '#fdf0f1',
    justifyContent: 'center', alignItems: 'center',
  },
  pedidoDireccion: { flex: 1, fontSize: 14.5, fontWeight: '600', color: '#1d1d1d', marginTop: 4 },
  filaTotalFecha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 },
  pedidoTotal: { fontSize: 20, fontWeight: '800', color: '#c1121f' },
  pedidoFecha: { fontSize: 11.5, color: '#999' },

  botonAceptar: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: '#c1121f', borderRadius: 10, paddingVertical: 13,
  },
  botonAceptarTexto: { color: '#fff', fontWeight: '700', fontSize: 14.5 },

  botonEntregar: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: '#c1121f', borderRadius: 10, paddingVertical: 14,
    shadowColor: '#c1121f', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10,
    elevation: 5,
  },
  botonEntregarTexto: { color: '#fff', fontWeight: '800', fontSize: 15 },
});