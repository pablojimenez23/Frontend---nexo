import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity,
  TextInput, Alert, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useEffect, useState } from 'react';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiProducts } from '@/services/api';
import { useCart, totalLinea, NuevoItemCarrito } from '@/context/CartContext';
import { puntosDe } from '@/services/puntos';
import { ofertaActiva, tiempoRestante } from '@/services/ofertas';
import { Producto, Grupo, etiquetasDe, lista } from '@/services/catalogo';
import { useFuncion } from '@/services/version';

const MAX_NOTA = 140;
const MAX_UNIDADES = 20;

const peso = (n: number) => `$${n.toLocaleString('es-CL')}`;

export default function ProductoDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { agregarItem, reemplazarCarrito } = useCart();
  const puntosActivos = useFuncion('puntos');
  const ofertasActivas = useFuncion('ofertas');

  const [producto, setProducto] = useState<Producto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [varianteId, setVarianteId] = useState<string | null>(null);
  const [elegidas, setElegidas] = useState<Record<string, string[]>>({});
  const [nota, setNota] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [ahora, setAhora] = useState(Date.now());

  useEffect(() => {
    setCargando(true);
    setError(false);
    apiProducts.get(`/productos/${id}`)
      .then((res) => {
        const p: Producto = res.data;
        setProducto(p);
        const primera = (p.variantes ?? []).find((v) => v.disponible && v.stock > 0);
        setVarianteId(primera?.id ?? null);
      })
      .catch(() => setError(true))
      .finally(() => setCargando(false));
  }, [id]);

  useEffect(() => {
    const timer = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const encabezado = (
    <Stack.Screen
      options={{
        headerShown: true,
        headerTitle: '',
        headerStyle: { backgroundColor: '#c1121f' },
        headerTintColor: '#fff',
        headerShadowVisible: false,
      }}
    />
  );

  if (cargando) {
    return (
      <>
        {encabezado}
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#c1121f" />
        </View>
      </>
    );
  }

  if (error || !producto) {
    return (
      <>
        {encabezado}
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={32} color="#c9a3a3" style={{ marginBottom: 10 }} />
          <Text style={styles.mensajeVacio}>No se pudo cargar el producto</Text>
        </View>
      </>
    );
  }

  const variantes = producto.variantes ?? [];
  const grupos = producto.grupos ?? [];
  const variante = variantes.find((v) => v.id === varianteId) ?? null;
  const oferta = ofertasActivas && producto.oferta && ofertaActiva(producto.oferta.fin, ahora) ? producto.oferta : null;

  const precioBase = variante ? variante.precio : producto.precio;
  const precioOfertaBase = oferta
    ? (variante ? (variante.precioOferta ?? null) : oferta.precioOferta)
    : null;
  const hayOfertaVisible = precioOfertaBase != null && precioOfertaBase < precioBase;

  const opcionesElegidas = grupos.flatMap((g) =>
    g.opciones.filter((o) => (elegidas[g.id] ?? []).includes(o.id))
  );
  const opcionesUnitario = opcionesElegidas.reduce((a, o) => a + Number(o.precioAdicional ?? 0), 0);

  const faltantes = grupos.filter((g) => (elegidas[g.id]?.length ?? 0) < g.minimo);
  const sinVariante = variantes.length > 0 && !variante;
  const stockDisponible = variante ? variante.stock : producto.stock;
  const agotado = !producto.disponible || stockDisponible <= 0;
  const bloqueado = agotado || sinVariante || faltantes.length > 0;
  const maximoUnidades = Math.max(1, Math.min(stockDisponible, MAX_UNIDADES));
  const cantidadFinal = Math.min(cantidad, maximoUnidades);

  const etiquetaVariante = producto.etiquetaVariante ?? 'Opción';
  const etiquetas = etiquetasDe(producto.atributos);
  const ingredientes = lista(producto.atributos?.ingredientes);
  const alergenos = lista(producto.atributos?.alergenos);

  const itemNuevo: NuevoItemCarrito = {
    productoId: producto.id,
    nombre: producto.nombre,
    precio: precioBase,
    cantidad: cantidadFinal,
    varianteId: variante?.id ?? null,
    varianteNombre: variante?.nombre ?? null,
    opcionesIds: opcionesElegidas.map((o) => o.id),
    opcionesTexto: opcionesElegidas.length > 0 ? opcionesElegidas.map((o) => o.nombre).join(', ') : null,
    opcionesUnitario,
    nota: nota.trim() || null,
    requiereMayorEdad: !!producto.requiereMayorEdad,
    precioOferta: hayOfertaVisible ? precioOfertaBase : null,
    limiteOferta: hayOfertaVisible ? oferta?.limitePorPedido ?? null : null,
    unidadesOfertaDisponibles: hayOfertaVisible ? oferta?.unidadesDisponibles ?? null : null,
    ofertaFin: hayOfertaVisible ? oferta?.fin ?? null : null,
  };
  const totalEstimado = totalLinea({ ...itemNuevo, lineaId: '' }, ahora);

  const textoBoton = agotado
    ? 'Sin stock'
    : sinVariante
      ? `Elegí ${etiquetaVariante.toLowerCase()}`
      : faltantes.length > 0
        ? `Elegí: ${faltantes.map((g) => g.nombre).join(', ')}`
        : `Agregar · ${peso(totalEstimado)}`;

  const alternarOpcion = (grupo: Grupo, opcionId: string) => {
    setElegidas((prev) => {
      const actuales = prev[grupo.id] ?? [];
      if (actuales.includes(opcionId)) {
        // En un grupo obligatorio de una sola opción no se puede dejar vacío
        if (grupo.minimo >= 1 && grupo.maximo === 1) return prev;
        return { ...prev, [grupo.id]: actuales.filter((o) => o !== opcionId) };
      }
      if (grupo.maximo === 1) {
        return { ...prev, [grupo.id]: [opcionId] };
      }
      if (actuales.length >= grupo.maximo) {
        return prev;
      }
      return { ...prev, [grupo.id]: [...actuales, opcionId] };
    });
  };

  const agregar = () => {
    if (bloqueado) return;
    const exito = agregarItem(producto.tiendaId, itemNuevo);
    if (exito) {
      router.back();
      return;
    }
    Alert.alert(
      'Solo una tienda por pedido',
      'Ya tenés productos de otra tienda en el carrito. ¿Querés vaciarlo y empezar con este producto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Vaciar y agregar',
          style: 'destructive',
          onPress: () => {
            reemplazarCarrito(producto.tiendaId, itemNuevo);
            router.back();
          },
        },
      ]
    );
  };

  const subtextoGrupo = (g: Grupo) => {
    if (g.maximo === 1) return 'Elegí 1';
    if (g.minimo > 0) return `Elegí entre ${g.minimo} y ${g.maximo}`;
    return `Elegí hasta ${g.maximo}`;
  };

  return (
    <>
      {encabezado}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.pantalla}>
          <ScrollView contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
            {/* Imagen o marcador */}
            <View style={styles.hero}>
              {producto.imagenUrl ? (
                <Image source={{ uri: producto.imagenUrl }} style={styles.heroImagen} resizeMode="cover" />
              ) : (
                <>
                  <View style={styles.figuraCirculoGrande} />
                  <View style={styles.figuraCirculoChico} />
                  <View style={styles.heroIcono}>
                    <Ionicons name="fast-food-outline" size={44} color="#c1121f" />
                  </View>
                </>
              )}
            </View>

            <View style={styles.cuerpo}>
              {/* Nombre y precio */}
              <View style={styles.filaBadges}>
                {producto.destacado && (
                  <View style={[styles.badge, { backgroundColor: '#fffaf0' }]}>
                    <Ionicons name="star" size={11} color="#8a6109" />
                    <Text style={[styles.badgeTexto, { color: '#8a6109' }]}>Destacado</Text>
                  </View>
                )}
                {producto.requiereMayorEdad && (
                  <View style={[styles.badge, { backgroundColor: '#1d1d1d' }]}>
                    <Text style={[styles.badgeTexto, { color: '#fff' }]}>+18</Text>
                  </View>
                )}
                {hayOfertaVisible && oferta && (
                  <View style={[styles.badge, { backgroundColor: '#c1121f' }]}>
                    <Ionicons name="flash" size={11} color="#fff" />
                    <Text style={[styles.badgeTexto, { color: '#fff' }]}>-{oferta.porcentaje} %</Text>
                  </View>
                )}
              </View>

              <Text style={styles.nombre}>{producto.nombre}</Text>

              <View style={styles.filaPrecio}>
                {hayOfertaVisible ? (
                  <>
                    <Text style={styles.precio}>{peso(precioOfertaBase as number)}</Text>
                    <Text style={styles.precioTachado}>{peso(precioBase)}</Text>
                  </>
                ) : (
                  <Text style={styles.precio}>{peso(precioBase)}</Text>
                )}
              </View>
              {puntosActivos && (
                <Text style={styles.puntosPrecio}>
                  o ◆ {puntosDe(hayOfertaVisible ? (precioOfertaBase as number) : precioBase)} pts
                </Text>
              )}

              {hayOfertaVisible && oferta && (
                <Text style={styles.ofertaInfo}>
                  Termina en {tiempoRestante(oferta.fin, ahora)} · máx. {oferta.limitePorPedido} por pedido
                  {oferta.unidadesDisponibles != null ? ` · quedan ${oferta.unidadesDisponibles}` : ''}
                </Text>
              )}

              {producto.descripcion ? (
                <Text style={styles.descripcion}>{producto.descripcion}</Text>
              ) : null}

              {(etiquetas.length > 0 || (producto.personas ?? 0) > 0) && (
                <View style={styles.filaEtiquetas}>
                  {(producto.personas ?? 0) > 0 && (
                    <View style={styles.etiqueta}>
                      <Ionicons name="people-outline" size={12} color="#c1121f" />
                      <Text style={styles.etiquetaTexto}>
                        Para {producto.personas} {producto.personas === 1 ? 'persona' : 'personas'}
                      </Text>
                    </View>
                  )}
                  {etiquetas.map((e) => (
                    <View key={e} style={styles.etiqueta}>
                      <Text style={styles.etiquetaTexto}>{e}</Text>
                    </View>
                  ))}
                </View>
              )}

              {ingredientes.length > 0 && (
                <View style={styles.bloqueInfo}>
                  <Text style={styles.bloqueTitulo}>Ingredientes</Text>
                  <Text style={styles.bloqueTexto}>{ingredientes.join(', ')}</Text>
                </View>
              )}
              {alergenos.length > 0 && (
                <View style={styles.bloqueInfo}>
                  <Text style={styles.bloqueTitulo}>Alérgenos</Text>
                  <Text style={styles.bloqueTexto}>{alergenos.join(', ')}</Text>
                </View>
              )}
            </View>

            {/* Tamaños */}
            {variantes.length > 0 && (
              <View style={styles.seccion}>
                <View style={styles.seccionEncabezado}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.seccionTitulo}>{etiquetaVariante}</Text>
                    <Text style={styles.seccionSub}>Elegí 1</Text>
                  </View>
                  <View style={[styles.marca, styles.marcaObligatoria]}>
                    <Text style={styles.marcaObligatoriaTexto}>Obligatorio</Text>
                  </View>
                </View>

                {variantes.map((v) => {
                  const activa = v.id === varianteId;
                  const agotadaV = !v.disponible || v.stock <= 0;
                  const conOfertaV = !!oferta && v.precioOferta != null && v.precioOferta < v.precio;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[styles.fila, activa && styles.filaActiva, agotadaV && styles.filaDeshabilitada]}
                      onPress={() => setVarianteId(v.id)}
                      disabled={agotadaV}
                      activeOpacity={0.8}
                    >
                      <View style={styles.radio}>
                        {activa && <View style={styles.radioLleno} />}
                      </View>
                      <Text style={styles.filaNombre}>{v.nombre}</Text>
                      {agotadaV ? (
                        <Text style={styles.filaAgotado}>Agotado</Text>
                      ) : conOfertaV ? (
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.filaPrecioOferta}>{peso(v.precioOferta as number)}</Text>
                          <Text style={styles.filaPrecioTachado}>{peso(v.precio)}</Text>
                        </View>
                      ) : (
                        <Text style={styles.filaPrecioTexto}>{peso(v.precio)}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Grupos de opciones */}
            {grupos.map((g) => {
              const marcadas = elegidas[g.id] ?? [];
              const obligatorio = g.minimo > 0;
              return (
                <View key={g.id} style={styles.seccion}>
                  <View style={styles.seccionEncabezado}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.seccionTitulo}>{g.nombre}</Text>
                      <Text style={styles.seccionSub}>
                        {subtextoGrupo(g)}{g.maximo > 1 ? ` · ${marcadas.length}/${g.maximo}` : ''}
                      </Text>
                    </View>
                    <View style={[styles.marca, obligatorio ? styles.marcaObligatoria : styles.marcaOpcional]}>
                      <Text style={obligatorio ? styles.marcaObligatoriaTexto : styles.marcaOpcionalTexto}>
                        {obligatorio ? 'Obligatorio' : 'Opcional'}
                      </Text>
                    </View>
                  </View>

                  {g.opciones.map((o) => {
                    const activa = marcadas.includes(o.id);
                    const deshabilitada = !o.disponible;
                    const unica = g.maximo === 1;
                    return (
                      <TouchableOpacity
                        key={o.id}
                        style={[styles.fila, activa && styles.filaActiva, deshabilitada && styles.filaDeshabilitada]}
                        onPress={() => alternarOpcion(g, o.id)}
                        disabled={deshabilitada}
                        activeOpacity={0.8}
                      >
                        {unica ? (
                          <View style={styles.radio}>
                            {activa && <View style={styles.radioLleno} />}
                          </View>
                        ) : (
                          <View style={[styles.check, activa && styles.checkActivo]}>
                            {activa && <Ionicons name="checkmark" size={14} color="#fff" />}
                          </View>
                        )}
                        <Text style={styles.filaNombre}>{o.nombre}</Text>
                        {deshabilitada ? (
                          <Text style={styles.filaAgotado}>No disponible</Text>
                        ) : Number(o.precioAdicional) > 0 ? (
                          <Text style={styles.filaPrecioTexto}>+{peso(Number(o.precioAdicional))}</Text>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}

            {/* Nota */}
            <View style={styles.seccion}>
              <View style={styles.seccionEncabezado}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.seccionTitulo}>Nota para la tienda</Text>
                  <Text style={styles.seccionSub}>Por ejemplo: sin cebolla, bien cocido</Text>
                </View>
                <View style={[styles.marca, styles.marcaOpcional]}>
                  <Text style={styles.marcaOpcionalTexto}>Opcional</Text>
                </View>
              </View>
              <TextInput
                style={styles.inputNota}
                placeholder="Escribí tu nota"
                value={nota}
                onChangeText={(v) => setNota(v.slice(0, MAX_NOTA))}
                maxLength={MAX_NOTA}
                multiline
              />
              <Text style={styles.contadorNota}>{nota.length}/{MAX_NOTA}</Text>
            </View>
          </ScrollView>

          {/* Barra inferior */}
          <SafeAreaView edges={['bottom']} style={styles.barraInferior}>
            <View style={styles.barraContenido}>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepperBoton}
                  onPress={() => setCantidad(Math.max(1, cantidadFinal - 1))}
                  disabled={cantidadFinal <= 1}
                >
                  <Ionicons name="remove" size={18} color={cantidadFinal <= 1 ? '#d9b3b3' : '#c1121f'} />
                </TouchableOpacity>
                <Text style={styles.stepperCantidad}>{cantidadFinal}</Text>
                <TouchableOpacity
                  style={styles.stepperBoton}
                  onPress={() => setCantidad(Math.min(maximoUnidades, cantidadFinal + 1))}
                  disabled={cantidadFinal >= maximoUnidades}
                >
                  <Ionicons name="add" size={18} color={cantidadFinal >= maximoUnidades ? '#d9b3b3' : '#c1121f'} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.botonAgregar, bloqueado && styles.botonAgregarDeshabilitado]}
                onPress={agregar}
                disabled={bloqueado}
                activeOpacity={0.85}
              >
                <Text style={styles.botonAgregarTexto} numberOfLines={1}>{textoBoton}</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20,
    backgroundColor: '#faf8f6',
  },
  mensajeVacio: { fontSize: 15, color: '#666', textAlign: 'center' },

  pantalla: { flex: 1, backgroundColor: '#faf8f6' },

  hero: {
    height: 170, backgroundColor: '#fdf0f1', justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  heroImagen: { width: '100%', height: '100%' },
  heroIcono: {
    width: 84, height: 84, borderRadius: 24, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8,
    elevation: 3,
  },
  figuraCirculoGrande: {
    position: 'absolute', top: -50, right: -50, width: 170, height: 170,
    borderRadius: 85, backgroundColor: 'rgba(230,57,70,0.07)',
  },
  figuraCirculoChico: {
    position: 'absolute', bottom: -20, left: -20, width: 90, height: 90,
    borderRadius: 45, backgroundColor: 'rgba(230,57,70,0.08)',
  },

  cuerpo: { padding: 18 },
  filaBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8,
  },
  badgeTexto: { fontSize: 11, fontWeight: '800' },

  nombre: { fontSize: 22, fontWeight: '800', color: '#1d1d1d' },
  filaPrecio: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6 },
  precio: { fontSize: 20, fontWeight: '800', color: '#c1121f' },
  precioTachado: { fontSize: 14, color: '#999', textDecorationLine: 'line-through' },
  puntosPrecio: { fontSize: 12, fontWeight: '700', color: '#6d28d9', marginTop: 2 },
  ofertaInfo: { fontSize: 12, color: '#c1121f', fontWeight: '600', marginTop: 8 },
  descripcion: { fontSize: 14, color: '#666', lineHeight: 20, marginTop: 12 },

  filaEtiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  etiqueta: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fdf0f1', borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10,
  },
  etiquetaTexto: { fontSize: 12, fontWeight: '700', color: '#c1121f' },

  bloqueInfo: { marginTop: 14 },
  bloqueTitulo: { fontSize: 12, fontWeight: '800', color: '#999', textTransform: 'uppercase', marginBottom: 3 },
  bloqueTexto: { fontSize: 13.5, color: '#444', lineHeight: 19 },

  seccion: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8,
    elevation: 2,
  },
  seccionEncabezado: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  seccionTitulo: { fontSize: 15.5, fontWeight: '800', color: '#1d1d1d' },
  seccionSub: { fontSize: 12, color: '#999', marginTop: 2 },
  marca: { borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  marcaObligatoria: { backgroundColor: '#c1121f' },
  marcaObligatoriaTexto: { color: '#fff', fontSize: 11, fontWeight: '800' },
  marcaOpcional: { backgroundColor: '#f4f4f4' },
  marcaOpcionalTexto: { color: '#888', fontSize: 11, fontWeight: '800' },

  fila: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderColor: '#eee', borderRadius: 12, padding: 13, marginBottom: 8,
    backgroundColor: '#faf8f6',
  },
  filaActiva: { borderColor: '#c1121f', backgroundColor: '#fdf0f1' },
  filaDeshabilitada: { opacity: 0.45 },
  filaNombre: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1d1d1d' },
  filaPrecioTexto: { fontSize: 13.5, fontWeight: '700', color: '#1d1d1d' },
  filaPrecioOferta: { fontSize: 13.5, fontWeight: '800', color: '#c1121f' },
  filaPrecioTachado: { fontSize: 11, color: '#999', textDecorationLine: 'line-through' },
  filaAgotado: { fontSize: 11.5, fontWeight: '700', color: '#999' },

  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#c1121f',
    justifyContent: 'center', alignItems: 'center',
  },
  radioLleno: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#c1121f' },
  check: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: '#c1121f',
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff',
  },
  checkActivo: { backgroundColor: '#c1121f' },

  inputNota: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 12,
    fontSize: 14, minHeight: 64, textAlignVertical: 'top', backgroundColor: '#faf8f6',
  },
  contadorNota: { fontSize: 11, color: '#999', textAlign: 'right', marginTop: 4 },

  barraInferior: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  barraContenido: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
  },
  stepper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#faf8f6', borderRadius: 24, paddingHorizontal: 6, paddingVertical: 6,
  },
  stepperBoton: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
    elevation: 1,
  },
  stepperCantidad: { fontSize: 16, fontWeight: '800', color: '#1d1d1d', minWidth: 20, textAlign: 'center' },
  botonAgregar: {
    flex: 1, backgroundColor: '#c1121f', borderRadius: 12, paddingVertical: 15,
    paddingHorizontal: 14, alignItems: 'center',
    shadowColor: '#c1121f', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10,
    elevation: 4,
  },
  botonAgregarDeshabilitado: { backgroundColor: '#e5a8a8', shadowOpacity: 0, elevation: 0 },
  botonAgregarTexto: { color: '#fff', fontWeight: '800', fontSize: 15 },
});