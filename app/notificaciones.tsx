import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { router, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiUsers } from '@/services/api';

type Notificacion = {
  id: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  creadoEn: string;
};

export default function NotificacionesScreen() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [borrandoTodas, setBorrandoTodas] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setCargando(true);
      apiUsers.get('/notificaciones')
        .then((res) => setNotificaciones(res.data))
        .finally(() => setCargando(false));
    }, [])
  );

  const marcarLeida = async (id: string) => {
    setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    await apiUsers.patch(`/notificaciones/${id}/leer`);
  };

  const eliminar = async (id: string) => {
    setNotificaciones((prev) => prev.filter((n) => n.id !== id));
    await apiUsers.delete(`/notificaciones/${id}`);
  };

  const eliminarTodas = () => {
    Alert.alert(
      '¿Borrar todas?',
      'Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar todas',
          style: 'destructive',
          onPress: async () => {
            setBorrandoTodas(true);
            try {
              await apiUsers.delete('/notificaciones');
              setNotificaciones([]);
            } catch {
              Alert.alert('Error', 'No se pudieron borrar las notificaciones');
            } finally {
              setBorrandoTodas(false);
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Notificaciones',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
              <Ionicons name="arrow-back" size={24} color="#1d1d1d" />
            </TouchableOpacity>
          ),
          headerRight: () =>
            notificaciones.length > 0 ? (
              <TouchableOpacity onPress={eliminarTodas} disabled={borrandoTodas} style={{ marginRight: 4 }}>
                {borrandoTodas ? (
                  <ActivityIndicator size="small" color="#c1121f" />
                ) : (
                  <Text style={styles.botonBorrarTodasTexto}>Borrar todas</Text>
                )}
              </TouchableOpacity>
            ) : null,
        }}
      />

      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#c1121f" />
        </View>
      ) : notificaciones.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-off-outline" size={32} color="#c9a3a3" style={{ marginBottom: 10 }} />
          <Text style={styles.mensajeVacio}>Todo tranquilo por acá</Text>
          <Text style={styles.mensajeVacioSub}>No tenés notificaciones todavía.</Text>
        </View>
      ) : (
        <FlatList
          data={notificaciones}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, !item.leida && styles.cardNoLeida]}
              onPress={() => !item.leida && marcarLeida(item.id)}
              activeOpacity={0.8}
            >
              <TouchableOpacity
                style={styles.botonCerrar}
                onPress={() => eliminar(item.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={16} color="#999" />
              </TouchableOpacity>

              <View style={styles.filaContenido}>
                {!item.leida && <View style={styles.puntoNoLeida} />}
                <View style={{ flex: 1, paddingRight: 20 }}>
                  <Text style={styles.titulo}>{item.titulo}</Text>
                  <Text style={styles.mensaje}>{item.mensaje}</Text>
                  <Text style={styles.fecha}>
                    {new Date(item.creadoEn).toLocaleString('es-CL')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  mensajeVacio: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  mensajeVacioSub: { fontSize: 13, color: '#999' },
  list: { padding: 16 },
  botonBorrarTodasTexto: { color: '#c1121f', fontWeight: '700', fontSize: 13 },
  card: {
    backgroundColor: '#f9f9f9', borderRadius: 8, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#eee', position: 'relative',
  },
  cardNoLeida: { backgroundColor: '#fdf0f1', borderColor: '#f3c6c9' },
  botonCerrar: {
    position: 'absolute', top: 10, right: 10, zIndex: 1,
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
    elevation: 1,
  },
  filaContenido: { flexDirection: 'row' },
  puntoNoLeida: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#e63946',
    marginRight: 10, marginTop: 6,
  },
  titulo: { fontSize: 15, fontWeight: '700' },
  mensaje: { fontSize: 13, color: '#555', marginTop: 4 },
  fecha: { fontSize: 11, color: '#999', marginTop: 6 },
});