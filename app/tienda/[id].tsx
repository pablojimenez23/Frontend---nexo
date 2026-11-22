import {
  View, Text, StyleSheet, SectionList, ActivityIndicator, TouchableOpacity, Alert,
  ScrollView, Image,
} from 'react-native';
import { useEffect, useState } from 'react';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiProducts, apiStores } from '@/services/api';
import { useCart } from '@/context/CartContext';
import { puntosDe } from '@/services/puntos';
import { ofertaActiva, tiempoRestante } from '@/services/ofertas';
import { Producto, esSimple, etiquetasDe, precioDesde } from '@/services/catalogo';
import { useFuncion } from '@/services/version';

type Seccion = {
  title: string;
  icono: keyof typeof Ionicons.glyphMap;
  data: Producto[];
};

const TODO = 'Todo';

export default function DetalleTiendaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [nombreTienda, setNombreTienda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [ahora, setAhora] = useState(Date.now());
  const [filtro, setFiltro] = useState(TODO);
  const { agregarItem, reemplazarCarrito, items, subtotal, unidades } = useCart();
  const puntosActivos = useFuncion('puntos');
  const ofertasActivas = useFuncion('ofertas');

  useEffect(() => {
    apiStores.get(`/tiendas/${id}`).then((res) => setNombreTienda(res.data.nombre));
    apiProducts.get(`/productos?tiendaId=${id}`)
      .then((res) => setProductos(res.data))
      .finally(() => setCargando(false));
  }, [id]);

  // Refresca la cuenta regresiva de las ofertas cada 30 segundos
  useEffect(() => {
    const timer = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const ofertaVigente = (p: Producto) =>
    ofertasActivas && p.oferta && ofertaActiva(p.oferta.fin, ahora) ? p.oferta : null;

  // Cada producto aparece en una sola sección: Ofertas, Destacados o su tipo
  const armarSecciones = (): Seccion[] => {
    const usados = new Set<string>();
    const resultado: Seccion[] = [];

    const tomar = (titulo: string, icono: keyof typeof Ionicons.glyphMap, filtroFn: (p: Producto) => boolean) => {
      const data = productos.filter((p) => !usados.has(p.id) && filtroFn(p));
      data.forEach((p) => usados.add(p.id));
      if (data.length > 0) resultado.push({ title: titulo, icono, data });
    };

    tomar('Ofertas', 'flash', (p) => !!ofertaVigente(p));
    tomar('Destacados', 'star', (p) => !!p.destacado);

    const tipos = Array.from(new Set(productos.map((p) => p.tipoEtiqueta ?? 'Otros')));
    tipos.forEach((tipo) => tomar(tipo, 'restaurant-outline', (p) => (p.tipoEtiqueta ?? 'Otros') === tipo));

    return resultado;
  };

  const secciones = armarSecciones();
  const seccionesVisibles = filtro === TODO ? secciones : secciones.filter((s) => s.title === filtro);

  const itemRapido = (producto: Producto) => {
    const oferta = ofertaVigente(producto);
    return {
      productoId: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: 1,
      varianteId: null,
      varianteNombre: null,
      opcionesIds: [] as string[],
      opcionesTexto: null,
      opcionesUnitario: 0,
      nota: null,
      requiereMayorEdad: !!producto.requiereMayorEdad,
      precioOferta: oferta?.precioOferta ?? null,
      limiteOferta: oferta?.limitePorPedido ?? null,
      unidadesOfertaDisponibles: oferta?.unidadesDisponibles ?? null,
      ofertaFin: oferta?.fin ?? null,
    };
  };

  const abrirDetalle = (producto: Producto) => {
    router.push({ pathname: '/producto/[id]', params: { id: producto.id } } as any);
  };

  const handleMas = (producto: Producto) => {
    // Si hay que elegir tamaño u opciones, se abre el detalle
    if (!esSimple(producto)) {
      abrirDetalle(producto);
      return;
    }

    const item = itemRapido(producto);
    const exito = agregarItem(id!, item);
    if (!exito) {
      Alert.alert(
        'Solo una tienda por pedido',
        'Ya tenés productos de otra tienda en el carrito. ¿Querés vaciarlo y empezar con este producto?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Vaciar y agregar', style: 'destructive', onPress: () => reemplazarCarrito(id!, item) },
        ]
      );
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View style={styles.headerTitulo}>
              <View style={styles.headerIconoWrapper}>
                <Ionicons name="storefront-outline" size={15} color="#fff" />
              </View>
              <Text style={styles.headerTituloTexto}>{nombreTienda}</Text>
            </View>
          ),
          headerStyle: { backgroundColor: '#c1121f' },
          headerTintColor: '#fff',
          headerShadowVisible: false,
        }}
      />

      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#c1121f" />
        </View>
      ) : productos.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="fast-food-outline" size={32} color="#c9a3a3" style={{ marginBottom: 10 }} />
          <Text style={styles.mensajeVacio}>Esta tienda todavía no tiene productos</Text>
        </View>
      ) : (
        <View style={styles.pantalla}>
          <View style={styles.figuraCirculoGrande} />
          <View style={styles.figuraCirculoChico} />

          <SectionList
            sections={seccionesVisibles}
            extraData={ahora}
            keyExtractor={(item) => item.id}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chips}
                >
                  {[TODO, ...secciones.map((s) => s.title)].map((titulo) => (
                    <TouchableOpacity
                      key={titulo}
                      style={[styles.chip, filtro === titulo && styles.chipActivo]}
                      onPress={() => setFiltro(titulo)}
                    >
                      <Text style={[styles.chipTexto, filtro === titulo && styles.chipTextoActivo]}>
                        {titulo}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={styles.contador}>
                  {productos.length} {productos.length === 1 ? 'producto' : 'productos'}
                </Text>
              </View>
            }
            renderSectionHeader={({ section }) => (
              <View style={styles.seccionEncabezado}>
                <Ionicons
                  name={section.icono}
                  size={16}
                  color={section.title === 'Ofertas' ? '#c1121f' : section.title === 'Destacados' ? '#8a6109' : '#1d1d1d'}
                />
                <Text style={styles.seccionTitulo}>{section.title}</Text>
                <Text style={styles.seccionCantidad}>{section.data.length}</Text>
              </View>
            )}
            renderItem={({ item }) => {
              const oferta = ofertaVigente(item);
              const tieneTamanos = (item.variantes ?? []).length > 0;
              const precioNormal = tieneTamanos ? precioDesde(item) : item.precio;
              const precioFinal = oferta ? oferta.precioOferta : precioNormal;
              const sinStock = !item.disponible || item.stock <= 0;
              const etiquetas = etiquetasDe(item.atributos);

              return (
                <TouchableOpacity
                  style={[styles.card, sinStock && styles.cardDisabled]}
                  onPress={() => abrirDetalle(item)}
                  activeOpacity={0.85}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.filaBadges}>
                      {oferta && (
                        <View style={styles.badgeOferta}>
                          <Ionicons name="flash" size={11} color="#fff" />
                          <Text style={styles.badgeOfertaTexto}>-{oferta.porcentaje} %</Text>
                        </View>
                      )}
                      {item.destacado && !oferta && (
                        <View style={styles.badgeDestacado}>
                          <Ionicons name="star" size={11} color="#8a6109" />
                          <Text style={styles.badgeDestacadoTexto}>Destacado</Text>
                        </View>
                      )}
                      {item.requiereMayorEdad && (
                        <View style={styles.badgeEdad}>
                          <Text style={styles.badgeEdadTexto}>+18</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.nombre}>{item.nombre}</Text>
                    {item.descripcion ? (
                      <Text style={styles.descripcion} numberOfLines={2}>{item.descripcion}</Text>
                    ) : null}

                    {(item.personas ?? 0) > 0 || etiquetas.length > 0 ? (
                      <Text style={styles.detalleChico} numberOfLines={1}>
                        {[
                          (item.personas ?? 0) > 0 ? `Para ${item.personas}` : null,
                          ...etiquetas,
                        ].filter(Boolean).join(' · ')}
                      </Text>
                    ) : null}

                    {oferta && (
                      <Text style={styles.ofertaInfo}>
                        Termina en {tiempoRestante(oferta.fin, ahora)} · máx. {oferta.limitePorPedido} por pedido
                        {oferta.unidadesDisponibles != null ? ` · quedan ${oferta.unidadesDisponibles}` : ''}
                      </Text>
                    )}

                    <View style={styles.filaPrecioBloque}>
                      {oferta ? (
                        <View style={styles.filaPrecioOferta}>
                          <Text style={styles.precio}>
                            {tieneTamanos ? 'Desde ' : ''}${precioFinal.toLocaleString('es-CL')}
                          </Text>
                          <Text style={styles.precioTachado}>${precioNormal.toLocaleString('es-CL')}</Text>
                        </View>
                      ) : (
                        <Text style={styles.precio}>
                          {tieneTamanos ? 'Desde ' : ''}${precioNormal.toLocaleString('es-CL')}
                        </Text>
                      )}
                      {puntosActivos && (
                        <Text style={styles.puntosPrecio}>o ◆ {puntosDe(precioFinal)} pts</Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.lateral}>
                    <View style={styles.miniatura}>
                      {item.imagenUrl ? (
                        <Image source={{ uri: item.imagenUrl }} style={styles.miniaturaImagen} resizeMode="cover" />
                      ) : (
                        <Ionicons name="fast-food-outline" size={28} color="#c1121f" />
                      )}
                    </View>

                    {sinStock ? (
                      <View style={styles.badgeSinStock}>
                        <Text style={styles.badgeSinStockTexto}>Sin stock</Text>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.botonMas} onPress={() => handleMas(item)}>
                        <Ionicons name="add" size={20} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            }}
          />

          {items.length > 0 && (
            <SafeAreaView edges={['bottom']} style={styles.safeAreaBoton}>
              <TouchableOpacity style={styles.botonCarrito} onPress={() => router.push('/carrito')}>
                <View style={styles.botonCarritoIzquierda}>
                  <View style={styles.botonCarritoContador}>
                    <Text style={styles.botonCarritoContadorTexto}>{unidades}</Text>
                  </View>
                  <Text style={styles.botonCarritoTexto}>Ver carrito</Text>
                </View>
                <Text style={styles.botonCarritoMonto}>
                  ${subtotal.toLocaleString('es-CL')}
                </Text>
              </TouchableOpacity>
            </SafeAreaView>
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20,
    backgroundColor: '#faf8f6',
  },
  mensajeVacio: { fontSize: 15, color: '#666', textAlign: 'center' },

  headerTitulo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconoWrapper: {
    width: 26, height: 26, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTituloTexto: { fontSize: 16, fontWeight: '800', color: '#fff' },

  pantalla: { flex: 1, backgroundColor: '#faf8f6', overflow: 'hidden' },
  figuraCirculoGrande: {
    position: 'absolute', top: -50, right: -60, width: 180, height: 180,
    borderRadius: 90, backgroundColor: 'rgba(230,57,70,0.04)',
  },
  figuraCirculoChico: {
    position: 'absolute', top: 260, left: -40, width: 100, height: 100,
    borderRadius: 50, backgroundColor: 'rgba(230,57,70,0.06)',
  },

  list: { padding: 16, paddingBottom: 100 },
  contador: { fontSize: 12, color: '#999', marginBottom: 4, marginLeft: 2 },

  chips: { gap: 8, paddingBottom: 12 },
  chip: {
    borderRadius: 18, paddingVertical: 8, paddingHorizontal: 16,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#eee',
  },
  chipActivo: { backgroundColor: '#c1121f', borderColor: '#c1121f' },
  chipTexto: { fontSize: 13, fontWeight: '700', color: '#666' },
  chipTextoActivo: { color: '#fff' },

  seccionEncabezado: {
    flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14, marginBottom: 10,
  },
  seccionTitulo: { fontSize: 17, fontWeight: '800', color: '#1d1d1d' },
  seccionCantidad: { fontSize: 12, color: '#999', fontWeight: '700' },

  card: {
    flexDirection: 'row', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8,
    elevation: 3,
  },
  cardDisabled: { opacity: 0.5 },
  nombre: { fontSize: 15.5, fontWeight: '800', color: '#1d1d1d' },
  descripcion: { fontSize: 12.5, color: '#888', marginTop: 3, lineHeight: 17 },
  detalleChico: { fontSize: 11.5, color: '#999', marginTop: 5, fontWeight: '600' },

  filaBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 6 },
  badgeOferta: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#c1121f', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8,
  },
  badgeOfertaTexto: { color: '#fff', fontSize: 11, fontWeight: '800' },
  badgeDestacado: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#fffaf0', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8,
  },
  badgeDestacadoTexto: { color: '#8a6109', fontSize: 11, fontWeight: '800' },
  badgeEdad: { backgroundColor: '#1d1d1d', borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  badgeEdadTexto: { color: '#fff', fontSize: 11, fontWeight: '800' },
  ofertaInfo: { fontSize: 11.5, color: '#c1121f', fontWeight: '600', marginTop: 6 },

  filaPrecioBloque: { marginTop: 10 },
  filaPrecioOferta: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  precio: { fontSize: 16, fontWeight: '800', color: '#c1121f' },
  precioTachado: { fontSize: 12.5, color: '#999', textDecorationLine: 'line-through' },
  puntosPrecio: { fontSize: 11, fontWeight: '700', color: '#6d28d9', marginTop: 2 },

  lateral: { alignItems: 'center', justifyContent: 'space-between' },
  miniatura: {
    width: 84, height: 84, borderRadius: 14, backgroundColor: '#fdf0f1',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  miniaturaImagen: { width: '100%', height: '100%' },
  botonMas: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#c1121f',
    justifyContent: 'center', alignItems: 'center', marginTop: -17,
    shadowColor: '#c1121f', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6,
    elevation: 4,
  },
  badgeSinStock: {
    backgroundColor: '#f4f4f4', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10,
    marginTop: -12,
  },
  badgeSinStockTexto: { fontSize: 11.5, color: '#999', fontWeight: '700' },

  safeAreaBoton: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  botonCarrito: {
    backgroundColor: '#c1121f',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  botonCarritoIzquierda: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  botonCarritoContador: {
    minWidth: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
  },
  botonCarritoContadorTexto: { color: '#fff', fontWeight: '800', fontSize: 13 },
  botonCarritoTexto: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  botonCarritoMonto: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});