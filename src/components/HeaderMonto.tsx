import React from 'react';
import { StyleSheet, View } from 'react-native';

import { useMoneda } from '../context/MonedaContext';
import { BotonMoneda } from './controls';
import { BigAmount, Eyebrow, Hello, RateLine } from './primitives';

/**
 * `.tophead` — encabezado de las pantallas de resumen: eyebrow + monto grande
 * a la izquierda, switch de moneda a la derecha.
 *
 * Si en vez de un monto se pasa `titulo`, se muestra un titulo (asi lo usa
 * la pantalla de Historico).
 */
export function HeaderMonto({
  eyebrow,
  monto,
  titulo,
}: {
  eyebrow: string;
  monto?: string;
  titulo?: string;
}) {
  const { enDolares, alternar, leyendaCotizacion } = useMoneda();

  return (
    <View style={s.head}>
      <View style={s.izq}>
        <Eyebrow>{eyebrow}</Eyebrow>
        {monto !== undefined ? (
          <BigAmount style={{ marginTop: 7 }}>{monto}</BigAmount>
        ) : null}
        {titulo !== undefined ? <Hello style={{ marginTop: 7 }}>{titulo}</Hello> : null}
        {/* RF-39 — al mostrar USD se indica la cotizacion usada y su hora */}
        {enDolares && leyendaCotizacion ? <RateLine>{leyendaCotizacion}</RateLine> : null}
      </View>
      <BotonMoneda enDolares={enDolares} onPress={alternar} />
    </View>
  );
}

const s = StyleSheet.create({
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 26,
    gap: 12,
  },
  izq: { flex: 1, minWidth: 0 },
});
