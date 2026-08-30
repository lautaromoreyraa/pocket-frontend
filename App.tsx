import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';

import { BorradorAudio, GastoBorrador, GastoFijo, Ingreso } from './src/types';
import { MonedaProvider } from './src/context/MonedaContext';
import { Tab, TabBar } from './src/components/TabBar';
import { RegistrarScreen } from './src/screens/RegistrarScreen';
import { ResumenScreen } from './src/screens/ResumenScreen';
import { HistoricoScreen } from './src/screens/HistoricoScreen';
import { MovimientosScreen } from './src/screens/MovimientosScreen';
import { FijosScreen } from './src/screens/FijosScreen';
import { ConfirmacionAudioSheet } from './src/sheets/ConfirmacionAudioSheet';
import { GastoFormSheet, ModoFormulario } from './src/sheets/GastoFormSheet';
import { GastoFijoSheet } from './src/sheets/GastoFijoSheet';
import { IngresoSheet } from './src/sheets/IngresoSheet';
import {
  autenticarDispositivo,
  confirmarLote,
  crearGasto,
  eliminarGastoFijo,
  eliminarIngreso,
  getIngresos,
  guardarGastoFijo,
  guardarIngreso,
} from './src/api/pocket';
import { MOCK_BORRADOR_AUDIO } from './src/data/mock';
import { USE_MOCKS } from './src/api/config';
import { colors } from './src/theme';
import { periodoActual } from './src/utils/format';

// El splash se mantiene hasta que carguen las tres tipografias
void SplashScreen.preventAutoHideAsync();

/**
 * Raiz de la app.
 *
 * Concentra tres cosas: que pestana esta activa, que gastos estan pendientes
 * de confirmar, y que formulario esta abierto. Todo lo demas vive en las
 * pantallas.
 */
export default function App() {
  // Los .ttf viven en assets/fonts y no en @expo-google-fonts a proposito.
  //
  // Importarlos del paquete hace que el export los emita bajo
  // assets/node_modules/..., y los hostings estaticos descartan del deploy todo
  // lo que cuelgue de un node_modules: las fuentes daban 404 en produccion, la
  // promesa de useFonts nunca resolvia y la app entera se quedaba en blanco
  // -abajo hay un `return null` esperando fontsListas-. Sin sintomas en local,
  // donde los archivos si estaban.
  //
  // De paso pesa menos: el paquete trae las 18 variantes de cada familia y
  // aca estan solo las 8 que se usan.
  const [fontsListas] = useFonts({
    Chivo_300Light: require('./assets/fonts/Chivo_300Light.ttf'),
    Chivo_400Regular: require('./assets/fonts/Chivo_400Regular.ttf'),
    Chivo_500Medium: require('./assets/fonts/Chivo_500Medium.ttf'),
    Archivo_400Regular: require('./assets/fonts/Archivo_400Regular.ttf'),
    Archivo_500Medium: require('./assets/fonts/Archivo_500Medium.ttf'),
    Archivo_600SemiBold: require('./assets/fonts/Archivo_600SemiBold.ttf'),
    ChivoMono_400Regular: require('./assets/fonts/ChivoMono_400Regular.ttf'),
    ChivoMono_500Medium: require('./assets/fonts/ChivoMono_500Medium.ttf'),
  });

  const [sesionLista, setSesionLista] = useState(false);
  const [tab, setTab] = useState<Tab>('registrar');
  const periodo = periodoActual();

  /** RF-41 — el borrador offline pendiente de resolver */
  const [borradorAudio, setBorradorAudio] = useState<BorradorAudio | null>(
    USE_MOCKS ? MOCK_BORRADOR_AUDIO : null,
  );

  /** RF-06 — los gastos que detecto la IA, todavia sin persistir */
  const [detectados, setDetectados] = useState<GastoBorrador[] | null>(null);
  const [guardando, setGuardando] = useState(false);

  /**
   * Se incrementa cada vez que se toca algo que otras pantallas muestran
   * (el ingreso, un fijo). Las pantallas lo reciben y recargan. Es el
   * reemplazo barato de un cache compartido: con un solo dato compartido no
   * vale la pena traer react-query ni un store global.
   */
  const [refresco, setRefresco] = useState(0);
  const refrescar = useCallback(() => setRefresco((n) => n + 1), []);

  /** RF-32 — el formulario de ingreso: null = cerrado */
  const [ingresoAbierto, setIngresoAbierto] = useState<{ lista: Ingreso[] } | null>(null);

  /** El formulario de gasto fijo: null = cerrado */
  const [fijoAbierto, setFijoAbierto] = useState<{ inicial: GastoFijo | null } | null>(null);

  /** La lista completa de movimientos: null = cerrada (RF-12) */
  const [movimientos, setMovimientos] = useState<{ periodo: string; credito: boolean } | null>(
    null,
  );

  /** El formulario compartido: null = cerrado (RF-15) */
  const [formulario, setFormulario] = useState<{
    modo: ModoFormulario;
    inicial: GastoBorrador | null;
    subtitulo?: string;
  } | null>(null);

  // RF-01, RF-02 — identificacion por dispositivo al abrir la app
  useEffect(() => {
    autenticarDispositivo()
      .catch(() => undefined)
      .finally(() => setSesionLista(true));
  }, []);

  useEffect(() => {
    if (fontsListas && sesionLista) void SplashScreen.hideAsync();
  }, [fontsListas, sesionLista]);

  const abrirManual = useCallback(() => {
    setFormulario({ modo: 'manual', inicial: null });
  }, []);

  const abrirCorreccion = useCallback(
    (localId: string) => {
      if (!detectados) return;
      const indice = detectados.findIndex((g) => g.localId === localId);
      if (indice < 0) return;
      setFormulario({
        modo: 'correccion',
        inicial: detectados[indice],
        subtitulo: `${indice + 1} de los ${detectados.length} que escuché`,
      });
    },
    [detectados],
  );

  /** RF-07 — guardar la correccion de un gasto detectado, o el alta manual */
  const guardarFormulario = useCallback(
    async (borrador: GastoBorrador) => {
      if (formulario?.modo === 'correccion') {
        setDetectados((prev) =>
          prev
            ? prev.map((g) => (g.localId === borrador.localId ? borrador : g))
            : prev,
        );
        setFormulario(null);
        return;
      }

      // Alta manual: se persiste sola, no pasa por la pantalla de confirmacion
      setGuardando(true);
      try {
        await crearGasto(borrador);
        setFormulario(null);
      } catch {
        Alert.alert('No pude guardar', 'Revisá la conexión y probá de nuevo.');
      } finally {
        setGuardando(false);
      }
    },
    [formulario],
  );

  /** RF-13 — sacar un gasto de la tanda detectada */
  const descartarDetectado = useCallback(() => {
    const localId = formulario?.inicial?.localId;
    if (!localId) return;
    setDetectados((prev) => {
      const quedan = prev?.filter((g) => g.localId !== localId) ?? [];
      return quedan.length > 0 ? quedan : null;
    });
    setFormulario(null);
  }, [formulario]);

  /** RF-08 — recien aca se persisten los gastos del audio */
  const confirmarDetectados = useCallback(async () => {
    if (!detectados) return;
    setGuardando(true);
    try {
      await confirmarLote(detectados);
      setDetectados(null);
      setBorradorAudio(null);
      setTab('debito');
    } catch {
      Alert.alert('No pude guardar', 'Revisá la conexión y probá de nuevo.');
    } finally {
      setGuardando(false);
    }
  }, [detectados]);

  /**
   * Un periodo puede tener varios ingresos, asi que se pide la lista antes de
   * abrir el formulario. Si falla se abre vacio: mejor poder cargar uno que
   * quedarse sin pantalla.
   */
  const abrirIngreso = useCallback(async () => {
    try {
      setIngresoAbierto({ lista: await getIngresos(periodo) });
    } catch {
      setIngresoAbierto({ lista: [] });
    }
  }, [periodo]);

  /** RF-32 — agregar un ingreso al mes. El backend siempre crea, nunca reemplaza. */
  const guardarIngresoDelMes = useCallback(
    async (monto: number, descripcion: string) => {
      setGuardando(true);
      try {
        await guardarIngreso(periodo, monto, descripcion);
        // La hoja queda abierta con la lista al dia: cargar varios seguidos es
        // el caso normal, no la excepcion.
        setIngresoAbierto({ lista: await getIngresos(periodo) });
        refrescar();
      } catch {
        Alert.alert('No pude guardar el ingreso', 'Revisá la conexión y probá de nuevo.');
      } finally {
        setGuardando(false);
      }
    },
    [periodo, refrescar],
  );

  /** RF-33 — sin ningun ingreso desaparece la capacidad de ahorro */
  const borrarIngresoDelMes = useCallback(
    (ingreso: Ingreso) => {
      Alert.alert('Borrar el ingreso', `Se va a borrar "${ingreso.descripcion}". ¿Seguro?`, [
        { text: 'No', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: () => {
            void eliminarIngreso(ingreso.id, periodo)
              .then(async () => {
                setIngresoAbierto({ lista: await getIngresos(periodo) });
                refrescar();
              })
              .catch(() => Alert.alert('No pude borrarlo', 'Probá de nuevo.'));
          },
        },
      ]);
    },
    [periodo, refrescar],
  );

  const guardarFijo = useCallback(
    async (fijo: GastoFijo) => {
      setGuardando(true);
      try {
        await guardarGastoFijo(fijo);
        setFijoAbierto(null);
        refrescar();
      } catch {
        Alert.alert('No pude guardar el fijo', 'Revisá la conexión y probá de nuevo.');
      } finally {
        setGuardando(false);
      }
    },
    [refrescar],
  );

  const borrarFijo = useCallback(() => {
    const inicial = fijoAbierto?.inicial;
    if (!inicial) return;
    Alert.alert(
      'Eliminar el fijo',
      `Se deja de esperar "${inicial.descripcion}" todos los meses. Los gastos ya registrados no se tocan.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            void eliminarGastoFijo(inicial.id)
              .then(() => {
                setFijoAbierto(null);
                refrescar();
              })
              .catch(() => Alert.alert('No pude eliminarlo', 'Probá de nuevo.'));
          },
        },
      ],
    );
  }, [fijoAbierto, refrescar]);

  const descartarBorradorAudio = useCallback(() => {
    Alert.alert('Borrar el audio', 'Se pierde lo que grabaste. ¿Seguro?', [
      { text: 'No', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => setBorradorAudio(null) },
    ]);
  }, []);

  if (!fontsListas || !sesionLista) return null;

  return (
    <SafeAreaProvider>
      <MonedaProvider>
        <View style={s.app}>
          <StatusBar style="light" />

          <View style={s.cuerpo}>
            {tab === 'registrar' ? (
              <RegistrarScreen
                borrador={borradorAudio}
                onDescartarBorrador={descartarBorradorAudio}
                onGastosDetectados={setDetectados}
                onCargarManual={abrirManual}
              />
            ) : null}
            {tab === 'debito' ? (
              <ResumenScreen
                periodo={periodo}
                credito={false}
                refresco={refresco}
                onVerMovimientos={() => setMovimientos({ periodo, credito: false })}
                onEditarIngreso={() => void abrirIngreso()}
              />
            ) : null}
            {tab === 'credito' ? (
              <ResumenScreen
                periodo={periodo}
                credito
                refresco={refresco}
                onVerMovimientos={() => setMovimientos({ periodo, credito: true })}
                onEditarIngreso={() => void abrirIngreso()}
              />
            ) : null}
            {tab === 'fijos' ? (
              <FijosScreen
                periodo={periodo}
                refresco={refresco}
                onEditarIngreso={() => void abrirIngreso()}
                onNuevoFijo={() => setFijoAbierto({ inicial: null })}
                onEditarFijo={(fijo) => setFijoAbierto({ inicial: fijo })}
              />
            ) : null}
            {tab === 'historico' ? (
              <HistoricoScreen
                onVerMovimientos={(p, c) => setMovimientos({ periodo: p, credito: c })}
              />
            ) : null}
          </View>

          <TabBar activa={tab} onChange={setTab} />

          {/* RF-06 / RF-07 / RF-08 */}
          <ConfirmacionAudioSheet
            visible={detectados !== null && formulario === null}
            gastos={detectados ?? []}
            onEditar={abrirCorreccion}
            onDescartar={() => setDetectados(null)}
            onGuardar={confirmarDetectados}
            guardando={guardando}
          />

          {/* RF-12 — todos los movimientos del periodo */}
          <MovimientosScreen
            visible={movimientos !== null}
            periodo={movimientos?.periodo ?? periodo}
            credito={movimientos?.credito ?? false}
            onCerrar={() => setMovimientos(null)}
          />

          {/* RF-32 / RF-33 — el ingreso del mes */}
          <IngresoSheet
            visible={ingresoAbierto !== null}
            periodo={periodo}
            ingresos={ingresoAbierto?.lista ?? []}
            onGuardar={guardarIngresoDelMes}
            onEliminar={borrarIngresoDelMes}
            onCerrar={() => setIngresoAbierto(null)}
            guardando={guardando}
          />

          {/* Plantilla de gasto fijo */}
          <GastoFijoSheet
            visible={fijoAbierto !== null}
            inicial={fijoAbierto?.inicial ?? null}
            onGuardar={guardarFijo}
            onEliminar={fijoAbierto?.inicial ? borrarFijo : undefined}
            onCerrar={() => setFijoAbierto(null)}
            guardando={guardando}
          />

          {/* RF-11 / RF-15 */}
          <GastoFormSheet
            visible={formulario !== null}
            modo={formulario?.modo ?? 'manual'}
            inicial={formulario?.inicial ?? null}
            subtitulo={formulario?.subtitulo}
            onGuardar={guardarFormulario}
            onCancelar={() => setFormulario(null)}
            onDescartar={formulario?.modo === 'correccion' ? descartarDetectado : undefined}
            guardando={guardando}
          />
        </View>
      </MonedaProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.ink },
  cuerpo: { flex: 1 },
});
