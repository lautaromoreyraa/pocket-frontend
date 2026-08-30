import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { colors } from '../theme';

/**
 * `.sheet` — el panel que sube desde abajo con un velo detras.
 * Se apoya en el Modal de React Native, que ya maneja el boton "atras" de
 * Android y el foco de accesibilidad.
 */
export function Sheet({
  visible,
  onCerrar,
  children,
}: {
  visible: boolean;
  onCerrar: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onCerrar}
    >
      <View style={s.scrim}>
        {/* tocar el velo cierra el panel */}
        <Pressable style={s.velo} onPress={onCerrar} accessibilityLabel="Cerrar" />
        <View style={s.panel}>
          <View style={s.grab} />
          {children}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  velo: { flex: 1 },
  panel: {
    backgroundColor: colors.raise,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 21,
    paddingTop: 24,
    paddingBottom: 22,
  },
  grab: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    alignSelf: 'center',
    marginBottom: 20,
  },
});
