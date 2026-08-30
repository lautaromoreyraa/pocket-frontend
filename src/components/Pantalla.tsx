import React from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SCREEN_PADDING, colors, fonts } from '../theme';

/**
 * `.body` — el contenedor scrolleable de cada pantalla. Centraliza el padding,
 * el respeto del notch y los estados de carga y error, que son iguales en las
 * cuatro secciones.
 */
export function Pantalla({
  children,
  cargando = false,
  error = null,
  onReintentar,
  onRefrescar,
}: {
  children?: React.ReactNode;
  cargando?: boolean;
  error?: string | null;
  onReintentar?: () => void;
  onRefrescar?: () => void;
}) {
  const insets = useSafeAreaInsets();

  if (cargando) {
    return (
      <View style={s.centro}>
        <ActivityIndicator color={colors.acc} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.centro}>
        <Text style={s.error}>{error}</Text>
        {onReintentar ? (
          <Text style={s.reintentar} onPress={onReintentar}>
            Reintentar
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <ScrollView
      style={s.body}
      contentContainerStyle={[s.contenido, { paddingTop: 20 + insets.top }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefrescar ? (
          <RefreshControl refreshing={false} onRefresh={onRefrescar} tintColor={colors.acc} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  body: { flex: 1, backgroundColor: colors.ink },
  contenido: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 24 },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    backgroundColor: colors.ink,
    paddingHorizontal: SCREEN_PADDING,
  },
  error: { fontFamily: fonts.archivo, fontSize: 14, color: colors.dim, textAlign: 'center' },
  reintentar: { fontFamily: fonts.archivoMedium, fontSize: 13, color: colors.acc },
});
