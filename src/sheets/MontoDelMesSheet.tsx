import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';

import { FijoDelPeriodo } from '../types';
import { Boton, Label, MoneyInput } from '../components/controls';
import { Sheet } from './Sheet';
import { colors, fonts, tracking } from '../theme';
import { agruparMiles, nombreMes } from '../utils/format';

/**
 * Cuanto se pago ESTE MES de un gasto fijo.
 *
 * Existe porque un fijo es variable: la luz, el gas y las expensas cambian
 * todos los meses. La plantilla dice cuanto esperabas pagar; esto dice cuanto
 * pagaste, y son dos numeros distintos que no se pisan.
 *
 * Es deliberadamente chico: un campo y dos botones. Corregir un monto no puede
 * costar lo mismo que definir un fijo nuevo, si no nadie lo corrige.
 */
export function MontoDelMesSheet({
  visible,
  item,
  periodo,
  onGuardar,
  onCerrar,
  guardando = false,
}: {
  visible: boolean;
  /** null cuando esta cerrado */
  item: FijoDelPeriodo | null;
  periodo: string;
  onGuardar: (monto: number) => void;
  onCerrar: () => void;
  guardando?: boolean;
}) {
  const [texto, setTexto] = useState('');

  useEffect(() => {
    if (!visible || !item) return;
    // Arranca en lo ya registrado si esta tildado, y si no en el monto de la
    // plantilla: en los dos casos el numero que el usuario espera ver.
    const inicial = item.montoRegistrado ?? item.fijo.monto;
    setTexto(agruparMiles(String(Math.round(inicial))));
  }, [visible, item]);

  const monto = Number(texto.replace(/\D/g, '')) || 0;
  const registrado = item?.gastoId != null;

  const onChange = (valor: string) => {
    const digitos = valor.replace(/\D/g, '').slice(0, 12);
    setTexto(digitos ? agruparMiles(digitos) : '');
  };

  return (
    <Sheet visible={visible} onCerrar={onCerrar}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={s.titulo} numberOfLines={1}>
          {item?.fijo.descripcion ?? 'Gasto fijo'}
        </Text>
        <Text style={s.sub}>
          {registrado
            ? `Cuánto pagaste en ${nombreMes(periodo)}`
            : `Cuánto vas a pagar en ${nombreMes(periodo)}`}
        </Text>

        <View style={s.campo}>
          <Label>Monto</Label>
          <MoneyInput valor={texto} onChange={onChange} />
        </View>

        {item && monto !== item.fijo.monto ? (
          <Text style={s.aviso}>
            La plantilla sigue diciendo ${agruparMiles(String(Math.round(item.fijo.monto)))}. Esto
            cambia solo este mes.
          </Text>
        ) : null}

        <View style={s.acts}>
          <Boton titulo="Cancelar" ghost flex={false} onPress={onCerrar} />
          <Boton
            titulo={registrado ? 'Guardar' : 'Registrar'}
            onPress={() => onGuardar(monto)}
            disabled={monto <= 0 || guardando}
          />
        </View>
      </KeyboardAvoidingView>
    </Sheet>
  );
}

const s = StyleSheet.create({
  titulo: {
    fontFamily: fonts.chivo,
    fontSize: 20,
    letterSpacing: tracking(20, -0.03),
    color: colors.bone,
  },
  sub: { fontFamily: fonts.archivo, fontSize: 12.5, color: colors.faint, marginTop: 4 },
  campo: { marginTop: 22 },
  aviso: {
    fontFamily: fonts.archivo,
    fontSize: 12,
    color: colors.faint,
    marginTop: 12,
    lineHeight: 12 * 1.5,
  },
  acts: { flexDirection: 'row', gap: 9, marginTop: 22 },
});
