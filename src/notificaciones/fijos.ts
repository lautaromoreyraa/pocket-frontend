import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { FijoDelPeriodo } from '../types';
import { formatPesos } from '../utils/format';

/**
 * Recordatorios de vencimiento de los gastos fijos.
 *
 * Son notificaciones LOCALES del dispositivo, no push. No hay tokens, ni
 * scheduler en el backend, ni tabla nueva: la app es anonima por dispositivo y
 * montar infraestructura de push para un recordatorio de calendario seria
 * desproporcionado. Ademas una local funciona sin conexion, que es justo cuando
 * al usuario le sirve que le avisen.
 *
 * El precio es que hay que reprogramarlas desde la app: se hace en cada carga
 * de la pestana Fijos, que es lo bastante seguido, y se auto-corrige sola.
 *
 * ---
 *
 * EXPO GO: `expo-notifications` NO se puede ni importar.
 *
 * Desde SDK 53 el modulo llama a `addPushTokenListener` en su propio scope, y
 * en Expo Go sobre Android eso tira. No es que las notificaciones no anden: el
 * `import` solo rompe la app entera antes de que se ejecute una linea nuestra.
 *
 * Por eso el modulo se carga con `require()` diferido y detras de una guarda,
 * en vez de con un `import` arriba de todo. En Expo Go los avisos quedan
 * apagados y la app funciona; en un development build o en produccion andan.
 * Las funciones puras de este archivo (`proximoAviso`, `textoAviso`,
 * `agruparPorDia`) no tocan el modulo nativo y se pueden usar en cualquier lado.
 */

/** Cuantos dias antes del vencimiento avisar. 0 = el mismo dia. */
export const DIAS_AVISO: number = 1;

/** A que hora del dia se dispara el aviso. */
export const HORA_AVISO: number = 10;
export const MINUTO_AVISO: number = 0;

const CANAL_ANDROID = 'fijos';

/**
 * Las notificaciones que programa este modulo llevan esta marca en su `data`.
 *
 * Sirve para cancelar SOLO las nuestras en vez de llamar a
 * cancelAllScheduledNotificationsAsync, que se llevaria puesto cualquier otro
 * recordatorio que la app programe en el futuro.
 */
const MARCA = 'pocket:fijo-vence';

/**
 * `true` cuando la app corre dentro de Expo Go.
 *
 * `executionEnvironment` no sirve para esto: devuelve `storeClient` tanto en
 * Expo Go como en un development build, y en el development build las
 * notificaciones SI andan. `appOwnership === 'expo'` es lo unico que separa los
 * dos casos; esta deprecado, pero mientras no haya reemplazo es esto o nada.
 */
export const enExpoGo = Constants.appOwnership === 'expo';

/**
 * El tipo del modulo nativo.
 *
 * `typeof import(...)` es una anotacion de tipo: TypeScript la resuelve en
 * compilacion y NO emite ningun import en runtime. Asi el require diferido
 * queda igual de tipado que un import normal, que es lo que evita que "cargarlo
 * a mano" se convierta en programar contra un `any`.
 */
type ModuloNotificaciones = typeof import('expo-notifications');

/** undefined = todavia no se intento; null = no se puede en este entorno. */
let modulo: ModuloNotificaciones | null | undefined;

/**
 * Carga `expo-notifications` una sola vez, o devuelve null si no se puede.
 *
 * El try/catch no es paranoia decorativa: la guarda de Expo Go cubre el caso
 * conocido, pero el modulo tira DURANTE su evaluacion, asi que cualquier
 * entorno futuro que no lo soporte romperia la app entera en el require. Un
 * recordatorio no puede tener el poder de impedir que abras la app.
 */
function cargarModulo(): ModuloNotificaciones | null {
  if (modulo !== undefined) return modulo;

  if (enExpoGo) {
    console.log(
      '[fijos] Expo Go: los recordatorios quedan apagados (hace falta un development build)',
    );
    modulo = null;
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cargado: ModuloNotificaciones = require('expo-notifications');
    cargado.setNotificationHandler({
      // Se muestra igual con la app abierta: si estas mirando otra pestana, el
      // aviso de que manana vence el alquiler sigue siendo util.
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    modulo = cargado;
    return cargado;
  } catch (e) {
    console.warn('[fijos] no se pudo cargar expo-notifications, recordatorios apagados', e);
    modulo = null;
    return null;
  }
}

/** Pide el permiso una sola vez. Devuelve si quedo concedido. */
export async function pedirPermisoNotificaciones(): Promise<boolean> {
  const N = cargarModulo();
  if (!N) return false;

  const { status, canAskAgain } = await N.getPermissionsAsync();
  if (status === 'granted') return true;
  // Si el usuario ya dijo que no, no se le vuelve a preguntar: el sistema no
  // mostraria el dialogo igual y quedaria un await colgado por nada.
  if (!canAskAgain) return false;

  const pedido = await N.requestPermissionsAsync();
  return pedido.status === 'granted';
}

/** En Android toda notificacion necesita un canal o no suena. */
async function asegurarCanal(N: ModuloNotificaciones): Promise<void> {
  if (Platform.OS !== 'android') return;
  await N.setNotificationChannelAsync(CANAL_ANDROID, {
    name: 'Gastos fijos',
    importance: N.AndroidImportance.DEFAULT,
    sound: 'default',
  });
}

/** Cancela solo los recordatorios de fijos ya programados. */
async function cancelarLosNuestros(N: ModuloNotificaciones): Promise<void> {
  const programadas = await N.getAllScheduledNotificationsAsync();
  await Promise.all(
    programadas
      .filter((n) => n.content.data?.tipo === MARCA)
      .map((n) => N.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/**
 * Cuando avisar por un vencimiento del dia `dia`, a partir de `ahora`.
 *
 * Si la fecha de aviso de este mes ya paso, se programa la del mes que viene:
 * el fijo se repite, asi que siempre hay una proxima. Se usa un trigger de
 * fecha puntual y no uno mensual repetitivo porque Android no tiene trigger
 * mensual nativo; reprogramar en cada carga cubre el mismo caso y ademas se
 * adapta solo cuando el usuario cambia el dia del fijo.
 */
export function proximoAviso(dia: number, ahora: Date): Date {
  const armar = (anio: number, mes: number) => {
    const fecha = new Date(anio, mes, dia, HORA_AVISO, MINUTO_AVISO, 0, 0);
    fecha.setDate(fecha.getDate() - DIAS_AVISO);
    return fecha;
  };

  const esteMes = armar(ahora.getFullYear(), ahora.getMonth());
  return esteMes > ahora ? esteMes : armar(ahora.getFullYear(), ahora.getMonth() + 1);
}

/** El texto de un aviso. Uno solo por dia, aunque venzan varios fijos. */
export function textoAviso(pendientes: FijoDelPeriodo[]): { titulo: string; cuerpo: string } {
  const total = pendientes.reduce((acc, i) => acc + i.fijo.monto, 0);
  const cuando = DIAS_AVISO === 0 ? 'Hoy' : DIAS_AVISO === 1 ? 'Mañana' : `En ${DIAS_AVISO} días`;

  if (pendientes.length === 1) {
    return {
      titulo: `${cuando} vence ${pendientes[0].fijo.descripcion}`,
      cuerpo: formatPesos(total),
    };
  }
  return {
    titulo: `${cuando} vencen ${pendientes.length} fijos`,
    cuerpo: `${pendientes.map((i) => i.fijo.descripcion).join(', ')} · ${formatPesos(total)}`,
  };
}

/**
 * Agrupa por dia del mes. Es lo que evita que un usuario con cinco fijos el dia
 * 10 reciba cinco notificaciones a la misma hora: recibe una que las nombra.
 */
export function agruparPorDia(items: FijoDelPeriodo[]): Map<number, FijoDelPeriodo[]> {
  const porDia = new Map<number, FijoDelPeriodo[]>();
  for (const item of items) {
    const delDia = porDia.get(item.fijo.diaDelMes) ?? [];
    delDia.push(item);
    porDia.set(item.fijo.diaDelMes, delDia);
  }
  return porDia;
}

/**
 * Reprograma todos los recordatorios desde cero.
 *
 * Se avisa solo por los fijos ACTIVOS y TODAVIA NO PAGADOS: recordarte algo que
 * ya tildaste es la forma mas rapida de que apagues las notificaciones.
 *
 * Devuelve cuantas quedaron programadas; 0 si el entorno no las soporta.
 */
export async function reprogramarAvisos(items: FijoDelPeriodo[]): Promise<number> {
  const N = cargarModulo();
  if (!N) return 0;

  if (!(await pedirPermisoNotificaciones())) return 0;

  await asegurarCanal(N);
  await cancelarLosNuestros(N);

  const pendientes = items.filter((i) => i.fijo.activo && i.gastoId === null);
  const ahora = new Date();
  let programadas = 0;

  for (const [dia, delDia] of agruparPorDia(pendientes)) {
    const cuando = proximoAviso(dia, ahora);
    const { titulo, cuerpo } = textoAviso(delDia);

    await N.scheduleNotificationAsync({
      content: { title: titulo, body: cuerpo, data: { tipo: MARCA, dia } },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DATE,
        date: cuando,
        channelId: CANAL_ANDROID,
      },
    });
    programadas++;
  }

  return programadas;
}
