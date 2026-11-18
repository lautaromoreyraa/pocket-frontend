import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { getCotizacion } from '../api/pocket';
import { Cotizacion } from '../types';
import { formatCotizacion, formatDolares, formatPesos } from '../utils/format';

interface MonedaContextValue {
  enDolares: boolean;
  alternar: () => void;
  format: (montoEnPesos: number) => string;
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
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, []);

  const alternar = useCallback(() => {
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
