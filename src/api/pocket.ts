import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';

import { aWavMono16k } from '../utils/audioWeb';

import {
  Categoria,
  Cotizacion,
  Gasto,
  GastoBorrador,
  GastoFijo,
  Ingreso,
  MedioPago,
  ResumenFijos,
  ResumenHistorico,
  ResumenMensual,
} from '../types';
import { CATEGORIAS } from '../data/categorias';
import {
  MOCK_COTIZACION,
  MOCK_PERIODOS_HISTORICOS,
  MOCK_RESUMEN_CREDITO,
  MOCK_RESUMEN_DEBITO,
  mockDesregistrarFijo,
  mockEditarMontoFijo,
  mockEliminarFijo,
  mockEliminarIngreso,
  mockGastosDetectados,
  mockGetFijos,
  mockGetIngreso,
  mockGuardarFijo,
  mockGuardarIngreso,
  mockHistorico,
  mockMovimientos,
  mockRegistrarFijo,
  mockResumenFijos,
} from '../data/mock';
import {
  ApiError,
  getDeviceUuid,
  getToken,
  nuevaIdempotencyKey,
  request,
  setToken,
} from './client';
import { MOCK_DELAY, USE_MOCKS } from './config';
import { obtenerTokenTurnstile } from './turnstile';
import { periodoActual, sumarMeses } from '../utils/format';


const demora = (ms = MOCK_DELAY) => new Promise((r) => setTimeout(r, ms));

export async function autenticarDispositivo(): Promise<void> {
  if (USE_MOCKS) {
    await demora(120);
    return;
  }
  const deviceUuid = await getDeviceUuid();
  const pedir = (turnstileToken?: string) =>
    request<{ token: string }>('/api/auth/dispositivo', {
      method: 'POST',
      body: { deviceUuid, turnstileToken },
      publico: true,
    });

  const conocido = (await getToken()) !== null;
  let respuesta: { token: string };
  try {
    respuesta = await pedir(conocido ? undefined : await obtenerTokenTurnstile());
  } catch (e) {
    if (!(conocido && e instanceof ApiError && e.status === 403)) throw e;
    respuesta = await pedir(await obtenerTokenTurnstile());
  }
  await setToken(respuesta.token);
}

export async function getCategorias(): Promise<Categoria[]> {
  if (USE_MOCKS) {
    await demora();
    return CATEGORIAS;
  }
  return request<Categoria[]>('/api/categorias');
}

export async function getResumen(periodo: string, credito: boolean): Promise<ResumenMensual> {
  if (USE_MOCKS) {
    await demora();
    const base = credito ? MOCK_RESUMEN_CREDITO : MOCK_RESUMEN_DEBITO;
    const ingreso = mockGetIngreso(periodo);
    const gastosTotales = MOCK_RESUMEN_DEBITO.total + MOCK_RESUMEN_CREDITO.total;
    return {
      ...base,
      periodo,
      balance:
        !credito && ingreso
          ? {
              ingresos: ingreso.monto,
              gastosTotales,
              capacidadAhorro: ingreso.monto - gastosTotales,
            }
          : null,
      ultimosMovimientos: mockMovimientos(periodo, credito).slice(0, 3),
    };
  }
  return request<ResumenMensual>('/api/resumen', { query: { periodo, credito } });
}

export async function getGastos(periodo: string, credito: boolean): Promise<Gasto[]> {
  if (USE_MOCKS) {
    await demora();
    return mockMovimientos(periodo, credito);
  }
  return request<Gasto[]>('/api/gastos', { query: { periodo, credito } });
}

export async function getHistorico(periodo: string): Promise<ResumenHistorico> {
  if (USE_MOCKS) {
    await demora();
    return mockHistorico(periodo);
  }

  const [debito, credito] = await Promise.all([
    getResumen(periodo, false),
    getResumen(periodo, true),
  ]);

  return {
    periodo,
    totalDebito: debito.total,
    totalCredito: credito.total,
    total: debito.total + credito.total,
    ahorrado: debito.balance ? debito.balance.capacidadAhorro : null,
    promedioHistorico: debito.promedioHistorico,
    mesesPromediados: 0,
    repeticiones: debito.porCategoria.filter((c) => c.hormiga),
  };
}

const MESES_HISTORICO_MINIMOS = 6;

export async function getPeriodosHistoricos(): Promise<string[]> {
  if (USE_MOCKS) {
    await demora(100);
    return MOCK_PERIODOS_HISTORICOS;
  }

  const conDatos = await request<string[]>('/api/resumen/periodos');

  const cerradosRecientes: string[] = [];
  for (let i = MESES_HISTORICO_MINIMOS; i >= 1; i--) {
    cerradosRecientes.push(sumarMeses(periodoActual(), -i));
  }

  return [...new Set([...conDatos, ...cerradosRecientes])].sort();
}


export async function getIngresos(periodo: string): Promise<Ingreso[]> {
  if (USE_MOCKS) {
    await demora();
    const uno = mockGetIngreso(periodo);
    return uno ? [uno] : [];
  }
  return request<Ingreso[]>('/api/ingresos', { query: { periodo } });
}

export async function guardarIngreso(
  periodo: string,
  monto: number,
  descripcion: string,
): Promise<Ingreso> {
  if (USE_MOCKS) {
    await demora();
    return mockGuardarIngreso(periodo, monto, descripcion);
  }
  return request<Ingreso>('/api/ingresos', {
    method: 'POST',
    body: { periodo, monto, descripcion },
  });
}

export async function eliminarIngreso(id: string, periodo: string): Promise<void> {
  if (USE_MOCKS) {
    await demora();
    mockEliminarIngreso(periodo);
    return;
  }
  await request<void>(`/api/ingresos/${id}`, { method: 'DELETE' });
}


export async function getGastosFijos(): Promise<GastoFijo[]> {
  if (USE_MOCKS) {
    await demora();
    return mockGetFijos();
  }
  return request<GastoFijo[]>('/api/gastos-fijos');
}

export async function guardarGastoFijo(fijo: GastoFijo): Promise<GastoFijo> {
  if (USE_MOCKS) {
    await demora();
    return mockGuardarFijo(fijo);
  }
  const nuevo = fijo.id === '';
  const body = {
    descripcion: fijo.descripcion,
    monto: fijo.monto,
    categoriaId: fijo.categoriaId,
    medioPago: fijo.medioPago,
    diaDelMes: fijo.diaDelMes,
    ...(nuevo ? {} : { activo: fijo.activo }),
  };
  return request<GastoFijo>(nuevo ? '/api/gastos-fijos' : `/api/gastos-fijos/${fijo.id}`, {
    method: nuevo ? 'POST' : 'PUT',
    body,
  });
}

export async function eliminarGastoFijo(id: string): Promise<void> {
  if (USE_MOCKS) {
    await demora();
    mockEliminarFijo(id);
    return;
  }
  await request<void>(`/api/gastos-fijos/${id}`, { method: 'DELETE' });
}

export async function getResumenFijos(periodo: string): Promise<ResumenFijos> {
  if (USE_MOCKS) {
    await demora();
    return mockResumenFijos(periodo);
  }
  return request<ResumenFijos>('/api/gastos-fijos/resumen', { query: { periodo } });
}

export async function registrarGastoFijo(
  id: string,
  periodo: string,
  monto: number,
): Promise<void> {
  if (USE_MOCKS) {
    await demora();
    mockRegistrarFijo(id, periodo, monto);
    return;
  }
  await request<void>(`/api/gastos-fijos/${id}/registrar`, {
    method: 'POST',
    body: { periodo, monto, idempotencyKey: nuevaIdempotencyKey() },
  });
}

export async function desregistrarGastoFijo(gastoId: string, periodo: string): Promise<void> {
  if (USE_MOCKS) {
    await demora();
    mockDesregistrarFijo(gastoId, periodo);
    return;
  }
  await request<void>(`/api/gastos/${gastoId}`, { method: 'DELETE' });
}

export async function editarMontoDelMes(
  id: string,
  periodo: string,
  monto: number,
): Promise<void> {
  if (USE_MOCKS) {
    await demora();
    mockEditarMontoFijo(id, periodo, monto);
    return;
  }
  await request<void>(`/api/gastos-fijos/${id}/registro`, {
    method: 'PUT',
    query: { periodo },
    body: { monto },
  });
}

export async function getCotizacion(): Promise<Cotizacion> {
  if (USE_MOCKS) {
    await demora(80);
    return MOCK_COTIZACION;
  }
  return request<Cotizacion>('/api/cotizacion/blue');
}

export async function procesarAudio(
  uri: string | null,
): Promise<{ gastos: GastoBorrador[]; transcripcion: string }> {
  if (USE_MOCKS) {
    await demora(1600);
    return { gastos: mockGastosDetectados(), transcripcion: 'Gaste 5.000 en facturas' };
  }

  if (!uri) throw new Error('No hay audio para procesar');

  const form = new FormData();

  if (Platform.OS === 'web') {
    form.append('audio', await aWavMono16k(uri), 'gasto.wav');
  } else {
    form.append('audio', new File(uri), 'gasto.m4a');
  }

  const resp = await request<{ detectados: GastoDetectado[]; transcripcion: string }>('/api/audio', {
    method: 'POST',
    body: form,
  });

  return {
    gastos: resp.detectados.map((d) => ({
      localId: Crypto.randomUUID(),
      idempotencyKey: d.idempotencyKey,
      monto: d.monto,
      categoriaId: d.categoriaId,
      descripcion: d.descripcion ?? '',
      medioPago: d.medioPago,
      fechaGasto: d.fechaGasto,
      cantidadCuotas: d.cantidadCuotas ?? 1,
    })),
    transcripcion: resp.transcripcion,
  };
}

interface GastoDetectado {
  idempotencyKey: string;
  monto: number;
  categoriaId: number;
  descripcion: string | null;
  medioPago: MedioPago;
  fechaGasto: string;
  cantidadCuotas: number | null;
}

function aGastoRequest(b: GastoBorrador) {
  return {
    idempotencyKey: b.idempotencyKey,
    monto: b.monto,
    categoriaId: b.categoriaId,
    descripcion: b.descripcion,
    medioPago: b.medioPago,
    fechaGasto: b.fechaGasto,
  };
}

export async function confirmarLote(borradores: GastoBorrador[]): Promise<Gasto[]> {
  if (USE_MOCKS) {
    await demora();
    return [];
  }
  return request<Gasto[]>('/api/gastos/lote', {
    method: 'POST',
    body: borradores.map(aGastoRequest),
  });
}

export async function crearGasto(borrador: GastoBorrador): Promise<Gasto | null> {
  if (USE_MOCKS) {
    await demora();
    return null;
  }

  if (borrador.medioPago === 'CREDITO' && borrador.cantidadCuotas > 1) {
    await request<unknown>('/api/compras', {
      method: 'POST',
      body: {
        idempotencyKey: borrador.idempotencyKey,
        montoTotal: borrador.monto,
        cantidadCuotas: borrador.cantidadCuotas,
        categoriaId: borrador.categoriaId,
        descripcion: borrador.descripcion,
        fechaCompra: borrador.fechaGasto,
      },
    });
    return null;
  }
  return request<Gasto>('/api/gastos', { method: 'POST', body: aGastoRequest(borrador) });
}

export async function editarGasto(id: string, borrador: GastoBorrador): Promise<Gasto | null> {
  if (USE_MOCKS) {
    await demora();
    return null;
  }
  return request<Gasto>(`/api/gastos/${id}`, { method: 'PUT', body: aGastoRequest(borrador) });
}

export async function eliminarGasto(id: string): Promise<void> {
  if (USE_MOCKS) {
    await demora();
    return;
  }
  await request<void>(`/api/gastos/${id}`, { method: 'DELETE' });
}
