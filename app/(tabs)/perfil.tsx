import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, ScrollView, TextInput, Alert, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import { apiUsers, apiStores } from '@/services/api';
import { haySesionActiva } from '@/hooks/useAuth';

type Usuario = {
  nombre: string;
  email: string;
  pictureUrl: string | null;
  rol: string;
};

type Direccion = {
  id: string;
  calle: string;
  ciudad: string;
  region: string;
  tipo: string;
};

type Tienda = {
  nombre: string;
  estado: string;
};

export default function PerfilScreen() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [direcciones, setDirecciones] = useState<Direccion[]>([]);
  const [tienda, setTienda] = useState<Tienda | null>(null);
  const [estadoConductor, setEstadoConductor] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [verificandoSesion, setVerificandoSesion] = useState(true);
  const [necesitaLogin, setNecesitaLogin] = useState(false);

  const [mostrandoFormulario, setMostrandoFormulario] = useState(false);
  const [nuevaCalle, setNuevaCalle] = useState('');
  const [nuevaCiudad, setNuevaCiudad] = useState('');
  const [nuevaRegion, setNuevaRegion] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargarPerfil = (esRefresh = false) => {
    if (esRefresh) setRefrescando(true);
    else setCargando(true);

    Promise.all([
      apiUsers.get('/usuarios/me'),
      apiUsers.get('/direcciones'),
      apiStores.get('/tiendas/mi-tienda'),
      apiUsers.get('/conductores/me').catch(() => null),
    ])
      .then(([resUsuario, resDirecciones, resTiendas, resConductor]) => {
        setUsuario(resUsuario.data);
        setDirecciones(resDirecciones.data);
        setTienda(resTiendas.data.length > 0 ? resTiendas.data[0] : null);
        setEstadoConductor(resConductor ? resConductor.data.estado : null);
      })
      .finally(() => {
        setCargando(false);
        setRefrescando(false);
      });
  };

  useFocusEffect(
    useCallback(() => {
      haySesionActiva().then((logueado) => {
        setVerificandoSesion(false);
        if (!logueado) {
          setNecesitaLogin(true);
          return;
        }
        setNecesitaLogin(false);
        cargarPerfil();
      });
    }, [])
  );

  const onRefresh = useCallback(() => {
    cargarPerfil(true);
  }, []);

  const guardarDireccion = async () => {
    if (!nuevaCalle.trim() || !nuevaCiudad.trim() || !nuevaRegion.trim()) {
      Alert.alert('Faltan datos', 'Completá calle, ciudad y región');
      return;
    }

    setGuardando(true);
    try {
      const res = await apiUsers.post('/direcciones', {
        calle: nuevaCalle,
        ciudad: nuevaCiudad,
        region: nuevaRegion,
        tipo: 'CASA',
      });
      setDirecciones((prev) => [...prev, res.data]);
      setNuevaCalle('');
      setNuevaCiudad('');
      setNuevaRegion('');
      setMostrandoFormulario(false);
    } catch {
      Alert.alert('Error', 'No se pudo guardar la dirección');
    } finally {
      setGuardando(false);
    }
  };

  const usarUbicacionActual = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu ubicación para esto');
      return;
    }

    setGuardando(true);
    try {
      const posicion = await Location.getCurrentPositionAsync({});
      const [lugar] = await Location.reverseGeocodeAsync({
        latitude: posicion.coords.latitude,
        longitude: posicion.coords.longitude,
      });

      const calle = `${lugar.street ?? ''} ${lugar.streetNumber ?? ''}`.trim() || 'Ubicación actual';
      const ciudad = lugar.city ?? lugar.subregion ?? '';
      const region = lugar.region ?? '';

      const res = await apiUsers.post('/direcciones', {
        calle,
        ciudad,
        region,
        tipo: 'CASA',
        latitud: posicion.coords.latitude,
        longitud: posicion.coords.longitude,
      });

      setDirecciones((prev) => [...prev, res.data]);
      setMostrandoFormulario(false);
    } catch {
      Alert.alert('Error', 'No se pudo obtener tu ubicación');
    } finally {
      setGuardando(false);
    }
  };

  const eliminarDireccion = async (id: string) => {
    await apiUsers.delete(`/direcciones/${id}`);
    setDirecciones((prev) => prev.filter((d) => d.id !== id));
  };

  const cerrarSesion = async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    router.replace('/(tabs)/inicio');
  };

  if (verificandoSesion) {
    return (
      <View style={styles.center}>
        <View style={styles.figuraCirculoGrande} />
        <View style={styles.figuraCirculoChico} />
        <ActivityIndicator size="large" color="#c1121f" />
      </View>
    );
  }

  if (necesitaLogin) {
    return (
      <View style={styles.center}>
        <View style={styles.figuraCirculoGrande} />
        <View style={styles.figuraCirculoChico} />
        <Ionicons name="person-circle-outline" size={40} color="#c9a3a3" style={{ marginBottom: 10 }} />
        <Text style={styles.mensajeVacio}>Necesitás una cuenta para ver tu perfil</Text>
        <Text style={styles.mensajeVacioSub}>
          Iniciá sesión para gestionar tus direcciones, pedidos y más
        </Text>
        <TouchableOpacity
          style={styles.botonLoginRequerido}
          onPress={() => router.push('/login' as any)}
        >
          <Text style={styles.botonLoginRequeridoTexto}>Iniciar sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (cargando) {
    return (
      <View style={styles.center}>
        <View style={styles.figuraCirculoGrande} />
        <View style={styles.figuraCirculoChico} />
        <ActivityIndicator size="large" color="#c1121f" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.figuraCirculoGrande} />
      <View style={styles.figuraCirculoChico} />
      <View style={styles.figuraCuadrado} />

      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={onRefresh}
            tintColor="#c1121f"
            colors={['#c1121f']}
          />
        }
      >
        <View style={styles.tarjetaPerfil}>
          {usuario?.pictureUrl ? (
            <Image source={{ uri: usuario.pictureUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarTexto}>{usuario?.nombre?.charAt(0) ?? '?'}</Text>
            </View>
          )}

          <Text style={styles.nombre}>{usuario?.nombre}</Text>
          <Text style={styles.email}>{usuario?.email}</Text>

          <View style={styles.filaStats}>
            <View style={styles.statChip}>
              <Text style={styles.statChipTexto}>
                {direcciones.length} {direcciones.length === 1 ? 'dirección' : 'direcciones'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.accesos}>
          {tienda?.estado === 'APPROVED' && (
            <TouchableOpacity style={styles.accesoCard} onPress={() => router.push('/mi-tienda' as any)}>
              <View style={styles.accesoIconoWrapper}>
                <Text style={styles.accesoIcono}>🏪</Text>
              </View>
              <Text style={styles.accesoTexto}>{tienda.nombre}</Text>
              <Ionicons name="chevron-forward" size={18} color="#c9a3a3" />
            </TouchableOpacity>
          )}

          {tienda?.estado === 'PENDING' && (
            <View style={styles.accesoCardPendiente}>
              <View style={[styles.accesoIconoWrapper, { backgroundColor: '#fff3d6' }]}>
                <Text style={styles.accesoIcono}>⏳</Text>
              </View>
              <Text style={styles.accesoTextoPendiente}>"{tienda.nombre}" está en revisión</Text>
            </View>
          )}

          {(estadoConductor === 'DISPONIBLE' || estadoConductor === 'OCUPADO' || estadoConductor === 'INACTIVO') && (
            <TouchableOpacity style={styles.accesoCard} onPress={() => router.push('/conductor' as any)}>
              <View style={styles.accesoIconoWrapper}>
                <Text style={styles.accesoIcono}>🛵</Text>
              </View>
              <Text style={styles.accesoTexto}>Modo conductor</Text>
              <Ionicons name="chevron-forward" size={18} color="#c9a3a3" />
            </TouchableOpacity>
          )}

          {estadoConductor === 'PENDIENTE_APROBACION' && (
            <View style={styles.accesoCardPendiente}>
              <View style={[styles.accesoIconoWrapper, { backgroundColor: '#fff3d6' }]}>
                <Text style={styles.accesoIcono}>⏳</Text>
              </View>
              <Text style={styles.accesoTextoPendiente}>Tu perfil de conductor está en revisión</Text>
            </View>
          )}

          {(tienda === null || tienda.estado === 'REJECTED') && (
            <TouchableOpacity
              style={styles.accesoCardSecundario}
              onPress={() => router.push('/registrar-tienda' as any)}
            >
              <Ionicons name="storefront-outline" size={16} color="#c1121f" />
              <Text style={styles.accesoTextoSecundario}>Quiero vender en NEXO</Text>
            </TouchableOpacity>
          )}

          {(estadoConductor === null || estadoConductor === 'RECHAZADO') && (
            <TouchableOpacity
              style={styles.accesoCardSecundario}
              onPress={() => router.push('/registrar-conductor' as any)}
            >
              <Ionicons name="bicycle-outline" size={16} color="#c1121f" />
              <Text style={styles.accesoTextoSecundario}>Quiero repartir pedidos</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Mis direcciones</Text>

          {direcciones.length === 0 && !mostrandoFormulario && (
            <Text style={styles.sinDirecciones}>Todavía no guardaste ninguna dirección</Text>
          )}

          {direcciones.map((dir) => (
            <View key={dir.id} style={styles.direccionCard}>
              <View style={styles.direccionIconoWrapper}>
                <Ionicons name="location-outline" size={16} color="#c1121f" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.direccionTipo}>{dir.tipo}</Text>
                <Text style={styles.direccionTexto}>{dir.calle}, {dir.ciudad}, {dir.region}</Text>
              </View>
              <TouchableOpacity onPress={() => eliminarDireccion(dir.id)}>
                <Ionicons name="trash-outline" size={18} color="#c0392b" />
              </TouchableOpacity>
            </View>
          ))}

          {!mostrandoFormulario ? (
            <>
              <TouchableOpacity
                style={styles.botonUbicacion}
                onPress={usarUbicacionActual}
                disabled={guardando}
              >
                {guardando ? (
                  <ActivityIndicator color="#c1121f" size="small" />
                ) : (
                  <>
                    <Ionicons name="navigate-outline" size={16} color="#c1121f" />
                    <Text style={styles.botonUbicacionTexto}>Usar mi ubicación actual</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.botonAgregar} onPress={() => setMostrandoFormulario(true)}>
                <Text style={styles.botonAgregarTexto}>+ Agregar dirección manualmente</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.formulario}>
              <TextInput
                style={styles.input}
                placeholder="Calle y número"
                value={nuevaCalle}
                onChangeText={setNuevaCalle}
              />
              <TextInput
                style={styles.input}
                placeholder="Ciudad"
                value={nuevaCiudad}
                onChangeText={setNuevaCiudad}
              />
              <TextInput
                style={styles.input}
                placeholder="Región"
                value={nuevaRegion}
                onChangeText={setNuevaRegion}
              />
              <View style={styles.formularioBotones}>
                <TouchableOpacity
                  style={styles.botonCancelar}
                  onPress={() => setMostrandoFormulario(false)}
                >
                  <Text style={styles.botonCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.botonGuardar}
                  onPress={guardarDireccion}
                  disabled={guardando}
                >
                  {guardando ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.botonGuardarTexto}>Guardar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.botonCerrarSesion} onPress={cerrarSesion} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={styles.botonCerrarSesionTexto}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f6', overflow: 'hidden' },
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
  contentContainer: { padding: 20, paddingTop: 28, paddingBottom: 60 },

  figuraCirculoGrande: {
    position: 'absolute', top: -60, right: -60, width: 190, height: 190,
    borderRadius: 95, backgroundColor: 'rgba(230,57,70,0.04)',
  },
  figuraCirculoChico: {
    position: 'absolute', top: 300, left: -40, width: 100, height: 100,
    borderRadius: 50, backgroundColor: 'rgba(230,57,70,0.06)',
  },
  figuraCuadrado: {
    position: 'absolute', bottom: 60, right: 30, width: 55, height: 55,
    borderRadius: 16, backgroundColor: 'rgba(230,57,70,0.04)', transform: [{ rotate: '18deg' }],
  },

  tarjetaPerfil: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  avatar: { width: 84, height: 84, borderRadius: 42, marginBottom: 12 },
  avatarFallback: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: '#c1121f',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarTexto: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  nombre: { fontSize: 18, fontWeight: '800', color: '#1d1d1d' },
  email: { fontSize: 13, color: '#888', marginTop: 3 },
  filaStats: { flexDirection: 'row', gap: 8, marginTop: 14 },
  statChip: {
    backgroundColor: '#fdf0f1', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14,
  },
  statChipTexto: { fontSize: 11, fontWeight: '700', color: '#c1121f' },

  accesos: { marginBottom: 20 },
  accesoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6,
    elevation: 2,
  },
  accesoIconoWrapper: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#fdf0f1',
    justifyContent: 'center', alignItems: 'center',
  },
  accesoIcono: { fontSize: 19 },
  accesoTexto: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1d1d1d' },
  accesoCardPendiente: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fffaf0', borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#ffe8b8',
  },
  accesoTextoPendiente: { flex: 1, fontSize: 13, fontWeight: '600', color: '#8a6109' },
  accesoCardSecundario: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#c1121f', borderRadius: 14, padding: 13, marginBottom: 10,
    backgroundColor: '#fff',
  },
  accesoTextoSecundario: { fontSize: 13, color: '#c1121f', fontWeight: '700' },

  seccion: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
    elevation: 2,
  },
  seccionTitulo: { fontSize: 15, fontWeight: '800', marginBottom: 14, color: '#1d1d1d' },
  sinDirecciones: { fontSize: 13, color: '#999', marginBottom: 8 },
  direccionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#faf8f6', borderRadius: 12, padding: 12, marginBottom: 8,
  },
  direccionIconoWrapper: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: '#fdf0f1',
    justifyContent: 'center', alignItems: 'center',
  },
  direccionTipo: { fontSize: 10, fontWeight: '800', color: '#c1121f', marginBottom: 2, textTransform: 'uppercase' },
  direccionTexto: { fontSize: 13, color: '#333' },
  botonUbicacion: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#c1121f', borderRadius: 12, paddingVertical: 12,
    marginTop: 4, marginBottom: 10,
  },
  botonUbicacionTexto: { color: '#c1121f', fontWeight: '700', fontSize: 13 },
  botonAgregar: { paddingVertical: 6, alignItems: 'center' },
  botonAgregarTexto: { color: '#c1121f', fontWeight: '700', fontSize: 13 },
  formulario: { marginTop: 4 },
  input: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12,
    fontSize: 14, marginBottom: 10, backgroundColor: '#faf8f6',
  },
  formularioBotones: { flexDirection: 'row', gap: 10 },
  botonCancelar: { flex: 1, borderWidth: 1.5, borderColor: '#eee', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  botonCancelarTexto: { color: '#666', fontWeight: '700' },
  botonGuardar: { flex: 1, backgroundColor: '#c1121f', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  botonGuardarTexto: { color: '#fff', fontWeight: '700' },

  botonCerrarSesion: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 15,
    backgroundColor: '#c1121f',
    shadowColor: '#c1121f', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10,
    elevation: 4,
  },
  botonCerrarSesionTexto: { color: '#fff', fontWeight: '800', fontSize: 15 },
});