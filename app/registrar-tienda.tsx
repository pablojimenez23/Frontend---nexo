import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useState } from 'react';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiStores } from '@/services/api';

const CATEGORIAS = [
  { key: 'RESTAURANTE', label: 'Restaurante' },
  { key: 'BOTILLERIA', label: 'Botillería' },
  { key: 'MERCADO', label: 'Mercado' },
  { key: 'CAFETERIA', label: 'Cafetería' },
];

const REGEX_TEXTO_LIBRE = /[^a-zA-Z0-9À-ÿñÑ\s.,°#-]/g;
const REGEX_HORARIO = /[^0-9:\-\s]/g;
const REGEX_HORARIO_VALIDO = /^([01]?\d|2[0-3]):[0-5]\d\s*-\s*([01]?\d|2[0-3]):[0-5]\d$/;

const LIMITES = {
  nombre: 60,
  descripcion: 200,
  direccion: 100,
  horario: 20,
  montoMinimo: 9,
};

export default function RegistrarTiendaScreen() {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [direccion, setDireccion] = useState('');
  const [horario, setHorario] = useState('');
  const [montoMinimo, setMontoMinimo] = useState('');
  const [categoria, setCategoria] = useState('RESTAURANTE');
  const [enviando, setEnviando] = useState(false);

  const limpiarTexto = (valor: string, limite: number) =>
    valor.replace(REGEX_TEXTO_LIBRE, '').slice(0, limite);

  const limpiarHorario = (valor: string) =>
    valor.replace(REGEX_HORARIO, '').slice(0, LIMITES.horario);

  const limpiarMonto = (valor: string) =>
    valor.replace(/[^0-9]/g, '').slice(0, LIMITES.montoMinimo);

  const validar = (): string | null => {
    if (nombre.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres';
    if (direccion.trim().length < 5) return 'Ingresá una dirección más específica';
    if (descripcion.trim().length < 5) return 'Contanos un poco más sobre tu tienda';
    if (!REGEX_HORARIO_VALIDO.test(horario.trim())) {
      return 'El horario debe tener el formato HH:MM-HH:MM (ej: 12:00-23:00)';
    }
    return null;
  };

  const enviarSolicitud = async () => {
    const error = validar();
    if (error) {
      Alert.alert('Revisá los datos', error);
      return;
    }

    setEnviando(true);
    try {
      await apiStores.post('/tiendas', {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        direccion: direccion.trim(),
        horario: horario.trim(),
        montoMinimo: montoMinimo ? Number(montoMinimo) : 0,
        categoria,
      });
      Alert.alert(
        'Solicitud enviada',
        'Tu tienda quedó pendiente de aprobación por un administrador.',
        [{ text: 'OK', onPress: () => router.replace('/perfil' as any) }]
      );
    } catch {
      Alert.alert('Error', 'No se pudo enviar la solicitud');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Registrar tienda',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
              <Ionicons name="arrow-back" size={24} color="#1d1d1d" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.subtitulo}>Tu solicitud será revisada por un administrador</Text>

        <Text style={styles.label}>Nombre de la tienda</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: Pizzería Don Mario"
          value={nombre}
          onChangeText={(v) => setNombre(limpiarTexto(v, LIMITES.nombre))}
          maxLength={LIMITES.nombre}
        />
        <Text style={styles.contador}>{nombre.length}/{LIMITES.nombre}</Text>

        <Text style={styles.label}>Descripción</Text>
        <TextInput
          style={[styles.input, styles.inputMultilinea]}
          placeholder="Contanos qué vendés y qué te hace especial"
          value={descripcion}
          onChangeText={(v) => setDescripcion(limpiarTexto(v, LIMITES.descripcion))}
          maxLength={LIMITES.descripcion}
          multiline
        />
        <Text style={styles.contador}>{descripcion.length}/{LIMITES.descripcion}</Text>

        <Text style={styles.label}>Dirección</Text>
        <TextInput
          style={styles.input}
          placeholder="Calle, número, comuna"
          value={direccion}
          onChangeText={(v) => setDireccion(limpiarTexto(v, LIMITES.direccion))}
          maxLength={LIMITES.direccion}
        />
        <Text style={styles.contador}>{direccion.length}/{LIMITES.direccion}</Text>

        <Text style={styles.label}>Horario</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: 12:00-23:00"
          value={horario}
          onChangeText={(v) => setHorario(limpiarHorario(v))}
          maxLength={LIMITES.horario}
        />
        <Text style={styles.ayudaHorario}>Formato obligatorio: HH:MM-HH:MM</Text>

        <Text style={styles.label}>Monto mínimo de pedido</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          value={montoMinimo}
          onChangeText={(v) => setMontoMinimo(limpiarMonto(v))}
          keyboardType="numeric"
          maxLength={LIMITES.montoMinimo}
        />

        <Text style={styles.label}>Categoría</Text>
        <View style={styles.categorias}>
          {CATEGORIAS.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.categoriaChip, categoria === cat.key && styles.categoriaChipActiva]}
              onPress={() => setCategoria(cat.key)}
            >
              <Text style={[styles.categoriaChipTexto, categoria === cat.key && styles.categoriaChipTextoActivo]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.boton} onPress={enviarSolicitud} disabled={enviando}>
          {enviando ? <ActivityIndicator color="#fff" /> : <Text style={styles.botonTexto}>Enviar solicitud</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.botonCancelar} onPress={() => router.back()} disabled={enviando}>
          <Text style={styles.botonCancelarTexto}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  subtitulo: { fontSize: 14, color: '#666', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 14 },
  inputMultilinea: { minHeight: 80, textAlignVertical: 'top' },
  contador: { fontSize: 11, color: '#aaa', textAlign: 'right', marginTop: 4, marginBottom: 8 },
  ayudaHorario: { fontSize: 11, color: '#999', marginTop: 4, marginBottom: 8 },
  categorias: { flexDirection: 'row', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  categoriaChip: { borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16 },
  categoriaChipActiva: { backgroundColor: '#c1121f', borderColor: '#c1121f' },
  categoriaChipTexto: { fontSize: 13, color: '#666' },
  categoriaChipTextoActivo: { color: '#fff', fontWeight: '600' },
  boton: { backgroundColor: '#c1121f', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  botonTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  botonCancelar: { paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  botonCancelarTexto: { color: '#666', fontWeight: '600', fontSize: 14 },
});