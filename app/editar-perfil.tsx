import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiUsers } from '@/services/api';

// Solo letras (con tildes/ñ) y espacios — un nombre no debería tener números ni símbolos
const REGEX_NOMBRE = /[^a-zA-Z À-ÿñÑ]/g;
const LIMITE_NOMBRE = 50;

export default function EditarPerfilScreen() {
  const [nombreOriginal, setNombreOriginal] = useState('');
  const [nombre, setNombre] = useState('');
  const [pictureUrl, setPictureUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    apiUsers.get('/usuarios/me')
      .then((res) => {
        setNombre(res.data.nombre ?? '');
        setNombreOriginal(res.data.nombre ?? '');
        setPictureUrl(res.data.pictureUrl);
      })
      .catch(() => setErrorCarga(true))
      .finally(() => setCargando(false));
  }, []);

  const limpiarNombre = (valor: string) =>
    valor.replace(REGEX_NOMBRE, '').replace(/\s{2,}/g, ' ').slice(0, LIMITE_NOMBRE);

  const validar = (): string | null => {
    const nombreLimpio = nombre.trim();
    if (nombreLimpio.length < 2) return 'El nombre debe tener al menos 2 caracteres';
    if (nombreLimpio.length > LIMITE_NOMBRE) return 'El nombre es demasiado largo';
    if (!/[a-zA-ZÀ-ÿñÑ]/.test(nombreLimpio)) return 'El nombre no puede estar vacío';
    return null;
  };

  const huboSinCambios = nombre.trim() === nombreOriginal.trim();

  const guardar = async () => {
    const error = validar();
    if (error) {
      Alert.alert('Revisá el nombre', error);
      return;
    }

    setGuardando(true);
    try {
      await apiUsers.put('/usuarios/me', { nombre: nombre.trim() });
      Alert.alert('Listo', 'Tu perfil fue actualizado', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el perfil. Intentá de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const header = (
    <Stack.Screen
      options={{
        headerShown: true,
        headerTitle: 'Editar perfil',
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Ionicons name="arrow-back" size={24} color="#1d1d1d" />
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
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  if (errorCarga) {
    return (
      <>
        {header}
        <View style={styles.center}>
          <Text style={styles.mensajeVacio}>No se pudo cargar tu perfil</Text>
          <TouchableOpacity style={styles.botonReintentar} onPress={() => router.back()}>
            <Text style={styles.botonReintentarTexto}>Volver</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      {header}
      <View style={styles.container}>
        {pictureUrl ? (
          <Image source={{ uri: pictureUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarTexto}>{nombre.charAt(0).toUpperCase() || '?'}</Text>
          </View>
        )}
        <Text style={styles.notaFoto}>Tu foto viene de tu cuenta de Google</Text>

        <Text style={styles.label}>Nombre</Text>
        <TextInput
          style={styles.input}
          value={nombre}
          onChangeText={(v) => setNombre(limpiarNombre(v))}
          maxLength={LIMITE_NOMBRE}
          placeholder="Tu nombre"
          autoCapitalize="words"
        />
        <Text style={styles.contador}>{nombre.length}/{LIMITE_NOMBRE}</Text>

        <TouchableOpacity
          style={[styles.boton, (guardando || huboSinCambios) && styles.botonDeshabilitado]}
          onPress={guardar}
          disabled={guardando || huboSinCambios}
        >
          {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>Guardar cambios</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.botonCancelar} onPress={() => router.back()} disabled={guardando}>
          <Text style={styles.botonCancelarTexto}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  mensajeVacio: { fontSize: 15, color: '#666', marginBottom: 16, textAlign: 'center' },
  botonReintentar: { borderWidth: 1, borderColor: '#e63946', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 24 },
  botonReintentarTexto: { color: '#e63946', fontWeight: '600' },
  container: { flex: 1, padding: 24, alignItems: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 40, marginTop: 20, marginBottom: 8 },
  avatarFallback: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#e63946',
    justifyContent: 'center', alignItems: 'center', marginTop: 20, marginBottom: 8,
  },
  avatarTexto: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  notaFoto: { fontSize: 12, color: '#999', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, alignSelf: 'flex-start' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 14, width: '100%' },
  contador: { fontSize: 11, color: '#aaa', alignSelf: 'flex-end', marginTop: 4 },
  boton: { backgroundColor: '#e63946', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 24, width: '100%' },
  botonDeshabilitado: { backgroundColor: '#f0a8ad' },
  botonTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  botonCancelar: { paddingVertical: 14, alignItems: 'center', marginTop: 8, width: '100%' },
  botonCancelarTexto: { color: '#666', fontWeight: '600', fontSize: 14 },
});