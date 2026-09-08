import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
  const { iniciarSesion, cargando, listo } = useAuth();
  const [aceptaTerminos, setAceptaTerminos] = useState(false);

  const handleLogin = async () => {
    if (!aceptaTerminos) return;
    const token = await iniciarSesion();
    if (token) {
      router.replace('/(tabs)/inicio');
    }
  };

  const volverAInvitado = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/inicio');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.acentoSuperior} />

      <TouchableOpacity style={styles.botonVolver} onPress={volverAInvitado} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.logoWrapper}>
          <Image
            source={require('@/assets/images/logonexo.jpg')}
            style={styles.logo}
            resizeMode="cover"
          />
        </View>

        <Text style={styles.subtitle}>Conectamos contigo</Text>

        <View style={styles.espaciador} />

        <TouchableOpacity
          style={styles.checkboxFila}
          onPress={() => setAceptaTerminos((prev) => !prev)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, aceptaTerminos && styles.checkboxMarcado]}>
            {aceptaTerminos && <Ionicons name="checkmark" size={14} color="#e63946" />}
          </View>
          <Text style={styles.notaLegal}>
            Leí y acepto los{' '}
            <Text style={styles.notaLegalLink} onPress={() => router.push('/terminos' as any)}>
              Términos y Condiciones
            </Text>
            {' '}y la{' '}
            <Text style={styles.notaLegalLink} onPress={() => router.push('/privacidad' as any)}>
              Política de Privacidad
            </Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.googleButton, !aceptaTerminos && styles.googleButtonDeshabilitado]}
          onPress={handleLogin}
          disabled={!listo || cargando || !aceptaTerminos}
          activeOpacity={0.85}
        >
          {cargando ? (
            <ActivityIndicator color="#e63946" />
          ) : (
            <>
              <Image
                source={{ uri: 'https://www.google.com/favicon.ico' }}
                style={styles.googleIcono}
              />
              <Text style={styles.googleButtonText}>Iniciar sesión con Google</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.acentoInferior} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#c1121f' },
  botonVolver: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  acentoSuperior: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  acentoInferior: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoWrapper: {
    width: 120,
    height: 120,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
    borderWidth: 3,
    borderColor: '#fff',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  espaciador: { height: 44 },
  checkboxFila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    marginRight: 10,
    marginTop: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxMarcado: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 28,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  googleButtonDeshabilitado: {
    opacity: 0.5,
  },
  googleIcono: { width: 20, height: 20 },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  notaLegal: {
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 17,
    flex: 1,
  },
  notaLegalLink: { color: '#fff', fontWeight: '700', textDecorationLine: 'underline' },
});