import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ResumenMensual } from '../types';
import { AlertaHormiga } from '../components/AlertaHormiga';
import { HeaderMonto } from '../components/HeaderMonto';
import { Pantalla } from '../components/Pantalla';
import { BarRow, ItemRow, Section, StatRow } from '../components/primitives';
import { colors, fonts, tracking } from '../theme';
import { getResumen } from '../api/pocket';
import { useMoneda } from '../context/MonedaContext';
import { nombreMes, periodoSiguiente } from '../utils/format';

/**
 * Pantallas Debito (`#p-deb`) y Credito (`#p-cre`) del mockup.
 *
 * Las dos consultan el mismo endpoint y solo cambian el flag `credito`
 * (seccion 4.3 del escenario), asi que son un solo componente. Las diferencias
 * de contenido salen de la respuesta: `comprasEnCurso` y
 * `comprometidoDelPeriodo` solo vienen en credito, `balance` solo cuando
 * hay ingreso cargado (RF-33).
 */
export function ResumenScreen({
  periodo,
  credito,
  onVerMovimientos,
  onEditarIngreso,
  refresco,
}: {
  periodo: string;
  credito: boolean;
  /** abre la lista completa del periodo (RF-12) */
  onVerMovimientos: () => void;
  /** abre el formulario de ingreso del mes (RF-32) */
  onEditarIngreso: () => void;
  /** cambia cuando se modifico el ingreso desde otra pantalla, para recargar */
  refresco: number;
}) {
  const { format } = useMoneda();
  const [resumen, setResumen] = useState<ResumenMensual | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setError(null);
    getResumen(periodo, credito)
      .then(setResumen)
      .catch(() => setError('No pude traer el resumen. Revisá la conexión.'))
      .finally(() => setCargando(false));
  }, [periodo, credito]);

  useEffect(() => {
    setCargando(true);
    cargar();
  }, [cargar, refresco]);

  if (!resumen) {
    return <Pantalla cargando={cargando} error={error} onReintentar={cargar} />;
  }

  const maximo = Math.max(...resumen.porCategoria.map((c) => c.total), 1);
  const rubros = resumen.porCategoria.length;

  return (
    <Pantalla onRefrescar={cargar}>
      <HeaderMonto
        eyebrow={`${credito ? 'Crédito' : 'Débito'} · ${nombreMes(resumen.periodo)}`}
        monto={format(resumen.total)}
      />

      {/* RF-27 */}
      {resumen.avisoHormiga ? (
        <AlertaHormiga
          aviso={resumen.avisoHormiga}
          montoFormateado={format(resumen.avisoHormiga.total)}
        />
      ) : null}

      {/* RF-19 / RF-22 — solo en credito: el estado de las compras en cuotas */}
      {credito && resumen.comprasEnCurso.length > 0 ? (
        <Section
          titulo="Cuotas en curso"
          meta={`${resumen.comprasEnCurso.length} ${resumen.comprasEnCurso.length === 1 ? 'compra' : 'compras'}`}
        >
          {resumen.comprasEnCurso.map((compra) => (
            <View key={compra.id} style={s.cuota}>
              <View style={s.cuotaHd}>
                <Text style={s.cuotaTitulo}>{compra.descripcion}</Text>
                <Text style={s.cuotaMeta}>
                  {compra.cuotasPagas} / {compra.cantidadCuotas}
                </Text>
              </View>
              <View style={s.pips}>
                {Array.from({ length: compra.cantidadCuotas }, (_, i) => (
                  <View key={i} style={[s.pip, i < compra.cuotasPagas && s.pipDone]} />
                ))}
              </View>
              <Text style={s.cuotaPie}>
                {format(compra.montoCuota)} POR MES · HASTA{' '}
                {nombreMes(compra.ultimoPeriodo).toUpperCase()}
              </Text>
            </View>
          ))}
        </Section>
      ) : null}

      {/* RF-28 */}
      {resumen.porCategoria.length > 0 ? (
        <Section titulo="Por categoría" meta={`${rubros} ${rubros === 1 ? 'rubro' : 'rubros'}`}>
          {resumen.porCategoria.map((c) => (
            <BarRow
              key={c.categoriaId}
              etiqueta={c.categoriaNombre}
              ocurrencias={c.ocurrencias}
              monto={format(c.total)}
              proporcion={c.total / maximo}
              hormiga={c.hormiga}
            />
          ))}
        </Section>
      ) : null}

      {/* RF-31 / RF-33 — sin ingreso cargado no se muestra la capacidad de ahorro */}
      {resumen.balance ? (
        <Section titulo="Balance" meta={nombreMes(resumen.periodo)}>
          {/* RF-32 — tocar la fila abre el formulario de ingreso */}
          <StatRow
            etiqueta="Ingresos"
            valor={format(resumen.balance.ingresos)}
            onPress={onEditarIngreso}
          />
          <StatRow etiqueta="Gastos totales" valor={format(resumen.balance.gastosTotales)} />
          <StatRow
            etiqueta="Podés ahorrar"
            valor={format(resumen.balance.capacidadAhorro)}
            positivo
            ultima
          />
        </Section>
      ) : null}

      {credito && resumen.comprometidoDelPeriodo !== null ? (
        <Section
          titulo="Ya comprometido"
          meta={nombreMes(periodoSiguiente(resumen.periodo))}
        >
          <StatRow
            etiqueta="Cuotas que vencen"
            valor={format(resumen.comprometidoDelPeriodo)}
            ultima
          />
        </Section>
      ) : null}

      {/* RF-12 */}
      {resumen.ultimosMovimientos.length > 0 ? (
        <Section titulo="Movimientos" meta={`últimos ${resumen.ultimosMovimientos.length}`}>
          {resumen.ultimosMovimientos.map((g, i) => (
            <ItemRow
              key={g.id}
              titulo={g.descripcion}
              meta={metaDeGasto(g)}
              monto={format(g.monto)}
              destacado={g.hormiga}
              ultima={i === resumen.ultimosMovimientos.length - 1}
            />
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={onVerMovimientos}
            style={({ pressed }) => [s.verMas, pressed && { opacity: 0.6 }]}
          >
            <Text style={s.verMasTxt}>Ver más movimientos</Text>
            <Text style={s.verMasChevron}>›</Text>
          </Pressable>
        </Section>
      ) : null}
    </Pantalla>
  );
}

/** `SUPERMERCADO · EFECTIVO` — y el `7.ª VEZ` cuando es hormiga (RF-27) */
function metaDeGasto(g: ResumenMensual['ultimosMovimientos'][number]): string {
  const partes = [g.categoriaNombre.toUpperCase(), etiquetaMedioPago(g)];
  if (g.hormiga && g.ocurrenciasCategoria) partes.push(`${g.ocurrenciasCategoria}.ª VEZ`);
  return partes.join(' · ');
}

function etiquetaMedioPago(g: ResumenMensual['ultimosMovimientos'][number]): string {
  if (g.nroCuota && g.cantidadCuotas) return `CUOTA ${g.nroCuota}/${g.cantidadCuotas}`;
  return g.medioPago === 'DEBITO' ? 'DÉBITO' : g.medioPago === 'CREDITO' ? 'CRÉDITO' : g.medioPago;
}

const s = StyleSheet.create({
  verMas: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    marginTop: 2,
  },
  verMasTxt: { fontFamily: fonts.archivoMedium, fontSize: 13, color: colors.acc },
  verMasChevron: { fontFamily: fonts.archivo, fontSize: 17, color: colors.acc, lineHeight: 19 },

  cuota: { marginBottom: 20 },
  cuotaHd: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  cuotaTitulo: { fontFamily: fonts.archivoMedium, fontSize: 14, color: colors.bone },
  cuotaMeta: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: tracking(10.5, 0.04),
    color: colors.faint,
  },
  pips: { flexDirection: 'row', gap: 3, marginBottom: 9 },
  pip: { height: 3, flex: 1, borderRadius: 2, backgroundColor: colors.raise2 },
  pipDone: { backgroundColor: colors.acc },
  cuotaPie: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: tracking(10.5, 0.03),
    color: colors.dim,
  },
});
