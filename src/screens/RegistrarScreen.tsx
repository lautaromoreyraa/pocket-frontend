import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  getRecordingPermissionsAsync,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';

import { BorradorAudio, GastoBorrador } from '../types';
import { Link } from '../components/controls';
import { Eyebrow, Hello, HelloDim } from '../components/primitives';
import { IconMicFilled, IconStop } from '../components/Icons';
import { Pantalla } from '../components/Pantalla';
import { colors, fonts, tracking } from '../theme';
import { formatFechaCorta, formatFechaHoraMeta } from '../utils/format';
import { procesarAudio } from '../api/pocket';

/** Estados por los que pasa el boton de grabar */
type EstadoGrabacion = 'listo' | 'grabando' | 'procesando';

/**
 * Pantalla Registrar (`#p-reg` del mockup).
 *
 * RF-04, RF-05, RF-09, RF-42.
 *
 * La grabacion usa expo-audio con el preset HIGH_QUALITY, que produce .m4a con
 * AAC en las dos plataformas. Es a proposito el mismo formato con el que se
 * valido a mano que el modelo transcribe bien: cambiar el encoding no es
 * gratis, porque un modelo que no puede decodificar el audio no falla, inventa
 * los gastos (ver "Gastos fabricados" en el CLAUDE.md del backend).
 */
export function RegistrarScreen({
  borrador,
  onDescartarBorrador,
  onGastosDetectados,
  onCargarManual,
}: {
  /** RF-41 — audio que quedo pendiente por falta de conexion */
  borrador: BorradorAudio | null;
  onDescartarBorrador: () => void;
  /** RF-06 — abre la pantalla de confirmacion con los gastos detectados */
  onGastosDetectados: (gastos: GastoBorrador[]) => void;
  onCargarManual: () => void;
}) {
  const [estado, setEstado] = useState<EstadoGrabacion>('listo');
  const [segundos, setSegundos] = useState(0);
  const hoy = new Date();

  const grabador = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // El permiso de microfono se pide una sola vez, al montar: pedirlo recien al
  // apretar grabar mete el dialogo del sistema en el medio de la interaccion.
  useEffect(() => {
    void (async () => {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) return;
      // En iOS, sin esto, grabar con el telefono en silencio no levanta audio.
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    })();
  }, []);

  const pulso = useRef(new Animated.Value(0)).current;

  // `.rec::after` — el anillo que respira alrededor del boton
  useEffect(() => {
    const animacion = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulso, {
          toValue: 0,
          duration: 1700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animacion.start();
    return () => animacion.stop();
  }, [pulso]);

  // Cronometro de la grabacion
  useEffect(() => {
    if (estado !== 'grabando') return;
    const id = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [estado]);

  const procesar = useCallback(
    async (uri: string | null) => {
      setEstado('procesando');
      try {
        const { gastos } = await procesarAudio(uri);
        if (gastos.length === 0) {
          // RF-09 — la IA no entendio el audio
          Alert.alert('No te entendí', 'Probá de nuevo o cargalo a mano.', [
            { text: 'Cargar a mano', onPress: onCargarManual },
            { text: 'Reintentar', style: 'cancel' },
          ]);
          return;
        }
        onGastosDetectados(gastos);
      } catch (e) {
        // El error real importa: sin esto, "no pude procesar" tapa por igual un
        // uri vacio, un permiso denegado y una caida del backend.
        const detalle = e instanceof Error ? e.message : String(e);
        console.log('[pocket] fallo al procesar audio:', detalle, '| uri:', uri);
        Alert.alert('No pude procesar el audio', `${detalle}

Probá de nuevo o cargalo a mano.`, [
          { text: 'Cargar a mano', onPress: onCargarManual },
          { text: 'Reintentar', style: 'cancel' },
        ]);
      } finally {
        setEstado('listo');
        setSegundos(0);
      }
    },
    [onGastosDetectados, onCargarManual],
  );

  /**
   * Corta la grabacion y tira el audio: no se manda ni se procesa.
   *
   * Sin esto, equivocarse al hablar costaba una request igual, porque la unica
   * forma de salir de la grabacion era el boton de stop, que manda derecho al
   * backend. El cupo de audios es finito y trabarse dictando es lo mas comun
   * que hay, asi que arrepentirse tiene que ser gratis.
   */
  const cancelarGrabacion = useCallback(() => {
    void (async () => {
      try {
        // El stop igual va: es lo que libera el microfono. Lo que no va es el
        // uri que deja, que simplemente se descarta.
        await grabador.stop();
      } catch (e) {
        console.log('[pocket] fallo al cancelar la grabacion:', e);
      } finally {
        setEstado('listo');
        setSegundos(0);
      }
    })();
  }, [grabador]);

  const onPressGrabar = useCallback(() => {
    if (estado === 'procesando') return;

    if (estado === 'listo') {
      void (async () => {
        const { granted } = await getRecordingPermissionsAsync();
        if (!granted) {
          const pedido = await requestRecordingPermissionsAsync();
          if (!pedido.granted) {
            Alert.alert(
              'Necesito el micrófono',
              'Sin permiso de micrófono no puedo escuchar el gasto. Podés cargarlo a mano.',
              [
                { text: 'Cargar a mano', onPress: onCargarManual },
                { text: 'Entendido', style: 'cancel' },
              ],
            );
            return;
          }
        }
        try {
          await grabador.prepareToRecordAsync();
          grabador.record();
          setSegundos(0);
          setEstado('grabando');
        } catch (e) {
          const detalle = e instanceof Error ? e.message : String(e);
          console.log('[pocket] fallo al empezar a grabar:', detalle);
          Alert.alert('No pude empezar a grabar', `${detalle}

Probá de nuevo o cargalo a mano.`, [
            { text: 'Cargar a mano', onPress: onCargarManual },
            { text: 'Reintentar', style: 'cancel' },
          ]);
        }
      })();
      return;
    }

    // Estaba grabando: se corta y se manda el archivo.
    void (async () => {
      try {
        await grabador.stop();
        console.log('[pocket] grabacion cerrada, uri =', grabador.uri);
      } catch (e) {
        const detalle = e instanceof Error ? e.message : String(e);
        console.log('[pocket] fallo al cerrar la grabacion:', detalle);
        setEstado('listo');
        setSegundos(0);
        Alert.alert('No pude cerrar la grabación', `${detalle}

Probá de nuevo o cargalo a mano.`, [
          { text: 'Cargar a mano', onPress: onCargarManual },
          { text: 'Reintentar', style: 'cancel' },
        ]);
        return;
      }
      // `uri` recien tiene valor despues del stop.
      void procesar(grabador.uri);
    })();
  }, [estado, procesar, grabador, onCargarManual]);

  const escala = pulso.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const opacidad = pulso.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0.14] });

  const grabando = estado === 'grabando';
  const procesando = estado === 'procesando';

  return (
    <Pantalla>
      <Eyebrow>{formatFechaCorta(hoy)}</Eyebrow>
      {/* Sin nombre: la identificacion es anonima por dispositivo y la app
          nunca pregunta como se llama nadie. El "Lauta" que estaba aca venia
          del mockup y saludaba por su nombre a cualquiera que la abriera. */}
      <Hello style={{ marginTop: 7 }}>
        Buenas.{'\n'}
        <HelloDim>¿Qué gastaste hoy?</HelloDim>
      </Hello>

      {/* RF-42 — el borrador offline aparece arriba de todo y hay que resolverlo */}
      {borrador ? (
        <View style={s.strip}>
          <View style={s.stripTxt}>
            <Text style={s.stripTitulo}>Audio sin cargar</Text>
            <Text style={s.stripMeta}>
              {formatFechaHoraMeta(borrador.grabadoEn)}
              {borrador.sinConexion ? ' · SIN CONEXIÓN' : ''}
            </Text>
          </View>
          <View style={s.stripActs}>
            <Link titulo="Cargar" onPress={() => void procesar(borrador.uri)} />
            <Link titulo="Borrar" mute onPress={onDescartarBorrador} />
          </View>
        </View>
      ) : null}

      <View style={s.recwrap}>
        <View style={s.recBox}>
          <Animated.View
            style={[s.anillo, { transform: [{ scale: escala }], opacity: opacidad }]}
            pointerEvents="none"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={grabando ? 'Detener grabación' : 'Grabar gasto'}
            onPress={onPressGrabar}
            disabled={procesando}
            style={({ pressed }) => [
              s.rec,
              grabando && { backgroundColor: colors.warn },
              pressed && { transform: [{ scale: 0.96 }] },
              procesando && { opacity: 0.6 },
            ]}
          >
            {grabando ? (
              <IconStop size={26} color={colors.bone} />
            ) : (
              <IconMicFilled size={26} color={colors.accInk} strokeWidth={1.8} />
            )}
            <Text style={[s.recTxt, grabando && { color: colors.bone }]}>
              {procesando ? 'Escuchando' : grabando ? formatCrono(segundos) : 'Grabar'}
            </Text>
          </Pressable>
        </View>

        <Text style={s.prompt}>
          {procesando
            ? 'Dejame ver qué dijiste…'
            : grabando
              ? 'Te escucho'
              : 'Contame qué gastaste'}
        </Text>
        <Text style={s.sub}>
          {grabando || procesando
            ? 'Tocá de nuevo cuando termines'
            : 'Podés decir varios de una:\n“cinco mil en facturas y veinte mil de nafta”'}
        </Text>

        {/* Solo mientras se graba: una vez que el audio salio ya se gasto la
            request y no hay nada que cancelar. */}
        {grabando ? (
          <Pressable
            onPress={cancelarGrabacion}
            accessibilityRole="button"
            accessibilityLabel="Cancelar la grabación y descartar el audio"
            hitSlop={8}
          >
            {({ pressed }) => (
              <Text style={[s.cancelar, pressed && { opacity: 0.6 }]}>Cancelar</Text>
            )}
          </Pressable>
        ) : null}

        {/* RF-11 — la salida manual siempre disponible */}
        <Pressable onPress={onCargarManual} accessibilityRole="button" hitSlop={8}>
          {({ pressed }) => (
            <Text style={[s.manual, pressed && { opacity: 0.6 }]}>Cargarlo a mano</Text>
          )}
        </Pressable>
      </View>
    </Pantalla>
  );
}

function formatCrono(segundos: number): string {
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return `${min}:${String(seg).padStart(2, '0')}`;
}

const s = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginTop: 20,
    paddingVertical: 11,
    paddingLeft: 13,
    borderLeftWidth: 2,
    borderLeftColor: colors.acc,
  },
  stripTxt: { flex: 1, minWidth: 0 },
  stripTitulo: {
    fontFamily: fonts.archivoMedium,
    fontSize: 13,
    color: colors.bone,
    marginBottom: 2,
  },
  stripMeta: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: tracking(10.5, 0.04),
    color: colors.faint,
  },
  stripActs: { flexDirection: 'row', gap: 14 },

  recwrap: { alignItems: 'center', marginTop: 54 },
  recBox: { width: 176, height: 176, alignItems: 'center', justifyContent: 'center' },
  anillo: {
    position: 'absolute',
    width: 176,
    height: 176,
    borderRadius: 88,
    borderWidth: 1,
    borderColor: colors.accLine,
  },
  rec: {
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: colors.acc,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  recTxt: { fontFamily: fonts.archivoSemi, fontSize: 13, color: colors.accInk },

  prompt: {
    fontFamily: fonts.chivo,
    fontSize: 19,
    letterSpacing: tracking(19, -0.025),
    color: colors.bone,
    marginTop: 30,
    textAlign: 'center',
  },
  sub: {
    fontFamily: fonts.archivo,
    fontSize: 12.5,
    color: colors.faint,
    marginTop: 9,
    textAlign: 'center',
    lineHeight: 12.5 * 1.65,
  },
  cancelar: {
    fontFamily: fonts.archivoMedium,
    fontSize: 13,
    color: colors.dim,
    marginTop: 18,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  manual: {
    fontFamily: fonts.archivoMedium,
    fontSize: 13,
    color: colors.dim,
    marginTop: 26,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: 3,
  },
});
