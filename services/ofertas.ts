export type Oferta = {
  id: string;
  productoId: string;
  tiendaId: string;
  porcentaje: number;
  precioOferta: number;
  inicio: string;
  fin: string;
  cupo: number | null;
  unidadesVendidas: number;
  unidadesDisponibles: number | null;
  limitePorPedido: number;
  estado: string;
};

/** Lo mínimo de una línea del carrito para calcular su precio con oferta. */
export type LineaConOferta = {
  precio: number;
  cantidad: number;
  precioOferta?: number | null;
  limiteOferta?: number | null;
  unidadesOfertaDisponibles?: number | null;
  ofertaFin?: string | null;
};

export function ofertaActiva(fin?: string | null, ahora: number = Date.now()): boolean {
  return !!fin && new Date(fin).getTime() > ahora;
}

/**
 * Reparte las unidades de una línea entre precio de oferta y precio normal,
 * igual que lo hace el backend: hasta el límite por pedido y el cupo que quede.
 * El backend es el que manda; esto es la estimación que ve el cliente.
 */
export function desglosarLinea(linea: LineaConOferta, ahora: number = Date.now()) {
  const hayOferta = linea.precioOferta != null && ofertaActiva(linea.ofertaFin, ahora);

  if (!hayOferta) {
    return {
      unidadesOferta: 0,
      unidadesNormales: linea.cantidad,
      total: linea.precio * linea.cantidad,
    };
  }

  const tope = Math.min(
    linea.cantidad,
    linea.limiteOferta ?? linea.cantidad,
    linea.unidadesOfertaDisponibles ?? linea.cantidad
  );
  const unidadesOferta = Math.max(0, tope);
  const unidadesNormales = linea.cantidad - unidadesOferta;

  return {
    unidadesOferta,
    unidadesNormales,
    total: unidadesOferta * (linea.precioOferta as number) + unidadesNormales * linea.precio,
  };
}

/** Texto corto para la cuenta regresiva: "2 d 5 h", "3 h 20 min", "45 min". */
export function tiempoRestante(fin: string, ahora: number = Date.now()): string {
  const ms = new Date(fin).getTime() - ahora;
  if (ms <= 0) return 'terminada';

  const minutosTotales = Math.floor(ms / 60000);
  const dias = Math.floor(minutosTotales / 1440);
  const horas = Math.floor((minutosTotales % 1440) / 60);
  const minutos = minutosTotales % 60;

  if (dias > 0) return `${dias} d ${horas} h`;
  if (horas > 0) return `${horas} h ${minutos} min`;
  return `${Math.max(1, minutos)} min`;
}