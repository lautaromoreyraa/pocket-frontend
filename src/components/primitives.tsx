import React from 'react';
import { Pressable, StyleSheet, Text, TextProps, View, ViewProps } from 'react-native';

import { colors, fonts, tracking, type } from '../theme';


export function Eyebrow({ children, style, ...rest }: TextProps) {
  return (
    <Text {...rest} style={[type.eyebrow, style]}>
      {children}
    </Text>
  );
}

export function Hello({ children, style, ...rest }: TextProps) {
  return (
    <Text {...rest} style={[type.hello, style]}>
      {children}
    </Text>
  );
}

export function HelloDim({ children }: { children: React.ReactNode }) {
  return <Text style={{ color: colors.dim }}>{children}</Text>;
}

export function BigAmount({ children, style, ...rest }: TextProps) {
  return (
    <Text {...rest} style={[type.big, style]} numberOfLines={1} adjustsFontSizeToFit>
      {children}
    </Text>
  );
}

export function RateLine({ children }: { children: React.ReactNode }) {
  return <Text style={s.rate}>{children}</Text>;
}

export function Section({
  titulo,
  meta,
  children,
  style,
}: {
  titulo: string;
  meta?: string;
  children: React.ReactNode;
} & Pick<ViewProps, 'style'>) {
  return (
    <View style={[s.sect, style]}>
      <View style={s.sectHd}>
        <Text style={s.sectTitulo}>{titulo}</Text>
        {meta ? <Text style={type.meta}>{meta}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export function StatRow({
  etiqueta,
  valor,
  positivo = false,
  ultima = false,
  onPress,
}: {
  etiqueta: string;
  valor: string;
  positivo?: boolean;
  ultima?: boolean;
  onPress?: () => void;
}) {
  const contenido = (
    <>
      <View style={s.statIzq}>
        <Text style={s.statEtiqueta}>{etiqueta}</Text>
        {onPress ? <Text style={s.chevron}>›</Text> : null}
      </View>
      <Text style={[s.statValor, positivo && { color: colors.acc }]}>{valor}</Text>
    </>
  );

  if (!onPress) {
    return <View style={[s.stat, ultima && s.sinBorde]}>{contenido}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={`Ver los movimientos de ${etiqueta.toLowerCase()}`}
      onPress={onPress}
      style={({ pressed }) => [s.stat, ultima && s.sinBorde, pressed && { opacity: 0.6 }]}
    >
      {contenido}
    </Pressable>
  );
}

export function ItemRow({
  titulo,
  meta,
  monto,
  destacado = false,
  ultima = false,
}: {
  titulo: string;
  meta: string;
  monto: string;
  destacado?: boolean;
  ultima?: boolean;
}) {
  return (
    <View style={[s.item, ultima && s.sinBorde]}>
      <View style={s.itemTxt}>
        <Text style={s.itemTitulo} numberOfLines={1}>
          {titulo}
        </Text>
        <Text style={[type.meta, destacado && { color: colors.warn }]} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <Text style={s.itemMonto}>{monto}</Text>
    </View>
  );
}

export function BarRow({
  etiqueta,
  ocurrencias,
  monto,
  proporcion,
  hormiga = false,
}: {
  etiqueta: string;
  ocurrencias?: number;
  monto: string;
  proporcion: number;
  hormiga?: boolean;
}) {
  const ancho = `${Math.max(2, Math.min(100, proporcion * 100))}%` as const;
  return (
    <View style={s.barRow}>
      <View style={s.barTop}>
        <View style={s.barLeft}>
          <Text style={s.barEtiqueta}>{etiqueta}</Text>
          {ocurrencias !== undefined ? (
            <Text style={[s.barCnt, hormiga && { color: colors.warn }]}>×{ocurrencias}</Text>
          ) : null}
        </View>
        <Text style={s.barMonto}>{monto}</Text>
      </View>
      <View style={s.track}>
        <View style={[s.fill, { width: ancho }, hormiga && { backgroundColor: colors.warn }]} />
      </View>
    </View>
  );
}

export function FootNote({
  children,
  calmo = false,
}: {
  children: React.ReactNode;
  calmo?: boolean;
}) {
  return (
    <View style={[s.foot, calmo && { borderLeftColor: colors.fill }]}>
      <Text style={s.footTxt}>{children}</Text>
    </View>
  );
}

export function Chip({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.chip}>
      <Text style={s.chipTxt}>{children}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  rate: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: tracking(10.5, 0.04),
    color: colors.faint,
    marginTop: 10,
  },

  sect: { marginBottom: 30 },
  sectHd: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 9,
    marginBottom: 15,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.line,
  },
  sectTitulo: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: tracking(10.5, 0.13),
    textTransform: 'uppercase',
    color: colors.faint,
  },

  stat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.line,
  },
  statIzq: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statEtiqueta: { fontFamily: fonts.archivo, fontSize: 13.5, color: colors.dim },
  chevron: { fontFamily: fonts.archivo, fontSize: 17, color: colors.faint, lineHeight: 19 },
  statValor: {
    fontFamily: fonts.chivo,
    fontSize: 19,
    letterSpacing: tracking(19, -0.03),
    color: colors.bone,
  },
  sinBorde: { borderBottomWidth: 0 },

  item: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.line,
  },
  itemTxt: { flex: 1, minWidth: 0 },
  itemTitulo: {
    fontFamily: fonts.archivoMedium,
    fontSize: 14,
    color: colors.bone,
    marginBottom: 3,
  },
  itemMonto: {
    fontFamily: fonts.chivo,
    fontSize: 16,
    letterSpacing: tracking(16, -0.03),
    color: colors.bone,
  },

  barRow: { marginBottom: 14 },
  barTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 7,
  },
  barLeft: { flexDirection: 'row', alignItems: 'flex-end', gap: 7, flex: 1, minWidth: 0 },
  barEtiqueta: { fontFamily: fonts.archivo, fontSize: 13.5, color: colors.bone },
  barCnt: { fontFamily: fonts.mono, fontSize: 10.5, color: colors.faint },
  barMonto: {
    fontFamily: fonts.chivo,
    fontSize: 13.5,
    color: colors.dim,
  },
  track: { height: 4, backgroundColor: colors.raise2, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.fill, borderRadius: 2 },

  foot: {
    marginTop: 16,
    paddingLeft: 11,
    borderLeftWidth: 2,
    borderLeftColor: colors.warn,
  },
  footTxt: {
    fontFamily: fonts.archivo,
    fontSize: 12.5,
    color: colors.dim,
    lineHeight: 12.5 * 1.6,
  },

  chip: {
    backgroundColor: colors.chipBg,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipTxt: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: tracking(10, 0.05),
    color: colors.dim,
  },
});
