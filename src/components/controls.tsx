import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import { colors, fonts, tracking, type } from '../theme';


export function Boton({
  titulo,
  onPress,
  ghost = false,
  flex = true,
  disabled = false,
}: {
  titulo: string;
  onPress: () => void;
  ghost?: boolean;
  flex?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        ghost && s.btnGhost,
        flex ? { flex: 1 } : { flexGrow: 0 },
        ghost && !flex && { paddingHorizontal: 20 },
        (pressed || disabled) && { opacity: disabled ? 0.45 : 0.75 },
      ]}
    >
      <Text style={[s.btnTxt, ghost && { color: colors.dim }]}>{titulo}</Text>
    </Pressable>
  );
}

export function Link({
  titulo,
  onPress,
  mute = false,
}: {
  titulo: string;
  onPress: () => void;
  mute?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}>
      {({ pressed }) => (
        <Text style={[s.lnk, mute && { color: colors.faint }, pressed && { opacity: 0.6 }]}>
          {titulo}
        </Text>
      )}
    </Pressable>
  );
}

export function ChipSelect({
  titulo,
  activo,
  onPress,
  flex = false,
}: {
  titulo: string;
  activo: boolean;
  onPress: () => void;
  flex?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      onPress={onPress}
      style={({ pressed }) => [
        s.csel,
        flex && s.cselSeg,
        activo && s.cselOn,
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text
        style={[s.cselTxt, flex && { fontSize: 11.5 }, activo && { color: colors.acc }]}
        numberOfLines={1}
      >
        {titulo}
      </Text>
    </Pressable>
  );
}

export function BotonMoneda({ enDolares, onPress }: { enDolares: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={enDolares ? 'Ver montos en pesos' : 'Ver montos en dólares'}
      onPress={onPress}
      style={({ pressed }) => [s.usd, enDolares && s.usdOn, pressed && { opacity: 0.75 }]}
    >
      <Text style={[s.usdTxt, enDolares && { color: colors.acc }]}>
        {enDolares ? 'ARS' : 'USD'}
      </Text>
    </Pressable>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={[type.label, { marginBottom: 11 }]}>{children}</Text>;
}

export function MoneyInput({
  valor,
  onChange,
}: {
  valor: string;
  onChange: (texto: string) => void;
}) {
  return (
    <View style={s.moneyIn}>
      <Text style={s.moneySigno}>$</Text>
      <TextInput
        value={valor}
        onChangeText={onChange}
        placeholder="0"
        placeholderTextColor={colors.faint}
        keyboardType="number-pad"
        inputMode="numeric"
        style={s.moneyInput}
        selectionColor={colors.acc}
      />
    </View>
  );
}

export function CampoTexto(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.faint}
      selectionColor={colors.acc}
      {...props}
      style={[s.txtIn, props.style]}
    />
  );
}

export function Hint({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.hint}>
      <Text style={s.hintTxt}>{children}</Text>
    </View>
  );
}

export function BotonEliminar({ titulo, onPress }: { titulo: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}>
      {({ pressed }) => (
        <Text style={[s.del, pressed && { opacity: 0.6 }]}>{titulo}</Text>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.acc,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.line,
  },
  btnTxt: { fontFamily: fonts.archivoSemi, fontSize: 14, color: colors.accInk },

  lnk: { fontFamily: fonts.archivoMedium, fontSize: 12.5, color: colors.acc },

  csel: {
    backgroundColor: colors.raise,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cselSeg: { flex: 1, alignItems: 'center', paddingHorizontal: 4, paddingVertical: 10 },
  cselOn: { backgroundColor: colors.accSoft, borderColor: colors.accLine },
  cselTxt: { fontFamily: fonts.archivoMedium, fontSize: 12, color: colors.dim },

  usd: {
    backgroundColor: colors.raise,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  usdOn: { backgroundColor: colors.accSoft, borderColor: colors.accLine },
  usdTxt: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: tracking(10.5, 0.08),
    color: colors.dim,
  },

  moneyIn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: 11,
  },
  moneySigno: {
    fontFamily: fonts.chivoLight,
    fontSize: 27,
    color: colors.faint,
  },
  moneyInput: {
    flex: 1,
    minWidth: 0,
    color: colors.bone,
    fontFamily: fonts.chivoLight,
    fontSize: 40,
    letterSpacing: tracking(40, -0.045),
    padding: 0,
  },

  txtIn: {
    width: '100%',
    backgroundColor: colors.raise,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: colors.bone,
    fontFamily: fonts.archivo,
    fontSize: 14,
  },

  hint: {
    marginTop: 13,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: colors.acc,
  },
  hintTxt: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: tracking(10, 0.05),
    color: colors.dim,
    lineHeight: 16,
  },

  del: {
    fontFamily: fonts.archivoMedium,
    fontSize: 13,
    color: colors.warn,
    marginTop: 12,
  },
});
