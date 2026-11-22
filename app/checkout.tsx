import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { apiOrders, apiUsers } from '@/services/api';
import { useCart } from '@/context/CartContext';
import { haySesionActiva } from '@/hooks/useAuth';
import {
  MINIMO_CANJE,
  PESOS_POR_PUNTO_CANJE,
  TOPE_CANJE_PORCENTAJE,
  topeCanjePesos,
} from '@/services/puntos';
import { useFuncion } from '@/services/version';

type Direccion = {
  id: string;
  calle: string;
  ciudad: string;
  region: string;
  tipo: string;
};

const REGEX_TEXTO_LIBRE = /[^a-zA-Z0-9À-ÿñÑ\s.,°#-]/g;
const LIMITES = { calle: 80, ciudad: 40, region: 40 };

/** De a cuántos puntos sube o baja el selector. */
const PASO_PUNTOS = 10;

export default function CheckoutScreen() {
  const { tiendaId, items, subtotal, unidades, llevaAlcohol, vaciarCarrito } = useCart();
  const puntosActivos = useFuncion('puntos');

  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [direccionSeleccionada, setDireccionSeleccionada] = useState<string | null>(null);
  const [cargandoDirecciones, setCargandoDirecciones] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [obteniendoUbicacion, setObteniendoUbicacion] = useState(false);
  const [verificandoSesion, setVerificandoSesion] = useState(true);
  const [necesitaLogin, setNecesitaLogin] = useState(false);
  const [saldoPuntos, setSaldoPuntos] = useState(0);
  const [puntosElegidos, setPuntosElegidos] = useState(0);
  const [mayorDeEdad, setMayorDeEdad] = useState(false);

  const [mostrandoFormulario, setMostrandoFormulario] = useState(false);
  const [nuevaCalle, setNuevaCalle] = useState('');
  const [nuevaCiudad, setNuevaCiudad] = useState('');
  const [nuevaRegion, setNuevaRegion] = useState('');
  const [guardandoDireccion, setGuardandoDireccion] = useState(false);

  // Puntos: lo máximo que se puede usar es el menor entre el saldo y el tope del pedido
  const topeCanje = topeCanjePesos(subtotal);
  const maximoPuntos = Math.min(saldoPuntos, Math.floor(topeCanje / PESOS_POR_PUNTO_CANJE));
  const puedeUsarPuntos = maximoPuntos >= MINIMO_CANJE;
  const puntosUsados = puntosActivos && puedeUsarPuntos ? Math.min(puntosElegidos, maximoPuntos) : 0;
  const descuentoPuntos = puntosUsados * PESOS_POR_PUNTO_CANJE;

  const sumarPuntos = () =>
    setPuntosElegidos((p) => (p < MINIMO_CANJE ? MINIMO_CANJE : Math.min(maximoPuntos, p + PASO_PUNTOS)));
  const restarPuntos = () =>
    setPuntosElegidos((p) => (p <= MINIMO_CANJE ? 0 : Math.max(MINIMO_CANJE, p - PASO_PUNTOS)));

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

  const cargarSaldo = () => {
    apiUsers.get('/puntos/mios')
      .then((res) => setSaldoPuntos(Number(res.data?.saldo ?? 0)))
      .catch(() => setSaldoPuntos(0));
  };

  useEffect(() => {
    haySesionActiva().then((logueado) => {
      setVerificandoSesion(false);
      if (!logueado) {
        setNecesitaLogin(true);
        return;
      }
      cargarDirecciones();
      cargarSaldo();
    });
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

    if (llevaAlcohol && !mayorDeEdad) {
      Alert.alert('Confirmá tu edad', 'Para comprar alcohol tenés que confirmar que sos mayor de 18 años');
      return;
    }

    const direccionTexto = `${direccion.calle}, ${direccion.ciudad}, ${direccion.region}`;

    setProcesando(true);
    try {
      const resPedido = await apiOrders.post('/pedidos', {
        tiendaId,
        direccionEnvio: direccionTexto,
        items: items.map((i) => ({
          productoId: i.productoId,
          cantidad: i.cantidad,
          varianteId: i.varianteId ?? null,
          opcionesIds: i.opcionesIds ?? [],
          nota: i.nota ?? null,
        })),
        puntosACanjear: puntosUsados,
        confirmaMayorEdad: llevaAlcohol ? mayorDeEdad : false,
      });

      const pedidoId = resPedido.data.id;

      await apiOrders.post(`/pedidos/${pedidoId}/pagar`);

      vaciarCarrito();
      router.replace({ pathname: '/pedido/[id]', params: { id: pedidoId } });
    } catch (err: any) {
      const estado = err.response?.status;
      const mensaje =
        err.response?.data?.message ||
        (estado === 409 && puntosUsados > 0
          ? 'No se pudo procesar el pedido. Revisá que la tienda esté abierta y que tengas puntos suficientes.'
          : estado === 409
            ? 'Algún producto u opción ya no está disponible o la tienda está cerrada. Revisá tu carrito.'
            : estado === 400
              ? 'Revisá tu pedido: falta elegir alguna opción obligatoria o hay un dato inválido.'
              : 'No se pudo procesar el pedido');
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

  if (verificandoSesion) {
    return (
      <>
        {header}
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#c1121f" />
        </View>
      </>
    );
  }

  if (necesitaLogin) {
    return (
      <>
        {header}
        <View style={styles.center}>
          <Ionicons name="lock-closed-outline" size={32} color="#c9a3a3" style={{ marginBottom: 10 }} />
          <Text style={styles.mensajeVacio}>Necesitás una cuenta para pedir</Text>
          <Text style={styles.mensajeVacioSub}>
            Tu carrito te va a estar esperando cuando vuelvas
          </Text>
          <TouchableOpacity
            style={styles.botonLoginRequerido}
            onPress={() => router.push('/login' as any)}
          >
            <Text style={styles.botonLoginRequeridoTexto}>Iniciar sesión</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

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
  const gananciaConductor = 1200;
  const margenPlataformaEnvio = costoEnvio - gananciaConductor;
  const total = subtotal + costoEnvio - descuentoPuntos;
  const botonBloqueado = procesando || !direccionSeleccionada || (llevaAlcohol && !mayorDeEdad);

  const avisoSinPuntos =
    saldoPuntos < MINIMO_CANJE
      ? `Necesitás al menos ${MINIMO_CANJE} puntos para pagar con puntos.`
      : `Con este pedido podés usar hasta ${maximoPuntos} puntos (tope del ${TOPE_CANJE_PORCENTAJE} %). El mínimo es de ${MINIMO_CANJE}: sumá productos para poder usarlos.`;

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

        {llevaAlcohol && (
          <View style={styles.seccion}>
            <View style={styles.seccionHeader}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#1d1d1d" />
              <Text style={styles.seccionTitulo}>Verificación de edad</Text>
            </View>
            <Text style={styles.edadTexto}>
              Tu pedido incluye bebidas alcohólicas. La venta es solo para mayores de 18 años y
              el repartidor puede pedirte tu cédula al entregar.
            </Text>
            <TouchableOpacity
              style={[styles.edadCaja, mayorDeEdad && styles.edadCajaActiva]}
              onPress={() => setMayorDeEdad((v) => !v)}
              activeOpacity={0.8}
            >
              <View style={[styles.check, mayorDeEdad && styles.checkActivo]}>
                {mayorDeEdad && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.edadCajaTexto}>Confirmo que soy mayor de 18 años</Text>
            </TouchableOpacity>
          </View>
        )}

        {puntosActivos && saldoPuntos > 0 && (
          <View style={styles.seccion}>
            <View style={styles.seccionHeader}>
              <Ionicons name="star" size={18} color="#6d28d9" />
              <Text style={styles.seccionTitulo}>Pagar con puntos</Text>
            </View>
            <Text style={styles.puntosSaldo}>
              Tenés {saldoPuntos} puntos (1 punto = ${PESOS_POR_PUNTO_CANJE})
            </Text>

            {puedeUsarPuntos ? (
              <>
                <Text style={styles.puntosReglas}>
                  Podés usar entre {MINIMO_CANJE} y {maximoPuntos} puntos en este pedido ({TOPE_CANJE_PORCENTAJE} % del
                  subtotal de productos, sin el envío).
                </Text>

                <View style={styles.selectorPuntos}>
                  <TouchableOpacity
                    style={[styles.botonPaso, puntosUsados === 0 && styles.botonPasoInactivo]}
                    onPress={restarPuntos}
                    disabled={puntosUsados === 0}
                  >
                    <Ionicons name="remove" size={22} color="#fff" />
                  </TouchableOpacity>

                  <View style={styles.selectorValor}>
                    <Text style={styles.selectorPuntosNumero}>{puntosUsados}</Text>
                    <Text style={styles.selectorPuntosEquivale}>
                      {puntosUsados === 1 ? 'punto' : 'puntos'} = ${descuentoPuntos.toLocaleString('es-CL')}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.botonPaso, puntosUsados >= maximoPuntos && styles.botonPasoInactivo]}
                    onPress={sumarPuntos}
                    disabled={puntosUsados >= maximoPuntos}
                  >
                    <Ionicons name="add" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>

                <View style={styles.atajosPuntos}>
                  <TouchableOpacity
                    style={styles.atajoPuntos}
                    onPress={() => setPuntosElegidos(0)}
                    disabled={puntosUsados === 0}
                  >
                    <Text style={[styles.atajoPuntosTexto, puntosUsados === 0 && { opacity: 0.4 }]}>No usar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.atajoPuntos}
                    onPress={() => setPuntosElegidos(maximoPuntos)}
                    disabled={puntosUsados === maximoPuntos}
                  >
                    <Text style={[styles.atajoPuntosTexto, puntosUsados === maximoPuntos && { opacity: 0.4 }]}>
                      Usar el máximo ({maximoPuntos})
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={styles.puntosReglas}>{avisoSinPuntos}</Text>
            )}
          </View>
        )}

        <View style={styles.seccion}>
          <View style={styles.seccionHeader}>
            <Ionicons name="receipt-outline" size={18} color="#c1121f" />
            <Text style={styles.seccionTitulo}>Resumen del pedido</Text>
          </View>

          <View style={styles.fila}>
            <Text style={styles.filaLabel}>Subtotal ({unidades} {unidades === 1 ? 'unidad' : 'unidades'})</Text>
            <Text style={styles.filaValor}>${subtotal.toLocaleString('es-CL')}</Text>
          </View>
          {descuentoPuntos > 0 && (
            <View style={styles.fila}>
              <Text style={[styles.filaLabel, { color: '#6d28d9' }]}>Pagado con {puntosUsados} puntos</Text>
              <Text style={[styles.filaValor, { color: '#6d28d9' }]}>-${descuentoPuntos.toLocaleString('es-CL')}</Text>
            </View>
          )}
          <View style={styles.fila}>
            <Text style={styles.filaLabel}>Envío</Text>
            <Text style={styles.filaValor}>${costoEnvio.toLocaleString('es-CL')}</Text>
          </View>
          <Text style={styles.notaEnvio}>
            Del envío, ${gananciaConductor.toLocaleString('es-CL')} son para el conductor y ${margenPlataformaEnvio.toLocaleString('es-CL')} para NEXO
          </Text>
          <View style={[styles.fila, styles.filaTotal]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValor}>${total.toLocaleString('es-CL')}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.boton, botonBloqueado && styles.botonDeshabilitado]}
          onPress={confirmarPedido}
          disabled={botonBloqueado}
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
  mensajeVacio: { fontSize: 16, fontWeight: '700', color: '#1d1d1d', textAlign: 'center' },
  mensajeVacioSub: { fontSize: 13, color: '#999', textAlign: 'center', marginTop: 6, paddingHorizontal: 30 },
  botonLoginRequerido: {
    backgroundColor: '#c1121f', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32,
    marginTop: 20,
  },
  botonLoginRequeridoTexto: { color: '#fff', fontWeight: '800', fontSize: 15 },

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

  edadTexto: { fontSize: 12.5, color: '#666', lineHeight: 18, marginBottom: 12 },
  edadCaja: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderColor: '#eee', borderRadius: 12, padding: 14,
    backgroundColor: '#faf8f6',
  },
  edadCajaActiva: { borderColor: '#c1121f', backgroundColor: '#fdf0f1' },
  edadCajaTexto: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1d1d1d' },
  check: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#c1121f',
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff',
  },
  checkActivo: { backgroundColor: '#c1121f' },

  fila: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  filaLabel: { fontSize: 13.5, color: '#666' },
  filaValor: { fontSize: 13.5, fontWeight: '700', color: '#1d1d1d' },
  notaEnvio: { fontSize: 10.5, color: '#999', marginTop: -6, marginBottom: 10 },

  puntosSaldo: { fontSize: 12.5, color: '#6d28d9', fontWeight: '700', marginBottom: 6 },
  puntosReglas: { fontSize: 11.5, color: '#7a6a99', lineHeight: 16, marginBottom: 12 },
  selectorPuntos: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f6f2ff', borderRadius: 14, padding: 12, marginBottom: 10,
  },
  botonPaso: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#6d28d9',
    justifyContent: 'center', alignItems: 'center',
  },
  botonPasoInactivo: { backgroundColor: '#c4b5fd' },
  selectorValor: { alignItems: 'center', flex: 1 },
  selectorPuntosNumero: { fontSize: 26, fontWeight: '800', color: '#6d28d9' },
  selectorPuntosEquivale: { fontSize: 12, fontWeight: '600', color: '#7a6a99', marginTop: 2 },
  atajosPuntos: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  atajoPuntos: {
    flex: 1, borderWidth: 1.5, borderColor: '#c4b5fd', borderRadius: 10,
    paddingVertical: 9, alignItems: 'center',
  },
  atajoPuntosTexto: { color: '#6d28d9', fontWeight: '700', fontSize: 12.5 },
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