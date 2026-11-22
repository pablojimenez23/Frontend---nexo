import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { router, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCart, totalLinea } from '@/context/CartContext';
import { haySesionActiva } from '@/hooks/useAuth';
import { desglosarLinea } from '@/services/ofertas';

export default function CarritoScreen() {
  const { items, quitarItem, cambiarCantidad, subtotal, llevaAlcohol } = useCart();
  const [verificandoSesion, setVerificandoSesion] = useState(true);
  const [necesitaLogin, setNecesitaLogin] = useState(false);

  useFocusEffect(
    useCallback(() => {
      haySesionActiva().then((logueado) => {
        setVerificandoSesion(false);
        setNecesitaLogin(!logueado);
      });
    }, [])
  );

  const header = (
    <Stack.Screen
      options={{
        headerShown: true,
        headerTitle: 'Mi carrito',
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
          <View style={styles.figuraCirculoGrande} />
          <View style={styles.figuraCirculoChico} />
          <View style={styles.figuraCuadrado} />
          <Ionicons name="cart-outline" size={32} color="#c9a3a3" style={{ marginBottom: 10 }} />
          <Text style={styles.mensajeVacio}>Tu carrito está vacío</Text>
        </View>
      </>
    );
  }

  const ahora = Date.now();
  const hayDescuentos = items.some((i) => desglosarLinea(i, ahora).unidadesOferta > 0);

  return (
    <>
      {header}
      <View style={{ flex: 1, backgroundColor: '#faf8f6' }}>
        <View style={styles.figuraCirculoGrande} />
        <View style={styles.figuraCirculoChico} />
        <FlatList
          data={items}
          keyExtractor={(item) => item.lineaId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const linea = desglosarLinea(item, ahora);
            const conOferta = linea.unidadesOferta > 0;
            const precioOferta = item.precioOferta ?? 0;
            const recargo = item.opcionesUnitario ?? 0;

            return (
              <View style={styles.item}>
                <View style={{ flex: 1 }}>
                  <View style={styles.filaNombre}>
                    <Text style={styles.nombre} numberOfLines={2}>{item.nombre}</Text>
                    {item.requiereMayorEdad && (
                      <View style={styles.badgeEdad}>
                        <Text style={styles.badgeEdadTexto}>+18</Text>
                      </View>
                    )}
                  </View>

                  {item.varianteNombre ? (
                    <Text style={styles.detalle}>{item.varianteNombre}</Text>
                  ) : null}
                  {item.opcionesTexto ? (
                    <Text style={styles.detalle} numberOfLines={3}>{item.opcionesTexto}</Text>
                  ) : null}
                  {item.nota ? (
                    <View style={styles.filaNota}>
                      <Ionicons name="chatbox-ellipses-outline" size={12} color="#999" />
                      <Text style={styles.nota} numberOfLines={2}>{item.nota}</Text>
                    </View>
                  ) : null}

                  {conOferta ? (
                    <>
                      <Text style={styles.precioOfertaLinea}>
                        {linea.unidadesOferta} × ${precioOferta.toLocaleString('es-CL')} (oferta)
                      </Text>
                      {linea.unidadesNormales > 0 && (
                        <>
                          <Text style={styles.precioUnitario}>
                            {linea.unidadesNormales} × ${item.precio.toLocaleString('es-CL')}
                          </Text>
                          <Text style={styles.notaLimite}>
                            La oferta aplica hasta {linea.unidadesOferta} {linea.unidadesOferta === 1 ? 'unidad' : 'unidades'} por pedido
                          </Text>
                        </>
                      )}
                    </>
                  ) : (
                    <Text style={styles.precioUnitario}>
                      ${item.precio.toLocaleString('es-CL')} c/u
                    </Text>
                  )}

                  {recargo > 0 && (
                    <Text style={styles.precioUnitario}>
                      + ${recargo.toLocaleString('es-CL')} en opciones c/u
                    </Text>
                  )}
                </View>

                <View style={styles.controlesDerecha}>
                  <Text style={styles.precioTotal}>
                    ${totalLinea(item, ahora).toLocaleString('es-CL')}
                  </Text>

                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={styles.stepperBoton}
                      onPress={() => cambiarCantidad(item.lineaId, -1)}
                    >
                      <Ionicons name="remove" size={16} color="#c1121f" />
                    </TouchableOpacity>

                    <Text style={styles.stepperCantidad}>{item.cantidad}</Text>

                    <TouchableOpacity
                      style={styles.stepperBoton}
                      onPress={() => cambiarCantidad(item.lineaId, 1)}
                    >
                      <Ionicons name="add" size={16} color="#c1121f" />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity onPress={() => quitarItem(item.lineaId)}>
                    <Text style={styles.quitar}>Quitar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />

        <View style={styles.footer}>
          {hayDescuentos && (
            <Text style={styles.avisoOfertas}>
              El precio final de las ofertas se confirma al pagar.
            </Text>
          )}
          {llevaAlcohol && (
            <View style={styles.avisoEdad}>
              <Ionicons name="alert-circle-outline" size={14} color="#1d1d1d" />
              <Text style={styles.avisoEdadTexto}>
                Tu pedido incluye alcohol: solo para mayores de 18 años.
              </Text>
            </View>
          )}
          <View style={styles.filaSubtotal}>
            <Text style={styles.subtotalLabel}>Subtotal</Text>
            <Text style={styles.subtotal}>${subtotal.toLocaleString('es-CL')}</Text>
          </View>
          <TouchableOpacity style={styles.botonCheckout} onPress={() => router.push('/checkout')}>
            <Text style={styles.botonCheckoutTexto}>Continuar al pago</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#faf8f6', overflow: 'hidden', paddingHorizontal: 30,
  },
  mensajeVacio: { fontSize: 16, fontWeight: '700', color: '#1d1d1d', textAlign: 'center' },
  mensajeVacioSub: { fontSize: 13, color: '#999', textAlign: 'center', marginTop: 6 },
  botonLoginRequerido: {
    backgroundColor: '#c1121f', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32,
    marginTop: 20,
  },
  botonLoginRequeridoTexto: { color: '#fff', fontWeight: '800', fontSize: 15 },

  list: { padding: 16 },
  item: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6,
    elevation: 2,
  },
  filaNombre: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nombre: { fontSize: 15, fontWeight: '700', color: '#1d1d1d', flexShrink: 1 },
  badgeEdad: { backgroundColor: '#1d1d1d', borderRadius: 6, paddingVertical: 2, paddingHorizontal: 6 },
  badgeEdadTexto: { color: '#fff', fontSize: 10, fontWeight: '800' },
  detalle: { fontSize: 12.5, color: '#666', marginTop: 3, fontWeight: '600' },
  filaNota: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  nota: { fontSize: 12, color: '#999', fontStyle: 'italic', flexShrink: 1 },
  precioUnitario: { fontSize: 12, color: '#999', marginTop: 4 },
  precioOfertaLinea: { fontSize: 12, color: '#c1121f', fontWeight: '700', marginTop: 4 },
  notaLimite: { fontSize: 10.5, color: '#999', marginTop: 4, fontStyle: 'italic' },

  controlesDerecha: { alignItems: 'flex-end', gap: 8, marginLeft: 12 },
  precioTotal: { fontSize: 15, fontWeight: '800', color: '#c1121f' },

  stepper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#faf8f6', borderRadius: 20, paddingHorizontal: 4, paddingVertical: 4,
  },
  stepperBoton: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
    elevation: 1,
  },
  stepperCantidad: { fontSize: 14, fontWeight: '700', color: '#1d1d1d', minWidth: 16, textAlign: 'center' },

  quitar: { fontSize: 11, color: '#c0392b', fontWeight: '600' },

  footer: {
    padding: 16, paddingBottom: 20,
    borderTopWidth: 1, borderTopColor: '#f0f0f0', backgroundColor: '#fff',
  },
  avisoOfertas: { fontSize: 11.5, color: '#999', marginBottom: 10 },
  avisoEdad: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f4f4f4', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12,
    marginBottom: 10,
  },
  avisoEdadTexto: { fontSize: 12, fontWeight: '600', color: '#1d1d1d', flexShrink: 1 },
  filaSubtotal: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
  },
  subtotalLabel: { fontSize: 14, color: '#666', fontWeight: '600' },
  subtotal: { fontSize: 22, fontWeight: '800', color: '#1d1d1d' },
  botonCheckout: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: '#c1121f', borderRadius: 12, paddingVertical: 15,
  },
  botonCheckoutTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },

  figuraCirculoGrande: {
    position: 'absolute', top: -50, right: -50, width: 160, height: 160,
    borderRadius: 80, backgroundColor: 'rgba(230,57,70,0.04)',
  },
  figuraCirculoChico: {
    position: 'absolute', bottom: 100, left: -30, width: 80, height: 80,
    borderRadius: 40, backgroundColor: 'rgba(230,57,70,0.06)',
  },
  figuraCuadrado: {
    position: 'absolute', top: 250, right: 30, width: 50, height: 50,
    borderRadius: 14, backgroundColor: 'rgba(230,57,70,0.04)', transform: [{ rotate: '20deg' }],
  },
});