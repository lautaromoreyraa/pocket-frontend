import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getCotizacion } from '../api/pocket';
import { Cotizacion } from '../types';
import { formatCotizacion, formatDolares, formatPesos } from '../utils/format';

/**
 * RF-37 — el switch ARS/USD es global: afecta a todos los montos de la app,
 * no solo a los totales. Por eso vive en un contexto y no en cada pantalla.
 * RF-36: los gastos siempre estan en pesos, la conversion es solo de display.
 */
interface MonedaContextValue {
  enDolares: boolean;
  alternar: () => void;
  /** Formatea un monto en pesos segun la moneda activa */
  format: (montoEnPesos: number) => string;
  /** `BLUE 1.485 · 14:20`, o null si todavia no cargo (RF-39) */
  leyendaCotizacion: string | null;
  cotizacion: Cotizacion | null;
}

const MonedaContext = createContext<MonedaContextValue | null>(null);

export function MonedaProvider({ children }: { children: React.ReactNode }) {
  const [enDolares, setEnDolares] = useState(false);
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);

  useEffect(() => {
    let vigente = true;
    getCotizacion()
      .then((c) => {
        if (vigente) setCotizacion(c);
      })
      // RNF-04 — si falla la cotizacion la app sigue andando, solo que en pesos
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, []);

  const alternar = useCallback(() => {
    // Sin cotizacion no tiene sentido pasar a dolares
    setEnDolares((v) => (cotizacion ? !v : false));
  }, [cotizacion]);

  const value = useMemo<MonedaContextValue>(() => {
    const valor = cotizacion?.venta ?? null;
    return {
      enDolares: enDolares && valor !== null,
      alternar,
      format: (monto: number) =>
        enDolares && valor !== null ? formatDolares(monto, valor) : formatPesos(monto),
      leyendaCotizacion:
        cotizacion !== null
          ? formatCotizacion(cotizacion.venta, cotizacion.fechaActualizacion)
          : null,
      cotizacion,
    };
  }, [enDolares, cotizacion, alternar]);

  return <MonedaContext.Provider value={value}>{children}</MonedaContext.Provider>;
}

export function useMoneda(): MonedaContextValue {
  const ctx = useContext(MonedaContext);
  if (!ctx) throw new Error('useMoneda tiene que usarse dentro de <MonedaProvider>');
  return ctx;
}
