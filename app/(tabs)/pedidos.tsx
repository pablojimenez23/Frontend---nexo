import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useState, useCallback, useRef, useMemo } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiOrders } from '@/services/api';
import { haySesionActiva } from '@/hooks/useAuth';
import {
  FILTROS_FECHA,
  FiltroFecha,
  GRUPOS_CLIENTE,
  PRIORIDAD_CLIENTE,
  dentroDeFecha,
  enGrupo,
  formatearFechaHora,
  normalizar,
  ordenarPedidos,
} from '@/services/pedidos';

type Pedido = {
  id: string;
  estado: string;
  total: number;
  direccionEnvio: string;
  creadoEn?: string | null;
  puntosCanjeados?: number | null;
};

const ESTADOS: Record<string, { label: string; color: string; fondo: string; icono: keyof typeof Ionicons.glyphMap }> = {
  CREATED: { label: 'Pendiente', color: '#8a6109', fondo: '#fffaf0', icono: 'time-outline' },
  PAID: { label: 'Pagado', color: '#8a6109', fondo: '#fffaf0', icono: 'card-outline' },
  CONFIRMED: { label: 'En preparación', color: '#8a6109', fondo: '#fffaf0', icono: 'restaurant-outline' },
  PREPARING: { label: 'En preparación', color: '#8a6109', fondo: '#fffaf0', icono: 'restaurant-outline' },
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

  const [grupo, setGrupo] = useState('todos');
  const [fecha, setFecha] = useState<FiltroFecha>('todos');
  const [busqueda, setBusqueda] = useState('');

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

  // Pedidos que cumplen fecha y búsqueda (los contadores de los chips salen de acá)
  const base = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return pedidos.filter((p) => {
      if (!dentroDeFecha(p.creadoEn, fecha)) return false;
      if (!q) return true;
      const etiqueta = ESTADOS[p.estado]?.label ?? p.estado;
      return normalizar(`${p.direccionEnvio} ${etiqueta}`).includes(q);
    });
  }, [pedidos, fecha, busqueda]);

  const visibles = useMemo(() => {
    const estados = GRUPOS_CLIENTE.find((g) => g.clave === grupo)?.estados ?? null;
    return ordenarPedidos(base.filter((p) => enGrupo(p.estado, estados)), PRIORIDAD_CLIENTE);
  }, [base, grupo]);

  const hayFiltros = grupo !== 'todos' || fecha !== 'todos' || busqueda.trim() !== '';

  const limpiarFiltros = () => {
    setGrupo('todos');
    setFecha('todos');
    setBusqueda('');
  };

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

      <View style={styles.filtros}>
        <View style={styles.buscador}>
          <Ionicons name="search-outline" size={16} color="#999" />
          <TextInput
            style={styles.buscadorInput}
            placeholder="Buscar por dirección o estado"
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
          {GRUPOS_CLIENTE.map((g) => {
            const activo = grupo === g.clave;
            const cantidad = base.filter((p) => enGrupo(p.estado, g.estados)).length;
            return (
              <TouchableOpacity
                key={g.clave}
                style={[styles.chip, activo && styles.chipActivo]}
                onPress={() => setGrupo(g.clave)}
              >
                <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>
                  {g.label} {cantidad}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsFila}>
          {FILTROS_FECHA.map((f) => {
            const activo = fecha === f.clave;
            return (
              <TouchableOpacity
                key={f.clave}
                style={[styles.chipFecha, activo && styles.chipFechaActivo]}
                onPress={() => setFecha(f.clave)}
              >
                <Text style={[styles.chipFechaTexto, activo && styles.chipFechaTextoActivo]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={visibles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <Text style={styles.contador}>
            {hayFiltros ? `${visibles.length} de ${pedidos.length} pedidos` : `${pedidos.length} ${pedidos.length === 1 ? 'pedido' : 'pedidos'}`}
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.sinResultados}>
            <Ionicons name="funnel-outline" size={28} color="#c9a3a3" style={{ marginBottom: 8 }} />
            <Text style={styles.mensajeVacio}>No hay pedidos con estos filtros</Text>
            <TouchableOpacity style={styles.botonLimpiar} onPress={limpiarFiltros}>
              <Text style={styles.botonLimpiarTexto}>Limpiar filtros</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const info = ESTADOS[item.estado] ?? { label: item.estado, color: '#666', fondo: '#f4f4f4', icono: 'ellipse-outline' as const };
          const requiereAccion = item.estado === 'DELIVERED';
          const fechaTexto = formatearFechaHora(item.creadoEn);
          return (
            <TouchableOpacity
              style={[styles.card, requiereAccion && styles.cardAccion]}
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
                <View style={styles.filaTotal}>
                  <Text style={styles.total}>${item.total.toLocaleString('es-CL')}</Text>
                  {fechaTexto !== '' && <Text style={styles.fecha}>{fechaTexto}</Text>}
                </View>
                {!!item.puntosCanjeados && item.puntosCanjeados > 0 && (
                  <Text style={styles.puntosPagados}>◆ Pagaste {item.puntosCanjeados} puntos</Text>
                )}
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

  filtros: { paddingTop: 12 },
  buscador: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 16, marginBottom: 10,
    paddingHorizontal: 12, paddingVertical: 9,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4,
    elevation: 1,
  },
  buscadorInput: { flex: 1, fontSize: 14, padding: 0, color: '#1d1d1d' },
  chipsFila: { paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  chip: {
    borderWidth: 1.5, borderColor: '#eee', backgroundColor: '#fff', borderRadius: 20,
    paddingVertical: 7, paddingHorizontal: 14,
  },
  chipActivo: { borderColor: '#c1121f', backgroundColor: '#fdf0f1' },
  chipTexto: { fontSize: 12.5, fontWeight: '700', color: '#666' },
  chipTextoActivo: { color: '#c1121f' },
  chipFecha: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 14 },
  chipFechaActivo: { backgroundColor: '#1d1d1d' },
  chipFechaTexto: { fontSize: 12, fontWeight: '600', color: '#999' },
  chipFechaTextoActivo: { color: '#fff' },

  contador: { fontSize: 12, color: '#999', marginBottom: 10, marginLeft: 2 },
  list: { padding: 16, paddingTop: 8, flexGrow: 1 },

  sinResultados: { alignItems: 'center', paddingTop: 40 },
  botonLimpiar: {
    marginTop: 14, borderWidth: 1.5, borderColor: '#c1121f', borderRadius: 10,
    paddingVertical: 9, paddingHorizontal: 18,
  },
  botonLimpiarTexto: { color: '#c1121f', fontWeight: '700', fontSize: 13 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8,
    elevation: 3,
  },
  cardAccion: { borderWidth: 1.5, borderColor: '#c1121f' },
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
  filaTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  total: { fontSize: 16, fontWeight: '800', color: '#1d1d1d' },
  fecha: { fontSize: 11.5, color: '#999' },
  puntosPagados: { fontSize: 11, fontWeight: '700', color: '#6d28d9', marginTop: 4 },
});