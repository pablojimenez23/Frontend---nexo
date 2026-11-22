// ---------- Tipos del formulario de producto ----------
export type Campo = {
  clave: string;
  etiqueta: string;
  tipo: string;
  obligatorio: boolean;
  opciones: string[];
  min: number | null;
  max: number | null;
};

export type GrupoSugerido = {
  nombre: string;
  minimo: number;
  maximo: number;
  opciones: string[];
};

export type TipoInfo = {
  clave: string;
  etiqueta: string;
  etiquetaVariante: string;
  campos: Campo[];
  variantesSugeridas: string[];
  gruposSugeridos: GrupoSugerido[];
};

export type VarianteForm = { nombre: string; precio: string; stock: string };
export type OpcionForm = { nombre: string; precioAdicional: string };
export type GrupoForm = { nombre: string; minimo: string; maximo: string; opciones: OpcionForm[] };

// ---------- Reglas (ajustables en un solo lugar) ----------
export const REGLAS = {
  nombre: { min: 2, max: 60 },
  descripcion: { min: 10, max: 150 },
  precio: { min: 100, max: 1000000 },
  stock: { max: 99999 },
  personas: { min: 1, max: 20 },
  variantes: { max: 8, nombre: 40 },
  grupos: { max: 6, nombre: 40 },
  opciones: { max: 12, nombre: 40, extraMax: 100000 },
  lista: { maxItems: 20, maxItem: 40 },
  texto: 100,
  gradoAlcoholMax: 96,
};

export const esNumerico = (c: Campo) => /NUM|ENTERO|DECIMAL|INT/i.test(c.tipo);
export const esBooleano = (c: Campo) => /BOOL/i.test(c.tipo);
export const esLista = (c: Campo) => /LISTA|LIST|MULTI|ARRAY/i.test(c.tipo);

export const normalizarTexto = (s: string) => s.replace(/\s+/g, ' ').trim();

const ENTERO = /^\d+$/;
const DECIMAL = /^\d+(\.\d+)?$/;
const tieneLetra = (s: string) => /[a-zA-ZÀ-ÿñÑ]/.test(s);
const tieneLetraONumero = (s: string) => /[a-zA-Z0-9À-ÿñÑ]/.test(s);
const plata = (n: number) => `$${n.toLocaleString('es-CL')}`;

export type EntradaProducto = {
  tienda: { id: string; estado: string } | null;
  tipo: TipoInfo | null;
  nombre: string;
  descripcion: string;
  precio: string;
  stock: string;
  personas: string;
  destacado: boolean;
  atributos: Record<string, string | boolean>;
  variantes: VarianteForm[];
  grupos: GrupoForm[];
  nombresExistentes: string[];
};

export type Resultado = { error?: string; payload?: any };

const falla = (error: string): Resultado => ({ error });

function errorPrecio(valor: string, etiqueta: string): string | null {
  if (!ENTERO.test(valor)) return `${etiqueta}: ingresá un precio válido`;
  const n = Number(valor);
  if (n < REGLAS.precio.min) return `${etiqueta}: el precio mínimo es ${plata(REGLAS.precio.min)}`;
  if (n > REGLAS.precio.max) return `${etiqueta}: el precio máximo es ${plata(REGLAS.precio.max)}`;
  return null;
}

function errorStock(valor: string, etiqueta: string): string | null {
  if (valor === '') return null;
  if (!ENTERO.test(valor)) return `${etiqueta}: el stock debe ser un número entero`;
  if (Number(valor) > REGLAS.stock.max) return `${etiqueta}: el stock máximo es ${REGLAS.stock.max.toLocaleString('es-CL')}`;
  return null;
}

export function validarProducto(e: EntradaProducto): Resultado {
  // ---- Tienda y tipo ----
  if (!e.tienda) return falla('No se encontró tu tienda');
  if (e.tienda.estado !== 'APPROVED') return falla('Tu tienda todavía no está aprobada para publicar productos');
  const tipo = e.tipo;
  if (!tipo) return falla('Elegí el tipo de producto');

  // ---- Nombre ----
  const nombre = normalizarTexto(e.nombre);
  if (nombre.length < REGLAS.nombre.min) return falla(`El nombre debe tener al menos ${REGLAS.nombre.min} caracteres`);
  if (nombre.length > REGLAS.nombre.max) return falla(`El nombre no puede superar ${REGLAS.nombre.max} caracteres`);
  if (!tieneLetra(nombre)) return falla('El nombre debe incluir letras');
  if (e.nombresExistentes.some((n) => normalizarTexto(n).toLowerCase() === nombre.toLowerCase())) {
    return falla('Ya tenés un producto con ese nombre');
  }

  // ---- Descripción (obligatoria) ----
  const descripcion = normalizarTexto(e.descripcion);
  if (!descripcion) return falla('La descripción es obligatoria');
  if (descripcion.length < REGLAS.descripcion.min) {
    return falla(`La descripción debe tener al menos ${REGLAS.descripcion.min} caracteres`);
  }
  if (descripcion.length > REGLAS.descripcion.max) {
    return falla(`La descripción no puede superar ${REGLAS.descripcion.max} caracteres`);
  }
  if (!tieneLetra(descripcion)) return falla('La descripción debe incluir letras');

  // ---- Personas ----
  let personas = 1;
  if (e.personas !== '') {
    if (!ENTERO.test(e.personas)) return falla('Las personas deben ser un número entero');
    personas = Number(e.personas);
    if (personas < REGLAS.personas.min || personas > REGLAS.personas.max) {
      return falla(`Las personas deben estar entre ${REGLAS.personas.min} y ${REGLAS.personas.max}`);
    }
  }

  // ---- Precio y stock sin variantes ----
  const etiquetaVar = tipo.etiquetaVariante.toLowerCase();
  const usaVariantes = e.variantes.length > 0;

  if (!usaVariantes) {
    const ep = errorPrecio(e.precio, 'Precio');
    if (ep) return falla(ep);
    const es = errorStock(e.stock, 'Stock');
    if (es) return falla(es);
  }

  // ---- Variantes ----
  if (e.variantes.length > REGLAS.variantes.max) {
    return falla(`Máximo ${REGLAS.variantes.max} ${etiquetaVar}s por producto`);
  }
  const nombresVariantes = new Set<string>();
  const variantesFinal: { nombre: string; precio: number; stock: number }[] = [];
  for (let i = 0; i < e.variantes.length; i++) {
    const v = e.variantes[i];
    const n = normalizarTexto(v.nombre);
    if (!n) return falla(`Poné nombre a la ${etiquetaVar} ${i + 1}`);
    if (n.length > REGLAS.variantes.nombre) return falla(`"${n}" supera ${REGLAS.variantes.nombre} caracteres`);
    if (!tieneLetraONumero(n)) return falla(`La ${etiquetaVar} ${i + 1} necesita un nombre válido`);
    const clave = n.toLowerCase();
    if (nombresVariantes.has(clave)) return falla(`La ${etiquetaVar} "${n}" está repetida`);
    nombresVariantes.add(clave);

    const ep = errorPrecio(v.precio, `"${n}"`);
    if (ep) return falla(ep);
    const es = errorStock(v.stock, `"${n}"`);
    if (es) return falla(es);

    variantesFinal.push({ nombre: n, precio: Number(v.precio), stock: v.stock ? Number(v.stock) : 0 });
  }

  // ---- Atributos propios del tipo ----
  const atributos: Record<string, any> = {};
  for (const c of tipo.campos) {
    const valor = e.atributos[c.clave];

    if (esBooleano(c)) {
      if (valor === true) atributos[c.clave] = true;
      continue;
    }

    const texto = typeof valor === 'string' ? normalizarTexto(valor) : '';
    if (!texto) {
      if (c.obligatorio) return falla(`Falta completar: ${c.etiqueta}`);
      continue;
    }

    if (esLista(c)) {
      const vistos = new Set<string>();
      const items: string[] = [];
      for (const bruto of texto.split(',')) {
        const item = normalizarTexto(bruto);
        if (!item) continue;
        if (item.length > REGLAS.lista.maxItem) {
          return falla(`En ${c.etiqueta}, cada elemento puede tener hasta ${REGLAS.lista.maxItem} caracteres`);
        }
        if (!tieneLetraONumero(item)) return falla(`En ${c.etiqueta} hay un elemento inválido`);
        const clave = item.toLowerCase();
        if (vistos.has(clave)) continue;
        vistos.add(clave);
        items.push(item);
      }
      if (items.length === 0) {
        if (c.obligatorio) return falla(`Falta completar: ${c.etiqueta}`);
        continue;
      }
      if (items.length > REGLAS.lista.maxItems) {
        return falla(`En ${c.etiqueta} podés poner hasta ${REGLAS.lista.maxItems} elementos`);
      }
      atributos[c.clave] = items;
    } else if (esNumerico(c)) {
      if (!DECIMAL.test(texto)) return falla(`${c.etiqueta} debe ser un número`);
      const n = Number(texto);
      if (c.min != null && n < c.min) return falla(`${c.etiqueta} debe ser al menos ${c.min}`);
      if (c.max != null && n > c.max) return falla(`${c.etiqueta} no puede superar ${c.max}`);
      atributos[c.clave] = n;
    } else if (c.opciones && c.opciones.length > 0) {
      if (!c.opciones.includes(texto)) return falla(`${c.etiqueta}: elegí una de las opciones`);
      atributos[c.clave] = texto;
    } else {
      if (texto.length > REGLAS.texto) return falla(`${c.etiqueta} no puede superar ${REGLAS.texto} caracteres`);
      atributos[c.clave] = texto;
    }
  }

  // ---- Alcohol (18+): si se marca, exigir el grado ----
  if (atributos['contiene_alcohol'] === true) {
    const campoGrado = tipo.campos.find((c) => c.clave === 'grado_alcoholico');
    if (campoGrado) {
      const grado = atributos['grado_alcoholico'];
      if (typeof grado !== 'number' || grado <= 0) {
        return falla('Indicá el grado alcohólico del producto');
      }
      if (grado > REGLAS.gradoAlcoholMax) {
        return falla(`El grado alcohólico no puede superar ${REGLAS.gradoAlcoholMax} %`);
      }
    }
  }

  // ---- Grupos de opciones ----
  if (e.grupos.length > REGLAS.grupos.max) return falla(`Máximo ${REGLAS.grupos.max} grupos de opciones`);
  const nombresGrupos = new Set<string>();
  const gruposFinal: any[] = [];
  for (let i = 0; i < e.grupos.length; i++) {
    const g = e.grupos[i];
    const gn = normalizarTexto(g.nombre);
    if (!gn) return falla(`Poné nombre al grupo de opciones ${i + 1}`);
    if (gn.length > REGLAS.grupos.nombre) return falla(`El grupo "${gn}" supera ${REGLAS.grupos.nombre} caracteres`);
    if (!tieneLetraONumero(gn)) return falla(`El grupo ${i + 1} necesita un nombre válido`);
    const gclave = gn.toLowerCase();
    if (nombresGrupos.has(gclave)) return falla(`El grupo "${gn}" está repetido`);
    nombresGrupos.add(gclave);

    const opcionesFinal: { nombre: string; precioAdicional: number }[] = [];
    const nombresOpc = new Set<string>();
    for (const o of g.opciones) {
      const on = normalizarTexto(o.nombre);
      if (!on) continue;
      if (on.length > REGLAS.opciones.nombre) return falla(`En "${gn}", "${on}" supera ${REGLAS.opciones.nombre} caracteres`);
      if (!tieneLetraONumero(on)) return falla(`En "${gn}" hay una opción inválida`);
      const oclave = on.toLowerCase();
      if (nombresOpc.has(oclave)) return falla(`En "${gn}", la opción "${on}" está repetida`);
      nombresOpc.add(oclave);

      const extraTxt = o.precioAdicional === '' ? '0' : o.precioAdicional;
      if (!ENTERO.test(extraTxt)) return falla(`En "${gn}", el precio adicional de "${on}" no es válido`);
      const extra = Number(extraTxt);
      if (extra > REGLAS.opciones.extraMax) {
        return falla(`En "${gn}", el adicional de "${on}" no puede superar ${plata(REGLAS.opciones.extraMax)}`);
      }
      opcionesFinal.push({ nombre: on, precioAdicional: extra });
    }

    if (opcionesFinal.length === 0) return falla(`El grupo "${gn}" necesita al menos una opción`);
    if (opcionesFinal.length > REGLAS.opciones.max) {
      return falla(`El grupo "${gn}" admite hasta ${REGLAS.opciones.max} opciones`);
    }

    const minTxt = g.minimo === '' ? '0' : g.minimo;
    const maxTxt = g.maximo === '' ? '0' : g.maximo;
    if (!ENTERO.test(minTxt) || !ENTERO.test(maxTxt)) return falla(`En "${gn}", mínimo y máximo deben ser números`);
    const minimo = Number(minTxt);
    const maximo = Number(maxTxt);
    if (maximo < 1) return falla(`En "${gn}", el máximo debe ser al menos 1`);
    if (minimo > maximo) return falla(`En "${gn}", el mínimo no puede superar el máximo`);
    if (maximo > opcionesFinal.length) {
      return falla(`En "${gn}", el máximo no puede superar la cantidad de opciones (${opcionesFinal.length})`);
    }

    gruposFinal.push({ nombre: gn, minimo, maximo, opciones: opcionesFinal });
  }

  // ---- Payload ----
  const precioBase = usaVariantes ? Math.min(...variantesFinal.map((v) => v.precio)) : Number(e.precio);
  const stockTotal = usaVariantes
    ? variantesFinal.reduce((acc, v) => acc + v.stock, 0)
    : e.stock ? Number(e.stock) : 0;

  const payload: any = {
    tiendaId: e.tienda.id,
    nombre,
    descripcion,
    precio: precioBase,
    stock: stockTotal,
    tipo: tipo.clave,
    destacado: e.destacado,
    personas,
    atributos,
  };
  if (usaVariantes) payload.variantes = variantesFinal;
  if (gruposFinal.length > 0) payload.grupos = gruposFinal;

  return { payload };
}