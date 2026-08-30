/**
 * Tipos del dominio. Son el espejo en TypeScript de los DTOs del backend
 * (ver docs/escenario.md, secciones 8 y 10). Si cambia un DTO en Java,
 * cambia aca.
 *
 * Convencion de montos: el backend usa BigDecimal / DECIMAL(12,2) y los
 * serializa como *numero* JSON (verificado contra la API: 6000.0). Los tipamos
 * como `number` y se usan solo para mostrar y para las barras; ninguna
 * operacion aritmetica sobre plata se hace en el cliente salvo la
 * previsualizacion de cuotas, que replica exactamente RN-04.
 *
 * Si alguna vez hiciera falta precision garantizada de punta a punta, el cambio
 * es del lado del backend (WRITE_BIGDECIMAL_AS_PLAIN) y aca pasarian a `string`.
 */

/** RF-16 — medios de pago del dominio */
export type MedioPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'DEBITO' | 'CREDITO';

/**
 * De donde salio el gasto.
 *
 * Es `VOZ`, no `AUDIO`: el valor esta persistido asi en la columna `origen` de
 * todas las filas del backend, y renombrarlo alla obligaria a migrar datos por
 * una diferencia cosmetica.
 *
 * `FIJO` es un gasto materializado desde una plantilla de gasto fijo. No es un
 * estado aparte: es un gasto comun en todo lo demas, y suma a los totales como
 * cualquier otro.
 */
export type OrigenGasto = 'VOZ' | 'MANUAL' | 'FIJO';

/** RF-34 — la lista de categorias es fija y de solo lectura */
export interface Categoria {
  id: number;
  nombre: string;
  /** nombre de icono, por ahora sin uso en la UI */
  icono: string | null;
  color: string | null;
  orden: number;
}

/** Una fila de `gasto`. Una cuota tambien es un gasto (ver 8.1 del escenario). */
export interface Gasto {
  id: string;
  categoriaId: number;
  categoriaNombre: string;
  monto: number;
  descripcion: string;
  medioPago: MedioPago;
  origen: OrigenGasto;
  /** cuando ocurrio realmente, ISO yyyy-MM-dd */
  fechaGasto: string;
  /** a que mes se le carga, ISO yyyy-MM-dd (RN-03) */
  fechaImputacion: string;
  /** null si no es cuota */
  compraFinanciadaId: string | null;
  /** null si no es cuota, >= 1 si lo es */
  nroCuota: number | null;
  /** cantidad total de cuotas, para poder mostrar "2 / 6" */
  cantidadCuotas: number | null;
  /** RF-27 — la categoria supero el umbral de ocurrencias este mes */
  hormiga: boolean;
  /** cuantas veces se repitio la categoria en el periodo, para el "7.ª VEZ" */
  ocurrenciasCategoria: number | null;
}

/** Una compra en cuotas en curso, para el bloque "Cuotas en curso" */
export interface CompraEnCurso {
  id: string;
  descripcion: string;
  categoriaNombre: string;
  montoTotal: number;
  montoCuota: number;
  cantidadCuotas: number;
  /** cuantas cuotas ya se imputaron, incluida la del periodo actual */
  cuotasPagas: number;
  /** periodo de la ultima cuota, formato yyyy-MM */
  ultimoPeriodo: string;
}

/** Una fila del grafico "Por categoria" (RF-28) */
export interface TotalCategoria {
  categoriaId: number;
  categoriaNombre: string;
  total: number;
  ocurrencias: number;
  /** RF-27 — se pinta en rojo */
  hormiga: boolean;
}

/** RF-27 — el aviso de gasto hormiga que se muestra arriba de todo */
export interface AvisoHormiga {
  categoriaNombre: string;
  ocurrencias: number;
  total: number;
  /** diferencia porcentual contra el promedio, null si todavia no hay promedio */
  porcentajeSobrePromedio: number | null;
}

/** RN-06 — capacidad de ahorro. `null` si no hay ingreso cargado (RF-33). */
export interface Balance {
  ingresos: number;
  gastosTotales: number;
  capacidadAhorro: number;
}

/**
 * GET /api/resumen?periodo=&credito=
 * Un unico endpoint alimenta Debito, Credito e Historico (seccion 4.3).
 */
export interface ResumenMensual {
  /** yyyy-MM */
  periodo: string;
  credito: boolean;
  total: number;
  porCategoria: TotalCategoria[];
  ultimosMovimientos: Gasto[];
  /** solo en la vista de credito */
  comprasEnCurso: CompraEnCurso[];
  /** solo en la vista de credito: cuotas que vencen en el periodo que se esta viendo */
  comprometidoDelPeriodo: number | null;
  /** null si no hay ingreso cargado (RF-33) */
  balance: Balance | null;
  /** null si todavia no hay hormigas */
  avisoHormiga: AvisoHormiga | null;
  /** RF-29 — null con menos de 3 meses de datos */
  promedioHistorico: number | null;
}

/** Resumen de un mes cerrado, para la pestana Historico */
export interface ResumenHistorico {
  periodo: string;
  totalDebito: number;
  totalCredito: number;
  total: number;
  ahorrado: number | null;
  /** RF-29 — promedio de los meses anteriores, null si no alcanza */
  promedioHistorico: number | null;
  /** cuantos meses entraron en el promedio */
  mesesPromediados: number;
  /** categorias repetidas del periodo */
  repeticiones: TotalCategoria[];
}

/**
 * RF-32 — el ingreso del mes. Se carga siempre a mano, nunca por audio.
 * Sin ingreso cargado no se muestra la capacidad de ahorro (RF-33).
 */
export interface Ingreso {
  id: string;
  monto: number;
  descripcion: string;
  /**
   * El backend lo devuelve normalizado al dia 1 del mes, `yyyy-MM-dd`
   * (por ejemplo "2026-08-01"). En el alta, en cambio, se manda `yyyy-MM`.
   */
  periodo: string;
}

/**
 * Gasto fijo: la PLANTILLA de un gasto que se repite todos los meses
 * (alquiler, internet, una suscripcion). No es un `gasto` y no suma a ningun
 * total por si misma: cada mes se materializa como un `gasto` real, siguiendo
 * el mismo patron que las cuotas (RF-22, "se materializan, no hay job").
 *
 * NO esta en docs/escenario.md: es una extension posterior. Ver el contrato
 * que necesita el backend en src/api/pocket.ts.
 */
export interface GastoFijo {
  id: string;
  descripcion: string;
  monto: number;
  categoriaId: number;
  categoriaNombre: string;
  medioPago: MedioPago;
  /**
   * Dia del mes en que se paga. Tope 28 a proposito: con 29, 30 o 31 habria
   * que decidir que pasa en febrero, y no vale la complejidad.
   */
  diaDelMes: number;
  /** false = pausado, sigue existiendo pero no se espera este mes */
  activo: boolean;
}

/**
 * El estado de un gasto fijo dentro de un periodo concreto: el tilde de la
 * pantalla.
 *
 * `gastoId` no nulo significa "ya lo pague este mes". No hay un flag aparte
 * porque no hay estado que mantener sincronizado: el tilde ES la existencia del
 * gasto. Tildarlo lo crea, destildarlo lo borra, y por eso suma al total del mes
 * exactamente cuando esta tildado.
 */
export interface FijoDelPeriodo {
  fijo: GastoFijo;
  /** id del `gasto` ya generado; null si todavia no se registro este mes */
  gastoId: string | null;
  /** lo que realmente se registro, que puede diferir del monto de la plantilla */
  montoRegistrado: number | null;
}

/** GET /api/gastos-fijos/resumen?periodo= — alimenta la pestana Fijos */
export interface ResumenFijos {
  periodo: string;
  items: FijoDelPeriodo[];
  /** suma de las plantillas activas */
  totalEstimado: number;
  /** suma de lo que ya se registro este mes */
  totalRegistrado: number;
}

/** RF-38 — cotizacion del dolar blue */
export interface Cotizacion {
  compra: number;
  venta: number;
  /** ISO 8601 */
  fechaActualizacion: string;
  /** RF-40 — true si vino del cache porque la API externa fallo */
  desdeCache: boolean;
}

/**
 * Un gasto todavia no persistido: lo que devuelve POST /api/audio (RF-06)
 * y lo que arma el formulario manual (RF-11). El mismo tipo alimenta el
 * mismo formulario en los dos casos, que es lo que pide RF-15.
 */
export interface GastoBorrador {
  /** id local, solo para las listas de React */
  localId: string;
  /** RF-46 — la genera el cliente y la manda en el alta */
  idempotencyKey: string;
  monto: number | null;
  categoriaId: number | null;
  descripcion: string;
  medioPago: MedioPago;
  /**
   * Cuando ocurrio el gasto, ISO yyyy-MM-dd. El backend la exige y no puede
   * ser futura. En los detectados por audio viene del backend; en la carga
   * manual arranca en hoy.
   */
  fechaGasto: string;
  /** 1 cuando no hay cuotas; solo aplica con medioPago CREDITO (RF-20) */
  cantidadCuotas: number;
}

/** RF-41 — audio grabado sin conexion, guardado en el dispositivo */
export interface BorradorAudio {
  id: string;
  /** ISO 8601 del momento de la grabacion */
  grabadoEn: string;
  /** ruta del archivo en el dispositivo */
  uri: string | null;
  /** true si quedo pendiente por falta de conexion */
  sinConexion: boolean;
}
