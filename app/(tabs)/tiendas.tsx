import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiStores } from '@/services/api';

type Tienda = {
  id: string;
  nombre: string;
  descripcion: string;
  direccion: string;
  logoUrl: string | null;
  horario: string;
  categoria: string;
  montoMinimo: number;
  creadoEn: string;
};

const ICONOS_CATEGORIA: Record<string, keyof typeof Ionicons.glyphMap> = {
  RESTAURANTE: 'restaurant-outline',
  MERCADO: 'cart-outline',
  BOTILLERIA: 'wine-outline',
  CAFETERIA: 'cafe-outline',
};

const LABELS_CATEGORIA: Record<string, string> = {
  RESTAURANTE: 'Restaurante',
  MERCADO: 'Mercado',
  BOTILLERIA: 'Botillería',
  CAFETERIA: 'Cafetería',
};

const FILTROS = [
  { key: 'TODAS', label: 'Todas', icono: 'apps-outline' as const },
  { key: 'RESTAURANTE', label: 'Restaurantes', icono: 'restaurant-outline' as const },
  { key: 'MERCADO', label: 'Mercados', icono: 'cart-outline' as const },
  { key: 'BOTILLERIA', label: 'Botillerías', icono: 'wine-outline' as const },
  { key: 'CAFETERIA', label: 'Cafeterías', icono: 'cafe-outline' as const },
];

const OPCIONES_ORDEN = [
  { key: 'reciente' as const, label: 'Más nuevas' },
  { key: 'az' as const, label: 'A-Z' },
  { key: 'za' as const, label: 'Z-A' },
];

function estaAbierta(horario: string): boolean | null {
  if (!horario) return null;
  const match = horario.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const h1 = Number(match[1]), m1 = Number(match[2]);
  const h2 = Number(match[3]), m2 = Number(match[4]);
  if ([h1, m1, h2, m2].some((n) => Number.isNaN(n))) return null;

  const ahora = new Date();
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const inicio = h1 * 60 + m1;
  const fin = h2 * 60 + m2;

  if (fin > inicio) {
    return minutosAhora >= inicio && minutosAhora < fin;
  }
  return minutosAhora >= inicio || minutosAhora < fin;
}

function BarraFiltros({ filtroActivo, onCambiar }: { filtroActivo: string; onCambiar: (key: string) => void }) {
  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={FILTROS}
      keyExtractor={(item) => item.key}
      style={styles.filtrosContenedor}
      contentContainerStyle={styles.filtrosLista}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.filtroChip, filtroActivo === item.key && styles.filtroChipActivo]}
          onPress={() => onCambiar(item.key)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={item.icono}
            size={14}
            color={filtroActivo === item.key ? '#fff' : '#c1121f'}
          />
          <Text style={[styles.filtroChipTexto, filtroActivo === item.key && styles.filtroChipTextoActivo]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}

function BarraOrden({ orden, onCambiar }: { orden: string; onCambiar: (key: 'az' | 'za' | 'reciente') => void }) {
  return (
    <View style={styles.ordenFila}>
      {OPCIONES_ORDEN.map((op) => (
        <TouchableOpacity
          key={op.key}
          style={[styles.ordenChip, orden === op.key && styles.ordenChipActivo]}
          onPress={() => onCambiar(op.key)}
          activeOpacity={0.7}
        >
          <Text style={[styles.ordenChipTexto, orden === op.key && styles.ordenChipTextoActivo]}>
            {op.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function TiendasScreen() {
  const { categoria, q } = useLocalSearchParams<{ categoria?: string; q?: string }>();
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroActivo, setFiltroActivo] = useState(categoria ?? 'TODAS');
  const [busqueda, setBusqueda] = useState(q ?? '');
  const [orden, setOrden] = useState<'az' | 'za' | 'reciente'>('reciente');

  // Si venimos navegando desde Inicio con una categoría distinta, actualizamos el filtro
  useEffect(() => {
    if (categoria) {
      setFiltroActivo(categoria);
    }
  }, [categoria]);

  // Si venimos navegando con un término de búsqueda nuevo, lo aplicamos también
  useEffect(() => {
    if (q !== undefined) {
      setBusqueda(q);
    }
  }, [q]);

  useFocusEffect(
    useCallback(() => {
      setCargando(true);
      apiStores.get('/tiendas')
        .then((res) => setTiendas(res.data))
        .catch((err) => setError(err.message))
        .finally(() => setCargando(false));
    }, [])
  );

  const tiendasFiltradas = useMemo(() => {
    let resultado = tiendas;

    if (filtroActivo !== 'TODAS') {
      resultado = resultado.filter(
        (t) => t.categoria?.trim().toUpperCase() === filtroActivo.trim().toUpperCase()
      );
    }

    if (busqueda.trim()) {
      const texto = busqueda.trim().toLowerCase();
      resultado = resultado.filter((t) => t.nombre.toLowerCase().includes(texto));
    }

    return [...resultado].sort((a, b) => {
      if (orden === 'reciente') return new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime();
      return orden === 'az' ? a.nombre.localeCompare(b.nombre) : b.nombre.localeCompare(a.nombre);
    });
  }, [tiendas, filtroActivo, busqueda, orden]);

  if (cargando) {
    return (
      <View style={styles.center}>
        <View style={styles.figuraCirculoGrande} />
        <View style={styles.figuraCirculoChico} />
        <View style={styles.figuraCuadrado} />
        <ActivityIndicator size="large" color="#c1121f" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <View style={styles.figuraCirculoGrande} />
        <View style={styles.figuraCirculoChico} />
        <View style={styles.figuraCuadrado} />
        <Text>No se pudo conectar con el servidor</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#faf8f6' }}>
      <View style={styles.figuraCirculoGrande} />
      <View style={styles.figuraCirculoChico} />
      <View style={styles.figuraCuadrado} />

      <View style={styles.buscador}>
        <Ionicons name="search-outline" size={18} color="#999" style={{ marginLeft: 12 }} />
        <TextInput
          style={styles.buscadorInput}
          placeholder="Buscar tiendas por nombre..."
          placeholderTextColor="#aaa"
          value={busqueda}
          onChangeText={setBusqueda}
          maxLength={40}
        />
        {busqueda.length > 0 && (
          <TouchableOpacity onPress={() => setBusqueda('')} style={{ marginRight: 10 }}>
            <Ionicons name="close-circle" size={18} color="#ccc" />
          </TouchableOpacity>
        )}
      </View>

      <BarraFiltros filtroActivo={filtroActivo} onCambiar={setFiltroActivo} />
      <BarraOrden orden={orden} onCambiar={setOrden} />

      {tiendasFiltradas.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={32} color="#c9a3a3" style={{ marginBottom: 10 }} />
          <Text style={styles.mensajeVacio}>No hay tiendas por acá</Text>
          <Text style={styles.mensajeVacioSub}>Probá con otra categoría o búsqueda</Text>
        </View>
      ) : (
        <FlatList
          data={tiendasFiltradas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.contador}>
              {tiendasFiltradas.length} {tiendasFiltradas.length === 1 ? 'tienda encontrada' : 'tiendas encontradas'}
            </Text>
          }
          renderItem={({ item }) => {
            const abierta = estaAbierta(item.horario);
            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => router.push({ pathname: '/tienda/[id]', params: { id: item.id } })}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconoWrapper}>
                    <Ionicons
                      name={ICONOS_CATEGORIA[item.categoria] ?? 'storefront-outline'}
                      size={22}
                      color="#c1121f"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nombre} numberOfLines={1}>{item.nombre}</Text>
                    <View style={styles.filaBadges}>
                      <View style={styles.badgeCategoria}>
                        <Text style={styles.badgeCategoriaTexto}>
                          {LABELS_CATEGORIA[item.categoria] ?? item.categoria}
                        </Text>
                      </View>
                      {abierta !== null && (
                        <View style={[styles.badgeEstado, abierta ? styles.badgeAbierta : styles.badgeCerrada]}>
                          <View style={[styles.puntoEstado, { backgroundColor: abierta ? '#2a9d8f' : '#c0392b' }]} />
                          <Text style={[styles.badgeEstadoTexto, { color: abierta ? '#1e6f64' : '#c0392b' }]}>
                            {abierta ? 'Abierta' : 'Cerrada'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#c9a3a3" />
                </View>

                {item.descripcion ? (
                  <Text style={styles.descripcion} numberOfLines={2}>{item.descripcion}</Text>
                ) : null}

                <View style={styles.divisor} />

                <View style={styles.filaInfo}>
                  <Ionicons name="location-outline" size={14} color="#999" />
                  <Text style={styles.infoTexto} numberOfLines={1}>{item.direccion}</Text>
                </View>

                {item.horario ? (
                  <View style={styles.filaInfo}>
                    <Ionicons name="time-outline" size={14} color="#999" />
                    <Text style={styles.infoTexto}>{item.horario}</Text>
                  </View>
                ) : null}

                {item.montoMinimo != null && item.montoMinimo > 0 && (
                  <View style={styles.filaInfo}>
                    <Ionicons name="pricetag-outline" size={14} color="#999" />
                    <Text style={styles.infoTexto}>
                      Pedido mínimo: ${item.montoMinimo.toLocaleString('es-CL')}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20,
    backgroundColor: '#faf8f6', overflow: 'hidden',
  },
  errorText: { fontSize: 11, color: '#999', marginTop: 8, textAlign: 'center' },
  mensajeVacio: { fontSize: 16, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  mensajeVacioSub: { fontSize: 13, color: '#999', textAlign: 'center' },

  buscador: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 16, marginTop: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6,
    elevation: 2,
  },
  buscadorInput: { flex: 1, paddingVertical: 11, paddingHorizontal: 10, fontSize: 14, color: '#333' },

  filtrosContenedor: { flexGrow: 0, height: 58 },
  filtrosLista: { paddingHorizontal: 16, alignItems: 'center' },
  filtroChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 17,
    paddingHorizontal: 14,
    marginRight: 10,
    height: 34,
    minHeight: 34,
    maxHeight: 34,
    borderWidth: 1, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4,
    elevation: 1,
  },
  filtroChipActivo: { backgroundColor: '#c1121f', borderColor: '#c1121f' },
  filtroChipTexto: { fontSize: 12.5, fontWeight: '700', color: '#c1121f', includeFontPadding: false },
  filtroChipTextoActivo: { color: '#fff' },

  ordenFila: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  ordenChip: {
    borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 17,
    paddingHorizontal: 12, backgroundColor: '#fff',
    height: 30, minHeight: 30, maxHeight: 30,
    justifyContent: 'center', alignItems: 'center',
  },
  ordenChipActivo: { backgroundColor: '#1d1d1d', borderColor: '#1d1d1d' },
  ordenChipTexto: { fontSize: 11.5, fontWeight: '600', color: '#666', includeFontPadding: false },
  ordenChipTextoActivo: { color: '#fff' },

  contador: { fontSize: 12, color: '#999', marginBottom: 10, marginLeft: 2 },

  list: { padding: 16, paddingTop: 0, flexGrow: 1 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  iconoWrapper: {
    width: 46, height: 46, borderRadius: 14, backgroundColor: '#fdf0f1',
    justifyContent: 'center', alignItems: 'center',
  },
  nombre: { fontSize: 16, fontWeight: '800', color: '#1d1d1d', marginBottom: 4 },
  filaBadges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badgeCategoria: {
    alignSelf: 'flex-start', backgroundColor: '#faf0e6', borderRadius: 20,
    paddingVertical: 2, paddingHorizontal: 9,
  },
  badgeCategoriaTexto: { fontSize: 10, fontWeight: '800', color: '#a56a2f', textTransform: 'uppercase' },
  badgeEstado: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 20, paddingVertical: 2, paddingHorizontal: 9,
  },
  badgeAbierta: { backgroundColor: '#e3f6f4' },
  badgeCerrada: { backgroundColor: '#fdf0f1' },
  puntoEstado: { width: 5, height: 5, borderRadius: 3 },
  badgeEstadoTexto: { fontSize: 10, fontWeight: '800' },

  descripcion: { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 10 },

  divisor: { height: 1, backgroundColor: '#f2f2f2', marginBottom: 10 },

  filaInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  infoTexto: { fontSize: 12.5, color: '#777', flex: 1 },

  figuraCirculoGrande: {
    position: 'absolute', top: -50, right: -60, width: 180, height: 180,
    borderRadius: 90, backgroundColor: 'rgba(230,57,70,0.04)',
  },
  figuraCirculoChico: {
    position: 'absolute', top: 200, left: -40, width: 100, height: 100,
    borderRadius: 50, backgroundColor: 'rgba(230,57,70,0.06)',
  },
  figuraCuadrado: {
    position: 'absolute', bottom: 40, right: 30, width: 50, height: 50,
    borderRadius: 14, backgroundColor: 'rgba(230,57,70,0.04)', transform: [{ rotate: '25deg' }],
  },
});