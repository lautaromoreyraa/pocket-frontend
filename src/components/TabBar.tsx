import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, tracking } from '../theme';
import { IconCard, IconCardCredit, IconChart, IconMic, IconRepeat } from './Icons';

/**
 * Las secciones de la app. Las cuatro primeras son las de la seccion 4.3 del
 * escenario; "Fijos" es una extension posterior y va entre Credito e Historico.
 */
export type Tab = 'registrar' | 'debito' | 'credito' | 'fijos' | 'historico';

const TABS: { id: Tab; titulo: string; Icono: typeof IconMic }[] = [
  { id: 'registrar', titulo: 'Registrar', Icono: IconMic },
  { id: 'debito', titulo: 'Débito', Icono: IconCard },
  { id: 'credito', titulo: 'Crédito', Icono: IconCardCredit },
  { id: 'fijos', titulo: 'Fijos', Icono: IconRepeat },
  { id: 'historico', titulo: 'Histórico', Icono: IconChart },
];

/**
 * `.tabs` — barra inferior. Es estado local en App.tsx, sin libreria de
 * navegacion: la app no tiene stacks ni deep links, cuatro paneles alcanzan.
 */
export function TabBar({ activa, onChange }: { activa: Tab; onChange: (t: Tab) => void }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.tabs, { paddingBottom: 14 + insets.bottom }]}>
      {TABS.map(({ id, titulo, Icono }) => {
        const on = id === activa;
        return (
          <Pressable
            key={id}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={titulo}
            onPress={() => onChange(id)}
            style={({ pressed }) => [s.tab, pressed && { opacity: 0.7 }]}
          >
            <Icono size={19} color={on ? colors.acc : colors.faint} />
            <Text
              style={[s.txt, on && { color: colors.acc }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {titulo}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    paddingTop: 9,
    paddingHorizontal: 8,
    gap: 2,
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    borderTopColor: colors.line,
    backgroundColor: colors.ink,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 1,
    borderRadius: 10,
  },
  txt: {
    fontFamily: fonts.archivoMedium,
    // 9.5 en vez de 10: con cinco pestañas cada una tiene ~73px y "Histórico"
    // no entraba en 10px
    fontSize: 9.5,
    letterSpacing: tracking(9.5, 0.01),
    color: colors.faint,
    textAlign: 'center',
  },
});
