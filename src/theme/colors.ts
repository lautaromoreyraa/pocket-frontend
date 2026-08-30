/**
 * Paleta del mockup (docs/mockup.html, bloque `:root`).
 * Variante elegida: pistacho. Modo oscuro con base calida, nunca negro puro.
 */
export const colors = {
  /** Fondo principal de la app */
  ink: '#15130F',
  /** Superficie elevada: inputs, bottom sheet */
  raise: '#1D1A15',
  /** Superficie elevada 2: fondo de las barras de progreso */
  raise2: '#252119',
  /** Bordes y separadores */
  line: '#302A21',
  /** Texto principal */
  bone: '#EDE8DC',
  /** Texto secundario */
  dim: '#8F887A',
  /** Texto terciario: metadatos, labels */
  faint: '#665F52',
  /** Acento pistacho */
  acc: '#A8BE7B',
  /** Fondo tenue del acento (chips y botones activos) */
  accSoft: 'rgba(168,190,123,0.12)',
  /** Borde del acento */
  accLine: 'rgba(168,190,123,0.32)',
  /** Texto sobre fondo acento */
  accInk: '#141A0C',
  /** Alerta: gasto hormiga, eliminar */
  warn: '#C4675A',
  /** Fondo tenue de la alerta */
  warnSoft: 'rgba(196,103,90,0.09)',
  /** Borde de la alerta */
  warnLine: 'rgba(196,103,90,0.3)',
  /** Relleno neutro de las barras por categoria */
  fill: '#4A443A',
  /** Fondo de los chips de lectura */
  chipBg: 'rgba(237,232,220,0.06)',
  /** Velo detras del bottom sheet */
  scrim: 'rgba(6,5,4,0.74)',
} as const;

/** Radio de esquina estandar (`--r` en el mockup) */
export const radius = 14;
