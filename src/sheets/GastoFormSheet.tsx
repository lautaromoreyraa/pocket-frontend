import React, { useEffect, useMemo, useState } from 'react';
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

import { GastoBorrador, MedioPago } from '../types';
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
import { nuevaIdempotencyKey } from '../api/client';
import { CATEGORIAS } from '../data/categorias';
import { colors, fonts, tracking } from '../theme';
import { calcularCuotas } from '../utils/cuotas';
import {
  agruparMiles,
  formatFechaLarga,
  formatPesos,
  hoyISO,
  nombreMesUpper,
  periodoActual,
  periodoSiguiente,
} from '../utils/format';

/**
 * `#manual` y `#edit` del mockup — RF-15: el formulario de carga manual y el
 * de correccion de un gasto detectado son EL MISMO componente, con distinto
 * estado inicial y distintos textos.
 *
 * Los montos se editan siempre en pesos, aunque la app este mostrando dolares:
 * lo que se persiste son pesos (RF-36) y pedir el monto en la moneda de
 * display seria una fuente de error.
 */

export type ModoFormulario = 'manual' | 'correccion';

const MEDIOS: { valor: MedioPago; titulo: string }[] = [
  { valor: 'EFECTIVO', titulo: 'Efectivo' },
  { valor: 'TRANSFERENCIA', titulo: 'Transfer.' },
  { valor: 'DEBITO', titulo: 'Débito' },
  { valor: 'CREDITO', titulo: 'Crédito' },
];

/** RF-20 — atajos de cuotas, mas ingreso manual con tope 60 */
const ATAJOS_CUOTAS = [1, 3, 6, 12];
const MAX_CUOTAS = 60;

export function GastoFormSheet({
  visible,
  modo,
  inicial,
  subtitulo,
  onGuardar,
  onCancelar,
  onDescartar,
  guardando = false,
}: {
  visible: boolean;
  modo: ModoFormulario;
  /** null cuando es un alta nueva */
  inicial: GastoBorrador | null;
  /** texto chico bajo el titulo, del tipo "1 de los 2 que escuché" */
  subtitulo?: string;
  onGuardar: (borrador: GastoBorrador) => void;
  onCancelar: () => void;
  /** RF-13 — solo en correccion: descartar este gasto de la tanda */
  onDescartar?: () => void;
  guardando?: boolean;
}) {
  const insets = useSafeAreaInsets();

  // El monto se guarda como string de digitos y se muestra con separador de
  // miles, igual que en el mockup.
  const [montoTexto, setMontoTexto] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [medioPago, setMedioPago] = useState<MedioPago>('EFECTIVO');
  const [cuotas, setCuotas] = useState(1);
  const [cuotasLibres, setCuotasLibres] = useState(false);
  const [cuotasTexto, setCuotasTexto] = useState('9');
  /**
   * RF-46 — la clave se genera una vez por apertura del formulario y no cambia
   * aunque el usuario toque Guardar dos veces. Eso es lo que hace que un
   * reintento no duplique el gasto (RF-47).
   */
  const [idempotencyKey, setIdempotencyKey] = useState('');

  // Al abrirse, el formulario toma el estado inicial que le corresponda
  useEffect(() => {
    if (!visible) return;
    setMontoTexto(inicial?.monto != null ? agruparMiles(String(Math.round(inicial.monto))) : '');
    setCategoriaId(inicial?.categoriaId ?? null);
    setDescripcion(inicial?.descripcion ?? '');
    setMedioPago(inicial?.medioPago ?? 'EFECTIVO');
    const n = inicial?.cantidadCuotas ?? 1;
    setCuotas(n);
    setCuotasLibres(!ATAJOS_CUOTAS.includes(n));
    setCuotasTexto(String(n));
    setIdempotencyKey(inicial?.idempotencyKey ?? nuevaIdempotencyKey());
  }, [visible, inicial]);

  const monto = Number(montoTexto.replace(/\D/g, '')) || 0;
  const esCredito = medioPago === 'CREDITO';
  const periodo = periodoActual();

  const onMontoChange = (texto: string) => {
    const digitos = texto.replace(/\D/g, '').slice(0, 12);
    setMontoTexto(digitos ? agruparMiles(digitos) : '');
  };

  const onCuotasLibresChange = (texto: string) => {
    const digitos = texto.replace(/\D/g, '').slice(0, 2);
    setCuotasTexto(digitos);
    const n = Number(digitos);
    if (n >= 1 && n <= MAX_CUOTAS) setCuotas(n);
  };

  /** RF-26 — antes de guardar, la app informa el valor de cada cuota y el mes */
  const hint = useMemo(() => {
    if (!esCredito) {
      // RN-10 — la pestana se deriva del medio de pago
      return `SE SUMA A ${nombreMesUpper(periodo)} · PESTAÑA DÉBITO`;
    }
    if (cuotas < 2) {
      // RN-03 — todo credito se imputa al mes siguiente, tenga cuotas o no
      return `SE SUMA A ${nombreMesUpper(periodoSiguiente(periodo))} · PESTAÑA CRÉDITO`;
    }
    const preview = calcularCuotas(monto, cuotas, periodo);
    return `${cuotas} CUOTAS DE ${formatPesos(preview.montoCuota)} · DE ${nombreMesUpper(preview.primerPeriodo)} A ${nombreMesUpper(preview.ultimoPeriodo)}`;
  }, [esCredito, cuotas, monto, periodo]);

  const valido = monto > 0 && categoriaId !== null && cuotas >= 1 && cuotas <= MAX_CUOTAS;

  const guardar = () => {
    if (!valido || categoriaId === null) return;
    onGuardar({
      localId: inicial?.localId ?? `local-${Date.now()}`,
      idempotencyKey,
      monto,
      categoriaId,
      descripcion: descripcion.trim(),
      medioPago,
      // Al corregir un detectado se respeta la fecha que trajo el audio; una
      // carga manual es de hoy. El backend rechaza fechas futuras.
      fechaGasto: inicial?.fechaGasto ?? hoyISO(),
      cantidadCuotas: esCredito ? cuotas : 1,
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onCancelar}
      presentationStyle="overFullScreen"
      transparent
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
              <Text style={s.hdTitulo}>
                {modo === 'manual' ? 'Cargar a mano' : 'Corregir gasto'}
              </Text>
              <Text style={s.hdSub}>{subtitulo ?? formatFechaLarga(new Date())}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              onPress={onCancelar}
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
            <Label>Detalle</Label>
            <CampoTexto
              value={descripcion}
              onChangeText={setDescripcion}
              placeholder="Milanesas del viernes"
              maxLength={80}
            />
          </View>

          <View style={s.field}>
            <Label>Cómo pagaste</Label>
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

            {/* RF-20 — las cuotas solo aparecen con credito */}
            {esCredito ? (
              <View style={{ marginTop: 16 }}>
                <Label>En cuántas cuotas</Label>
                <View style={s.seg}>
                  {ATAJOS_CUOTAS.map((n) => (
                    <ChipSelect
                      key={n}
                      titulo={String(n)}
                      activo={!cuotasLibres && cuotas === n}
                      flex
                      onPress={() => {
                        setCuotasLibres(false);
                        setCuotas(n);
                      }}
                    />
                  ))}
                  <ChipSelect
                    titulo="Otro"
                    activo={cuotasLibres}
                    flex
                    onPress={() => {
                      setCuotasLibres(true);
                      const n = Number(cuotasTexto);
                      if (n >= 1 && n <= MAX_CUOTAS) setCuotas(n);
                    }}
                  />
                </View>

                {cuotasLibres ? (
                  <View style={s.otro}>
                    <CampoTexto
                      value={cuotasTexto}
                      onChangeText={onCuotasLibresChange}
                      keyboardType="number-pad"
                      inputMode="numeric"
                      maxLength={2}
                      style={s.otroInput}
                    />
                    <Text style={s.otroTxt}>cuotas · máx {MAX_CUOTAS}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <Hint>{hint}</Hint>

            {modo === 'correccion' && onDescartar ? (
              <BotonEliminar titulo="Descartar este gasto" onPress={onDescartar} />
            ) : null}
          </View>

          <View style={s.acts}>
            <Boton titulo="Cancelar" ghost flex={false} onPress={onCancelar} />
            <Boton
              titulo={modo === 'manual' ? 'Guardar gasto' : 'Listo'}
              onPress={guardar}
              disabled={!valido || guardando}
            />
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

  otro: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 12 },
  otroInput: {
    width: 96,
    textAlign: 'center',
    fontFamily: fonts.chivo,
    fontSize: 18,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  otroTxt: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: tracking(10, 0.12),
    textTransform: 'uppercase',
    color: colors.faint,
  },

  acts: { flexDirection: 'row', gap: 9, marginTop: 'auto', paddingTop: 22 },
});
