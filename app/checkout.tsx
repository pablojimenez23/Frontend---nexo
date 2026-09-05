import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { apiOrders, apiUsers } from '@/services/api';
import { useCart } from '@/context/CartContext';

type Direccion = {
  id: string;
  calle: string;
  ciudad: string;
  region: string;
  tipo: string;
};

const REGEX_TEXTO_LIBRE = /[^a-zA-Z0-9À-ÿñÑ\s.,°#-]/g;
const LIMITES = { calle: 80, ciudad: 40, region: 40 };

export default function CheckoutScreen() {
  const { tiendaId, items, subtotal, vaciarCarrito } = useCart();

  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [direccionSeleccionada, setDireccionSeleccionada] = useState<string | null>(null);
  const [cargandoDirecciones, setCargandoDirecciones] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [obteniendoUbicacion, setObteniendoUbicacion] = useState(false);

  const [mostrandoFormulario, setMostrandoFormulario] = useState(false);
  const [nuevaCalle, setNuevaCalle] = useState('');
  const [nuevaCiudad, setNuevaCiudad] = useState('');
  const [nuevaRegion, setNuevaRegion] = useState('');
  const [guardandoDireccion, setGuardandoDireccion] = useState(false);

  const cargarDirecciones = () => {
    setCargandoDirecciones(true);
    apiUsers.get('/direcciones')
      .then((res) => {
        setDirecciones(res.data);
        if (res.data.length > 0) {
          setDireccionSeleccionada(res.data[0].id);
        }
      })
      .finally(() => setCargandoDirecciones(false));
  };

  useEffect(() => {
    cargarDirecciones();
  }, []);

  const limpiarTexto = (valor: string, limite: number) =>
    valor.replace(REGEX_TEXTO_LIBRE, '').slice(0, limite);

  const validarDireccion = (): string | null => {
    if (nuevaCalle.trim().length < 5) return 'Ingresá la calle y el número completos';
    if (nuevaCiudad.trim().length < 2) return 'Ingresá una ciudad válida';
    if (nuevaRegion.trim().length < 2) return 'Ingresá una región válida';
    return null;
  };

  const guardarNuevaDireccion = async () => {
    const error = validarDireccion();
    if (error) {
      Alert.alert('Revisá los datos', error);
      return;
    }

    setGuardandoDireccion(true);
    try {
      const res = await apiUsers.post('/direcciones', {
        calle: nuevaCalle.trim(),
        ciudad: nuevaCiudad.trim(),
        region: nuevaRegion.trim(),
        tipo: 'CASA',
      });
      setDirecciones((prev) => [...prev, res.data]);
      setDireccionSeleccionada(res.data.id);
      setMostrandoFormulario(false);
      setNuevaCalle('');
      setNuevaCiudad('');
      setNuevaRegion('');
    } catch {
      Alert.alert('Error', 'No se pudo guardar la dirección. Intentá de nuevo.');
    } finally {
      setGuardandoDireccion(false);
    }
  };

  // Lógica compartida: pide permiso, geolocaliza, y devuelve los datos ya formateados
  const obtenerUbicacionActual = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu ubicación para esto');
      return null;
    }

    setObteniendoUbicacion(true);
    try {
      const posicion = await Location.getCurrentPositionAsync({});
      const [lugar] = await Location.reverseGeocodeAsync({
        latitude: posicion.coords.latitude,
        longitude: posicion.coords.longitude,
      });

      return {
        calle: `${lugar.street ?? ''} ${lugar.streetNumber ?? ''}`.trim() || 'Ubicación actual',
        ciudad: lugar.city ?? lugar.subregion ?? '',
        region: lugar.region ?? '',
        latitud: posicion.coords.latitude,
        longitud: posicion.coords.longitude,
      };
    } catch {
      Alert.alert('Error', 'No se pudo obtener tu ubicación');
      return null;
    } finally {
      setObteniendoUbicacion(false);
    }
  };

  // Guarda directo (botón principal, fuera del formulario)
  const usarUbicacionActual = async () => {
    const datos = await obtenerUbicacionActual();
    if (!datos) return;

    setObteniendoUbicacion(true);
    try {
      const res = await apiUsers.post('/direcciones', {
        ...datos,
        tipo: 'CASA',
      });
      setDirecciones((prev) => [...prev, res.data]);
      setDireccionSeleccionada(res.data.id);
      setMostrandoFormulario(false);
    } catch {
      Alert.alert('Error', 'No se pudo guardar la dirección');
    } finally {
      setObteniendoUbicacion(false);
    }
  };

  // Solo autocompleta los campos del formulario, sin guardar (botón dentro del formulario manual)
  const autocompletarConUbicacion = async () => {
    const datos = await obtenerUbicacionActual();
    if (!datos) return;

    setNuevaCalle(datos.calle);
    setNuevaCiudad(datos.ciudad);
    setNuevaRegion(datos.region);
  };

  const confirmarPedido = async () => {
    const direccion = direcciones.find((d) => d.id === direccionSeleccionada);
    if (!direccion) {
      Alert.alert('Falta la dirección', 'Elegí o agregá una dirección de entrega');
      return;
    }

    const direccionTexto = `${direccion.calle}, ${direccion.ciudad}, ${direccion.region}`;

    setProcesando(true);
    try {
      const resPedido = await apiOrders.post('/pedidos', {
        tiendaId,
        direccionEnvio: direccionTexto,
        items: items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })),
      });

      const pedidoId = resPedido.data.id;

      await apiOrders.post(`/pedidos/${pedidoId}/pagar`);

      vaciarCarrito();
      router.replace({ pathname: '/pedido/[id]', params: { id: pedidoId } });
    } catch (err: any) {
      const mensaje = err.response?.data?.message || 'No se pudo procesar el pedido';
      Alert.alert('Error', mensaje);
    } finally {
      setProcesando(false);
    }
  };

  const header = (
    <Stack.Screen
      options={{
        headerShown: true,
        headerTitle: 'Confirmar pedido',
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#1d1d1d" />
          </TouchableOpacity>
        ),
      }}
    />
  );

  if (items.length === 0) {
    return (
      <>
        {header}
        <View style={styles.center}>
          <Ionicons name="cart-outline" size={32} color="#c9a3a3" style={{ marginBottom: 10 }} />
          <Text style={styles.mensajeVacio}>Tu carrito está vacío</Text>
        </View>
      </>
    );
  }

  const costoEnvio = 2000;
  const total = subtotal + costoEnvio;

  return (
    <>
      {header}
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.figuraCirculoGrande} />
        <View style={styles.figuraCirculoChico} />

        <View style={styles.seccion}>
          <View style={styles.seccionHeader}>
            <Ionicons name="location-outline" size={18} color="#c1121f" />
            <Text style={styles.seccionTitulo}>Dirección de entrega</Text>
          </View>

          {cargandoDirecciones ? (
            <ActivityIndicator style={{ marginVertical: 16 }} color="#c1121f" />
          ) : (
            <>
              {direcciones.map((dir) => (
                <TouchableOpacity
                  key={dir.id}
                  style={[
                    styles.direccionCard,
                    direccionSeleccionada === dir.id && styles.direccionCardActiva,
                  ]}
                  onPress={() => setDireccionSeleccionada(dir.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.radioIndicador}>
                    {direccionSeleccionada === dir.id && <View style={styles.radioIndicadorLleno} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.direccionTipo}>{dir.tipo}</Text>
                    <Text style={styles.direccionTexto}>{dir.calle}, {dir.ciudad}, {dir.region}</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {!mostrandoFormulario && (
                <>
                  <TouchableOpacity
                    style={styles.botonUbicacion}
                    onPress={usarUbicacionActual}
                    disabled={obteniendoUbicacion}
                  >
                    {obteniendoUbicacion ? (
                      <ActivityIndicator color="#c1121f" size="small" />
                    ) : (
                      <>
                        <Ionicons name="navigate-outline" size={16} color="#c1121f" />
                        <Text style={styles.botonUbicacionTexto}>Usar mi ubicación actual</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.botonAgregarDireccion}
                    onPress={() => setMostrandoFormulario(true)}
                  >
                    <Ionicons name="add-circle-outline" size={16} color="#c1121f" />
                    <Text style={styles.botonAgregarDireccionTexto}>
                      {direcciones.length === 0 ? 'Ingresar dirección manualmente' : 'Agregar otra dirección'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {mostrandoFormulario && (
                <View style={styles.formulario}>
                  <TouchableOpacity
                    style={styles.botonUbicacionForm}
                    onPress={autocompletarConUbicacion}
                    disabled={obteniendoUbicacion}
                  >
                    {obteniendoUbicacion ? (
                      <ActivityIndicator color="#c1121f" size="small" />
                    ) : (
                      <>
                        <Ionicons name="navigate-outline" size={15} color="#c1121f" />
                        <Text style={styles.botonUbicacionFormTexto}>Usar mi ubicación actual</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TextInput
                    style={styles.input}
                    placeholder="Calle y número"
                    value={nuevaCalle}
                    onChangeText={(v) => setNuevaCalle(limpiarTexto(v, LIMITES.calle))}
                    maxLength={LIMITES.calle}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Ciudad"
                    value={nuevaCiudad}
                    onChangeText={(v) => setNuevaCiudad(limpiarTexto(v, LIMITES.ciudad))}
                    maxLength={LIMITES.ciudad}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Región"
                    value={nuevaRegion}
                    onChangeText={(v) => setNuevaRegion(limpiarTexto(v, LIMITES.region))}
                    maxLength={LIMITES.region}
                  />
                  <View style={styles.formularioBotones}>
                    {direcciones.length > 0 && (
                      <TouchableOpacity
                        style={styles.botonCancelarForm}
                        onPress={() => setMostrandoFormulario(false)}
                      >
                        <Text style={styles.botonCancelarFormTexto}>Cancelar</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.botonGuardarDireccion}
                      onPress={guardarNuevaDireccion}
                      disabled={guardandoDireccion}
                    >
                      {guardandoDireccion ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.botonGuardarDireccionTexto}>Guardar dirección</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.seccion}>
          <View style={styles.seccionHeader}>
            <Ionicons name="receipt-outline" size={18} color="#c1121f" />
            <Text style={styles.seccionTitulo}>Resumen del pedido</Text>
          </View>

          <View style={styles.fila}>
            <Text style={styles.filaLabel}>Subtotal ({items.length} {items.length === 1 ? 'producto' : 'productos'})</Text>
            <Text style={styles.filaValor}>${subtotal.toLocaleString('es-CL')}</Text>
          </View>
          <View style={styles.fila}>
            <Text style={styles.filaLabel}>Envío</Text>
            <Text style={styles.filaValor}>${costoEnvio.toLocaleString('es-CL')}</Text>
          </View>
          <View style={[styles.fila, styles.filaTotal]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValor}>${total.toLocaleString('es-CL')}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.boton, (procesando || !direccionSeleccionada) && styles.botonDeshabilitado]}
          onPress={confirmarPedido}
          disabled={procesando || !direccionSeleccionada}
        >
          {procesando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
              <Text style={styles.botonTexto}>Pagar y confirmar</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#faf8f6',
  },
  mensajeVacio: { fontSize: 16, fontWeight: '700', color: '#1d1d1d' },

  container: { flex: 1, backgroundColor: '#faf8f6', padding: 20 },

  figuraCirculoGrande: {
    position: 'absolute', top: -40, right: -50, width: 150, height: 150,
    borderRadius: 75, backgroundColor: 'rgba(230,57,70,0.04)',
  },
  figuraCirculoChico: {
    position: 'absolute', top: 300, left: -30, width: 90, height: 90,
    borderRadius: 45, backgroundColor: 'rgba(230,57,70,0.06)',
  },

  seccion: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8,
    elevation: 2,
  },
  seccionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  seccionTitulo: { fontSize: 15, fontWeight: '800', color: '#1d1d1d' },

  direccionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderColor: '#eee', borderRadius: 12, padding: 14, marginBottom: 10,
    backgroundColor: '#faf8f6',
  },
  direccionCardActiva: {
    borderColor: '#c1121f', backgroundColor: '#fdf0f1',
  },
  radioIndicador: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#c1121f',
    justifyContent: 'center', alignItems: 'center',
  },
  radioIndicadorLleno: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#c1121f' },
  direccionTipo: { fontSize: 11, fontWeight: '800', color: '#c1121f', marginBottom: 2, textTransform: 'uppercase' },
  direccionTexto: { fontSize: 13.5, color: '#333' },

  botonUbicacion: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#c1121f', borderRadius: 10, paddingVertical: 11,
    marginBottom: 8,
  },
  botonUbicacionTexto: { color: '#c1121f', fontWeight: '700', fontSize: 13.5 },

  botonUbicacionForm: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#f3d9d9', borderRadius: 10, paddingVertical: 9,
    marginBottom: 12, backgroundColor: '#fdf0f1',
  },
  botonUbicacionFormTexto: { color: '#c1121f', fontWeight: '700', fontSize: 12.5 },

  botonAgregarDireccion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 6 },
  botonAgregarDireccionTexto: { color: '#c1121f', fontWeight: '700', fontSize: 13.5 },

  formulario: { marginTop: 10 },
  input: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 12,
    fontSize: 14, marginBottom: 10, backgroundColor: '#faf8f6',
  },
  formularioBotones: { flexDirection: 'row', gap: 10, marginTop: 2 },
  botonCancelarForm: {
    flex: 1, borderWidth: 1.5, borderColor: '#eee', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  botonCancelarFormTexto: { color: '#666', fontWeight: '700' },
  botonGuardarDireccion: {
    flex: 1, backgroundColor: '#c1121f', borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  botonGuardarDireccionTexto: { color: '#fff', fontWeight: '700' },

  fila: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  filaLabel: { fontSize: 13.5, color: '#666' },
  filaValor: { fontSize: 13.5, fontWeight: '700', color: '#1d1d1d' },
  filaTotal: { marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0', marginBottom: 0 },
  totalLabel: { fontSize: 16, fontWeight: '800', color: '#1d1d1d' },
  totalValor: { fontSize: 18, fontWeight: '800', color: '#c1121f' },

  boton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: '#c1121f', borderRadius: 12, paddingVertical: 16, marginBottom: 8,
    shadowColor: '#c1121f', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10,
    elevation: 4,
  },
  botonDeshabilitado: { backgroundColor: '#e5a8a8', shadowOpacity: 0 },
  botonTexto: { color: '#fff', fontWeight: '800', fontSize: 16 },
});