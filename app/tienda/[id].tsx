import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiProducts, apiStores } from '@/services/api';
import { useCart } from '@/context/CartContext';

type Producto = {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  imagenUrl: string | null;
  disponible: boolean;
};

export default function DetalleTiendaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [nombreTienda, setNombreTienda] = useState('');
  const [cargando, setCargando] = useState(true);
  const { agregarItem, items } = useCart();

  useEffect(() => {
    apiStores.get(`/tiendas/${id}`).then((res) => setNombreTienda(res.data.nombre));
    apiProducts.get(`/productos?tiendaId=${id}`)
      .then((res) => setProductos(res.data))
      .finally(() => setCargando(false));
  }, [id]);

  const handleAgregar = (producto: Producto) => {
    const exito = agregarItem(id!, {
      productoId: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: 1,
    });

    if (!exito) {
      Alert.alert(
        'Solo una tienda por pedido',
        'Ya tenés productos de otra tienda en el carrito. Vaciálo primero para agregar de esta tienda.'
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

          <FlatList
            data={productos}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <Text style={styles.contador}>
                {productos.length} {productos.length === 1 ? 'producto disponible' : 'productos disponibles'}
              </Text>
            }
            renderItem={({ item }) => (
              <View style={[styles.card, !item.disponible && styles.cardDisabled]}>
                <View style={styles.cardIconoWrapper}>
                  <Ionicons name="fast-food-outline" size={22} color="#c1121f" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.nombre}>{item.nombre}</Text>
                  {item.descripcion ? (
                    <Text style={styles.descripcion} numberOfLines={2}>{item.descripcion}</Text>
                  ) : null}

                  <View style={styles.filaInferior}>
                    <Text style={styles.precio}>${item.precio.toLocaleString('es-CL')}</Text>

                    {item.disponible ? (
                      <TouchableOpacity style={styles.boton} onPress={() => handleAgregar(item)}>
                        <Ionicons name="add" size={16} color="#fff" />
                        <Text style={styles.botonTexto}>Agregar</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.badgeSinStock}>
                        <Text style={styles.badgeSinStockTexto}>Sin stock</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )}
          />

          {items.length > 0 && (
            <SafeAreaView edges={['bottom']} style={styles.safeAreaBoton}>
              <TouchableOpacity style={styles.botonCarrito} onPress={() => router.push('/carrito')}>
                <View style={styles.botonCarritoIzquierda}>
                  <Ionicons name="cart-outline" size={20} color="#fff" />
                  <Text style={styles.botonCarritoTexto}>Ver carrito</Text>
                </View>
                <Text style={styles.botonCarritoMonto}>
                  ${items.reduce((acc, i) => acc + i.precio * i.cantidad, 0).toLocaleString('es-CL')}
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

  list: { padding: 16, paddingBottom: 90 },
  contador: { fontSize: 12, color: '#999', marginBottom: 10, marginLeft: 2 },

  card: {
    flexDirection: 'row', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8,
    elevation: 3,
  },
  cardDisabled: { opacity: 0.5 },
  cardIconoWrapper: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: '#fdf0f1',
    justifyContent: 'center', alignItems: 'center',
  },
  nombre: { fontSize: 15.5, fontWeight: '800', color: '#1d1d1d' },
  descripcion: { fontSize: 12.5, color: '#888', marginTop: 3, lineHeight: 17 },

  filaInferior: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10,
  },
  precio: { fontSize: 16, fontWeight: '800', color: '#c1121f' },

  boton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#c1121f', borderRadius: 8, paddingVertical: 7, paddingHorizontal: 12,
  },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 12.5 },

  badgeSinStock: { backgroundColor: '#f4f4f4', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10 },
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
  botonCarritoTexto: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  botonCarritoMonto: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});