import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TerminosScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Términos y Condiciones',
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
          Los presentes Términos y Condiciones regulan el acceso y uso de la plataforma NEXO
          (en adelante, "la Plataforma"), operada en la República de Chile, que conecta a
          Clientes, Tiendas y Conductores para la intermediación de pedidos de productos.
          Al crear una cuenta o utilizar la Plataforma, usted declara haber leído y aceptado
          estos términos en su totalidad.
        </Text>

        <Text style={styles.titulo}>1. Naturaleza del servicio</Text>
        <Text style={styles.parrafo}>
          NEXO es un intermediario tecnológico que facilita la conexión entre usuarios que
          desean adquirir productos ("Clientes"), comercios que los ofrecen ("Tiendas") y
          personas que realizan la entrega física ("Conductores"). NEXO no es propietario,
          fabricante ni vendedor directo de los productos ofrecidos por las Tiendas, y no
          mantiene una relación de dependencia laboral con los Conductores, quienes prestan
          sus servicios de manera independiente.
        </Text>

        <Text style={styles.titulo}>2. Registro y cuenta de usuario</Text>
        <Text style={styles.parrafo}>
          El acceso a la Plataforma requiere autenticación mediante cuenta de Google. El
          usuario es responsable de la veracidad de la información proporcionada y de
          mantener la confidencialidad de las credenciales asociadas a su cuenta. NEXO se
          reserva el derecho de suspender o eliminar cuentas que infrinjan estos términos,
          que proporcionen información falsa, o que sean utilizadas con fines fraudulentos.
        </Text>
        <Text style={styles.parrafo}>
          El registro está destinado a personas mayores de 18 años. Si usted es menor de
          edad, deberá contar con la autorización expresa de su padre, madre o tutor legal
          para utilizar la Plataforma.
        </Text>

        <Text style={styles.titulo}>3. Rol de Tienda</Text>
        <Text style={styles.parrafo}>
          Todo usuario que solicite registrar una Tienda queda sujeto a un proceso de
          revisión y aprobación por parte del equipo administrador de NEXO. La aprobación
          no constituye garantía, aval ni certificación de la calidad de los productos o
          servicios ofrecidos por dicha Tienda. Las Tiendas son las únicas responsables de
          la exactitud de la información de sus productos, precios, disponibilidad, y del
          cumplimiento de la normativa sanitaria y comercial aplicable a su rubro, conforme
          a lo dispuesto en la Ley N° 19.496 sobre Protección de los Derechos de los
          Consumidores.
        </Text>

        <Text style={styles.titulo}>4. Rol de Conductor</Text>
        <Text style={styles.parrafo}>
          El registro como Conductor está igualmente sujeto a aprobación administrativa.
          El Conductor presta sus servicios de entrega en calidad de prestador
          independiente, no existiendo entre este y NEXO vínculo de subordinación ni
          dependencia en los términos del Código del Trabajo. El Conductor es responsable
          de contar con la documentación vigente de su vehículo y de conducir conforme a la
          Ley N° 18.290 de Tránsito.
        </Text>

        <Text style={styles.titulo}>5. Pedidos, pagos y cancelaciones</Text>
        <Text style={styles.parrafo}>
          Los precios de los productos son fijados de forma exclusiva por cada Tienda. El
          Cliente acepta el cobro correspondiente al momento de confirmar su pedido. Las
          políticas de cancelación y reembolso vigentes en la Plataforma se aplican de
          forma automática según el estado del pedido al momento de la solicitud de
          cancelación, pudiendo generar cargos parciales una vez iniciada la preparación
          del pedido por parte de la Tienda.
        </Text>

        <Text style={styles.titulo}>6. Limitación de responsabilidad</Text>
        <Text style={styles.parrafo}>
          NEXO actúa exclusivamente como intermediario tecnológico. En consecuencia, no
          garantiza la calidad, inocuidad, oportunidad ni exactitud de los productos
          entregados por las Tiendas, sin perjuicio de facilitar mecanismos de reclamo
          conforme a la Ley N° 19.496. NEXO adoptará las medidas razonables para atender
          reclamos, pudiendo suspender o dar de baja a Tiendas o Conductores que incumplan
          reiteradamente sus obligaciones.
        </Text>

        <Text style={styles.titulo}>7. Propiedad intelectual</Text>
        <Text style={styles.parrafo}>
          El nombre "NEXO", su logotipo, diseño de la aplicación y demás elementos
          distintivos son propiedad de sus titulares y se encuentran protegidos por la Ley
          N° 17.336 sobre Propiedad Intelectual. Queda prohibida su reproducción total o
          parcial sin autorización expresa.
        </Text>

        <Text style={styles.titulo}>8. Modificaciones</Text>
        <Text style={styles.parrafo}>
          NEXO podrá modificar estos Términos y Condiciones en cualquier momento. Los
          cambios se entenderán aceptados por el uso continuado de la Plataforma con
          posterioridad a su publicación.
        </Text>

        <Text style={styles.titulo}>9. Ley aplicable y jurisdicción</Text>
        <Text style={styles.parrafo}>
          Estos términos se rigen por las leyes de la República de Chile. Cualquier
          controversia derivada de su interpretación o aplicación será sometida a los
          tribunales ordinarios de justicia competentes, sin perjuicio de los derechos que
          asisten al consumidor conforme a la Ley N° 19.496.
        </Text>

        <Text style={styles.parrafoFinal}>
          Para consultas relacionadas con estos Términos y Condiciones, puede contactar al
          equipo de NEXO a través de los canales disponibles en la Plataforma.
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