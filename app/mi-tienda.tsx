import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, Alert, ScrollView, Switch } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { router, useFocusEffect, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiStores, apiOrders, apiProducts } from '@/services/api';
import { useNoLeidas } from '@/hooks/useNoLeidas';
import { useFuncion } from '@/services/version';
import { Oferta, tiempoRestante } from '@/services/ofertas';
import {
  Campo,
  GrupoForm,
  OpcionForm,
  REGLAS,
  TipoInfo,
  VarianteForm,
  esBooleano,
  esLista,
  esNumerico,
  validarProducto,
} from '@/services/validacionProducto';
import {
  FILTROS_FECHA,
  FiltroFecha,
  GRUPOS_TIENDA,
  PRIORIDAD_TIENDA,
  dentroDeFecha,
  enGrupo,
  formatearFechaHora,
  normalizar,
  ordenarPedidos,
} from '@/services/pedidos';

// Color de los placeholders (negro para que se lean bien)
const PH = '#000000';

type Tienda = {
  id: string;
  nombre: string;
  estado: string;
};

type Pedido = {
  id: string;
  estado: string;
  total: number;
  comisionPlataforma: number;
  direccionEnvio: string;
  creadoEn?: string | null;
};

type Producto = {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  disponible: boolean;
  tipo?: string | null;
  destacado?: boolean;
  variantes?: { id: string; nombre: string; precio: number; stock: number }[];
};

const REGEX_TEXTO_LIBRE = /[^a-zA-Z0-9À-ÿñÑ\s.,°#-]/g;
const LIMITES = {
  nombre: REGLAS.nombre.max,
  descripcion: REGLAS.descripcion.max,
  precio: 8,
  stock: 5,
  variante: REGLAS.variantes.nombre,
  grupo: REGLAS.grupos.nombre,
  opcion: REGLAS.opciones.nombre,
};
const MAX_VARIANTES = REGLAS.variantes.max;
const MAX_GRUPOS = REGLAS.grupos.max;
const MAX_OPCIONES = REGLAS.opciones.max;

// Mismas reglas que ms-products (nexo.ofertas.*). El backend es el que manda: si cambian allá, cambian acá.
const OFERTA = {
  descuentoMinimo: 10,
  descuentoMaximo: 40,
  duraciones: [6, 12, 24, 48, 72],
  limites: [1, 2, 3, 4, 5],
  cupoMinimo: 3,
  cupoMaximo: 100,
  precioMinimo: 1000,
  comision: 0.12,
};

const ETIQUETA_ESTADO: Record<string, string> = {
  CREATED: 'Pendiente de pago',
  PAID: 'Por tomar',
  CONFIRMED: 'En preparación',
  PREPARING: 'En preparación',
  READY: 'Esperando conductor',
  DELIVERING: 'En reparto',
  DELIVERED: 'Entregado',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};

const precioConDescuento = (precio: number, porcentaje: number) =>
  Math.round((precio * (100 - porcentaje)) / 100);

export default function MiTiendaScreen() {
  const [tienda, setTienda] = useState<Tienda | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ofertas, setOfertas] = useState<Oferta[]>([]);
  const [tab, setTab] = useState<'pedidos' | 'productos'>('pedidos');
  const [cargando, setCargando] = useState(true);
  const [actualizandoId, setActualizandoId] = useState<string | null>(null);
  const noLeidas = useNoLeidas();
  const hayOfertas = useFuncion('ofertas');
  const hayNotificaciones = useFuncion('notificaciones');

  const [grupo, setGrupo] = useState('todos');
  const [fecha, setFecha] = useState<FiltroFecha>('todos');
  const [busqueda, setBusqueda] = useState('');

  // ---- Formulario de producto ----
  const [mostrandoFormulario, setMostrandoFormulario] = useState(false);
  const [tipos, setTipos] = useState<TipoInfo[]>([]);
  const [cargandoTipos, setCargandoTipos] = useState(false);
  const [tipoSel, setTipoSel] = useState<string | null>(null);
  const [nombreProducto, setNombreProducto] = useState('');
  const [descripcionProducto, setDescripcionProducto] = useState('');
  const [precioProducto, setPrecioProducto] = useState('');
  const [stockProducto, setStockProducto] = useState('');
  const [personasProducto, setPersonasProducto] = useState('1');
  const [destacadoProducto, setDestacadoProducto] = useState(false);
  const [atributos, setAtributos] = useState<Record<string, string | boolean>>({});
  const [variantes, setVariantes] = useState<VarianteForm[]>([]);
  const [grupos, setGrupos] = useState<GrupoForm[]>([]);
  const [guardando, setGuardando] = useState(false);

  const [ofertaProductoId, setOfertaProductoId] = useState<string | null>(null);
  const [ofertaPorcentaje, setOfertaPorcentaje] = useState('20');
  const [ofertaHoras, setOfertaHoras] = useState(24);
  const [ofertaCupo, setOfertaCupo] = useState('');
  const [ofertaLimite, setOfertaLimite] = useState(2);
  const [guardandoOferta, setGuardandoOferta] = useState(false);

  const tipoActual = useMemo(() => tipos.find((t) => t.clave === tipoSel) ?? null, [tipos, tipoSel]);

  const cargarDatos = () => {
    setCargando(true);
    apiStores.get('/tiendas/mi-tienda').then((res) => {
      const miTienda = res.data[0];
      setTienda(miTienda);
      if (miTienda) {
        return Promise.all([
          apiOrders.get(`/pedidos/tienda?tiendaId=${miTienda.id}`),
          apiProducts.get(`/productos?tiendaId=${miTienda.id}`),
          apiProducts
            .get(`/ofertas/mias?tiendaId=${miTienda.id}`)
            .catch(() => ({ data: [] as Oferta[] })),
        ]).then(([resPedidos, resProductos, resOfertas]) => {
          setPedidos(resPedidos.data);
          setProductos(resProductos.data);
          setOfertas(resOfertas.data);
        });
      }
    }).finally(() => setCargando(false));
  };

  const cargarOfertas = async (tiendaId: string) => {
    try {
      const res = await apiProducts.get(`/ofertas/mias?tiendaId=${tiendaId}`);
      setOfertas(res.data);
    } catch {
      setOfertas([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  // Pedidos que cumplen fecha y búsqueda (los contadores de los chips salen de acá)
  const baseFiltrada = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return pedidos.filter((p) => {
      if (!dentroDeFecha(p.creadoEn, fecha)) return false;
      if (!q) return true;
      const etiqueta = ETIQUETA_ESTADO[p.estado] ?? p.estado;
      return normalizar(`${p.direccionEnvio} ${etiqueta}`).includes(q);
    });
  }, [pedidos, fecha, busqueda]);

  const pedidosVisibles = useMemo(() => {
    const estados = GRUPOS_TIENDA.find((g) => g.clave === grupo)?.estados ?? null;
    return ordenarPedidos(baseFiltrada.filter((p) => enGrupo(p.estado, estados)), PRIORIDAD_TIENDA);
  }, [baseFiltrada, grupo]);

  // Resumen: lo que la tienda tiene que atender y lo que ya recibió hoy (pedidos completados)
  const resumen = useMemo(() => {
    const porAtender = pedidos.filter((p) => p.estado === 'PAID' || p.estado === 'CONFIRMED' || p.estado === 'PREPARING').length;
    const recibidoHoy = pedidos
      .filter((p) => p.estado === 'COMPLETED' && !!p.creadoEn && dentroDeFecha(p.creadoEn, 'hoy'))
      .reduce((acc, p) => acc + (p.total - p.comisionPlataforma), 0);
    return { porAtender, recibidoHoy };
  }, [pedidos]);

  const hayFiltros = grupo !== 'todos' || fecha !== 'todos' || busqueda.trim() !== '';

  const limpiarFiltros = () => {
    setGrupo('todos');
    setFecha('todos');
    setBusqueda('');
  };

  const limpiarTexto = (valor: string, limite: number) =>
    valor.replace(REGEX_TEXTO_LIBRE, '').slice(0, limite);

  const limpiarNumero = (valor: string, limite: number) =>
    valor.replace(/[^0-9]/g, '').slice(0, limite);

  const siguienteEstado = (estado: string): { accion: string; endpoint: string; icono: keyof typeof Ionicons.glyphMap } | null => {
    switch (estado) {
      case 'PAID': return { accion: 'Tomar orden', endpoint: 'tomar-orden', icono: 'checkmark-circle-outline' };
      case 'CONFIRMED': return { accion: 'Marcar listo para despacho', endpoint: 'listo', icono: 'bag-check-outline' };
      default: return null;
    }
  };

  const avanzarEstado = async (pedidoId: string, endpoint: string) => {
    setActualizandoId(pedidoId);
    try {
      await apiOrders.patch(`/pedidos/${pedidoId}/${endpoint}`);
      cargarDatos();
    } finally {
      setActualizandoId(null);
    }
  };

  // ==================== Formulario de producto ====================

  const cargarTipos = async () => {
    setCargandoTipos(true);
    try {
      const res = await apiProducts.get('/productos/tipos');
      setTipos(res.data);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los tipos de producto');
    } finally {
      setCargandoTipos(false);
    }
  };

  const abrirFormulario = () => {
    setMostrandoFormulario(true);
    if (tipos.length === 0) cargarTipos();
  };

  const reiniciarFormulario = () => {
    setTipoSel(null);
    setNombreProducto('');
    setDescripcionProducto('');
    setPrecioProducto('');
    setStockProducto('');
    setPersonasProducto('1');
    setDestacadoProducto(false);
    setAtributos({});
    setVariantes([]);
    setGrupos([]);
  };

  const cerrarFormulario = () => {
    reiniciarFormulario();
    setMostrandoFormulario(false);
  };

  const seleccionarTipo = (clave: string) => {
    if (clave === tipoSel) return;
    setTipoSel(clave);
    setAtributos({});
  };

  const usarSugeridos = () => {
    if (!tipoActual) return;
    setVariantes(
      tipoActual.variantesSugeridas.slice(0, MAX_VARIANTES).map((nombre) => ({ nombre, precio: '', stock: '' }))
    );
    setGrupos(
      tipoActual.gruposSugeridos.slice(0, MAX_GRUPOS).map((g) => ({
        nombre: g.nombre,
        minimo: String(g.minimo),
        maximo: String(g.maximo),
        opciones: g.opciones.slice(0, MAX_OPCIONES).map((nombre) => ({ nombre, precioAdicional: '0' })),
      }))
    );
  };

  const cambiarAtributo = (clave: string, valor: string | boolean) =>
    setAtributos((prev) => ({ ...prev, [clave]: valor }));

  // ---- Variantes ----
  const agregarVariante = () => {
    if (variantes.length >= MAX_VARIANTES) return;
    setVariantes((prev) => [...prev, { nombre: '', precio: '', stock: '' }]);
  };

  const cambiarVariante = (i: number, cambios: Partial<VarianteForm>) =>
    setVariantes((prev) => prev.map((v, idx) => (idx === i ? { ...v, ...cambios } : v)));

  const quitarVariante = (i: number) => setVariantes((prev) => prev.filter((_, idx) => idx !== i));

  // ---- Grupos de opciones ----
  const agregarGrupo = () => {
    if (grupos.length >= MAX_GRUPOS) return;
    setGrupos((prev) => [
      ...prev,
      { nombre: '', minimo: '0', maximo: '1', opciones: [{ nombre: '', precioAdicional: '0' }] },
    ]);
  };

  const cambiarGrupo = (i: number, cambios: Partial<GrupoForm>) =>
    setGrupos((prev) => prev.map((g, idx) => (idx === i ? { ...g, ...cambios } : g)));

  const quitarGrupo = (i: number) => setGrupos((prev) => prev.filter((_, idx) => idx !== i));

  const agregarOpcion = (gi: number) =>
    setGrupos((prev) =>
      prev.map((g, idx) =>
        idx === gi && g.opciones.length < MAX_OPCIONES
          ? { ...g, opciones: [...g.opciones, { nombre: '', precioAdicional: '0' }] }
          : g
      )
    );

  const cambiarOpcion = (gi: number, oi: number, cambios: Partial<OpcionForm>) =>
    setGrupos((prev) =>
      prev.map((g, idx) =>
        idx === gi
          ? { ...g, opciones: g.opciones.map((o, j) => (j === oi ? { ...o, ...cambios } : o)) }
          : g
      )
    );

  const quitarOpcion = (gi: number, oi: number) =>
    setGrupos((prev) =>
      prev.map((g, idx) => (idx === gi ? { ...g, opciones: g.opciones.filter((_, j) => j !== oi) } : g))
    );

  const publicarProducto = async () => {
    if (guardando) return; // evita doble envío

    const { error, payload } = validarProducto({
      tienda,
      tipo: tipoActual,
      nombre: nombreProducto,
      descripcion: descripcionProducto,
      precio: precioProducto,
      stock: stockProducto,
      personas: personasProducto,
      destacado: destacadoProducto,
      atributos,
      variantes,
      grupos,
      nombresExistentes: productos.map((p) => p.nombre),
    });

    if (error) {
      Alert.alert('Revisá los datos', error);
      return;
    }

    setGuardando(true);
    try {
      const res = await apiProducts.post('/productos', payload);
      setProductos((prev) => [...prev, res.data]);
      cerrarFormulario();
    } catch (err: any) {
      Alert.alert('No se pudo publicar', err.response?.data?.message || 'Intentá de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const cambiarDisponibilidad = async (producto: Producto) => {
    try {
      await apiProducts.patch(`/productos/${producto.id}/disponibilidad?disponible=${!producto.disponible}`);
      cargarDatos();
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el producto');
    }
  };

  const eliminarProducto = async (id: string) => {
    try {
      await apiProducts.delete(`/productos/${id}`);
      setProductos((prev) => prev.filter((p) => p.id !== id));
    } catch {
      Alert.alert('Error', 'No se pudo eliminar el producto');
    }
  };

  // ==================== Ofertas ====================

  const abrirFormularioOferta = (producto: Producto) => {
    if (producto.precio < OFERTA.precioMinimo) {
      Alert.alert(
        'Producto muy barato',
        `Solo se pueden hacer ofertas sobre productos de $${OFERTA.precioMinimo.toLocaleString('es-CL')} o más.`
      );
      return;
    }
    setOfertaProductoId(producto.id);
    setOfertaPorcentaje('20');
    setOfertaHoras(24);
    setOfertaCupo('');
    setOfertaLimite(2);
  };

  const cerrarFormularioOferta = () => setOfertaProductoId(null);

  const validarOferta = (producto: Producto): string | null => {
    const porcentaje = Number(ofertaPorcentaje);
    if (!ofertaPorcentaje || porcentaje < OFERTA.descuentoMinimo || porcentaje > OFERTA.descuentoMaximo) {
      return `El descuento debe estar entre ${OFERTA.descuentoMinimo} % y ${OFERTA.descuentoMaximo} %`;
    }
    if (ofertaCupo) {
      const cupo = Number(ofertaCupo);
      if (cupo < OFERTA.cupoMinimo || cupo > OFERTA.cupoMaximo) {
        return `El cupo debe estar entre ${OFERTA.cupoMinimo} y ${OFERTA.cupoMaximo} unidades`;
      }
      if (cupo > producto.stock) {
        return `El cupo no puede superar el stock disponible (${producto.stock})`;
      }
    }
    return null;
  };

  const crearOferta = async (producto: Producto) => {
    if (guardandoOferta) return;

    const error = validarOferta(producto);
    if (error) {
      Alert.alert('Revisá los datos', error);
      return;
    }

    setGuardandoOferta(true);
    try {
      await apiProducts.post('/ofertas', {
        productoId: producto.id,
        porcentaje: Number(ofertaPorcentaje),
        duracionHoras: ofertaHoras,
        cupo: ofertaCupo ? Number(ofertaCupo) : null,
        limitePorPedido: ofertaLimite,
      });
      cerrarFormularioOferta();
      if (tienda) await cargarOfertas(tienda.id);
    } catch (err: any) {
      Alert.alert('No se pudo crear la oferta', err.response?.data?.message || 'Intentá de nuevo.');
    } finally {
      setGuardandoOferta(false);
    }
  };

  const cancelarOferta = (oferta: Oferta) => {
    Alert.alert(
      'Cancelar oferta',
      'El producto vuelve a su precio normal de inmediato. ¿Querés cancelarla?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiProducts.patch(`/ofertas/${oferta.id}/cancelar`);
              if (tienda) await cargarOfertas(tienda.id);
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'No se pudo cancelar la oferta');
            }
          },
        },
      ]
    );
  };

  const renderOfertaDelProducto = (producto: Producto) => {
    if (!hayOfertas) return null;
    const oferta = ofertas.find((o) => o.productoId === producto.id);
    const ahora = Date.now();

    if (oferta) {
      const programada = new Date(oferta.inicio).getTime() > ahora;
      return (
        <View style={styles.ofertaBox}>
          <View style={styles.ofertaBoxFila}>
            <View style={styles.ofertaBoxTituloFila}>
              <Ionicons name="flash" size={14} color="#c1121f" />
              <Text style={styles.ofertaBoxTitulo}>
                -{oferta.porcentaje} % · ${oferta.precioOferta.toLocaleString('es-CL')}
              </Text>
            </View>
            <TouchableOpacity onPress={() => cancelarOferta(oferta)}>
              <Text style={styles.ofertaCancelar}>Cancelar</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.ofertaBoxTexto}>
            {programada
              ? `Programada · empieza en ${tiempoRestante(oferta.inicio, ahora)}`
              : `Activa · termina en ${tiempoRestante(oferta.fin, ahora)}`}
          </Text>
          <Text style={styles.ofertaBoxTexto}>
            {oferta.unidadesVendidas} vendidas
            {oferta.unidadesDisponibles != null ? ` · quedan ${oferta.unidadesDisponibles}` : ''}
            {` · máx. ${oferta.limitePorPedido} por pedido`}
          </Text>
        </View>
      );
    }

    if (ofertaProductoId === producto.id) {
      const porcentaje = Number(ofertaPorcentaje);
      const porcentajeValido =
        !!ofertaPorcentaje && porcentaje >= OFERTA.descuentoMinimo && porcentaje <= OFERTA.descuentoMaximo;
      const precioOferta = porcentajeValido ? precioConDescuento(producto.precio, porcentaje) : null;

      return (
        <View style={styles.formOferta}>
          <Text style={styles.formOfertaTitulo}>Nueva oferta</Text>

          <Text style={styles.etiqueta}>
            Descuento (%) · entre {OFERTA.descuentoMinimo} y {OFERTA.descuentoMaximo}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: 20"
            placeholderTextColor={PH}
            value={ofertaPorcentaje}
            onChangeText={(v) => setOfertaPorcentaje(limpiarNumero(v, 2))}
            keyboardType="numeric"
            maxLength={2}
          />

          <Text style={styles.etiqueta}>Duración</Text>
          <View style={styles.chipsFila}>
            {OFERTA.duraciones.map((h) => (
              <TouchableOpacity
                key={h}
                style={[styles.chip, ofertaHoras === h && styles.chipActivo]}
                onPress={() => setOfertaHoras(h)}
              >
                <Text style={[styles.chipTexto, ofertaHoras === h && styles.chipTextoActivo]}>{h} h</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.etiqueta}>Cupo de unidades en oferta (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder={`Sin tope · de ${OFERTA.cupoMinimo} a ${OFERTA.cupoMaximo}`}
            placeholderTextColor={PH}
            value={ofertaCupo}
            onChangeText={(v) => setOfertaCupo(limpiarNumero(v, 3))}
            keyboardType="numeric"
            maxLength={3}
          />

          <Text style={styles.etiqueta}>Máximo por pedido a este precio</Text>
          <View style={styles.chipsFila}>
            {OFERTA.limites.map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.chip, ofertaLimite === n && styles.chipActivo]}
                onPress={() => setOfertaLimite(n)}
              >
                <Text style={[styles.chipTexto, ofertaLimite === n && styles.chipTextoActivo]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {precioOferta != null && (
            <View style={styles.previewOferta}>
              <Text style={styles.previewOfertaPrincipal}>
                Precio con oferta: ${precioOferta.toLocaleString('es-CL')}{' '}
                <Text style={styles.previewOfertaTachado}>${producto.precio.toLocaleString('es-CL')}</Text>
              </Text>
              <Text style={styles.previewOfertaSecundario}>
                Recibís ${Math.round(precioOferta * (1 - OFERTA.comision)).toLocaleString('es-CL')} por unidad
                después de la comisión de NEXO ({Math.round(OFERTA.comision * 100)} %). El descuento lo pagás vos.
              </Text>
            </View>
          )}

          <View style={styles.formularioBotones}>
            <TouchableOpacity style={styles.botonCancelar} onPress={cerrarFormularioOferta}>
              <Text style={styles.botonCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.botonGuardar}
              onPress={() => crearOferta(producto)}
              disabled={guardandoOferta}
            >
              {guardandoOferta
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.botonGuardarTexto}>Crear oferta</Text>}
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity style={styles.botonOferta} onPress={() => abrirFormularioOferta(producto)}>
        <Ionicons name="flash-outline" size={15} color="#c1121f" />
        <Text style={styles.botonOfertaTexto}>Crear oferta</Text>
      </TouchableOpacity>
    );
  };

  // ==================== Render del formulario de producto ====================

  const renderCampo = (c: Campo) => {
    const etiqueta = `${c.etiqueta}${c.obligatorio ? ' *' : ''}`;

    if (esBooleano(c)) {
      return (
        <View key={c.clave} style={styles.switchFila}>
          <Text style={styles.switchTexto}>{c.etiqueta}</Text>
          <Switch
            value={atributos[c.clave] === true}
            onValueChange={(v) => cambiarAtributo(c.clave, v)}
            trackColor={{ false: '#e5e5e5', true: '#f3c6c9' }}
            thumbColor={atributos[c.clave] === true ? '#c1121f' : '#f4f4f4'}
          />
        </View>
      );
    }

    if (c.opciones && c.opciones.length > 0 && !esLista(c)) {
      return (
        <View key={c.clave}>
          <Text style={styles.etiqueta}>{etiqueta}</Text>
          <View style={styles.chipsFila}>
            {c.opciones.map((op) => {
              const activo = atributos[c.clave] === op;
              return (
                <TouchableOpacity
                  key={op}
                  style={[styles.chip, activo && styles.chipActivo]}
                  onPress={() => cambiarAtributo(c.clave, activo ? '' : op)}
                >
                  <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>{op}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }

    return (
      <View key={c.clave}>
        <Text style={styles.etiqueta}>{etiqueta}</Text>
        <TextInput
          style={styles.input}
          placeholder={esLista(c) ? 'Separados por coma' : esNumerico(c) ? 'Número' : c.etiqueta}
          placeholderTextColor={PH}
          value={typeof atributos[c.clave] === 'string' ? (atributos[c.clave] as string) : ''}
          onChangeText={(v) =>
            cambiarAtributo(c.clave, esNumerico(c) ? v.replace(/[^0-9.]/g, '').slice(0, 6) : limpiarTexto(v, 300))
          }
          keyboardType={esNumerico(c) ? 'numeric' : 'default'}
        />
      </View>
    );
  };

  const renderFormularioProducto = () => (
    <View style={styles.formulario}>
      <Text style={styles.formularioTitulo}>Nuevo producto</Text>

      <Text style={styles.etiqueta}>Tipo de producto *</Text>
      {cargandoTipos ? (
        <ActivityIndicator color="#c1121f" style={{ marginVertical: 12 }} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tiposScroll}>
          {tipos.map((t) => {
            const activo = t.clave === tipoSel;
            return (
              <TouchableOpacity
                key={t.clave}
                style={[styles.chip, activo && styles.chipActivo]}
                onPress={() => seleccionarTipo(t.clave)}
              >
                <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>{t.etiqueta}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      {!cargandoTipos && tipos.length === 0 && (
        <TouchableOpacity onPress={cargarTipos}>
          <Text style={styles.reintentar}>No se cargaron los tipos. Tocá para reintentar</Text>
        </TouchableOpacity>
      )}

      {tipoActual && (
        <>
          <Text style={styles.etiqueta}>Nombre *</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre del producto"
            placeholderTextColor={PH}
            value={nombreProducto}
            onChangeText={(v) => setNombreProducto(limpiarTexto(v, LIMITES.nombre))}
            maxLength={LIMITES.nombre}
          />

          <View style={styles.etiquetaFila}>
            <Text style={styles.etiquetaSinMargen}>Descripción *</Text>
            <Text
              style={[
                styles.contadorCaracteres,
                descripcionProducto.trim().length > 0 &&
                  descripcionProducto.trim().length < REGLAS.descripcion.min && { color: '#c0392b' },
              ]}
            >
              {descripcionProducto.length}/{LIMITES.descripcion}
            </Text>
          </View>
          <TextInput
            style={[styles.input, styles.inputMultilinea]}
            placeholder={`Contá qué lleva y cómo es (mínimo ${REGLAS.descripcion.min} caracteres)`}
            placeholderTextColor={PH}
            value={descripcionProducto}
            onChangeText={(v) => setDescripcionProducto(limpiarTexto(v, LIMITES.descripcion))}
            maxLength={LIMITES.descripcion}
            multiline
          />

          {/* Campos propios del tipo */}
          {tipoActual.campos.length > 0 && (
            <View style={styles.bloque}>
              <Text style={styles.bloqueTitulo}>Detalles de {tipoActual.etiqueta.toLowerCase()}</Text>
              {tipoActual.campos.map(renderCampo)}

              {atributos['contiene_alcohol'] === true && (
                <View style={styles.avisoAlcohol}>
                  <Ionicons name="alert-circle-outline" size={16} color="#8a6109" />
                  <Text style={styles.avisoAlcoholTexto}>
                    Producto con alcohol: al pedirlo, el cliente debe confirmar que es mayor de 18 años.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Variantes */}
          <View style={styles.bloque}>
            <View style={styles.bloqueCabecera}>
              <Text style={styles.bloqueTitulo}>{tipoActual.etiquetaVariante}s (opcional)</Text>
              {(tipoActual.variantesSugeridas.length > 0 || tipoActual.gruposSugeridos.length > 0) && (
                <TouchableOpacity onPress={usarSugeridos}>
                  <Text style={styles.enlaceAccion}>Usar sugeridos</Text>
                </TouchableOpacity>
              )}
            </View>

            {variantes.length === 0 ? (
              <>
                <Text style={styles.ayuda}>
                  Sin {tipoActual.etiquetaVariante.toLowerCase()}s el producto tiene un solo precio.
                </Text>
                <Text style={styles.etiqueta}>
                  Precio * (entre ${REGLAS.precio.min.toLocaleString('es-CL')} y ${REGLAS.precio.max.toLocaleString('es-CL')})
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Precio"
                  placeholderTextColor={PH}
                  value={precioProducto}
                  onChangeText={(v) => setPrecioProducto(limpiarNumero(v, LIMITES.precio))}
                  keyboardType="numeric"
                  maxLength={LIMITES.precio}
                />
                <Text style={styles.etiqueta}>Stock</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Stock"
                  placeholderTextColor={PH}
                  value={stockProducto}
                  onChangeText={(v) => setStockProducto(limpiarNumero(v, LIMITES.stock))}
                  keyboardType="numeric"
                  maxLength={LIMITES.stock}
                />
              </>
            ) : (
              <>
                <Text style={styles.ayuda}>
                  El precio base será el menor de las {tipoActual.etiquetaVariante.toLowerCase()}s. El stock es el de cada una.
                </Text>
                {variantes.map((v, i) => (
                  <View key={i} style={styles.filaVariante}>
                    <TextInput
                      style={[styles.inputFila, { flex: 2 }]}
                      placeholder={tipoActual.etiquetaVariante}
                      placeholderTextColor={PH}
                      value={v.nombre}
                      onChangeText={(t) => cambiarVariante(i, { nombre: limpiarTexto(t, LIMITES.variante) })}
                      maxLength={LIMITES.variante}
                    />
                    <TextInput
                      style={[styles.inputFila, { flex: 1.2 }]}
                      placeholder="Precio"
                      placeholderTextColor={PH}
                      value={v.precio}
                      onChangeText={(t) => cambiarVariante(i, { precio: limpiarNumero(t, LIMITES.precio) })}
                      keyboardType="numeric"
                    />
                    <TextInput
                      style={[styles.inputFila, { flex: 1 }]}
                      placeholder="Stock"
                      placeholderTextColor={PH}
                      value={v.stock}
                      onChangeText={(t) => cambiarVariante(i, { stock: limpiarNumero(t, LIMITES.stock) })}
                      keyboardType="numeric"
                    />
                    <TouchableOpacity onPress={() => quitarVariante(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="trash-outline" size={18} color="#c0392b" />
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}

            {variantes.length < MAX_VARIANTES && (
              <TouchableOpacity style={styles.botonAgregarFila} onPress={agregarVariante}>
                <Ionicons name="add" size={16} color="#c1121f" />
                <Text style={styles.botonAgregarFilaTexto}>
                  Agregar {tipoActual.etiquetaVariante.toLowerCase()} ({variantes.length}/{MAX_VARIANTES})
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Grupos de opciones */}
          <View style={styles.bloque}>
            <Text style={styles.bloqueTitulo}>Grupos de opciones (opcional)</Text>
            <Text style={styles.ayuda}>
              Con mínimo 1 el cliente debe elegir. Ej: masa, leche, extras.
            </Text>

            {grupos.map((g, gi) => (
              <View key={gi} style={styles.grupoCard}>
                <View style={styles.filaVariante}>
                  <TextInput
                    style={[styles.inputFila, { flex: 1 }]}
                    placeholder="Nombre del grupo"
                    placeholderTextColor={PH}
                    value={g.nombre}
                    onChangeText={(t) => cambiarGrupo(gi, { nombre: limpiarTexto(t, LIMITES.grupo) })}
                    maxLength={LIMITES.grupo}
                  />
                  <TouchableOpacity onPress={() => quitarGrupo(gi)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={18} color="#c0392b" />
                  </TouchableOpacity>
                </View>

                <View style={styles.filaVariante}>
                  <Text style={styles.miniEtiqueta}>Mínimo</Text>
                  <TextInput
                    style={[styles.inputFila, styles.inputMini]}
                    placeholder="0"
                    placeholderTextColor={PH}
                    value={g.minimo}
                    onChangeText={(t) => cambiarGrupo(gi, { minimo: limpiarNumero(t, 2) })}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                  <Text style={styles.miniEtiqueta}>Máximo</Text>
                  <TextInput
                    style={[styles.inputFila, styles.inputMini]}
                    placeholder="1"
                    placeholderTextColor={PH}
                    value={g.maximo}
                    onChangeText={(t) => cambiarGrupo(gi, { maximo: limpiarNumero(t, 2) })}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                  {Number(g.minimo) >= 1 && (
                    <View style={styles.badgeObligatorio}>
                      <Text style={styles.badgeObligatorioTexto}>Obligatorio</Text>
                    </View>
                  )}
                </View>

                {g.opciones.map((o, oi) => (
                  <View key={oi} style={styles.filaVariante}>
                    <TextInput
                      style={[styles.inputFila, { flex: 2 }]}
                      placeholder="Opción"
                      placeholderTextColor={PH}
                      value={o.nombre}
                      onChangeText={(t) => cambiarOpcion(gi, oi, { nombre: limpiarTexto(t, LIMITES.opcion) })}
                      maxLength={LIMITES.opcion}
                    />
                    <TextInput
                      style={[styles.inputFila, { flex: 1 }]}
                      placeholder="+ Precio"
                      placeholderTextColor={PH}
                      value={o.precioAdicional}
                      onChangeText={(t) => cambiarOpcion(gi, oi, { precioAdicional: limpiarNumero(t, 6) })}
                      keyboardType="numeric"
                    />
                    <TouchableOpacity onPress={() => quitarOpcion(gi, oi)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle-outline" size={18} color="#999" />
                    </TouchableOpacity>
                  </View>
                ))}

                {g.opciones.length < MAX_OPCIONES && (
                  <TouchableOpacity style={styles.botonAgregarFila} onPress={() => agregarOpcion(gi)}>
                    <Ionicons name="add" size={16} color="#c1121f" />
                    <Text style={styles.botonAgregarFilaTexto}>Agregar opción</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {grupos.length < MAX_GRUPOS && (
              <TouchableOpacity style={styles.botonAgregarFila} onPress={agregarGrupo}>
                <Ionicons name="add" size={16} color="#c1121f" />
                <Text style={styles.botonAgregarFilaTexto}>Agregar grupo ({grupos.length}/{MAX_GRUPOS})</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Otros datos */}
          <View style={styles.bloque}>
            <Text style={styles.etiqueta}>
              Para cuántas personas ({REGLAS.personas.min} a {REGLAS.personas.max})
            </Text>
            <TextInput
              style={styles.input}
              placeholder="1"
              placeholderTextColor={PH}
              value={personasProducto}
              onChangeText={(v) => setPersonasProducto(limpiarNumero(v, 2))}
              keyboardType="numeric"
              maxLength={2}
            />
            <View style={styles.switchFila}>
              <Text style={styles.switchTexto}>Destacar en mi tienda</Text>
              <Switch
                value={destacadoProducto}
                onValueChange={setDestacadoProducto}
                trackColor={{ false: '#e5e5e5', true: '#f3c6c9' }}
                thumbColor={destacadoProducto ? '#c1121f' : '#f4f4f4'}
              />
            </View>
          </View>
        </>
      )}

      <View style={styles.formularioBotones}>
        <TouchableOpacity style={styles.botonCancelar} onPress={cerrarFormulario} disabled={guardando}>
          <Text style={styles.botonCancelarTexto}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.botonGuardar, (!tipoActual || guardando) && { opacity: 0.5 }]}
          onPress={publicarProducto}
          disabled={guardando || !tipoActual}
        >
          {guardando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.botonGuardarTexto}>Publicar</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  const headerConfig = (
    <Stack.Screen options={{ headerShown: false }} />
  );

  const CustomHeader = () => (
    <SafeAreaView edges={['top']} style={styles.customHeaderSafeArea}>
      <View style={styles.customHeaderContainer}>
        <View style={styles.customHeaderIzquierda}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 10 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerIconoWrapper}>
            <Text style={{ fontSize: 15 }}>🏪</Text>
          </View>
          <Text style={styles.headerTituloTexto}>Mi tienda</Text>
        </View>

        <View style={styles.headerAccionesWrapper}>
          {hayNotificaciones && (<TouchableOpacity
            onPress={() => router.push('/notificaciones' as any)}
            style={styles.headerIconoCirculo}
          >
            <Ionicons name="notifications-outline" size={18} color="#1d1d1d" />
            {noLeidas > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeTexto}>{noLeidas}</Text>
              </View>
            )}
          </TouchableOpacity>)}
          <TouchableOpacity
            onPress={() => router.push('/tienda-actividad' as any)}
            style={styles.headerIconoCirculo}
          >
            <Ionicons name="stats-chart-outline" size={18} color="#1d1d1d" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );

  if (cargando) {
    return (
      <>
        {headerConfig}
        <CustomHeader />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#c1121f" />
        </View>
      </>
    );
  }

  if (!tienda) {
    return (
      <>
        {headerConfig}
        <CustomHeader />
        <View style={styles.center}>
          <Text style={styles.mensajeVacio}>🏚️ Todavía no tenés local acá</Text>
          <Text style={styles.mensajeVacioSub}>Registrá tu tienda y empezá a vender en NEXO.</Text>
          <TouchableOpacity style={styles.botonRegistrar} onPress={() => router.replace('/registrar-tienda' as any)}>
            <Text style={styles.botonRegistrarTexto}>Registrar mi tienda</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      {headerConfig}
      <CustomHeader />
      <View style={styles.pantalla}>
        <View style={styles.figuraCirculoGrande} />
        <View style={styles.figuraCirculoChico} />

        <View style={styles.headerTienda}>
          <View style={styles.headerFila}>
            <View style={styles.nombreWrapper}>
              <View style={styles.iconoTienda}>
                <Text style={{ fontSize: 20 }}>🏪</Text>
              </View>
              <Text style={styles.nombreTienda}>{tienda.nombre}</Text>
            </View>
            <TouchableOpacity style={styles.botonEditar} onPress={() => router.push('/editar-tienda' as any)}>
              <Ionicons name="pencil-outline" size={13} color="#c1121f" />
              <Text style={styles.botonEditarTexto}>Editar</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tabBoton, tab === 'pedidos' && styles.tabBotonActivo]}
            onPress={() => setTab('pedidos')}
          >
            <Ionicons
              name="receipt-outline"
              size={16}
              color={tab === 'pedidos' ? '#c1121f' : '#999'}
            />
            <Text style={[styles.tabTexto, tab === 'pedidos' && styles.tabTextoActivo]}>Pedidos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBoton, tab === 'productos' && styles.tabBotonActivo]}
            onPress={() => setTab('productos')}
          >
            <Ionicons
              name="fast-food-outline"
              size={16}
              color={tab === 'productos' ? '#c1121f' : '#999'}
            />
            <Text style={[styles.tabTexto, tab === 'productos' && styles.tabTextoActivo]}>Productos</Text>
          </TouchableOpacity>
        </View>

        {tab === 'pedidos' ? (
          pedidos.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.mensajeVacio}>🦗 Silencio total por acá...</Text>
              <Text style={styles.mensajeVacioSub}>Ni un pedido todavía. Los grillos están cantando.</Text>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <View style={styles.resumenFila}>
                <View style={styles.resumenCard}>
                  <Text style={[styles.resumenNumero, resumen.porAtender > 0 && { color: '#c1121f' }]}>
                    {resumen.porAtender}
                  </Text>
                  <Text style={styles.resumenLabel}>Por atender</Text>
                </View>
                <View style={styles.resumenCard}>
                  <Text style={styles.resumenNumero}>${resumen.recibidoHoy.toLocaleString('es-CL')}</Text>
                  <Text style={styles.resumenLabel}>Recibido hoy</Text>
                </View>
              </View>

              <View style={styles.buscador}>
                <Ionicons name="search-outline" size={16} color="#999" />
                <TextInput
                  style={styles.buscadorInput}
                  placeholder="Buscar por dirección o estado"
                  placeholderTextColor={PH}
                  value={busqueda}
                  onChangeText={setBusqueda}
                  maxLength={60}
                />
                {busqueda.length > 0 && (
                  <TouchableOpacity onPress={() => setBusqueda('')}>
                    <Ionicons name="close-circle" size={16} color="#c9a3a3" />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContenedor} contentContainerStyle={styles.chipsScroll}>
                {GRUPOS_TIENDA.map((g) => {
                  const activo = grupo === g.clave;
                  const cantidad = baseFiltrada.filter((p) => enGrupo(p.estado, g.estados)).length;
                  return (
                    <TouchableOpacity
                      key={g.clave}
                      style={[styles.chip, activo && styles.chipActivo]}
                      onPress={() => setGrupo(g.clave)}
                    >
                      <Text style={[styles.chipTexto, activo && styles.chipTextoActivo]}>
                        {g.label} {cantidad}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContenedor} contentContainerStyle={styles.chipsScroll}>
                {FILTROS_FECHA.map((f) => {
                  const activo = fecha === f.clave;
                  return (
                    <TouchableOpacity
                      key={f.clave}
                      style={[styles.chipFecha, activo && styles.chipFechaActivo]}
                      onPress={() => setFecha(f.clave)}
                    >
                      <Text style={[styles.chipFechaTexto, activo && styles.chipFechaTextoActivo]}>{f.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <FlatList
                data={pedidosVisibles}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={
                  <Text style={styles.contador}>
                    {hayFiltros
                      ? `${pedidosVisibles.length} de ${pedidos.length} pedidos`
                      : `${pedidos.length} ${pedidos.length === 1 ? 'pedido' : 'pedidos'}`}
                  </Text>
                }
                ListEmptyComponent={
                  <View style={styles.sinResultados}>
                    <Ionicons name="funnel-outline" size={28} color="#c9a3a3" style={{ marginBottom: 8 }} />
                    <Text style={styles.mensajeVacio}>No hay pedidos con estos filtros</Text>
                    <TouchableOpacity style={styles.botonLimpiar} onPress={limpiarFiltros}>
                      <Text style={styles.botonLimpiarTexto}>Limpiar filtros</Text>
                    </TouchableOpacity>
                  </View>
                }
                renderItem={({ item }) => {
                  const siguiente = siguienteEstado(item.estado);
                  const fechaTexto = formatearFechaHora(item.creadoEn);
                  return (
                    <View style={[styles.card, siguiente && styles.cardUrgente]}>
                      <View style={styles.filaEstadoFecha}>
                        <View style={styles.badgeEstado}>
                          <Text style={styles.badgeEstadoTexto}>{ETIQUETA_ESTADO[item.estado] ?? item.estado}</Text>
                        </View>
                        {fechaTexto !== '' && <Text style={styles.pedidoFecha}>{fechaTexto}</Text>}
                      </View>
                      <Text style={styles.pedidoDireccion}>{item.direccionEnvio}</Text>

                      <View style={styles.desgloseComision}>
                        <View style={styles.filaDesglose}>
                          <Text style={styles.desgloseLabel}>Total del pedido</Text>
                          <Text style={styles.desgloseValor}>${item.total.toLocaleString('es-CL')}</Text>
                        </View>
                        <View style={styles.filaDesglose}>
                          <Text style={styles.desgloseLabelComision}>Comisión NEXO</Text>
                          <Text style={styles.desgloseValorComision}>
                            -${item.comisionPlataforma.toLocaleString('es-CL')}
                          </Text>
                        </View>
                        <View style={styles.divisorDesglose} />
                        <View style={styles.filaDesglose}>
                          <Text style={styles.desgloseLabelRecibes}>Recibes</Text>
                          <Text style={styles.pedidoTotal}>
                            ${(item.total - item.comisionPlataforma).toLocaleString('es-CL')}
                          </Text>
                        </View>
                      </View>

                      {siguiente ? (
                        <TouchableOpacity
                          style={styles.boton}
                          onPress={() => avanzarEstado(item.id, siguiente.endpoint)}
                          disabled={actualizandoId === item.id}
                        >
                          {actualizandoId === item.id ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <>
                              <Ionicons name={siguiente.icono} size={17} color="#fff" />
                              <Text style={styles.botonTexto}>{siguiente.accion}</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      ) : (
                        item.estado === 'READY' && (
                          <View style={styles.avisoEsperando}>
                            <Ionicons name="bicycle-outline" size={14} color="#999" />
                            <Text style={styles.avisoEsperandoTexto}>Esperando que un conductor lo retire</Text>
                          </View>
                        )
                      )}
                    </View>
                  );
                }}
              />
            </View>
          )
        ) : (
          <FlatList
            data={productos}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            extraData={{
              ofertas,
              ofertaProductoId,
              ofertaPorcentaje,
              ofertaHoras,
              ofertaCupo,
              ofertaLimite,
              guardandoOferta,
            }}
            ListHeaderComponent={
              !mostrandoFormulario ? (
                <TouchableOpacity style={styles.botonAgregarProducto} onPress={abrirFormulario}>
                  <Ionicons name="add-circle" size={18} color="#fff" />
                  <Text style={styles.botonAgregarProductoTexto}>Publicar producto</Text>
                </TouchableOpacity>
              ) : (
                renderFormularioProducto()
              )
            }
            ListEmptyComponent={
              !mostrandoFormulario ? (
                <View style={styles.center}>
                  <Text style={styles.mensajeVacio}>📦 Vacío total</Text>
                  <Text style={styles.mensajeVacioSub}>Publicá tu primer producto para empezar a vender.</Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <View style={[styles.card, !item.disponible && styles.cardDisabled]}>
                <Text style={styles.nombre}>{item.nombre}</Text>
                <Text style={styles.descripcion}>{item.descripcion}</Text>
                <View style={styles.filaPrecioStock}>
                  <Text style={styles.precio}>
                    {(item.variantes ?? []).length > 0 ? 'Desde ' : ''}${item.precio.toLocaleString('es-CL')}
                  </Text>
                  <View style={styles.stockChip}>
                    <Text style={styles.stockChipTexto}>Stock: {item.stock}</Text>
                  </View>
                </View>

                {(item.destacado || (item.variantes ?? []).length > 0) && (
                  <View style={styles.etiquetasProducto}>
                    {item.destacado && (
                      <View style={styles.miniBadge}>
                        <Ionicons name="star" size={11} color="#8a6109" />
                        <Text style={styles.miniBadgeTexto}>Destacado</Text>
                      </View>
                    )}
                    {(item.variantes ?? []).length > 0 && (
                      <View style={styles.miniBadgeNeutro}>
                        <Text style={styles.miniBadgeNeutroTexto}>
                          {(item.variantes ?? []).length} opciones de tamaño
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {renderOfertaDelProducto(item)}

                <View style={styles.accionesProducto}>
                  <TouchableOpacity style={styles.botonSecundario} onPress={() => cambiarDisponibilidad(item)}>
                    <Text style={styles.botonSecundarioTexto}>
                      {item.disponible ? 'Marcar no disponible' : 'Marcar disponible'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => eliminarProducto(item.id)}>
                    <Ionicons name="trash-outline" size={18} color="#c0392b" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#faf8f6', overflow: 'hidden' },
  center: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24,
    backgroundColor: '#faf8f6',
  },
  figuraCirculoGrande: {
    position: 'absolute', top: -50, right: -60, width: 180, height: 180,
    borderRadius: 90, backgroundColor: 'rgba(230,57,70,0.04)',
  },
  figuraCirculoChico: {
    position: 'absolute', top: 260, left: -40, width: 100, height: 100,
    borderRadius: 50, backgroundColor: 'rgba(230,57,70,0.06)',
  },

  customHeaderSafeArea: { backgroundColor: '#c1121f' },
  customHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#c1121f',
  },
  customHeaderIzquierda: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },

  headerIconoWrapper: {
    width: 26, height: 26, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginRight: 8,
  },
  headerTituloTexto: { color: '#fff', fontSize: 17, fontWeight: '800' },

  headerAccionesWrapper: { flexDirection: 'row', gap: 10 },
  headerIconoCirculo: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4,
    elevation: 3,
  },
  headerBadge: {
    position: 'absolute', top: -4, right: -4,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#1d1d1d',
    justifyContent: 'center', alignItems: 'center',
  },
  headerBadgeTexto: { color: '#fff', fontSize: 9, fontWeight: 'bold' },

  headerTienda: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  headerFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nombreWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  iconoTienda: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6,
    elevation: 2,
  },
  nombreTienda: { fontSize: 19, fontWeight: '800', color: '#1d1d1d', flexShrink: 1 },
  botonEditar: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#fff', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4,
    elevation: 2,
  },
  botonEditarTexto: { color: '#c1121f', fontWeight: '700', fontSize: 12 },

  tabs: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 16,
    backgroundColor: '#fff', borderRadius: 14, padding: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6,
    elevation: 2,
  },
  tabBoton: {
    flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', alignItems: 'center',
    paddingVertical: 10, borderRadius: 10,
  },
  tabBotonActivo: { backgroundColor: '#fdf0f1' },
  tabTexto: { fontSize: 13, color: '#999', fontWeight: '700' },
  tabTextoActivo: { color: '#c1121f' },

  list: { padding: 16, paddingTop: 0 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8,
    elevation: 3,
  },
  cardDisabled: { opacity: 0.5 },
  cardUrgente: { borderWidth: 1.5, borderColor: '#c1121f' },

  resumenFila: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 12 },
  resumenCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6,
    elevation: 2,
  },
  resumenNumero: { fontSize: 20, fontWeight: '800', color: '#1d1d1d' },
  resumenLabel: { fontSize: 11.5, color: '#999', fontWeight: '600', marginTop: 2 },

  buscador: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 20, marginBottom: 10,
    paddingHorizontal: 12, paddingVertical: 9,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4,
    elevation: 1,
  },
  buscadorInput: { flex: 1, fontSize: 14, padding: 0, color: '#1d1d1d' },
  chipsContenedor: { flexGrow: 0, flexShrink: 0 },
  chipsScroll: { paddingHorizontal: 20, gap: 8, marginBottom: 8, alignItems: 'center' },
  chipFecha: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 14 },
  chipFechaActivo: { backgroundColor: '#1d1d1d' },
  chipFechaTexto: { fontSize: 12, fontWeight: '600', color: '#999' },
  chipFechaTextoActivo: { color: '#fff' },
  contador: { fontSize: 12, color: '#999', marginBottom: 10, marginLeft: 2, marginTop: 4 },
  sinResultados: { alignItems: 'center', paddingTop: 40 },
  botonLimpiar: {
    marginTop: 14, borderWidth: 1.5, borderColor: '#c1121f', borderRadius: 10,
    paddingVertical: 9, paddingHorizontal: 18,
  },
  botonLimpiarTexto: { color: '#c1121f', fontWeight: '700', fontSize: 13 },

  filaEstadoFecha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badgeEstado: {
    alignSelf: 'flex-start', backgroundColor: '#fdf0f1', borderRadius: 20,
    paddingVertical: 4, paddingHorizontal: 12,
  },
  badgeEstadoTexto: { fontSize: 11, fontWeight: '800', color: '#c1121f' },
  pedidoFecha: { fontSize: 11.5, color: '#999' },
  pedidoDireccion: { fontSize: 14, color: '#333', marginBottom: 12 },
  pedidoTotal: { fontSize: 18, fontWeight: '800', color: '#1d1d1d' },

  desgloseComision: { marginTop: 4, marginBottom: 12 },
  filaDesglose: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  desgloseLabel: { fontSize: 13, color: '#666' },
  desgloseValor: { fontSize: 13, fontWeight: '600', color: '#333' },
  desgloseLabelComision: { fontSize: 12, color: '#c0392b' },
  desgloseValorComision: { fontSize: 12, fontWeight: '600', color: '#c0392b' },
  divisorDesglose: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 4 },
  desgloseLabelRecibes: { fontSize: 14, fontWeight: '700', color: '#1d1d1d' },

  boton: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: '#c1121f', borderRadius: 10, paddingVertical: 13,
    shadowColor: '#c1121f', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8,
    elevation: 4,
  },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 14.5 },

  avisoEsperando: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8,
  },
  avisoEsperandoTexto: { fontSize: 12.5, color: '#999', fontStyle: 'italic' },

  mensajeVacio: { fontSize: 16, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  mensajeVacioSub: { fontSize: 13, color: '#999', textAlign: 'center', paddingHorizontal: 16 },
  botonRegistrar: { backgroundColor: '#c1121f', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24, marginTop: 16 },
  botonRegistrarTexto: { color: '#fff', fontWeight: '700' },

  botonAgregarProducto: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    backgroundColor: '#c1121f', borderRadius: 12, paddingVertical: 13, marginBottom: 14,
  },
  botonAgregarProductoTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },

  nombre: { fontSize: 16, fontWeight: '800', color: '#1d1d1d' },
  descripcion: { fontSize: 13, color: '#666', marginTop: 4, marginBottom: 10 },
  filaPrecioStock: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  precio: { fontSize: 17, fontWeight: '800', color: '#c1121f' },
  stockChip: { backgroundColor: '#f4f4f4', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 },
  stockChipTexto: { fontSize: 11, color: '#666', fontWeight: '600' },
  etiquetasProducto: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  miniBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fffaf0', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10,
    borderWidth: 1, borderColor: '#ffe8b8',
  },
  miniBadgeTexto: { fontSize: 11, fontWeight: '700', color: '#8a6109' },
  miniBadgeNeutro: { backgroundColor: '#f4f4f4', borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 },
  miniBadgeNeutroTexto: { fontSize: 11, fontWeight: '600', color: '#666' },
  accionesProducto: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  botonSecundario: { borderWidth: 1.5, borderColor: '#c1121f', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  botonSecundarioTexto: { color: '#c1121f', fontSize: 12, fontWeight: '700' },

  // ---- Formulario de producto ----
  formulario: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14 },
  formularioTitulo: { fontSize: 16, fontWeight: '800', color: '#1d1d1d', marginBottom: 14 },
  input: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 12, fontSize: 14,
    marginBottom: 10, backgroundColor: '#faf8f6', color: '#1d1d1d',
  },
  inputMultilinea: { minHeight: 70, textAlignVertical: 'top' },
  inputFila: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 10,
    fontSize: 13.5, backgroundColor: '#faf8f6', color: '#1d1d1d',
  },
  inputMini: { width: 52, textAlign: 'center' },
  miniEtiqueta: { fontSize: 12, fontWeight: '700', color: '#666' },
  etiquetaFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  etiquetaSinMargen: { fontSize: 12, fontWeight: '700', color: '#666' },
  contadorCaracteres: { fontSize: 11, color: '#999', fontWeight: '600' },
  tiposScroll: { gap: 8, paddingBottom: 12 },
  reintentar: { fontSize: 12.5, color: '#c1121f', fontWeight: '700', marginBottom: 10 },
  bloque: {
    backgroundColor: '#faf8f6', borderRadius: 12, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#f0ecea',
  },
  bloqueCabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bloqueTitulo: { fontSize: 13.5, fontWeight: '800', color: '#1d1d1d', marginBottom: 8 },
  enlaceAccion: { fontSize: 12.5, fontWeight: '700', color: '#c1121f', marginBottom: 8 },
  ayuda: { fontSize: 11.5, color: '#999', marginBottom: 10, lineHeight: 16 },
  avisoAlcohol: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#fffaf0', borderRadius: 10, padding: 10, marginTop: 6,
    borderWidth: 1, borderColor: '#ffe8b8',
  },
  avisoAlcoholTexto: { flex: 1, fontSize: 12, color: '#8a6109', lineHeight: 17, fontWeight: '600' },
  filaVariante: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  botonAgregarFila: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    borderWidth: 1.5, borderColor: '#f3c6c9', borderStyle: 'dashed', borderRadius: 10,
    paddingVertical: 9, backgroundColor: '#fff', marginTop: 2,
  },
  botonAgregarFilaTexto: { fontSize: 12.5, fontWeight: '700', color: '#c1121f' },
  grupoCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 10, marginBottom: 10,
    borderWidth: 1, borderColor: '#eee',
  },
  badgeObligatorio: { backgroundColor: '#fdf0f1', borderRadius: 20, paddingVertical: 3, paddingHorizontal: 9, marginLeft: 'auto' },
  badgeObligatorioTexto: { fontSize: 10.5, fontWeight: '800', color: '#c1121f' },
  switchFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  switchTexto: { fontSize: 13.5, fontWeight: '600', color: '#1d1d1d' },

  formularioBotones: { flexDirection: 'row', gap: 10 },
  botonCancelar: { flex: 1, borderWidth: 1.5, borderColor: '#eee', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  botonCancelarTexto: { color: '#666', fontWeight: '700' },
  botonGuardar: { flex: 1, backgroundColor: '#c1121f', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  botonGuardarTexto: { color: '#fff', fontWeight: '700' },

  botonOferta: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
    backgroundColor: '#fdf0f1', borderRadius: 10, paddingVertical: 10, marginTop: 12,
  },
  botonOfertaTexto: { color: '#c1121f', fontWeight: '700', fontSize: 13 },

  ofertaBox: {
    backgroundColor: '#fdf0f1', borderRadius: 12, padding: 12, marginTop: 12,
    borderWidth: 1, borderColor: '#f3d9d9',
  },
  ofertaBoxFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  ofertaBoxTituloFila: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ofertaBoxTitulo: { fontSize: 14, fontWeight: '800', color: '#c1121f' },
  ofertaBoxTexto: { fontSize: 12, color: '#7a4a4a', marginTop: 2 },
  ofertaCancelar: { fontSize: 12, fontWeight: '700', color: '#c0392b' },

  formOferta: {
    backgroundColor: '#faf8f6', borderRadius: 12, padding: 12, marginTop: 12,
    borderWidth: 1, borderColor: '#eee',
  },
  formOfertaTitulo: { fontSize: 14, fontWeight: '800', color: '#1d1d1d', marginBottom: 10 },
  etiqueta: { fontSize: 12, fontWeight: '700', color: '#666', marginBottom: 6 },
  chipsFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    borderWidth: 1.5, borderColor: '#eee', backgroundColor: '#fff', borderRadius: 20,
    paddingVertical: 7, paddingHorizontal: 14,
  },
  chipActivo: { borderColor: '#c1121f', backgroundColor: '#fdf0f1' },
  chipTexto: { fontSize: 13, fontWeight: '700', color: '#666' },
  chipTextoActivo: { color: '#c1121f' },
  previewOferta: {
    backgroundColor: '#fff', borderRadius: 10, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: '#f3d9d9',
  },
  previewOfertaPrincipal: { fontSize: 14, fontWeight: '800', color: '#c1121f' },
  previewOfertaTachado: { fontSize: 12, fontWeight: '600', color: '#999', textDecorationLine: 'line-through' },
  previewOfertaSecundario: { fontSize: 11.5, color: '#7a4a4a', marginTop: 4, lineHeight: 16 },
});