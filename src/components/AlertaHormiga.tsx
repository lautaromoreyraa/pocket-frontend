import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AvisoHormiga } from '../types';
import { colors, fonts, radius } from '../theme';
import { IconAlert } from './Icons';

/**
 * `.alert` — RF-27: gasto hormiga detectado.
 * Se arma el texto con el monto ya formateado, que viene del contexto de
 * moneda, para que respete el switch ARS/USD (RF-37).
 */
export function AlertaHormiga({
  aviso,
  montoFormateado,
}: {
  aviso: AvisoHormiga;
  montoFormateado: string;
}) {
  return (
    <View style={s.alert}>
      <View style={s.titulo}>
        <IconAlert size={15} color={colors.warn} />
        <Text style={s.tituloTxt}>Gasto hormiga detectado</Text>
      </View>
      <Text style={s.cuerpo}>
        {aviso.categoriaNombre}, {aviso.ocurrencias} veces este mes. Van {montoFormateado}
        {aviso.porcentajeSobrePromedio !== null
          ? ` — casi un ${aviso.porcentajeSobrePromedio}% más que tu promedio.`
          : '.'}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  alert: {
    backgroundColor: colors.warnSoft,
    borderWidth: 1,
    borderColor: colors.warnLine,
    borderRadius: radius,
    paddingHorizontal: 17,
    paddingVertical: 15,
    marginBottom: 26,
  },
  titulo: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 5 },
  tituloTxt: { fontFamily: fonts.archivoSemi, fontSize: 13.5, color: colors.warn },
  cuerpo: {
    fontFamily: fonts.archivo,
    fontSize: 12.5,
    color: colors.dim,
    lineHeight: 12.5 * 1.55,
  },
});
