import { createContext, useContext, useState, ReactNode } from 'react';

type ItemCarrito = {
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
};

type CartContextType = {
  tiendaId: string | null;
  items: ItemCarrito[];
  agregarItem: (tiendaId: string, item: ItemCarrito) => boolean;
  quitarItem: (productoId: string) => void;
  cambiarCantidad: (productoId: string, delta: number) => void;
  vaciarCarrito: () => void;
  subtotal: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [tiendaId, setTiendaId] = useState<string | null>(null);
  const [items, setItems] = useState<ItemCarrito[]>([]);

  const agregarItem = (nuevaTiendaId: string, item: ItemCarrito): boolean => {
    if (tiendaId && tiendaId !== nuevaTiendaId) {
      return false;
    }

    setTiendaId(nuevaTiendaId);
    setItems((prev) => {
      const existente = prev.find((i) => i.productoId === item.productoId);
      if (existente) {
        return prev.map((i) =>
          i.productoId === item.productoId
            ? { ...i, cantidad: i.cantidad + item.cantidad }
            : i
        );
      }
      return [...prev, item];
    });
    return true;
  };

  const quitarItem = (productoId: string) => {
    setItems((prev) => {
      const nuevosItems = prev.filter((i) => i.productoId !== productoId);
      if (nuevosItems.length === 0) setTiendaId(null);
      return nuevosItems;
    });
  };

  // Suma o resta unidades de un producto ya presente en el carrito.
  // Si la cantidad llega a 0, el producto se quita solo.
  const cambiarCantidad = (productoId: string, delta: number) => {
    setItems((prev) => {
      const actualizados = prev
        .map((i) =>
          i.productoId === productoId
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

  const subtotal = items.reduce((acc, i) => acc + i.precio * i.cantidad, 0);

  return (
    <CartContext.Provider value={{ tiendaId, items, agregarItem, quitarItem, cambiarCantidad, vaciarCarrito, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart debe usarse dentro de CartProvider');
  return context;
}