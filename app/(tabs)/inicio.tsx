import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Image, Dimensions } from 'react-native';
import { useState, useRef } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const ANCHO_PANTALLA = Dimensions.get('window').width;

const CATEGORIAS = [
  { key: 'RESTAURANTE', label: 'Restaurantes', imagen: require('@/assets/images/restaurante.jpg') },
  { key: 'MERCADO', label: 'Mercados', imagen: require('@/assets/images/mercado.jpg') },
  { key: 'BOTILLERIA', label: 'Botillerías', imagen: require('@/assets/images/botilleria.jpg') },
  { key: 'CAFETERIA', label: 'Cafeterías', imagen: require('@/assets/images/cafeteria.jpg') },
];

const BANNERS = [
  {
    imagen: require('@/assets/images/banner1.jpg'),
    titulo: 'Tu primer café del día',
    sub: 'Directo a tu puerta, sin salir de casa',
  },
  {
    imagen: require('@/assets/images/banner2.jpg'),
    titulo: 'Frescura que se nota',
    sub: 'Rollos preparados al momento, listos para vos',
  },
  {
    imagen: require('@/assets/images/banner3.jpg'),
    titulo: 'Comer rico también es sano',
    sub: 'Ingredientes frescos, todos los días de la semana',
  },
];

export default function InicioScreen() {
  const [busqueda, setBusqueda] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const buscar = () => {
    if (busqueda.trim().length === 0) return;
    router.push({ pathname: '/tiendas', params: { q: busqueda.trim() } });
  };

  // Lleva al listado de tiendas ya filtrado por la categoría tocada
  const irACategoria = (categoria: string) => {
    router.push({ pathname: '/tiendas', params: { categoria } });
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.bannerWrapper}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
        >
          {BANNERS.map((b, i) => (
            <View key={i} style={styles.bannerSlide}>
              <Image source={b.imagen} style={styles.banner} resizeMode="cover" />
              <View style={styles.bannerTexto}>
                <Text style={styles.bannerTitulo}>{b.titulo}</Text>
                <Text style={styles.bannerSub}>{b.sub}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Superpuesto sobre el carrusel, fuera del ScrollView horizontal, así no se mueve al deslizar */}
        <SafeAreaView style={styles.buscadorWrapper} edges={['top']}>
          <View style={styles.buscador}>
            <Ionicons name="search-outline" size={18} color="#999" style={{ marginLeft: 14 }} />
            <TextInput
              style={styles.buscadorInput}
              placeholder="Buscar tiendas..."
              placeholderTextColor="#aaa"
              value={busqueda}
              onChangeText={setBusqueda}
              onSubmitEditing={buscar}
              returnKeyType="search"
              maxLength={40}
            />
            {busqueda.length > 0 && (
              <TouchableOpacity onPress={() => setBusqueda('')} style={{ marginRight: 12 }}>
                <Ionicons name="close-circle" size={18} color="#ccc" />
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </View>

      <View style={styles.contenidoWrapper}>
        <View style={styles.figuraCirculoGrande} />
        <View style={styles.figuraCirculoChico} />
        <View style={styles.figuraCuadrado} />

        <View style={styles.contenido}>
          <Text style={styles.seccionTitulo}>¿Qué buscás hoy?</Text>
          <View style={styles.grid}>
            {CATEGORIAS.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={styles.card}
                onPress={() => irACategoria(cat.key)}
                activeOpacity={0.85}
              >
                <Image source={cat.imagen} style={styles.cardImagen} resizeMode="cover" />
                <View style={styles.cardOverlay}>
                  <Text style={styles.cardTexto}>{cat.label}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f6' },

  bannerWrapper: {
    position: 'relative',
  },
  bannerSlide: {
    width: ANCHO_PANTALLA,
    height: 300,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  banner: { width: '100%', height: '100%', position: 'absolute' },

  buscadorWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  buscadorInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 10, fontSize: 14, color: '#333' },

  bannerTexto: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  bannerTitulo: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  bannerSub: {
    color: '#fff',
    fontSize: 13,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  contenidoWrapper: {
    position: 'relative',
    overflow: 'hidden',
  },
  figuraCirculoGrande: {
    position: 'absolute',
    top: -40,
    right: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(230,57,70,0.04)',
  },
  figuraCirculoChico: {
    position: 'absolute',
    top: 90,
    left: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(230,57,70,0.06)',
  },
  figuraCuadrado: {
    position: 'absolute',
    bottom: -20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(230,57,70,0.04)',
    transform: [{ rotate: '20deg' }],
  },

  contenido: { padding: 20, paddingTop: 28 },
  seccionTitulo: { fontSize: 17, fontWeight: '800', marginBottom: 16, color: '#1d1d1d', letterSpacing: 0.2 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  card: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImagen: { width: '100%', height: '100%' },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  cardTexto: { color: '#fff', fontSize: 14, fontWeight: '700' },
});