# Pocket — taxonomía del frontend

App mobile de finanzas personales con registro de gastos por voz. React Native
con Expo y TypeScript, sin librerías de UI: todo lo que se ve está escrito a
mano contra el mockup.

Este documento describe **cómo está organizado el código**: qué vive en cada
carpeta y cuál es el criterio que las separa.

---

## Mapa

```
App.tsx                 raíz: estado de la app y orquestación de sheets
index.ts                punto de entrada de Expo

src/
├── api/                todo lo que sale a la red
├── components/         piezas visuales reutilizables
├── context/            estado transversal a varias pantallas
├── data/               datos que no vienen del backend
├── notificaciones/     recordatorios locales del dispositivo
├── screens/            las cinco pantallas de la app
├── sheets/             formularios modales
├── theme/              color, tipografía y espaciado
├── types/              el contrato con el backend
└── utils/              transformaciones puras
```

Alrededor de 6.200 líneas de TypeScript en 34 archivos.

---

## `App.tsx` — la raíz

Concentra tres cosas y nada más: qué pestaña está activa, qué gastos están
pendientes de confirmar y qué formulario está abierto. Todo lo demás vive en las
pantallas.

Es también donde se cargan las tres tipografías y donde se retiene el splash
hasta que estén listas.

---

## `api/` — la única capa que habla con el backend

Dos archivos con responsabilidades distintas, y la separación importa:

| Archivo | Qué resuelve |
|---|---|
| `config.ts` | URL base, timeouts y el flag `USE_MOCKS` |
| `client.ts` | identidad del dispositivo, token, y el `request` genérico |
| `pocket.ts` | una función por endpoint, tipada |

`client.ts` es la plomería: `getDeviceUuid`, `getToken` / `setToken` /
`clearToken` sobre AsyncStorage, `nuevaIdempotencyKey` y el `request` que arma
headers, adjunta el `Bearer` y traduce errores HTTP.

`pocket.ts` (525 líneas, el archivo más grande del proyecto) expone **22
funciones**, una por operación del backend: desde `autenticarDispositivo` y
`getResumen` hasta `registrarGastoFijo`, `editarMontoDelMes` y `procesarAudio`.

Las pantallas importan de `pocket.ts` y nunca de `client.ts`. Ese es el límite:
ninguna pantalla sabe que existe un token.

---

## `types/` — el contrato

Un solo archivo con **17 tipos** que reflejan campo por campo lo que devuelve el
backend: `Gasto`, `ResumenMensual`, `TotalCategoria`, `AvisoHormiga`, `Balance`,
`CompraEnCurso`, `GastoFijo`, `FijoDelPeriodo`, `ResumenFijos`, `Cotizacion`,
`Ingreso`, `ResumenHistorico` y los dos union types `MedioPago` y `OrigenGasto`.

`GastoBorrador` y `BorradorAudio` son la excepción: existen solo del lado del
cliente, para lo que todavía no se confirmó.

---

## `screens/` — las cinco pantallas

| Pantalla | De qué se ocupa |
|---|---|
| `RegistrarScreen` | grabación por voz y carga manual |
| `ResumenScreen` | total del mes, gráfico por categoría y hormigas |
| `MovimientosScreen` | listado completo del período |
| `FijosScreen` | plantillas del mes y su estado de pago |
| `HistoricoScreen` | comparación contra meses anteriores |

`FijosScreen` es la más grande (454 líneas) porque cada fila tiene tres zonas
tocables distintas: el checkbox, el monto del mes y el nombre de la plantilla.

---

## `components/` vs `sheets/` — la distinción principal

**`components/`** es lo que se muestra. Se divide a su vez en dos archivos según
si el usuario puede tocarlo:

- `primitives.tsx` — solo lectura: `BigAmount`, `Section`, `StatRow`, `ItemRow`,
  `BarRow`, `Chip`, `Eyebrow`, `RateLine`, `FootNote`, `Hello`, `HelloDim`.
- `controls.tsx` — entrada: `Boton`, `MoneyInput`, `CampoTexto`, `ChipSelect`,
  `Label`, `BotonMoneda`, `BotonEliminar`, `Link`, `Hint`.

Más cuatro componentes con un rol propio: `Pantalla` (contenedor con los
márgenes y el safe area), `TabBar`, `HeaderMonto`, `AlertaHormiga` e `Icons`
(los íconos, dibujados con `react-native-svg`).

**`sheets/`** es lo que se abre por encima. `Sheet.tsx` es el contenedor
genérico; los otros cinco son formularios concretos: `GastoFormSheet`,
`GastoFijoSheet`, `IngresoSheet`, `MontoDelMesSheet` y `ConfirmacionAudioSheet`,
que es donde se revisan los gastos que detectó la IA antes de guardarlos.

`MontoDelMesSheet` y `GastoFijoSheet` están separados a propósito: uno edita lo
que se pagó **este mes**, el otro la plantilla de **todos los meses**.

---

## `theme/` — las constantes visuales

`colors.ts`, `typography.ts` y un `index.ts` que además exporta
`SCREEN_PADDING`. Ninguna pantalla define un color ni un tamaño de fuente por su
cuenta.

---

## `utils/` — funciones puras

| Archivo | Contenido |
|---|---|
| `format.ts` | 16 funciones de formato: pesos, dólares, fechas y períodos |
| `cuotas.ts` | `calcularCuotas`, el preview del reparto antes de confirmar |
| `audioWeb.ts` | conversión a WAV del audio grabado en el navegador |

`audioWeb.ts` existe por una razón concreta: en web, MediaRecorder entrega
WebM/Opus, un contenedor que la API de Gemini no acepta, y mandárselo igual no
produce un error sino gastos inventados. Convierte a PCM mono de 16 kHz con la
Web Audio API, sin dependencias.

---

## `data/` — lo que no viene del backend

- `categorias.ts` — la parte visual de cada categoría (ícono y color). El
  backend manda el catálogo; acá vive cómo se dibuja.
- `mock.ts` — 498 líneas de datos de ejemplo, los mismos números del mockup, que
  alimentan la app cuando `USE_MOCKS` está en `true`.

---

## `context/` y `notificaciones/`

`MonedaContext` es el único estado global: si los montos se muestran en pesos o
en dólares. Es transversal a todas las pantallas, por eso no vive en ninguna.

`notificaciones/fijos.ts` programa los recordatorios de vencimiento de los
gastos fijos. Son **locales del dispositivo**: no hay push tokens ni scheduler
en el backend. Se reprograman en cada carga de la pantalla y se agrupan por día
del mes, así varios fijos que vencen el mismo día son un solo aviso.
