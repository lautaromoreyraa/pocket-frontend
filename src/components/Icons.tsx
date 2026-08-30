import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

import { colors } from '../theme';

/**
 * Los mismos SVG del mockup, uno por uno. Se mantienen los `path` tal cual
 * para que el trazo quede identico; solo cambia la sintaxis a react-native-svg.
 */

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const base = ({ size = 20, color = colors.bone, strokeWidth = 1.8 }: IconProps) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: color,
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

/** Microfono lleno: el boton grande de grabar */
export function IconMicFilled(props: IconProps) {
  return (
    <Svg {...base(props)}>
      <Path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <Path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
    </Svg>
  );
}

/** Microfono de la pestana Registrar */
export function IconMic(props: IconProps) {
  return (
    <Svg {...base(props)}>
      <Path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <Path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    </Svg>
  );
}

/** Tarjeta lisa: pestana Debito */
export function IconCard(props: IconProps) {
  return (
    <Svg {...base(props)}>
      <Rect x={2} y={5} width={20} height={14} rx={2} />
      <Path d="M2 10h20" />
    </Svg>
  );
}

/** Tarjeta con banda: pestana Credito */
export function IconCardCredit(props: IconProps) {
  return (
    <Svg {...base(props)}>
      <Rect x={2} y={5} width={20} height={14} rx={2} />
      <Path d="M2 10h20M6 15h4" />
    </Svg>
  );
}

/** Flechas de repeticion: pestana Fijos (lo que se repite todos los meses) */
export function IconRepeat(props: IconProps) {
  return (
    <Svg {...base(props)}>
      <Path d="M17 2l4 4-4 4" />
      <Path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <Path d="M7 22l-4-4 4-4" />
      <Path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </Svg>
  );
}

/** Tilde: un fijo ya registrado este mes */
export function IconCheck(props: IconProps) {
  return (
    <Svg {...base(props)}>
      <Path d="M20 6 9 17l-5-5" />
    </Svg>
  );
}

/** Mas: agregar un gasto fijo */
export function IconPlus(props: IconProps) {
  return (
    <Svg {...base(props)}>
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

/** Grafico de linea: pestana Historico */
export function IconChart(props: IconProps) {
  return (
    <Svg {...base(props)}>
      <Path d="M3 3v18h18" />
      <Path d="M7 15l4-5 3 3 5-7" />
    </Svg>
  );
}

/** Triangulo de alerta: gasto hormiga */
export function IconAlert(props: IconProps) {
  return (
    <Svg {...base({ strokeWidth: 2, ...props })}>
      <Path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </Svg>
  );
}

/** Lapiz: editar un gasto detectado */
export function IconPencil(props: IconProps) {
  return (
    <Svg {...base(props)}>
      <Path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </Svg>
  );
}

/** Cruz: cerrar un formulario */
export function IconClose(props: IconProps) {
  return (
    <Svg {...base(props)}>
      <Path d="M18 6 6 18M6 6l12 12" />
    </Svg>
  );
}

/** Cuadrado lleno: detener la grabacion */
export function IconStop({ size = 20, color = colors.accInk }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={6} y={6} width={12} height={12} rx={2} fill={color} />
    </Svg>
  );
}
