import { TextStyle } from 'react-native';

import { colors } from './colors';

/**
 * Las tres familias del mockup, las tres de Omnibus-Type (Buenos Aires).
 *   Chivo      -> montos y titulos
 *   Archivo    -> interfaz
 *   Chivo Mono -> datos y metadatos
 *
 * Los nombres son los que exportan los paquetes @expo-google-fonts/*
 * y son las claves con las que se cargan en App.tsx.
 */
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

/**
 * En CSS el `letter-spacing` va en `em` (relativo al tamano de fuente);
 * en React Native va en pixeles absolutos. Este helper hace la conversion
 * para poder copiar los valores del mockup tal cual.
 */
export const tracking = (fontSize: number, em: number) => fontSize * em;

/** Estilos de texto reutilizados en varias pantallas. */
export const type = {
  /** `.eyebrow` — mono chico en mayusculas, muy espaciado */
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: tracking(10.5, 0.13),
    textTransform: 'uppercase',
    color: colors.faint,
  } as TextStyle,

  /** `.hello` — saludo y titulos de pantalla */
  hello: {
    fontFamily: fonts.chivo,
    fontSize: 24,
    letterSpacing: tracking(24, -0.03),
    lineHeight: 24 * 1.28,
    color: colors.bone,
  } as TextStyle,

  /** `.big` — el monto grande del encabezado */
  big: {
    fontFamily: fonts.chivoLight,
    fontSize: 46,
    letterSpacing: tracking(46, -0.045),
    lineHeight: 46,
    color: colors.bone,
  } as TextStyle,

  /** `.lbl` — label de campo de formulario */
  label: {
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: tracking(9.5, 0.15),
    textTransform: 'uppercase',
    color: colors.faint,
  } as TextStyle,

  /** Texto de interfaz por defecto */
  body: {
    fontFamily: fonts.archivo,
    fontSize: 13.5,
    color: colors.bone,
  } as TextStyle,

  /** Metadato mono chico (`em` dentro de items y secciones) */
  meta: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: tracking(10.5, 0.04),
    color: colors.faint,
  } as TextStyle,
} as const;
