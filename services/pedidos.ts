export type FiltroFecha = 'todos' | 'hoy' | '7d' | '30d';

export const FILTROS_FECHA: { clave: FiltroFecha; label: string }[] = [
  { clave: 'todos', label: 'Todo el historial' },
  { clave: 'hoy', label: 'Hoy' },
  { clave: '7d', label: '7 días' },
  { clave: '30d', label: '30 días' },
];

export type GrupoPedidos = {
  clave: string;
  label: string;
  /** null = todos los estados */
  estados: string[] | null;
};

export const GRUPOS_CLIENTE: GrupoPedidos[] = [
  { clave: 'todos', label: 'Todos', estados: null },
  { clave: 'curso', label: 'En curso', estados: ['CREATED', 'PAID', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED'] },
  { clave: 'completados', label: 'Completados', estados: ['COMPLETED'] },
  { clave: 'cancelados', label: 'Cancelados', estados: ['CANCELLED'] },
];

export const GRUPOS_TIENDA: GrupoPedidos[] = [
  { clave: 'todos', label: 'Todos', estados: null },
  { clave: 'porTomar', label: 'Por tomar', estados: ['PAID'] },
  { clave: 'preparacion', label: 'En preparación', estados: ['CONFIRMED', 'PREPARING'] },
  { clave: 'esperando', label: 'Esperando conductor', estados: ['READY'] },
  { clave: 'reparto', label: 'En reparto', estados: ['DELIVERING', 'DELIVERED'] },
  { clave: 'completados', label: 'Completados', estados: ['COMPLETED'] },
  { clave: 'cancelados', label: 'Cancelados', estados: ['CANCELLED'] },
];

export const GRUPOS_CONDUCTOR: GrupoPedidos[] = [
  { clave: 'todos', label: 'Todas', estados: null },
  { clave: 'camino', label: 'En camino', estados: ['DELIVERING'] },
  { clave: 'porConfirmar', label: 'Por confirmar', estados: ['DELIVERED'] },
  { clave: 'completadas', label: 'Completadas', estados: ['COMPLETED'] },
];

// Menor número = aparece más arriba.
// Cliente: primero lo que espera una acción suya (confirmar recepción) y lo que está en camino.
export const PRIORIDAD_CLIENTE: Record<string, number> = {
  DELIVERED: 0,
  DELIVERING: 1,
  READY: 2,
  CONFIRMED: 3,
  PREPARING: 3,
  PAID: 4,
  CREATED: 5,
  COMPLETED: 6,
  CANCELLED: 7,
};

// Tienda: primero lo que tiene que atender ella (tomar y despachar).
export const PRIORIDAD_TIENDA: Record<string, number> = {
  PAID: 0,
  CONFIRMED: 1,
  PREPARING: 1,
  READY: 2,
  DELIVERING: 3,
  DELIVERED: 4,
  CREATED: 5,
  COMPLETED: 6,
  CANCELLED: 7,
};

// Conductor: primero lo que está haciendo ahora, después lo que espera confirmación del cliente.
export const PRIORIDAD_CONDUCTOR: Record<string, number> = {
  DELIVERING: 0,
  DELIVERED: 1,
  COMPLETED: 2,
  CANCELLED: 3,
};

type ConFecha = { estado: string; creadoEn?: string | null };

const tiempoDe = (p: ConFecha) => (p.creadoEn ? new Date(p.creadoEn).getTime() : 0);

/** Ordena por prioridad de estado y, dentro de cada estado, del más reciente al más antiguo. */
export function ordenarPedidos<T extends ConFecha>(pedidos: T[], prioridad: Record<string, number>): T[] {
  return [...pedidos].sort((a, b) => {
    const pa = prioridad[a.estado] ?? 99;
    const pb = prioridad[b.estado] ?? 99;
    if (pa !== pb) return pa - pb;
    return tiempoDe(b) - tiempoDe(a);
  });
}

export function enGrupo(estado: string, estados: string[] | null): boolean {
  return !estados || estados.includes(estado);
}

/** Los pedidos sin fecha (backend antiguo) no se ocultan por el filtro de fecha. */
export function dentroDeFecha(creadoEn: string | null | undefined, filtro: FiltroFecha, ahora: number = Date.now()): boolean {
  if (filtro === 'todos' || !creadoEn) return true;
  const t = new Date(creadoEn).getTime();

  if (filtro === 'hoy') {
    const inicioDelDia = new Date(ahora);
    inicioDelDia.setHours(0, 0, 0, 0);
    return t >= inicioDelDia.getTime();
  }

  const dias = filtro === '7d' ? 7 : 30;
  return t >= ahora - dias * 24 * 60 * 60 * 1000;
}

/** Minúsculas y sin tildes, para que la búsqueda no distinga "Avenida" de "avenída". */
export function normalizar(texto: string): string {
  try {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  } catch {
    return texto.toLowerCase();
  }
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "23 oct · 18:12" (hora del teléfono). */
export function formatearFechaHora(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MESES[d.getMonth()]} · ${hh}:${mm}`;
}