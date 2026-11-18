import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ResumenHistorico } from '../types';
import { HeaderMonto } from '../components/HeaderMonto';
import { Pantalla } from '../components/Pantalla';
import { BarRow, FootNote, ItemRow, Section, StatRow } from '../components/primitives';
import { colors, fonts, tracking } from '../theme';
import { getHistorico, getPeriodosHistoricos } from '../api/pocket';
import { useMoneda } from '../context/MonedaContext';
import { mesCorto, nombreMes, nombreMesAnio } from '../utils/format';

export function HistoricoScreen({
  onVerMovimientos,
}: {
  onVerMovimientos: (periodo: string, credito: boolean) => void;
}) {
  const { format } = useMoneda();
  const [periodos, setPeriodos] = useState<string[]>([]);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [datos, setDatos] = useState<ResumenHistorico | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPeriodosHistoricos()
      .then((ps) => {
        setPeriodos(ps);
        setSeleccionado(ps[ps.length - 1] ?? null);
      })
      .catch(() => setError('No pude traer el histórico. Revisá la conexión.'))
      .finally(() => setCargando(false));
  }, []);

  const cargar = useCallback(() => {
    if (!seleccionado) return;
    setError(null);
    getHistorico(seleccionado)
      .then(setDatos)
      .catch(() => setError('No pude traer el histórico. Revisá la conexión.'));
  }, [seleccionado]);

  useEffect(cargar, [cargar]);

  if (!datos) {
    return <Pantalla cargando={cargando} error={error} onReintentar={cargar} />;
  }

  const maximoPromedio = Math.max(datos.total, datos.promedioHistorico ?? 0, 1);

  return (
    <Pantalla onRefrescar={cargar}>
      <HeaderMonto eyebrow="Histórico" titulo="Mirá para atrás" />

      <Text style={s.nota}>
        Acá podés consultar cualquier mes ya cerrado: cuánto gastaste en débito, en crédito
        y cuánto te quedó. Los meses sin movimientos aparecen en cero.
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.months}
      >
        {periodos.map((p) => {
          const activo = p === seleccionado;
          return (
            <Pressable
              key={p}
              accessibilityRole="button"
              accessibilityState={{ selected: activo }}
              onPress={() => setSeleccionado(p)}
              style={({ pressed }) => [s.mo, activo && s.moAct, pressed && { opacity: 0.75 }]}
            >
              <Text style={[s.moTxt, activo && { color: colors.ink }]}>{mesCorto(p)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Section titulo={nombreMesAnio(datos.periodo)} meta="cerrado">
        <StatRow
          etiqueta="Débito"
          valor={format(datos.totalDebito)}
          onPress={() => onVerMovimientos(datos.periodo, false)}
        />
        <StatRow
          etiqueta="Crédito"
          valor={format(datos.totalCredito)}
          onPress={() => onVerMovimientos(datos.periodo, true)}
        />
        <StatRow etiqueta="Total" valor={format(datos.total)} />
        {datos.ahorrado !== null ? (
          <StatRow etiqueta="Ahorrado" valor={format(datos.ahorrado)} positivo ultima />
        ) : null}
      </Section>

      {datos.promedioHistorico !== null ? (
        <Section titulo="Contra tu promedio" meta={`${datos.mesesPromediados} meses`}>
          <BarRow
            etiqueta={capitalizar(nombreMes(datos.periodo))}
            monto={format(datos.total)}
            proporcion={datos.total / maximoPromedio}
          />
          <BarRow
            etiqueta="Promedio"
            monto={format(datos.promedioHistorico)}
            proporcion={datos.promedioHistorico / maximoPromedio}
          />
          <ComparacionPromedio total={datos.total} promedio={datos.promedioHistorico} />
        </Section>
      ) : null}

      {datos.repeticiones.length > 0 ? (
        <Section titulo="Repeticiones" meta={nombreMes(datos.periodo)}>
          {datos.repeticiones.map((r, i) => (
            <ItemRow
              key={r.categoriaId}
              titulo={r.categoriaNombre}
              meta={`${r.ocurrencias} VECES`}
              monto={format(r.total)}
              destacado
              ultima={i === datos.repeticiones.length - 1}
            />
          ))}
        </Section>
      ) : null}
    </Pantalla>
  );
}

function ComparacionPromedio({ total, promedio }: { total: number; promedio: number }) {
  const diferencia = Math.round(Math.abs((total - promedio) / promedio) * 100);
  const seExcedio = total > promedio;
  return (
    <FootNote calmo={!seExcedio}>
      {diferencia === 0
        ? 'Gastaste exactamente tu promedio.'
        : `Gastaste ${diferencia}% ${seExcedio ? 'más' : 'menos'} que tu promedio.`}
    </FootNote>
  );
}

const capitalizar = (t: string) => `${t[0].toUpperCase()}${t.slice(1)}`;

const s = StyleSheet.create({
  nota: {
    fontFamily: fonts.archivo,
    fontSize: 12.5,
    lineHeight: 12.5 * 1.5,
    color: colors.dim,
    marginTop: 14,
    marginBottom: 4,
  },
  months: { gap: 7, paddingBottom: 16, marginBottom: 8 },
  mo: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 9,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  moAct: { backgroundColor: colors.bone, borderColor: colors.bone },
  moTxt: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: tracking(11, 0.05),
    color: colors.dim,
  },
});
