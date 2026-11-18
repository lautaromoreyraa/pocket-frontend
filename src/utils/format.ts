
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

export function agruparMiles(entero: string): string {
  return entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatPesos(monto: number): string {
  const redondeado = Math.round(monto);
  const signo = redondeado < 0 ? '-' : '';
  return `${signo}$ ${agruparMiles(String(Math.abs(redondeado)))}`;
}

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

export function formatCotizacion(valor: number, fechaISO: string): string {
  const d = new Date(fechaISO);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `BLUE ${agruparMiles(String(Math.round(valor)))} · ${hh}:${mm}`;
}

export function formatFechaCorta(fecha: Date): string {
  return `${DIAS_CORTOS[fecha.getDay()]} ${fecha.getDate()} ${MESES[fecha.getMonth()].slice(0, 3)}`;
}

export function saludo(fecha: Date = new Date()): string {
  const hora = fecha.getHours();
  if (hora >= 5 && hora < 12) return 'Buen día';
  if (hora >= 12 && hora < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

export function formatFechaLarga(fecha: Date): string {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return `${dias[fecha.getDay()]} ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}

export function formatFechaDiaMes(fechaISO: string): string {
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  const d = new Date(anio, mes - 1, dia);
  return `${DIAS_CORTOS[d.getDay()].toUpperCase()} ${dia} ${MESES_CORTOS[mes - 1]}`;
}

export function formatFechaHoraMeta(fechaISO: string): string {
  const d = new Date(fechaISO);
  const dia = DIAS_CORTOS[d.getDay()].toUpperCase();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${dia} ${hh}:${mm}`;
}

export function periodoActual(hoy: Date = new Date()): string {
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

export function hoyISO(hoy: Date = new Date()): string {
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

export function periodoSiguiente(periodo: string): string {
  const [anio, mes] = periodo.split('-').map(Number);
  return mes === 12
    ? `${anio + 1}-01`
    : `${anio}-${String(mes + 1).padStart(2, '0')}`;
}

export function sumarMeses(periodo: string, n: number): string {
  const [anio, mes] = periodo.split('-').map(Number);
  const total = (anio * 12 + (mes - 1)) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

export function nombreMes(periodo: string): string {
  const mes = Number(periodo.split('-')[1]);
  return MESES[mes - 1];
}

export function nombreMesAnio(periodo: string): string {
  const [anio, mes] = periodo.split('-');
  const nombre = MESES[Number(mes) - 1];
  return `${nombre[0].toUpperCase()}${nombre.slice(1)} ${anio}`;
}

export function mesCorto(periodo: string): string {
  return MESES_CORTOS[Number(periodo.split('-')[1]) - 1];
}

export function nombreMesUpper(periodo: string): string {
  return nombreMes(periodo).toUpperCase();
}
