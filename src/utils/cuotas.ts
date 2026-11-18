import { periodoSiguiente, sumarMeses } from './format';

export interface PreviewCuotas {
  cantidad: number;
  montoCuota: number;
  montoUltimaCuota: number;
  primerPeriodo: string;
  ultimoPeriodo: string;
}

export function calcularCuotas(
  montoTotal: number,
  cantidad: number,
  periodoCompra: string,
): PreviewCuotas {
  const totalCentavos = Math.round(montoTotal * 100);
  const cuotaCentavos = Math.floor(totalCentavos / cantidad);
  const ultimaCentavos = totalCentavos - cuotaCentavos * (cantidad - 1);

  const primerPeriodo = periodoSiguiente(periodoCompra);

  return {
    cantidad,
    montoCuota: cuotaCentavos / 100,
    montoUltimaCuota: ultimaCentavos / 100,
    primerPeriodo,
    ultimoPeriodo: sumarMeses(primerPeriodo, cantidad - 1),
  };
}
