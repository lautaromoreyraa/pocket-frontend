import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { API_BASE_URL, REQUEST_TIMEOUT } from './config';

const KEY_DEVICE_UUID = 'pocket.deviceUuid';
const KEY_TOKEN = 'pocket.jwt';

/** Error de red o del backend, ya normalizado para mostrar en pantalla. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly esDeRed: boolean,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * RF-01 — UUID de dispositivo, generado una sola vez en la primera apertura
 * y guardado en el almacenamiento local.
 */
export async function getDeviceUuid(): Promise<string> {
  const guardado = await AsyncStorage.getItem(KEY_DEVICE_UUID);
  if (guardado) return guardado;

  const nuevo = Crypto.randomUUID();
  await AsyncStorage.setItem(KEY_DEVICE_UUID, nuevo);
  return nuevo;
}

/** RF-46 — clave de idempotencia por alta, generada por el cliente */
export function nuevaIdempotencyKey(): string {
  return Crypto.randomUUID();
}

let tokenEnMemoria: string | null = null;

export async function getToken(): Promise<string | null> {
  if (tokenEnMemoria) return tokenEnMemoria;
  tokenEnMemoria = await AsyncStorage.getItem(KEY_TOKEN);
  return tokenEnMemoria;
}

export async function setToken(token: string): Promise<void> {
  tokenEnMemoria = token;
  await AsyncStorage.setItem(KEY_TOKEN, token);
}

export async function clearToken(): Promise<void> {
  tokenEnMemoria = null;
  await AsyncStorage.removeItem(KEY_TOKEN);
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /** true solo para POST /api/auth/dispositivo, el unico endpoint publico */
  publico?: boolean;
  /** query params; los undefined se descartan */
  query?: Record<string, string | number | boolean | undefined>;
}

/**
 * Wrapper de fetch: arma la URL, agrega el JWT, parsea el JSON y normaliza
 * los errores. Es el unico lugar de la app que conoce `fetch`.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, publico = false, query } = options;

  // Armamos el querystring a mano: el polyfill de URLSearchParams de React
  // Native es incompleto y se comporta distinto en iOS, Android y web.
  const params = Object.entries(query ?? {})
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  const url = `${API_BASE_URL}${path}${params ? `?${params}` : ''}`;

  // El audio va como multipart: en ese caso no seteamos Content-Type, lo pone
  // fetch con el boundary correcto, y el body viaja sin serializar.
  const esFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined && !esFormData) headers['Content-Type'] = 'application/json';

  if (!publico) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  // React Native no soporta AbortSignal.timeout, hay que armar el controller a mano
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  let respuesta: Response;
  const inicio = Date.now();
  try {
    respuesta = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : esFormData ? (body as FormData) : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    // El motivo real importa: "Network request failed" (no llego), "Aborted"
    // (se paso del timeout) y un fallo al leer el archivo del multipart son
    // tres problemas distintos, y los tres se veian como "no hay conexion".
    const causa = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    const abortado = controller.signal.aborted;
    console.log(
      `[pocket] fetch fallo tras ${Date.now() - inicio}ms | ${method} ${url} | ` +
        `abortado=${abortado} | ${causa}`,
    );
    throw new ApiError(
      abortado ? `El servidor tardó más de ${REQUEST_TIMEOUT / 1000}s` : `Sin conexión (${causa})`,
      null,
      true,
    );
  } finally {
    clearTimeout(timer);
  }

  if (respuesta.status === 204) return undefined as T;

  const texto = await respuesta.text();
  const datos = texto ? JSON.parse(texto) : null;

  if (!respuesta.ok) {
    const mensaje =
      (datos && typeof datos === 'object' && 'mensaje' in datos && String(datos.mensaje)) ||
      `Error ${respuesta.status}`;
    throw new ApiError(mensaje, respuesta.status, false);
  }

  return datos as T;
}
