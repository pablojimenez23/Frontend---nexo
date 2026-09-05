import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiOrders, apiStores, apiUsers } from '@/services/api';

type Pedido = {
  id: string;
  estado: string;
  subtotal: number;
  costoEnvio: number;
  total: number;
  direccionEnvio: string;
  tiendaId: string;
  conductorId: string | null;
};

const ESTADOS: Record<string, {
  titulo: string;
  label: string;
  color: string;
  fondo: string;
  icono: keyof typeof Ionicons.glyphMap;
}> = {
  CREATED: { titulo: 'Pedido creado', label: 'Pendiente de pago', color: '#8a6109', fondo: '#fffaf0', icono: 'time-outline' },
  PAID: { titulo: '¡Pedido pagado!', label: 'Pagado', color: '#8a6109', fondo: '#fffaf0', icono: 'card-outline' },
  READY: { titulo: '¡Pedido listo!', label: 'Listo para despacho', color: '#1e6f64', fondo: '#e3f6f4', icono: 'bag-check-outline' },
  DELIVERING: { titulo: '¡Va en camino!', label: 'En camino', color: '#c1121f', fondo: '#fdf0f1', icono: 'bicycle-outline' },
  DELIVERED: { titulo: '¡Pedido entregado!', label: 'Entregado · confirmá recepción', color: '#c1121f', fondo: '#fdf0f1', icono: 'cube-outline' },
  COMPLETED: { titulo: '¡Pedido completado!', label: 'Completado', color: '#1e6f64', fondo: '#e3f6f4', icono: 'checkmark-done-outline' },
  CANCELLED: { titulo: 'Pedido cancelado', label: 'Cancelado', color: '#999', fondo: '#f4f4f4', icono: 'close-circle-outline' },
};

export default function PedidoConfirmadoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [cargando, setCargando] = useState(true);
  const [confirmando, setConfirmando] = useState(false);

  const [pasoCalificacion, setPasoCalificacion] = useState<'ninguno' | 'tienda' | 'conductor'>('ninguno');
  const [puntaje, setPuntaje] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviandoCalificacion, setEnviandoCalificacion] = useState(false);

  const cargarPedido = () => {
    apiOrders.get(`/pedidos/${id}`)
      .then((res) => setPedido(res.data))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargarPedido();
  }, [id]);

  const confirmarRecepcion = async () => {
    setConfirmando(true);
    try {
      const res = await apiOrders.patch(`/pedidos/${id}/confirmar-recepcion`);
      setPedido(res.data);
      setPasoCalificacion('tienda');
    } finally {
      setConfirmando(false);
    }
  };

  const abrirPasoSiguiente = () => {
    setPuntaje(0);
    setComentario('');
    if (pasoCalificacion === 'tienda' && pedido?.conductorId) {
      setPasoCalificacion('conductor');
    } else {
      setPasoCalificacion('ninguno');
    }
  };

  const enviarCalificacion = async () => {
    if (puntaje === 0) return;
    setEnviandoCalificacion(true);
    try {
      if (pasoCalificacion === 'tienda' && pedido) {
        await apiStores.post(`/tiendas/${pedido.tiendaId}/calificaciones`, {
          puntaje,
          comentario: comentario.trim() || null,
        });
      } else if (pasoCalificacion === 'conductor' && pedido?.conductorId) {
        await apiUsers.post(`/conductores/por-sub/${pedido.conductorId}/calificaciones`, {
          pedidoId: pedido.id,
          puntaje,
          comentario: comentario.trim() || null,
        });
      }
      abrirPasoSiguiente();
    } catch {
      // Si ya estaba calificado o falla, igual dejamos avanzar al siguiente paso
      abrirPasoSiguiente();
    } finally {
      setEnviandoCalificacion(false);
    }
  };

  const omitirCalificacion = () => {
    abrirPasoSiguiente();
  };

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#c1121f" />
      </View>
    );
  }

  if (!pedido) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={32} color="#c9a3a3" style={{ marginBottom: 10 }} />
        <Text style={styles.mensajeError}>No se pudo cargar el pedido</Text>
      </View>
    );
  }

  const info = ESTADOS[pedido.estado] ?? ESTADOS.CREATED;

  return (
    <View style={styles.pantalla}>
      <View style={styles.figuraCirculoGrande} />
      <View style={styles.figuraCirculoChico} />
      <View style={styles.figuraCuadrado} />

      <View style={styles.contenido}>
        <View style={[styles.iconoAnillo, { backgroundColor: info.fondo }]}>
          <View style={[styles.iconoCirculo, { backgroundColor: info.color }]}>
            <Ionicons name={info.icono} size={36} color="#fff" />
          </View>
        </View>

        <Text style={styles.titulo}>{info.titulo}</Text>

        <View style={[styles.badgeEstado, { backgroundColor: info.fondo }]}>
          <View style={[styles.puntoEstado, { backgroundColor: info.color }]} />
          <Text style={[styles.badgeEstadoTexto, { color: info.color }]}>{info.label}</Text>
        </View>

        <View style={styles.resumen}>
          <View style={styles.filaResumen}>
            <View style={styles.filaIconoWrapper}>
              <Ionicons name="location-outline" size={16} color="#c1121f" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.filaLabel}>Entrega en</Text>
              <Text style={styles.filaValor}>{pedido.direccionEnvio}</Text>
            </View>
          </View>

          <View style={styles.divisor} />

          <View style={styles.filaResumen}>
            <View style={styles.filaIconoWrapper}>
              <Ionicons name="receipt-outline" size={16} color="#c1121f" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.filaLabel}>Subtotal</Text>
              <Text style={styles.filaValorChico}>${pedido.subtotal.toLocaleString('es-CL')}</Text>
            </View>
          </View>

          <View style={styles.filaResumen}>
            <View style={styles.filaIconoWrapper}>
              <Ionicons name="bicycle-outline" size={16} color="#c1121f" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.filaLabel}>Envío</Text>
              <Text style={styles.filaValorChico}>${pedido.costoEnvio.toLocaleString('es-CL')}</Text>
            </View>
          </View>

          <View style={styles.divisorTotal} />

          <View style={styles.filaTotal}>
            <Text style={styles.totalLabel}>Total pagado</Text>
            <Text style={styles.totalValor}>${pedido.total.toLocaleString('es-CL')}</Text>
          </View>
        </View>

        {pedido.estado === 'DELIVERED' && (
          <TouchableOpacity style={styles.boton} onPress={confirmarRecepcion} disabled={confirmando}>
            {confirmando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.botonTexto}>Confirmar que lo recibí</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.botonSecundario} onPress={() => router.replace('/(tabs)/tiendas')}>
          <Text style={styles.botonSecundarioTexto}>Volver a tiendas</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={pasoCalificacion !== 'ninguno'} transparent animationType="fade">
        <View style={styles.modalFondo}>
          <View style={styles.modalCaja}>
            <View style={styles.modalIconoWrapper}>
              <Ionicons
                name={pasoCalificacion === 'tienda' ? 'storefront' : 'bicycle'}
                size={26}
                color="#c1121f"
              />
            </View>

            <Text style={styles.modalTitulo}>
              {pasoCalificacion === 'tienda' ? '¿Cómo estuvo la tienda?' : '¿Cómo estuvo el conductor?'}
            </Text>
            <Text style={styles.modalSubtitulo}>
              {pasoCalificacion === 'tienda'
                ? 'Tu opinión ayuda a otros clientes'
                : 'Tu calificación es anónima para el conductor'}
            </Text>

            <View style={styles.filaEstrellas}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setPuntaje(n)}>
                  <Ionicons
                    name={n <= puntaje ? 'star' : 'star-outline'}
                    size={34}
                    color="#c1121f"
                    style={{ marginHorizontal: 3 }}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Comentario (opcional)"
              value={comentario}
              onChangeText={setComentario}
              maxLength={200}
              multiline
            />

            <TouchableOpacity
              style={[styles.modalBoton, puntaje === 0 && styles.modalBotonDeshabilitado]}
              onPress={enviarCalificacion}
              disabled={puntaje === 0 || enviandoCalificacion}
            >
              {enviandoCalificacion ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.modalBotonTexto}>Enviar calificación</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={omitirCalificacion} disabled={enviandoCalificacion}>
              <Text style={styles.modalOmitir}>Omitir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#faf8f6',
  },
  mensajeError: { fontSize: 15, color: '#666' },

  pantalla: { flex: 1, backgroundColor: '#faf8f6', overflow: 'hidden' },
  figuraCirculoGrande: {
    position: 'absolute', top: -50, right: -60, width: 180, height: 180,
    borderRadius: 90, backgroundColor: 'rgba(230,57,70,0.04)',
  },
  figuraCirculoChico: {
    position: 'absolute', bottom: 120, left: -40, width: 100, height: 100,
    borderRadius: 50, backgroundColor: 'rgba(230,57,70,0.06)',
  },
  figuraCuadrado: {
    position: 'absolute', top: 300, right: 30, width: 50, height: 50,
    borderRadius: 14, backgroundColor: 'rgba(230,57,70,0.04)', transform: [{ rotate: '20deg' }],
  },

  contenido: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  iconoAnillo: {
    width: 96, height: 96, borderRadius: 48,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  iconoCirculo: {
    width: 68, height: 68, borderRadius: 34,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10,
    elevation: 6,
  },

  titulo: { fontSize: 22, fontWeight: '800', color: '#1d1d1d', marginBottom: 10, textAlign: 'center' },

  badgeEstado: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14,
    marginBottom: 24,
  },
  puntoEstado: { width: 6, height: 6, borderRadius: 3 },
  badgeEstadoTexto: { fontSize: 12.5, fontWeight: '700' },

  resumen: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18, width: '100%', marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10,
    elevation: 3,
  },
  filaResumen: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  filaIconoWrapper: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: '#fdf0f1',
    justifyContent: 'center', alignItems: 'center',
  },
  filaLabel: { fontSize: 11, color: '#999', fontWeight: '600', marginBottom: 2, textTransform: 'uppercase' },
  filaValor: { fontSize: 14, color: '#1d1d1d', fontWeight: '600' },
  filaValorChico: { fontSize: 14, color: '#1d1d1d', fontWeight: '700' },

  divisor: { height: 1, backgroundColor: '#f2f2f2', marginBottom: 14 },
  divisorTotal: { height: 1, backgroundColor: '#f2f2f2', marginTop: 4, marginBottom: 14 },

  filaTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 15, fontWeight: '700', color: '#1d1d1d' },
  totalValor: { fontSize: 20, fontWeight: '800', color: '#c1121f' },

  boton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: '#c1121f', borderRadius: 12, paddingVertical: 15, paddingHorizontal: 32,
    width: '100%', marginBottom: 10,
    shadowColor: '#c1121f', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10,
    elevation: 4,
  },
  botonTexto: { color: '#fff', fontWeight: '800', fontSize: 16 },

  botonSecundario: { paddingVertical: 10 },
  botonSecundarioTexto: { color: '#666', fontWeight: '600', fontSize: 14 },

  modalFondo: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCaja: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%',
    alignItems: 'center',
  },
  modalIconoWrapper: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#fdf0f1',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  modalTitulo: { fontSize: 18, fontWeight: '800', color: '#1d1d1d', textAlign: 'center', marginBottom: 4 },
  modalSubtitulo: { fontSize: 12.5, color: '#999', textAlign: 'center', marginBottom: 18 },
  filaEstrellas: { flexDirection: 'row', marginBottom: 18 },
  modalInput: {
    width: '100%', borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 12,
    fontSize: 14, minHeight: 60, textAlignVertical: 'top', marginBottom: 16,
    backgroundColor: '#faf8f6',
  },
  modalBoton: {
    backgroundColor: '#c1121f', borderRadius: 10, paddingVertical: 13,
    width: '100%', alignItems: 'center', marginBottom: 10,
  },
  modalBotonDeshabilitado: { backgroundColor: '#e5a8a8' },
  modalBotonTexto: { color: '#fff', fontWeight: '700', fontSize: 14.5 },
  modalOmitir: { color: '#999', fontWeight: '600', fontSize: 13 },
});