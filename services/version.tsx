import { createContext, useContext, useState, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Solo para la demostración del pitch: en esta rama el selector siempre está visible.
const MODO_DEMO = true;

export type Version = 1 | 2 | 3;

export const VERSIONES: { id: Version; nombre: string; detalle: string }[] = [
  { id: 1, nombre: 'V1', detalle: 'Base' },
  { id: 2, nombre: 'V2', detalle: 'SNS y SQS' },
  { id: 3, nombre: 'V3', detalle: 'Kinesis' },
];

// Primera versión en la que existe cada función.
export const FUNCIONES = {
  notificaciones: 2,
  puntos: 2,
  ofertas: 3,
} as const;

export type Funcion = keyof typeof FUNCIONES;

type Contexto = {
  version: Version;
  setVersion: (v: Version) => void;
  activa: (f: Funcion) => boolean;
};

const VersionContext = createContext<Contexto>({
  version: 3,
  setVersion: () => {},
  activa: () => true,
});

export function useVersion() {
  return useContext(VersionContext);
}

export function useFuncion(f: Funcion) {
  return useContext(VersionContext).activa(f);
}

function SelectorVersion() {
  const { version, setVersion } = useVersion();
  const [abierto, setAbierto] = useState(false);
  const insets = useSafeAreaInsets();

  if (!MODO_DEMO) return null;

  return (
    <View pointerEvents="box-none" style={[styles.contenedor, { bottom: 80 + insets.bottom }]}>
      {abierto &&
        VERSIONES.map((v) => (
          <TouchableOpacity
            key={v.id}
            style={[styles.opcion, v.id === version && styles.opcionActiva]}
            onPress={() => {
              setVersion(v.id);
              setAbierto(false);
            }}
          >
            <Text style={[styles.opcionTexto, v.id === version && styles.opcionTextoActivo]}>
              {v.nombre} · {v.detalle}
            </Text>
          </TouchableOpacity>
        ))}
      <TouchableOpacity style={styles.boton} onPress={() => setAbierto((a) => !a)}>
        <Text style={styles.botonTexto}>V{version}</Text>
      </TouchableOpacity>
    </View>
  );
}

export function VersionProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState<Version>(3);
  const activa = (f: Funcion) => version >= FUNCIONES[f];

  return (
    <VersionContext.Provider value={{ version, setVersion, activa }}>
      <View style={{ flex: 1 }}>
        {children}
        <SelectorVersion />
      </View>
    </VersionContext.Provider>
  );
}

const styles = StyleSheet.create({
  contenedor: { position: 'absolute', left: 12, alignItems: 'flex-start', gap: 6 },
  boton: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#1d1d1d',
    justifyContent: 'center', alignItems: 'center', elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6,
  },
  botonTexto: { color: '#fff', fontWeight: '800', fontSize: 14 },
  opcion: {
    backgroundColor: '#fff', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1.5, borderColor: '#ddd', elevation: 8,
  },
  opcionActiva: { backgroundColor: '#c1121f', borderColor: '#c1121f' },
  opcionTexto: { fontWeight: '700', fontSize: 13, color: '#1d1d1d' },
  opcionTextoActivo: { color: '#fff' },
});
