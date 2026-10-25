import { Platform } from 'react-native';

/**
 * Cloudflare Turnstile para el alta de dispositivos nuevos.
 *
 * El alta es anonima: sin esto, un script crea dispositivos en serie y cada
 * uno es un usuario mas en la base. El backend exige el token solo cuando el
 * dispositivo es nuevo.
 *
 * Solo corre en web. Turnstile necesita un navegador, y la app nativa no esta
 * publicada: corre contra la API local, que no tiene el secreto y no pide
 * token. Si algun dia se publica, el desafio tiene que ir en un WebView.
 *
 * La clave del sitio es publica por diseño (la ve cualquiera en el HTML del
 * widget); el secreto vive solo en el backend.
 */
const CLAVE_DEL_SITIO = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY;

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/**
 * Casi siempre se resuelve solo en un par de segundos. El margen es para cuando
 * Cloudflare duda y le pide a la persona que tilde la casilla.
 */
const ESPERA_MAXIMA = 60000;

interface Turnstile {
  render(contenedor: HTMLElement, opciones: Record<string, unknown>): string;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let cargando: Promise<Turnstile> | null = null;

function cargarScript(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (cargando) return cargando;

  cargando = new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT;
    script.async = true;
    script.onload = () =>
      window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile no cargo'));
    script.onerror = () => {
      // Sin esto, un bloqueador que corta el script dejaria la promesa
      // rechazada para siempre y no habria forma de reintentar.
      cargando = null;
      reject(new Error('No se pudo cargar Turnstile'));
    };
    document.head.appendChild(script);
  });
  return cargando;
}

/**
 * Resuelve el desafio y devuelve el token, de un solo uso y valido 5 minutos.
 * undefined si no corresponde (nativo, sin clave) o si no se pudo: en ese caso
 * el backend decide, y para un dispositivo nuevo va a responder 403.
 */
export async function obtenerTokenTurnstile(): Promise<string | undefined> {
  if (Platform.OS !== 'web' || !CLAVE_DEL_SITIO) return undefined;

  let turnstile: Turnstile;
  try {
    turnstile = await cargarScript();
  } catch {
    return undefined;
  }

  return new Promise<string | undefined>((resolve) => {
    // El widget es invisible salvo que Cloudflare pida interaccion: recien ahi
    // aparece la casilla, abajo y por encima de la app.
    const contenedor = document.createElement('div');
    Object.assign(contenedor.style, {
      position: 'fixed',
      bottom: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: '9999',
    });
    document.body.appendChild(contenedor);

    let widgetId: string | undefined;
    let terminado = false;
    const terminar = (token?: string) => {
      if (terminado) return;
      terminado = true;
      clearTimeout(timer);
      if (widgetId) turnstile.remove(widgetId);
      contenedor.remove();
      resolve(token);
    };
    const timer = setTimeout(() => terminar(undefined), ESPERA_MAXIMA);

    try {
      widgetId = turnstile.render(contenedor, {
        sitekey: CLAVE_DEL_SITIO,
        appearance: 'interaction-only',
        callback: (token: string) => terminar(token),
        'error-callback': () => terminar(undefined),
        'timeout-callback': () => terminar(undefined),
      });
    } catch {
      terminar(undefined);
    }
  });
}
