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
        <Text style={styles.actualizado}>Última actualización: octubre de 2026</Text>

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

        <Text style={styles.titulo}>6. Ofertas por tiempo limitado</Text>
        <Text style={styles.parrafo}>
          Las Tiendas pueden publicar ofertas por tiempo limitado sobre sus productos. Cada
          oferta indica el porcentaje de descuento, el precio resultante y su fecha de
          término, y es financiada íntegramente por la Tienda que la publica: NEXO calcula
          su comisión sobre el precio efectivamente cobrado al Cliente.
        </Text>
        <Text style={styles.parrafo}>
          Vigencia y límites: la oferta está disponible hasta su fecha y hora de término
          (hora de Chile) o hasta que se agote el cupo de unidades definido por la Tienda,
          lo que ocurra primero, y puede ser cancelada por la Tienda antes de ese plazo.
          Cada oferta puede limitar la cantidad de unidades por pedido que acceden al
          precio rebajado; las unidades adicionales se cobran al precio regular del
          producto.
        </Text>
        <Text style={styles.parrafo}>
          Precio aplicable: el precio de oferta que se muestra en el carrito es una
          estimación. El precio definitivo es el vigente al momento en que el Cliente
          confirma su pedido, por lo que una oferta que termine o se agote antes de esa
          confirmación no se aplicará. El precio cobrado queda registrado en el pedido y no
          varía aunque la oferta termine después.
        </Text>
        <Text style={styles.parrafo}>
          Otras condiciones: el tope de pago con puntos se calcula sobre el subtotal de
          productos ya con la oferta aplicada. En caso de cancelación, los reembolsos y
          cargos se calculan sobre el monto efectivamente pagado por el Cliente.
        </Text>

        <Text style={styles.titulo}>7. Programa de puntos NEXO</Text>
        <Text style={styles.parrafo}>
          Acumulación: el Cliente acumula 1 punto por cada $1.000 pagados en un pedido, una
          vez que este se encuentra completado, es decir, entregado y con su recepción
          confirmada. Los pedidos cancelados no generan puntos.
        </Text>
        <Text style={styles.parrafo}>
          Canje: cada punto equivale a $10 y solo puede usarse para pagar productos, no el
          costo de envío. En cada pedido se puede pagar con puntos hasta el 10 % del
          subtotal de productos, y el canje mínimo es de 25 puntos por pedido. Los puntos
          no son canjeables por dinero, no son transferibles entre cuentas y no pueden
          combinarse con otros beneficios que lo indiquen expresamente.
        </Text>
        <Text style={styles.parrafo}>
          Vigencia: los puntos vencen 12 meses después de la fecha en que fueron
          acreditados, al término de ese día (hora de Chile). Al canjear, se utilizan
          primero los puntos más antiguos. Los puntos acumulados antes del 23 de octubre de
          2026 vencen el 23 de octubre de 2027. NEXO informará en la aplicación el saldo y
          la fecha del próximo vencimiento, y enviará un aviso 30 y 7 días antes de que
          venzan.
        </Text>
        <Text style={styles.parrafo}>
          Cancelaciones: si un pedido pagado con puntos se cancela, los puntos canjeados se
          devuelven a la cuenta del Cliente, conservando su fecha de vencimiento original.
        </Text>
        <Text style={styles.parrafo}>
          NEXO podrá modificar las condiciones del programa de puntos, informando a los
          Clientes en la aplicación con al menos 30 días de anticipación. Las
          modificaciones no afectarán la vigencia de los puntos ya acreditados. NEXO podrá
          anular los puntos obtenidos mediante fraude o uso indebido de la Plataforma.
        </Text>

        <Text style={styles.titulo}>8. Limitación de responsabilidad</Text>
        <Text style={styles.parrafo}>
          NEXO actúa exclusivamente como intermediario tecnológico. En consecuencia, no
          garantiza la calidad, inocuidad, oportunidad ni exactitud de los productos
          entregados por las Tiendas, sin perjuicio de facilitar mecanismos de reclamo
          conforme a la Ley N° 19.496. NEXO adoptará las medidas razonables para atender
          reclamos, pudiendo suspender o dar de baja a Tiendas o Conductores que incumplan
          reiteradamente sus obligaciones.
        </Text>

        <Text style={styles.titulo}>9. Propiedad intelectual</Text>
        <Text style={styles.parrafo}>
          El nombre "NEXO", su logotipo, diseño de la aplicación y demás elementos
          distintivos son propiedad de sus titulares y se encuentran protegidos por la Ley
          N° 17.336 sobre Propiedad Intelectual. Queda prohibida su reproducción total o
          parcial sin autorización expresa.
        </Text>

        <Text style={styles.titulo}>10. Modificaciones</Text>
        <Text style={styles.parrafo}>
          NEXO podrá modificar estos Términos y Condiciones en cualquier momento. Los
          cambios se entenderán aceptados por el uso continuado de la Plataforma con
          posterioridad a su publicación.
        </Text>

        <Text style={styles.titulo}>11. Ley aplicable y jurisdicción</Text>
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
