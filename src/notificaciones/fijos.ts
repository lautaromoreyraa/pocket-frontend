import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { FijoDelPeriodo } from '../types';
import { formatPesos } from '../utils/format';


export const DIAS_AVISO: number = 1;

export const HORA_AVISO: number = 10;
export const MINUTO_AVISO: number = 0;

const CANAL_ANDROID = 'fijos';

const MARCA = 'pocket:fijo-vence';

export const enExpoGo = Constants.appOwnership === 'expo';

type ModuloNotificaciones = typeof import('expo-notifications');

let modulo: ModuloNotificaciones | null | undefined;

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

export async function pedirPermisoNotificaciones(): Promise<boolean> {
  const N = cargarModulo();
  if (!N) return false;

  const { status, canAskAgain } = await N.getPermissionsAsync();
  if (status === 'granted') return true;
  if (!canAskAgain) return false;

  const pedido = await N.requestPermissionsAsync();
  return pedido.status === 'granted';
}

async function asegurarCanal(N: ModuloNotificaciones): Promise<void> {
  if (Platform.OS !== 'android') return;
  await N.setNotificationChannelAsync(CANAL_ANDROID, {
    name: 'Gastos fijos',
    importance: N.AndroidImportance.DEFAULT,
    sound: 'default',
  });
}

async function cancelarLosNuestros(N: ModuloNotificaciones): Promise<void> {
  const programadas = await N.getAllScheduledNotificationsAsync();
  await Promise.all(
    programadas
      .filter((n) => n.content.data?.tipo === MARCA)
      .map((n) => N.cancelScheduledNotificationAsync(n.identifier)),
  );
}

export function proximoAviso(dia: number, ahora: Date): Date {
  const armar = (anio: number, mes: number) => {
    const fecha = new Date(anio, mes, dia, HORA_AVISO, MINUTO_AVISO, 0, 0);
    fecha.setDate(fecha.getDate() - DIAS_AVISO);
    return fecha;
  };

  const esteMes = armar(ahora.getFullYear(), ahora.getMonth());
  return esteMes > ahora ? esteMes : armar(ahora.getFullYear(), ahora.getMonth() + 1);
}

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

export function agruparPorDia(items: FijoDelPeriodo[]): Map<number, FijoDelPeriodo[]> {
  const porDia = new Map<number, FijoDelPeriodo[]>();
  for (const item of items) {
    const delDia = porDia.get(item.fijo.diaDelMes) ?? [];
    delDia.push(item);
    porDia.set(item.fijo.diaDelMes, delDia);
  }
  return porDia;
}

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
