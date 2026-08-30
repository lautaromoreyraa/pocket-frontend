import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FijoDelPeriodo, GastoFijo, Ingreso } from '../types';
import { HeaderMonto } from '../components/HeaderMonto';
import { Pantalla } from '../components/Pantalla';
import { Section, StatRow } from '../components/primitives';
import { IconCheck, IconPlus } from '../components/Icons';
import { colors, fonts, tracking } from '../theme';
import {
  desregistrarGastoFijo,
  editarMontoDelMes,
  getIngresos,
  getResumenFijos,
  registrarGastoFijo,
} from '../api/pocket';
import { MontoDelMesSheet } from '../sheets/MontoDelMesSheet';
import { reprogramarAvisos } from '../notificaciones/fijos';
import { useMoneda } from '../context/MonedaContext';
import { nombreMes, periodoActual } from '../utils/format';

/**
 * Pestana Fijos. No esta en docs/mockup.html: es una extension posterior, y
 * por eso reusa el lenguaje visual existente sin inventar estilos nuevos.
 *
 * Junta las dos cosas que definen la estructura del mes:
 *   - lo que entra: el ingreso (RF-32)
 *   - lo que sale si o si: los gastos fijos
 *
 * Los fijos son plantillas, no gastos. Cada mes se registran, y ahi si
 * generan un `gasto` real que suma a los totales y a la capacidad de ahorro.
 */
/**
 * Un periodo puede tener varios ingresos (sueldo, un alquiler, un trabajo
 * suelto) pero esta pantalla muestra un solo numero. Los colapsa en uno
 * sintetico: el monto es la suma, y la etiqueta dice cuantos son cuando hay
 * mas de uno, para que no parezca que el sueldo entero es ese total.
 */
function sumarIngresos(ingresos: Ingreso[]): Ingreso | null {
  if (ingresos.length === 0) return null;
  if (ingresos.length === 1) return ingresos[0];
  return {
    ...ingresos[0],
    monto: ingresos.reduce((acc, i) => acc + i.monto, 0),
    descripcion: `${ingresos.length} ingresos`,
  };
}

export function FijosScreen({
  periodo,
  onEditarIngreso,
  onNuevoFijo,
  onEditarFijo,
  /** cambia cuando algo de afuera modifico ingresos o fijos, para recargar */
  refresco,
}: {
  periodo: string;
  onEditarIngreso: () => void;
  onNuevoFijo: () => void;
  onEditarFijo: (fijo: GastoFijo) => void;
  refresco: number;
}) {
  const { format } = useMoneda();

  const [items, setItems] = useState<FijoDelPeriodo[] | null>(null);
  const [totales, setTotales] = useState({ estimado: 0, registrado: 0 });
  const [ingreso, setIngreso] = useState<Ingreso | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** id del fijo cuyo tilde se esta guardando, para no dejar tocar dos veces */
  const [tildando, setTildando] = useState<string | null>(null);
  /** el fijo cuyo monto del mes se esta editando; null = sheet cerrado */
  const [montoAbierto, setMontoAbierto] = useState<FijoDelPeriodo | null>(null);
  const [guardandoMonto, setGuardandoMonto] = useState(false);

  const cargar = useCallback(() => {
    setError(null);
    // Las dos cargas son independientes a proposito: que falle una no tiene
    // por que dejar la pantalla entera en un cartel de error.
    Promise.allSettled([getResumenFijos(periodo), getIngresos(periodo)]).then(
      ([resFijos, resIngresos]) => {
        if (resFijos.status === 'fulfilled') {
          setItems(resFijos.value.items);
          setTotales({
            estimado: resFijos.value.totalEstimado,
            registrado: resFijos.value.totalRegistrado,
          });
          // Los recordatorios se reprograman con cada carga: es el momento en
          // que tenemos la lista fresca, y asi tildar un fijo apaga su aviso
          // sin que haga falta ninguna sincronizacion aparte. Que falle no
          // puede romper la pantalla: es una comodidad, no el contenido.
          if (periodo === periodoActual()) {
            void reprogramarAvisos(resFijos.value.items).catch(() => undefined);
          }
        } else {
          setItems([]);
          setError('No pude traer tus fijos. Revisá la conexión.');
        }
        // La pantalla muestra un solo numero: el total de lo que entro.
        setIngreso(resIngresos.status === 'fulfilled' ? sumarIngresos(resIngresos.value) : null);
      },
    );
  }, [periodo]);

  useEffect(cargar, [cargar, refresco]);

  /**
   * El tilde es la existencia del gasto: tildar lo crea, destildar lo borra.
   * Por eso una sola funcion, y por eso destildar no necesita confirmacion: lo
   * que se deshace es el tilde de este mes, no la plantilla.
   */
  const alternarTilde = useCallback(
    async (item: FijoDelPeriodo) => {
      setTildando(item.fijo.id);
      setError(null);
      try {
        if (item.gastoId) {
          await desregistrarGastoFijo(item.gastoId, periodo);
        } else {
          // Un tap registra con el monto de la plantilla. Si este mes vino
          // distinto, se toca el numero y se corrige: la mayoria de los fijos
          // no cambian nunca y no tienen por que pagar esa fricción.
          await registrarGastoFijo(item.fijo.id, periodo, item.fijo.monto);
        }
        cargar();
      } catch {
        setError(
          item.gastoId ? 'No pude destildarlo. Probá de nuevo.' : 'No pude registrarlo. Probá de nuevo.',
        );
      } finally {
        setTildando(null);
      }
    },
    [periodo, cargar],
  );

  /** Guarda el monto del mes: si ya estaba tildado lo corrige, y si no, tilda
   *  con el monto que el usuario acaba de escribir. */
  const guardarMontoDelMes = useCallback(
    async (monto: number) => {
      const item = montoAbierto;
      if (!item) return;
      setGuardandoMonto(true);
      setError(null);
      try {
        if (item.gastoId) {
          await editarMontoDelMes(item.fijo.id, periodo, monto);
        } else {
          await registrarGastoFijo(item.fijo.id, periodo, monto);
        }
        setMontoAbierto(null);
        cargar();
      } catch {
        setError('No pude guardar el monto. Probá de nuevo.');
      } finally {
        setGuardandoMonto(false);
      }
    },
    [montoAbierto, periodo, cargar],
  );

  if (!items) {
    return <Pantalla cargando={!error} error={error} onReintentar={cargar} />;
  }

  const activos = items.filter((i) => i.fijo.activo);
  const pausados = items.filter((i) => !i.fijo.activo);
  const registrados = activos.filter((i) => i.gastoId !== null);
  const pendientes = activos.filter((i) => i.gastoId === null);

  return (
    <Pantalla onRefrescar={cargar}>
      <HeaderMonto
        eyebrow={`Fijos · ${nombreMes(periodo)}`}
        monto={format(totales.estimado)}
      />

      {/* Lo que entra — RF-32 */}
      <Section titulo="Lo que entra" meta={nombreMes(periodo)}>
        {ingreso ? (
          <StatRow
            etiqueta={ingreso.descripcion}
            valor={format(ingreso.monto)}
            positivo
            ultima
            onPress={onEditarIngreso}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={onEditarIngreso}
            style={({ pressed }) => [s.vacio, pressed && { opacity: 0.6 }]}
          >
            <Text style={s.vacioTitulo}>Cargá tu ingreso del mes</Text>
            <Text style={s.vacioSub}>
              Sin esto no puedo calcular cuánto podés ahorrar
            </Text>
          </Pressable>
        )}
      </Section>

      {/* RF-31 — la cuenta que le importa al usuario */}
      {ingreso ? (
        <Section titulo="Después de los fijos" meta="estimado">
          <StatRow etiqueta="Ingreso" valor={format(ingreso.monto)} />
          <StatRow etiqueta="Fijos del mes" valor={format(totales.estimado)} />
          <StatRow
            etiqueta="Te queda"
            valor={format(ingreso.monto - totales.estimado)}
            positivo={ingreso.monto - totales.estimado >= 0}
            ultima
          />
        </Section>
      ) : null}

      {pendientes.length > 0 ? (
        <Section titulo="Todavía no" meta={`${pendientes.length} de ${activos.length}`}>
          {pendientes.map((item, i) => (
            <FilaFijo
              key={item.fijo.id}
              item={item}
              monto={format(item.fijo.monto)}
              ultima={i === pendientes.length - 1}
              ocupado={tildando === item.fijo.id}
              onTildar={() => void alternarTilde(item)}
              onEditarMonto={() => setMontoAbierto(item)}
              onEditar={() => onEditarFijo(item.fijo)}
            />
          ))}
        </Section>
      ) : null}

      {registrados.length > 0 ? (
        <Section titulo="Ya pagados" meta={`${registrados.length} de ${activos.length}`}>
          {registrados.map((item, i) => (
            <FilaFijo
              key={item.fijo.id}
              item={item}
              monto={format(item.montoRegistrado ?? item.fijo.monto)}
              ultima={i === registrados.length - 1}
              ocupado={tildando === item.fijo.id}
              onTildar={() => void alternarTilde(item)}
              onEditarMonto={() => setMontoAbierto(item)}
              onEditar={() => onEditarFijo(item.fijo)}
            />
          ))}
        </Section>
      ) : null}

      {/* Un pausado no se espera este mes, asi que no tiene tilde ni monto que
          corregir: tocarlo solo lleva a la plantilla, que es donde se reactiva. */}
      {pausados.length > 0 ? (
        <Section titulo="Pausados" meta={`${pausados.length}`}>
          {pausados.map((item, i) => (
            <FilaFijo
              key={item.fijo.id}
              item={item}
              monto={format(item.fijo.monto)}
              ultima={i === pausados.length - 1}
              onEditar={() => onEditarFijo(item.fijo)}
            />
          ))}
        </Section>
      ) : null}

      {activos.length === 0 && pausados.length === 0 ? (
        <View style={s.vacio}>
          <Text style={s.vacioTitulo}>Todavía no tenés fijos cargados</Text>
          <Text style={s.vacioSub}>
            El alquiler, la luz, el internet, las suscripciones. Lo que pagás todos los meses
            sin pensarlo.
          </Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={onNuevoFijo}
        style={({ pressed }) => [s.agregar, pressed && { opacity: 0.6 }]}
      >
        <IconPlus size={15} color={colors.acc} />
        <Text style={s.agregarTxt}>Agregar gasto fijo</Text>
      </Pressable>

      <MontoDelMesSheet
        visible={montoAbierto !== null}
        item={montoAbierto}
        periodo={periodo}
        onGuardar={(monto) => void guardarMontoDelMes(monto)}
        onCerrar={() => setMontoAbierto(null)}
        guardando={guardandoMonto}
      />
    </Pantalla>
  );
}

/**
 * Una fila de la lista de fijos, con tres zonas tocables y bien separadas:
 *
 *   el checkbox  -> ya lo pagué / todavía no
 *   el monto     -> cuánto pagué ESTE MES (los fijos son variables)
 *   el nombre    -> la plantilla: cuánto se espera todos los meses
 *
 * La distinción entre las dos últimas es la que importa: tocar el número
 * cambia un mes, tocar el nombre cambia todos los meses que vienen.
 */
function FilaFijo({
  item,
  monto,
  ultima,
  ocupado = false,
  onTildar,
  onEditarMonto,
  onEditar,
}: {
  item: FijoDelPeriodo;
  monto: string;
  ultima: boolean;
  ocupado?: boolean;
  /** si no se pasan, la fila está pausada: no se espera este mes */
  onTildar?: () => void;
  onEditarMonto?: () => void;
  onEditar: () => void;
}) {
  const registrado = item.gastoId !== null;
  const pausado = !item.fijo.activo;

  return (
    <View style={[s.fila, ultima && { borderBottomWidth: 0 }]}>
      {onTildar ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: registrado, disabled: ocupado }}
          accessibilityLabel={`${item.fijo.descripcion}, ya lo pagué`}
          onPress={onTildar}
          disabled={ocupado}
          hitSlop={8}
          style={({ pressed }) => [
            s.check,
            registrado && s.checkOn,
            (pressed || ocupado) && { opacity: 0.5 },
          ]}
        >
          {registrado ? <IconCheck size={13} color={colors.accInk} strokeWidth={2.6} /> : null}
        </Pressable>
      ) : (
        <View style={[s.check, s.checkVacio]} />
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityHint={`Editar la plantilla de ${item.fijo.descripcion}`}
        onPress={onEditar}
        style={({ pressed }) => [s.filaTxt, pressed && { opacity: 0.6 }]}
      >
        <Text
          style={[
            s.filaNombre,
            pausado && { color: colors.faint },
            registrado && { color: colors.dim },
          ]}
          numberOfLines={1}
        >
          {item.fijo.descripcion}
        </Text>
        <Text style={s.filaMeta} numberOfLines={1}>
          {item.fijo.categoriaNombre.toUpperCase()} · DÍA {item.fijo.diaDelMes}
          {pausado ? ' · PAUSADO' : ''}
        </Text>
      </Pressable>

      {onEditarMonto ? (
        <Pressable
          accessibilityRole="button"
          accessibilityHint={`Cambiar cuánto ${registrado ? 'pagaste' : 'vas a pagar'} este mes`}
          onPress={onEditarMonto}
          hitSlop={6}
          style={({ pressed }) => [s.montoBtn, pressed && { opacity: 0.6 }]}
        >
          <Text style={s.filaMonto}>{monto}</Text>
        </Pressable>
      ) : (
        <Text style={[s.filaMonto, s.montoBtn, { color: colors.faint }]}>{monto}</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
    borderBottomColor: colors.line,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.acc, borderColor: colors.acc },
  /** el hueco de un pausado: mantiene la grilla alineada sin sugerir que se puede tildar */
  checkVacio: { borderColor: 'transparent' },

  filaTxt: { flex: 1, minWidth: 0 },
  filaNombre: {
    fontFamily: fonts.archivoMedium,
    fontSize: 14,
    color: colors.bone,
    flexShrink: 1,
    marginBottom: 3,
  },
  filaMeta: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: tracking(10.5, 0.04),
    color: colors.faint,
  },
  montoBtn: { paddingVertical: 4, paddingLeft: 8 },
  filaMonto: {
    fontFamily: fonts.chivo,
    fontSize: 16,
    letterSpacing: tracking(16, -0.03),
    color: colors.bone,
    textAlign: 'right',
  },

  vacio: { paddingVertical: 18, gap: 6 },
  vacioTitulo: { fontFamily: fonts.archivoMedium, fontSize: 14, color: colors.acc },
  vacioSub: {
    fontFamily: fonts.archivo,
    fontSize: 12.5,
    color: colors.dim,
    lineHeight: 12.5 * 1.55,
  },

  agregar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    marginTop: 4,
  },
  agregarTxt: { fontFamily: fonts.archivoMedium, fontSize: 13, color: colors.acc },
});
