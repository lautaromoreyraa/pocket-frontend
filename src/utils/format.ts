/** Formateo de plata, fechas y periodos. Todo en es-AR. */

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const MESES_CORTOS = [
  'ENE',
  'FEB',
  'MAR',
  'ABR',
  'MAY',
  'JUN',
  'JUL',
  'AGO',
  'SEP',
  'OCT',
  'NOV',
  'DIC',
];

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/**
 * Separador de miles con punto, como en es-AR.
 * No usamos Intl.NumberFormat porque en Android con Hermes el soporte de
 * locales viene recortado y "es-AR" cae en el formato de en-US.
 */
export function agruparMiles(entero: string): string {
  return entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** `$ 284.350` */
export function formatPesos(monto: number): string {
  const redondeado = Math.round(monto);
  const signo = redondeado < 0 ? '-' : '';
  return `${signo}$ ${agruparMiles(String(Math.abs(redondeado)))}`;
}

/**
 * `US$ 191` — RF-36: la conversion es solo de display.
 * Los decimales se ajustan al orden de magnitud, igual que en el mockup.
 */
export function formatDolares(monto: number, cotizacion: number): string {
  const usd = monto / cotizacion;
  const abs = Math.abs(usd);
  const decimales = abs < 10 ? 2 : abs < 100 ? 1 : 0;
  const fijo = usd.toFixed(decimales);
  const [entero, dec] = fijo.split('.');
  const signo = entero.startsWith('-') ? '-' : '';
  const enteroLimpio = entero.replace('-', '');
  const agrupado = agruparMiles(enteroLimpio);
  return `${signo}US$ ${dec ? `${agrupado},${dec}` : agrupado}`;
}

/** `BLUE 1.485 · 14:20` — RF-39: al mostrar USD se indica la cotizacion y su hora */
export function formatCotizacion(valor: number, fechaISO: string): string {
  const d = new Date(fechaISO);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `BLUE ${agruparMiles(String(Math.round(valor)))} · ${hh}:${mm}`;
}

/** `Sáb 25 jul` — el eyebrow de la pantalla de registro */
export function formatFechaCorta(fecha: Date): string {
  return `${DIAS_CORTOS[fecha.getDay()]} ${fecha.getDate()} ${MESES[fecha.getMonth()].slice(0, 3)}`;
}

/**
 * `Buen día` / `Buenas tardes` / `Buenas noches` — el saludo de la pantalla
 * de registro.
 *
 * No lleva nombre: la identificacion es anonima por dispositivo y la app nunca
 * pregunta como se llama nadie. La hora es lo unico que efectivamente sabemos
 * de quien esta del otro lado.
 *
 * El corte de la manana va a las 5 y no a las 0: a las tres de la mañana
 * todavia es "buenas noches" para cualquiera que este despierto.
 */
export function saludo(fecha: Date = new Date()): string {
  const hora = fecha.getHours();
  if (hora >= 5 && hora < 12) return 'Buen día';
  if (hora >= 12 && hora < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

/** `Sábado 25 de julio` — subtitulo del formulario manual */
export function formatFechaLarga(fecha: Date): string {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return `${dias[fecha.getDay()]} ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}

/**
 * `MAR 12 AGO` — encabezado de dia en la lista de movimientos.
 * Recibe una fecha ISO `yyyy-MM-dd` y la parsea a mano: `new Date('2026-08-12')`
 * la interpreta como UTC y en Argentina eso corre el dia para atras.
 */
export function formatFechaDiaMes(fechaISO: string): string {
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  const d = new Date(anio, mes - 1, dia);
  return `${DIAS_CORTOS[d.getDay()].toUpperCase()} ${dia} ${MESES_CORTOS[mes - 1]}`;
}

/** `JUE 19:42` — metadato del borrador offline */
export function formatFechaHoraMeta(fechaISO: string): string {
  const d = new Date(fechaISO);
  const dia = DIAS_CORTOS[d.getDay()].toUpperCase();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${dia} ${hh}:${mm}`;
}

/** Periodo actual del telefono, formato `yyyy-MM` (RF-43) */
export function periodoActual(hoy: Date = new Date()): string {
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Hoy en `yyyy-MM-dd`, hora local del telefono.
 *
 * No sirve `toISOString().slice(0, 10)`: eso convierte a UTC, y en Argentina
 * (UTC-3) cualquier gasto cargado despues de las 21:00 saldria con la fecha de
 * manana, que el backend rechaza por futura (@PastOrPresent).
 */
export function hoyISO(hoy: Date = new Date()): string {
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

/** `2026-08` -> `2026-09`. RN-03: el credito se imputa al mes siguiente. */
export function periodoSiguiente(periodo: string): string {
  const [anio, mes] = periodo.split('-').map(Number);
  return mes === 12
    ? `${anio + 1}-01`
    : `${anio}-${String(mes + 1).padStart(2, '0')}`;
}

/** Suma `n` meses a un periodo `yyyy-MM` */
export function sumarMeses(periodo: string, n: number): string {
  const [anio, mes] = periodo.split('-').map(Number);
  const total = (anio * 12 + (mes - 1)) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

/** `2026-07` -> `julio` */
export function nombreMes(periodo: string): string {
  const mes = Number(periodo.split('-')[1]);
  return MESES[mes - 1];
}

/** `2026-07` -> `Julio 2026` */
export function nombreMesAnio(periodo: string): string {
  const [anio, mes] = periodo.split('-');
  const nombre = MESES[Number(mes) - 1];
  return `${nombre[0].toUpperCase()}${nombre.slice(1)} ${anio}`;
}

/** `2026-07` -> `JUL` — los botones del selector de meses */
export function mesCorto(periodo: string): string {
  return MESES_CORTOS[Number(periodo.split('-')[1]) - 1];
}

/** `2026-07` -> `JULIO` — usado dentro de los hints en mayusculas */
export function nombreMesUpper(periodo: string): string {
  return nombreMes(periodo).toUpperCase();
}
