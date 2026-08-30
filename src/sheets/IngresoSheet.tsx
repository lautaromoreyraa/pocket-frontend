import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ingreso } from '../types';
import { Boton, CampoTexto, Hint, Label, MoneyInput } from '../components/controls';
import { Sheet } from './Sheet';
import { colors, fonts, tracking } from '../theme';
import { agruparMiles, formatPesos, nombreMesAnio } from '../utils/format';

/**
 * Carga de los ingresos del mes — RF-32.
 *
 * Se cargan siempre a mano, nunca por audio, y son lo que habilita la capacidad
 * de ahorro (RF-33): sin ningun ingreso cargado el bloque Balance no aparece.
 *
 * Un periodo puede tener **varios** ingresos: sueldo, un alquiler que se cobra,
 * un trabajo suelto. El backend nunca reemplaza, siempre agrega; para corregir
 * uno hay que borrarlo y volver a cargarlo.
 */
export function IngresoSheet({
  visible,
  periodo,
  ingresos,
  onGuardar,
  onEliminar,
  onCerrar,
  guardando = false,
}: {
  visible: boolean;
  /** yyyy-MM */
  periodo: string;
  /** los ingresos ya cargados del mes; vacio si no hay ninguno */
  ingresos: Ingreso[];
  onGuardar: (monto: number, descripcion: string) => void;
  onEliminar: (ingreso: Ingreso) => void;
  onCerrar: () => void;
  guardando?: boolean;
}) {
  const [montoTexto, setMontoTexto] = useState('');
  const [descripcion, setDescripcion] = useState('');

  useEffect(() => {
    if (!visible) return;
    setMontoTexto('');
    setDescripcion('');
  }, [visible]);

  const monto = Number(montoTexto.replace(/\D/g, '')) || 0;
  const total = ingresos.reduce((acc, i) => acc + i.monto, 0);

  const onMontoChange = (texto: string) => {
    const digitos = texto.replace(/\D/g, '').slice(0, 12);
    setMontoTexto(digitos ? agruparMiles(digitos) : '');
  };

  return (
    <Sheet visible={visible} onCerrar={onCerrar}>
      <Text style={s.titulo}>
        {ingresos.length ? 'Lo que entró este mes' : 'Cuánto entró este mes'}
      </Text>
      <Text style={s.bajada}>
        {nombreMesAnio(periodo)} · sin esto no puedo calcular cuánto podés ahorrar
      </Text>

      {ingresos.length > 0 ? (
        <View style={s.lista}>
          {ingresos.map((i) => (
            <View key={i.id} style={s.fila}>
              <Text style={s.filaTexto} numberOfLines={1}>
                {i.descripcion}
              </Text>
              <Text style={s.filaMonto}>{formatPesos(i.monto)}</Text>
              <Pressable
                onPress={() => onEliminar(i)}
                hitSlop={10}
                accessibilityLabel={`Borrar ${i.descripcion}`}
              >
                <Text style={s.borrar}>✕</Text>
              </Pressable>
            </View>
          ))}
          <View style={[s.fila, s.filaTotal]}>
            <Text style={s.totalTexto}>Total</Text>
            <Text style={s.totalMonto}>{formatPesos(total)}</Text>
            <View style={s.espaciador} />
          </View>
        </View>
      ) : null}

      <View style={s.campo}>
        <Label>Cuánto</Label>
        <MoneyInput valor={montoTexto} onChange={onMontoChange} />
      </View>

      <View style={s.campo}>
        <Label>De qué</Label>
        <CampoTexto
          value={descripcion}
          onChangeText={setDescripcion}
          placeholder="Sueldo"
          maxLength={60}
        />
      </View>

      <Hint>SE USA PARA LA CAPACIDAD DE AHORRO DE {nombreMesAnio(periodo).toUpperCase()}</Hint>

      <View style={s.acts}>
        <Boton titulo="Cerrar" ghost flex={false} onPress={onCerrar} />
        <Boton
          titulo={ingresos.length ? 'Agregar' : 'Guardar'}
          onPress={() => onGuardar(monto, descripcion.trim() || 'Ingreso')}
          disabled={monto <= 0 || guardando}
        />
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  titulo: {
    fontFamily: fonts.chivo,
    fontSize: 21,
    letterSpacing: tracking(21, -0.03),
    color: colors.bone,
    marginBottom: 5,
  },
  bajada: { fontFamily: fonts.archivo, fontSize: 12.5, color: colors.dim, marginBottom: 24 },
  campo: { marginBottom: 24 },
  lista: { marginBottom: 24 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  filaTexto: { flex: 1, fontFamily: fonts.archivo, fontSize: 13.5, color: colors.bone },
  filaMonto: { fontFamily: fonts.mono, fontSize: 13.5, color: colors.bone },
  borrar: { fontFamily: fonts.archivo, fontSize: 15, color: colors.warn, paddingHorizontal: 2 },
  filaTotal: { borderBottomWidth: 0 },
  totalTexto: { flex: 1, fontFamily: fonts.archivo, fontSize: 12.5, color: colors.dim },
  totalMonto: { fontFamily: fonts.mono, fontSize: 13.5, color: colors.acc },
  espaciador: { width: 15 },
  acts: { flexDirection: 'row', gap: 9, marginTop: 24 },
});
