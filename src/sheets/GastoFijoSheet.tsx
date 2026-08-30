import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GastoFijo, MedioPago } from '../types';
import {
  Boton,
  BotonEliminar,
  CampoTexto,
  ChipSelect,
  Hint,
  Label,
  MoneyInput,
} from '../components/controls';
import { IconClose } from '../components/Icons';
import { CATEGORIAS, categoriaPorId } from '../data/categorias';
import { colors, fonts, tracking } from '../theme';
import { agruparMiles, nombreMesUpper, periodoActual, periodoSiguiente } from '../utils/format';

/**
 * Alta y edicion de una PLANTILLA de gasto fijo.
 *
 * Es deliberadamente parecido a GastoFormSheet pero no es el mismo componente:
 * ahi se carga un gasto que ya ocurrio, aca se define uno que va a ocurrir
 * todos los meses. Los campos difieren (dia del mes, activo) y no hay cuotas:
 * un fijo en cuotas no es un fijo, es una compra financiada.
 */

const MEDIOS: { valor: MedioPago; titulo: string }[] = [
  { valor: 'EFECTIVO', titulo: 'Efectivo' },
  { valor: 'TRANSFERENCIA', titulo: 'Transfer.' },
  { valor: 'DEBITO', titulo: 'Débito' },
  { valor: 'CREDITO', titulo: 'Crédito' },
];

/** Tope 28: con 29, 30 o 31 habria que decidir que pasa en febrero */
const MAX_DIA = 28;

export function GastoFijoSheet({
  visible,
  inicial,
  onGuardar,
  onEliminar,
  onCerrar,
  guardando = false,
}: {
  visible: boolean;
  /** null cuando es un alta nueva */
  inicial: GastoFijo | null;
  onGuardar: (fijo: GastoFijo) => void;
  onEliminar?: () => void;
  onCerrar: () => void;
  guardando?: boolean;
}) {
  const insets = useSafeAreaInsets();

  const [montoTexto, setMontoTexto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [medioPago, setMedioPago] = useState<MedioPago>('TRANSFERENCIA');
  const [diaTexto, setDiaTexto] = useState('1');
  const [activo, setActivo] = useState(true);

  useEffect(() => {
    if (!visible) return;
    setMontoTexto(inicial ? agruparMiles(String(Math.round(inicial.monto))) : '');
    setDescripcion(inicial?.descripcion ?? '');
    setCategoriaId(inicial?.categoriaId ?? null);
    setMedioPago(inicial?.medioPago ?? 'TRANSFERENCIA');
    setDiaTexto(String(inicial?.diaDelMes ?? 1));
    setActivo(inicial?.activo ?? true);
  }, [visible, inicial]);

  const monto = Number(montoTexto.replace(/\D/g, '')) || 0;
  const dia = Number(diaTexto) || 0;
  const periodo = periodoActual();

  const onMontoChange = (texto: string) => {
    const digitos = texto.replace(/\D/g, '').slice(0, 12);
    setMontoTexto(digitos ? agruparMiles(digitos) : '');
  };

  const onDiaChange = (texto: string) => {
    setDiaTexto(texto.replace(/\D/g, '').slice(0, 2));
  };

  // RN-10 / RN-03: la pestaña y el mes de imputación se derivan del medio de pago
  const hint =
    medioPago === 'CREDITO'
      ? `CADA MES EL DÍA ${dia || '—'} · SE IMPUTA A ${nombreMesUpper(periodoSiguiente(periodo))} · PESTAÑA CRÉDITO`
      : `CADA MES EL DÍA ${dia || '—'} · PESTAÑA DÉBITO`;

  const valido = monto > 0 && categoriaId !== null && dia >= 1 && dia <= MAX_DIA;

  const guardar = () => {
    if (!valido || categoriaId === null) return;
    onGuardar({
      id: inicial?.id ?? '',
      descripcion: descripcion.trim() || categoriaPorId(categoriaId)?.nombreCorto || 'Fijo',
      monto,
      categoriaId,
      categoriaNombre: categoriaPorId(categoriaId)?.nombreCorto ?? 'Otros',
      medioPago,
      diaDelMes: dia,
      activo,
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      transparent
      onRequestClose={onCerrar}
    >
      <KeyboardAvoidingView
        style={s.wrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            s.form,
            { paddingTop: 26 + insets.top, paddingBottom: 20 + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.hd}>
            <View style={{ flex: 1 }}>
              <Text style={s.hdTitulo}>{inicial ? 'Editar el fijo' : 'Nuevo gasto fijo'}</Text>
              <Text style={s.hdSub}>Se repite todos los meses</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              onPress={onCerrar}
              hitSlop={10}
              style={({ pressed }) => pressed && { opacity: 0.6 }}
            >
              <IconClose size={19} color={colors.faint} />
            </Pressable>
          </View>

          <View style={s.field}>
            <Label>Cuánto</Label>
            <MoneyInput valor={montoTexto} onChange={onMontoChange} />
          </View>

          <View style={s.field}>
            <Label>Qué es</Label>
            <CampoTexto
              value={descripcion}
              onChangeText={setDescripcion}
              placeholder="Alquiler"
              maxLength={60}
            />
          </View>

          <View style={s.field}>
            <Label>En qué</Label>
            <View style={s.chipsSel}>
              {CATEGORIAS.map((c) => (
                <ChipSelect
                  key={c.id}
                  titulo={c.nombreCorto}
                  activo={c.id === categoriaId}
                  onPress={() => setCategoriaId(c.id)}
                />
              ))}
            </View>
          </View>

          <View style={s.field}>
            <Label>Cómo lo pagás</Label>
            <View style={s.seg}>
              {MEDIOS.map((m) => (
                <ChipSelect
                  key={m.valor}
                  titulo={m.titulo}
                  activo={m.valor === medioPago}
                  flex
                  onPress={() => setMedioPago(m.valor)}
                />
              ))}
            </View>
          </View>

          <View style={s.field}>
            <Label>Qué día del mes</Label>
            <View style={s.dia}>
              <CampoTexto
                value={diaTexto}
                onChangeText={onDiaChange}
                keyboardType="number-pad"
                inputMode="numeric"
                maxLength={2}
                style={s.diaInput}
              />
              <Text style={s.diaTxt}>de cada mes · máx {MAX_DIA}</Text>
            </View>
            <Hint>{hint}</Hint>
          </View>

          {/*
            El estado solo aparece al editar. Crear una plantilla ya pausada no
            significa nada: estarias definiendo algo que a la vez pedis que no se
            espere. Pausar es una accion sobre algo que ya existe.
          */}
          {inicial ? (
            <View style={s.field}>
              <Label>Estado</Label>
              <View style={s.seg}>
                <ChipSelect titulo="Activo" activo={activo} flex onPress={() => setActivo(true)} />
                <ChipSelect
                  titulo="Pausado"
                  activo={!activo}
                  flex
                  onPress={() => setActivo(false)}
                />
              </View>
              <Text style={s.ayuda}>
                Un fijo pausado sigue guardado pero no se espera este mes ni suma al estimado.
              </Text>

              {onEliminar ? (
                <BotonEliminar titulo="Eliminar este fijo" onPress={onEliminar} />
              ) : null}
            </View>
          ) : null}

          <View style={s.acts}>
            <Boton titulo="Cancelar" ghost flex={false} onPress={onCerrar} />
            <Boton titulo="Guardar" onPress={guardar} disabled={!valido || guardando} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.ink },
  form: { flexGrow: 1, paddingHorizontal: 21 },
  hd: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 28, gap: 12 },
  hdTitulo: {
    fontFamily: fonts.chivo,
    fontSize: 22,
    letterSpacing: tracking(22, -0.03),
    color: colors.bone,
  },
  hdSub: { fontFamily: fonts.archivo, fontSize: 12, color: colors.faint, marginTop: 3 },

  field: { marginBottom: 25 },
  chipsSel: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  seg: { flexDirection: 'row', gap: 6 },

  dia: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  diaInput: {
    width: 76,
    textAlign: 'center',
    fontFamily: fonts.chivo,
    fontSize: 18,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  diaTxt: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: tracking(10, 0.1),
    textTransform: 'uppercase',
    color: colors.faint,
    flex: 1,
  },

  ayuda: {
    fontFamily: fonts.archivo,
    fontSize: 12,
    color: colors.faint,
    marginTop: 10,
    lineHeight: 12 * 1.5,
  },

  acts: { flexDirection: 'row', gap: 9, marginTop: 'auto', paddingTop: 22 },
});
