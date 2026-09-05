import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useState, useCallback } from 'react';
import { router, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiOrders, apiUsers } from '@/services/api';

type Pedido = {
  id: string;
  estado: string;
  direccionEnvio: string;
  gananciaConductor: number | null;
};

type Calificacion = {
  id: string;
  puntaje: number;
  comentario: string | null;
  creadoEn: string;
};

export default function ConductorActividadScreen() {
  const [entregas, setEntregas] = useState<Pedido[]>([]);
  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([]);
  const [tab, setTab] = useState<'entregas' | 'calificaciones'>('entregas');
  const [cargando, setCargando] = useState(true);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const resConductor = await apiUsers.get('/conductores/me');
      const conductorId = resConductor.data.id;

      const [resEntregas, resCalificaciones] = await Promise.all([
        apiOrders.get('/pedidos/mis-entregas'),
        apiUsers.get(`/conductores/${conductorId}/calificaciones`),
      ]);

      setEntregas(resEntregas.data);
      setCalificaciones(resCalificaciones.data);
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [cargarDatos])
  );

  const totalGanado = entregas.reduce((acc, p) => acc + (p.gananciaConductor ?? 0), 0);
  const promedio = calificaciones.length > 0
    ? calificaciones.reduce((acc, c) => acc + c.puntaje, 0) / calificaciones.length
    : 0;

  const header = (
    <Stack.Screen
      options={{
        headerShown: true,
        headerTitle: () => (
          <View style={styles.headerTituloWrapper}>
            <View style={styles.headerIconoWrapper}>
              <Ionicons name="stats-chart" size={15} color="#fff" />
            </View>
            <Text style={styles.headerTituloTexto}>Mi actividad</Text>
          </View>
        ),
        headerStyle: { backgroundColor: '#c1121f' },
        headerTintColor: '#fff',
        headerShadowVisible: false,
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 8 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
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

  return (
    <>
      {header}
      <View style={styles.pantalla}>
        <View style={styles.figuraCirculoGrande} />
        <View style={styles.figuraCirculoChico} />
        <View style={styles.figuraCuadrado} />

        <View style={styles.filaStats}>
          <View style={styles.statCard}>
            <View style={styles.statIconoWrapper}>
              <Ionicons name="cash-outline" size={18} color="#2a9d8f" />
            </View>
            <Text style={styles.statValor}>${totalGanado.toLocaleString('es-CL')}</Text>
            <Text style={styles.statLabel}>Ganado en total</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconoWrapper}>
              <Ionicons name="star" size={18} color="#c1121f" />
            </View>
            <Text style={styles.statValor}>{promedio > 0 ? promedio.toFixed(1) : '—'}</Text>
            <Text style={styles.statLabel}>Calificación</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconoWrapper}>
              <Ionicons name="bicycle-outline" size={18} color="#8a6109" />
            </View>
            <Text style={styles.statValor}>{entregas.length}</Text>
            <Text style={styles.statLabel}>Entregas</Text>
          </View>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tabBoton, tab === 'entregas' && styles.tabBotonActivo]}
            onPress={() => setTab('entregas')}
          >
            <Ionicons name="receipt-outline" size={16} color={tab === 'entregas' ? '#c1121f' : '#999'} />
            <Text style={[styles.tabTexto, tab === 'entregas' && styles.tabTextoActivo]}>Entregas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBoton, tab === 'calificaciones' && styles.tabBotonActivo]}
            onPress={() => setTab('calificaciones')}
          >
            <Ionicons name="star-outline" size={16} color={tab === 'calificaciones' ? '#c1121f' : '#999'} />
            <Text style={[styles.tabTexto, tab === 'calificaciones' && styles.tabTextoActivo]}>Calificaciones</Text>
          </TouchableOpacity>
        </View>

        {tab === 'entregas' ? (
          entregas.length === 0 ? (
            <View style={styles.centerVacio}>
              <Ionicons name="bicycle-outline" size={32} color="#c9a3a3" style={{ marginBottom: 10 }} />
              <Text style={styles.mensajeVacio}>Todavía no hiciste entregas</Text>
            </View>
          ) : (
            <FlatList
              data={entregas}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <View style={styles.filaInfo}>
                    <View style={styles.filaIconoWrapper}>
                      <Ionicons name="location-outline" size={16} color="#c1121f" />
                    </View>
                    <Text style={styles.direccion} numberOfLines={2}>{item.direccionEnvio}</Text>
                  </View>
                  <View style={styles.filaGanancia}>
                    <Text style={styles.gananciaLabel}>Ganaste</Text>
                    <Text style={styles.gananciaValor}>
                      +${(item.gananciaConductor ?? 0).toLocaleString('es-CL')}
                    </Text>
                  </View>
                </View>
              )}
            />
          )
        ) : calificaciones.length === 0 ? (
          <View style={styles.centerVacio}>
            <Ionicons name="star-outline" size={32} color="#c9a3a3" style={{ marginBottom: 10 }} />
            <Text style={styles.mensajeVacio}>Todavía no tenés calificaciones</Text>
          </View>
        ) : (
          <FlatList
            data={calificaciones}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.filaEstrellas}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Ionicons
                      key={n}
                      name={n <= item.puntaje ? 'star' : 'star-outline'}
                      size={16}
                      color="#c1121f"
                      style={{ marginRight: 2 }}
                    />
                  ))}
                </View>
                {item.comentario ? (
                  <Text style={styles.comentario}>{item.comentario}</Text>
                ) : (
                  <Text style={styles.sinComentario}>Sin comentario</Text>
                )}
                <Text style={styles.fecha}>
                  {new Date(item.creadoEn).toLocaleDateString('es-CL')}
                </Text>
              </View>
            )}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#faf8f6' },
  pantalla: { flex: 1, backgroundColor: '#faf8f6', overflow: 'hidden' },

  headerTituloWrapper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconoWrapper: {
    width: 26, height: 26, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTituloTexto: { color: '#fff', fontSize: 17, fontWeight: '800' },

  figuraCirculoGrande: {
    position: 'absolute', top: -50, right: -60, width: 180, height: 180,
    borderRadius: 90, backgroundColor: 'rgba(230,57,70,0.04)',
  },
  figuraCirculoChico: {
    position: 'absolute', top: 300, left: -40, width: 100, height: 100,
    borderRadius: 50, backgroundColor: 'rgba(230,57,70,0.06)',
  },
  figuraCuadrado: {
    position: 'absolute', bottom: 60, right: 30, width: 50, height: 50,
    borderRadius: 14, backgroundColor: 'rgba(230,57,70,0.04)', transform: [{ rotate: '20deg' }],
  },

  filaStats: { flexDirection: 'row', gap: 10, padding: 20, paddingBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8,
    elevation: 3,
  },
  statIconoWrapper: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: '#faf8f6',
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  statValor: { fontSize: 16, fontWeight: '800', color: '#1d1d1d' },
  statLabel: { fontSize: 10, color: '#999', fontWeight: '600', marginTop: 2, textAlign: 'center' },

  tabs: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 14,
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

  centerVacio: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  mensajeVacio: { fontSize: 15, fontWeight: '700', color: '#1d1d1d', textAlign: 'center' },

  list: { padding: 16, paddingTop: 0 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8,
    elevation: 3,
  },

  filaInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  filaIconoWrapper: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: '#fdf0f1',
    justifyContent: 'center', alignItems: 'center',
  },
  direccion: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1d1d1d', marginTop: 4 },

  filaGanancia: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f2f2f2',
  },
  gananciaLabel: { fontSize: 12.5, color: '#999', fontWeight: '600' },
  gananciaValor: { fontSize: 17, fontWeight: '800', color: '#2a9d8f' },

  filaEstrellas: { flexDirection: 'row', marginBottom: 8 },
  comentario: { fontSize: 13.5, color: '#333', lineHeight: 19, marginBottom: 8 },
  sinComentario: { fontSize: 13, color: '#bbb', fontStyle: 'italic', marginBottom: 8 },
  fecha: { fontSize: 11, color: '#999' },
});