# nexo-app (frontend móvil)

Aplicación móvil de NEXO, marketplace de delivery, hecha con React Native y Expo. Autentica con Amazon Cognito (correo y contraseña, y Google mediante el login administrado) y consume los microservicios de NEXO (ms-users, ms-stores, ms-products, ms-orders y ms-queues) a través del Application Load Balancer de AWS.

## Estado de evidencia

| Categoría | Estado |
|---|---|
| Implementado | login y cierre de sesión con Cognito, sesión con tokens guardados en `expo-secure-store`, catálogo de tiendas y productos, carrito, checkout con dirección y ubicación, pago con puntos, seguimiento de pedidos por estado, cancelación con devolución, notificaciones con contador de no leídas, perfil con direcciones y puntos, registro de tienda y de conductor, panel de la tienda (Mi tienda) y del conductor |
| Configurado | entorno AWS nuevo (Cognito y ALB), compilación Android con EAS (perfil `preview`), tres versiones del frontend en ramas y etiquetas |
| Validado | flujo de pedido en un celular real contra el backend desplegado: crear, pagar, cancelar y completar un pedido, con acumulación y devolución de puntos |
| Pendiente de validación | login con Google de extremo a extremo en el entorno nuevo; APK compilado contra el ALB nuevo (hoy se prueba con `npx expo start`); HTTPS (el laboratorio de AWS solo ofrece HTTP) |

## 1. Stack técnico

- React Native con Expo SDK 54
- Expo Router (rutas por archivos en `app/`)
- TypeScript
- `expo-secure-store` (tokens), `expo-location` (ubicación de entrega), `@expo/vector-icons`
- Amazon Cognito como proveedor de identidad (OAuth 2.0 / OpenID Connect)

## 2. Versiones del frontend

El frontend se entrega en tres versiones, una por etapa del proyecto. Cada versión es una release que llega a `main` pasando por `staging`, y también tiene una rama propia.

| Versión | Release | Rama de versión | Commit | Fecha del commit | Qué incluye |
|---|---|---|---|---|---|
| 1 | v1.0.0 | `rama-1-base` | `4effc44` | 5 sep 2026 | Etapa 1: proyecto base |
| 2 | v2.0.0 | `rama-2-sns-sqs` | `3b11940` | 23 sep 2026 | Etapa 2: SNS y SQS. Login propio, carrito y checkout, notificaciones con contador, pantalla de conductor |
| 3 | v3.0.0 | `rama-3-kinesis` | `9e13a78` | 21 nov 2026 | Etapa 3: Kinesis. Puntos, ofertas, catálogo, pantalla de producto con variantes, validación de productos y entorno AWS nuevo |

Ramas de trabajo: `develop` (integración), `staging` (preparación de releases) y `main` (versión final). `respaldo-completo` es una copia de seguridad de `develop`.

Para probar una versión:

```
git checkout rama-2-sns-sqs
npm install
npx expo start
```

## 3. Estructura

```
app/          pantallas y rutas (Expo Router); (tabs)/ para la barra inferior
components/   encabezado y piezas de interfaz reutilizables
context/      carrito de compras
hooks/        sesión (useAuth) y notificaciones no leídas (useNoLeidas)
services/     cliente HTTP y funciones por microservicio: api, pedidos, puntos, ofertas, catalogo
config/       configuración de Cognito
assets/       íconos e imágenes
```

Toda la comunicación con el backend pasa por `services/api.ts`, que adjunta el token de acceso a cada petición. La dependencia del proveedor de identidad está concentrada en `config/cognito.ts` y `hooks/useAuth.ts`: las pantallas solo consumen `useAuth()`.

## 4. Puesta en marcha

Requiere Node 20 o superior y la app Expo Go, o un APK de desarrollo, en el celular.

```
npm install
npx expo start
```

Escanea el código QR con el celular. Para compilar un APK de prueba:

```
npx eas-cli login
npx eas-cli build -p android --profile preview
```

Las compilaciones tardan en el plan gratuito de EAS. Se consultan con `npx eas-cli build:list`.

## 5. Configuración del entorno

| Valor | Dónde se define | Qué es |
|---|---|---|
| URL base del backend | `services/api.ts` | DNS del Application Load Balancer de AWS (HTTP en el laboratorio) |
| User pool, client ID y dominio | `config/cognito.ts` | Datos del user pool de Cognito y de su app client |
| URL de retorno | `config/cognito.ts` y `app.json` | `nexoapp://redirect` (esquema `nexoapp`) |

La URL de retorno debe coincidir exactamente con la registrada en el app client de Cognito. Si el laboratorio de AWS se reinicia, el DNS del ALB y el user pool cambian, y hay que actualizar estos archivos.

## 6. Rutas del balanceador

El ALB envía cada prefijo a su microservicio: `/stores*`, `/products*`, `/orders*` y `/messaging*`, y el resto a ms-users.

## 7. Pantallas principales

| Ruta | Qué muestra |
|---|---|
| `login` | Inicio de sesión con Cognito y con Google |
| `(tabs)/inicio` y `(tabs)/tiendas` | Categorías y listado de tiendas |
| `tienda/[id]` y `producto/[id]` | Catálogo de la tienda y detalle del producto con variantes |
| `carrito` y `checkout` | Carrito, dirección de entrega, pago con puntos y confirmación |
| `(tabs)/pedidos` y `pedido/[id]` | Pedidos del usuario con su estado, cancelación y confirmación de recepción |
| `(tabs)/perfil` | Datos del usuario, direcciones y puntos |
| `notificaciones` | Avisos del sistema, con contador de no leídos |
| `mi-tienda` y `tienda-actividad` | Gestión de la tienda: productos, ofertas y pedidos |
| `conductor` y `conductor-actividad` | Estado del conductor y pedidos para repartir |
| `registrar-tienda` y `registrar-conductor` | Solicitudes para vender o repartir |
| `terminos` | Términos y condiciones |

## 8. Decisiones de diseño

- **Tokens fuera del almacenamiento común.** El token de acceso y el de refresco se guardan en `expo-secure-store`, que usa el almacén seguro del sistema operativo.
- **Un solo punto de acceso al backend.** `services/api.ts` adjunta el token y centraliza los errores; las pantallas no hacen peticiones por su cuenta.
- **El estado del pedido se muestra con color y texto.** Cada estado (creado, pagado, confirmado, listo, entregado, completado, cancelado) tiene su insignia.
- **Estados de carga, vacío y error** en cada pantalla, con botón de reintento.
- **El contador de notificaciones** se actualiza con `useNoLeidas`.

## 9. Backend

NEXO se compone de cinco microservicios Spring Boot desplegados en AWS ECS Fargate. Repositorio del backend: https://github.com/pablojimenez23/Backend---Nexo