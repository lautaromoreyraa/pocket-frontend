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
import { getDeviceUuid, nuevaIdempotencyKey, request, setToken } from './client';
import { MOCK_DELAY, USE_MOCKS } from './config';
import { periodoActual, sumarMeses } from '../utils/format';

/**
 * Todas las llamadas al backend viven aca. Las pantallas importan de este
 * archivo y de ningun otro; asi el dia que USE_MOCKS pase a false no hay que
 * tocar ni una pantalla.
 *
 * Rutas segun docs/escenario.md, seccion 10.
 */

const demora = (ms = MOCK_DELAY) => new Promise((r) => setTimeout(r, ms));

/** POST /api/auth/dispositivo — RF-01, RF-02. Unico endpoint publico. */
export async function autenticarDispositivo(): Promise<void> {
  if (USE_MOCKS) {
    await demora(120);
    return;
  }
  const deviceUuid = await getDeviceUuid();
  const { token } = await request<{ token: string }>('/api/auth/dispositivo', {
    method: 'POST',
    body: { deviceUuid },
    publico: true,
  });
  await setToken(token);
}

/** GET /api/categorias — RF-34, lista fija de solo lectura */
export async function getCategorias(): Promise<Categoria[]> {
  if (USE_MOCKS) {
    await demora();
    return CATEGORIAS;
  }
  return request<Categoria[]>('/api/categorias');
}

/**
 * GET /api/resumen?periodo=&credito= — el unico endpoint que alimenta
 * Debito, Credito e Historico (seccion 4.3 del escenario).
 */
export async function getResumen(periodo: string, credito: boolean): Promise<ResumenMensual> {
  if (USE_MOCKS) {
    await demora();
    const base = credito ? MOCK_RESUMEN_CREDITO : MOCK_RESUMEN_DEBITO;
    // RF-33 — el balance solo existe si hay ingreso cargado, y sale de el.
    // Asi, cargar o borrar el ingreso se ve reflejado al toque en la pantalla.
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
              // RN-06 — capacidad de ahorro = ingresos - (debito + credito)
              capacidadAhorro: ingreso.monto - gastosTotales,
            }
          : null,
      // Los ultimos 3 salen de la misma lista que devuelve getGastos, para que
      // al tocar "Ver más movimientos" no aparezca un conjunto distinto.
      ultimosMovimientos: mockMovimientos(periodo, credito).slice(0, 3),
    };
  }
  return request<ResumenMensual>('/api/resumen', { query: { periodo, credito } });
}

/**
 * GET /api/gastos?periodo=&credito= — RF-12, la lista completa del periodo.
 * Alimenta la pantalla "Todos los movimientos", a la que se llega desde el
 * boton "Ver más movimientos" de Debito y Credito, y desde las filas Debito y
 * Credito del Historico.
 */
export async function getGastos(periodo: string, credito: boolean): Promise<Gasto[]> {
  if (USE_MOCKS) {
    await demora();
    return mockMovimientos(periodo, credito);
  }
  return request<Gasto[]>('/api/gastos', { query: { periodo, credito } });
}

/**
 * RF-45 — la pestana Historico. Mientras el backend no tenga un endpoint
 * propio, se arma con dos llamadas al mismo /api/resumen.
 */
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

/** Cuantos meses cerrados se ofrecen siempre en el selector, haya datos o no. */
const MESES_HISTORICO_MINIMOS = 6;

/**
 * Meses del selector del historico, del mas viejo al mas nuevo.
 *
 * El backend devuelve solo los meses cerrados **con datos**, que en una cuenta
 * nueva es una lista vacia. Eso dejaba la pantalla en blanco. Aca se completa
 * con los ultimos meses cerrados aunque no tengan nada: un mes en cero es una
 * respuesta legitima —"no gastaste"— y deja ver de que va la seccion desde el
 * primer dia.
 *
 * Se hace la union, no el reemplazo: si el usuario tiene datos mas viejos que
 * la ventana minima, esos meses tienen que seguir apareciendo.
 */
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

// ---------------------------------------------------------------------------
// Ingresos — RF-32, RF-33. Endpoints ya previstos en el escenario (seccion 10).
// ---------------------------------------------------------------------------

/**
 * GET /api/ingresos?periodo= — TODOS los ingresos del mes.
 *
 * Un periodo puede tener varios: sueldo, un alquiler que se cobra, un trabajo
 * suelto. El backend nunca hace upsert. `Balance.ingresos` del resumen ya viene
 * con la suma, asi que la capacidad de ahorro no necesita esta lista.
 */
export async function getIngresos(periodo: string): Promise<Ingreso[]> {
  if (USE_MOCKS) {
    await demora();
    const uno = mockGetIngreso(periodo);
    return uno ? [uno] : [];
  }
  return request<Ingreso[]>('/api/ingresos', { query: { periodo } });
}

/**
 * POST /api/ingresos — agrega un ingreso al periodo. Siempre crea uno nuevo,
 * nunca reemplaza: para modificar hay que borrar y volver a cargar.
 *
 * `periodo` viaja como "yyyy-MM"; mandar un dia es un 400.
 */
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

/** DELETE /api/ingresos/{id} — sin ningun ingreso desaparece la capacidad de ahorro (RF-33) */
export async function eliminarIngreso(id: string, periodo: string): Promise<void> {
  if (USE_MOCKS) {
    await demora();
    mockEliminarIngreso(periodo);
    return;
  }
  await request<void>(`/api/ingresos/${id}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Gastos fijos — implementados en el backend (migracion V4).
//
// NO esta en docs/escenario.md: es una extension posterior.
//
// Un gasto fijo es una PLANTILLA y no suma a ningun total por si misma. Cada
// mes se materializa como una fila de `gasto` con `origen = 'FIJO'`, igual que
// una compra financiada materializa sus cuotas (RF-22). El ruteo a pestana se
// deriva del medio de pago (RN-10) y si es CREDITO se imputa al mes siguiente
// (RN-03), como cualquier otro gasto.
//
// El TILDE de la pantalla es la existencia de ese gasto, no un estado aparte:
//   tildar     -> POST   /api/gastos-fijos/{id}/registrar   (lo crea)
//   destildar  -> DELETE /api/gastos/{gastoId}              (lo borra)
//   corregir   -> PUT    /api/gastos-fijos/{id}/registro    (solo el monto)
// Por eso suma al total del mes exactamente cuando esta tildado, sin ninguna
// regla extra del lado del cliente.
// ---------------------------------------------------------------------------

/** GET /api/gastos-fijos — todas las plantillas del usuario */
export async function getGastosFijos(): Promise<GastoFijo[]> {
  if (USE_MOCKS) {
    await demora();
    return mockGetFijos();
  }
  return request<GastoFijo[]>('/api/gastos-fijos');
}

/**
 * POST /api/gastos-fijos o PUT /api/gastos-fijos/{id}
 *
 * En el alta no viaja `activo`: crear una plantilla ya pausada no significa
 * nada, y el backend toma la ausencia del campo como activa. En la edicion si
 * viaja, que es donde pausar tiene sentido.
 */
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

/**
 * DELETE /api/gastos-fijos/{id}
 * Borra la plantilla. Los gastos ya generados en meses anteriores NO se tocan:
 * son historia y RF-44 dice que se conserva integra.
 */
export async function eliminarGastoFijo(id: string): Promise<void> {
  if (USE_MOCKS) {
    await demora();
    mockEliminarFijo(id);
    return;
  }
  await request<void>(`/api/gastos-fijos/${id}`, { method: 'DELETE' });
}

/**
 * GET /api/gastos-fijos/resumen?periodo= — la lista con el estado del mes.
 *
 * Antes tenia un catch del 404 que devolvia un resumen vacio, porque el backend
 * todavia no implementaba la feature. Se saco: ahora el endpoint existe, y
 * dejarlo taparia un 404 real haciendolo pasar por "no tenes fijos".
 */
export async function getResumenFijos(periodo: string): Promise<ResumenFijos> {
  if (USE_MOCKS) {
    await demora();
    return mockResumenFijos(periodo);
  }
  return request<ResumenFijos>('/api/gastos-fijos/resumen', { query: { periodo } });
}

/**
 * POST /api/gastos-fijos/{id}/registrar — tildar: materializa el fijo como un
 * `gasto` real del periodo. Lleva idempotencyKey igual que cualquier alta
 * (RF-46), asi un reintento no duplica el gasto.
 *
 * El monto viaja aparte del de la plantilla a proposito: los fijos son
 * variables. La plantilla dice cuanto esperabas, esto dice cuanto pagaste.
 */
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

/**
 * Destildar: borra el `gasto` que materializaba al fijo este mes.
 *
 * No hay endpoint propio porque no hace falta: el tilde ES el gasto, asi que
 * borrarlo es DELETE /api/gastos/{id}, el mismo camino por el que el usuario
 * puede borrarlo desde la pantalla de movimientos.
 */
export async function desregistrarGastoFijo(gastoId: string, periodo: string): Promise<void> {
  if (USE_MOCKS) {
    await demora();
    mockDesregistrarFijo(gastoId, periodo);
    return;
  }
  await request<void>(`/api/gastos/${gastoId}`, { method: 'DELETE' });
}

/**
 * PUT /api/gastos-fijos/{id}/registro?periodo= — corregir cuanto se pago este
 * mes, sin tocar el resto del gasto ni el monto de la plantilla.
 */
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

/** GET /api/cotizacion/blue — RF-38, con fallback a la ultima guardada (RF-40) */
export async function getCotizacion(): Promise<Cotizacion> {
  if (USE_MOCKS) {
    await demora(80);
    return MOCK_COTIZACION;
  }
  return request<Cotizacion>('/api/cotizacion/blue');
}

/**
 * POST /api/audio — RF-05. Procesa el audio y devuelve N gastos detectados
 * SIN persistir nada. El audio se descarta despues de procesarlo (RF-10).
 */
export async function procesarAudio(
  uri: string | null,
): Promise<{ gastos: GastoBorrador[]; transcripcion: string }> {
  if (USE_MOCKS) {
    await demora(1600);
    return { gastos: mockGastosDetectados(), transcripcion: 'Gaste 5.000 en facturas' };
  }

  if (!uri) throw new Error('No hay audio para procesar');

  // multipart/form-data. El objeto {uri, name, type} que se usaba antes era un
  // shim del bridge viejo de React Native: en 0.86 con la New Architecture lo
  // rechaza con "Unsupported FormDataPart implementation" y ni sale a la red.
  // La File de expo-file-system implementa Blob, asi que va directo y sin cast:
  // si algun dia deja de servir, lo dice el compilador y no el telefono.
  //
  // En web el grabador entrega WebM/Opus, un contenedor que Gemini no acepta, y
  // mandarselo igual no da error: da gastos inventados. Por eso ahi se convierte
  // a WAV antes de subir. Ver src/utils/audioWeb.ts.
  const form = new FormData();

  if (Platform.OS === 'web') {
    form.append('audio', await aWavMono16k(uri), 'gasto.wav');
  } else {
    form.append('audio', new File(uri), 'gasto.m4a');
  }

  // El backend devuelve un objeto, no un array. La transcripcion no es un
  // extra: es lo que el propio modelo dice haber escuchado, y contra lo que el
  // backend verifica cada monto antes de responder. Mostrarla es lo que le
  // permite al usuario darse cuenta de que la IA entendio otra cosa.
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
      // null en el backend significa "el audio no menciono cuotas", que no es
      // lo mismo que "una cuota", pero para el formulario 1 es el default.
      cantidadCuotas: d.cantidadCuotas ?? 1,
    })),
    transcripcion: resp.transcripcion,
  };
}

/** Lo que devuelve POST /api/audio por cada gasto detectado. */
interface GastoDetectado {
  idempotencyKey: string;
  monto: number;
  categoriaId: number;
  descripcion: string | null;
  medioPago: MedioPago;
  fechaGasto: string;
  cantidadCuotas: number | null;
}

/** Lo que espera el backend en un alta de gasto. */
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

/** POST /api/gastos/lote — RF-08, confirma los gastos detectados en un audio.
 *  El backend recibe el array pelado, sin envoltorio. */
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

/**
 * Alta de un gasto suelto. Rutea segun RF-19: si es credito con mas de una
 * cuota va a /api/compras, que materializa las N cuotas (RF-22); si no, a
 * /api/gastos.
 */
export async function crearGasto(borrador: GastoBorrador): Promise<Gasto | null> {
  if (USE_MOCKS) {
    await demora();
    return null;
  }

  if (borrador.medioPago === 'CREDITO' && borrador.cantidadCuotas > 1) {
    // /api/compras habla de una compra, no de un gasto: monto total y fecha de
    // compra, y devuelve la compra con sus N cuotas.
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

/** PUT /api/gastos/{id} — RF-12. La idempotencyKey del cuerpo se ignora al editar. */
export async function editarGasto(id: string, borrador: GastoBorrador): Promise<Gasto | null> {
  if (USE_MOCKS) {
    await demora();
    return null;
  }
  return request<Gasto>(`/api/gastos/${id}`, { method: 'PUT', body: aGastoRequest(borrador) });
}

/** DELETE /api/gastos/{id} — RF-13, la confirmacion la pide la UI */
export async function eliminarGasto(id: string): Promise<void> {
  if (USE_MOCKS) {
    await demora();
    return;
  }
  await request<void>(`/api/gastos/${id}`, { method: 'DELETE' });
}
