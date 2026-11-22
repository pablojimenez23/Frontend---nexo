import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { router, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '@/context/CartContext';
import { haySesionActiva } from '@/hooks/useAuth';

export default function CarritoScreen() {
  const { items, quitarItem, cambiarCantidad, subtotal } = useCart();
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

  return (
    <>
      {header}
      <View style={{ flex: 1, backgroundColor: '#faf8f6' }}>
        <View style={styles.figuraCirculoGrande} />
        <View style={styles.figuraCirculoChico} />
        <FlatList
          data={items}
          keyExtractor={(item) => item.productoId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nombre} numberOfLines={2}>{item.nombre}</Text>
                <Text style={styles.precioUnitario}>
                  ${item.precio.toLocaleString('es-CL')} c/u
                </Text>
              </View>

              <View style={styles.controlesDerecha}>
                <Text style={styles.precioTotal}>
                  ${(item.precio * item.cantidad).toLocaleString('es-CL')}
                </Text>

                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={styles.stepperBoton}
                    onPress={() => cambiarCantidad(item.productoId, -1)}
                  >
                    <Ionicons name="remove" size={16} color="#c1121f" />
                  </TouchableOpacity>

                  <Text style={styles.stepperCantidad}>{item.cantidad}</Text>

                  <TouchableOpacity
                    style={styles.stepperBoton}
                    onPress={() => cambiarCantidad(item.productoId, 1)}
                  >
                    <Ionicons name="add" size={16} color="#c1121f" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => quitarItem(item.productoId)}>
                  <Text style={styles.quitar}>Quitar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />

        <View style={styles.footer}>
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
  nombre: { fontSize: 15, fontWeight: '700', color: '#1d1d1d' },
  precioUnitario: { fontSize: 12, color: '#999', marginTop: 4 },

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