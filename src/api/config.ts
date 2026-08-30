/**
 * Configuracion de la conexion al backend.
 *
 * Mientras el backend Spring no este levantado, `USE_MOCKS` en true hace que
 * toda la app funcione contra los datos de src/data/mock.ts, que son los
 * mismos numeros del mockup. Cuando el backend responda, se pone en false y
 * no hay que tocar ninguna pantalla: las pantallas hablan solo con
 * src/api/pocket.ts.
 */
export const USE_MOCKS = false;

/**
 * URL base de la API.
 *
 * En el build desplegado la define EXPO_PUBLIC_API_URL, que Expo inserta en el
 * bundle al compilar (el prefijo EXPO_PUBLIC_ es lo que la hace visible al
 * cliente; sin el, queda undefined en runtime). No pongas ahi ningun secreto:
 * todo lo que lleve ese prefijo viaja al navegador de cualquiera.
 *
 * El valor de abajo es el de desarrollo. Para probar en el celular con Expo Go,
 * `localhost` apunta al celular y no a tu PC: va la IP de tu maquina en la red
 * WiFi, la misma que muestra Expo en el QR. En el emulador de Android la PC es
 * http://10.0.2.2:8080.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.1.5:8080';

/**
 * Timeout de cada request, en ms.
 *
 * Ojo con bajarlo: POST /api/audio tarda entre 9s y 30s segun lo que demore
 * Gemini, y la varianza la pone el proveedor. El backend espera hasta 90s.
 */
export const REQUEST_TIMEOUT = 45000;

/** Demora artificial de los mocks, para ver los estados de carga */
export const MOCK_DELAY = 350;
