import { Platform } from 'react-native';

const CLAVE_DEL_SITIO = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY;

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

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
      cargando = null;
      reject(new Error('No se pudo cargar Turnstile'));
    };
    document.head.appendChild(script);
  });
  return cargando;
}

export async function obtenerTokenTurnstile(): Promise<string | undefined> {
  if (Platform.OS !== 'web' || !CLAVE_DEL_SITIO) return undefined;

  let turnstile: Turnstile;
  try {
    turnstile = await cargarScript();
  } catch {
    return undefined;
  }

  return new Promise<string | undefined>((resolve) => {
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
