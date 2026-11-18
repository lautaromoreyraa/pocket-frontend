
export type MedioPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'DEBITO' | 'CREDITO';

export type OrigenGasto = 'VOZ' | 'MANUAL' | 'FIJO';

export interface Categoria {
  id: number;
  nombre: string;
  icono: string | null;
  color: string | null;
  orden: number;
}

export interface Gasto {
  id: string;
  categoriaId: number;
  categoriaNombre: string;
  monto: number;
  descripcion: string;
  medioPago: MedioPago;
  origen: OrigenGasto;
  fechaGasto: string;
  fechaImputacion: string;
  compraFinanciadaId: string | null;
  nroCuota: number | null;
  cantidadCuotas: number | null;
  hormiga: boolean;
  ocurrenciasCategoria: number | null;
}

export interface CompraEnCurso {
  id: string;
  descripcion: string;
  categoriaNombre: string;
  montoTotal: number;
  montoCuota: number;
  cantidadCuotas: number;
  cuotasPagas: number;
  ultimoPeriodo: string;
}

export interface TotalCategoria {
  categoriaId: number;
  categoriaNombre: string;
  total: number;
  ocurrencias: number;
  hormiga: boolean;
}

export interface AvisoHormiga {
  categoriaNombre: string;
  ocurrencias: number;
  total: number;
  porcentajeSobrePromedio: number | null;
}

export interface Balance {
  ingresos: number;
  gastosTotales: number;
  capacidadAhorro: number;
}

export interface ResumenMensual {
  periodo: string;
  credito: boolean;
  total: number;
  porCategoria: TotalCategoria[];
  ultimosMovimientos: Gasto[];
  comprasEnCurso: CompraEnCurso[];
  comprometidoDelPeriodo: number | null;
  balance: Balance | null;
  avisoHormiga: AvisoHormiga | null;
  promedioHistorico: number | null;
}

export interface ResumenHistorico {
  periodo: string;
  totalDebito: number;
  totalCredito: number;
  total: number;
  ahorrado: number | null;
  promedioHistorico: number | null;
  mesesPromediados: number;
  repeticiones: TotalCategoria[];
}

export interface Ingreso {
  id: string;
  monto: number;
  descripcion: string;
  periodo: string;
}

export interface GastoFijo {
  id: string;
  descripcion: string;
  monto: number;
  categoriaId: number;
  categoriaNombre: string;
  medioPago: MedioPago;
  diaDelMes: number;
  activo: boolean;
}

export interface FijoDelPeriodo {
  fijo: GastoFijo;
  gastoId: string | null;
  montoRegistrado: number | null;
}

export interface ResumenFijos {
  periodo: string;
  items: FijoDelPeriodo[];
  totalEstimado: number;
  totalRegistrado: number;
}

export interface Cotizacion {
  compra: number;
  venta: number;
  fechaActualizacion: string;
  desdeCache: boolean;
}

export interface GastoBorrador {
  localId: string;
  idempotencyKey: string;
  monto: number | null;
  categoriaId: number | null;
  descripcion: string;
  medioPago: MedioPago;
  fechaGasto: string;
  cantidadCuotas: number;
}

export interface BorradorAudio {
  id: string;
  grabadoEn: string;
  uri: string | null;
  sinConexion: boolean;
}
