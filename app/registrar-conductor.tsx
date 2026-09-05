import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiUsers } from '@/services/api';

const TIPOS_VEHICULO = [
  { key: 'AUTO', label: 'Auto', icono: '🚗' },
  { key: 'MOTO', label: 'Moto', icono: '🛵' },
];

// Marca/modelo: letras, números y espacios — sin símbolos raros
const REGEX_MODELO = /[^a-zA-Z0-9À-ÿñÑ\s-]/g;
// Patente: solo letras y números, sin espacios ni símbolos
const REGEX_PATENTE = /[^a-zA-Z0-9]/g;

const LIMITES = {
  modelo: 30,
  patente: 8,
};

export default function RegistrarConductorScreen() {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [cargandoUsuario, setCargandoUsuario] = useState(true);

  const [tipoVehiculo, setTipoVehiculo] = useState('MOTO');
  const [modelo, setModelo] = useState('');
  const [patente, setPatente] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    apiUsers.get('/usuarios/me')
      .then((res) => setNombreUsuario(res.data.nombre))
      .finally(() => setCargandoUsuario(false));
  }, []);

  const limpiarModelo = (valor: string) =>
    valor.replace(REGEX_MODELO, '').slice(0, LIMITES.modelo);

  const limpiarPatente = (valor: string) =>
    valor.replace(REGEX_PATENTE, '').toUpperCase().slice(0, LIMITES.patente);

  const validar = (): string | null => {
    if (modelo.trim().length < 2) return 'Ingresá la marca y modelo del vehículo';
    if (patente.trim().length < 4) return 'La patente parece incompleta';
    return null;
  };

  const registrarse = async () => {
    const error = validar();
    if (error) {
      Alert.alert('Revisá los datos', error);
      return;
    }

    setEnviando(true);
    try {
      const tipoLabel = TIPOS_VEHICULO.find((t) => t.key === tipoVehiculo)?.label ?? tipoVehiculo;
      await apiUsers.post('/conductores', {
        nombre: nombreUsuario,
        vehiculo: `${tipoLabel} - ${modelo.trim()}`,
        patente: patente.trim(),
      });
      Alert.alert('¡Listo!', 'Tu solicitud quedó en revisión', [
        { text: 'OK', onPress: () => router.replace('/perfil' as any) },
      ]);
    } catch {
      Alert.alert('Error', 'No se pudo completar el registro');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Registrarme como conductor',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
              <Ionicons name="arrow-back" size={24} color="#1d1d1d" />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.container}>
        <Text style={styles.subtitulo}>Completá los datos de tu vehículo</Text>

        <View style={styles.tarjetaUsuario}>
          <Text style={styles.tarjetaUsuarioLabel}>Registrando como</Text>
          {cargandoUsuario ? (
            <ActivityIndicator size="small" color="#e63946" />
          ) : (
            <Text style={styles.tarjetaUsuarioNombre}>{nombreUsuario}</Text>
          )}
        </View>

        <Text style={styles.label}>Tipo de vehículo</Text>
        <View style={styles.tiposVehiculo}>
          {TIPOS_VEHICULO.map((tipo) => (
            <TouchableOpacity
              key={tipo.key}
              style={[styles.tipoChip, tipoVehiculo === tipo.key && styles.tipoChipActivo]}
              onPress={() => setTipoVehiculo(tipo.key)}
            >
              <Text style={styles.tipoIcono}>{tipo.icono}</Text>
              <Text style={[styles.tipoTexto, tipoVehiculo === tipo.key && styles.tipoTextoActivo]}>
                {tipo.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Marca y modelo</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Honda CB110"
          value={modelo}
          onChangeText={(v) => setModelo(limpiarModelo(v))}
          maxLength={LIMITES.modelo}
        />

        <Text style={styles.label}>Patente</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: ABCD12"
          value={patente}
          onChangeText={(v) => setPatente(limpiarPatente(v))}
          maxLength={LIMITES.patente}
          autoCapitalize="characters"
        />

        <TouchableOpacity style={styles.boton} onPress={registrarse} disabled={enviando || cargandoUsuario}>
          {enviando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>Registrarme</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.botonCancelar} onPress={() => router.back()} disabled={enviando}>
          <Text style={styles.botonCancelarTexto}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  subtitulo: { fontSize: 14, color: '#666', marginBottom: 20 },
  tarjetaUsuario: {
    backgroundColor: '#fdf0f1', borderRadius: 10, padding: 16, marginBottom: 24,
  },
  tarjetaUsuarioLabel: { fontSize: 11, fontWeight: '700', color: '#e63946', textTransform: 'uppercase', marginBottom: 4 },
  tarjetaUsuarioNombre: { fontSize: 16, fontWeight: '700', color: '#1d1d1d' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  tiposVehiculo: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  tipoChip: {
    flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center',
  },
  tipoChipActivo: { backgroundColor: '#fdf0f1', borderColor: '#e63946' },
  tipoIcono: { fontSize: 22, marginBottom: 4 },
  tipoTexto: { fontSize: 12, color: '#666', fontWeight: '600' },
  tipoTextoActivo: { color: '#e63946' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 12 },
  boton: { backgroundColor: '#e63946', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  botonTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  botonCancelar: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  botonCancelarTexto: { color: '#666', fontWeight: '600', fontSize: 14 },
});