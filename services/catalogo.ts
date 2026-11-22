import { Oferta } from '@/services/ofertas';

export type Opcion = {
  id: string;
  nombre: string;
  precioAdicional: number;
  disponible: boolean;
};

export type Grupo = {
  id: string;
  nombre: string;
  minimo: number;
  maximo: number;
  obligatorio: boolean;
  opciones: Opcion[];
};

export type Variante = {
  id: string;
  nombre: string;
  precio: number;
  stock: number;
  disponible: boolean;
  precioOferta?: number | null;
};

export type Producto = {
  id: string;
  tiendaId: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  stock: number;
  imagenUrl: string | null;
  disponible: boolean;
  oferta?: Oferta | null;
  tipo?: string | null;
  tipoEtiqueta?: string | null;
  requiereMayorEdad?: boolean;
  etiquetaVariante?: string | null;
  atributos?: Record<string, any> | null;
  variantes?: Variante[];
  grupos?: Grupo[];
  destacado?: boolean;
  personas?: number | null;
};

const esVerdadero = (v: unknown) => v === true || v === 'true';

/** Convierte "a, b, c" o ["a","b"] en una lista de textos. */
export function lista(valor: unknown): string[] {
  if (Array.isArray(valor)) {
    return valor.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof valor === 'string') {
    return valor.split(/[,;]/).map((v) => v.trim()).filter(Boolean);
  }
  return [];
}

/** Etiquetas cortas que se muestran bajo el nombre (Vegano, Sin gluten, 5° alcohol...). */
export function etiquetasDe(atributos?: Record<string, any> | null): string[] {
  const a = atributos ?? {};
  const etiquetas: string[] = [];
  if (esVerdadero(a.vegano)) etiquetas.push('Vegano');
  else if (esVerdadero(a.vegetariano)) etiquetas.push('Vegetariano');
  if (esVerdadero(a.sin_gluten)) etiquetas.push('Sin gluten');
  if (esVerdadero(a.picante)) etiquetas.push('Picante');
  const grado = Number(a.grado_alcoholico);
  if (esVerdadero(a.contiene_alcohol) && grado > 0) etiquetas.push(`${grado}° alcohol`);
  return etiquetas;
}

/** Un producto "simple" se puede agregar al carrito sin abrir su detalle. */
export function esSimple(p: Producto): boolean {
  const sinTamanos = (p.variantes ?? []).length === 0;
  const sinObligatorios = (p.grupos ?? []).every((g) => g.minimo === 0);
  return sinTamanos && sinObligatorios;
}

/** Precio más bajo del producto (el del tamaño más barato, si tiene tamaños). */
export function precioDesde(p: Producto): number {
  const variantes = p.variantes ?? [];
  if (variantes.length === 0) return p.precio;
  return Math.min(...variantes.map((v) => v.precio));
}