/** 1 punto vale $10 al pagar productos con puntos (igual que nexo.puntos.pesos-por-punto-canje en el backend). */
export const PESOS_POR_PUNTO_CANJE = 10;

/** Se gana 1 punto por cada $1.000 pagados (igual que nexo.puntos.pesos-por-punto en ms-users). */
export const PESOS_POR_PUNTO_GANADO = 1000;

/** Máximo del subtotal de productos que se puede pagar con puntos (igual que nexo.puntos.tope-canje-porcentaje en ms-orders). */
export const TOPE_CANJE_PORCENTAJE = 10;

/** Mínimo de puntos para pagar con puntos (igual que nexo.puntos.minimo-canje en ms-orders). */
export const MINIMO_CANJE = 25;

/** Puntos que cuesta pagar con puntos un monto en pesos (redondeo hacia arriba, igual que ms-orders). */
export const puntosDe = (montoPesos: number): number =>
  Math.ceil(montoPesos / PESOS_POR_PUNTO_CANJE);

/** Puntos que se ganan al pagar un monto en pesos (redondeo hacia abajo, igual que ms-users). */
export const puntosGanadosDe = (montoPesos: number): number =>
  Math.floor(montoPesos / PESOS_POR_PUNTO_GANADO);

/** Monto máximo en pesos que se puede pagar con puntos para un subtotal dado (redondeo hacia abajo, igual que ms-orders). */
export const topeCanjePesos = (subtotal: number): number =>
  Math.floor((subtotal * TOPE_CANJE_PORCENTAJE) / 100);

/** Convierte una fecha ISO (aaaa-mm-dd) a dd/mm/aaaa. */
export const formatearFecha = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const [anio, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${anio}`;
};
