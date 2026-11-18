import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { API_BASE_URL, REQUEST_TIMEOUT } from './config';

const KEY_DEVICE_UUID = 'pocket.deviceUuid';
const KEY_TOKEN = 'pocket.jwt';

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

export async function getDeviceUuid(): Promise<string> {
  const guardado = await AsyncStorage.getItem(KEY_DEVICE_UUID);
  if (guardado) return guardado;

  const nuevo = Crypto.randomUUID();
  await AsyncStorage.setItem(KEY_DEVICE_UUID, nuevo);
  return nuevo;
}

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
  publico?: boolean;
  query?: Record<string, string | number | boolean | undefined>;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, publico = false, query } = options;

  const params = Object.entries(query ?? {})
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  const url = `${API_BASE_URL}${path}${params ? `?${params}` : ''}`;

  const esFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined && !esFormData) headers['Content-Type'] = 'application/json';

  if (!publico) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

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
