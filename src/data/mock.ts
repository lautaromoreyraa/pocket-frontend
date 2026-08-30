import {
  BorradorAudio,
  Cotizacion,
  FijoDelPeriodo,
  Gasto,
  GastoBorrador,
  GastoFijo,
  Ingreso,
  ResumenFijos,
  ResumenHistorico,
  ResumenMensual,
} from '../types';
import { nuevaIdempotencyKey } from '../api/client';
import { hoyISO, periodoActual, sumarMeses } from '../utils/format';

/**
 * Datos de prueba. Son los mismos numeros que muestra docs/mockup.html, pero
 * anclados al mes en curso del telefono para que la app se vea viva.
 *
 * Todo esto desaparece cuando USE_MOCKS pase a false.
 */

const HOY = new Date();
const PERIODO = periodoActual(HOY);

const iso = (d: Date) => d.toISOString().slice(0, 10);
const diasAtras = (n: number) => {
  const d = new Date(HOY);
  d.setDate(d.getDate() - n);
  return d;
};

const gasto = (g: Partial<Gasto> & Pick<Gasto, 'id' | 'monto' | 'descripcion'>): Gasto => ({
  categoriaId: 13,
  categoriaNombre: 'Otros',
  medioPago: 'EFECTIVO',
  origen: 'MANUAL',
  fechaGasto: iso(HOY),
  fechaImputacion: iso(HOY),
  compraFinanciadaId: null,
  nroCuota: null,
  cantidadCuotas: null,
  hormiga: false,
  ocurrenciasCategoria: null,
  ...g,
});

export const MOCK_RESUMEN_DEBITO: ResumenMensual = {
  periodo: PERIODO,
  credito: false,
  total: 284350,
  porCategoria: [
    { categoriaId: 1, categoriaNombre: 'Supermercado', total: 98200, ocurrencias: 12, hormiga: false },
    { categoriaId: 2, categoriaNombre: 'Delivery', total: 46800, ocurrencias: 7, hormiga: true },
    { categoriaId: 10, categoriaNombre: 'Hogar', total: 37000, ocurrencias: 2, hormiga: false },
    { categoriaId: 3, categoriaNombre: 'Transporte', total: 31500, ocurrencias: 9, hormiga: true },
    { categoriaId: 4, categoriaNombre: 'Combustible', total: 28000, ocurrencias: 2, hormiga: false },
    { categoriaId: 5, categoriaNombre: 'Servicios', total: 42850, ocurrencias: 3, hormiga: true },
  ],
  ultimosMovimientos: [
    gasto({
      id: 'g1',
      monto: 5000,
      descripcion: 'Facturas',
      categoriaId: 1,
      categoriaNombre: 'Supermercado',
      medioPago: 'EFECTIVO',
      fechaGasto: iso(diasAtras(0)),
      fechaImputacion: iso(diasAtras(0)),
    }),
    gasto({
      id: 'g2',
      monto: 8400,
      descripcion: 'Empanadas',
      categoriaId: 2,
      categoriaNombre: 'Delivery',
      medioPago: 'DEBITO',
      hormiga: true,
      ocurrenciasCategoria: 7,
      fechaGasto: iso(diasAtras(1)),
      fechaImputacion: iso(diasAtras(1)),
    }),
    gasto({
      id: 'g3',
      monto: 20000,
      descripcion: 'Nafta',
      categoriaId: 4,
      categoriaNombre: 'Combustible',
      medioPago: 'TRANSFERENCIA',
      fechaGasto: iso(diasAtras(2)),
      fechaImputacion: iso(diasAtras(2)),
    }),
  ],
  comprasEnCurso: [],
  comprometidoDelPeriodo: null,
  balance: { ingresos: 850000, gastosTotales: 441250, capacidadAhorro: 408750 },
  avisoHormiga: {
    categoriaNombre: 'Delivery',
    ocurrencias: 7,
    total: 46800,
    porcentajeSobrePromedio: 40,
  },
  promedioHistorico: 398600,
};

export const MOCK_RESUMEN_CREDITO: ResumenMensual = {
  periodo: PERIODO,
  credito: true,
  total: 156900,
  porCategoria: [
    { categoriaId: 10, categoriaNombre: 'Hogar', total: 45000, ocurrencias: 1, hormiga: false },
    { categoriaId: 6, categoriaNombre: 'Suscripciones', total: 38600, ocurrencias: 4, hormiga: true },
    { categoriaId: 9, categoriaNombre: 'Ropa', total: 18300, ocurrencias: 1, hormiga: false },
  ],
  ultimosMovimientos: [
    gasto({
      id: 'c1',
      monto: 45000,
      descripcion: 'Televisor',
      categoriaId: 10,
      categoriaNombre: 'Hogar',
      medioPago: 'CREDITO',
      compraFinanciadaId: 'cf1',
      nroCuota: 2,
      cantidadCuotas: 6,
    }),
    gasto({
      id: 'c2',
      monto: 18300,
      descripcion: 'Zapatillas',
      categoriaId: 9,
      categoriaNombre: 'Ropa',
      medioPago: 'CREDITO',
      compraFinanciadaId: 'cf2',
      nroCuota: 1,
      cantidadCuotas: 3,
    }),
  ],
  comprasEnCurso: [
    {
      id: 'cf1',
      descripcion: 'Televisor',
      categoriaNombre: 'Hogar',
      montoTotal: 270000,
      montoCuota: 45000,
      cantidadCuotas: 6,
      cuotasPagas: 2,
      ultimoPeriodo: sumarMeses(PERIODO, 4),
    },
    {
      id: 'cf2',
      descripcion: 'Zapatillas',
      categoriaNombre: 'Ropa',
      montoTotal: 54900,
      montoCuota: 18300,
      cantidadCuotas: 3,
      cuotasPagas: 1,
      ultimoPeriodo: sumarMeses(PERIODO, 2),
    },
  ],
  comprometidoDelPeriodo: 63300,
  balance: null,
  avisoHormiga: {
    categoriaNombre: 'Suscripciones',
    ocurrencias: 4,
    total: 38600,
    porcentajeSobrePromedio: null,
  },
  promedioHistorico: 398600,
};

/** Los 5 meses que ofrece el selector del historico, del mas viejo al mas nuevo */
export const MOCK_PERIODOS_HISTORICOS: string[] = [-5, -4, -3, -2, -1].map((n) =>
  sumarMeses(PERIODO, n),
);

const HISTORICOS: Record<string, Omit<ResumenHistorico, 'periodo'>> = {
  [MOCK_PERIODOS_HISTORICOS[0]]: {
    totalDebito: 198400,
    totalCredito: 121000,
    total: 319400,
    ahorrado: 530600,
    promedioHistorico: 398600,
    mesesPromediados: 4,
    repeticiones: [
      { categoriaId: 2, categoriaNombre: 'Delivery', total: 28100, ocurrencias: 4, hormiga: true },
    ],
  },
  [MOCK_PERIODOS_HISTORICOS[1]]: {
    totalDebito: 245900,
    totalCredito: 118700,
    total: 364600,
    ahorrado: 485400,
    promedioHistorico: 398600,
    mesesPromediados: 4,
    repeticiones: [
      { categoriaId: 3, categoriaNombre: 'Transporte', total: 22400, ocurrencias: 6, hormiga: true },
      { categoriaId: 2, categoriaNombre: 'Delivery', total: 19800, ocurrencias: 3, hormiga: true },
    ],
  },
  [MOCK_PERIODOS_HISTORICOS[2]]: {
    totalDebito: 231800,
    totalCredito: 142400,
    total: 374200,
    ahorrado: 475800,
    promedioHistorico: 398600,
    mesesPromediados: 4,
    repeticiones: [
      { categoriaId: 2, categoriaNombre: 'Delivery', total: 34200, ocurrencias: 5, hormiga: true },
      { categoriaId: 13, categoriaNombre: 'Otros', total: 11900, ocurrencias: 3, hormiga: true },
    ],
  },
  [MOCK_PERIODOS_HISTORICOS[3]]: {
    totalDebito: 289100,
    totalCredito: 151300,
    total: 440400,
    ahorrado: 409600,
    promedioHistorico: 398600,
    mesesPromediados: 4,
    repeticiones: [
      { categoriaId: 6, categoriaNombre: 'Suscripciones', total: 38600, ocurrencias: 4, hormiga: true },
    ],
  },
  [MOCK_PERIODOS_HISTORICOS[4]]: {
    totalDebito: 262700,
    totalCredito: 133900,
    total: 396600,
    ahorrado: 453400,
    promedioHistorico: 398600,
    mesesPromediados: 4,
    repeticiones: [
      { categoriaId: 2, categoriaNombre: 'Delivery', total: 25600, ocurrencias: 3, hormiga: true },
    ],
  },
};

export function mockHistorico(periodo: string): ResumenHistorico {
  const base = HISTORICOS[periodo] ?? HISTORICOS[MOCK_PERIODOS_HISTORICOS[2]];
  return { periodo, ...base };
}

export const MOCK_COTIZACION: Cotizacion = {
  compra: 1450,
  venta: 1485,
  fechaActualizacion: new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate(), 14, 20).toISOString(),
  desdeCache: false,
};

/** RF-41 — el borrador offline que aparece arriba de la pantalla de registro */
export const MOCK_BORRADOR_AUDIO: BorradorAudio = {
  id: 'b1',
  grabadoEn: new Date(HOY.getTime() - 40 * 60 * 60 * 1000).toISOString(),
  uri: null,
  sinConexion: true,
};

/**
 * RF-05 — lo que "escucha" la IA en un audio. Dos gastos, igual que el mockup.
 * Cada llamada devuelve claves de idempotencia nuevas (RF-46).
 */
/**
 * Lista completa de movimientos de un periodo, para la pantalla "Todos los
 * movimientos". Se genera de forma determinista a partir del periodo, asi el
 * mismo mes siempre devuelve lo mismo y se puede comparar entre recargas.
 *
 * Reemplazado por GET /api/gastos?periodo=&credito= cuando USE_MOCKS sea false.
 */
const PLANTILLA_DEBITO: { desc: string; catId: number; cat: string; medio: Gasto['medioPago']; base: number }[] = [
  { desc: 'Chino de la esquina', catId: 1, cat: 'Supermercado', medio: 'DEBITO', base: 12400 },
  { desc: 'Empanadas', catId: 2, cat: 'Delivery', medio: 'DEBITO', base: 8400 },
  { desc: 'SUBE', catId: 3, cat: 'Transporte', medio: 'EFECTIVO', base: 3000 },
  { desc: 'Nafta', catId: 4, cat: 'Combustible', medio: 'TRANSFERENCIA', base: 20000 },
  { desc: 'Luz', catId: 5, cat: 'Servicios', medio: 'TRANSFERENCIA', base: 18700 },
  { desc: 'Facturas', catId: 1, cat: 'Supermercado', medio: 'EFECTIVO', base: 5000 },
  { desc: 'Farmacia', catId: 7, cat: 'Salud', medio: 'DEBITO', base: 9600 },
  { desc: 'Pizza del viernes', catId: 2, cat: 'Delivery', medio: 'DEBITO', base: 11200 },
  { desc: 'Remis', catId: 3, cat: 'Transporte', medio: 'EFECTIVO', base: 4500 },
  { desc: 'Verdulería', catId: 1, cat: 'Supermercado', medio: 'EFECTIVO', base: 7300 },
  { desc: 'Internet', catId: 5, cat: 'Servicios', medio: 'DEBITO', base: 24150 },
  { desc: 'Sushi', catId: 2, cat: 'Delivery', medio: 'DEBITO', base: 16800 },
  { desc: 'Compra grande', catId: 1, cat: 'Supermercado', medio: 'DEBITO', base: 48500 },
  { desc: 'Alimento del perro', catId: 12, cat: 'Mascotas', medio: 'EFECTIVO', base: 14200 },
  { desc: 'Cine', catId: 8, cat: 'Entretenimiento', medio: 'DEBITO', base: 9000 },
  { desc: 'Colectivo', catId: 3, cat: 'Transporte', medio: 'EFECTIVO', base: 2400 },
];

const PLANTILLA_CREDITO: { desc: string; catId: number; cat: string; base: number; cuota?: [number, number] }[] = [
  { desc: 'Televisor', catId: 10, cat: 'Hogar', base: 45000, cuota: [2, 6] },
  { desc: 'Zapatillas', catId: 9, cat: 'Ropa', base: 18300, cuota: [1, 3] },
  { desc: 'Spotify', catId: 6, cat: 'Suscripciones', base: 5900 },
  { desc: 'Netflix', catId: 6, cat: 'Suscripciones', base: 12400 },
  { desc: 'iCloud', catId: 6, cat: 'Suscripciones', base: 3300 },
  { desc: 'Gimnasio', catId: 6, cat: 'Suscripciones', base: 17000 },
  { desc: 'Camisa', catId: 9, cat: 'Ropa', base: 22500 },
];

/** Hash simple del periodo, para que la variacion sea estable mes a mes */
function semilla(periodo: string): number {
  let h = 0;
  for (const c of periodo) h = (h * 31 + c.charCodeAt(0)) % 9973;
  return h;
}

export function mockMovimientos(periodo: string, credito: boolean): Gasto[] {
  const s = semilla(periodo);
  const [anio, mes] = periodo.split('-').map(Number);
  // En el mes en curso el ultimo dia util es hoy: no queremos gastos con fecha
  // futura, que se leerian como un bug.
  const diasDelMes =
    periodo === PERIODO ? HOY.getDate() : new Date(anio, mes, 0).getDate();

  const plantilla = credito ? PLANTILLA_CREDITO : PLANTILLA_DEBITO;
  // Entre el 60% y el 100% de la plantilla, segun el mes
  const cantidad = Math.max(3, plantilla.length - (s % Math.ceil(plantilla.length * 0.4)));

  return plantilla.slice(0, cantidad).map((p, i) => {
    // Repartidos a lo largo del mes, del mas reciente al mas viejo
    const dia = Math.max(1, diasDelMes - Math.floor((i * diasDelMes) / cantidad) - ((s + i) % 2));
    const fecha = `${periodo}-${String(dia).padStart(2, '0')}`;
    const variacion = 1 + (((s + i * 7) % 21) - 10) / 100; // ±10%
    const esCuota = credito && 'cuota' in p && p.cuota !== undefined;

    return gasto({
      id: `${periodo}-${credito ? 'c' : 'd'}-${i}`,
      monto: Math.round((p.base * variacion) / 100) * 100,
      descripcion: p.desc,
      categoriaId: p.catId,
      categoriaNombre: p.cat,
      medioPago: credito ? 'CREDITO' : (p as { medio: Gasto['medioPago'] }).medio,
      fechaGasto: fecha,
      fechaImputacion: fecha,
      compraFinanciadaId: esCuota ? `cf-${i}` : null,
      nroCuota: esCuota ? (p as { cuota: [number, number] }).cuota[0] : null,
      cantidadCuotas: esCuota ? (p as { cuota: [number, number] }).cuota[1] : null,
      // RF-24 — las cuotas no computan como gasto hormiga
      hormiga: !esCuota && (p.catId === 2 || p.catId === 6),
      ocurrenciasCategoria: p.catId === 2 ? 7 : p.catId === 6 ? 4 : null,
    });
  });
}

// ---------------------------------------------------------------------------
// Ingresos y gastos fijos
//
// A diferencia del resto del mock, esto es estado MUTABLE en memoria: hace
// falta para que cargar un ingreso o tildar un fijo se vea reflejado en la
// pantalla. Se pierde al recargar la app, que es lo esperable de un mock.
// ---------------------------------------------------------------------------

/** periodo -> ingreso del mes */
const INGRESOS = new Map<string, Ingreso>([
  [PERIODO, { id: 'i1', monto: 850000, descripcion: 'Sueldo', periodo: PERIODO }],
]);

export function mockGetIngreso(periodo: string): Ingreso | null {
  return INGRESOS.get(periodo) ?? null;
}

export function mockGuardarIngreso(
  periodo: string,
  monto: number,
  descripcion: string,
): Ingreso {
  const ingreso: Ingreso = {
    id: INGRESOS.get(periodo)?.id ?? `i-${periodo}`,
    monto,
    descripcion,
    periodo,
  };
  INGRESOS.set(periodo, ingreso);
  return ingreso;
}

export function mockEliminarIngreso(periodo: string): void {
  INGRESOS.delete(periodo);
}

let FIJOS: GastoFijo[] = [
  { id: 'f1', descripcion: 'Alquiler', monto: 95000, categoriaId: 10, categoriaNombre: 'Hogar', medioPago: 'TRANSFERENCIA', diaDelMes: 5, activo: true },
  { id: 'f2', descripcion: 'Internet', monto: 24150, categoriaId: 5, categoriaNombre: 'Servicios', medioPago: 'DEBITO', diaDelMes: 10, activo: true },
  { id: 'f3', descripcion: 'Luz', monto: 18700, categoriaId: 5, categoriaNombre: 'Servicios', medioPago: 'TRANSFERENCIA', diaDelMes: 12, activo: true },
  { id: 'f4', descripcion: 'Netflix', monto: 12400, categoriaId: 6, categoriaNombre: 'Suscripciones', medioPago: 'CREDITO', diaDelMes: 15, activo: true },
  { id: 'f5', descripcion: 'Gimnasio', monto: 17000, categoriaId: 7, categoriaNombre: 'Salud', medioPago: 'DEBITO', diaDelMes: 20, activo: true },
  { id: 'f6', descripcion: 'Spotify', monto: 5900, categoriaId: 6, categoriaNombre: 'Suscripciones', medioPago: 'CREDITO', diaDelMes: 28, activo: true },
];

/**
 * periodo -> (fijoId -> el gasto generado)
 *
 * Guarda el monto ademas del id porque un fijo es variable: lo que se pago
 * puede no ser lo que dice la plantilla, y la pantalla muestra el real. La luz
 * del mock arranca mas cara que su plantilla justamente para que ese caso se
 * vea sin tener que provocarlo.
 */
interface RegistroMock {
  gastoId: string;
  monto: number;
}

const REGISTRADOS = new Map<string, Map<string, RegistroMock>>([
  [
    PERIODO,
    new Map<string, RegistroMock>([
      ['f1', { gastoId: 'gf-1', monto: 95000 }],
      ['f2', { gastoId: 'gf-2', monto: 24150 }],
      ['f3', { gastoId: 'gf-3', monto: 21400 }],
      ['f4', { gastoId: 'gf-4', monto: 12400 }],
    ]),
  ],
]);

export function mockGetFijos(): GastoFijo[] {
  return [...FIJOS];
}

export function mockGuardarFijo(fijo: GastoFijo): GastoFijo {
  const existente = FIJOS.findIndex((f) => f.id === fijo.id);
  if (existente >= 0) FIJOS[existente] = fijo;
  else FIJOS = [...FIJOS, { ...fijo, id: `f-${Date.now()}` }];
  return fijo;
}

export function mockEliminarFijo(id: string): void {
  FIJOS = FIJOS.filter((f) => f.id !== id);
  for (const delPeriodo of REGISTRADOS.values()) delPeriodo.delete(id);
}

export function mockResumenFijos(periodo: string): ResumenFijos {
  const registrados = REGISTRADOS.get(periodo) ?? new Map<string, RegistroMock>();

  const items: FijoDelPeriodo[] = FIJOS.map((fijo) => {
    const registro = registrados.get(fijo.id);
    return {
      fijo,
      gastoId: registro?.gastoId ?? null,
      montoRegistrado: registro?.monto ?? null,
    };
  });

  return {
    periodo,
    items,
    // El monto real donde ya lo hay, el de la plantilla donde todavia no:
    // mismo criterio que el backend, para que el mock no mienta.
    totalEstimado: items
      .filter((i) => i.fijo.activo)
      .reduce((acc, i) => acc + (i.montoRegistrado ?? i.fijo.monto), 0),
    totalRegistrado: items.reduce((acc, i) => acc + (i.montoRegistrado ?? 0), 0),
  };
}

/** Tildar: materializa el fijo como un gasto real del periodo */
export function mockRegistrarFijo(fijoId: string, periodo: string, monto: number): void {
  const delPeriodo = REGISTRADOS.get(periodo) ?? new Map<string, RegistroMock>();
  delPeriodo.set(fijoId, { gastoId: `gf-${fijoId}-${periodo}`, monto });
  REGISTRADOS.set(periodo, delPeriodo);
}

/** Destildar: borra el gasto generado. Se busca por gastoId porque es lo unico
 *  que tiene la pantalla a mano, igual que contra el backend real. */
export function mockDesregistrarFijo(gastoId: string, periodo: string): void {
  const delPeriodo = REGISTRADOS.get(periodo);
  if (!delPeriodo) return;
  for (const [fijoId, registro] of delPeriodo) {
    if (registro.gastoId === gastoId) delPeriodo.delete(fijoId);
  }
}

/** Corregir cuanto se pago este mes, sin tocar la plantilla */
export function mockEditarMontoFijo(fijoId: string, periodo: string, monto: number): void {
  const registro = REGISTRADOS.get(periodo)?.get(fijoId);
  if (registro) registro.monto = monto;
}

export function mockGastosDetectados(): GastoBorrador[] {
  return [
    {
      localId: 'd1',
      idempotencyKey: nuevaIdempotencyKey(),
      monto: 5000,
      categoriaId: 1,
      descripcion: 'Facturas',
      medioPago: 'EFECTIVO',
      fechaGasto: hoyISO(),
      cantidadCuotas: 1,
    },
    {
      localId: 'd2',
      idempotencyKey: nuevaIdempotencyKey(),
      monto: 20000,
      categoriaId: 4,
      descripcion: 'Nafta',
      medioPago: 'EFECTIVO',
      fechaGasto: hoyISO(),
      cantidadCuotas: 1,
    },
  ];
}
