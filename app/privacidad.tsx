import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacidadScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Política de Privacidad',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
              <Ionicons name="arrow-back" size={24} color="#1d1d1d" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        <Text style={styles.actualizado}>Última actualización: septiembre de 2026</Text>

        <Text style={styles.parrafo}>
          Esta Política de Privacidad describe cómo NEXO recolecta, utiliza, almacena y
          protege los datos personales de sus usuarios, en conformidad con la Ley N° 19.628
          sobre Protección de la Vida Privada, actualmente vigente, y con las disposiciones
          de la Ley N° 21.719 que Regula la Protección y el Tratamiento de los Datos
          Personales y Crea la Agencia de Protección de Datos Personales, que entrará en
          vigencia el 1 de diciembre de 2026.
        </Text>

        <Text style={styles.titulo}>1. Datos que recolectamos</Text>
        <Text style={styles.parrafo}>
          A través de la autenticación con Google, recolectamos su nombre, dirección de
          correo electrónico y fotografía de perfil. Adicionalmente, recolectamos las
          direcciones de entrega que usted registre (incluyendo, si lo autoriza
          expresamente, su ubicación geográfica mediante GPS), el historial de pedidos, y,
          en caso de registrarse como Tienda o Conductor, los datos comerciales o del
          vehículo que dicho registro requiera.
        </Text>

        <Text style={styles.titulo}>2. Finalidad del tratamiento</Text>
        <Text style={styles.parrafo}>
          Los datos recolectados se utilizan exclusivamente para: (a) gestionar su cuenta y
          autenticación; (b) procesar y hacer seguimiento de pedidos; (c) coordinar la
          entrega entre Tiendas, Clientes y Conductores; (d) enviar notificaciones
          relacionadas con el estado de sus solicitudes y pedidos; y (e) atender consultas o
          reclamos. NEXO no vende ni comparte sus datos personales con terceros con fines
          de publicidad no relacionados con el servicio.
        </Text>

        <Text style={styles.titulo}>3. Base de licitud</Text>
        <Text style={styles.parrafo}>
          El tratamiento de sus datos se sustenta en la ejecución del servicio solicitado
          por usted al registrarse y utilizar la Plataforma, así como en su consentimiento
          expreso otorgado al momento de autenticarse mediante Google y de conceder, cuando
          corresponda, el permiso de acceso a su ubicación.
        </Text>

        <Text style={styles.titulo}>4. Compartición de datos entre usuarios de la Plataforma</Text>
        <Text style={styles.parrafo}>
          Para el correcto funcionamiento del servicio, ciertos datos se comparten
          necesariamente entre los distintos roles: la Tienda recibe la dirección de
          entrega y el detalle del pedido del Cliente; el Conductor asignado recibe la
          dirección de entrega necesaria para completar la entrega. Este flujo de
          información constituye el objeto mismo del servicio contratado.
        </Text>

        <Text style={styles.titulo}>5. Almacenamiento y seguridad</Text>
        <Text style={styles.parrafo}>
          Sus datos son almacenados en servidores con medidas de seguridad técnicas y
          organizativas razonables, incluyendo autenticación mediante tokens seguros
          (JWT) y control de acceso por roles. No obstante, ningún sistema es
          absolutamente inexpugnable, por lo que NEXO no puede garantizar la seguridad
          absoluta de la información transmitida.
        </Text>

        <Text style={styles.titulo}>6. Derechos del titular (Derechos ARCO+)</Text>
        <Text style={styles.parrafo}>
          Usted tiene derecho a acceder, rectificar, cancelar y oponerse al tratamiento de
          sus datos personales, así como, conforme al nuevo marco de la Ley N° 21.719, a
          solicitar la portabilidad de sus datos y a revocar su consentimiento en cualquier
          momento. Para ejercer estos derechos, puede eliminar su cuenta desde la
          Plataforma o contactar al equipo de NEXO a través de los canales disponibles.
        </Text>
        <Text style={styles.parrafo}>
          Tenga presente que la eliminación de su registro dentro de la Plataforma no
          elimina su cuenta de Google; ambas son independientes entre sí.
        </Text>

        <Text style={styles.titulo}>7. Conservación de los datos</Text>
        <Text style={styles.parrafo}>
          Sus datos se conservarán mientras mantenga una cuenta activa en la Plataforma. En
          caso de solicitar la eliminación de su cuenta, sus datos personales serán
          eliminados o anonimizados, salvo aquella información que deba conservarse por
          obligación legal (por ejemplo, registros tributarios de pedidos ya completados).
        </Text>

        <Text style={styles.titulo}>8. Menores de edad</Text>
        <Text style={styles.parrafo}>
          La Plataforma no está dirigida a menores de 18 años. NEXO no recolecta
          deliberadamente datos de menores sin la autorización de su padre, madre o tutor
          legal.
        </Text>

        <Text style={styles.titulo}>9. Cambios a esta política</Text>
        <Text style={styles.parrafo}>
          Esta Política de Privacidad podrá ser actualizada para reflejar cambios
          normativos o del servicio. Se notificará a los usuarios sobre modificaciones
          sustanciales a través de la Plataforma.
        </Text>

        <Text style={styles.parrafoFinal}>
          Para ejercer sus derechos o realizar consultas sobre el tratamiento de sus datos,
          puede contactar al equipo de NEXO a través de los canales disponibles en la
          Plataforma.
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  actualizado: { fontSize: 12, color: '#999', marginBottom: 20 },
  titulo: { fontSize: 15, fontWeight: '700', marginTop: 20, marginBottom: 8, color: '#1d1d1d' },
  parrafo: { fontSize: 13.5, color: '#444', lineHeight: 21, marginBottom: 4 },
  parrafoFinal: { fontSize: 13, color: '#999', lineHeight: 20, marginTop: 24, fontStyle: 'italic' },
});