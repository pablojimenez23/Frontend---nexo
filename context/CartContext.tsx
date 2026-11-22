import { createContext, useContext, useState, ReactNode } from 'react';
import { desglosarLinea } from '@/services/ofertas';

export type ItemCarrito = {
  /** Identifica la línea: mismo producto + tamaño + opciones + nota. */
  lineaId: string;
  productoId: string;
  nombre: string;
  /** Precio base: el del tamaño elegido, o el del producto si no tiene tamaños. */
  precio: number;
  cantidad: number;
  varianteId?: string | null;
  varianteNombre?: string | null;
  opcionesIds?: string[];
  opcionesTexto?: string | null;
  /** Suma de los recargos de las opciones elegidas, por unidad. */
  opcionesUnitario?: number;
  nota?: string | null;
  requiereMayorEdad?: boolean;
  // Datos de la oferta vigente cuando se agregó el producto (si había una)
  precioOferta?: number | null;
  limiteOferta?: number | null;
  unidadesOfertaDisponibles?: number | null;
  ofertaFin?: string | null;
};

export type NuevoItemCarrito = Omit<ItemCarrito, 'lineaId'>;

export function crearLineaId(item: NuevoItemCarrito): string {
  return [
    item.productoId,
    item.varianteId ?? '',
    [...(item.opcionesIds ?? [])].sort().join(','),
    (item.nota ?? '').trim().toLowerCase(),
  ].join('|');
}

/** Total de una línea: unidades (con oferta si corresponde) más los recargos de las opciones. */
export function totalLinea(item: ItemCarrito, ahora?: number): number {
  return desglosarLinea(item, ahora).total + (item.opcionesUnitario ?? 0) * item.cantidad;
}

type CartContextType = {
  tiendaId: string | null;
  items: ItemCarrito[];
  agregarItem: (tiendaId: string, item: NuevoItemCarrito) => boolean;
  /** Vacía el carrito y deja solo este ítem (para cuando el cliente cambia de tienda). */
  reemplazarCarrito: (tiendaId: string, item: NuevoItemCarrito) => void;
  quitarItem: (lineaId: string) => void;
  cambiarCantidad: (lineaId: string, delta: number) => void;
  vaciarCarrito: () => void;
  subtotal: number;
  unidades: number;
  llevaAlcohol: boolean;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [tiendaId, setTiendaId] = useState<string | null>(null);
  const [items, setItems] = useState<ItemCarrito[]>([]);

  const agregarItem = (nuevaTiendaId: string, nuevo: NuevoItemCarrito): boolean => {
    if (tiendaId && tiendaId !== nuevaTiendaId) {
      return false;
    }

    const lineaId = crearLineaId(nuevo);
    setTiendaId(nuevaTiendaId);
    setItems((prev) => {
      const existente = prev.find((i) => i.lineaId === lineaId);
      if (existente) {
        // Se actualizan también los datos de la oferta por si cambiaron desde la última vez
        return prev.map((i) =>
          i.lineaId === lineaId
            ? { ...i, ...nuevo, lineaId, cantidad: i.cantidad + nuevo.cantidad }
            : i
        );
      }
      return [...prev, { ...nuevo, lineaId }];
    });
    return true;
  };

  const reemplazarCarrito = (nuevaTiendaId: string, nuevo: NuevoItemCarrito) => {
    setTiendaId(nuevaTiendaId);
    setItems([{ ...nuevo, lineaId: crearLineaId(nuevo) }]);
  };

  const quitarItem = (lineaId: string) => {
    setItems((prev) => {
      const nuevosItems = prev.filter((i) => i.lineaId !== lineaId);
      if (nuevosItems.length === 0) setTiendaId(null);
      return nuevosItems;
    });
  };

  // Suma o resta unidades de una línea ya presente en el carrito.
  // Si la cantidad llega a 0, la línea se quita sola.
  const cambiarCantidad = (lineaId: string, delta: number) => {
    setItems((prev) => {
      const actualizados = prev
        .map((i) =>
          i.lineaId === lineaId
            ? { ...i, cantidad: i.cantidad + delta }
            : i
        )
        .filter((i) => i.cantidad > 0);

      if (actualizados.length === 0) setTiendaId(null);
      return actualizados;
    });
  };

  const vaciarCarrito = () => {
    setItems([]);
    setTiendaId(null);
  };

  // Subtotal estimado: las unidades en oferta (hasta el límite por pedido) van a precio de oferta
  const subtotal = items.reduce((acc, i) => acc + totalLinea(i), 0);
  const unidades = items.reduce((acc, i) => acc + i.cantidad, 0);
  const llevaAlcohol = items.some((i) => i.requiereMayorEdad);

  return (
    <CartContext.Provider
      value={{
        tiendaId, items, agregarItem, reemplazarCarrito, quitarItem, cambiarCantidad,
        vaciarCarrito, subtotal, unidades, llevaAlcohol,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart debe usarse dentro de CartProvider');
  return context;
}