import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { router, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiStores, apiOrders, apiProducts, apiUsers } from '@/services/api';

type Tienda = {
  id: string;
  nombre: string;
  estado: string;
};

type Pedido = {
  id: string;
  estado: string;
  total: number;
  comisionPlataforma: number;
  direccionEnvio: string;
};

type Producto = {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  disponible: boolean;
};

const REGEX_TEXTO_LIBRE = /[^a-zA-Z0-9À-ÿñÑ\s.,°#-]/g;
const LIMITES = { nombre: 60, descripcion: 150, precio: 8, stock: 5 };

export default function MiTiendaScreen() {
  const [tienda, setTienda] = useState<Tienda | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [tab, setTab] = useState<'pedidos' | 'productos'>('pedidos');
  const [cargando, setCargando] = useState(true);
  const [actualizandoId, setActualizandoId] = useState<string | null>(null);
  const [noLeidas, setNoLeidas] = useState(0);

  const [mostrandoFormulario, setMostrandoFormulario] = useState(false);
  const [nombreProducto, setNombreProducto] = useState('');
  const [descripcionProducto, setDescripcionProducto] = useState('');
  const [precioProducto, setPrecioProducto] = useState('');
  const [stockProducto, setStockProducto] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargarDatos = () => {
    setCargando(true);
    apiStores.get('/tiendas/mi-tienda').then((res) => {
      const miTienda = res.data[0];
      setTienda(miTienda);
      if (miTienda) {
        return Promise.all([
          apiOrders.get(`/pedidos/tienda?tiendaId=${miTienda.id}`),
          apiProducts.get(`/productos?tiendaId=${miTienda.id}`),
        ]).then(([resPedidos, resProductos]) => {
          setPedidos(resPedidos.data);
          setProductos(resProductos.data);
        });
      }
    }).finally(() => setCargando(false));
  };

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      apiUsers.get('/notificaciones/no-leidas')
        .then((res) => setNoLeidas(res.data.cantidad))
        .catch(() => {});
    }, [])
  );

  const limpiarTexto = (valor: string, limite: number) =>
    valor.replace(REGEX_TEXTO_LIBRE, '').slice(0, limite);

  const limpiarNumero = (valor: string, limite: number) =>
    valor.replace(/[^0-9]/g, '').slice(0, limite);

  const siguienteEstado = (estado: string): { accion: string; endpoint: string; icono: keyof typeof Ionicons.glyphMap } | null => {
    switch (estado) {
      case 'PAID': return { accion: 'Tomar orden', endpoint: 'tomar-orden', icono: 'checkmark-circle-outline' };
      case 'CONFIRMED': return { accion: 'Marcar listo para despacho', endpoint: 'listo', icono: 'bag-check-outline' };
      default: return null;
    }
  };

  const avanzarEstado = async (pedidoId: string, endpoint: string) => {
    setActualizandoId(pedidoId);
    try {
      await apiOrders.patch(`/pedidos/${pedidoId}/${endpoint}`);
      cargarDatos();
    } finally {
      setActualizandoId(null);
    }
  };

  const validarProducto = (): string | null => {
    if (nombreProducto.trim().length < 2) return 'El nombre del producto es muy corto';
    if (!precioProducto || Number(precioProducto) <= 0) return 'Ingresá un precio válido, mayor a cero';
    if (stockProducto && Number(stockProducto) < 0) return 'El stock no puede ser negativo';
    return null;
  };

  const publicarProducto = async () => {
    if (!tienda) return;

    const error = validarProducto();
    if (error) {
      Alert.alert('Revisá los datos', error);
      return;
    }

    setGuardando(true);
    try {
      const res = await apiProducts.post('/productos', {
        tiendaId: tienda.id,
        nombre: nombreProducto.trim(),
        descripcion: descripcionProducto.trim(),
        precio: Number(precioProducto),
        stock: stockProducto ? Number(stockProducto) : 0,
      });
      setProductos((prev) => [...prev, res.data]);
      setNombreProducto('');
      setDescripcionProducto('');
      setPrecioProducto('');
      setStockProducto('');
      setMostrandoFormulario(false);
    } catch {
      Alert.alert('Error', 'No se pudo publicar el producto. Intentá de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const cambiarDisponibilidad = async (producto: Producto) => {
    try {
      await apiProducts.patch(`/productos/${producto.id}/disponibilidad?disponible=${!producto.disponible}`);
      cargarDatos();
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el producto');
    }
  };

  const eliminarProducto = async (id: string) => {
    try {
      await apiProducts.delete(`/productos/${id}`);
      setProductos((prev) => prev.filter((p) => p.id !== id));
    } catch {
      Alert.alert('Error', 'No se pudo eliminar el producto');
    }
  };

  const header = (
    <Stack.Screen
      options={{
        headerShown: true,
        headerTitle: () => (
          <View style={styles.headerTituloWrapper}>
            <View style={styles.headerIconoWrapper}>
              <Text style={{ fontSize: 15 }}>🏪</Text>
            </View>
            <Text style={styles.headerTituloTexto}>Mi tienda</Text>
          </View>
        ),
        headerStyle: { backgroundColor: '#c1121f' },
        headerTintColor: '#fff',
        headerShadowVisible: false,
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        ),
        headerRight: () => (
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
              onPress={() => router.push('/tienda-actividad' as any)}
              style={styles.headerIconoCirculo}
            >
              <Ionicons name="stats-chart-outline" size={18} color="#1d1d1d" />
            </TouchableOpacity>
          </View>
        ),
      }}
    />
  );

  if (cargando) {
    return (
      <>
        {header}
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#c1121f" />
        </View>
      </>
    );
  }

  if (!tienda) {
    return (
      <>
        {header}
        <View style={styles.center}>
          <Text style={styles.mensajeVacio}>🏚️ Todavía no tenés local acá</Text>
          <Text style={styles.mensajeVacioSub}>Registrá tu tienda y empezá a vender en NEXO.</Text>
          <TouchableOpacity style={styles.botonRegistrar} onPress={() => router.replace('/registrar-tienda' as any)}>
            <Text style={styles.botonRegistrarTexto}>Registrar mi tienda</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      {header}
      <View style={styles.pantalla}>
        <View style={styles.figuraCirculoGrande} />
        <View style={styles.figuraCirculoChico} />

        <View style={styles.headerTienda}>
          <View style={styles.headerFila}>
            <View style={styles.nombreWrapper}>
              <View style={styles.iconoTienda}>
                <Text style={{ fontSize: 20 }}>🏪</Text>
              </View>
              <Text style={styles.nombreTienda}>{tienda.nombre}</Text>
            </View>
            <TouchableOpacity style={styles.botonEditar} onPress={() => router.push('/editar-tienda' as any)}>
              <Ionicons name="pencil-outline" size={13} color="#c1121f" />
              <Text style={styles.botonEditarTexto}>Editar</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tabBoton, tab === 'pedidos' && styles.tabBotonActivo]}
            onPress={() => setTab('pedidos')}
          >
            <Ionicons
              name="receipt-outline"
              size={16}
              color={tab === 'pedidos' ? '#c1121f' : '#999'}
            />
            <Text style={[styles.tabTexto, tab === 'pedidos' && styles.tabTextoActivo]}>Pedidos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBoton, tab === 'productos' && styles.tabBotonActivo]}
            onPress={() => setTab('productos')}
          >
            <Ionicons
              name="fast-food-outline"
              size={16}
              color={tab === 'productos' ? '#c1121f' : '#999'}
            />
            <Text style={[styles.tabTexto, tab === 'productos' && styles.tabTextoActivo]}>Productos</Text>
          </TouchableOpacity>
        </View>

        {tab === 'pedidos' ? (
          pedidos.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.mensajeVacio}>🦗 Silencio total por acá...</Text>
              <Text style={styles.mensajeVacioSub}>Ni un pedido todavía. Los grillos están cantando.</Text>
            </View>
          ) : (
            <FlatList
              data={pedidos}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => {
                const siguiente = siguienteEstado(item.estado);
                return (
                  <View style={styles.card}>
                    <View style={styles.badgeEstado}>
                      <Text style={styles.badgeEstadoTexto}>{item.estado}</Text>
                    </View>
                    <Text style={styles.pedidoDireccion}>{item.direccionEnvio}</Text>

                    <View style={styles.desgloseComision}>
                      <View style={styles.filaDesglose}>
                        <Text style={styles.desgloseLabel}>Total del pedido</Text>
                        <Text style={styles.desgloseValor}>${item.total.toLocaleString('es-CL')}</Text>
                      </View>
                      <View style={styles.filaDesglose}>
                        <Text style={styles.desgloseLabelComision}>Comisión NEXO</Text>
                        <Text style={styles.desgloseValorComision}>
                          -${item.comisionPlataforma.toLocaleString('es-CL')}
                        </Text>
                      </View>
                      <View style={styles.divisorDesglose} />
                      <View style={styles.filaDesglose}>
                        <Text style={styles.desgloseLabelRecibes}>Recibes</Text>
                        <Text style={styles.pedidoTotal}>
                          ${(item.total - item.comisionPlataforma).toLocaleString('es-CL')}
                        </Text>
                      </View>
                    </View>

                    {siguiente ? (
                      <TouchableOpacity
                        style={styles.boton}
                        onPress={() => avanzarEstado(item.id, siguiente.endpoint)}
                        disabled={actualizandoId === item.id}
                      >
                        {actualizandoId === item.id ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <>
                            <Ionicons name={siguiente.icono} size={17} color="#fff" />
                            <Text style={styles.botonTexto}>{siguiente.accion}</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ) : (
                      item.estado === 'READY' && (
                        <View style={styles.avisoEsperando}>
                          <Ionicons name="bicycle-outline" size={14} color="#999" />
                          <Text style={styles.avisoEsperandoTexto}>Esperando que un conductor lo retire</Text>
                        </View>
                      )
                    )}
                  </View>
                );
              }}
            />
          )
        ) : (
          <FlatList
            data={productos}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              !mostrandoFormulario ? (
                <TouchableOpacity style={styles.botonAgregarProducto} onPress={() => setMostrandoFormulario(true)}>
                  <Ionicons name="add-circle" size={18} color="#fff" />
                  <Text style={styles.botonAgregarProductoTexto}>Publicar producto</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.formulario}>
                  <TextInput
                    style={styles.input}
                    placeholder="Nombre del producto"
                    value={nombreProducto}
                    onChangeText={(v) => setNombreProducto(limpiarTexto(v, LIMITES.nombre))}
                    maxLength={LIMITES.nombre}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Descripción"
                    value={descripcionProducto}
                    onChangeText={(v) => setDescripcionProducto(limpiarTexto(v, LIMITES.descripcion))}
                    maxLength={LIMITES.descripcion}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Precio"
                    value={precioProducto}
                    onChangeText={(v) => setPrecioProducto(limpiarNumero(v, LIMITES.precio))}
                    keyboardType="numeric"
                    maxLength={LIMITES.precio}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Stock"
                    value={stockProducto}
                    onChangeText={(v) => setStockProducto(limpiarNumero(v, LIMITES.stock))}
                    keyboardType="numeric"
                    maxLength={LIMITES.stock}
                  />
                  <View style={styles.formularioBotones}>
                    <TouchableOpacity style={styles.botonCancelar} onPress={() => setMostrandoFormulario(false)}>
                      <Text style={styles.botonCancelarTexto}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.botonGuardar} onPress={publicarProducto} disabled={guardando}>
                      {guardando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.botonGuardarTexto}>Publicar</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              )
            }
            ListEmptyComponent={
              !mostrandoFormulario ? (
                <View style={styles.center}>
                  <Text style={styles.mensajeVacio}>📦 Vacío total</Text>
                  <Text style={styles.mensajeVacioSub}>Publicá tu primer producto para empezar a vender.</Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <View style={[styles.card, !item.disponible && styles.cardDisabled]}>
                <Text style={styles.nombre}>{item.nombre}</Text>
                <Text style={styles.descripcion}>{item.descripcion}</Text>
                <View style={styles.filaPrecioStock}>
                  <Text style={styles.precio}>${item.precio.toLocaleString('es-CL')}</Text>
                  <View style={styles.stockChip}>
                    <Text style={styles.stockChipTexto}>Stock: {item.stock}</Text>
                  </View>
                </View>

                <View style={styles.accionesProducto}>
                  <TouchableOpacity style={styles.botonSecundario} onPress={() => cambiarDisponibilidad(item)}>
                    <Text style={styles.botonSecundarioTexto}>
                      {item.disponible ? 'Marcar no disponible' : 'Marcar disponible'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => eliminarProducto(item.id)}>
                    <Ionicons name="trash-outline" size={18} color="#c0392b" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#faf8f6', overflow: 'hidden' },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24,
    backgroundColor: '#faf8f6',
  },
  figuraCirculoGrande: {
    position: 'absolute', top: -50, right: -60, width: 180, height: 180,
    borderRadius: 90, backgroundColor: 'rgba(230,57,70,0.04)',
  },
  figuraCirculoChico: {
    position: 'absolute', top: 260, left: -40, width: 100, height: 100,
    borderRadius: 50, backgroundColor: 'rgba(230,57,70,0.06)',
  },

  headerTituloWrapper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconoWrapper: {
    width: 26, height: 26, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTituloTexto: { color: '#fff', fontSize: 17, fontWeight: '800' },

  headerAccionesWrapper: { flexDirection: 'row', gap: 8, marginRight: 10 },
  headerIconoCirculo: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4,
    elevation: 3,
  },
  headerBadge: {
    position: 'absolute', top: -2, right: -2,
    backgroundColor: '#c1121f', borderRadius: 9, minWidth: 18, height: 18,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2,
    elevation: 2,
  },
  headerBadgeTexto: { color: '#fff', fontSize: 9, fontWeight: 'bold' },

  headerTienda: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  headerFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nombreWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  iconoTienda: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6,
    elevation: 2,
  },
  nombreTienda: { fontSize: 19, fontWeight: '800', color: '#1d1d1d', flexShrink: 1 },
  botonEditar: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#fff', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4,
    elevation: 2,
  },
  botonEditarTexto: { color: '#c1121f', fontWeight: '700', fontSize: 12 },

  tabs: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 16,
    backgroundColor: '#fff', borderRadius: 14, padding: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6,
    elevation: 2,
  },
  tabBoton: {
    flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center',
    paddingVertical: 10, borderRadius: 10,
  },
  tabBotonActivo: { backgroundColor: '#fdf0f1' },
  tabTexto: { fontSize: 13, color: '#999', fontWeight: '700' },
  tabTextoActivo: { color: '#c1121f' },

  list: { padding: 16, paddingTop: 0 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8,
    elevation: 3,
  },
  cardDisabled: { opacity: 0.5 },

  badgeEstado: {
    alignSelf: 'flex-start', backgroundColor: '#fdf0f1', borderRadius: 20,
    paddingVertical: 4, paddingHorizontal: 12, marginBottom: 8,
  },
  badgeEstadoTexto: { fontSize: 11, fontWeight: '800', color: '#c1121f' },
  pedidoDireccion: { fontSize: 14, color: '#333', marginBottom: 12 },
  pedidoTotal: { fontSize: 18, fontWeight: '800', color: '#1d1d1d' },

  desgloseComision: { marginTop: 4, marginBottom: 12 },
  filaDesglose: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  desgloseLabel: { fontSize: 13, color: '#666' },
  desgloseValor: { fontSize: 13, fontWeight: '600', color: '#333' },
  desgloseLabelComision: { fontSize: 12, color: '#c0392b' },
  desgloseValorComision: { fontSize: 12, fontWeight: '600', color: '#c0392b' },
  divisorDesglose: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 4 },
  desgloseLabelRecibes: { fontSize: 14, fontWeight: '700', color: '#1d1d1d' },

  boton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: '#c1121f', borderRadius: 10, paddingVertical: 13,
    shadowColor: '#c1121f', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8,
    elevation: 4,
  },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 14.5 },

  avisoEsperando: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8,
  },
  avisoEsperandoTexto: { fontSize: 12.5, color: '#999', fontStyle: 'italic' },

  mensajeVacio: { fontSize: 16, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  mensajeVacioSub: { fontSize: 13, color: '#999', textAlign: 'center', paddingHorizontal: 16 },
  botonRegistrar: { backgroundColor: '#c1121f', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24, marginTop: 16 },
  botonRegistrarTexto: { color: '#fff', fontWeight: '700' },

  botonAgregarProducto: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: '#c1121f', borderRadius: 12, paddingVertical: 13, marginBottom: 14,
  },
  botonAgregarProductoTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },

  nombre: { fontSize: 16, fontWeight: '800', color: '#1d1d1d' },
  descripcion: { fontSize: 13, color: '#666', marginTop: 4, marginBottom: 10 },
  filaPrecioStock: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  precio: { fontSize: 17, fontWeight: '800', color: '#c1121f' },
  stockChip: { backgroundColor: '#f4f4f4', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 },
  stockChipTexto: { fontSize: 11, color: '#666', fontWeight: '600' },
  accionesProducto: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  botonSecundario: { borderWidth: 1.5, borderColor: '#c1121f', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  botonSecundarioTexto: { color: '#c1121f', fontSize: 12, fontWeight: '700' },

  formulario: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14 },
  input: { borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 10, backgroundColor: '#faf8f6' },
  formularioBotones: { flexDirection: 'row', gap: 10 },
  botonCancelar: { flex: 1, borderWidth: 1.5, borderColor: '#eee', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  botonCancelarTexto: { color: '#666', fontWeight: '700' },
  botonGuardar: { flex: 1, backgroundColor: '#c1121f', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  botonGuardarTexto: { color: '#fff', fontWeight: '700' },
});