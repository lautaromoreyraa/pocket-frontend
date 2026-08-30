import { periodoSiguiente, sumarMeses } from './format';

/**
 * Previsualizacion de cuotas para el formulario (RF-26).
 *
 * Replica RN-04 exactamente: valor de cuota = total / n redondeando hacia
 * abajo a 2 decimales, y la ultima cuota absorbe la diferencia. La cuenta se
 * hace en centavos enteros para no arrastrar error de punto flotante (RNF-07).
 *
 * Ojo: esto es solo para mostrar. La fuente de verdad es
 * CalculadoraCuotasServiceImpl en el backend; el alta real siempre manda el
 * monto total y la cantidad de cuotas, nunca los valores ya divididos.
 */
export interface PreviewCuotas {
  cantidad: number;
  /** valor de las primeras n-1 cuotas */
  montoCuota: number;
  /** valor de la ultima cuota, que absorbe el resto */
  montoUltimaCuota: number;
  /** periodo `yyyy-MM` de la primera cuota */
  primerPeriodo: string;
  /** periodo `yyyy-MM` de la ultima cuota */
  ultimoPeriodo: string;
}

export function calcularCuotas(
  montoTotal: number,
  cantidad: number,
  periodoCompra: string,
): PreviewCuotas {
  const totalCentavos = Math.round(montoTotal * 100);
  // RoundingMode.DOWN a 2 decimales
  const cuotaCentavos = Math.floor(totalCentavos / cantidad);
  const ultimaCentavos = totalCentavos - cuotaCentavos * (cantidad - 1);

  // RN-03: la primera cuota cae en el mes siguiente al de la compra
  const primerPeriodo = periodoSiguiente(periodoCompra);

  return {
    cantidad,
    montoCuota: cuotaCentavos / 100,
    montoUltimaCuota: ultimaCentavos / 100,
    primerPeriodo,
    ultimoPeriodo: sumarMeses(primerPeriodo, cantidad - 1),
  };
}
