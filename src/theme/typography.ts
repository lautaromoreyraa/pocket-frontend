import { TextStyle } from 'react-native';

import { colors } from './colors';

export const fonts = {
  chivoLight: 'Chivo_300Light',
  chivo: 'Chivo_400Regular',
  chivoMedium: 'Chivo_500Medium',

  archivo: 'Archivo_400Regular',
  archivoMedium: 'Archivo_500Medium',
  archivoSemi: 'Archivo_600SemiBold',

  mono: 'ChivoMono_400Regular',
  monoMedium: 'ChivoMono_500Medium',
} as const;

export const tracking = (fontSize: number, em: number) => fontSize * em;

export const type = {
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: tracking(10.5, 0.13),
    textTransform: 'uppercase',
    color: colors.faint,
  } as TextStyle,

  hello: {
    fontFamily: fonts.chivo,
    fontSize: 24,
    letterSpacing: tracking(24, -0.03),
    lineHeight: 24 * 1.28,
    color: colors.bone,
  } as TextStyle,

  big: {
    fontFamily: fonts.chivoLight,
    fontSize: 46,
    letterSpacing: tracking(46, -0.045),
    lineHeight: 46,
    color: colors.bone,
  } as TextStyle,

  label: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: tracking(9.5, 0.15),
    textTransform: 'uppercase',
    color: colors.faint,
  } as TextStyle,

  body: {
    fontFamily: fonts.archivo,
    fontSize: 13.5,
    color: colors.bone,
  } as TextStyle,

  meta: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: tracking(10.5, 0.04),
    color: colors.faint,
  } as TextStyle,
} as const;
