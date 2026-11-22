type Oyente = () => void;

const oyentes = new Set<Oyente>();

// Se llama cuando el usuario cierra sesión
export function avisarSesionCerrada() {
  oyentes.forEach((fn) => fn());
}

// Devuelve la función para desuscribirse
export function alCerrarSesion(fn: Oyente) {
  oyentes.add(fn);
  return () => {
    oyentes.delete(fn);
  };
}