import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Gasto } from '../types';
import { IconClose } from '../components/Icons';
import { ItemRow } from '../components/primitives';
import { colors, fonts, tracking } from '../theme';
import { getGastos } from '../api/pocket';
import { useMoneda } from '../context/MonedaContext';
import { formatFechaDiaMes, nombreMesAnio } from '../utils/format';

/**
 * Pantalla "Todos los movimientos" del periodo.
 *
 * No esta en el mockup: es una extension pedida despues. Reusa el lenguaje
 * visual que ya existe —eyebrow, monto grande, `.sect-hd` como encabezado de
 * dia, `.item` para cada fila— asi que no introduce estilos nuevos.
 *
 * Se llega desde tres lugares (RF-12):
 *   - boton "Ver más movimientos" de Debito
 *   - boton "Ver más movimientos" de Credito
 *   - filas Debito y Credito del Historico
 */
export function MovimientosScreen({
  visible,
  periodo,
  credito,
  onCerrar,
}: {
  visible: boolean;
  /** yyyy-MM */
  periodo: string;
  credito: boolean;
  onCerrar: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { format } = useMoneda();

  const [gastos, setGastos] = useState<Gasto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setError(null);
    getGastos(periodo, credito)
      .then(setGastos)
      .catch(() => setError('No pude traer los movimientos. Revisá la conexión.'));
  }, [periodo, credito]);

  useEffect(() => {
    if (!visible) return;
    setGastos(null);
    cargar();
  }, [visible, cargar]);

  /** Agrupados por dia, del mas reciente al mas viejo */
  const porDia = useMemo(() => {
    if (!gastos) return [];
    const mapa = new Map<string, Gasto[]>();
    for (const g of [...gastos].sort((a, b) => b.fechaImputacion.localeCompare(a.fechaImputacion))) {
      const dia = g.fechaImputacion;
      const lista = mapa.get(dia);
      if (lista) lista.push(g);
      else mapa.set(dia, [g]);
    }
    return [...mapa.entries()];
  }, [gastos]);

  const total = useMemo(
    () => (gastos ? gastos.reduce((acc, g) => acc + g.monto, 0) : 0),
    [gastos],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      transparent
      onRequestClose={onCerrar}
    >
      <View style={s.wrap}>
        <ScrollView
          contentContainerStyle={[
            s.contenido,
            { paddingTop: 26 + insets.top, paddingBottom: 24 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.hd}>
            <View style={{ flex: 1 }}>
              <Text style={s.eyebrow}>
                {credito ? 'Crédito' : 'Débito'} · {nombreMesAnio(periodo)}
              </Text>
              <Text style={s.titulo}>Todos los movimientos</Text>
              {gastos ? (
                <Text style={s.resumen}>
                  {gastos.length} {gastos.length === 1 ? 'movimiento' : 'movimientos'} ·{' '}
                  {format(total)}
                </Text>
              ) : null}
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

          {error ? (
            <View style={s.vacio}>
              <Text style={s.vacioTxt}>{error}</Text>
              <Text style={s.reintentar} onPress={cargar}>
                Reintentar
              </Text>
            </View>
          ) : null}

          {!error && gastos === null ? (
            <Text style={s.vacioTxt}>Cargando…</Text>
          ) : null}

          {gastos !== null && gastos.length === 0 ? (
            <View style={s.vacio}>
              <Text style={s.vacioTxt}>
                No hay movimientos de {credito ? 'crédito' : 'débito'} en este mes.
              </Text>
            </View>
          ) : null}

          {porDia.map(([dia, delDia]) => (
            <View key={dia} style={s.grupo}>
              <View style={s.grupoHd}>
                <Text style={s.grupoTitulo}>{formatFechaDiaMes(dia)}</Text>
                <Text style={s.grupoMeta}>
                  {format(delDia.reduce((acc, g) => acc + g.monto, 0))}
                </Text>
              </View>
              {delDia.map((g, i) => (
                <ItemRow
                  key={g.id}
                  titulo={g.descripcion}
                  meta={metaDeGasto(g)}
                  monto={format(g.monto)}
                  destacado={g.hormiga}
                  ultima={i === delDia.length - 1}
                />
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

/** `SUPERMERCADO · EFECTIVO`, o `HOGAR · CUOTA 2/6` cuando es una cuota */
function metaDeGasto(g: Gasto): string {
  const partes = [g.categoriaNombre.toUpperCase()];
  if (g.nroCuota && g.cantidadCuotas) {
    partes.push(`CUOTA ${g.nroCuota}/${g.cantidadCuotas}`);
  } else {
    partes.push(
      g.medioPago === 'DEBITO' ? 'DÉBITO' : g.medioPago === 'CREDITO' ? 'CRÉDITO' : g.medioPago,
    );
  }
  if (g.hormiga && g.ocurrenciasCategoria) partes.push(`${g.ocurrenciasCategoria}.ª VEZ`);
  return partes.join(' · ');
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.ink },
  contenido: { paddingHorizontal: 21 },

  hd: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 28, gap: 12 },
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: tracking(10.5, 0.13),
    textTransform: 'uppercase',
    color: colors.faint,
    marginBottom: 7,
  },
  titulo: {
    fontFamily: fonts.chivo,
    fontSize: 24,
    letterSpacing: tracking(24, -0.03),
    color: colors.bone,
  },
  resumen: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: tracking(10.5, 0.04),
    color: colors.faint,
    marginTop: 9,
  },

  grupo: { marginBottom: 26 },
  grupoHd: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 9,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.line,
  },
  grupoTitulo: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: tracking(10.5, 0.13),
    textTransform: 'uppercase',
    color: colors.faint,
  },
  grupoMeta: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: tracking(10.5, 0.04),
    color: colors.faint,
  },

  vacio: { paddingVertical: 40, alignItems: 'center', gap: 14 },
  vacioTxt: {
    fontFamily: fonts.archivo,
    fontSize: 14,
    color: colors.dim,
    textAlign: 'center',
  },
  reintentar: { fontFamily: fonts.archivoMedium, fontSize: 13, color: colors.acc },
});
